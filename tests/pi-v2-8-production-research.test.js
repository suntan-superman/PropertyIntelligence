import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryStore} from '../src/sources/rentcast/stores.js';
import {createProductionPropertyResearch,DEFAULT_RESEARCH_BUDGET} from '../src/investment-workspace/firestore-production-research.js';
import {identityMatches} from '../src/sources/rentcast/propertyLookup.js';

const now=new Date('2026-10-20T18:00:00.000Z'),address={street:'40924 173rd Street E',city:'Lancaster',state:'CA',zip:'93535'},user={uid:'admin',role:'Administrator',organizationId:'property-intelligence-local',providerResearchAllowed:true},subject={id:'lancaster-1',formattedAddress:'40924 173rd St E, Lancaster, CA 93535',addressLine1:'40924 173rd St E',city:'Lancaster',state:'CA',zipCode:'93535',county:'Los Angeles',countyFips:'037',propertyType:'Single Family',bedrooms:3,bathrooms:2,squareFootage:1176,lotSize:29185,yearBuilt:1979,latitude:34.62,longitude:-117.83,assessorID:'TEST-APN-1',ownerOccupied:false};

function harness(){
  const events=[],persisted=[],settings={...DEFAULT_RESEARCH_BUDGET},reservations=new Set(),repository={
    async getSettings(){return settings;},async budget(){return {settings,day:'2026-10-20',month:'2026-10',dailySpentCents:0,monthlySpentCents:0};},
    async acquire(){events.push('lock');return async()=>events.push('unlock');},
    async reserve({operation}){if(reservations.has(operation))throw Object.assign(new Error('DUPLICATE_REQUEST_BLOCKED'),{status:409});reservations.add(operation);events.push(`reserve:${operation}`);return {id:operation,estimatedCostCents:20};},
    async complete(id,outcome){events.push(`complete:${id}:${outcome.status}`);},async audit(value){events.push(`audit:${value.status}`);}
  },responses={
    property:[subject],
    valuation:{price:382000,priceRangeLow:350000,priceRangeHigh:415000,subjectProperty:subject,comparables:[]},
    sales:[{...subject,id:'comp-la-1',addressLine1:'41000 170th St E',formattedAddress:'41000 170th St E, Lancaster, CA 93535',latitude:34.621,longitude:-117.831,history:{'2026-08-01':{event:'Sale',date:'2026-08-01T00:00:00.000Z',price:360000}}},{...subject,id:'wrong-county',county:'Kern',addressLine1:'1 Kern St',formattedAddress:'1 Kern St, Mojave, CA',latitude:34.622,longitude:-117.832,history:{'2026-07-01':{event:'Sale',date:'2026-07-01T00:00:00.000Z',price:300000}}}]},fetchImpl=async url=>{const parsed=new URL(url),body=parsed.pathname.endsWith('/avm/value')?responses.valuation:Object.keys(Object.fromEntries(parsed.searchParams)).length===1?responses.property:responses.sales;return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});},evidenceService={async persist(value){persisted.push(value);return {created:true};}},service=createProductionPropertyResearch({organizationId:user.organizationId,repository,store:memoryStore(),apiKey:'test-key',evidenceService,clock:()=>now,fetchImpl});return {service,events,persisted};
}

test('V2.8 performs property and valuation research once, persists immutable preliminary evidence and makes no automatic comp call',async()=>{
  const {service,events,persisted}=harness(),result=await service.research({user,address,addressValidation:{classification:'EXACT_ADDRESS',confirmationMethod:'GOOGLE_EXACT_AUTO'}});
  assert.equal(result.status,'COMPLETE');assert.equal(result.requestsUsed,2);assert.deepEqual(result.operations.map(item=>item.key),['propertyRecords','valuation']);assert.equal(result.property.avm.price,382000);assert.equal(result.property.attributes.county,'Los Angeles');assert.equal(result.property.attributes.assessorId,'TEST-APN-1');assert.equal(result.property.ownership.ownerOccupied,false);assert.equal(result.property.sales.length,0);assert.equal(persisted.length,1);assert.equal(persisted[0].classification,'RETAINED_RESEARCH');assert.match(result.property.evidenceFingerprint,/^[a-f0-9]{64}$/);assert.deepEqual(events.filter(item=>item.startsWith('reserve:')),['reserve:propertyRecords','reserve:valuation']);assert.equal(result.automaticRetries,0);
});

test('V2.8 explicit comparable research accepts same-county Lancaster sales and rejects Kern records',async()=>{
  const first=harness(),initial=await first.service.research({user,address,addressValidation:{classification:'EXACT_ADDRESS'}}),second=await first.service.research({user,address,currentProperty:initial.property,currentDetail:first.persisted[0].propertyDetail,operations:['comparableSales']});
  assert.equal(second.requestsUsed,1);assert.equal(second.property.sales.length,1);assert.equal(second.property.sales[0].providerId,'comp-la-1');assert.notEqual(second.property.evidenceFingerprint,initial.property.evidenceFingerprint);assert.equal(first.persisted.length,2);
});

test('V2.8 authorization, spending and UI boundaries remain explicit and fail closed',async()=>{
  const {service}=harness();assert.equal((await service.capability({user})).workflow,'AUTHENTICATED_PRODUCTION_RESEARCH_V2_8');await assert.rejects(()=>service.research({user:{...user,role:'Analyst',providerResearchAllowed:false},address}),/PROVIDER_RESEARCH_NOT_AUTHORIZED/);await assert.rejects(()=>service.research({user:{...user,organizationId:'foreign'},address}),/ORGANIZATION_NOT_AUTHORIZED/);
});

test('V2.8 treats spelled and abbreviated street directions as the same provider address',()=>{
  assert.equal(identityMatches({street:'40924 173rd Street East',city:'Lancaster',state:'CA',zip:'93535'},subject),true);
});
