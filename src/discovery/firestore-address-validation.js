import {randomBytes} from 'node:crypto';
import {createGoogleGeocodingTransport,evaluateResearchAddressValidation,normalizeEnteredAddress} from './address-resolution.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const token=()=>randomBytes(24).toString('base64url');
export function createFirestoreAddressValidation({firestore,organizationId,googleApiKey,clock=()=>new Date(),fetchImpl=fetch,ttlMs=10*60*1000}={}){
  if(!firestore?.collection||!firestore?.runTransaction||!organizationId)throw new Error('FIRESTORE_ADDRESS_VALIDATION_REQUIRED');
  const org=firestore.collection('organizations').doc(organizationId),validations=org.collection('addressValidations'),tokens=org.collection('addressResearchTokens'),transport=googleApiKey?createGoogleGeocodingTransport({apiKey:googleApiKey,fetchImpl}):null;
  const issue=async(record,address,method)=>{const id=token(),now=clock(),value={userId:record.userId,originalAddress:record.result.originalAddress,confirmedAddress:normalizeEnteredAddress(address),classification:record.result.classification,confirmationMethod:method,googleEvidence:record.result.googleEvidence??null,issuedAt:now.toISOString(),expiresAt:new Date(now.getTime()+ttlMs).toISOString()};await tokens.doc(id).create(value);return id;};
  async function validateForResearch(input,{userId}={}){
    if(!userId)throw Object.assign(new Error('AUTHENTICATION_REQUIRED'),{status:401});const originalAddress=normalizeEnteredAddress(input),now=clock();let result;
    if(!transport)result={status:'OFFLINE_NOT_CONFIGURED',classification:'GOOGLE_UNAVAILABLE',message:'Google address validation is unavailable. Manual confirmation is required.',originalAddress,candidates:[],confirmedAddress:null,autoContinue:false,requiresConfirmation:true,legalIdentityVerified:false,boundary:'Manual address confirmation is not legal parcel verification.'};
    else try{const payload=await transport({street:originalAddress.street,city:originalAddress.city,state:'CA',postalCode:originalAddress.zip,country:'US'});result=evaluateResearchAddressValidation(payload,originalAddress);result.googleEvidence={source:'GOOGLE_GEOCODING',retrievedAt:now.toISOString(),partialMatch:result.candidates[0]?.partialMatch??null,precision:result.candidates[0]?.precision??null};}catch{result={status:'GOOGLE_REQUEST_FAILED',classification:'GOOGLE_UNAVAILABLE',message:'Google address validation could not be completed. Manual confirmation is required before provider research.',originalAddress,candidates:[],confirmedAddress:null,autoContinue:false,requiresConfirmation:true,legalIdentityVerified:false,boundary:'Manual address confirmation is not legal parcel verification.'};}
    const validationId=token(),record={userId,result:clone(result),createdAt:now.toISOString(),expiresAt:new Date(now.getTime()+ttlMs).toISOString()};await validations.doc(validationId).create(record);const response={...clone(result),validationId,cache:{hit:false}};if(result.autoContinue)response.researchToken=await issue(record,result.confirmedAddress,'GOOGLE_EXACT_AUTO');return response;
  }
  async function confirmForResearch(input,{userId}={}){
    const id=String(input?.validationId??''),snapshot=await validations.doc(id).get(),now=clock();if(!snapshot.exists||snapshot.data().userId!==userId||Date.parse(snapshot.data().expiresAt)<=now.getTime())throw Object.assign(new Error('ADDRESS_VALIDATION_EXPIRED'),{status:409});const record=snapshot.data();let confirmed,method;
    if(input?.placeId){const candidate=record.result.candidates.find(item=>item.placeId===input.placeId);if(!candidate)throw Object.assign(new Error('ADDRESS_VALIDATION_SELECTION_INVALID'),{status:409});confirmed=candidate.address;method='GOOGLE_CANDIDATE_CONFIRMED';}
    else{if(input?.manualConfirmation!==true)throw Object.assign(new Error('MANUAL_ADDRESS_CONFIRMATION_REQUIRED'),{status:409});confirmed=normalizeEnteredAddress(input.address);method='MANUAL_WARNING_ACKNOWLEDGED';}
    const researchToken=await issue(record,confirmed,method);return {researchToken,confirmedAddress:confirmed,originalAddress:record.result.originalAddress,classification:record.result.classification,confirmationMethod:method,legalIdentityVerified:false,boundary:'Confirmed address supports preliminary provider research only; legal parcel identity remains unverified.'};
  }
  async function consumeResearchToken(id,{userId}={}){
    const ref=tokens.doc(String(id??''));return firestore.runTransaction(async transaction=>{const snapshot=await transaction.get(ref),now=clock();if(!snapshot.exists||snapshot.data().userId!==userId||Date.parse(snapshot.data().expiresAt)<=now.getTime())throw Object.assign(new Error('ADDRESS_VALIDATION_REQUIRED'),{status:409});transaction.delete(ref);return clone(snapshot.data());});
  }
  return {validateForResearch,confirmForResearch,consumeResearchToken};
}
