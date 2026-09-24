import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {applyAssessorPlan} from '../../src/persistence/assessorImport.js';
import {listAssessorCandidates,readAssessor} from '../../src/persistence/assessorOpportunityRepository.js';
import {createApi} from '../../src/workbench/api/router.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
export async function certifyImporter(query,sourcePlan){
  const originals=[sourcePlan.rows.find(r=>r.crosswalk_status==='MATCHED_EXACT'),sourcePlan.rows.find(r=>r.crosswalk_status==='MATCHED_EXACT'&&r.situs_status==='SITUS_PRESENT'),sourcePlan.rows.find(r=>r.crosswalk_status==='UNMATCHED')];
  const rows=structuredClone(originals);for(let i=0;i<rows.length;i++){const atn=`9999999${String(i+1).padStart(4,'0')}`;rows[i].pts_atn_normalized=atn;rows[i].pts_atn_raw=`${atn.slice(0,3)}-${atn.slice(3,6)}-${atn.slice(6,8)}-${atn.slice(8,10)}-${atn.slice(10)}`;if(i<2){rows[i].assessor_atn_raw=atn;rows[i].assessor_atn_normalized=atn;rows[i].apn9='999999999';rows[i].geometry_source_apn9='999999999';rows[i].base_year_value=i===0?null:'0.00000';rows[i].base_year_status=i===0?'VALUE_MISSING':'EXPLICIT_ZERO';}rows[i].assessor_source_edition='QA SYNTHETIC 2026';}
  const m={...sourcePlan.manifest,sourceEdition:'QA SYNTHETIC 2026',ptsSha256:hash('QA_SOURCE_ONLY'),candidateCount:3,exactCount:2,unmatchedCount:1,candidatePopulationSha256:hash(rows.map(r=>r.pts_atn_normalized).sort().join('\n')),highPopulationSha256:hash(''),payloadSha256:hash(JSON.stringify(rows))},plan={manifest:m,rows};
  const sid=(await query("INSERT INTO discovery_sources(source_type,jurisdiction,source_name,edition,source_file_hash,record_count) VALUES ('QA_ONLY','KERN','SPRINT6_3_QA','QA',$1,3) RETURNING id",[m.ptsSha256])).rows[0].id;
  for(const [i,r] of rows.entries()){
    const cid=(await query("INSERT INTO opportunity_candidates(jurisdiction,candidate_key,atn,identity_status,candidate_status,priority_band,screening_score,score_version) VALUES ('KERN',$1,$2,'PARTIAL','NEEDS_ADDRESS','LOW_REVIEW_PRIORITY',35,'kern-screen-v1') RETURNING id",[`ATN:${r.pts_atn_normalized}`,r.pts_atn_normalized])).rows[0].id;
    const rid=(await query("INSERT INTO discovery_records(discovery_source_id,source_row_number,external_identifier,atn,raw_payload,normalized_payload,record_fingerprint) VALUES ($1,$2,$3,$3,'{}','{}',$4) RETURNING id",[sid,i+2,r.pts_atn_normalized,hash(r.pts_atn_normalized)])).rows[0].id;
    await query("INSERT INTO opportunity_record_links(candidate_id,discovery_record_id,link_type,confidence_basis) VALUES ($1,$2,'SOURCE_IDENTIFIER','EXACT_SOURCE_ATN')",[cid,rid]);
  }
  // Dedicated transaction is supplied by the schema runner; savepoints test failures.
  const db={transaction:work=>work({query})};
  await query('SAVEPOINT import_failure');let queries=0;
  await assert.rejects(applyAssessorPlan({transaction:work=>work({query:async(sql,values)=>{if(sql.startsWith('INSERT INTO opportunity_assessor_enrichments'))throw new Error('QA_INJECTED_FAILURE');queries++;return query(sql,values);}})},plan),/QA_INJECTED_FAILURE/);
  await query('ROLLBACK TO SAVEPOINT import_failure');await query('RELEASE SAVEPOINT import_failure');
  assert.equal((await query('SELECT count(*)::int AS n FROM opportunity_assessor_import_batches')).rows[0].n,0);
  const first=await applyAssessorPlan(db,plan),replay=await applyAssessorPlan(db,plan);assert.equal(first.inserts,3);assert.equal(replay.batchId,first.batchId);assert.equal(replay.inserts,0);assert.equal(replay.replay,true);
  const originalsSaved=(await query('SELECT * FROM opportunity_assessor_enrichments ORDER BY pts_atn_normalized')).rows;
  assert.equal(originalsSaved[0].base_year_value,null);assert.equal(originalsSaved[1].base_year_value,'0.00000');assert.equal(originalsSaved[0].apn9,originalsSaved[1].apn9);
  async function mustReject(sql,values,code){await query('SAVEPOINT invalid_case');let seen=false;try{await query(sql,values);}catch(e){assert.equal(e.code,code);seen=true;}await query('ROLLBACK TO SAVEPOINT invalid_case');await query('RELEASE SAVEPOINT invalid_case');assert.ok(seen);}
  await mustReject('UPDATE opportunity_assessor_enrichments SET land_assessment=1 WHERE id=$1',[originalsSaved[0].id],'P0001');
  await mustReject('DELETE FROM opportunity_assessor_enrichments WHERE id=$1',[originalsSaved[0].id],'P0001');
  await mustReject('UPDATE opportunity_assessor_import_batches SET importer_version=$1 WHERE id=$2',['bad',first.batchId],'P0001');
  const next=structuredClone(plan);next.manifest.sourceEdition='QA SYNTHETIC 2027';next.manifest.sourceDate='2027-06-26';next.manifest.countyZipSha256=hash('QA_NEXT_EDITION');for(const r of next.rows){r.assessor_source_edition=next.manifest.sourceEdition;r.assessor_source_date=next.manifest.sourceDate;r.county_zip_sha256=next.manifest.countyZipSha256;}next.manifest.payloadSha256=hash(JSON.stringify(next.rows));
  const second=await applyAssessorPlan(db,next);assert.equal(second.supersessions,3);assert.equal(second.inserts,3);
  const previous=(await query('SELECT * FROM opportunity_assessor_enrichments WHERE import_batch_id=$1 ORDER BY pts_atn_normalized',[first.batchId])).rows;
  for(let i=0;i<previous.length;i++){assert.ok(previous[i].superseded_at);const {superseded_at:a,...old}=originalsSaved[i],{superseded_at:b,...now}=previous[i];assert.deepEqual(now,old);}
  assert.equal((await query('SELECT count(*)::int AS n FROM opportunity_assessor_enrichments WHERE superseded_at IS NULL')).rows[0].n,3);
  const tx={query},timings={};
  for(const [name,options,expected] of [['all',{},3],['exact',{assessorStatus:'MATCHED_EXACT'},2],['unmatched',{assessorStatus:'UNMATCHED'},1],['situs',{hasSitus:'true'},rows.filter(r=>r.situs_status==='SITUS_PRESENT').length],['geometry',{geometry:'true'},2],['review',{reviewRequired:'true'},3],['highResidential',{preset:'HIGH_RESIDENTIAL'},0],['highSfr',{preset:'HIGH_SFR'},0]]){
    const start=performance.now(),result=await listAssessorCandidates(tx,options);timings[name]=Math.round(performance.now()-start);assert.equal(result.total,expected,name);
  }
  const paged=await listAssessorCandidates(tx,{limit:1,offset:1});assert.equal(paged.rows.length,1);assert.equal(paged.total,3);
  const emptyPage=await listAssessorCandidates(tx,{limit:1,offset:999});assert.equal(emptyPage.rows.length,0);assert.equal(emptyPage.total,3);
  const candidateId=originalsSaved[0].candidate_id;assert.equal((await readAssessor(tx,candidateId)).import_batch_id,second.batchId);
  // A fresh handler for every request proves reads do not require ephemeral sessions.
  const request=async(path,body)=>createApi({runtime:'netlify',persistence:db})(new Request(`http://127.0.0.1/api/${path}`,body===undefined?{}:{method:'POST',headers:{Origin:'http://127.0.0.1','Content-Type':'application/json'},body:JSON.stringify(body)}));
  const list=await request('opportunities?pageSize=10000');assert.equal(list.status,200);const listing=await list.json();assert.equal(listing.pageSize,100);assert.equal(listing.total,3);
  const detail=await request(`opportunities/${candidateId}`);assert.equal(detail.status,200);const opened=(await detail.json()).opportunity;assert.equal(opened.assessor.import_batch_id,second.batchId);assert.doesNotMatch(JSON.stringify(opened),/owner_name|raw_payload|normalized_payload/);
  const csv=await request('opportunities/export');assert.equal(csv.status,200);assert.doesNotMatch(await csv.text(),/assessment|situs|owner|county_zip|source_row_fingerprint/i);
  const denied=await request(`opportunities/${candidateId}/analyze`,{});assert.equal(denied.status,409);
  const unmatched=await request(`opportunities/${originalsSaved[2].candidate_id}/analyze`,{confirmProviderCall:true,acknowledgeQuota:true});assert.equal(unmatched.status,409);assert.equal((await unmatched.json()).error,'ENRICHMENT_IDENTITY_REQUIRED');
  return {syntheticCandidates:3,exact:2,unmatched:1,rollback:true,failedImportQueries:queries,replayNoDuplicates:true,immutableContent:true,futureEditionSupersession:true,nullVsZero:true,repeatedApn9:true,candidateScoresStatusesUnchanged:true,serverFilters:true,pagination:true,coldApiReopen:true,safeCsv:true,confirmationGate:true,queryMs:timings,providerCalls:0};
}
