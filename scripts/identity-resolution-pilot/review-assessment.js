// Local evidence assessment only: no acquisition, database or identity persistence.
import {FIELDS,sha} from './review-model.js';
import {providerReadyAddress} from '../../src/persistence/addressResolutionRepository.js';

const norm=value=>typeof value==='string'?value.trim().toUpperCase().replace(/\s+/g,' '):'';
const split=street=>norm(street).match(/^(\S+)\s+(.+)$/)?.slice(1)??['',''];
const way=value=>norm(value).replace(/\bWY$/,'WAY'); // Already documented IP-P1 POC equivalence only.
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

export function assessReview(packet,suggestion,{now=Date.now(),registryUnique=true}={}){
  const p=packet,id=p.identity??{},a=p.assessor??{},county=p.addressReview.components,checks=[];
  const check=(code,pass,detail)=>{checks.push({code,pass:pass===true,detail});return pass===true;};
  const countyExact=check('COUNTY_IDENTITY',registryUnique&&id.countyPass===true&&id.uniqueCountyIdentity===true&&!!p.candidateId&&/^\d{11}$/.test(p.county.atn)&&/^\d{9}$/.test(p.county.apn9),'Unique exact county identity in the certified local snapshot; not a fresh database check.');
  const assessorExact=check('ASSESSOR_RELATIONSHIP',id.assessorPass===true&&id.uniqueAssessorRelationship===true&&!!a.id&&Number.isInteger(a.sourceRow)&&a.sourceRow>=0&&a.match==='MATCHED_EXACT','Exact Assessor relationship and source row in the fingerprinted packet.');
  check('IDENTITY_CONFLICTS',Array.isArray(id.conflicts)&&!id.conflicts.length&&!id.countyParcelConflict&&!id.archivedOrInactive&&!id.existingPropertyId&&!id.activeLinkCount,'No conflict, inactive identity or existing Property/link in the source snapshot.');
  check('COUNTY_QUALITY',Array.isArray(a.countyReviewFlags)&&a.countyReviewFlags.length===0,'Outstanding county quality flags require detailed review, independently of geocoding.');
  const permitted=check('EVIDENCE_PERMISSION',suggestion?.available===true&&suggestion.reference?.packetSha256===p.packetSha256&&suggestion.reference?.pilotCode===p.pilotCode&&hash(suggestion.reference?.evidenceSha256)&&Date.parse(suggestion.expiresAt)>now&&Date.parse(suggestion.retrievedAt)<=now,'Original scoped retention, packet and evidence integrity gates must pass.');
  const complete=permitted&&!!providerReadyAddress(suggestion.components??{});
  check('COMPONENT_COMPLETENESS',complete,'All required components, including ZIP, must have available supporting evidence.');
  const refs=Object.fromEntries(FIELDS.map(f=>[f,[]]));
  const countyProvenance=hash(p.evidence?.sourceHashes?.dbf)&&!!p.evidence?.assessorAsOf&&Number.isInteger(a.sourceRow);
  check('SOURCE_PROVENANCE',countyProvenance&&hash(p.packetSha256),'Assessor source hash/date/row and packet fingerprint must be available; no invented reference.');
  for(const field of FIELDS){
    if(county[field]&&countyProvenance)refs[field].push({source:'COUNTY_SITUS',field,packetSha256:p.packetSha256,sourceSha256:p.evidence.sourceHashes.dbf,sourceRow:a.sourceRow,asOf:p.evidence.assessorAsOf,
      use:'COUNTY_SOURCE_NOT_POSTAL_VALIDATION',citation:`County Assessor situs; row ${a.sourceRow}; as-of ${p.evidence.assessorAsOf}; source SHA-256 ${p.evidence.sourceHashes.dbf}; packet ${p.packetSha256}`});
    if(permitted&&suggestion.components?.[field])refs[field].push({source:'GOOGLE_TEMPORARY_SUGGESTION',field,packetSha256:p.packetSha256,evidenceSha256:suggestion.reference.evidenceSha256,retrievedAt:suggestion.retrievedAt,expiresAt:suggestion.expiresAt,use:'INITIATING_REVIEWER_ONLY_NOT_SHARED_CANONICAL',citation:`Google Maps Geocoding; ${field}; retrieved ${suggestion.retrievedAt}; evidence SHA-256 ${suggestion.reference.evidenceSha256}; review deadline ${suggestion.expiresAt}`});
  }
  let suffixReview=false;
  if(permitted){
    const [number,route]=split(county.street),s=suggestion;
    check('STREET_NUMBER',number!==''&&number===norm(s.streetNumber),'Street numbers must agree exactly.');
    const routeMatches=[s.route,s.routeShort].filter(Boolean).some(r=>norm(route)===norm(r)||way(route)===way(r));
    check('STREET_NAME',route!==''&&routeMatches,'Only exact long/short returned routes or the existing terminal WY/Way equivalence; no fuzzy matching.');
    check('CITY',!!norm(county.city)&&norm(county.city)===norm(s.components?.city),'County city and proposed city must agree.');
    check('STATE',p.county.jurisdiction==='KERN_CA'&&norm(s.components?.state)==='CA'&&(!county.state||norm(county.state)===norm(s.components?.state)),'Returned state agrees with source jurisdiction/explicit county state; jurisdiction is not postal validation.');
    check('ZIP',!!s.components?.postalCode&&(!county.postalCode||norm(county.postalCode)===norm(s.components.postalCode)),'ZIP present; any existing county ZIP must agree. A Google-only ZIP is not independently corroborated.');
    check('UNIQUE_RESULT',s.candidateCount===1,'Multiple results or an unestablished count cannot qualify as routine.');
    check('PRECISION',s.precision==='ROOFTOP','Rooftop is address precision, not parcel-boundary evidence.');
    check('PARTIAL_MATCH',s.partialMatchFieldPresent===false||(s.partialMatchFieldPresent===true&&s.partialMatch===false),'An absent flag is not an explicit false; true or malformed partial-match evidence blocks routine review.');
    check('LOCAL_MATCH_CLASSIFICATION',s.classification==='EXACT ADDRESS CANDIDATE','A partial/ambiguous local comparison remains an exception.');
    suffixReview=/\bCI$/.test(route)&&/\bCIRCLE$/.test(norm(s.route))&&/\bCIR$/.test(norm(s.routeShort));
  }
  const tier=!permitted||!complete?'INSUFFICIENT_EVIDENCE':checks.some(c=>!c.pass)?'EXCEPTION_REVIEW':'ROUTINE_REVIEW';
  const reasons=checks.filter(c=>!c.pass).map(c=>c.code);
  const result={version:'STREAMLINED_REVIEW_V1_2',tier,checks,reasons,countyExact,assessorExact,suffixReview,componentReferences:refs,
    evidencePermitted:permitted,snapshotAt:p.evidence?.databaseSnapshotAt??null,sourceFreshness:'AS_OF_PACKET_ONLY_NOT_LIVE_VERIFIED',providerDataFreshness:'NOT_ESTABLISHED',
    requiredAction:tier==='ROUTINE_REVIEW'?'Review the assembled evidence, explicitly confirm all components and attest personally. No approval is preselected.':tier==='INSUFFICIENT_EVIDENCE'?'Obtain separately authorized supporting evidence. Do not reuse expired content or issue another lookup.':'Use detailed controls to review the flagged source issues and document discrepancies. Do not automatically accept suffix equivalence.',
    canonicalPersistenceAllowed:false,sharedGoogleRetention:'SHARED RETENTION NOT AUTHORIZED'};
  result.assessmentSha256=sha(JSON.stringify(result));
  return result;
}

export function referenceText(assessment,field){return assessment.componentReferences[field].map(r=>r.citation).join('\n');}

export function historicalDecisionAudit(stored,{available,reusePermitted,packetCurrent}){
  const entries=[...(stored.history??[]),stored].filter(d=>['APPROVED','NEEDS_MORE_EVIDENCE','REJECTED'].includes(d.decision)).map(d=>({
    decision:d.decision,reviewedBy:typeof d.reviewedBy==='string'?d.reviewedBy.slice(0,100):null,
    reviewedAt:typeof d.reviewedAt==='string'&&Number.isFinite(Date.parse(d.reviewedAt))?d.reviewedAt:null,
    packetSha256:hash(d.packetSha256)?d.packetSha256:null,sourceDependency:d.suggestionEvidenceRef?'TEMPORARY_GOOGLE_DEPENDENT':'ANALYST_DOCUMENTED_SOURCES',
  }));
  const exists=entries.length>0;
  return {historicalDecisionExists:exists,entries,supportingEvidenceAvailable:available,supportingEvidenceReusePermitted:reusePermitted,
    operationalEffectiveness:!stored.decision?'UNREVIEWED':!packetCurrent||available===false||reusePermitted===false?'SUSPENDED':available===null||reusePermitted===null?'REQUIRES_INDEPENDENT_EVIDENCE_REVIEW':'LOCAL_DECISION_ONLY',
    canonicalIdentityEffectiveness:'NOT_CREATED_OR_ACTIVATED_BY_THIS_INTERFACE'};
}
