import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ADDRESS_LOOKUP_STATES,createAddressResolutionService,createGoogleGeocodingTransport,evaluateResearchAddressValidation} from '../src/discovery/address-resolution.js';
import {createFirestoreAddressValidation} from '../src/discovery/firestore-address-validation.js';

const tyler=(overrides={})=>({street:'603 Tyler St',city:'Taft',state:'CA',zip:'93268',...overrides});
const googleResult=(overrides={})=>({
  formatted_address:'603 Tyler Street, Taft, CA 93268, USA',place_id:'tyler-603',partial_match:false,
  address_components:[{long_name:'603',types:['street_number']},{long_name:'Tyler Street',types:['route']},{long_name:'Taft',types:['locality']},{long_name:'California',types:['administrative_area_level_1']},{long_name:'93268',types:['postal_code']},{long_name:'United States',types:['country']}],
  geometry:{location_type:'ROOFTOP',location:{lat:35.142,lng:-119.456}},...overrides
});
function memoryFirestore(){
  const rows=new Map(),ref=path=>({path,collection:name=>collection(`${path}/${name}`),async create(value){if(rows.has(path))throw new Error('ALREADY_EXISTS');rows.set(path,structuredClone(value));},async get(){return {exists:rows.has(path),data:()=>structuredClone(rows.get(path))};}}),collection=path=>({doc:id=>ref(`${path}/${id}`)});
  return {collection,runTransaction:async callback=>callback({get:target=>target.get(),delete:target=>rows.delete(target.path)}),rows};
}

test('Google response states distinguish exact, approximate, no-match and provider configuration errors',()=>{
  const exact=evaluateResearchAddressValidation({status:'OK',results:[googleResult()]},tyler());
  const approximate=evaluateResearchAddressValidation({status:'OK',results:[googleResult({partial_match:true,geometry:{location_type:'APPROXIMATE',location:{lat:35.142,lng:-119.456}}})]},tyler());
  const none=evaluateResearchAddressValidation({status:'ZERO_RESULTS',results:[]},tyler());
  const configuration=evaluateResearchAddressValidation({status:'REQUEST_DENIED',results:[]},tyler());
  assert.equal(exact.lookupState,ADDRESS_LOOKUP_STATES.EXACT_MATCH);
  assert.equal(approximate.lookupState,ADDRESS_LOOKUP_STATES.APPROXIMATE_MATCH);
  assert.equal(none.lookupState,ADDRESS_LOOKUP_STATES.NO_MATCH);
  assert.match(none.message,/continue with RentCast research using the address you entered/i);
  assert.equal(configuration.lookupState,ADDRESS_LOOKUP_STATES.CONFIGURATION_ERROR);
  assert.equal(configuration.sourceDetails.requestSent,true);
});

test('timeout, provider failure and missing configuration remain advisory and never create a research token',async()=>{
  const abort=Object.assign(new Error('aborted'),{name:'AbortError'}),transport=createGoogleGeocodingTransport({apiKey:'test-only',fetchImpl:async()=>{throw abort;}}),timeoutService=createAddressResolutionService({transport}),timeout=await timeoutService.validateForResearch(tyler(),{userId:'analyst'});
  assert.equal(timeout.lookupState,ADDRESS_LOOKUP_STATES.TIMEOUT);
  assert.equal(timeout.researchToken,undefined);
  assert.match(timeout.message,/try again or continue/i);
  const failureService=createAddressResolutionService({transport:async()=>{throw Object.assign(new Error('network'),{code:'GOOGLE_GEOCODING_PROVIDER_ERROR',requestSent:true});}}),failure=await failureService.validateForResearch(tyler(),{userId:'analyst'});
  assert.equal(failure.lookupState,ADDRESS_LOOKUP_STATES.PROVIDER_ERROR);
  assert.equal(failure.sourceDetails.requestSent,true);
  const unconfigured=await createAddressResolutionService().validateForResearch(tyler(),{userId:'analyst'});
  assert.equal(unconfigured.lookupState,ADDRESS_LOOKUP_STATES.CONFIGURATION_ERROR);
  assert.equal(unconfigured.sourceDetails.requestSent,false);
});

test('analyst may accept a suggestion or explicitly continue with the unchanged entered address',async()=>{
  const service=createAddressResolutionService({transport:async()=>({status:'OK',results:[googleResult({partial_match:true,geometry:{location_type:'APPROXIMATE',location:{lat:35.142,lng:-119.456}}})]})});
  const acceptedValidation=await service.validateForResearch(tyler(),{userId:'analyst'}),accepted=service.confirmForResearch({validationId:acceptedValidation.validationId,placeId:'tyler-603'},{userId:'analyst'}),acceptedToken=service.consumeResearchToken(accepted.researchToken,{userId:'analyst'});
  assert.equal(acceptedToken.confirmationMethod,'GOOGLE_CANDIDATE_CONFIRMED');
  assert.equal(acceptedToken.confirmedAddress.street,'603 Tyler Street');
  const manualValidation=await service.validateForResearch(tyler(),{userId:'analyst'}),manual=service.confirmForResearch({validationId:manualValidation.validationId,manualConfirmation:true,address:{...tyler(),street:'999 Substituted St'}},{userId:'analyst'}),manualToken=service.consumeResearchToken(manual.researchToken,{userId:'analyst'});
  assert.equal(manualToken.confirmationMethod,'MANUAL_WARNING_ACKNOWLEDGED');
  assert.deepEqual(manualToken.confirmedAddress,tyler());
  assert.deepEqual(manualToken.originalAddress,tyler());
});

test('Firestore adapter uses Google Geocoding, preserves technical details and isolates validation by organization',async()=>{
  const firestore=memoryFirestore(),urls=[],fetchImpl=async url=>{urls.push(new URL(url));return new Response(JSON.stringify({status:'ZERO_RESULTS',results:[]}),{status:200,headers:{'Content-Type':'application/json'}});},clock=()=>new Date('2026-10-28T22:00:00.000Z'),workside=createFirestoreAddressValidation({firestore,organizationId:'workside',googleApiKey:'secret-not-logged',fetchImpl,clock}),other=createFirestoreAddressValidation({firestore,organizationId:'other-org',googleApiKey:'secret-not-logged',fetchImpl,clock});
  const validation=await workside.validateForResearch(tyler(),{userId:'analyst'});
  assert.equal(urls.length,1);
  assert.equal(urls[0].origin+urls[0].pathname,'https://maps.googleapis.com/maps/api/geocode/json');
  assert.equal(urls[0].searchParams.get('address'),'603 Tyler St, Taft, CA 93268');
  assert.equal(urls[0].searchParams.get('components'),'administrative_area:CA|country:US');
  assert.equal(validation.lookupState,ADDRESS_LOOKUP_STATES.NO_MATCH);
  assert.equal(validation.sourceDetails.providerStatus,'ZERO_RESULTS');
  await assert.rejects(()=>other.confirmForResearch({validationId:validation.validationId,manualConfirmation:true,address:tyler()},{userId:'analyst'}),/ADDRESS_VALIDATION_EXPIRED/);
  const confirmation=await workside.confirmForResearch({validationId:validation.validationId,manualConfirmation:true,address:tyler()},{userId:'analyst'});
  assert.equal(confirmation.confirmationMethod,'MANUAL_WARNING_ACKNOWLEDGED');
});

test('production UI uses authenticated validation, plain-language actions and no legacy local-only entered-address route',async()=>{
  const ui=await readFile('apps/web/src/features/discovery/Discovery.jsx','utf8'),cloud=await readFile('src/auth/netlify-auth.js','utf8');
  assert.match(ui,/onClick=\{resolveEnteredAddress\}/);
  assert.doesNotMatch(ui,/function openEnteredAddressResolver/);
  assert.match(ui,/Continue with entered address/);
  assert.match(ui,/Retry Google/);
  assert.match(ui,/Source Details/);
  assert.match(ui,/No RentCast request has been made/);
  assert.match(cloud,/address-validation\/start/);
  assert.match(cloud,/searchRetainedAddress\(input,retained\.properties\)/);
  assert.match(cloud,/productionResearch\(\)\)\.quote/);
  assert.match(cloud,/consumeResearchToken/);
});
