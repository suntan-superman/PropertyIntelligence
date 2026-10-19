import {createHash} from 'node:crypto';
import {providerReadyAddress} from '../../src/persistence/addressResolutionRepository.js';

export const CODES=Object.freeze(['IP-P1','IP-P2','IP-P3']);
export const FIELDS=Object.freeze(['street','city','state','postalCode']);
export const OUTCOMES=Object.freeze(['APPROVED','NEEDS_MORE_EVIDENCE','REJECTED']);
export const sha=value=>createHash('sha256').update(value).digest('hex');
export function fail(code,status=400){throw Object.assign(new Error(code),{status,code});}
const clean=(value,max=2000)=>{
  if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))fail('INVALID_TEXT');
  return value.trim();
};
export function validatePacket(packet,code){
  if(!CODES.includes(code)||packet?.pilotCode!==code)fail('PACKET_IDENTITY_MISMATCH',409);
  const {packetSha256,...payload}=packet;
  if(sha(JSON.stringify(payload))!==packetSha256)fail('PACKET_INTEGRITY_FAILURE',409);
  if(packet.recordKind!=='REAL_COUNTY_CANDIDATE_PRIVATE_REVIEW'||!packet.county||!packet.assessor||!packet.addressReview||!packet.identity)fail('PACKET_INVALID',409);
  return packet;
}
export function validateSubmission(packet,input,reviewer,{saving=true}={}){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('INVALID_REQUEST');
  const allowed=new Set(['pilotCode','packetSha256','decisionRevision','decision','reviewedBy','reviewerAcknowledged','confirmedAddress','componentEvidenceReferences','componentVerification','supportingEvidenceReferences','notes','contradictionStatus','addressChangeNotes','acreageAcknowledged','acreageNotes','suggestionEvidenceRef']);
  if(Object.keys(input).some(k=>!allowed.has(k)))fail('UNSUPPORTED_FIELD');
  if(input.pilotCode!==packet.pilotCode||input.packetSha256!==packet.packetSha256)fail('STALE_PACKET_RELOAD_REQUIRED',409);
  let suggestionEvidenceRef=null;
  if(input.suggestionEvidenceRef!=null){
    const ref=input.suggestionEvidenceRef;
    if(typeof ref!=='object'||Array.isArray(ref)||Object.keys(ref).some(k=>!['pilotCode','packetSha256','evidenceSha256'].includes(k))||ref.pilotCode!==packet.pilotCode||ref.packetSha256!==packet.packetSha256||!/^[a-f0-9]{64}$/.test(ref.evidenceSha256))fail('INVALID_SUGGESTION_REFERENCE');
    suggestionEvidenceRef={pilotCode:ref.pilotCode,packetSha256:ref.packetSha256,evidenceSha256:ref.evidenceSha256};
  }
  const address={},references={},verification={};
  for(const field of FIELDS){
    address[field]=clean(input.confirmedAddress?.[field]??'',180);
    references[field]=clean(input.componentEvidenceReferences?.[field]??'',1200);
    verification[field]=input.componentVerification?.[field]??'UNVERIFIED';
    if(!['UNVERIFIED','VERIFIED','CONTRADICTORY'].includes(verification[field]))fail('INVALID_COMPONENT_STATUS');
  }
  const notes=clean(input.notes??'',4000),support=clean(input.supportingEvidenceReferences??'',3000);
  const acreageNotes=clean(input.acreageNotes??'',2000),changeNotes=clean(input.addressChangeNotes??'',2000);
  const canonical=providerReadyAddress(address);
  const errors=[];
  const require=(ok,message)=>{if(!ok)errors.push(message);};
  const changed=['street','city'].filter(k=>packet.addressReview.components[k]&&address[k]&&address[k].toUpperCase().replace(/\s+/g,' ')!==packet.addressReview.components[k].trim().toUpperCase().replace(/\s+/g,' '));
  const flagged=packet.assessor.countyReviewFlags?.includes('ACREAGE_DELTA_GT_0_01');
  const approving=input.decision==='APPROVED';
  if(saving){
    require(OUTCOMES.includes(input.decision),'Choose a review decision.');
    require(input.reviewedBy===reviewer,'Reviewer identity must match this local review session.');
    require(input.reviewerAcknowledged===true,'Confirm that you personally reviewed this packet and are authorized to record the decision.');
    require(!!support,'Supply supporting evidence references, including evidence reviewed and any remaining gaps.');
    require(!!notes,'Review notes are required.');
    if(flagged){require(input.acreageAcknowledged===true,'Acknowledge the county acreage discrepancy.');require(!!acreageNotes,'Explain the acreage discrepancy review in notes.');}
  }
  if(approving){
    require(!!canonical,'Approval requires a complete address accepted by the existing canonical validator.');
    for(const k of FIELDS){require(!!references[k],`Evidence reference required for ${k}.`);require(verification[k]==='VERIFIED',`Explicit component verification required for ${k}.`);}
    require(input.contradictionStatus==='NONE_REMAINING','Approval is blocked until contradictory identity/address evidence is resolved.');
    require(address.state.toUpperCase()==='CA','Confirmed state contradicts the existing Kern County, CA source identity.');
    require(!changed.length||!!changeNotes,'Explain changes to the county street/city prefill and cite the supporting evidence.');
    require(packet.identity.countyPass===true&&packet.identity.assessorPass===true&&!packet.identity.countyParcelConflict&&!(packet.identity.conflicts?.length)&&!packet.identity.archivedOrInactive,'The source packet has an unresolved identity conflict or inactive identity.');
    require(!packet.identity.existingPropertyId&&!packet.identity.activeLinkCount,'The source packet already references a Property; review is required before approval.');
  }
  return {valid:errors.length===0,errors,canonicalValidation:{formatValid:!!canonical,missingComponents:FIELDS.filter(k=>!address[k]),postalValidated:false,changedPrefillComponents:changed,approvalEligible:approving&&errors.length===0},
    decision:{pilotCode:packet.pilotCode,packetSha256:packet.packetSha256,decision:input.decision??null,reviewedBy:reviewer,
      confirmedAddress:canonical??address,componentEvidenceReferences:references,componentVerification:verification,supportingEvidenceReferences:support,notes,
      contradictionStatus:['NOT_REVIEWED','NONE_REMAINING','UNRESOLVED'].includes(input.contradictionStatus)?input.contradictionStatus:'NOT_REVIEWED',addressChangeNotes:changeNotes,
      acreageAcknowledged:flagged&&input.acreageAcknowledged===true,acreageNotes,reviewerAcknowledged:input.reviewerAcknowledged===true,
      ...(suggestionEvidenceRef?{suggestionEvidenceRef}:{})}};
}
export function decisionView(stored,packet){
  const fields=['pilotCode','packetSha256','decision','reviewedBy','reviewedAt','savedAt','confirmedAddress','componentEvidenceReferences','componentVerification','supportingEvidenceReferences','notes','contradictionStatus','addressChangeNotes','acreageAcknowledged','acreageNotes','canonicalValidation'];
  const view=Object.fromEntries(fields.filter(k=>stored[k]!==undefined).map(k=>[k,stored[k]]));
  const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value?.[k]!==undefined).map(k=>[k,value[k]]));
  view.confirmedAddress=pick(stored.confirmedAddress,[...FIELDS,'postalCodeExtension','formattedAddress']);
  view.componentEvidenceReferences=pick(stored.componentEvidenceReferences,FIELDS);
  view.componentVerification=pick(stored.componentVerification,FIELDS);
  view.canonicalValidation=pick(stored.canonicalValidation,['formatValid','missingComponents','postalValidated','changedPrefillComponents','approvalEligible']);
  if(stored.suggestionEvidenceRef)view.suggestionEvidenceRef=pick(stored.suggestionEvidenceRef,['pilotCode','packetSha256','evidenceSha256']);
  const stale=stored.packetSha256!==packet.packetSha256;
  return {...view,stale,effectiveDecision:stale?null:stored.decision??null};
}
export function packetView(p){return {
  pilotCode:p.pilotCode,packetSha256:p.packetSha256,synthetic:p.qaFixture===true,county:{atn:p.county.atn,apn9:p.county.apn9},
  addressReview:{rawCountySitus:p.addressReview.rawCountySitus,components:Object.fromEntries(FIELDS.map(k=>[k,p.addressReview.components[k]??''])),missingComponents:p.addressReview.missingComponents,postalValidated:false},
  assessor:{useCode:p.assessor.useCode,officialDescription:p.assessor.officialDescription,researchCategory:p.assessor.researchCategory,countyReviewFlags:p.assessor.countyReviewFlags},
  sourceDates:{assessorAsOf:p.evidence.assessorAsOf,powerToSellAsOf:p.evidence.powerToSellAsOf,acquiredAt:p.evidence.originalSourceAcquiredAt,databaseSnapshotAt:p.evidence.databaseSnapshotAt,localVerificationAt:p.evidence.localVerificationAt},
  canonicalStatus:p.identity.canonicalResolutionStatus,identityConflicts:p.identity.conflicts,
  canonicalValidation:{formatValid:!!providerReadyAddress(p.addressReview.components),missingComponents:p.addressReview.missingComponents,postalValidated:false},
};}
