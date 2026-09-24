// Operator-authorized Gate 10 (004 only), Gate 11 schema and rollback-only Gate 12.
// No production county import or deployment is reachable from this entry point.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createDatabase} from '../../src/persistence/db.js';
import {migrationInputs,digest} from './certification.js';
import {existingFingerprint,certifyProductionSchema,enrichmentTables,migration004} from './production-certification.js';
import {rollbackOnlyPersistenceQa} from './production-qa.js';
import {buildPlan} from './source-plan.js';
const reportPath='data/validation/sprint6_3-production-schema-certification.json';
const report={status:'STOP',at:new Date().toISOString(),stage:'LOCAL_PREREQUISITES',migrationApplied:false,migrationInvocations:0,providerCalls:0,databaseQueryCalls:0,productionCountyImport:false,applicationDeployment:false};
let db,client,inTransaction=false,claimed=false;
const persist=()=>writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
const query=async(sql,values=[])=>{report.databaseQueryCalls++;return client.query(sql,values);};
try{
  assert.deepEqual(process.argv.slice(2),['--apply-reviewed-004']);
  // Exclusive receipt prevents accidental reuse/reapplication of this entry point.
  await writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});claimed=true;
  const certificate=JSON.parse(await readFile('data/validation/sprint6_3-isolated-schema-certification.json'));
  assert.equal(certificate.status,'PASS');assert.equal(certificate.cleanup.verified,true);assert.equal(certificate.ledgerReplay.pending,0);assert.equal(certificate.ledgerReplay.rows,4);
  const migrations=await migrationInputs();assert.deepEqual(migrations.map(({filename,checksum})=>({filename,checksum})),certificate.migrations);
  assert.deepEqual((await readdir('netlify/database/migrations')).filter(f=>/\.sql$/.test(f)).sort(),migrations.map(m=>m.filename));
  for(const artifact of ['pre-import-status','regressions','ui-qa','security']){const receipt=JSON.parse(await readFile(`data/validation/sprint6_3-${artifact}.json`));assert.equal(receipt.status,'PASS');if(artifact==='pre-import-status'){assert.equal(receipt['db:preflight'].tlsAuthorized,true);assert.deepEqual(receipt['db:status'].pending,[migration004]);assert.ok(Date.now()-Date.parse(receipt['db:status'].at)<30*60*1000);}}
  const sql=migrations[3].sql;report.certified004Sha256=migrations[3].checksum;report.sourcePlan=(await buildPlan()).manifest;
  // Existing application code must be exactly the revision whose regressions passed.
  const regression=JSON.parse(await readFile('data/validation/sprint6_3-regressions.json'));assert.match(regression.workspace,/^data\/runtime\/sprint6_3\/regression-[a-f0-9-]{36}$/);
  async function compareTree(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())await compareTree(p);else assert.equal(digest(await readFile(p)),digest(await readFile(`${regression.workspace}/${p}`)),`CERTIFIED_REVISION_CHANGED ${p}`);}}
  for(const dir of ['src','apps/web/src','netlify'])await compareTree(dir);
  assert.equal(digest(await readFile('scripts/db-migrate.js')),digest(await readFile(`${regression.workspace}/scripts/db-migrate.js`)));
  process.loadEnvFile('.env');db=createDatabase();client=await db.getPool().connect();assert.equal(client.connection.stream.encrypted,true);assert.equal(client.connection.stream.authorized,true);
  report.stage='PRE_MIGRATION_DATABASE_GATES';await query('BEGIN READ ONLY');inTransaction=true;await query("SET LOCAL statement_timeout='60000'");assert.equal((await query('SELECT current_schema() AS namespace')).rows[0].namespace,'public');
  report.ledgerBefore=(await query('SELECT filename,checksum,applied_at FROM public.property_intelligence_schema_migrations ORDER BY filename')).rows;
  assert.deepEqual(report.ledgerBefore.map(({filename,checksum})=>({filename,checksum})),certificate.migrations.slice(0,3));
  report.existingTables=(await query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);assert.equal(report.existingTables.length,26);assert.ok(!enrichmentTables.some(t=>report.existingTables.includes(t)));
  report.existingBefore=await existingFingerprint(query,report.existingTables);
  await query('ROLLBACK');inTransaction=false;await persist();
  report.stage='APPLY_004_ONCE';report.migrationInvocations=1;await persist();
  // Sole migration authority: unchanged normal runner; just 004 was proved pending.
  const run=spawnSync(process.execPath,['scripts/db-migrate.js','db:migrate'],{cwd:process.cwd(),env:process.env,encoding:'utf8',timeout:120000});
  if(run.status!==0)throw new Error('MIGRATION_RUNNER_STOP_REQUIRES_REVIEW');
  const result=JSON.parse(run.stdout);assert.equal(result.status,'PASS');assert.deepEqual(result.pending,[]);assert.deepEqual(result.applied,migrations.map(m=>m.filename));report.migrationApplied=true;report.migrationResult=result;await persist();
  report.stage='PRODUCTION_SCHEMA_CERTIFICATION';await query('BEGIN READ ONLY');inTransaction=true;await query("SET LOCAL statement_timeout='60000'");
  report.ledgerAfter=(await query('SELECT filename,checksum,applied_at FROM public.property_intelligence_schema_migrations ORDER BY filename')).rows;assert.deepEqual(report.ledgerAfter.slice(0,3),report.ledgerBefore);assert.deepEqual(report.ledgerAfter.map(({filename,checksum})=>({filename,checksum})),certificate.migrations);
  const afterTables=(await query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);assert.deepEqual(afterTables,[...report.existingTables,...enrichmentTables].sort());
  report.schema=await certifyProductionSchema(query,sql,certificate);report.existingAfterMigration=await existingFingerprint(query,report.existingTables);assert.deepEqual(report.existingAfterMigration,report.existingBefore);
  await query('ROLLBACK');inTransaction=false;await persist();
  report.stage='ROLLBACK_ONLY_SYNTHETIC_PERSISTENCE_QA';await query('BEGIN');inTransaction=true;await query("SET LOCAL search_path='public,pg_catalog'");await query("SET LOCAL statement_timeout='60000'");await query("SET LOCAL lock_timeout='5000'");
  report.persistenceQa=await rollbackOnlyPersistenceQa(query);
  await query('ROLLBACK');inTransaction=false;report.persistenceQa.rollbackComplete=true;await persist();
  report.stage='POST_QA_PRESERVATION';await query('BEGIN READ ONLY');inTransaction=true;await query("SET LOCAL statement_timeout='60000'");
  report.existingAfterQa=await existingFingerprint(query,report.existingTables);assert.deepEqual(report.existingAfterQa,report.existingBefore);
  report.finalNewTableCounts=(await query('SELECT (SELECT count(*)::int FROM public.opportunity_assessor_import_batches) AS batches,(SELECT count(*)::int FROM public.opportunity_assessor_enrichments) AS observations')).rows[0];assert.deepEqual(report.finalNewTableCounts,{batches:0,observations:0});
  assert.equal((await query('SELECT count(*)::int AS n FROM public.discovery_sources WHERE id=$1',[report.persistenceQa.syntheticSourceId])).rows[0].n,0);report.persistenceQa.syntheticRowsAbsent=true;
  report.reconciledCandidates=(await query(`SELECT c.priority_band,c.candidate_status,c.score_version,count(*)::int AS n FROM public.opportunity_candidates c WHERE EXISTS(SELECT 1 FROM public.opportunity_record_links l JOIN public.discovery_records r ON r.id=l.discovery_record_id JOIN public.discovery_sources s ON s.id=r.discovery_source_id WHERE l.candidate_id=c.id AND s.source_file_hash=$1) GROUP BY c.priority_band,c.candidate_status,c.score_version ORDER BY c.priority_band`,[report.sourcePlan.ptsSha256])).rows;
  assert.deepEqual(report.reconciledCandidates.map(r=>[r.priority_band,r.candidate_status,r.score_version,r.n]),[['HIGH_REVIEW_PRIORITY','NEEDS_ADDRESS','kern-screen-v1',312],['LOW_REVIEW_PRIORITY','NEEDS_ADDRESS','kern-screen-v1',10303],['MEDIUM_REVIEW_PRIORITY','NEEDS_ADDRESS','kern-screen-v1',701]]);
  await query('ROLLBACK');inTransaction=false;
  report.stage='GATE_13_STOP';report.status='PASS';report.completedAt=new Date().toISOString();report.nextAction='WAIT_FOR_PRODUCTION_ENRICHMENT_IMPORT_AUTHORIZATION';
}catch(e){report.error=/^[A-Z0-9_]+$/.test(e.message??'')?e.message:'SANITIZED_GATE_FAILURE';report.sqlState=/^[0-9A-Z]{5}$/.test(e.code??'')?e.code:null;if(inTransaction){try{await query('ROLLBACK');inTransaction=false;report.failureRollback=true;}catch{report.failureRollback=false;}}process.exitCode=1;}
finally{client?.release();await db?.close();if(claimed)await persist();}
console.log(JSON.stringify({status:report.status,stage:report.stage,error:report.error,migrationApplied:report.migrationApplied,migrationInvocations:report.migrationInvocations,finalNewTableCounts:report.finalNewTableCounts,providerCalls:report.providerCalls,databaseQueryCalls:report.databaseQueryCalls},null,2));
