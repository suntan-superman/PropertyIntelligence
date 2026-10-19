// Pilot policy, not a production permission service or legal-rights verifier.
import {validateCanonicalAddress,normalizeAddressForCompare} from '../../src/persistence/addressResolutionRepository.js';
import {isUuid} from '../../src/persistence/db.js';
import {digest,TEST_REVIEWER} from './fixture.js';
const require=(ok,code)=>{if(!ok)throw new Error(code);};
export function validateSyntheticEvidence(f,{now,reviewer=TEST_REVIEWER}={}){
  const p=f?.packet,a=f?.approval;
  require(Number.isFinite(now),'REVIEW_CLOCK_REQUIRED');
  require(p?.synthetic===true&&p.fixtureCode==='SYNTHETIC_DURABLE_IDENTITY_V1'&&p.county?.jurisdiction==='SYNTHETIC_COUNTY_CA','REAL_IDENTITY_PERSISTENCE_FORBIDDEN');
  require(isUuid(p.candidateId)&&isUuid(p.assessor?.id),'IDENTITY_BINDING_INVALID');
  require(/^900\d{8}$/.test(p.county.atn)&&/^900\d{6}$/.test(p.county.apn9),'SYNTHETIC_COUNTY_ID_REQUIRED');
  require(f.packetSha256===digest(p),'PACKET_FINGERPRINT_STALE');
  require(p.identity?.active===true&&p.identity.uniqueCountyIdentity===true&&p.identity.assessorCoherent===true&&Array.isArray(p.identity.conflicts)&&p.identity.conflicts.length===0,'IDENTITY_INACTIVE_OR_CONFLICTING');
  const address=validateCanonicalAddress(p.address);
  require(a?.synthetic===true&&a.decision==='APPROVED'&&a.reviewerAcknowledged===true,'ANALYST_APPROVAL_REQUIRED');
  require(a.reviewedBy===reviewer&&reviewer===TEST_REVIEWER,'REVIEWER_NOT_AUTHORIZED');
  require(Number.isFinite(Date.parse(a.reviewedAt))&&Date.parse(a.reviewedAt)<=now&&Date.parse(a.expiresAt)>now,'ANALYST_APPROVAL_EXPIRED_OR_INVALID');
  require(a.candidateId===p.candidateId&&a.packetSha256===f.packetSha256,'APPROVAL_PACKET_BINDING_MISMATCH');
  require(a.contradictionStatus==='NONE_REMAINING'&&typeof a.notes==='string'&&!!a.notes.trim(),'APPROVAL_CONTRADICTION_UNRESOLVED');
  require(normalizeAddressForCompare(a.confirmedAddress)===normalizeAddressForCompare(address),'APPROVAL_ADDRESS_CONFLICT');
  require(Array.isArray(f.evidence)&&f.evidence.length===4&&a.evidenceSha256===digest(f.evidence),'APPROVAL_EVIDENCE_BINDING_MISMATCH');
  for(const field of ['street','city','state','postalCode']){
    const matches=f.evidence.filter(e=>e.field===field);require(matches.length===1,'COMPONENT_EVIDENCE_REQUIRED');const e=matches[0];
    require(e.synthetic===true&&e.sourceSystem==='SYNTHETIC_INDEPENDENT_DOCUMENT'&&e.temporaryProviderDependency===false&&e.independentlySupported===true,'TEMPORARY_PROVIDER_EVIDENCE_FORBIDDEN');
    require(e.permittedUse==='ISOLATED_SYNTHETIC_CANONICAL'&&e.sharedCanonicalAllowed===true,'SHARED_CANONICAL_USE_NOT_AUTHORIZED');
    require(Number.isFinite(Date.parse(e.retrievedAt))&&Date.parse(e.retrievedAt)<=now&&Date.parse(e.expiresAt)>now,'EVIDENCE_EXPIRED_OR_UNAVAILABLE');
    require(e.candidateId===p.candidateId&&e.atn===p.county.atn&&e.apn9===p.county.apn9&&e.packetSha256===f.packetSha256,'EVIDENCE_PROPERTY_BINDING_MISMATCH');
    require(e.verified===true&&e.value===p.address[field]&&/^SYNTHETIC DOCUMENT \/ /.test(e.sourceReference??'')&&/^[a-f0-9]{64}$/.test(e.sourceSha256??''),'COMPONENT_SUPPORT_REQUIRED');
  }
  return {address,approvalSha256:digest(a),evidenceSha256:digest(f.evidence)};
}
