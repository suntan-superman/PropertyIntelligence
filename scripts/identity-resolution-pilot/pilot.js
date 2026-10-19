import {createHash} from 'node:crypto';
import {providerReadyAddress,normalizeAddressForCompare} from '../../src/persistence/addressResolutionRepository.js';

export const digest=value=>createHash('sha256').update(value).digest('hex');
const assert=(ok,code)=>{if(!ok)throw new Error(code);};
const compare=(a,b)=>a<b?-1:a>b?1:0;
export const RULE='IDENTITY_PILOT_V1: round-robin over sorted missing-component + existing county-review-flag buckets; ascending fixed-width ATN then APN9 within each bucket; first three; no financial inputs';

// The existing resolver's unverified display prefill, not a new address normalizer.
// Never fill state/ZIP from geography, city dictionaries or neighboring records.
export function prefill(situs){const text=String(situs??'');const parts=text.split(',').map(v=>v.trim());const tail=(parts[parts.length-1]??'').match(/^([A-Za-z]{2})\s+(\d{5})(?:-(\d{4}))?$/);return {street:parts[0]??'',city:tail?parts.slice(1,-1).join(', '):(parts[1]??''),state:tail?.[1]??'',postalCode:tail?.[2]??'',postalCodeExtension:tail?.[3]??'',analystConfirmed:false};}

export function reviewAddress(raw){
  const components=prefill(raw);
  const missing=['street','city','state','postalCode'].filter(k=>!components[k]);
  const formatValid=!!providerReadyAddress(components);
  return {rawCountySitus:raw,components,componentEvidence:Object.fromEntries(Object.entries(components).filter(([k])=>k!=='analystConfirmed').map(([k,v])=>[k,v?'PARSED_LITERAL_COUNTY_SITUS_UNVERIFIED':'NOT_SUPPLIED'])),missingComponents:missing,formatValid,
    postalValidated:false,analystConfirmed:false,readiness:formatValid?'REQUIRES_HUMAN_VERIFICATION':'NEEDS_MORE_EVIDENCE',
    warning:'County situs is read-only evidence, not postal validation. Parsed street/city remain unverified. No missing component is inferred.'};
}

export function designate(rows){
  assert(rows.length>=3,'INSUFFICIENT_PILOT_POOL');
  for(const field of ['candidateId','atn','apn9'])assert(new Set(rows.map(r=>r[field])).size===rows.length,'DUPLICATE_PILOT_IDENTITY');
  const buckets=new Map();
  for(const row of rows){
    assert(/^\d{11}$/.test(row.atn)&&/^\d{9}$/.test(row.apn9)&&row.candidateId,'INVALID_PILOT_IDENTITY');
    const key=`${[...row.missingComponents].sort().join('+')||'NO_MISSING_COMPONENTS'}|${row.countyReviewFlag?'COUNTY_ACREAGE_REVIEW':'NO_ADDITIONAL_COUNTY_REVIEW_FLAG'}`;
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push({...row,selectionBucket:key});
  }
  const keys=[...buckets.keys()].sort(compare);
  for(const group of buckets.values())group.sort((a,b)=>compare(a.atn,b.atn)||compare(a.apn9,b.apn9));
  const selected=[];
  for(let index=0;selected.length<3;index++)for(const key of keys){if(selected.length===3)break;const row=buckets.get(key)[index];if(row)selected.push({...row,pilotCode:`IP-P${selected.length+1}`});}
  return selected;
}

export function assertRegistry(existing,proposed){
  assert(existing.rule===proposed.rule&&existing.permanentRound1Exclusion===true,'PILOT_REGISTRY_POLICY_CHANGED');
  assert(JSON.stringify(existing.inputHashes)===JSON.stringify(proposed.inputHashes),'PILOT_INPUT_CHANGED_REVIEW_REQUIRED');
  assert(JSON.stringify(existing.identities)===JSON.stringify(proposed.identities),'PILOT_DESIGNATION_CHANGED');
}

// Review-only preflight. This module has NO database connection or persistence path.
// An APPROVED string/flag is not authentication; genuine human approval and separate
// environment-specific execution authority must be externally verified in a later task.
export function persistenceBlockers(packet,decision={},environment={}){
  const blockers=[];
  if(!packet.identity?.countyPass||!packet.identity?.assessorPass)blockers.push('COUNTY_IDENTITY_REQUIRED');
  if(packet.identity?.conflicts?.length)blockers.push('IDENTITY_CONFLICT');
  if(packet.identity?.existingPropertyId||packet.identity?.activeLinkCount>0)blockers.push('EXISTING_PROPERTY_REQUIRES_REPLAY_OR_CONFLICT_REVIEW');
  if(packet.identity?.archivedOrInactive)blockers.push('ARCHIVED_OR_INACTIVE_IDENTITY');
  if(!providerReadyAddress(decision.confirmedAddress??{}))blockers.push('COMPLETE_DOCUMENTED_ADDRESS_REQUIRED');
  if(['street','city','state','postalCode'].some(k=>!decision.componentEvidenceReferences?.[k]))blockers.push('COMPONENT_EVIDENCE_REQUIRED');
  if(decision.decision!=='APPROVED'||!decision.reviewedBy||!decision.reviewedAt||!decision.authorizedHumanReviewReference||decision.packetSha256!==packet.packetSha256)blockers.push(decision.decision==='REJECTED'?'ANALYST_REJECTED':'GENUINE_ANALYST_APPROVAL_REQUIRED');
  if(environment.verifiedIsolatedDatabase!==true)blockers.push('VERIFIED_ISOLATED_DATABASE_REQUIRED');
  if(!environment.separatePersistenceAuthorizationReference)blockers.push('SEPARATE_PERSISTENCE_AUTHORIZATION_REQUIRED');
  // Always closed for this packet-generation/offline-QA sprint.
  blockers.push('REAL_PILOT_PERSISTENCE_DISABLED_THIS_SPRINT');
  return [...new Set(blockers)];
}

export function sameConfirmedAddress(a,b){return normalizeAddressForCompare(a)===normalizeAddressForCompare(b);}
