// Read-only diagnostics after Gate 12 STOP. No migration or QA writes/retry.
import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createDatabase} from '../../src/persistence/db.js';
import {existingFingerprint} from './production-certification.js';
const prior=JSON.parse(await readFile('data/validation/sprint6_3-production-schema-certification.json'));
assert.equal(prior.status,'STOP');assert.equal(prior.migrationApplied,true);assert.equal(prior.failureRollback,true);
const result={status:'STOP',mode:'READ_ONLY_DIAGNOSTICS',providerCalls:0,databaseQueryCalls:0,productionWrites:0};let db,client;
const previous=JSON.parse(await readFile('data/validation/sprint6_3-production-stop-diagnostics.json','utf8').catch(e=>{if(e.code==='ENOENT')return '{}';throw e;}));
if(previous.databaseQueryCalls)await copyFile('data/validation/sprint6_3-production-stop-diagnostics.json','data/runtime/sprint6_3/production-stop-diagnostics-first.json');
try{
  process.loadEnvFile('.env');db=createDatabase();client=await db.getPool().connect();
  const query=async(sql,values=[])=>{result.databaseQueryCalls++;return client.query(sql,values);};
  await query('BEGIN READ ONLY');await query("SET LOCAL statement_timeout='60000'");
  result.defaultNamespace=(await query("SELECT current_schema() AS namespace,current_setting('search_path') AS search_path,current_setting('transaction_read_only') AS read_only")).rows[0];
  // Reproduce only the failed QA setup, without DML or invoking the importer.
  await query("SET LOCAL search_path='public,pg_catalog'");
  result.qaNamespace=(await query("SELECT current_schema() AS namespace,current_setting('search_path') AS search_path")).rows[0];
  assert.equal(result.qaNamespace.namespace,null);assert.equal(result.qaNamespace.search_path,'"public,pg_catalog"');
  result.cause='QA_SEARCH_PATH_QUOTED_AS_ONE_IDENTIFIER';result.qaStoppedBeforeSyntheticInserts=true;
  await query("SELECT set_config('search_path','public,pg_catalog',true)");
  result.expectedNamespace=(await query('SELECT current_schema() AS namespace')).rows[0];assert.equal(result.expectedNamespace.namespace,'public');
  result.existingAfterRollback=await existingFingerprint(query,prior.existingTables);assert.deepEqual(result.existingAfterRollback,prior.existingBefore);result.existingMetadataDataUnchanged=true;
  result.newTableCounts=(await query('SELECT (SELECT count(*)::int FROM public.opportunity_assessor_import_batches) AS batches,(SELECT count(*)::int FROM public.opportunity_assessor_enrichments) AS observations')).rows[0];assert.deepEqual(result.newTableCounts,{batches:0,observations:0});
  result.ledger=JSON.parse(JSON.stringify((await query('SELECT filename,checksum,applied_at FROM public.property_intelligence_schema_migrations ORDER BY filename')).rows));assert.deepEqual(result.ledger,prior.ledgerAfter);result.migration004LedgerRows=result.ledger.filter(r=>r.filename.startsWith('004')).length;assert.equal(result.migration004LedgerRows,1);
  await query('ROLLBACK');result.diagnosticsPassed=true;result.nextAction='STOP_FOR_REVIEW_BEFORE_RETRYING_GATE_12';
}catch(e){result.diagnosticError=/^[A-Z0-9_]+$/.test(e.message??'')?e.message:'SANITIZED_DIAGNOSTIC_FAILURE';process.exitCode=1;try{await client?.query('ROLLBACK');}catch{}}
finally{client?.release();await db?.close();}
result.cumulativeDiagnosticQueryCalls=(previous.cumulativeDiagnosticQueryCalls??previous.databaseQueryCalls??0)+result.databaseQueryCalls;
await writeFile('data/validation/sprint6_3-production-stop-diagnostics.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
