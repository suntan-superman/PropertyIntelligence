import {syntheticFixture,digest,TEST_NOW} from './fixture.js';
import {validateSyntheticEvidence} from './policy.js';
import {insertDiscoverySource,insertDiscoveryRecord,upsertOpportunityCandidate,insertRecordLink,getCandidate} from '../../src/persistence/opportunityRepository.js';
import {applyAssessorPlan,ASSESSOR_FIELDS} from '../../src/persistence/assessorImport.js';
import {readAssessor} from '../../src/persistence/assessorOpportunityRepository.js';
import {persistSyntheticSequence} from './sequence.js';

// Rebinding is ONLY construction of an explicitly synthetic test approval.
// No real reviewer decision is loaded, generated or modified by these helpers.
function bind(f){
  f.packetSha256=digest(f.packet);
  for(const e of f.evidence)Object.assign(e,{value:f.packet.address[e.field],candidateId:f.packet.candidateId,atn:f.packet.county.atn,apn9:f.packet.county.apn9,packetSha256:f.packetSha256});
  Object.assign(f.approval,{candidateId:f.packet.candidateId,packetSha256:f.packetSha256,evidenceSha256:digest(f.evidence),confirmedAddress:{...f.packet.address}});
  return f;
}
export function postgresFixture(index){
  const f=syntheticFixture();f.packet.county.atn=`900${String(index).padStart(8,'0')}`;f.packet.county.apn9=`900${String(index).padStart(6,'0')}`;
  f.packet.address.street=`${100+index} Synthetic Persistence Lane`;
  for(const k of ['sourceSha256','discoverySha256','rowSha256','recordSha256'])f.packet.assessor[k]=digest(`SYNTHETIC_V2:${index}:${k}`);
  return bind(f);
}
export async function seedThroughRepositories(tx,input){
  validateSyntheticEvidence(input,{now:TEST_NOW});const f=structuredClone(input),p=f.packet,a=p.assessor;
  const source=await insertDiscoverySource(tx,{sourceType:'SYNTHETIC_QA',jurisdiction:p.county.jurisdiction,sourceName:'PI DURABLE IDENTITY V2 SYNTHETIC',edition:'SYNTHETIC_V2',sourceDate:'2026-10-09',sourceFileHash:a.discoverySha256,recordCount:1,provenancePayload:{synthetic:true,testOnly:true}});
  const record=await insertDiscoveryRecord(tx,{discoverySourceId:source.id,sourceRowNumber:2,externalIdentifier:`SYNTHETIC:${p.county.atn}`,atn:p.county.atn,apn:p.county.apn9,rawPayload:{synthetic:true},normalizedPayload:{synthetic:true},recordFingerprint:a.recordSha256});
  const candidate=await upsertOpportunityCandidate(tx,{jurisdiction:p.county.jurisdiction,candidateKey:`SYNTHETIC_V2:${p.county.atn}`,atn:p.county.atn,apn:p.county.apn9,identityStatus:'PARTIAL',candidateStatus:'NEEDS_ADDRESS',priorityBand:'INSUFFICIENT_DATA',screeningScore:null,scoreVersion:'kern-screen-v1'});
  await insertRecordLink(tx,{candidateId:candidate.id,discoveryRecordId:record.id,linkType:'SYNTHETIC_COUNTY_EXACT',confidenceBasis:'SYNTHETIC_EXACT_ATN'});
  const countyZip=digest(`SYNTHETIC ZIP:${a.sourceSha256}`);
  const row=Object.fromEntries(ASSESSOR_FIELDS.map(k=>[k,null]));
  Object.assign(row,{source_reference:'SYNTHETIC_DOCUMENT_V2',disclaimer_reference:'docs/SPRINT6_2_SOURCE_DISCLAIMER.md',assessor_source_edition:'SYNTHETIC_V2',assessor_source_date:'2026-10-09',county_zip_sha256:countyZip,county_member_sha256:a.sourceSha256,source_row_locator:2,source_row_fingerprint:a.rowSha256,pts_atn_raw:p.county.atn.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})(\d)$/,'$1-$2-$3-$4-$5'),pts_atn_normalized:p.county.atn,assessor_atn_raw:p.county.atn,assessor_atn_normalized:p.county.atn,crosswalk_status:'MATCHED_EXACT',crosswalk_reason:'SYNTHETIC_EXACT_ATN',apn9:p.county.apn9,situs_raw:`${p.address.street}, ${p.address.city}`,situs_status:'SITUS_PRESENT',use_code:'0100',use_description:'SYNTHETIC ONLY',research_use_category:'RESIDENTIAL_SINGLE_FAMILY',mapping_version:'kern-use-map-v1',mapping_reason:'SYNTHETIC FIXTURE',base_year_status:'VALUE_MISSING',county_acres_status:'VALUE_MISSING',geometry_status:'GEOMETRY_MISSING',review_flags:[]});
  const rows=[row],manifest={ptsSha256:a.discoverySha256,sourceEdition:'SYNTHETIC_V2',sourceDate:'2026-10-09',countyZipSha256:countyZip,countyMemberSha256:a.sourceSha256,importerVersion:'SYNTHETIC_IDENTITY_V2',candidatePopulationSha256:digest(p.county.atn),highPopulationSha256:digest(''),candidateCount:1,exactCount:1,unmatchedCount:0,payloadSha256:digest(rows)};
  const imported=await applyAssessorPlan({transaction:work=>work(tx)},{manifest,rows});
  const assessor=await readAssessor(tx,candidate.id);
  p.candidateId=candidate.id;Object.assign(a,{id:assessor.id,sourceId:source.id,recordId:record.id,batchId:imported.batchId});
  return bind(f);
}
export async function runPostgresSequence(db,input,{beforePersistence=null,txQuery=null,authorize=null,authorization=null,beforeCommit=null}={}){
  validateSyntheticEvidence(input,{now:TEST_NOW});
  return db.transaction(async original=>{
    const tx=txQuery?{query:(sql,v)=>txQuery(original,sql,v)}:original;
    // Acquire before source/candidate creation, so concurrent NEW requests also serialize.
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`synthetic-v2-seed:${input.packet.county.atn}`]);
    if(authorize)await authorize();
    const f=await seedThroughRepositories(tx,input);
    if(beforePersistence)await beforePersistence(tx,f);
    const result=await persistSyntheticSequence({db:{transaction:work=>work(tx)},fixture:f,now:TEST_NOW,certification:'LOCAL_POSTGRESQL_SYNTHETIC',authorization});
    const candidate=await getCandidate(tx,f.packet.candidateId);
    if(candidate?.linked_property_id!==result.propertyId)throw new Error('CANDIDATE_RETRIEVAL_LINK_MISMATCH');
    if(beforeCommit)await beforeCommit();
    return {...result,candidateId:candidate.id,assessorId:f.packet.assessor.id,fixture:f};
  });
}
