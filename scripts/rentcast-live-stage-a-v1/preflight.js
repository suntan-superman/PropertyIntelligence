import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve,join,relative,sep,isAbsolute} from 'node:path';
import {check,Stop,hash,sha,text,day,digest,FIRST_SELECTION,requestFor,validateRequest} from '../rentcast-financial-controlled-client-v1/contract.js';
import {REGISTRY} from './paths.js';
const cents=n=>Number.isSafeInteger(n)&&n>=0;
const timestamp=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(x)&&day(x)!==null;
function current(at,now,maxAge=86400000){return timestamp(at)&&day(at)<=now&&now-day(at)<=maxAge;}
export async function readPrivate(base,name){
  check(typeof name==='string'&&/^[a-z0-9][a-z0-9.-]{0,100}\.(?:json|txt)$/.test(name),'EVIDENCE_PATH_STOP');
  const root=resolve(base),path=join(root,name),rel=relative(root,path);
  check(rel&&!rel.startsWith(`..${sep}`)&&!isAbsolute(rel),'EVIDENCE_PATH_STOP');
  check(!(await lstat(root)).isSymbolicLink()&&!(await lstat(path)).isSymbolicLink()&&(await realpath(root)).toLowerCase()===root.toLowerCase(),'EVIDENCE_SYMLINK_STOP');
  check((await lstat(path)).isFile()&&(await lstat(path)).size<=262144,'EVIDENCE_FILE_BOUND');
  return readFile(path);
}
export async function verifyReview(base,review,claims,kind,now){
  check(review?.sourceKind===kind&&text(review.reviewer)&&current(review.reviewedAt,now)&&digest(review.sha256)&&review.independentlyReviewed===true,'REVIEW_ATTESTATION_STOP');
  check(hash(review.confirmedClaims)===hash(claims),'REVIEW_CLAIMS_BINDING_STOP');
  const bytes=await readPrivate(base,review.file);check(bytes.length>=20&&sha(bytes)===review.sha256,'REVIEW_SOURCE_BYTES_STOP');
  const quote=review.quote;
  check(typeof quote==='string'&&quote.trim().length>=20&&quote.length<=4000&&bytes.toString('utf8').includes(quote),'REVIEW_QUOTE_STOP');
  // This verifies the actual local source text and human-reviewed claim binding,
  // not vendor authenticity. Missing human review never becomes an agent attestation.
  return {sha256:review.sha256,reviewFingerprint:hash(review),sourceKind:kind};
}
export function validateContext(context){
  check(context?.version==='LIVE_STAGE_A_SOURCE_V1','CONTEXT_VERSION_STOP');
  const {contextFingerprint,...payload}=context;check(contextFingerprint===hash(payload),'SOURCE_CONTEXT_HASH_STOP');
  check(context.candidate?.technicalOrdinal===1&&context.candidate.selectionFingerprint===FIRST_SELECTION,'CANDIDATE_ORDINAL_SEAL_STOP');
  validateRequest('A',context.request);check(hash(context.request)===hash(requestFor('A',context.candidate)),'EXACT_STAGE_A_REQUEST_STOP');
  return context;
}
export async function checkPreflight({context,account,authorization,base,now,certificateSha256}){
  validateContext(context);check(Number.isFinite(now)&&digest(certificateSha256),'CERTIFICATE_GATE_STOP');
  check(account?.version==='STAGE_A_ACCOUNT_V1'&&text(account.reviewer)&&current(account.reviewedAt,now)&&timestamp(account.expiresAt)&&day(account.expiresAt)>now,'CURRENT_ACCOUNT_REVIEW_STOP');
  check(account.plan?.active===true&&account.plan.propertyRecords===true&&text(account.plan.name)&&account.plan.currency==='USD','PROPERTY_RECORDS_ENTITLEMENT_STOP');
  const usage=account.usage;
  check(usage&&[usage.included,usage.used,usage.remaining].every(cents)&&usage.used+usage.remaining===usage.included&&current(usage.observedAt,now)&&['NONE','POSSIBLE','UNKNOWN'].includes(usage.concurrentAccountUsage),'CURRENT_USAGE_EVIDENCE_STOP');
  const fees=account.fees;
  check(fees&&cents(fees.overagePer200Cents)&&fees.overagePer200Cents<=20&&cents(fees.endpointFeeMaxCents)&&cents(fees.taxAndOtherMaxCents)&&fees.verifiedUpperBound===true&&fees.includedQuotaCredited===0&&fees.billingRule==='HTTP_200_REQUESTS_ONLY','FEES_TAX_UNVERIFIED_STOP');
  const maximumBillableExposureCents=20+fees.endpointFeeMaxCents+fees.taxAndOtherMaxCents;
  check(maximumBillableExposureCents<=100&&account.allInCapCents===100&&account.pilotExclusive===true&&account.registry===REGISTRY,'STAGE_A_CAP_OR_REGISTRY_STOP');
  const rights=account.rights;
  check(rights?.privateRetention===true&&rights.workflowUse===true&&rights.commercialUse===true&&rights.thirdPartyReviewed===true&&text(rights.termsVersion),'APPLICABLE_RIGHTS_STOP');
  const refs={};for(const [key,kind] of [['plan','ACCOUNT_PRODUCT_EVIDENCE'],['usage','ACCOUNT_USAGE_EVIDENCE'],['fees','CURRENT_PRICE_FEE_TAX_EVIDENCE'],['rights','WRITTEN_RIGHTS_AND_TERMS']])refs[key]=await verifyReview(base,account.evidence?.[key],account[key],kind,now);
  const a=authorization;
  check(a?.version==='STAGE_A_AUTHORIZATION_V1'&&a.stage==='A'&&a.explicitExecutionAuthorized===true&&text(a.reviewer)&&current(a.approvedAt,now)&&timestamp(a.expiresAt)&&day(a.expiresAt)>now+15000,'DATED_STAGE_A_AUTHORIZATION_STOP');
  check(a.selectionFingerprint===FIRST_SELECTION&&a.technicalOrdinal===1&&a.candidateFingerprint===hash(context.candidate)&&a.contextFingerprint===context.contextFingerprint&&a.requestFingerprint===hash(context.request),'AUTHORIZATION_SUBJECT_SOURCE_REQUEST_STOP');
  check(a.accountFingerprint===hash(account)&&a.rightsEvidenceSha256===refs.rights.sha256&&a.feesEvidenceSha256===refs.fees.sha256&&a.certificateSha256===certificateSha256,'AUTHORIZATION_EVIDENCE_STOP');
  check(a.registry===REGISTRY&&a.maxAttempts===1&&a.retries===0&&a.requestFeeReserveCents===20&&a.maximumBillableExposureCents===maximumBillableExposureCents&&a.allInCapCents===100&&a.stopAfter==='STAGE_A'&&a.stagesBC===false,'AUTHORIZATION_LIMIT_STOP');
  const {evidence,...claims}=a;const authEvidence=await verifyReview(base,evidence,claims,'WRITTEN_SINGLE_STAGE_AUTHORIZATION',now);
  return {status:'VERIFIED',accountFingerprint:hash(account),authorizationFingerprint:hash(a),authorizationEvidence:authEvidence,sourceEvidence:refs,certificateSha256,requestFeeReserveCents:20,maximumBillableExposureCents,allInCapCents:100,termsVersion:rights.termsVersion};
}
export async function readOperatorInputs(base){
  try{return {account:JSON.parse((await readPrivate(base,'account.json')).toString('utf8')),authorization:JSON.parse((await readPrivate(base,'authorization.json')).toString('utf8'))};}
  catch(e){throw new Stop(e instanceof Stop?e.code:'OPERATOR_REVIEW_RECORDS_MISSING_OR_INVALID');}
}
