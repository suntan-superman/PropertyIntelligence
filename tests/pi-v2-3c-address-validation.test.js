import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createAddressResolutionService,evaluateResearchAddressValidation} from '../src/discovery/address-resolution.js';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {ROLES} from '../src/auth/access-control.js';

const entered=(overrides={})=>({street:'400 Decatur St',city:'Bakersfield',state:'CA',zip:'93308',...overrides});
const result=({number='400',route='Decatur Street',city='Bakersfield',zip='93308',precision='ROOFTOP',partial=false,placeId='decatur'}={})=>({formatted_address:`${number} ${route}, ${city}, CA ${zip}, USA`,place_id:placeId,partial_match:partial,address_components:[{long_name:number,types:['street_number']},{long_name:route,types:['route']},{long_name:city,types:['locality']},{long_name:'California',types:['administrative_area_level_1']},{long_name:zip,types:['postal_code']},{long_name:'United States',types:['country']}],geometry:{location_type:precision,location:{lat:35.4,lng:-119.05}}});
const google=(results,status='OK')=>({status,results});

test('correct ZIP and abbreviated suffix automatically validate without review',()=>{
  const validation=evaluateResearchAddressValidation(google([result()]),entered());
  assert.equal(validation.classification,'EXACT_ADDRESS');
  assert.equal(validation.autoContinue,true);
  assert.equal(validation.confirmedAddress.zip,'93308');
  assert.equal(validation.candidates[0].comparison.streetNameAgreement,true);
});

test('incorrect Decatur ZIP requires one-click confirmation and preserves original input',async()=>{
  let googleCalls=0;const service=createAddressResolutionService({transport:async()=>{googleCalls++;return google([result()]);},clock:()=>new Date('2026-10-17T17:00:00.000Z')});
  const validation=await service.validateForResearch(entered({zip:'93309'}),{userId:'admin'});
  assert.equal(validation.classification,'ZIP_CORRECTION');
  assert.equal(validation.autoContinue,false);
  assert.equal(validation.researchToken,undefined);
  assert.deepEqual(validation.originalAddress,entered({zip:'93309'}));
  const confirmation=service.confirmForResearch({validationId:validation.validationId,placeId:'decatur'},{userId:'admin'}),consumed=service.consumeResearchToken(confirmation.researchToken,{userId:'admin'});
  assert.equal(consumed.confirmedAddress.zip,'93308');
  assert.equal(consumed.originalAddress.zip,'93309');
  assert.equal(consumed.confirmationMethod,'GOOGLE_CANDIDATE_CONFIRMED');
  assert.throws(()=>service.consumeResearchToken(confirmation.researchToken,{userId:'admin'}),/ADDRESS_VALIDATION_REQUIRED/);
  assert.equal(googleCalls,1);
});

test('missing ZIP requires confirmation rather than silently adding Google ZIP',()=>{
  const validation=evaluateResearchAddressValidation(google([result()]),entered({zip:''}));
  assert.equal(validation.classification,'MISSING_ZIP_CONFIRMATION');
  assert.equal(validation.autoContinue,false);
});

test('street-number mismatch, multiple candidates and low precision remain blocked for review',()=>{
  assert.equal(evaluateResearchAddressValidation(google([result({number:'402'})]),entered()).classification,'MATERIAL_ADDRESS_MISMATCH');
  assert.equal(evaluateResearchAddressValidation(google([result(),result({number:'402',placeId:'other'})]),entered()).classification,'MULTIPLE_PLAUSIBLE_MATCHES');
  assert.equal(evaluateResearchAddressValidation(google([result({precision:'APPROXIMATE',partial:true})]),entered()).classification,'LOW_CONFIDENCE');
});

test('Google quota/unavailability permits only an explicit warned manual confirmation',async()=>{
  const quota=evaluateResearchAddressValidation(google([],'OVER_QUERY_LIMIT'),entered());
  assert.equal(quota.classification,'GOOGLE_UNAVAILABLE');assert.equal(quota.autoContinue,false);
  const service=createAddressResolutionService({transport:async()=>google([result()]),maximumProviderCalls:0,clock:()=>new Date('2026-10-17T17:00:00.000Z')}),validation=await service.validateForResearch(entered(),{userId:'admin'});
  assert.equal(validation.classification,'GOOGLE_UNAVAILABLE');assert.equal(validation.researchToken,undefined);
  assert.throws(()=>service.confirmForResearch({validationId:validation.validationId,address:entered()},{userId:'admin'}),/MANUAL_ADDRESS_CONFIRMATION_REQUIRED/);
  const confirmation=service.confirmForResearch({validationId:validation.validationId,manualConfirmation:true,address:entered()},{userId:'admin'});
  assert.equal(service.consumeResearchToken(confirmation.researchToken,{userId:'admin'}).confirmationMethod,'MANUAL_WARNING_ACKNOWLEDGED');
});

test('validation cache avoids duplicate Google requests and tokens are user-bound',async()=>{
  let calls=0;const service=createAddressResolutionService({transport:async()=>{calls++;return google([result()]);},clock:()=>new Date('2026-10-17T17:00:00.000Z')});
  const first=await service.validateForResearch(entered(),{userId:'admin'}),second=await service.validateForResearch(entered(),{userId:'admin'});
  assert.equal(calls,1);assert.equal(second.cache.hit,true);
  assert.throws(()=>service.consumeResearchToken(first.researchToken,{userId:'another-user'}),/ADDRESS_VALIDATION_REQUIRED/);
  assert.equal(service.consumeResearchToken(first.researchToken,{userId:'admin'}).confirmedAddress.zip,'93308');
});

test('new-property paid route enforces validation while retained subjects use their locked address',async()=>{
  const [server,ui,workspace,research]=await Promise.all([readFile('src/investment-workspace/server.js','utf8'),readFile('apps/web/src/features/discovery/Discovery.jsx','utf8'),readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'),readFile('src/investment-workspace/automatic-property-research.js','utf8')]);
  assert.match(server,/consumeResearchToken\(input\?\.addressValidationToken/);
  assert.match(server,/retainedSubjectRef/);
  assert.match(server,/searchRetainedAddress\(input,evidence\.properties\)/);
  assert.match(ui,/Validating address/);
  assert.match(ui,/No RentCast request has been made/);
  assert.match(ui,/originally entered · preserved for audit/i);
  assert.match(workspace,/JSON\.stringify\(\{retainedSubjectRef:p\.ref\}\)/);
  assert.match(research,/originalEnteredAddress/);
  assert.match(research,/researchAddressKey\(address\)/);
});

test('local HTTP router never reaches mocked RentCast before ZIP correction confirmation',async t=>{
  let rentcastCalls=0,googleCalls=0,captured=null;const directory=await mkdtemp(path.join(tmpdir(),'pi-v23c-http-')),user={uid:'admin-v23c',role:ROLES.ADMINISTRATOR,emailVerified:true,providerResearchAllowed:true,organizationId:'property-intelligence-local',authenticatedAt:'2026-10-17T16:55:00.000Z',sessionExpiresAt:'2099-10-17T00:00:00.000Z'},authentication={expectedProjectId:'pi-v23c',expectedOrganizationId:'property-intelligence-local',authenticate:async()=>user,verifyRecentIdToken:async()=>user,issueCsrf:()=> 'csrf',requireCsrf(){},clearSession(){},createSession:async()=>user},propertyResearch={capability:async()=>({enabled:true,workflow:'AUTHENTICATED_RESEARCH_V1',blockers:[]}),research:async(_request,input)=>{rentcastCalls++;captured=input;return {status:'COMPLETE',address:input.address,property:null,operations:[],requestsUsed:0,estimatedSpendingCents:0};},setEvidenceHandler(){},setEvidenceProvider(){}},addressTransport=async()=>{googleCalls++;return google([result()]);};
  const server=await startInvestmentWorkspace({port:0,root:process.cwd(),storeDirectory:path.join(directory,'scenarios'),discoveryStoreDirectory:path.join(directory,'discovery'),leadStoreDirectory:path.join(directory,'leads'),viteEnabled:false,propertyDetail:true,addressTransport,propertyResearch,authentication});t.after(()=>server.close());const origin=server.origin,post=async(route,body)=>{const response=await fetch(`${origin}${route}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-PI-Workspace':'local-v1'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
  const validation=await post('/api/discovery/address-validation/start',entered({zip:'93309'}));assert.equal(validation.status,200);assert.equal(validation.body.classification,'ZIP_CORRECTION');assert.equal(rentcastCalls,0);assert.equal(googleCalls,1);
  const retained=await post('/api/discovery/address-validation/start',{street:'1708 Crestview Drive',city:'Bakersfield',state:'CA',zip:'93305'});assert.equal(retained.status,200);assert.equal(retained.body.kind,'RETAINED_MATCH');assert.equal(rentcastCalls,0);assert.equal(googleCalls,1);
  const blocked=await post('/api/property-research/research',{});assert.notEqual(blocked.status,200);assert.equal(blocked.body.error,'ADDRESS_VALIDATION_REQUIRED');assert.equal(rentcastCalls,0);
  const confirmation=await post('/api/discovery/address-validation/confirm',{validationId:validation.body.validationId,placeId:'decatur'});assert.equal(confirmation.status,200);assert.equal(rentcastCalls,0);
  const researched=await post('/api/property-research/research',{addressValidationToken:confirmation.body.researchToken});assert.equal(researched.status,200);assert.equal(rentcastCalls,1);assert.equal(captured.address.zip,'93308');assert.equal(captured.addressValidation.originalAddress.zip,'93309');
});
