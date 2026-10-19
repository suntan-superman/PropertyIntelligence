import test from 'node:test';
import assert from 'node:assert/strict';
import {createAddressResolutionService,normalizeGoogleResponse} from '../src/discovery/address-resolution.js';
import {classifyScenarioRecord,ordinaryScenario} from '../src/discovery/scenario-classification.js';

const county=(street,city='Ridgecrest')=>({id:'KERN-QA',address:{street,city,state:'CA',postalCode:null,rawCountySitus:`${street}, ${city}, CA`,confidence:'SOURCE_PARSED_NOT_POSTAL_VALIDATED'},sourceIdentity:{atn:'50908305008',apn9:'509083057'}});
const result=({street='1240',route='S China Lake Blvd',city='Ridgecrest',zip='93555',precision='ROOFTOP',partial=false,place='place-1'}={})=>({formatted_address:`${street} ${route}, ${city}, CA ${zip}, USA`,place_id:place,partial_match:partial,address_components:[{long_name:street,types:['street_number']},{long_name:route,types:['route']},{long_name:city,types:['locality']},{long_name:'California',types:['administrative_area_level_1']},{long_name:zip,types:['postal_code']},{long_name:'United States',types:['country']}],geometry:{location_type:precision,location:{lat:35.6,lng:-117.67}}});
const google=results=>({status:'OK',results});

test('Ridgecrest county situs resolves to a one-click preliminary Google candidate without ZIP input',()=>{
 const normalized=normalizeGoogleResponse(google([result()]),{street:'1240 S CHINA LAKE BL',city:'RIDGECREST',state:'CA',postalCode:'',country:'US'});
 assert.equal(normalized.classification,'EXACT_ADDRESS_CANDIDATE');assert.equal(normalized.oneClickEligible,true);assert.equal(normalized.candidates[0].components.postalCode,'93555');assert.equal(normalized.candidates[0].precision,'ROOFTOP');
});

test('Bakersfield exact match is cached and only one mocked provider transmission occurs',async()=>{
 let transmissions=0;const service=createAddressResolutionService({transport:async()=>{transmissions++;return google([result({street:'2117',route:'Boyington Way',city:'Bakersfield',zip:'93309'})]);},clock:()=>new Date('2026-10-14T18:00:00Z')});
 const candidate=county('2117 BOYINGTON WY','BAKERSFIELD'),first=await service.suggest(candidate),second=await service.suggest(candidate);
 assert.equal(first.oneClickEligible,true);assert.equal(second.cache.hit,true);assert.equal(transmissions,1);assert.deepEqual(service.usage(),{providerCalls:1,cacheHits:1,cacheEntries:1,decisions:0});
 const decision=service.decide(candidate.id,{decision:'ACCEPTED_PRELIMINARY',address:{street:'2117 Boyington Way',city:'Bakersfield',state:'CA',postalCode:'93309'}},first);assert.equal(decision.durableIdentityCreated,false);
});

test('ambiguous Google candidates require manual review and cannot use one-click acceptance',async()=>{
 const service=createAddressResolutionService({transport:async()=>google([result({place:'one'}),result({route:'S China Lake Boulevard',place:'two'})])}),candidate=county('1240 S CHINA LAKE BL'),suggestion=await service.suggest(candidate);
 assert.equal(suggestion.classification,'PARTIAL_OR_AMBIGUOUS');assert.equal(suggestion.oneClickEligible,false);assert.throws(()=>service.decide(candidate.id,{decision:'ACCEPTED_PRELIMINARY',address:{street:'1240 S China Lake Blvd',city:'Ridgecrest',state:'CA',postalCode:'93555'}},suggestion),/high-confidence/);
});

test('no-situs parcel stays in identifier/location research and never invokes Google',async()=>{
 let calls=0;const service=createAddressResolutionService({transport:async()=>{calls++;return google([]);}}),suggestion=await service.suggest({reference:'PARCEL-1',addressState:'NO_COUNTY_SITUS',sourceIdentity:{atn:'30927104008',apn9:'309271047'}});
 assert.equal(suggestion.status,'PARCEL_RESEARCH_REQUIRED');assert.equal(suggestion.classification,'NO_STREET_ADDRESS');assert.equal(calls,0);assert.equal(suggestion.identifierEvidence.atn,'30927104008');
});

test('confirmed QA scenarios are excluded without hiding legitimate preliminary-subject work',()=>{
 const legitimate={propertyRef:'PROPERTY-1',name:'Haven acquisition review',notes:'User assumptions',demonstration:false},preliminary={...legitimate,propertyRef:'GABE-01',name:'Crestview analysis'},qa=[{...legitimate,demonstration:true},{...legitimate,name:'QA fixture scenario'},{...legitimate,sourceMetadata:{purpose:'TEST'}}];
 assert.equal(ordinaryScenario(legitimate),true);assert.equal(ordinaryScenario(preliminary),true);for(const item of qa)assert.equal(classifyScenarioRecord(item).classification,'CONFIRMED_QA');
});
