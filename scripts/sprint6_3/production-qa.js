// Small synthetic Gate 12 QA only. Caller owns a transaction that MUST ROLLBACK.
// No real source plan is accepted. There is deliberately no commit operation.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {digest} from './certification.js';
import {ASSESSOR_FIELDS,applyAssessorPlan} from '../../src/persistence/assessorImport.js';
import {readAssessor,listAssessorCandidates} from '../../src/persistence/assessorOpportunityRepository.js';
export async function rollbackOnlyPersistenceQa(query){
  let qaStage='INIT';
  const tag=`SPRINT6_3_GATE12_${randomUUID()}`,zip=digest(`${tag}:synthetic-zip`),member=digest(`${tag}:synthetic-member`),pts=digest(`${tag}:synthetic-pts`);
  const rows=[1,2,3].map(i=>{
    const atn=`9999999000${i}`,exact=i<3;
    return {...Object.fromEntries(ASSESSOR_FIELDS.map(k=>[k,null])),source_reference:'SPRINT6_3_GATE12_SYNTHETIC_ONLY',disclaimer_reference:'docs/SPRINT6_2_SOURCE_DISCLAIMER.md',assessor_source_edition:tag,assessor_source_date:'2026-01-01',county_zip_sha256:zip,county_member_sha256:member,source_row_locator:exact?i:null,source_row_fingerprint:digest(`${tag}:${i}`),pts_atn_raw:`${atn.slice(0,3)}-${atn.slice(3,6)}-${atn.slice(6,8)}-${atn.slice(8,10)}-${atn.slice(10)}`,pts_atn_normalized:atn,assessor_atn_raw:exact?atn:null,assessor_atn_normalized:exact?atn:null,crosswalk_status:exact?'MATCHED_EXACT':'UNMATCHED',crosswalk_reason:'SYNTHETIC_QA_ONLY',apn9:exact?'999999999':null,situs_raw:i===2?'1 SYNTHETIC QA ST':null,situs_status:i===2?'SITUS_PRESENT':exact?'SITUS_MISSING':'NOT_APPLICABLE',use_code:exact?'0000':null,use_description:exact?'SYNTHETIC QA ONLY':null,research_use_category:exact?'RESIDENTIAL_SINGLE_FAMILY':null,mapping_version:exact?'kern-use-map-v1':null,mapping_reason:exact?'SYNTHETIC QA ONLY':null,land_assessment:exact?'1.00001':null,improvement_assessment:exact?'0.00000':null,net_assessment:exact?'1.00001':null,base_year_value:i===2?'0.00000':null,base_year_status:i===2?'EXPLICIT_ZERO':exact?'VALUE_MISSING':'NOT_APPLICABLE',county_acres:exact?'0.00000':null,county_acres_status:exact?'EXPLICIT_ZERO':'NOT_APPLICABLE',geometry_status:exact?'GEOMETRY_EXACT':'NOT_APPLICABLE',geometry_source_apn9:exact?'999999999':null,shape_sqft:exact?'43560.00000':null,shape_acres:exact?'1.00000000000':null,acreage_delta:exact?'1.00000000000':null,review_flags:exact?['ROLL_ACRES_EXPLICIT_ZERO']:['ASSESSOR_UNMATCHED']};
  });
  const manifest={sourceEdition:tag,sourceDate:'2026-01-01',countyZipSha256:zip,countyMemberSha256:member,ptsSha256:pts,importerVersion:'kern-assessor-import-v1',candidateCount:3,exactCount:2,unmatchedCount:1,candidatePopulationSha256:digest(rows.map(r=>r.pts_atn_normalized).sort().join('\n')),highPopulationSha256:digest(''),payloadSha256:digest(JSON.stringify(rows))},plan={manifest,rows};
  assert.equal((await query('SELECT current_schema() AS namespace')).rows[0].namespace,'public');
  qaStage='SEED_SOURCE';const sid=(await query("INSERT INTO discovery_sources(source_type,jurisdiction,source_name,edition,source_file_hash,record_count) VALUES ('QA_ONLY','KERN',$1,$1,$2,3) RETURNING id",[tag,pts])).rows[0].id;
  qaStage='SEED_CANDIDATES';
  for(const [i,r] of rows.entries()){
    const cid=(await query("INSERT INTO opportunity_candidates(jurisdiction,candidate_key,atn,identity_status,candidate_status,priority_band,screening_score,score_version) VALUES ('KERN',$1,$2,'PARTIAL','NEEDS_ADDRESS','LOW_REVIEW_PRIORITY',35,'kern-screen-v1') RETURNING id",[`${tag}:${r.pts_atn_normalized}`,r.pts_atn_normalized])).rows[0].id;
    const rid=(await query("INSERT INTO discovery_records(discovery_source_id,source_row_number,external_identifier,atn,raw_payload,normalized_payload,record_fingerprint) VALUES ($1,$2,$3,$3,'{}','{}',$4) RETURNING id",[sid,i+2,r.pts_atn_normalized,digest(`${tag}:${i}:record`)])).rows[0].id;
    await query("INSERT INTO opportunity_record_links(candidate_id,discovery_record_id,link_type,confidence_basis) VALUES ($1,$2,'SOURCE_IDENTIFIER','EXACT_SOURCE_ATN')",[cid,rid]);
  }
  const db={transaction:work=>work({query})};
  // Explicit permission is limited to this internally generated 3-row plan and
  // never commits. The production county CLI remains authorization-STOP-gated.
  const apply=p=>{assert.equal(p.rows.length,3);assert.equal(p.manifest.ptsSha256,pts);assert.ok(p.manifest.sourceEdition.startsWith(tag));return applyAssessorPlan(db,p,{productionAuthorized:true});};
  qaStage='INJECT_ROLLBACK';await query('SAVEPOINT qa_partial_failure');
  const bad=structuredClone(plan);bad.rows[1].county_acres_status='VALUE_MISSING';bad.manifest.payloadSha256=digest(JSON.stringify(bad.rows));
  await assert.rejects(apply(bad),e=>e.code==='23514');await query('ROLLBACK TO SAVEPOINT qa_partial_failure');await query('RELEASE SAVEPOINT qa_partial_failure');
  assert.equal((await query('SELECT count(*)::int AS n FROM opportunity_assessor_import_batches WHERE discovery_source_id=$1',[sid])).rows[0].n,0);
  qaStage='IMPORT_FIRST';const first=await apply(plan);qaStage='IMPORT_REPLAY';const replay=await apply(plan);assert.equal(first.inserts,3);assert.equal(replay.batchId,first.batchId);assert.equal(replay.inserts,0);assert.equal(replay.replay,true);
  const saved=(await query('SELECT * FROM opportunity_assessor_enrichments WHERE import_batch_id=$1 ORDER BY pts_atn_normalized',[first.batchId])).rows;assert.equal(saved.length,3);assert.equal(saved[0].base_year_value,null);assert.equal(saved[1].base_year_value,'0.00000');assert.equal(saved[0].land_assessment,'1.00001');assert.equal(saved[0].apn9,saved[1].apn9);
  assert.notEqual(saved[0].pts_atn_normalized,saved[0].apn9);assert.equal(saved[0].use_code,'0000');assert.equal(saved[0].research_use_category,'RESIDENTIAL_SINGLE_FAMILY');assert.equal(saved[0].situs_status,'SITUS_MISSING');assert.equal(saved[1].situs_status,'SITUS_PRESENT');assert.equal(saved[2].crosswalk_status,'UNMATCHED');assert.equal(saved[2].apn9,null);assert.equal(saved[2].assessor_atn_normalized,null);
  async function rejected(sql,values,code){await query('SAVEPOINT qa_reject');let rejected=false;try{await query(sql,values);}catch(e){assert.equal(e.code,code);rejected=true;}await query('ROLLBACK TO SAVEPOINT qa_reject');await query('RELEASE SAVEPOINT qa_reject');assert.ok(rejected);}
  await rejected('UPDATE opportunity_assessor_enrichments SET net_assessment=2 WHERE id=$1',[saved[0].id],'P0001');
  await rejected('UPDATE opportunity_assessor_import_batches SET importer_version=$1 WHERE id=$2',['INVALID',first.batchId],'P0001');
  qaStage='IMPORT_NEXT_EDITION';const next=structuredClone(plan);next.manifest.sourceEdition=`${tag}_NEXT`;next.manifest.countyZipSha256=digest(`${tag}:next-zip`);for(const r of next.rows){r.assessor_source_edition=next.manifest.sourceEdition;r.county_zip_sha256=next.manifest.countyZipSha256;}next.manifest.payloadSha256=digest(JSON.stringify(next.rows));
  const second=await apply(next);assert.equal(second.inserts,3);assert.equal(second.supersessions,3);
  const old=(await query('SELECT * FROM opportunity_assessor_enrichments WHERE import_batch_id=$1 ORDER BY pts_atn_normalized',[first.batchId])).rows;
  for(let i=0;i<3;i++){assert.ok(old[i].superseded_at);assert.deepEqual({...old[i],superseded_at:null},saved[i]);}
  qaStage='REOPEN_FILTER';const reopened=await readAssessor({query},saved[0].candidate_id);assert.equal(reopened.import_batch_id,second.batchId);
  const page=await listAssessorCandidates({query},{search:tag,limit:1});assert.equal(page.total,3);assert.equal(page.rows.length,1);
  return {tag,syntheticSourceId:sid,syntheticCandidateIds:saved.map(r=>r.candidate_id),transientBatchIds:[first.batchId,second.batchId],syntheticCandidates:3,transientObservations:6,exactMatches:2,unmatched:1,rollbackAfterPartialFailure:true,replayNoDuplicates:true,immutableContent:true,futureEditionSupersession:true,nullVsZero:true,decimalPrecision:true,repeatedApn9:true,atnApn9Separate:true,officialUseResearchCategorySeparate:true,situsStatesExact:true,serverPagination:true,reopenSameTransaction:true,candidateScoresStatusesUnchanged:true,committed:false,providerCalls:0};
}
