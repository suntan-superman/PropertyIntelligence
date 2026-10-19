// Artificial mechanics fixture only. Never derived from the real pilot packets.
import {createHash} from 'node:crypto';
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const TEST_NOW=Date.parse('2026-10-09T12:00:00.000Z');
export const TEST_REVIEWER='SYNTHETIC_ANALYST_QA';
export const IDS=Object.freeze({candidate:'aaaaaaaa-1111-4111-8111-000000000001',assessor:'aaaaaaaa-1111-4111-8111-000000000002',source:'aaaaaaaa-1111-4111-8111-000000000003',record:'aaaaaaaa-1111-4111-8111-000000000004',batch:'aaaaaaaa-1111-4111-8111-000000000005'});
export function syntheticFixture(){
  const packet={synthetic:true,fixtureCode:'SYNTHETIC_DURABLE_IDENTITY_V1',candidateId:IDS.candidate,
    county:{jurisdiction:'SYNTHETIC_COUNTY_CA',atn:'90000000001',apn9:'900000001'},
    assessor:{id:IDS.assessor,sourceId:IDS.source,recordId:IDS.record,batchId:IDS.batch,sourceRow:2,sourceSha256:digest('SYNTHETIC county source'),discoverySha256:digest('SYNTHETIC discovery source'),rowSha256:digest('SYNTHETIC source row'),recordSha256:digest('SYNTHETIC discovery record')},
    address:{street:'100 Synthetic Persistence Lane',city:'Fixture City',state:'CA',postalCode:'99999'},
    identity:{uniqueCountyIdentity:true,assessorCoherent:true,active:true,conflicts:[]}};
  const packetSha256=digest(packet);
  const evidence=['street','city','state','postalCode'].map(field=>({synthetic:true,sourceSystem:'SYNTHETIC_INDEPENDENT_DOCUMENT',sourceReference:`SYNTHETIC DOCUMENT / ${field}`,field,value:packet.address[field],candidateId:IDS.candidate,atn:packet.county.atn,apn9:packet.county.apn9,packetSha256,sourceSha256:digest(`SYNTHETIC independent ${field}`),retrievedAt:'2026-10-09T10:00:00.000Z',expiresAt:'2026-10-10T12:00:00.000Z',permittedUse:'ISOLATED_SYNTHETIC_CANONICAL',sharedCanonicalAllowed:true,temporaryProviderDependency:false,independentlySupported:true,verified:true}));
  const approval={synthetic:true,decision:'APPROVED',reviewedBy:TEST_REVIEWER,reviewerAcknowledged:true,reviewedAt:'2026-10-09T11:00:00.000Z',expiresAt:'2026-10-10T12:00:00.000Z',candidateId:IDS.candidate,packetSha256,evidenceSha256:digest(evidence),confirmedAddress:packet.address,contradictionStatus:'NONE_REMAINING',notes:'Synthetic mechanics approval. Not a human approval for a real parcel.'};
  return {packet,packetSha256,evidence,approval};
}

// Seeded query-double input represents existing, internally coherent source rows.
// It does not import county data or insert an Opportunity in any database.
export function seedRows(f=syntheticFixture()){
  const p=f.packet;
  return {candidates:[{id:p.candidateId,jurisdiction:p.county.jurisdiction,candidate_key:`SYNTHETIC:${p.county.atn}`,atn:p.county.atn,apn:p.county.apn9,identity_status:'PARTIAL',candidate_status:'NEEDS_ADDRESS',priority_band:'INSUFFICIENT_DATA',screening_score:null,score_version:null,resolved_property_id:null,archived_at:null}],
    assessors:[{id:p.assessor.id,candidate_id:p.candidateId,import_batch_id:p.assessor.batchId,pts_atn_normalized:p.county.atn,assessor_atn_normalized:p.county.atn,apn9:p.county.apn9,crosswalk_status:'MATCHED_EXACT',source_row_locator:p.assessor.sourceRow,source_row_fingerprint:p.assessor.rowSha256,situs_raw:'100 SYNTHETIC PERSISTENCE LANE, FIXTURE CITY',superseded_at:null}],
    batches:[{id:p.assessor.batchId,status:'COMPLETE',county_member_sha256:p.assessor.sourceSha256,discovery_source_id:p.assessor.sourceId}],
    sourceRecords:[{id:p.assessor.recordId,candidate_id:p.candidateId,discovery_source_id:p.assessor.sourceId,atn:p.county.atn,apn:p.county.apn9,record_fingerprint:p.assessor.recordSha256,source_file_hash:p.assessor.discoverySha256,jurisdiction:p.county.jurisdiction}],
    resolutions:[],properties:[],links:[],evidence:[],audits:[],idempotency:[],nextId:100};
}
