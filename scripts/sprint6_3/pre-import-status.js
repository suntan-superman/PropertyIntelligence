// Gate 9 only: original preflight/status authority plus a READ ONLY import plan.
// No migration or data-write command exists in this entry point.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createDatabase} from '../../src/persistence/db.js';
import {buildPlan} from './source-plan.js';
import {fingerprintPublic,digest} from './certification.js';
import {parseCsv} from '../../src/sources/kern/csv.js';
const regression=JSON.parse(await readFile('data/validation/sprint6_3-regressions.json'));
assert.equal(regression.status,'PASS');assert.match(regression.workspace,/^data\/runtime\/sprint6_3\/regression-[a-f0-9-]{36}$/);
const result={status:'STOP',gate:9,providerCalls:0,productionWrites:0,migrationApplied:false,databaseQueryCalls:0};
let db,client;
try{
  process.loadEnvFile('.env'); // Consume opaquely; never inspect or print values.
  for(const command of ['db:preflight','db:status']){
    // Preserve the original fixed-path preflight artifact by running the unchanged
    // script against the identical migration files in the ignored regression copy.
    const run=spawnSync(process.execPath,['scripts/db-migrate.js',command],{cwd:resolve(regression.workspace),env:process.env,encoding:'utf8',timeout:60000});
    if(run.status!==0)throw new Error('PREFLIGHT_STATUS_STOP');
    const output=JSON.parse(run.stdout);assert.equal(output.status,'PASS');result[command]=output;
  }
  assert.equal(result['db:preflight'].tlsAuthorized,true);
  assert.deepEqual(result['db:status'].pending,['004_kern_assessor_opportunity_enrichment.sql']);
  const {manifest}=await buildPlan();result.sources=manifest;
  db=createDatabase();client=await db.getPool().connect();
  const query=async(sql,values=[])=>{result.databaseQueryCalls++;return client.query(sql,values);};
  await query('BEGIN READ ONLY');await query("SET LOCAL statement_timeout='60000'");
  result.publicBefore=await fingerprintPublic(query);
  const source=(await query('SELECT id,source_file_hash,edition,record_count FROM public.discovery_sources WHERE source_file_hash=$1',[manifest.ptsSha256])).rows;assert.equal(source.length,1);assert.equal(source[0].record_count,11321);result.ptsSource=source[0];
  const candidates=(await query(`SELECT c.atn,c.screening_score,c.priority_band,c.score_version,c.candidate_status,c.identity_status FROM public.opportunity_candidates c WHERE EXISTS(SELECT 1 FROM public.opportunity_record_links l JOIN public.discovery_records r ON r.id=l.discovery_record_id WHERE l.candidate_id=c.id AND r.discovery_source_id=$1) ORDER BY c.atn`,[source[0].id])).rows;
  assert.equal(candidates.length,11316);assert.equal(digest(candidates.map(c=>c.atn).join('\n')),manifest.candidatePopulationSha256);
  const csv=parseCsv(await readFile('data/validation/sprint6_2-kern-atn-crosswalk.csv','utf8')),baseline=new Map(csv.rows.map(row=>{const r=Object.fromEntries(csv.headers.map((h,i)=>[h,row[i]]));return [r.normalized_pts_atn,r];}));
  const counts={},statuses={};for(const c of candidates){assert.equal(c.score_version,'kern-screen-v1');assert.equal(Number(c.screening_score),Number(baseline.get(c.atn)?.score));assert.equal(c.priority_band,baseline.get(c.atn)?.priority);counts[c.priority_band]=(counts[c.priority_band]??0)+1;statuses[c.candidate_status]=(statuses[c.candidate_status]??0)+1;}
  assert.deepEqual(counts,{LOW_REVIEW_PRIORITY:10303,MEDIUM_REVIEW_PRIORITY:701,HIGH_REVIEW_PRIORITY:312});
  assert.equal(digest(candidates.filter(c=>c.priority_band==='HIGH_REVIEW_PRIORITY').map(c=>c.atn).join('\n')),manifest.highPopulationSha256);
  result.remoteCandidates={count:candidates.length,priorityCounts:counts,statusCounts:statuses,scoresExactlyMatchCertifiedSource:true,scoresAndStatusesSha256:digest(JSON.stringify(candidates))};
  const present=(await query("SELECT to_regclass('public.opportunity_assessor_import_batches') IS NOT NULL AS batches,to_regclass('public.opportunity_assessor_enrichments') IS NOT NULL AS observations")).rows[0];assert.deepEqual(present,{batches:false,observations:false});result.migration004Tables=present;
  result.proposedBatch={batchId:null,edition:manifest.sourceEdition,sourceDate:manifest.sourceDate,importerVersion:manifest.importerVersion,inserts:11316,supersessions:0,rejections:0,condition:'Migration 004, schema certification, tagged QA and Gate 13 review remain required. Recheck state immediately before any separately authorized import.'};
  result.publicAfter=await fingerprintPublic(query);assert.deepEqual(result.publicAfter,result.publicBefore);await query('ROLLBACK');result.status='PASS';result.stop='GATE_10_PRODUCTION_NAMESPACE_MIGRATION_AUTHORIZATION_REQUIRED';
}catch(e){result.error=/^[A-Z0-9_]+$/.test(e.message??'')?e.message:'SANITIZED_PREFLIGHT_RECONCILIATION_STOP';process.exitCode=1;try{await client?.query('ROLLBACK');}catch{}}
finally{client?.release();await db?.close();}
result.legacyReadOnlyCommands=2;result.legacyQueryCalls=10;
await writeFile('data/validation/sprint6_3-pre-import-status.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
