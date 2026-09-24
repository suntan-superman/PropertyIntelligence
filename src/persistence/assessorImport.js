import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('hex');
export const ASSESSOR_FIELDS='source_reference disclaimer_reference assessor_source_edition assessor_source_date county_zip_sha256 county_member_sha256 source_row_locator source_row_fingerprint pts_atn_raw pts_atn_normalized assessor_atn_raw assessor_atn_normalized crosswalk_status crosswalk_reason apn9 situs_raw situs_status use_code use_description research_use_category mapping_version mapping_reason land_assessment improvement_assessment net_assessment base_year_value base_year_status county_acres county_acres_status geometry_status geometry_source_apn9 shape_sqft shape_acres acreage_delta review_flags'.split(' ');
export function validatePlan(plan){
  const {manifest:m,rows}=plan??{};if(!m||!Array.isArray(rows)||rows.length!==m.candidateCount||new Set(rows.map(r=>r.pts_atn_normalized)).size!==rows.length)throw new Error('ASSESSOR_PLAN_INVALID');
  if(hash(JSON.stringify(rows))!==m.payloadSha256)throw new Error('ASSESSOR_PAYLOAD_CHANGED');
  if(hash(rows.map(r=>r.pts_atn_normalized).sort().join('\n'))!==m.candidatePopulationSha256)throw new Error('ASSESSOR_POPULATION_CHANGED');
  for(const r of rows){if(Object.keys(r).length!==ASSESSOR_FIELDS.length||Object.keys(r).some(k=>!ASSESSOR_FIELDS.includes(k)))throw new Error('ASSESSOR_UNSAFE_FIELDS');
    if(r.county_zip_sha256!==m.countyZipSha256||r.county_member_sha256!==m.countyMemberSha256||r.assessor_source_edition!==m.sourceEdition||r.assessor_source_date!==m.sourceDate)throw new Error('ASSESSOR_PROVENANCE_CHANGED');
    if(!['MATCHED_EXACT','UNMATCHED'].includes(r.crosswalk_status))throw new Error('ASSESSOR_MATCH_STOP');}
  if(rows.filter(r=>r.crosswalk_status==='MATCHED_EXACT').length!==m.exactCount||rows.filter(r=>r.crosswalk_status==='UNMATCHED').length!==m.unmatchedCount)throw new Error('ASSESSOR_PLAN_COUNTS_STOP');
  return m;
}
export async function applyAssessorPlan(db,plan,{productionAuthorized=false}={}){
  const m=validatePlan(plan);
  return db.transaction(async tx=>{
    const namespace=(await tx.query('SELECT current_schema() AS name')).rows[0].name;
    if(!/^qa_sprint6_3_[a-f0-9]{32}$/.test(namespace)&&!(namespace==='public'&&productionAuthorized===true))throw new Error('PRODUCTION_IMPORT_AUTHORIZATION_REQUIRED');
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`assessor-import:${m.ptsSha256}`]);
    const source=(await tx.query('SELECT id,record_count FROM discovery_sources WHERE source_file_hash=$1',[m.ptsSha256])).rows[0];if(!source)throw new Error('ASSESSOR_PTS_SOURCE_NOT_FOUND');
    const candidates=(await tx.query(`SELECT c.id,c.atn,c.screening_score,c.priority_band,c.score_version,c.candidate_status,c.identity_status FROM opportunity_candidates c WHERE EXISTS (SELECT 1 FROM opportunity_record_links l JOIN discovery_records r ON r.id=l.discovery_record_id WHERE l.candidate_id=c.id AND r.discovery_source_id=$1) ORDER BY c.atn FOR UPDATE OF c`,[source.id])).rows;
    if(candidates.length!==m.candidateCount||hash(candidates.map(c=>c.atn).sort().join('\n'))!==m.candidatePopulationSha256)throw new Error('ASSESSOR_REMOTE_POPULATION_STOP');
    const high=candidates.filter(c=>c.priority_band==='HIGH_REVIEW_PRIORITY').map(c=>c.atn).sort();
    if(hash(high.join('\n'))!==m.highPopulationSha256||candidates.some(c=>c.score_version!=='kern-screen-v1'))throw new Error('ASSESSOR_REMOTE_SCREEN_STOP');
    const prior=(await tx.query('SELECT * FROM opportunity_assessor_import_batches WHERE discovery_source_id=$1 AND assessor_source_edition=$2 AND county_zip_sha256=$3',[source.id,m.sourceEdition,m.countyZipSha256])).rows[0];
    if(prior){if(prior.status!=='COMPLETE'||prior.summary?.payloadSha256!==m.payloadSha256)throw new Error('ASSESSOR_REPLAY_CONFLICT');const count=(await tx.query('SELECT count(*)::int AS n FROM opportunity_assessor_enrichments WHERE import_batch_id=$1',[prior.id])).rows[0].n;if(count!==m.candidateCount)throw new Error('ASSESSOR_REPLAY_COUNT_STOP');return {batchId:prior.id,replay:true,inserts:0,supersessions:0,rejections:0,providerCalls:0};}
    const batch=(await tx.query(`INSERT INTO opportunity_assessor_import_batches(discovery_source_id,pts_source_sha256,assessor_source_edition,assessor_source_date,county_zip_sha256,county_member_sha256,importer_version,candidate_population_sha256,high_population_sha256,candidate_count,exact_count,unmatched_count,status,summary) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'IMPORTING',$13::jsonb) RETURNING id`,[source.id,m.ptsSha256,m.sourceEdition,m.sourceDate,m.countyZipSha256,m.countyMemberSha256,m.importerVersion,m.candidatePopulationSha256,m.highPopulationSha256,m.candidateCount,m.exactCount,m.unmatchedCount,JSON.stringify(m)])).rows[0];
    const byAtn=new Map(candidates.map(c=>[c.atn,c.id]));
    const ids=candidates.map(c=>c.id);
    const superseded=await tx.query('UPDATE opportunity_assessor_enrichments SET superseded_at=now() WHERE candidate_id=ANY($1::uuid[]) AND superseded_at IS NULL RETURNING id',[ids]);
    const columns=['candidate_id','import_batch_id',...ASSESSOR_FIELDS];let inserted=0;
    for(let start=0;start<plan.rows.length;start+=200){const values=[],tuples=plan.rows.slice(start,start+200).map(row=>{const record=[byAtn.get(row.pts_atn_normalized),batch.id,...ASSESSOR_FIELDS.map(k=>k==='review_flags'?JSON.stringify(row[k]):row[k])];const offset=values.length;values.push(...record);return `(${record.map((_,i)=>`$${offset+i+1}`).join(',')})`;});
      const result=await tx.query(`INSERT INTO opportunity_assessor_enrichments(${columns.join(',')}) VALUES ${tuples.join(',')}`,values);inserted+=result.rowCount;}
    if(inserted!==m.candidateCount)throw new Error('ASSESSOR_INSERT_COUNT_STOP');
    await tx.query("UPDATE opportunity_assessor_import_batches SET status='COMPLETE',completed_at=now() WHERE id=$1",[batch.id]);
    const after=(await tx.query('SELECT id,atn,screening_score,priority_band,score_version,candidate_status,identity_status FROM opportunity_candidates WHERE id=ANY($1::uuid[]) ORDER BY atn',[ids])).rows;
    if(JSON.stringify(after)!==JSON.stringify(candidates))throw new Error('ASSESSOR_CANDIDATE_CHANGED_STOP');
    return {batchId:batch.id,replay:false,inserts:inserted,supersessions:superseded.rowCount,rejections:0,providerCalls:0};
  });
}
