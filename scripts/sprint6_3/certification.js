import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export const digest=v=>createHash('sha256').update(v).digest('hex');
export const ledgerName='property_intelligence_schema_migrations';
export function qaName(){return `qa_sprint6_3_${randomUUID().replaceAll('-','')}`;}
export function target(name,enabled){if(enabled!==true||!/^qa_sprint6_3_[a-f0-9]{32}$/.test(name))throw new Error('QA_NAMESPACE_GUARD_STOP');return `"${name}"`;}
export async function migrationInputs(){
  const names=['001_persistent_intelligence.sql','002_acquisition_decisions.sql','003_opportunity_discovery.sql','004_kern_assessor_opportunity_enrichment.sql'];
  const baseline=JSON.parse(await readFile('data/runtime/sprint6_3/baseline.json'));
  const result=[];
  for(const filename of names){
    const path=`netlify/database/migrations/${filename}`,sql=await readFile(path,'utf8'),checksum=digest(sql);
    const expected=baseline.files.find(f=>f.path===path);
    if(filename.startsWith('00')&&!filename.startsWith('004')&&expected?.sha256!==checksum)throw new Error('PRIOR_MIGRATION_CHANGED_STOP');
    auditSql(sql);result.push({filename,checksum,sql});
  }return result;
}
export function auditSql(sql){
  const clean=sql.replace(/--[^\r\n]*/g,'');
  if(/\bpublic\s*\.|\b(?:CREATE|ALTER|DROP)\s+(?:EXTENSION|SCHEMA|DATABASE|ROLE|SEQUENCE)|\b(?:SET|RESET)\s+(?:search_path|ROLE)|\bSECURITY\s+DEFINER|\bTRUNCATE\b|property_intelligence_schema_migrations/i.test(clean))throw new Error('MIGRATION_NAMESPACE_INCOMPATIBLE');
  // No schema-qualified DDL targets, FK targets or trigger functions allowed.
  if(/\b(?:TABLE|REFERENCES|FUNCTION|INDEX)\s+(?:IF NOT EXISTS\s+)?[a-z_]+\s*\.|\bON\s+[a-z_]+\s*\.\s*[a-z_]+\s*(?:\(|FOR\b)/i.test(clean))throw new Error('MIGRATION_CROSS_SCHEMA_STOP');
  if(/\bEXECUTE\s/i.test(clean)&&!clean.includes("EXECUTE format('REVOKE ALL ON opportunity_assessor_import_batches, opportunity_assessor_enrichments FROM %I',api_role)")&&!clean.includes("EXECUTE format('REVOKE ALL ON candidate_address_resolutions FROM %I',api_role)"))throw new Error('MIGRATION_DYNAMIC_SQL_STOP');
}
export async function namespaceGuard(query,name,enabled,{exists=false,ledger=false}={}){
  const quoted=target(name,enabled),path=`${quoted}, pg_catalog`;
  await query("SELECT pg_catalog.set_config('search_path',$1,true)",[path]);
  const r=(await query(`SELECT current_setting('search_path') AS path, current_schema() AS current,
    to_regnamespace($1)::oid AS namespace_oid, to_regclass($2)::oid AS expected_ledger,
    to_regclass('property_intelligence_schema_migrations')::oid AS resolved_ledger`,[name,`${name}.${ledgerName}`])).rows[0];
  if(r.path!==path||exists&&(!r.namespace_oid||r.current!==name)||!exists&&r.namespace_oid||r.resolved_ledger!==r.expected_ledger||ledger&&!r.expected_ledger)throw new Error('QA_NAMESPACE_RESOLUTION_STOP');
  return {schema:name,namespaceOid:r.namespace_oid,ledgerOid:r.expected_ledger};
}
export async function fingerprintPublic(query){
  await query("SELECT pg_catalog.set_config('search_path','pg_catalog',true)");
  const relations=(await query(`SELECT c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,c.relowner,
    COALESCE((SELECT jsonb_agg(jsonb_build_array(a.attname,a.atttypid,a.atttypmod,a.attnotnull,pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum)
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'[]') AS columns
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname`)).rows;
  const constraints=(await query(`SELECT c.conname,c.contype,c.convalidated,pg_get_constraintdef(c.oid) AS definition,r.relname
    FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace LEFT JOIN pg_class r ON r.oid=c.conrelid WHERE n.nspname='public' ORDER BY r.relname,c.conname`)).rows;
  const indexes=(await query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY indexname")).rows;
  const triggers=(await query(`SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`)).rows;
  const functions=(await query(`SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,pg_get_functiondef(p.oid) AS definition,p.proacl::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY p.proname,args`)).rows;
  const policies=(await query("SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname")).rows;
  const grants=(await query("SELECT table_name,grantor,grantee,privilege_type,is_grantable FROM information_schema.table_privileges WHERE table_schema='public' ORDER BY table_name,grantor,grantee,privilege_type")).rows;
  const ns=(await query("SELECT nspowner,nspacl::text FROM pg_namespace WHERE nspname='public'")).rows;
  const data=[];
  for(const r of relations.filter(r=>r.relkind==='r')){
    if(!/^[a-z_][a-z0-9_]*$/.test(r.relname))throw new Error('PUBLIC_TABLE_NAME_REVIEW_STOP');
    const value=(await query(`SELECT count(*)::text AS count,md5(COALESCE(string_agg(h,'' ORDER BY h),'')) AS fingerprint FROM (SELECT md5(row_to_json(t)::text) AS h FROM public."${r.relname}" t) safe`)).rows[0];
    data.push({table:r.relname,...value});
  }
  return {metadataSha256:digest(JSON.stringify({relations,constraints,indexes,triggers,functions,policies,grants,ns})),applicationDataSha256:digest(JSON.stringify(data)),tableCount:data.length,rows:data.reduce((n,r)=>n+Number(r.count),0)};
}
