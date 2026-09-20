import {readdir,readFile} from 'node:fs/promises';
import {createDatabase} from '../src/persistence/db.js';
import {resolve,hash,writeJson} from '../src/io/files.js';

try { process.loadEnvFile(resolve('.env')); } catch { /* Netlify injects DATABASE_URL in deployed functions */ }

const APP_TABLES=['properties','property_aliases','evidence_snapshots','valuations','comparable_snapshots','comparables','deals','deal_claims','analysis_snapshots','diligence_items','discovery_signals','documents','reports','idempotency_keys','audit_events','acquisition_decisions','property_encumbrances','property_condition_assessments','property_condition_items','discovery_sources','discovery_records','opportunity_candidates','opportunity_record_links','opportunity_signals','opportunity_reviews'];
const LEDGER='property_intelligence_schema_migrations';
const command=process.argv[2]??'help';
const migrations=async()=>{
  const names=(await readdir(resolve('netlify/database/migrations'))).filter(name=>/^\d+.*\.sql$/i.test(name)).sort();
  return Promise.all(names.map(async filename=>{const sql=await readFile(resolve(`netlify/database/migrations/${filename}`),'utf8');return {filename,sql,checksum:hash(sql)};}));
};
const result=(value,code=0)=>{console.log(JSON.stringify(value,null,2));process.exitCode=code;};
const safeError=error=>({status:'STOP',error:error?.code==='DATABASE_NOT_CONFIGURED'||error?.message==='DATABASE_NOT_CONFIGURED'?'DATABASE_NOT_CONFIGURED':'DATABASE_UNAVAILABLE',sqlState:/^[0-9A-Z]{5}$/.test(error?.code??'')?error.code:null,transportCode:['ECONNREFUSED','ENETUNREACH','ETIMEDOUT','ECONNRESET','ENOTFOUND','SELF_SIGNED_CERT_IN_CHAIN'].includes(error?.code)?error.code:null,errorName:error?.name??'Error'});

async function connect(){const db=createDatabase();if(!db)throw new Error('DATABASE_NOT_CONFIGURED');return db;}
async function transportTls(db){
  const client=await db.getPool().connect();
  try {
    const stream=client.connection?.stream;
    return {sslActive:Boolean(stream?.encrypted),tlsAuthorized:stream?.authorized===true,tlsProtocol:stream?.getProtocol?.()??null,tlsAuthorizationError:Boolean(stream?.authorizationError)};
  } finally { client.release?.(); }
}
async function metadata(db){
  const version=(await db.query('SELECT version(), current_database() AS database_name')).rows[0];
  const tls=await transportTls(db);
  const present=(await db.query("SELECT table_name, to_regclass('public.' || table_name) IS NOT NULL AS present FROM unnest($1::text[]) AS table_name",[APP_TABLES])).rows;
  const ledger=(await db.query("SELECT to_regclass('public.property_intelligence_schema_migrations') IS NOT NULL AS present")).rows[0].present;
  return {postgresVersion:version.version,databaseName:version.database_name,...tls,ledgerPresent:ledger,applicationTables:{present:present.filter(row=>row.present).map(row=>row.table_name),missing:present.filter(row=>!row.present).map(row=>row.table_name)}};
}
async function ledgerRows(db){
  const exists=(await db.query("SELECT to_regclass('public.property_intelligence_schema_migrations') IS NOT NULL AS present")).rows[0].present;
  if(!exists)return [];
  return (await db.query(`SELECT filename,checksum,applied_at FROM ${LEDGER} ORDER BY filename`)).rows;
}
function compare(local,applied){
  const byName=new Map(applied.map(row=>[row.filename,row]));
  const mismatches=local.filter(item=>byName.has(item.filename)&&byName.get(item.filename).checksum!==item.checksum).map(item=>item.filename);
  const pending=local.filter(item=>!byName.has(item.filename)).map(item=>item.filename);
  return {mismatches,pending};
}
async function preflight(){
  const db=await connect();try{const info=await metadata(db);const local=await migrations();const applied=await ledgerRows(db);const state={at:new Date().toISOString(),status:'PASS',...info,pending:compare(local,applied).pending.length};await writeJson('data/validation/sprint4-1-supabase-preflight.json',state);result(state);}finally{await db.closePoolForTests();}}
async function status(){
  const db=await connect();try{const info=await metadata(db),local=await migrations(),applied=await ledgerRows(db),comparison=compare(local,applied);if(comparison.mismatches.length)return result({status:'STOP',reason:'MIGRATION_CHECKSUM_MISMATCH',mismatches:comparison.mismatches},2);result({at:new Date().toISOString(),status:'PASS',ledgerPresent:info.ledgerPresent,applied:applied.map(row=>({filename:row.filename,appliedAt:row.applied_at})),pending:comparison.pending});}finally{await db.closePoolForTests();}}
async function migrate(){
  const db=await connect();try{
    const info=await metadata(db),local=await migrations(),applied=await ledgerRows(db),comparison=compare(local,applied);
    if(comparison.mismatches.length)return result({status:'STOP',reason:'MIGRATION_CHECKSUM_MISMATCH',mismatches:comparison.mismatches},2);
    if(!info.ledgerPresent&&info.applicationTables.present.length)return result({status:'STOP',reason:'APPLICATION_TABLES_EXIST_WITHOUT_LEDGER',tables:info.applicationTables.present},2);
    if(!info.ledgerPresent)await db.query(`CREATE TABLE IF NOT EXISTS ${LEDGER} (filename text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    for(const item of local.filter(candidate=>!applied.some(row=>row.filename===candidate.filename))){
      if(/\b(DROP\s+(DATABASE|SCHEMA)|TRUNCATE|DELETE\s+FROM|ALTER\s+SYSTEM)\b/i.test(item.sql))return result({status:'STOP',reason:'DESTRUCTIVE_MIGRATION_REJECTED',filename:item.filename},2);
      await db.withTransaction(async tx=>{
        await tx.query(item.sql);
        await tx.query(`INSERT INTO ${LEDGER} (filename,checksum,applied_at) VALUES ($1,$2,now())`,[item.filename,item.checksum]);
      });
      applied.push({filename:item.filename,checksum:item.checksum});
    }
    result({at:new Date().toISOString(),status:'PASS',applied:applied.map(row=>row.filename),pending:[]});
  }finally{await db.closePoolForTests();}
}
try {
  if(command==='db:preflight')await preflight();
  else if(command==='db:status')await status();
  else if(command==='db:migrate')await migrate();
  else result({status:'STOP',usage:['npm run db:preflight','npm run db:status','npm run db:migrate']},2);
} catch(error) { result(safeError(error),2); }
