// Dedicated local certification transport. Never uses DATABASE_URL or .env.
import pg from 'pg';
import {readFile,readdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {execFileSync} from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import {syncBuiltinESMExports} from 'node:module';
import {createDatabase} from '../../src/persistence/db.js';
import {migrations} from '../sprint6_3_3/certification.js';

export const requireThat=(ok,code)=>{if(!ok)throw new Error(code);};
export const root='data/runtime/identity-persistence-test';
export const quote=name=>{requireThat(/^qa_sprint6_3_[a-f0-9]{32}$/.test(name),'LOCAL_SCHEMA_NAME_REQUIRED');return `"${name}"`;};
export const network={localConnections:0,blockedAttempts:0};
const blocked=()=>{network.blockedAttempts++;throw new Error('EXTERNAL_NETWORK_FORBIDDEN');};
globalThis.fetch=blocked;http.request=http.get=https.request=https.get=tls.connect=blocked;
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const first=Array.isArray(args[0])?args[0]:args;const o=typeof first[0]==='object'?first[0]:{port:first[0],host:first[1]};if(o?.host!=='127.0.0.1'||Number(o?.port)!==5432)return blocked();network.localConnections++;return Reflect.apply(connect,this,args);};
syncBuiltinESMExports();

export async function localConfig(){
  execFileSync('git',['check-ignore','--quiet',`${root}/local-db.env`],{stdio:'pipe'});
  requireThat(execFileSync('git',['ls-files','--',`${root}/local-db.env`],{encoding:'utf8'}).trim()==='','LOCAL_CONFIG_TRACKED');
  const c=parseEnv(await readFile(`${root}/local-db.env`,'utf8'));
  const expected={PGHOST:'127.0.0.1',PGPORT:'5432',PGDATABASE:'pi_identity_test',PGUSER:'pi_test_user'};
  requireThat(Object.keys(c).every(k=>[...Object.keys(expected),'PGPASSWORD'].includes(k)),'UNEXPECTED_LOCAL_CONFIG_KEY');
  for(const [k,v]of Object.entries(expected))requireThat(c[k]===v,'LOCAL_TARGET_MISMATCH');
  requireThat(!!c.PGPASSWORD&&!c.PGPASSWORD.startsWith('<'),'LOCAL_PASSWORD_REQUIRED');
  for(const key of Object.keys(process.env))if(/^(PG|DATABASE_|SUPABASE_)/.test(key))delete process.env[key];
  return {host:'127.0.0.1',port:5432,database:'pi_identity_test',user:'pi_test_user',password:c.PGPASSWORD,ssl:false,connectionTimeoutMillis:5000,query_timeout:20000,application_name:'pi_identity_v2_certification',options:'-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=5000'};
}
export async function verifyClient(c){
  const row=(await c.query("SELECT current_database() AS database,current_user AS role,inet_server_addr() AS address,inet_server_port() AS port,current_setting('server_version') AS version,pg_backend_pid() AS pid")).rows[0];
  requireThat(row.database==='pi_identity_test'&&row.role==='pi_test_user'&&row.address==='127.0.0.1'&&row.port===5432&&row.version==='18.6','LOCAL_SERVER_IDENTITY_MISMATCH');
  return row;
}
export async function inventory(c){
  const schemas=(await c.query("SELECT nspname AS name,pg_get_userbyid(nspowner) AS owner,obj_description(oid,'pg_namespace') AS marker FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema' ORDER BY nspname")).rows;
  const objects=(await c.query("SELECT n.nspname AS schema,c.relname AS name,c.relkind AS kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' ORDER BY 1,2")).rows;
  const routines=(await c.query("SELECT n.nspname AS schema,p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' ORDER BY 1,2")).rows;
  return {schemas,objects,routines};
}
export async function preflight(config){
  const c=new pg.Client(config);await c.connect();
  try{
    const identity=await verifyClient(c);
    await c.query('BEGIN READ ONLY');
    const role=(await c.query("SELECT r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,pg_get_userbyid(d.datdba) AS owner FROM pg_roles r CROSS JOIN pg_database d WHERE r.rolname=current_user AND d.datname=current_database()")).rows[0];
    requireThat(role.owner==='pi_test_user'&&!role.rolsuper&&!role.rolcreatedb&&!role.rolcreaterole&&!role.rolreplication&&!role.rolbypassrls,'LOCAL_ROLE_ISOLATION_FAILED');
    const others=Number((await c.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid()")).rows[0].n);
    requireThat(others===0,'OTHER_DATABASE_CLIENTS_PRESENT');
    const before=await inventory(c);
    const known=[];
    for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isDirectory()&&/^v[23]-[a-f0-9]{32}$/.test(entry.name)){
      try{known.push(JSON.parse(await readFile(`${root}/${entry.name}/ownership.json`,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}
    }
    for(const s of before.schemas){
      if(s.name==='public'){requireThat(!before.objects.some(o=>o.schema==='public')&&!before.routines.some(o=>o.schema==='public'),'UNKNOWN_PUBLIC_OBJECTS');continue;}
      quote(s.name);
      requireThat(s.owner==='pi_test_user'&&known.some(k=>k.schema===s.name&&k.marker===s.marker),'UNKNOWN_LOCAL_SCHEMA');
      const ledger=(await c.query(`SELECT filename,checksum FROM ${quote(s.name)}.property_intelligence_schema_migrations ORDER BY filename`)).rows;
      requireThat(JSON.stringify(ledger)===JSON.stringify((await migrations()).map(({filename,checksum})=>({filename,checksum}))),'PRIOR_QA_SCHEMA_LEDGER_MISMATCH');
    }
    await c.query('ROLLBACK');return {identity:{...identity,pid:undefined},role,otherSessions:others,before,client:c};
  }catch(e){await c.end();throw e;}
}
export async function prepareSchema(c,schema,marker){
  const inputs=await migrations();await verifyClient(c);
  await c.query('BEGIN READ WRITE');
  try{
    await c.query(`CREATE SCHEMA ${quote(schema)}`);
    // marker is generated internally, never an environment/config value.
    requireThat(/^PI_DURABLE_IDENTITY_V[23]:[a-f0-9]{32}$/.test(marker),'INVALID_SCHEMA_MARKER');
    await c.query(`COMMENT ON SCHEMA ${quote(schema)} IS '${marker}'`);
    await c.query(`REVOKE ALL ON SCHEMA ${quote(schema)} FROM PUBLIC`);
    await c.query("SELECT set_config('search_path',$1,true)",[`${quote(schema)}, pg_catalog`]);
    requireThat((await c.query('SELECT current_schema() AS name')).rows[0].name===schema,'SCHEMA_NAMESPACE_MISMATCH');
    await c.query('CREATE TABLE property_intelligence_schema_migrations (filename text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
    for(const m of inputs){requireThat(!/\bpublic\s*\./i.test(m.sql),'MIGRATION_PUBLIC_TARGET');await c.query(m.sql);await c.query('INSERT INTO property_intelligence_schema_migrations(filename,checksum) VALUES ($1,$2)',[m.filename,m.checksum]);}
    await c.query('COMMIT');return inputs.map(({filename,checksum})=>({filename,checksum}));
  }catch(e){await c.query('ROLLBACK');throw e;}
}
export function testDatabase(config,schema){
  quote(schema);const pool=new pg.Pool({...config,max:8});const backendIds=new Set();
  const connectVerified=async()=>{const c=await pool.connect();try{const identity=await verifyClient(c);backendIds.add(identity.pid);return c;}catch(e){c.release(true);throw e;}};
  const db=createDatabase({pool:{connect:async()=>{
    const c=await connectVerified();return {query:async(sql,v)=>{
      if(sql==='BEGIN'){await c.query('BEGIN READ WRITE');await c.query("SELECT set_config('search_path',$1,true)",[`${quote(schema)}, pg_catalog`]);requireThat((await c.query('SELECT current_schema() AS name')).rows[0].name===schema,'SCHEMA_NAMESPACE_MISMATCH');return {rows:[]};}
      return c.query(sql,v);
    },release:()=>c.release()};
  },query:()=>{throw new Error('TRANSACTION_REQUIRED');},end:()=>pool.end()}});
  return {db,backendIds,close:()=>pool.end(),read:async work=>{
    // Independent physical connection, not a transaction facade or cached result.
    const c=new pg.Client({...config,application_name:'pi_identity_v2_independent_sql'});await c.connect();
    try{const identity=await verifyClient(c);await c.query('BEGIN READ ONLY');await c.query("SELECT set_config('search_path',$1,true)",[`${quote(schema)}, pg_catalog`]);const result=await work(c,identity.pid);await c.query('ROLLBACK');return result;}finally{await c.end();}
  }};
}
