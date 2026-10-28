import {createHash,randomBytes} from 'node:crypto';

const tidy=value=>String(value??'').trim().replace(/\s+/g,' ');
const normalized=value=>tidy(value).toUpperCase().replace(/\b(BOULEVARD|BLVD|BL)\b/g,'BL').replace(/\b(STREET|ST)\b/g,'ST').replace(/\b(AVENUE|AVE|AV)\b/g,'AV').replace(/\b(WAY|WY)\b/g,'WY').replace(/\b(DRIVE|DR)\b/g,'DR').replace(/\b(ROAD|RD)\b/g,'RD').replace(/\b(COURT|CT)\b/g,'CT').replace(/\b(LANE|LN)\b/g,'LN').replace(/\b(CIRCLE|CIR)\b/g,'CIR').replace(/\b(TERRACE|TER)\b/g,'TER').replace(/\b(PARKWAY|PKWY)\b/g,'PKWY').replace(/[^A-Z0-9]/g,'');
const component=(result,type)=>result.address_components?.find(item=>item.types?.includes(type))?.long_name??'';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export const ADDRESS_LOOKUP_STATES=Object.freeze({
  NOT_REQUESTED:'NOT_REQUESTED',SEARCHING:'SEARCHING',EXACT_MATCH:'EXACT_MATCH',APPROXIMATE_MATCH:'APPROXIMATE_MATCH',NO_MATCH:'NO_MATCH',PROVIDER_ERROR:'PROVIDER_ERROR',TIMEOUT:'TIMEOUT',CONFIGURATION_ERROR:'CONFIGURATION_ERROR'
});

const providerState=status=>['REQUEST_DENIED','INVALID_REQUEST'].includes(status)?ADDRESS_LOOKUP_STATES.CONFIGURATION_ERROR:ADDRESS_LOOKUP_STATES.PROVIDER_ERROR;
const unavailableMessage=lookupState=>({
  [ADDRESS_LOOKUP_STATES.TIMEOUT]:'The address lookup did not complete. You can try again or continue using your entered address.',
  [ADDRESS_LOOKUP_STATES.CONFIGURATION_ERROR]:'Google address lookup is not configured correctly. You can continue using your entered address while an administrator reviews the configuration.',
  [ADDRESS_LOOKUP_STATES.PROVIDER_ERROR]:'Google could not complete the address lookup. You can try again or continue using your entered address.'
}[lookupState]??'Google could not complete the address lookup. You can continue using your entered address.');

export function classifyGoogleAddressError(error){
  const timeout=error?.name==='AbortError'||error?.code==='GOOGLE_GEOCODING_TIMEOUT',lookupState=timeout?ADDRESS_LOOKUP_STATES.TIMEOUT:error?.code==='GOOGLE_GEOCODING_CONFIGURATION_ERROR'?ADDRESS_LOOKUP_STATES.CONFIGURATION_ERROR:ADDRESS_LOOKUP_STATES.PROVIDER_ERROR;
  return {status:error?.code??'GOOGLE_REQUEST_FAILED',classification:'GOOGLE_UNAVAILABLE',lookupState,message:unavailableMessage(lookupState),candidates:[],confirmedAddress:null,autoContinue:false,requiresConfirmation:true,legalIdentityVerified:false,boundary:'Manual address confirmation is not legal parcel verification.',sourceDetails:{provider:'Google Geocoding',requestSent:error?.requestSent===true,httpStatus:Number.isInteger(error?.httpStatus)?error.httpStatus:null,providerStatus:null}};
}

export function countyAddress(candidate){
  if(!candidate?.address?.street||!candidate?.address?.city)return null;
  return {street:tidy(candidate.address.street),city:tidy(candidate.address.city),state:'CA',postalCode:tidy(candidate.address.postalCode),country:'US',
    source:'KERN_COUNTY_ASSESSOR',rawCountySitus:candidate.address.rawCountySitus,confidence:candidate.address.confidence};
}

export function normalizeGoogleResponse(payload,county){
  if(payload?.status!=='OK'||!Array.isArray(payload.results))return {status:payload?.status??'ERROR',candidates:[],classification:payload?.status==='ZERO_RESULTS'?'NO_MATCH':'API_ERROR',oneClickEligible:false};
  const candidates=payload.results.slice(0,3).map(result=>({
    formattedAddress:tidy(result.formatted_address),placeId:tidy(result.place_id),partialMatch:result.partial_match===true,
    precision:tidy(result.geometry?.location_type)||'UNKNOWN',coordinates:result.geometry?.location&&Number.isFinite(result.geometry.location.lat)&&Number.isFinite(result.geometry.location.lng)?{latitude:result.geometry.location.lat,longitude:result.geometry.location.lng}:null,
    components:{streetNumber:component(result,'street_number'),route:component(result,'route'),city:component(result,'locality')||component(result,'postal_town'),state:component(result,'administrative_area_level_1'),postalCode:component(result,'postal_code'),country:component(result,'country')}
  }));
  const first=candidates[0],countyNumber=county.street.match(/^\d+/)?.[0]??'',countyRoute=county.street.replace(/^\d+\s*/,''),streetAgreement=!!first&&normalized(first.components.streetNumber)===normalized(countyNumber)&&normalized(first.components.route)===normalized(countyRoute),cityAgreement=!!first&&normalized(first.components.city)===normalized(county.city),stateAgreement=first?.components.state==='California'||first?.components.state==='CA',countryAgreement=first?.components.country==='United States'||first?.components.country==='US';
  const exact=candidates.length===1&&streetAgreement&&cityAgreement&&stateAgreement&&countryAgreement&&!first.partialMatch&&['ROOFTOP','RANGE_INTERPOLATED'].includes(first.precision)&&/^\d{5}$/.test(first.components.postalCode);
  return {status:payload.status,candidates,classification:exact?'EXACT_ADDRESS_CANDIDATE':candidates.length?'PARTIAL_OR_AMBIGUOUS':'NO_MATCH',oneClickEligible:exact,comparison:{streetAgreement,cityAgreement,stateAgreement,countryAgreement}};
}

export function normalizeEnteredAddress(input){
  const address={street:tidy(input?.street),city:tidy(input?.city),state:tidy(input?.state).toUpperCase(),zip:tidy(input?.zip??input?.postalCode)};
  if(!address.street||address.street.length>160||!address.city||address.city.length>100||address.state!=='CA'||!/^(?:\d{5}(?:-\d{4})?)?$/.test(address.zip))throw new Error('Enter a street, city, CA and an optional valid ZIP before validation.');
  address.zip=address.zip.slice(0,5);return address;
}

const candidateAddress=candidate=>({street:`${candidate.components.streetNumber} ${candidate.components.route}`.trim(),city:candidate.components.city,state:candidate.components.state==='California'?'CA':candidate.components.state,zip:candidate.components.postalCode});
const candidateComparison=(original,candidate)=>{const number=original.street.match(/^\d+/)?.[0]??'',route=original.street.replace(/^\d+\s*/,''),value=candidateAddress(candidate);return {streetNumberAgreement:normalized(candidate.components.streetNumber)===normalized(number),streetNameAgreement:normalized(candidate.components.route)===normalized(route),cityAgreement:normalized(value.city)===normalized(original.city),stateAgreement:value.state==='CA',zipAgreement:!original.zip||value.zip===original.zip,countryAgreement:['United States','US'].includes(candidate.components.country)};};

export function evaluateResearchAddressValidation(payload,input){
  const originalAddress=normalizeEnteredAddress(input),base=normalizeGoogleResponse(payload,{street:originalAddress.street,city:originalAddress.city,state:'CA',postalCode:originalAddress.zip,country:'US'}),candidates=base.candidates.map(candidate=>({...candidate,address:candidateAddress(candidate),comparison:candidateComparison(originalAddress,candidate)}));
  const first=candidates[0],highConfidence=Boolean(first&&!first.partialMatch&&['ROOFTOP','RANGE_INTERPOLATED'].includes(first.precision)&&first.coordinates&&/^\d{5}$/.test(first.address.zip)),consistent=Boolean(first&&first.comparison.streetNumberAgreement&&first.comparison.streetNameAgreement&&first.comparison.cityAgreement&&first.comparison.stateAgreement&&first.comparison.countryAgreement);
  let classification='GOOGLE_UNAVAILABLE',lookupState=providerState(base.status),message=unavailableMessage(lookupState);
  if(base.status!=='OK'&&base.status!=='ZERO_RESULTS'){classification='GOOGLE_UNAVAILABLE';}
  else if(base.status==='ZERO_RESULTS'||!candidates.length){classification='NO_GOOGLE_MATCH';lookupState=ADDRESS_LOOKUP_STATES.NO_MATCH;message="Google couldn't confirm this address. You can correct it or continue with RentCast research using the address you entered.";}
  else if(candidates.length>1){classification='MULTIPLE_PLAUSIBLE_MATCHES';lookupState=ADDRESS_LOOKUP_STATES.APPROXIMATE_MATCH;message='Google found multiple possible matches. Please select the intended address or continue using the address you entered.';}
  else if(!highConfidence){classification='LOW_CONFIDENCE';lookupState=ADDRESS_LOOKUP_STATES.APPROXIMATE_MATCH;message='Google found a possible match. Please review the suggested address before continuing.';}
  else if(!consistent){classification='MATERIAL_ADDRESS_MISMATCH';lookupState=ADDRESS_LOOKUP_STATES.APPROXIMATE_MATCH;message='Google found a possible match with different address details. Please review it before continuing.';}
  else if(!originalAddress.zip){classification='MISSING_ZIP_CONFIRMATION';message='Google supplied a ZIP code that was not entered. Confirm it before provider research.';}
  else if(!first.comparison.zipAgreement){classification='ZIP_CORRECTION';message='Google reported a different ZIP code. Confirm the correction before provider research.';}
  else{classification='EXACT_ADDRESS';lookupState=ADDRESS_LOOKUP_STATES.EXACT_MATCH;message='Google found a consistent high-confidence street-address match.';}
  if(['MISSING_ZIP_CONFIRMATION','ZIP_CORRECTION'].includes(classification))lookupState=ADDRESS_LOOKUP_STATES.APPROXIMATE_MATCH;
  const autoContinue=classification==='EXACT_ADDRESS';
  return {status:base.status,classification,lookupState,message,originalAddress,candidates,confirmedAddress:autoContinue?first.address:null,autoContinue,requiresConfirmation:!autoContinue,legalIdentityVerified:false,boundary:'Google address matching supports preliminary provider research only; it is not legal parcel verification.',sourceDetails:{provider:'Google Geocoding',requestSent:true,httpStatus:200,providerStatus:base.status}};
}

export function createGoogleGeocodingTransport({apiKey,fetchImpl=fetch,timeoutMs=8000}={}){
  if(!apiKey)throw new Error('GOOGLE_GEOCODING_API_KEY is not configured for the server-side live adapter.');
  return async county=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const url=new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address',`${county.street}, ${county.city}, CA${county.postalCode?` ${county.postalCode}`:''}`);url.searchParams.set('components','administrative_area:CA|country:US');url.searchParams.set('key',apiKey);
      let response;try{response=await fetchImpl(url,{method:'GET',redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});}catch(error){const wrapped=new Error(error?.name==='AbortError'?'Google Geocoding timed out.':'Google Geocoding request failed.');wrapped.name=error?.name;wrapped.code=error?.name==='AbortError'?'GOOGLE_GEOCODING_TIMEOUT':'GOOGLE_GEOCODING_PROVIDER_ERROR';wrapped.requestSent=true;throw wrapped;}
      if(!response.ok){const error=new Error(`Google Geocoding returned HTTP ${response.status}.`);error.code='GOOGLE_GEOCODING_HTTP_ERROR';error.httpStatus=response.status;error.requestSent=true;throw error;}
      try{return await response.json();}catch{const error=new Error('Google Geocoding returned malformed JSON.');error.code='GOOGLE_GEOCODING_PROVIDER_ERROR';error.requestSent=true;throw error;}
    }finally{clearTimeout(timer);}
  };
}

export function createAddressResolutionService({transport=null,clock=()=>new Date(),cacheTtlMs=5*60*1000,maximumProviderCalls=Infinity,researchValidationTtlMs=10*60*1000}={}){
  const cache=new Map(),decisions=new Map(),researchCache=new Map(),researchValidations=new Map(),researchTokens=new Map();let providerCalls=0,cacheHits=0;
  async function suggest(candidate){
    const county=countyAddress(candidate);if(!county)return {status:'PARCEL_RESEARCH_REQUIRED',classification:'NO_STREET_ADDRESS',oneClickEligible:false,countyEvidence:null,identifierEvidence:{atn:candidate?.sourceIdentity?.atn??null,apn9:candidate?.sourceIdentity?.apn9??null},message:'No county street is available. Research the parcel using retained identifiers and parcel-location evidence; do not invent an address.'};
    const key=digest({street:county.street,city:county.city,state:'CA',country:'US'}),now=clock();const cached=cache.get(key);
    if(cached&&cached.expiresAt>now.getTime()){cacheHits++;return {...structuredClone(cached.value),cache:{hit:true,key}};}
    if(!transport)return {status:'OFFLINE_NOT_CONFIGURED',classification:'API_ERROR',lookupState:ADDRESS_LOOKUP_STATES.CONFIGURATION_ERROR,oneClickEligible:false,countyEvidence:county,message:'Google address lookup is not configured for this workspace.'};
    providerCalls++;const raw=await transport(county),result={...normalizeGoogleResponse(raw,county),countyEvidence:county,googleEvidence:{source:'GOOGLE_GEOCODING',retrievedAt:now.toISOString(),requestConstraints:{state:'CA',country:'US',postalCodeSupplied:false}},cache:{hit:false,key}};
    cache.set(key,{expiresAt:now.getTime()+cacheTtlMs,value:result});return structuredClone(result);
  }
  function decide(candidateId,input,suggestion){
    if(!['ACCEPTED_PRELIMINARY','CORRECTED_PRELIMINARY','REJECTED'].includes(input?.decision))throw new Error('Choose accept, correct or reject.');
    if(input.decision==='ACCEPTED_PRELIMINARY'&&!suggestion?.oneClickEligible)throw new Error('One-click acceptance requires an exact high-confidence street match.');
    const address=input.decision==='REJECTED'?null:{street:tidy(input.address?.street),city:tidy(input.address?.city),state:tidy(input.address?.state),postalCode:tidy(input.address?.postalCode)};
    if(address&&(!address.street||!address.city||address.state!=='CA'||!/^\d{5}$/.test(address.postalCode)))throw new Error('A preliminary address requires street, city, CA and ZIP-5.');
    const decision={candidateId,decision:input.decision,address,notes:tidy(input.notes).slice(0,500),recordedAt:clock().toISOString(),sourceSeparation:{county:'KERN_COUNTY_ASSESSOR',suggestion:suggestion?.googleEvidence?.source??null},durableIdentityCreated:false};decisions.set(candidateId,decision);return structuredClone(decision);
  }
  function isCached(candidate){const county=countyAddress(candidate);if(!county)return false;const key=digest({street:county.street,city:county.city,state:'CA',country:'US'}),item=cache.get(key);return !!item&&item.expiresAt>clock().getTime();}
  const issueResearchToken=(record,address,method)=>{const token=randomBytes(32).toString('base64url'),value={token,userId:record.userId,originalAddress:record.result.originalAddress,confirmedAddress:normalizeEnteredAddress(address),classification:record.result.classification,confirmationMethod:method,googleEvidence:record.result.googleEvidence??null,issuedAt:clock().toISOString(),expiresAt:new Date(clock().getTime()+researchValidationTtlMs).toISOString()};researchTokens.set(token,value);return token;};
  async function validateForResearch(input,{userId}={}){
    if(!userId)throw new Error('Authenticated user is required for address validation.');const originalAddress=normalizeEnteredAddress(input),key=digest(originalAddress),now=clock(),cached=researchCache.get(key);let result;
    if(cached&&cached.expiresAt>now.getTime()){cacheHits++;result=structuredClone(cached.value);}else if(!transport||providerCalls>=maximumProviderCalls){const configured=Boolean(transport),lookupState=configured?ADDRESS_LOOKUP_STATES.PROVIDER_ERROR:ADDRESS_LOOKUP_STATES.CONFIGURATION_ERROR;result={status:configured?'LOCAL_QUOTA_EXHAUSTED':'OFFLINE_NOT_CONFIGURED',classification:'GOOGLE_UNAVAILABLE',lookupState,message:configured?'Google address lookup is temporarily unavailable. You can continue using your entered address.':unavailableMessage(lookupState),originalAddress,candidates:[],confirmedAddress:null,autoContinue:false,requiresConfirmation:true,legalIdentityVerified:false,boundary:'Manual address confirmation is not legal parcel verification.',sourceDetails:{provider:'Google Geocoding',requestSent:false,httpStatus:null,providerStatus:null}};}
    else{try{providerCalls++;const payload=await transport({street:originalAddress.street,city:originalAddress.city,state:'CA',postalCode:originalAddress.zip,country:'US'});result=evaluateResearchAddressValidation(payload,originalAddress);result.googleEvidence={source:'GOOGLE_GEOCODING',retrievedAt:now.toISOString(),partialMatch:result.candidates[0]?.partialMatch??null,precision:result.candidates[0]?.precision??null};}catch(error){result={...classifyGoogleAddressError(error),originalAddress};}researchCache.set(key,{expiresAt:now.getTime()+cacheTtlMs,value:result});}
    const validationId=randomBytes(18).toString('base64url'),record={validationId,userId,result,expiresAt:now.getTime()+researchValidationTtlMs};researchValidations.set(validationId,record);const response={...structuredClone(result),validationId,cache:{hit:Boolean(cached&&cached.expiresAt>now.getTime())}};if(result.autoContinue)response.researchToken=issueResearchToken(record,result.confirmedAddress,'GOOGLE_EXACT_AUTO');return response;
  }
  function confirmForResearch(input,{userId}={}){
    const record=researchValidations.get(String(input?.validationId??'')),now=clock().getTime();if(!record||record.userId!==userId||record.expiresAt<=now)throw new Error('ADDRESS_VALIDATION_EXPIRED');let confirmed,method;
    if(input?.placeId){const candidate=record.result.candidates.find(item=>item.placeId===input.placeId);if(!candidate)throw new Error('ADDRESS_VALIDATION_SELECTION_INVALID');confirmed=candidate.address;method='GOOGLE_CANDIDATE_CONFIRMED';}
    else{if(input?.manualConfirmation!==true)throw new Error('MANUAL_ADDRESS_CONFIRMATION_REQUIRED');confirmed=record.result.originalAddress;method='MANUAL_WARNING_ACKNOWLEDGED';}
    researchValidations.delete(record.validationId);return {researchToken:issueResearchToken(record,confirmed,method),confirmedAddress:confirmed,originalAddress:record.result.originalAddress,classification:record.result.classification,confirmationMethod:method,legalIdentityVerified:false,boundary:'Confirmed address supports preliminary provider research only; legal parcel identity remains unverified.'};
  }
  function consumeResearchToken(token,{userId}={}){const record=researchTokens.get(String(token??''));if(!record||record.userId!==userId||Date.parse(record.expiresAt)<=clock().getTime())throw new Error('ADDRESS_VALIDATION_REQUIRED');researchTokens.delete(record.token);return structuredClone(record);}
  return {suggest,decide,isCached,validateForResearch,confirmForResearch,consumeResearchToken,getDecision:id=>structuredClone(decisions.get(id)??null),usage:()=>({providerCalls,cacheHits,cacheEntries:cache.size,decisions:decisions.size})};
}
