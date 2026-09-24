// QA-only. Never imported by application code or the production migration runner.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createDatabase} from '../src/persistence/db.js';
import {qaName,target,ledgerName,migrationInputs,namespaceGuard,fingerprintPublic,digest} from './sprint6_3/certification.js';
import {buildPlan} from './sprint6_3/source-plan.js';
import {certifyImporter} from './sprint6_3/import-certify.js';
const enabled=process.argv.length===3&&process.argv[2]==='--certify-sprint6-3';
const schema=qaName(),quoted=target(schema,enabled),report={status:'STOP',qaSchema:schema,mode:'ISOLATED_SCHEMA_ONLY',providerCalls:0,databaseConnections:0,databaseQueryCalls:0,productionWrites:0,productionMigrationApplied:false,cleanup:{attempted:false,verified:false}};
let db,client,inTransaction=false,created=false,stage='MIGRATION_REVIEW';
const query=async(sql,values=[])=>{report.databaseQueryCalls++;return client.query(sql,values);};
const equal=(a,b,label)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(label);};
try{
  const migrations=await migrationInputs();report.migrations=migrations.map(({filename,checksum})=>({filename,checksum}));
  const sourcePlan=await buildPlan();report.sourceReconciliation=sourcePlan.manifest;
  report.migrationReview={publicQualifiedReferences:0,sequences:0,extensions:0,crossSchemaTargets:0,ledgerAssumptions:0,legacyTriggers:0,newTriggers:2,rlsAndGrants:'004 targets new unqualified QA tables; static anon/authenticated role revokes only'};
  // Opaque environment consumption only; never print connection values or errors.
  try{process.loadEnvFile('.env');}catch(e){if(e.code!=='ENOENT')throw new Error('ENV_LOAD_STOP');}
  db=createDatabase();if(!db)throw new Error('DATABASE_NOT_CONFIGURED');
  stage='CONNECT';report.databaseConnections++;client=await db.getPool().connect();
  if(!client.connection?.stream?.encrypted||client.connection.stream.authorized!==true)throw new Error('VERIFIED_TLS_REQUIRED');
  report.tls={encrypted:true,authorized:true};
  await query('BEGIN');inTransaction=true;
  await query("SET LOCAL statement_timeout='60000'");await query("SET LOCAL lock_timeout='5000'");
  stage='PUBLIC_BASELINE';report.publicBefore=await fingerprintPublic(query);
  report.server=(await query('SELECT version() AS version,current_setting(\'server_version_num\') AS version_number')).rows[0];
  const permission=(await query("SELECT has_database_privilege(current_database(),'CREATE') AS can_create")).rows[0];if(!permission.can_create)throw new Error('SCHEMA_CREATE_PRIVILEGE_REQUIRED');
  stage='PRE_DDL_GUARDS';report.preDdl=await namespaceGuard(query,schema,enabled);
  // Target name is generated internally; no CLI/environment-supplied identifier.
  await query(`CREATE SCHEMA ${target(schema,enabled)}`);created=true;
  await namespaceGuard(query,schema,enabled,{exists:true});
  await query(`REVOKE ALL ON SCHEMA ${quoted} FROM PUBLIC`);
  await query(`CREATE TABLE ${quoted}.${ledgerName} (filename text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`);
  for(const m of migrations){
    stage=`MIGRATION_${m.filename.slice(0,3)}`;await namespaceGuard(query,schema,enabled,{exists:true,ledger:true});
    await query(m.sql);await query(`INSERT INTO ${quoted}.${ledgerName}(filename,checksum) VALUES ($1,$2)`,[m.filename,m.checksum]);
  }
  stage='SCHEMA_CERTIFICATION';
  const ledger=(await query(`SELECT filename,checksum FROM ${quoted}.${ledgerName} ORDER BY filename`)).rows;equal(ledger,report.migrations,'LEDGER_MISMATCH');report.ledger=ledger;
  // Replay the ledger authority, not CREATE statements: all four are already applied.
  report.ledgerReplay={pending:migrations.filter(m=>!ledger.some(l=>l.filename===m.filename&&l.checksum===m.checksum)).length,rows:ledger.length};
  const tables=(await query("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname=$1 ORDER BY tablename",[schema])).rows;
  const expected=migrations.flatMap(m=>[...m.sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)/g)].map(x=>x[1])).concat(ledgerName).sort();equal(tables.map(t=>t.tablename),expected,'TABLE_SET_MISMATCH');
  const indexes=(await query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=$1 ORDER BY indexname",[schema])).rows;
  const explicitIndexes=migrations.flatMap(m=>[...m.sql.matchAll(/CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?([a-z_][a-z0-9_]*)/g)].map(x=>x[1]));
  if(explicitIndexes.some(name=>!indexes.some(i=>i.indexname===name)))throw new Error('MIGRATION_INDEX_MISSING');
  const fks=(await query(`SELECT c.conname,c.confdeltype,n.nspname AS target_schema FROM pg_constraint c JOIN pg_class t ON t.oid=c.confrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE c.connamespace=$1::regnamespace AND c.contype='f'`,[schema])).rows;
  if(fks.length!==migrations.reduce((n,m)=>n+(m.sql.match(/\bREFERENCES\b/g)??[]).length,0)||fks.some(f=>f.target_schema!==schema||f.confdeltype!=='r'))throw new Error('FK_NAMESPACE_OR_DELETE_POLICY_STOP');
  const triggers=(await query(`SELECT t.tgname,p.proname,n.nspname AS function_schema FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE c.relnamespace=$1::regnamespace AND NOT t.tgisinternal ORDER BY t.tgname`,[schema])).rows;
  if(triggers.length!==2||triggers.some(t=>t.function_schema!==schema))throw new Error('TRIGGER_BINDING_STOP');
  const constraints=(await query("SELECT contype,count(*)::int AS n FROM pg_constraint WHERE connamespace=$1::regnamespace GROUP BY contype ORDER BY contype",[schema])).rows;
  const newTables=tables.filter(t=>t.tablename.startsWith('opportunity_assessor_'));if(newTables.length!==2||newTables.some(t=>!t.rowsecurity))throw new Error('RLS_STOP');
  const grants=(await query(`SELECT c.relname,a.privilege_type FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE c.relnamespace=$1::regnamespace AND c.relname LIKE 'opportunity_assessor_%' AND (a.grantee=0 OR r.rolname IN ('anon','authenticated'))`,[schema])).rows;if(grants.length)throw new Error('PUBLIC_GRANT_STOP');
  const newIndexes=indexes.filter(i=>i.indexname.startsWith('opportunity_assessor_'));if(newIndexes.length!==10)throw new Error('004_INDEX_COUNT_STOP');
  const decimals=(await query("SELECT column_name,data_type,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema=$1 AND table_name='opportunity_assessor_enrichments' AND column_name IN ('land_assessment','improvement_assessment','net_assessment','base_year_value') ORDER BY column_name",[schema])).rows;
  if(decimals.length!==4||decimals.some(c=>c.data_type!=='numeric'||c.numeric_precision!==19||c.numeric_scale!==5))throw new Error('MONEY_DECIMAL_STOP');
  report.schema={tables:tables.length,indexes:indexes.length,foreignKeys:fks.length,triggers:triggers.length,constraints,newTables,newIndexes:newIndexes.map(i=>i.indexname),decimalColumns:decimals,publicApiGrants:grants.length};
  stage='ROLLBACK_TEST';
  await query('SAVEPOINT qa_failure');await query(`INSERT INTO ${quoted}.properties(normalized_address,address_line1,city,state,postal_code) VALUES ('QA_ONLY','QA ONLY','QA','CA','00000')`);
  let failed=false;try{await query(`INSERT INTO ${quoted}.properties(normalized_address,address_line1,city,state,postal_code) VALUES ('QA_ONLY','QA ONLY','QA','CA','00000')`);}catch(e){if(e.code!=='23505')throw e;failed=true;}
  if(!failed)throw new Error('EXPECTED_UNIQUE_REJECTION');await query('ROLLBACK TO SAVEPOINT qa_failure');await query('RELEASE SAVEPOINT qa_failure');
  if((await query(`SELECT count(*)::int AS n FROM ${quoted}.properties`)).rows[0].n!==0)throw new Error('ROLLBACK_FAILED');report.rollback={uniqueViolationRejected:true,syntheticRowAbsent:true};
  stage='ISOLATED_IMPORTER_QA';report.importerQa=await certifyImporter(query,sourcePlan);
  stage='PUBLIC_COMPARE';report.publicAfterTest=await fingerprintPublic(query);equal(report.publicAfterTest,report.publicBefore,'PUBLIC_CHANGED_STOP');
  stage='EXACT_QA_CLEANUP';await namespaceGuard(query,schema,enabled,{exists:true,ledger:true});report.cleanup.attempted=true;
  await query(`DROP SCHEMA ${target(schema,enabled)} CASCADE`);
  if((await query('SELECT to_regnamespace($1)::oid AS id',[schema])).rows[0].id!==null)throw new Error('CLEANUP_FAILED');
  report.publicAfterCleanup=await fingerprintPublic(query);equal(report.publicAfterCleanup,report.publicBefore,'PUBLIC_CHANGED_AFTER_CLEANUP');
  await query('COMMIT');inTransaction=false;
  // Fresh post-commit observation: only hashes/counts are reported, never records.
  await query('BEGIN READ ONLY');inTransaction=true;report.publicAfterCommit=await fingerprintPublic(query);equal(report.publicAfterCommit,report.publicBefore,'PUBLIC_CHANGED_AFTER_COMMIT');
  report.cleanup.verified=(await query('SELECT to_regnamespace($1)::oid AS id',[schema])).rows[0].id===null;
  await query('COMMIT');inTransaction=false;if(!report.cleanup.verified)throw new Error('CLEANUP_FAILED');report.status='PASS';report.completedStage='ISOLATED_REBUILD_CERTIFIED';
}catch(e){
  report.failedStage=stage;report.error=/^[A-Z0-9_]+$/.test(e.message??'')?e.message:'SANITIZED_CERTIFICATION_FAILURE';report.sqlState=/^[0-9A-Z]{5}$/.test(e.code??'')?e.code:null;
  if(inTransaction){try{await query('ROLLBACK');inTransaction=false;report.cleanup.transactionRolledBack=true;}catch{report.cleanup.transactionRolledBack=false;}}
  if(client&&created&&!inTransaction){try{target(schema,enabled);report.cleanup.verified=(await query('SELECT to_regnamespace($1)::oid AS id',[schema])).rows[0].id===null;await query('BEGIN READ ONLY');inTransaction=true;report.publicAfterFailure=await fingerprintPublic(query);report.publicUnchangedAfterFailure=JSON.stringify(report.publicAfterFailure)===JSON.stringify(report.publicBefore);await query('ROLLBACK');inTransaction=false;}catch{report.cleanup.postFailureCheck='UNAVAILABLE';}}
  process.exitCode=1;
}finally{if(inTransaction)try{await query('ROLLBACK');}catch{}client?.release();await db?.close();}
await mkdir('data/validation',{recursive:true});
try{const previous=JSON.parse(await readFile('data/validation/sprint6_3-isolated-schema-certification.json','utf8'));target(previous.qaSchema,true);await mkdir('data/runtime/sprint6_3/certifications',{recursive:true});await writeFile(`data/runtime/sprint6_3/certifications/${previous.qaSchema}.json`,JSON.stringify(previous,null,2));report.cumulativeDatabaseConnections=(previous.cumulativeDatabaseConnections??previous.databaseConnections)+report.databaseConnections;report.cumulativeDatabaseQueryCalls=(previous.cumulativeDatabaseQueryCalls??previous.databaseQueryCalls)+report.databaseQueryCalls;}catch(e){if(e.code!=='ENOENT')throw e;}
await writeFile('data/validation/sprint6_3-isolated-schema-certification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
