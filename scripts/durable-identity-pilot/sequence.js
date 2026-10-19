// Shared synthetic repository composition. Call only through a guarded certification entry point.
import {idempotent,audit} from '../../src/persistence/db.js';
import {saveAddressResolution,readAddressResolution,normalizeAddressForCompare} from '../../src/persistence/addressResolutionRepository.js';
import {insertOrReuseProperty,getProperty} from '../../src/persistence/propertiesRepository.js';
import {createOpportunityPropertyLink,activeOpportunityPropertyLink} from '../../src/persistence/opportunityPropertyLinkRepository.js';
import {insertEvidenceSnapshot,getEvidence} from '../../src/persistence/evidenceRepository.js';
import {addressKey} from '../../src/sources/rentcast/propertyLookup.js';
import {validateSyntheticEvidence} from './policy.js';
import {digest} from './fixture.js';
const require=(ok,code)=>{if(!ok)throw new Error(code);};
export async function persistSyntheticSequence({db,fixture,now,reviewer,certification='OFFLINE_LOGIC_ONLY',authorization=null}){
  const proof=validateSyntheticEvidence(fixture,{now,reviewer}),p=fixture.packet,key=addressKey(proof.address.formattedAddress);
  const requestKey=`synthetic-identity-v1:${digest({candidate:p.candidateId,packet:fixture.packetSha256})}`;
  return db.transaction(async tx=>{
    // Bind the canonical repository to this transaction, not a second commit.
    const transactionDb={transaction:work=>work(tx)};
    for(const lock of [`pilot:county:${p.county.jurisdiction}:${p.county.atn}:${p.county.apn9}`,`pilot:address:${key}`].sort())await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[lock]);
    const candidate=(await tx.query('SELECT * FROM opportunity_candidates WHERE id=$1 FOR UPDATE',[p.candidateId])).rows[0];
    require(candidate&&candidate.jurisdiction===p.county.jurisdiction&&candidate.atn===p.county.atn&&candidate.apn===p.county.apn9,'COUNTY_CANDIDATE_IDENTITY_CONFLICT');
    require(!candidate.archived_at&&!['ARCHIVED','REJECTED','DEFERRED'].includes(candidate.candidate_status)&&!['AMBIGUOUS','SOURCE_STOP'].includes(candidate.identity_status),'CANDIDATE_INACTIVE_OR_AMBIGUOUS');
    const duplicates=(await tx.query('/* pilot:county-duplicates */ SELECT id FROM opportunity_candidates WHERE jurisdiction=$1 AND (atn=$2 OR apn=$3) AND archived_at IS NULL',[p.county.jurisdiction,p.county.atn,p.county.apn9])).rows;
    require(duplicates.length===1&&duplicates[0].id===p.candidateId,'DUPLICATE_COUNTY_IDENTITY');
    const assessor=(await tx.query('SELECT * FROM opportunity_assessor_enrichments WHERE id=$1 AND superseded_at IS NULL FOR SHARE',[p.assessor.id])).rows[0];
    require(assessor&&assessor.candidate_id===p.candidateId&&assessor.crosswalk_status==='MATCHED_EXACT'&&assessor.pts_atn_normalized===p.county.atn&&assessor.assessor_atn_normalized===p.county.atn&&assessor.apn9===p.county.apn9&&assessor.source_row_locator===p.assessor.sourceRow&&assessor.source_row_fingerprint===p.assessor.rowSha256,'ASSESSOR_COUNTY_IDENTITY_CONFLICT');
    const batch=(await tx.query('SELECT id,status,county_member_sha256,discovery_source_id FROM opportunity_assessor_import_batches WHERE id=$1',[assessor.import_batch_id])).rows[0];
    require(batch&&batch.id===p.assessor.batchId&&batch.status==='COMPLETE'&&batch.county_member_sha256===p.assessor.sourceSha256&&batch.discovery_source_id===p.assessor.sourceId,'ASSESSOR_PROVENANCE_CONFLICT');
    const records=(await tx.query('/* pilot:source-relationship */ SELECT r.id,r.atn,r.apn,r.record_fingerprint,r.discovery_source_id,s.source_file_hash,s.jurisdiction FROM opportunity_record_links l JOIN discovery_records r ON r.id=l.discovery_record_id JOIN discovery_sources s ON s.id=r.discovery_source_id WHERE l.candidate_id=$1 AND r.id=$2',[p.candidateId,p.assessor.recordId])).rows;
    require(records.length===1&&records[0].atn===p.county.atn&&records[0].apn===p.county.apn9&&records[0].discovery_source_id===p.assessor.sourceId&&records[0].source_file_hash===p.assessor.discoverySha256&&records[0].record_fingerprint===p.assessor.recordSha256&&records[0].jurisdiction===p.county.jurisdiction,'SOURCE_COUNTY_IDENTITY_CONFLICT');
    const priorProperties=(await tx.query('/* pilot:county-properties */ SELECT * FROM properties WHERE normalized_address=$1 OR (state=$2 AND county=$3 AND (atn=$4 OR apn=$5)) ORDER BY id FOR UPDATE',[key,proof.address.state,p.county.jurisdiction,p.county.atn,p.county.apn9])).rows;
    require(priorProperties.length<=1,'DUPLICATE_PROPERTY_IDENTITY');
    for(const existing of priorProperties){require(!existing.archived_at,'PROPERTY_INACTIVE');require(existing.normalized_address===key&&existing.atn===p.county.atn&&existing.apn===p.county.apn9&&existing.county===p.county.jurisdiction,'PROPERTY_COUNTY_IDENTITY_CONFLICT');require(existing.identity_status!=='AMBIGUOUS','PROPERTY_IDENTITY_AMBIGUOUS');}
    const result=await idempotent(tx,requestKey,'SYNTHETIC_DURABLE_IDENTITY_V1',async()=>{
      const resolved=await saveAddressResolution({db:transactionDb,candidateId:p.candidateId,input:{...proof.address,analystConfirmed:true,countyEnrichmentId:p.assessor.id,resolutionSource:'OTHER_VERIFIED_SOURCE',resolutionMethod:'MANUAL_DOCUMENT_REVIEW',notes:'SYNTHETIC mechanics fixture only; independent synthetic component evidence.'},requestKey:`${requestKey}:address`,context:'SYNTHETIC_DURABLE_IDENTITY_PILOT'});
      const property=await insertOrReuseProperty(tx,{normalizedAddress:key,addressLine1:proof.address.street,city:proof.address.city,state:proof.address.state,postalCode:proof.address.postalCode,county:p.county.jurisdiction,latitude:null,longitude:null,propertyType:null,apn:p.county.apn9,atn:p.county.atn,providerPropertyId:null,identityStatus:'UNCONFIRMED'});
      require(!property.archived_at&&property.atn===p.county.atn&&property.apn===p.county.apn9,'PROPERTY_REUSE_CONFLICT');
      const linked=await createOpportunityPropertyLink(tx,{candidateId:p.candidateId,propertyId:property.id,addressResolutionId:resolved.addressResolution.id,assessorEnrichmentId:p.assessor.id,createdByContext:'SYNTHETIC_DURABLE_IDENTITY_PILOT',idempotencyKey:`${requestKey}:link`});
      require(!linked.idempotentReplay,'EXISTING_LINEAGE_REQUIRES_REVIEW');
      const evidence=await insertEvidenceSnapshot(tx,{propertyId:property.id,source:'SYNTHETIC_INDEPENDENT_DOCUMENT',sourceRecordId:p.assessor.recordId,retrievedAt:new Date(now).toISOString(),snapshotType:'IDENTITY_ONLY',status:'SYNTHETIC_QA',propertyPayload:{synthetic:true,countyAtn:p.county.atn,countyApn9:p.county.apn9},provenancePayload:{synthetic:true,packetSha256:fixture.packetSha256,approvalSha256:proof.approvalSha256,evidenceSha256:proof.evidenceSha256,assessorId:p.assessor.id,addressResolutionId:resolved.addressResolution.id,componentSources:fixture.evidence,...(authorization?{trustedAuthorization:authorization}:{})},rawReference:null});
      await audit(tx,{aggregateType:'property',aggregateId:property.id,eventType:'SYNTHETIC_IDENTITY_LINKED',requestKey,payload:{synthetic:true,candidateId:p.candidateId,addressResolutionId:resolved.addressResolution.id,linkId:linked.link.id,evidenceSnapshotId:evidence.id,packetSha256:fixture.packetSha256,approvalSha256:proof.approvalSha256,...(authorization?{trustedAuthorization:authorization}:{})}});
      return {synthetic:true,canonicalResolutionId:resolved.addressResolution.id,propertyId:property.id,linkId:linked.link.id,evidenceSnapshotId:evidence.id};
    });
    // Cached idempotent results are not accepted without checking current rows.
    const reopened=await getProperty(tx,result.propertyId),resolution=await readAddressResolution(tx,p.candidateId),link=await activeOpportunityPropertyLink(tx,p.candidateId),evidence=await getEvidence(tx,result.evidenceSnapshotId);
    require(reopened&&!reopened.archived_at&&reopened.atn===p.county.atn&&reopened.apn===p.county.apn9&&reopened.normalized_address===key,'RETRIEVAL_PROPERTY_CONFLICT');
    require(resolution&&resolution.id===result.canonicalResolutionId&&resolution.analyst_confirmed&&resolution.county_enrichment_id===p.assessor.id&&normalizeAddressForCompare(resolution)===normalizeAddressForCompare(proof.address),'RETRIEVAL_CANONICAL_CONFLICT');
    require(link&&link.id===result.linkId&&link.property_id===result.propertyId&&link.address_resolution_id===result.canonicalResolutionId&&link.assessor_enrichment_id===p.assessor.id,'RETRIEVAL_LINEAGE_CONFLICT');
    require(evidence&&evidence.property_id===result.propertyId&&evidence.provenance_payload.packetSha256===fixture.packetSha256&&evidence.provenance_payload.evidenceSha256===proof.evidenceSha256,'RETRIEVAL_EVIDENCE_CONFLICT');
    if(authorization)require(evidence.provenance_payload.trustedAuthorization?.identitySha256===authorization.identitySha256,'RETRIEVAL_AUTHORIZATION_CONFLICT');
    validateSyntheticEvidence(fixture,{now,reviewer});
    return {...result,certification,providerCalls:0};
  });
}
