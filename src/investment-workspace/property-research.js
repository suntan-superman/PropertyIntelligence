import path from 'node:path';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {appendFile,mkdir,open,readFile} from 'node:fs/promises';
import {cacheLocation} from '../sources/rentcast/cache.js';
import {lookupProperty,queryAddress,addressKey} from '../sources/rentcast/propertyLookup.js';
import {ProviderStop} from '../sources/rentcast/client.js';
import {AccessDenied,ROLES} from '../auth/access-control.js';

const PROVIDER='RentCast',ENDPOINT='/properties',ESTIMATED_COST_CENTS=20;
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const safe=value=>String(value??'').trim().replace(/\s+/g,' ');
const isoDay=value=>new Date(value).toISOString().slice(0,10),isoMonth=value=>new Date(value).toISOString().slice(0,7);
export class ResearchStop extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}

export function validateResearchAddress(input){
  const address={street:safe(input?.street),city:safe(input?.city),state:safe(input?.state).toUpperCase(),zip:safe(input?.zip)};
  if(!address.street||address.street.length>160||!address.city||address.city.length>100||address.state!=='CA'||!/^(?:\d{5}(?:-\d{4})?)?$/.test(address.zip))throw new ResearchStop('INVALID_ADDRESS');
  return address;
}
export const researchAddressKey=address=>[addressKey(address.street),addressKey(address.city),address.state,address.zip.slice(0,5)].join('|');

function publicError(error){
  const code=error?.code??error?.message;
  if(code==='ADDRESS_AMBIGUOUS')return {code:'AMBIGUOUS_MATCH',status:409};
  if(code==='NO_MATCH')return {code:'NO_PROPERTY_FOUND',status:404};
  if(['AUTHENTICATION_STOP','AUTHENTICATION_REQUIRED','AUTHENTICATION_NOT_CONFIGURED','SESSION_EXPIRED'].includes(code))return {code:'AUTHORIZATION_FAILURE',status:401};
  if(['ROLE_NOT_AUTHORIZED','REQUEST_AUTHORIZATION_REQUIRED'].includes(code))return {code:'AUTHORIZATION_FAILURE',status:403};
  if(['QUOTA_STOP','QUOTA_BUDGET_STOP','RATE_LIMIT_STOP','DAILY_USER_LIMIT','DAILY_PROVIDER_LIMIT','MONTHLY_SPENDING_LIMIT'].includes(code))return {code:'QUOTA_EXCEEDED',status:429};
  if(['NETWORK_STOP','PROVIDER_UNAVAILABLE_STOP'].includes(code))return {code:'PROVIDER_ERROR',status:502};
  return {code:/^[A-Z0-9_]+$/.test(String(code))?String(code):'PROVIDER_ERROR',status:error?.status??400};
}

async function ledgerRows(file){
  try{return (await readFile(file,'utf8')).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));}catch(error){if(error.code==='ENOENT')return [];throw error;}
}
async function appendLedger(file,row){await mkdir(path.dirname(file),{recursive:true});await appendFile(file,`${JSON.stringify(row)}\n`,{encoding:'utf8',mode:0o600});}

export function toPreliminaryEvidence(selected,record){
  const fingerprint=digest({bodyHash:record.bodyHash,rawResponseRef:record.rawResponseRef,id:selected.id}),ref=`RESEARCH-${digest(selected.id??selected.formattedAddress).slice(0,12).toUpperCase()}`;
  const address=selected.formattedAddress??[selected.addressLine1,selected.city,`${selected.state} ${selected.zipCode}`].filter(Boolean).join(', ');
  const property={ref,address,city:selected.city??null,subjectKind:'PRELIMINARY_RESEARCH',evidenceFingerprint:fingerprint,addressComponents:{street:selected.addressLine1,city:selected.city,state:selected.state,zip:selected.zipCode},providerId:selected.id??null,providerCoordinates:selected.latitude!=null&&selected.longitude!=null?{latitude:selected.latitude,longitude:selected.longitude}:null,attributes:{propertyType:selected.propertyType??null,bedrooms:selected.bedrooms??null,bathrooms:selected.bathrooms??null,squareFootage:selected.squareFootage??null,lotSize:selected.lotSize??null,yearBuilt:selected.yearBuilt??null,lastSaleDate:selected.lastSaleDate??null,lastSalePrice:selected.lastSalePrice??null},avm:{price:null,low:null,high:null},propertyRef:`provider record ${selected.id??'identifier not returned'}`,valuationRef:null,propertyRetrievedAt:record.retrievedAt,valuationRetrievedAt:null,providerAsOf:null,valuationAsOf:null,reviewDate:null,identityStatus:'Provider-reported address match; legal parcel identity not verified',historicalTrigger:{kind:null,amount:null,sourceDate:null,sourceRef:'No county distress evidence attached',meaning:'Current distress is unknown'},countyUse:{code:null,sourceRef:null},sales:[],saleSearch:{retrievedAt:null,returned:null,eligible:null,radius:null,partial:null},findings:['Provider-reported property identity is preliminary. County parcel identity, title, liens, payoff and condition remain unverified.'],listings:[]};
  const detail={id:ref,subjectRef:ref,subjectKind:'PRELIMINARY',evidenceSnapshotId:record.rawResponseRef,evidenceFingerprint:fingerprint,digest:fingerprint,mode:'property',state:'READY_PROPERTY',resolutionStatus:'PROVIDER_REPORTED_PRELIMINARY',address,property:{...property.attributes,squareFeet:property.attributes.squareFootage,coordinates:selected.latitude!=null&&selected.longitude!=null?{latitude:selected.latitude,longitude:selected.longitude}:null,valuation:property.avm},comps:[],metrics:[],provenance:[{source:PROVIDER,reference:record.rawResponseRef,retrievedAt:record.retrievedAt}],cache:{retrievedAt:[record.retrievedAt]},valuationReference:null,valuationAsOf:null,valuationStatus:'NOT_ACQUIRED',findings:property.findings};
  return {property,detail};
}

export function createPropertyResearchService({enabled=false,accessControl,client,store,ledgerDirectory,operationalEvidence=null,authorization=null,authorizeResearch=null,clock=()=>new Date(),limits={requestsPerUserPerDay:3,requestsPerProviderPerDay:10,maximumEstimatedCostPerRequestCents:20,monthlyEstimatedSpendCents:100},secret=randomBytes(32),onEvidence=()=>{}}={}){
  const ledger=path.join(ledgerDirectory??'.','usage.jsonl'),reservations=path.join(ledgerDirectory??'.','reservations'),usedTokens=new Set();let evidenceHandler=onEvidence;
  const authenticate=async request=>accessControl.require(await accessControl.authenticate(request),[ROLES.ADMINISTRATOR,ROLES.ANALYST]);
  const evidenceBlockers=()=>{
    const blockers=[];
    if(!enabled)blockers.push('LOCAL_LIVE_MODE_DISABLED');
    if(!client||!store)blockers.push('PROVIDER_CLIENT_NOT_CONFIGURED');
    if(!operationalEvidence?.accountActive)blockers.push('CURRENT_ACCOUNT_STATUS_REQUIRED');
    if(!operationalEvidence?.propertyRecordsEntitled)blockers.push('PROPERTY_RECORDS_ENTITLEMENT_REQUIRED');
    if(!operationalEvidence?.rightsConfirmed||!operationalEvidence?.retentionPermitted)blockers.push('RIGHTS_AND_RETENTION_EVIDENCE_REQUIRED');
    if(!Number.isSafeInteger(operationalEvidence?.remainingRequests)||operationalEvidence.remainingRequests<1)blockers.push('CURRENT_QUOTA_EVIDENCE_REQUIRED');
    if(operationalEvidence?.overageCostCents!==20||operationalEvidence?.endpointFeeMaxCents!==0||operationalEvidence?.taxAndOtherFeeMaxCents!==0)blockers.push('CURRENT_FEE_BOUND_REQUIRED');
    return blockers;
  };
  const budget=async(user,now)=>{const rows=await ledgerRows(ledger),day=isoDay(now),month=isoMonth(now),reserved=rows.filter(row=>row.kind==='RESERVATION');const userToday=reserved.filter(row=>row.userId===user.uid&&row.day===day).length,providerToday=reserved.filter(row=>row.provider===PROVIDER&&row.day===day).length,monthEstimated=reserved.filter(row=>row.month===month).reduce((sum,row)=>sum+row.estimatedCostCents,0);return {userToday,providerToday,monthEstimated,userRemaining:Math.max(0,limits.requestsPerUserPerDay-userToday),providerRemaining:Math.max(0,limits.requestsPerProviderPerDay-providerToday),monthlyRemainingCents:Math.max(0,limits.monthlyEstimatedSpendCents-monthEstimated)};};
  const authorizationValid=(approved,user,key,now)=>approved?.provider===PROVIDER
    &&approved?.endpoint===ENDPOINT
    &&approved?.userId===user.uid
    &&approved?.addressKey===key
    &&approved?.executionDate===isoDay(now)
    &&approved?.maximumRequests===1
    &&approved?.maximumEstimatedCostCents===ESTIMATED_COST_CENTS
    &&approved?.automaticRetries===0
    &&approved?.additionalEnrichment===false
    &&approved?.durablePropertyCreation===false
    &&Date.parse(approved?.expiresAt)>now.getTime()
    &&Date.parse(approved?.approvedAt)<=now.getTime();
  const resolvedAuthorization=async(user,key,now)=>{const approved=typeof authorizeResearch==='function'?await authorizeResearch({user,addressKey:key,now,provider:PROVIDER,endpoint:ENDPOINT,estimatedCostCents:ESTIMATED_COST_CENTS}):authorization;return authorizationValid(approved,user,key,now)?approved:null;};
  const tokenFor=payload=>{const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');return `${encoded}.${createHmac('sha256',secret).update(encoded).digest('base64url')}`;};
  const tokenPayload=token=>{const [encoded,signature,...rest]=String(token).split('.');if(rest.length||!encoded||!signature)throw new ResearchStop('CONFIRMATION_INVALID',403);const expected=createHmac('sha256',secret).update(encoded).digest(),actual=Buffer.from(signature,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new ResearchStop('CONFIRMATION_INVALID',403);return JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));};
  async function capability(request){try{const user=await authenticate(request),now=clock(),current=await budget(user,now);return {enabled:evidenceBlockers().length===0,user:{role:user.role},provider:PROVIDER,endpoint:'Property Records',expectedRequests:1,estimatedCostCents:ESTIMATED_COST_CENTS,remainingRequestBudget:{localUser:current.userRemaining,localProvider:current.providerRemaining,providerAccount:Number.isSafeInteger(operationalEvidence?.remainingRequests)?Math.max(0,operationalEvidence.remainingRequests-current.providerToday):null},blockers:evidenceBlockers()};}catch(error){const safe=publicError(error);return {enabled:false,provider:PROVIDER,endpoint:'Property Records',expectedRequests:1,estimatedCostCents:ESTIMATED_COST_CENTS,remainingRequestBudget:null,blockers:[safe.code]};}}
  async function preview(request,input){
    const user=await authenticate(request),address=validateResearchAddress(input),key=researchAddressKey(address),now=clock(),blockers=evidenceBlockers();if(blockers.length)throw new ResearchStop(blockers[0],503);const approved=await resolvedAuthorization(user,key,now);if(!approved)throw new ResearchStop('REQUEST_AUTHORIZATION_REQUIRED',403);
    const location=cacheLocation(ENDPOINT,{address:queryAddress(address)}),cached=await store.has(location),current=await budget(user,now);if(!cached&&current.userRemaining<1)throw new ResearchStop('DAILY_USER_LIMIT',429);if(!cached&&(current.providerRemaining<1||current.providerToday>=operationalEvidence.remainingRequests))throw new ResearchStop('DAILY_PROVIDER_LIMIT',429);if(!cached&&current.monthlyRemainingCents<ESTIMATED_COST_CENTS)throw new ResearchStop('MONTHLY_SPENDING_LIMIT',429);if(!cached&&ESTIMATED_COST_CENTS>limits.maximumEstimatedCostPerRequestCents)throw new ResearchStop('PER_REQUEST_COST_LIMIT',403);
    const payload={v:1,userId:user.uid,address,key,authorizationId:approved.id,expiresAt:new Date(Math.min(now.getTime()+5*60_000,Date.parse(approved.expiresAt))).toISOString(),nonce:randomBytes(16).toString('hex')};
    return {confirmationToken:tokenFor(payload),address,provider:PROVIDER,endpoint:'Property Records',expectedRequests:cached?0:1,cacheHit:cached,estimatedCostCents:cached?0:ESTIMATED_COST_CENTS,remainingRequestBudget:{localUser:current.userRemaining,localProvider:current.providerRemaining,providerAccount:Math.max(0,operationalEvidence.remainingRequests-current.providerToday)},identityBoundary:'A supported provider match is preliminary and does not verify legal parcel identity.'};
  }
  async function execute(request,input){
    let user,address,key,token;
    try{
      user=await authenticate(request);if(input?.confirmed!==true)throw new ResearchStop('EXPLICIT_CONFIRMATION_REQUIRED',403);token=tokenPayload(input.confirmationToken);if(token.userId!==user.uid)throw new ResearchStop('AUTHORIZATION_FAILURE',403);if(usedTokens.has(token.nonce)||Date.parse(token.expiresAt)<=clock().getTime())throw new ResearchStop('CONFIRMATION_EXPIRED_OR_USED',409);address=validateResearchAddress(input.address);key=researchAddressKey(address);if(key!==token.key||JSON.stringify(address)!==JSON.stringify(token.address))throw new ResearchStop('CONFIRMATION_ADDRESS_CHANGED',409);const approved=await resolvedAuthorization(user,key,clock());if(!approved||approved.id!==token.authorizationId)throw new ResearchStop('REQUEST_AUTHORIZATION_REQUIRED',403);usedTokens.add(token.nonce);
      const location=cacheLocation(ENDPOINT,{address:queryAddress(address)}),cached=await store.has(location);if(!cached){const current=await budget(user,clock());if(current.userRemaining<1||current.providerRemaining<1||current.monthlyRemainingCents<ESTIMATED_COST_CENTS)throw new ResearchStop('QUOTA_EXCEEDED',429);await mkdir(reservations,{recursive:true});const reservationId=digest(`${user.uid}|${key}`),handle=await open(path.join(reservations,`${reservationId}.json`),'wx',0o600).catch(error=>{if(error.code==='EEXIST')throw new ResearchStop('DUPLICATE_REQUEST_BLOCKED',409);throw error;});const row={kind:'RESERVATION',id:reservationId,userId:user.uid,provider:PROVIDER,endpoint:ENDPOINT,addressFingerprint:digest(key),day:isoDay(clock()),month:isoMonth(clock()),estimatedCostCents:ESTIMATED_COST_CENTS,actualCostCents:null,billingStatus:'UNVERIFIED',createdAt:clock().toISOString()};await handle.writeFile(JSON.stringify(row));await handle.close();await appendLedger(ledger,row);}
      const match=await lookupProperty(client,address,{refresh:false});if(match.status==='NO_MATCH')throw new ResearchStop('NO_MATCH',404);if(match.status!=='MATCHED_ADDRESS')throw new ResearchStop('ADDRESS_AMBIGUOUS',409);const evidence=toPreliminaryEvidence(match.selected,match.record);evidenceHandler(evidence);await appendLedger(ledger,{kind:'OUTCOME',userId:user.uid,addressFingerprint:digest(key),provider:PROVIDER,status:'EXACT_SUPPORTED_MATCH',cacheHit:cached,retrievedAt:match.record.retrievedAt,estimatedCostCents:cached?0:ESTIMATED_COST_CENTS,actualCostCents:null,billingStatus:'UNVERIFIED'});return {status:'EXACT_SUPPORTED_MATCH',cacheHit:cached,requestsTransmitted:cached?0:1,property:evidence.property,identityBoundary:'Provider-reported property identity; legal parcel identity is not verified.'};
    }catch(error){const safe=publicError(error);if(user&&key)await appendLedger(ledger,{kind:'OUTCOME',userId:user.uid,addressFingerprint:digest(key),provider:PROVIDER,status:safe.code,actualCostCents:null,billingStatus:'UNVERIFIED',at:clock().toISOString()});throw new ResearchStop(safe.code,safe.status);}
  }
  return {capability,preview,execute,limits,operationalEvidence,setEvidenceHandler(handler){evidenceHandler=handler;}};
}
