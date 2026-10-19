import {createHash} from 'node:crypto';
import {open,readdir} from 'node:fs/promises';
import {join,resolve,relative,sep,isAbsolute} from 'node:path';
import {createClient} from '../../src/sources/rentcast/client.js';
import {lookupProperty,addressKey,queryAddress} from '../../src/sources/rentcast/propertyLookup.js';
import {normalizeAtn,normalizeApn9} from '../sprint6_2/core.js';
import {providerReadyAddress} from '../../src/persistence/addressResolutionRepository.js';

export const ROOT='data/runtime/rentcast-controlled-pilot';
export const ENDPOINT='https://api.rentcast.io/v1/properties';
export const RULE='RC_V1: clean exact Kern SFR relationships; exclude historical fixture and registered IP pilots; no quality flags; ascending fixed-width ATN, then APN9; first three. No investment metrics.';
export const sha=x=>createHash('sha256').update(x).digest('hex');
export const check=(ok,code)=>{if(!ok)throw new Error(code);};
export async function saveNew(path,value){const f=await open(path,'wx',0o600);try{await f.writeFile(JSON.stringify(value,null,2)+'\n');await f.sync();}finally{await f.close();}}
export const seal=x=>({...x,packetSha256:sha(JSON.stringify(x))});
export function normalizeProviderApn(raw){
  if(typeof raw!=='string')return null;
  // Conservative formatting-only projection into the existing Kern APN9 validator.
  // Never truncate an ATN, pad, reorder, drop zeros or coerce numeric identifiers.
  if(!/^[0-9 -]+$/.test(raw))return null;
  return normalizeApn9(raw.replace(/[ -]/g,''));
}
export function apnComparison(county,record,count=1){
  if(count===0)return 'NO_PROPERTY_RETURNED';
  if(count!==1)return 'AMBIGUOUS_IDENTITY';
  if(record.assessorID==null||record.assessorID==='')return 'APN_MISSING';
  if(!normalizeApn9(county.apn9)||!countyContext(record))return 'APN_CONFLICT';
  if(record.assessorID===county.apn9)return 'EXACT_APN_MATCH';
  return normalizeProviderApn(record.assessorID)===county.apn9?'NORMALIZED_APN_MATCH':'APN_CONFLICT';
}
export function countyContext(r){
  return r.state==='CA'&&addressKey(r.county)==='KERN'
    &&(r.stateFips==null||r.stateFips==='06')&&(r.countyFips==null||r.countyFips==='029'||r.countyFips==='06029');
}
const scalarKeys=['id','assessorID','formattedAddress','addressLine1','addressLine2','city','state','stateFips','county','countyFips','zipCode','propertyType','bedrooms','bathrooms','squareFootage','lotSize','yearBuilt','lastUpdatedDate','updatedAt','asOf'];
export function minimalRecord(raw){return Object.fromEntries(scalarKeys.filter(k=>Object.hasOwn(raw,k)&&(raw[k]===null||['string','number','boolean'].includes(typeof raw[k]))).map(k=>[k,raw[k]]));}
export function addressComparison(address,r){
  const left=addressKey(address.street),right=addressKey(r.addressLine1);
  const noUnit=!r.addressLine2&&!/\b(?:UNIT|APT|SUITE|STE)\b|#/.test(left+' '+right);
  const result={streetNumberAgreement:/^\d+[A-Z]?\b/.exec(left)?.[0]===/^\d+[A-Z]?\b/.exec(right)?.[0]&&/^\d/.test(left),
    streetNameAndSuffixAgreement:left===right,cityAgreement:addressKey(address.city)===addressKey(r.city),stateAgreement:r.state===address.state,
    validZip5:typeof r.zipCode==='string'&&/^\d{5}$/.test(r.zipCode),unitAgreement:noUnit,
    formattedAddressConsistent:!r.formattedAddress||addressKey(r.formattedAddress)===addressKey([r.addressLine1,r.addressLine2,r.city,`${r.state} ${r.zipCode}`].filter(Boolean).join(', '))};
  const suggested={street:r.addressLine1,city:r.city,state:r.state,postalCode:r.zipCode};
  return {...result,canonicalFormatValid:!!providerReadyAddress(suggested),allAgree:Object.values(result).every(Boolean)&&!!providerReadyAddress(suggested)};
}
export function reconcile(candidate,body,{duplicateIds=new Set()}={}){
  const records=Array.isArray(body)?body:[],r=records[0]??{},count=records.length;
  let match=apnComparison(candidate.county,r,count),discrepancies=[];
  if(count===1&&(!r.id||duplicateIds.has(r.id))){match='AMBIGUOUS_IDENTITY';discrepancies.push(r.id?'DUPLICATE_RENTCAST_ID':'PROVIDER_ID_MISSING');}
  if(count>1)discrepancies.push('MULTIPLE_PROVIDER_CANDIDATES');
  const address=count===1?addressComparison(candidate.requestAddress,r):null;
  const typeMatch=r.propertyType==='Single Family';
  if(count===1){if(!address.allAgree)discrepancies.push('ADDRESS_REVIEW_REQUIRED');if(!typeMatch)discrepancies.push('PROPERTY_TYPE_CONFLICT');if(!countyContext(r))discrepancies.push('COUNTY_CONTEXT_CONFLICT');}
  const matched=['EXACT_APN_MATCH','NORMALIZED_APN_MATCH'].includes(match);
  if(!matched)discrepancies.push(match);
  const tier=count===0?'INSUFFICIENT_EVIDENCE':matched&&address?.allAgree&&typeMatch&&discrepancies.length===0?'ROUTINE_REVIEW_READY':'EXCEPTION_REVIEW_REQUIRED';
  return {pilotCode:candidate.pilotCode,matchClassification:match,reviewTier:tier,addressComparison:address,propertyTypeAgreement:typeMatch,
    countyContextVerified:count===1&&countyContext(r),normalizedAssessorId:count===1?normalizeProviderApn(r.assessorID):null,
    discrepancies:[...new Set(discrepancies)],analystDecision:null,analystApproved:false,persistenceAuthorized:false,round1Selected:false};
}

/** Single-use transport guard for the existing RentCast client, not a new HTTP client. */
export function controlledLookup(config,{directory,candidates,fetchImpl=fetch,clock=()=>new Date().toISOString()}){
  check(config.maxRetries===0&&config.maxCalls===3,'UNSAFE_CLIENT_CONFIGURATION');
  const rel=relative(resolve(ROOT),resolve(directory));check(rel&&!rel.startsWith(`..${sep}`)&&rel!=='..'&&!isAbsolute(rel),'PRIVATE_STORAGE_REQUIRED');
  let current=null,inFlight=false,attempts=0,http200=0,non200=0,unknown=0;
  const done=new Set(),observations=[];
  const transport=async(url,options)=>{
    check(current&&!inFlight,'SERIAL_REQUEST_REQUIRED');
    const u=new URL(url);check(u.origin+u.pathname===ENDPOINT&&u.searchParams.size===1&&u.searchParams.get('address')===queryAddress(current.requestAddress),'UNAUTHORIZED_REQUEST');
    check(options.method==='GET'&&options.redirect==='error'&&options.headers['X-Api-Key']===config.apiKey,'REQUEST_OPTIONS_CHANGED');
    check(attempts<3&&!done.has(current.pilotCode),'ATTEMPT_CEILING');
    const n=attempts+1;inFlight=true;
    try{
      // fsync BEFORE fetch; uncertain/crashed reservations are never reusable.
      await saveNew(join(directory,`attempt-${n}.json`),{attempt:n,pilotCode:current.pilotCode,endpoint:ENDPOINT,requestFingerprint:sha(u.toString()),transmissionIntentAt:clock(),countsAgainstCeiling:true});
      attempts++;done.add(current.pilotCode);
      try{const response=await fetchImpl(url,options);if(response.status===200)http200++;else non200++;
        await saveNew(join(directory,`http-${n}.json`),{attempt:n,pilotCode:current.pilotCode,status:response.status,receivedAt:clock()});return response;
      }catch{unknown++;throw new Error('NETWORK_OUTCOME_UNCERTAIN');}
    }finally{inFlight=false;}
  };
  // Store injection deliberately bypasses shared cache and removes owner/contact
  // fields before any persistence. Full body fingerprint retained, raw body omitted.
  const store={get:async()=>null,put:async(location,entry)=>{
    const record={schemaVersion:1,pilotCode:current.pilotCode,attempt:attempts,retrievedAt:entry.retrievedAt,httpStatus:entry.httpStatus,
      endpoint:'/properties',request:location.request,responseFingerprint:sha(JSON.stringify(entry.body)),
      body:Array.isArray(entry.body)?entry.body.map(x=>x&&typeof x==='object'&&!Array.isArray(x)?minimalRecord(x):null):null,
      rawProviderBodyRetained:false};
    const path=join(directory,`response-${attempts}.json`);await saveNew(path,record);observations.push(record);
    return {...record,rawResponseRef:path};
  }};
  const client=createClient(config,{fetchImpl:transport,store,clock,cachePrefix:directory});
  return {async lookup(candidate){
    check(!current&&!inFlight,'SERIAL_REQUEST_REQUIRED');check(candidates.some(c=>JSON.stringify(c)===JSON.stringify(candidate)),'CANDIDATE_NOT_AUTHORIZED');check(!done.has(candidate.pilotCode)&&attempts<3,'ATTEMPT_CEILING');
    const existing=await readdir(directory);check(existing.filter(n=>/^attempt-\d+\.json$/.test(n)).length===attempts,'DURABLE_LEDGER_DISAGREEMENT');
    check(!current&&!inFlight,'SERIAL_REQUEST_REQUIRED');
    current=candidate;try{return await lookupProperty(client,candidate.requestAddress,{refresh:true});}finally{current=null;}
  },observations,accounting:()=>({authorizedAttempts:3,attemptsTransmitted:attempts,http200,non200,unknownOutcomes:unknown,estimatedBillableRequests:http200,conservativeBillableCeiling:attempts,maximumOverageExposure:.6,estimatedMaximumIncrementalOverage:Number((attempts*.2).toFixed(2)),estimatedHttp200Overage:Number((http200*.2).toFixed(2)),automaticRetries:client.metrics.retries,cacheHits:client.metrics.cacheHits,providerCalls:client.metrics.apiCalls})};
}
