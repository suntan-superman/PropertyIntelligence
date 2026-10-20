import {createHash,randomUUID} from 'node:crypto';
import {createResearchClientV2_3B} from '../sources/rentcast/research-client-v2-3b.js';
import {lookupProperty,queryAddress,selectProperty} from '../sources/rentcast/propertyLookup.js';
import {ResearchStop,toPreliminaryEvidence,validateResearchAddress,researchAddressKey} from './property-research.js';
import {avmParams,canonicalProviderAddress,compatibleCache,mergeSales,mergeValuation,operationState,soldParams,updateDetail} from './automatic-property-research.js';

export const PRODUCTION_RESEARCH_WORKFLOW='AUTHENTICATED_PRODUCTION_RESEARCH_V2_8';
export const DEFAULT_RESEARCH_BUDGET=Object.freeze({maximumOperationCents:100,dailyCents:1000,monthlyCents:5000,estimatedRequestCents:20,concurrency:1,automaticRetries:0});
const safeId=(value,label)=>{const text=String(value??'').trim();if(!/^[A-Za-z0-9._-]{1,128}$/.test(text))throw new ResearchStop(`${label}_INVALID`,400);return text;};
const sha=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const validCache=record=>record?.schemaVersion===1&&record.httpStatus===200&&record.body&&!record.body.error&&!record.body.parseError&&record.bodyHash===sha(JSON.stringify(record.body));
const labels={propertyRecords:'Property records',valuation:'Valuation',comparableSales:'Comparable sales'};
const statusError=error=>{
  const code=String(error?.code??error?.message??'PROVIDER_ERROR');
  if(['QUOTA_STOP','QUOTA_BUDGET_STOP','RATE_LIMIT_STOP','DAILY_BUDGET_EXCEEDED','MONTHLY_BUDGET_EXCEEDED','OPERATION_BUDGET_EXCEEDED'].includes(code))return {code:'QUOTA_EXCEEDED',status:429};
  if(['NETWORK_STOP','PROVIDER_UNAVAILABLE_STOP'].includes(code))return {code:'PROVIDER_ERROR',status:502};
  if(code==='ADDRESS_AMBIGUOUS')return {code:'AMBIGUOUS_MATCH',status:409};
  if(code==='NO_MATCH')return {code:'NO_PROPERTY_FOUND',status:404};
  return {code:/^[A-Z0-9_-]+$/.test(code)?code:'PROVIDER_ERROR',status:Number.isInteger(error?.status)?error.status:400};
};
const firestoreValue=value=>JSON.parse(JSON.stringify(value));

export function createFirestoreRentCastStore({firestore,organizationId}={}){
  if(!firestore?.collection||!firestore?.runTransaction)throw new Error('FIRESTORE_ADMIN_REQUIRED');
  const org=firestore.collection('organizations').doc(safeId(organizationId,'ORGANIZATION_ID'));
  const indexes=org.collection('providerResearchCacheIndexes'),responses=org.collection('providerResearchResponses');
  return {
    durable:true,
    async get(location){
      const pointer=await indexes.doc(sha(location.index)).get();if(!pointer.exists)return null;
      const data=pointer.data(),snapshot=await responses.doc(String(data.responseId??'')).get();if(!snapshot.exists)return null;
      const record={...snapshot.data(),rawResponseRef:`firestore://organizations/${organizationId}/providerResearchResponses/${snapshot.id}`};
      if(!validCache(record)||JSON.stringify(record.request)!==JSON.stringify(location.request))return null;
      return clone(record);
    },
    async put(location,entry){
      const body=firestoreValue(entry.body),serialized=JSON.stringify(body);if(Buffer.byteLength(serialized)>850_000)throw new ResearchStop('PROVIDER_RESPONSE_TOO_LARGE',502);
      const bodyHash=sha(serialized),responseId=sha(JSON.stringify([location.request,entry.retrievedAt,bodyHash])),record={schemaVersion:1,retrievedAt:entry.retrievedAt,httpStatus:entry.httpStatus,body,bodyHash,request:location.request,immutable:true},responseRef=responses.doc(responseId),indexRef=indexes.doc(sha(location.index));
      await firestore.runTransaction(async transaction=>{const existing=await transaction.get(responseRef);if(existing.exists&&sha(JSON.stringify(existing.data()))!==sha(JSON.stringify(record)))throw new ResearchStop('IMMUTABLE_PROVIDER_RESPONSE_CONFLICT',409);if(!existing.exists)transaction.create(responseRef,record);if(validCache(record))transaction.set(indexRef,{schemaVersion:1,responseId,request:location.request,updatedAt:entry.retrievedAt},{merge:false});});
      return {...clone(record),rawResponseRef:`firestore://organizations/${organizationId}/providerResearchResponses/${responseId}`};
    }
  };
}

export function createFirestoreResearchRepository({firestore,organizationId,clock=()=>new Date()}={}){
  if(!firestore?.collection||!firestore?.runTransaction)throw new Error('FIRESTORE_ADMIN_REQUIRED');
  const org=firestore.collection('organizations').doc(safeId(organizationId,'ORGANIZATION_ID')),settingsRef=org.collection('settings').doc('providerResearch'),usage=org.collection('providerResearchUsage'),reservations=org.collection('providerResearchReservations'),locks=org.collection('providerResearchLocks'),audits=org.collection('providerResearchAudit');
  const settings=value=>{const merged={...DEFAULT_RESEARCH_BUDGET,...value};for(const key of ['maximumOperationCents','dailyCents','monthlyCents','estimatedRequestCents'])if(!Number.isSafeInteger(merged[key])||merged[key]<1)throw new ResearchStop('RESEARCH_BUDGET_INVALID',400);if(merged.maximumOperationCents>merged.dailyCents||merged.dailyCents>merged.monthlyCents||merged.concurrency!==1||merged.automaticRetries!==0)throw new ResearchStop('RESEARCH_BUDGET_INVALID',400);return merged;};
  return {
    async getSettings(){const row=await settingsRef.get();return settings(row.exists?row.data():{});},
    async updateSettings({user,patch}){if(user?.role!=='Administrator')throw new ResearchStop('ROLE_NOT_AUTHORIZED',403);const next=settings(patch);await settingsRef.set({...next,updatedAt:clock().toISOString(),updatedBy:user.uid},{merge:false});return next;},
    async budget(){const now=clock(),day=now.toISOString().slice(0,10),month=day.slice(0,7),[configured,daily,monthly]=await Promise.all([this.getSettings(),usage.doc(`day-${day}`).get(),usage.doc(`month-${month}`).get()]);return {settings:configured,day,month,dailySpentCents:daily.data()?.estimatedCents??0,monthlySpentCents:monthly.data()?.estimatedCents??0};},
    async acquire(user){const ref=locks.doc(safeId(user.uid,'USER_ID')),now=clock(),expiresAt=new Date(now.getTime()+60_000).toISOString();await firestore.runTransaction(async transaction=>{const current=await transaction.get(ref);if(current.exists&&Date.parse(current.data().expiresAt)>now.getTime())throw new ResearchStop('RESEARCH_ALREADY_IN_PROGRESS',409);transaction.set(ref,{uid:user.uid,acquiredAt:now.toISOString(),expiresAt},{merge:false});});return async()=>firestore.runTransaction(async transaction=>{const current=await transaction.get(ref);if(current.exists&&current.data().uid===user.uid)transaction.delete(ref);});},
    async reserve({user,addressKey,operation}){const now=clock(),day=now.toISOString().slice(0,10),month=day.slice(0,7),id=sha(`${organizationId}|${addressKey}|${operation}|${day}`),reservationRef=reservations.doc(id),dailyRef=usage.doc(`day-${day}`),monthlyRef=usage.doc(`month-${month}`);
      return firestore.runTransaction(async transaction=>{const [configuredRow,existing,daily,monthly]=await Promise.all([transaction.get(settingsRef),transaction.get(reservationRef),transaction.get(dailyRef),transaction.get(monthlyRef)]),configured=settings(configuredRow.exists?configuredRow.data():{}),cost=configured.estimatedRequestCents,dailySpent=daily.data()?.estimatedCents??0,monthlySpent=monthly.data()?.estimatedCents??0;
        if(existing.exists)throw new ResearchStop('DUPLICATE_REQUEST_BLOCKED',409);if(cost>configured.maximumOperationCents)throw new ResearchStop('OPERATION_BUDGET_EXCEEDED',429);if(dailySpent+cost>configured.dailyCents)throw new ResearchStop('DAILY_BUDGET_EXCEEDED',429);if(monthlySpent+cost>configured.monthlyCents)throw new ResearchStop('MONTHLY_BUDGET_EXCEEDED',429);
        const row={id,userId:user.uid,organizationId,provider:'RentCast',operation,addressFingerprint:sha(addressKey),day,month,estimatedCostCents:cost,actualCostCents:null,billingStatus:'ESTIMATED',status:'RESERVED',createdAt:now.toISOString()};transaction.create(reservationRef,row);transaction.set(dailyRef,{estimatedCents:dailySpent+cost,requestCount:(daily.data()?.requestCount??0)+1,updatedAt:now.toISOString()},{merge:false});transaction.set(monthlyRef,{estimatedCents:monthlySpent+cost,requestCount:(monthly.data()?.requestCount??0)+1,updatedAt:now.toISOString()},{merge:false});return row;});
    },
    async complete(id,outcome){await reservations.doc(id).set({status:outcome.status,completedAt:clock().toISOString(),providerStatus:outcome.providerStatus??null},{merge:true});},
    async audit(record){const id=randomUUID();await audits.doc(id).create(firestoreValue({schemaVersion:1,id,organizationId,...record,at:clock().toISOString()}));return id;}
  };
}

function evidenceFingerprint(property){const refs=(property.researchProvenance??[]).map(item=>({kind:item.kind,reference:item.reference,retrievedAt:item.retrievedAt})).sort((a,b)=>a.kind.localeCompare(b.kind)||a.reference.localeCompare(b.reference));return sha(JSON.stringify({providerId:property.providerId,address:property.addressComponents,refs}));}
function finalizeEvidence(property,detail){const fingerprint=evidenceFingerprint(property),nextProperty={...property,evidenceFingerprint:fingerprint,reviewDate:new Date().toISOString()},nextDetail=updateDetail(nextProperty,detail);return {property:nextProperty,detail:nextDetail?{...nextDetail,id:nextProperty.ref,evidenceSnapshotId:fingerprint,evidenceFingerprint:fingerprint,digest:fingerprint}:null};}

export function createProductionPropertyResearch({organizationId,repository,store,apiKey,evidenceService,clock=()=>new Date(),fetchImpl=fetch}={}){
  if(!organizationId||!repository||!store||!apiKey||!evidenceService)throw new Error('PRODUCTION_RESEARCH_CONFIGURATION_REQUIRED');
  const requireAdmin=user=>{if(!user?.uid||user.organizationId!==organizationId)throw new ResearchStop('ORGANIZATION_NOT_AUTHORIZED',403);if(user.role!=='Administrator'||user.providerResearchAllowed!==true)throw new ResearchStop('PROVIDER_RESEARCH_NOT_AUTHORIZED',403);return user;};
  const client=createResearchClientV2_3B({apiKey,baseUrl:'https://api.rentcast.io/v1',timeoutMs:15_000,maxRetries:0,maxCalls:3,delayMs:300},{store,fetchImpl,clock:()=>clock().toISOString()});
  async function capability({user}){try{requireAdmin(user);const budget=await repository.budget();return {enabled:true,liveProviderEnabled:true,cacheRestoreEnabled:true,cacheRestoreOnly:false,workflow:PRODUCTION_RESEARCH_WORKFLOW,provider:'RentCast',maximumRequests:3,maximumEstimatedCostCents:budget.settings.maximumOperationCents,remainingRequestBudget:{dailyCents:Math.max(0,budget.settings.dailyCents-budget.dailySpentCents),monthlyCents:Math.max(0,budget.settings.monthlyCents-budget.monthlySpentCents)},automaticRetries:0,blockers:[]};}catch(error){return {enabled:false,liveProviderEnabled:false,cacheRestoreEnabled:false,cacheRestoreOnly:false,workflow:PRODUCTION_RESEARCH_WORKFLOW,provider:'RentCast',blockers:[statusError(error).code]};}}
  async function research({user,address,addressValidation=null,currentProperty=null,currentDetail=null,operations=null}){requireAdmin(user);const normalizedAddress=validateResearchAddress(address),addressKey=researchAddressKey(normalizedAddress),release=await repository.acquire(user),results=[];let property=currentProperty?clone(currentProperty):null,detail=currentDetail?clone(currentDetail):null,requestsUsed=0,estimatedSpendingCents=0;
    const requested=operations??(property?['valuation','comparableSales']:['propertyRecords','valuation']);
    const perform=async(operation,work)=>{if(operationState(property,operation)){results.push({key:operation,label:labels[operation],status:'Available',requestsUsed:0,estimatedCostCents:0,source:'Organization retained evidence'});return;}const cached=await compatibleCache(store,operation,normalizedAddress);let reservation=null;try{if(!cached){reservation=await repository.reserve({user,addressKey,operation});requestsUsed++;estimatedSpendingCents+=reservation.estimatedCostCents;}await work(cached);if(reservation)await repository.complete(reservation.id,{status:'COMPLETE',providerStatus:200});results.push({key:operation,label:labels[operation],status:cached?'Available':'Retrieved',requestsUsed:cached?0:1,estimatedCostCents:cached?0:reservation.estimatedCostCents,source:cached?'Authorized provider cache':'RentCast'});}catch(error){if(reservation)await repository.complete(reservation.id,{status:'FAILED',providerStatus:error?.reference??null});const publicFailure=statusError(error);results.push({key:operation,label:labels[operation],status:'Unavailable',requestsUsed:cached?0:1,estimatedCostCents:cached?0:reservation?.estimatedCostCents??0,error:publicFailure.code});if(operation==='propertyRecords')property=null;}};
    try{
      for(const operation of requested){
        if(operation==='propertyRecords')await perform(operation,async cached=>{const providerAddress=canonicalProviderAddress(normalizedAddress),match=cached?{...selectProperty(providerAddress,cached.body),record:cached}:await lookupProperty(client,providerAddress,{refresh:false});if(match.status==='NO_MATCH')throw new ResearchStop('NO_PROPERTY_FOUND',404);if(match.status!=='MATCHED_ADDRESS')throw new ResearchStop('AMBIGUOUS_MATCH',409);const normalized=toPreliminaryEvidence(match.selected,match.record);property={...normalized.property,addressValidation,researchProvenance:[{source:addressValidation?.googleEvidence?'Google Geocoding':'Analyst address confirmation',kind:'ADDRESS_VALIDATION',reference:addressValidation?.googleEvidence?.retrievedAt??clock().toISOString(),retrievedAt:addressValidation?.googleEvidence?.retrievedAt??clock().toISOString()},{source:'RentCast',kind:'PROPERTY_RECORDS',reference:match.record.rawResponseRef,retrievedAt:match.record.retrievedAt}]};detail=normalized.detail;});
        if(operation==='valuation'){if(!property){results.push({key:operation,label:labels[operation],status:'Unavailable',requestsUsed:0,estimatedCostCents:0,error:'PROPERTY_RECORDS_UNAVAILABLE'});continue;}await perform(operation,async cached=>{const record=cached??await client.get('/avm/value',avmParams(canonicalProviderAddress(normalizedAddress)),{refresh:false});property=mergeValuation(property,record);detail=updateDetail(property,detail);});}
        if(operation==='comparableSales'){if(!property){results.push({key:operation,label:labels[operation],status:'Unavailable',requestsUsed:0,estimatedCostCents:0,error:'PROPERTY_RECORDS_UNAVAILABLE'});continue;}await perform(operation,async cached=>{const record=cached??await client.get('/properties',soldParams(canonicalProviderAddress(normalizedAddress)),{refresh:false});property=mergeSales(property,record);detail=updateDetail(property,detail);});}
      }
      if(property){const finalized=finalizeEvidence(property,detail);property=finalized.property;detail=finalized.detail;await evidenceService.persist({user,property,propertyDetail:detail,classification:'RETAINED_RESEARCH',source:'Authenticated production RentCast research'});}
      const status=results.every(item=>item.status!=='Unavailable')?'COMPLETE':results.some(item=>item.status!=='Unavailable')?'PARTIAL':'UNAVAILABLE';await repository.audit({userId:user.uid,kind:'RESEARCH_OUTCOME',addressFingerprint:sha(addressKey),status,operations:results,requestsUsed,estimatedSpendingCents,automaticRetries:0});return {status,address:normalizedAddress,addressValidation,property,operations:results,requestsUsed,estimatedSpendingCents,maximumRequests:3,maximumEstimatedCostCents:(await repository.getSettings()).maximumOperationCents,automaticRetries:0,durablePropertyCreated:false,identityBoundary:'Provider-reported property, parcel, ownership and market evidence remain preliminary; address validation is not legal parcel, title or ownership verification.'};
    }finally{await release();}
  }
  return {capability,research,getSettings:({user})=>(requireAdmin(user),repository.getSettings()),updateSettings:({user,patch})=>(requireAdmin(user),repository.updateSettings({user,patch}))};
}
