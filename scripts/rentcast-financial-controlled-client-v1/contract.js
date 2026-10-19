// Pure contracts. No credentials, network, database or financial-model execution.
import {createHash} from 'node:crypto';
import {queryAddress} from '../../src/sources/rentcast/propertyLookup.js';
export const HOST='https://api.rentcast.io';
export const FIRST_SELECTION='ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4';
export const MAX_ATTEMPTS=3, TIMEOUT_MS=15000, MAX_BYTES=2*1024*1024;
export const CLOSED=Object.freeze({finalIdentityApproval:false,durablePersistence:false,financialAnalysis:false,offer:false,mlsRound1:false});
export const sha=value=>createHash('sha256').update(value).digest('hex');
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
export const hash=x=>sha(JSON.stringify(stable(x)));
export const check=(value,code)=>{if(!value)throw new Stop(code);};
export class Stop extends Error{constructor(code){super(code);this.code=code;}}
export const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=300&&!/[\r\n\x00-\x1f]|(?:api.?key|authorization|bearer|password|token)\s*[:=]|https?:\/\/|@/i.test(x);
export const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function exactKeys(x,keys,code){check(object(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k)),code);}
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export function day(x){
  if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(x))return null;
  const t=Date.parse(x);return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===x.slice(0,10)?t:null;
}
export function validateCandidate(c){
  check(object(c)&&c.technicalOrdinal===1&&digest(c.selectionFingerprint),'ORDINAL_OR_SELECTION_STOP');
  check(typeof c.county?.atn==='string'&&/^\d{11}$/.test(c.county.atn)&&typeof c.county?.apn9==='string'&&/^\d{9}$/.test(c.county.apn9)&&c.county.jurisdiction==='KERN_CA','COUNTY_IDENTITY_STOP');
  exactKeys(c.exclusions,['ip','rc','historicalFixture','round1Selected'],'EXCLUSION_EVIDENCE_STOP');
  check(Object.values(c.exclusions).every(x=>x===false),'EXCLUDED_SUBJECT_STOP');
  check(text(c.requestAddress?.street)&&text(c.requestAddress?.city)&&c.requestAddress.state==='CA'&&!c.requestAddress.zip&&!c.requestAddress.postalCode,'NO_ZIP_DISCOVERY_STOP');
  check(c.stateBasis==='COUNTY_JURISDICTION_CONSTRAINT_NOT_POSTAL_VERIFICATION','STATE_BASIS_STOP');
  check(c.existingIdentity?.source_relationship_verified===true,'SOURCE_BINDING_STOP');
  return c;
}
// Evidence attestation is a future preflight prerequisite, NOT an authority issuer.
// Only a later reviewed live entrypoint could load verified signed/operator material.
export function preflight(account,now){
  check(object(account)&&account.verified===true&&text(account.reviewer)&&digest(account.evidenceSha256)&&day(account.verifiedAt)!==null&&day(account.expiresAt)!==null&&day(account.verifiedAt)<=now&&now<day(account.expiresAt),'ACCOUNT_VERIFICATION_STOP');
  check(account.currency==='USD'&&account.active===true&&account.endpoints?.properties===true&&account.endpoints?.value===true,'ENTITLEMENT_STOP');
  check(account.rights?.retention===true&&account.rights.saas===true&&account.rights.pdf===true&&account.rights.thirdPartyReviewed===true&&text(account.rights.termsVersion)&&digest(account.rights.evidenceSha256),'RIGHTS_STOP');
  check(account.chargesVerified===true&&account.taxFeesVerified===true&&account.endpointChargesVerified===true&&account.enforceableUpperBound===true,'COST_CERTAINTY_STOP');
  check(integer(account.rateCents,0,20)&&integer(account.maxTaxAndFeesPerAttemptCents,0,13)&&account.allInCapCents===100&&account.includedQuotaCredited===0,'COST_BOUND_STOP');
  const allInPerAttemptCents=20+account.maxTaxAndFeesPerAttemptCents;
  check(3*allInPerAttemptCents<=account.allInCapCents,'BUDGET_STOP');
  return {requestFeePerAttemptCents:20,allInPerAttemptCents,maxRequestFeeCents:60,allInCapCents:100,accountFingerprint:hash(account)};
}
export function bounds(stage,b){
  check(object(b)&&b.approved===true&&text(b.reviewer)&&digest(b.evidenceSha256)&&['URBAN','RURAL'].includes(b.marketContext),'BOUNDS_APPROVAL_STOP');
  // These are conservative internal ceilings, not claims about vendor maxima.
  check(finite(b.radius,0.01,10)&&integer(b.days,1,365)&&b.propertyType==='Single Family','BOUNDS_VALUE_STOP');
  if(stage==='B')check(b.compCount===15,'COMP_COUNT_STOP');
  return b;
}
export function requestFor(stage,c,accepted,approvedBounds){
  validateCandidate(c);check(['A','B','C'].includes(stage),'STAGE_STOP');
  let params={address:queryAddress(c.requestAddress)};
  if(stage!=='A'){
    check(accepted?.identity?.status==='PASS'&&text(accepted.subject?.id),'IDENTITY_GATE_STOP');
    const s=accepted.subject,b=bounds(stage,approvedBounds);
    params={address:queryAddress({street:s.addressLine1,city:s.city,state:s.state,zip:s.zipCode})};
    if(stage==='B')Object.assign(params,{lookupSubjectAttributes:true,compCount:b.compCount,maxRadius:b.radius,daysOld:b.days});
    else Object.assign(params,{radius:b.radius,saleDateRange:b.days,propertyType:'Single Family',limit:50,offset:0,includeTotalCount:true});
  }
  const request={method:'GET',host:HOST,endpoint:stage==='B'?'/v1/avm/value':'/v1/properties',params,redirect:'error',timeoutMs:TIMEOUT_MS,maxBytes:MAX_BYTES};
  validateRequest(stage,request);return request;
}
export function validateRequest(stage,r){
  exactKeys(r,['method','host','endpoint','params','redirect','timeoutMs','maxBytes'],'REQUEST_SHAPE_STOP');
  check(['A','B','C'].includes(stage)&&r.method==='GET'&&r.host===HOST&&r.endpoint===(stage==='B'?'/v1/avm/value':'/v1/properties')&&r.redirect==='error'&&r.timeoutMs===TIMEOUT_MS&&r.maxBytes===MAX_BYTES,'REQUEST_TARGET_STOP');
  const keys=stage==='A'?['address']:stage==='B'?['address','lookupSubjectAttributes','compCount','maxRadius','daysOld']:['address','radius','saleDateRange','propertyType','limit','offset','includeTotalCount'];
  exactKeys(r.params,keys,'PARAMETER_ALLOWLIST_STOP');const p=r.params;
  check(text(p.address),'ADDRESS_PARAMETER_STOP');
  if(stage==='B')check(p.lookupSubjectAttributes===true&&p.compCount===15&&finite(p.maxRadius,0.01,10)&&integer(p.daysOld,1,365),'AVM_PARAMETER_STOP');
  if(stage==='C')check(finite(p.radius,0.01,10)&&integer(p.saleDateRange,1,365)&&p.propertyType==='Single Family'&&p.limit===50&&p.offset===0&&p.includeTotalCount===true,'SOLD_PARAMETER_STOP');
  return r;
}
export function authorize(approval,{stage,candidate,request,approvedBounds,previousReceiptHash,accountFingerprint,now}){
  check(object(approval)&&approval.scope==='OFFLINE_SYNTHETIC_ONLY'&&approval.explicitStageApproval===true&&approval.stage===stage&&approval.technicalOrdinal===1&&approval.selectionFingerprint===candidate.selectionFingerprint&&approval.candidateFingerprint===hash(candidate)&&approval.requestFingerprint===hash(request)&&approval.accountFingerprint===accountFingerprint,'STAGE_AUTHORIZATION_STOP');
  check(text(approval.operator)&&digest(approval.evidenceSha256)&&day(approval.approvedAt)!==null&&day(approval.expiresAt)!==null&&day(approval.approvedAt)<=now&&now<day(approval.expiresAt),'STAGE_AUTHORIZATION_TIME_STOP');
  check(approval.previousReceiptHash===(previousReceiptHash??null),'PREVIOUS_RECEIPT_APPROVAL_STOP');
  check(approval.boundsFingerprint===(stage==='A'?null:hash(approvedBounds)),'BOUNDS_EVIDENCE_BINDING_STOP');
  return hash(approval);
}
// Validate the content of a LATER human-reviewed authorization packet. This is
// not signature verification, an authorization issuer or a network switch.
export function futureLivePreflight({account,authorization,candidate,stage,request,accepted,approvedBounds,previousReceiptHash=null,now}){
  const budget=preflight(account,now);validateCandidate(candidate);validateRequest(stage,request);
  check(hash(request)===hash(requestFor(stage,candidate,accepted,approvedBounds)),'LIVE_REQUEST_BINDING_STOP');
  check(candidate.selectionFingerprint===FIRST_SELECTION,'LIVE_SELECTION_STOP');
  check(authorization?.scope==='SEPARATELY_AUTHORIZED_RENTCAST_SINGLE_STAGE'&&authorization.independentlyReviewed===true&&authorization.stage===stage&&authorization.technicalOrdinal===1&&authorization.selectionFingerprint===FIRST_SELECTION&&authorization.candidateFingerprint===hash(candidate)&&authorization.requestFingerprint===hash(request)&&authorization.accountFingerprint===budget.accountFingerprint,'SEPARATE_LIVE_AUTHORIZATION_STOP');
  check(text(authorization.operator)&&digest(authorization.writtenAuthorizationSha256)&&day(authorization.approvedAt)!==null&&day(authorization.expiresAt)!==null&&day(authorization.approvedAt)<=now&&now<day(authorization.expiresAt),'LIVE_AUTHORIZATION_EVIDENCE_STOP');
  check(authorization.maxAttempts===3&&authorization.stageAttempts===1&&authorization.retries===0&&authorization.allInCapCents===100&&authorization.previousReceiptHash===previousReceiptHash,'LIVE_AUTHORIZATION_LIMIT_STOP');
  check(authorization.boundsFingerprint===(stage==='A'?null:hash(approvedBounds)),'LIVE_BOUNDS_BINDING_STOP');
  if(stage!=='A'){bounds(stage,approvedBounds);check(digest(previousReceiptHash),'LIVE_PRIOR_RECEIPT_STOP');}
  return {packetChecks:'PASS',networkEnabled:false,status:'LIVE_EXECUTOR_NOT_IMPLEMENTED_OR_AUTHORIZED_IN_THIS_SPRINT',budget};
}
