import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {memoryStore} from '../src/sources/rentcast/stores.js';
import {createProductionPropertyResearch,DEFAULT_RESEARCH_BUDGET} from '../src/investment-workspace/firestore-production-research.js';
import {identityMatches} from '../src/sources/rentcast/propertyLookup.js';
import {canonicalProviderAddress,soldParams} from '../src/investment-workspace/automatic-property-research.js';

const now=new Date('2026-10-20T18:00:00.000Z'),address={street:'40924 173rd Street E',city:'Lancaster',state:'CA',zip:'93535'},user={uid:'admin',role:'Administrator',organizationId:'property-intelligence-local',providerResearchAllowed:true},subject={id:'lancaster-1',formattedAddress:'40924 173rd St E, Lancaster, CA 93535',addressLine1:'40924 173rd St E',city:'Lancaster',state:'CA',zipCode:'93535',county:'Los Angeles',countyFips:'037',propertyType:'Single Family',bedrooms:3,bathrooms:2,squareFootage:1176,lotSize:29185,yearBuilt:1979,latitude:34.62,longitude:-117.83,assessorID:'TEST-APN-1',ownerOccupied:false};

function harness({fetchOverride=null,timeoutMs=18_000}={}){
  const events=[],persisted=[],activity=[],settings={...DEFAULT_RESEARCH_BUDGET},approvals=new Map();let lastFailure=null;const repository={
    async getSettings(){return settings;},async budget(){return {settings,day:'2026-10-20',month:'2026-10',dailySpentCents:0,monthlySpentCents:0};},
    async createApproval(value){const row={...value,id:`approval-${approvals.size+1}`,status:'PENDING',createdAt:now.toISOString(),expiresAt:'2026-10-20T18:10:00.000Z'};approvals.set(row.id,row);return row;},
    async getApproval({id}){const row=approvals.get(id);if(!row||row.status!=='PENDING')throw new Error('RESEARCH_APPROVAL_USED');return structuredClone(row);},
    async startApproval({id}){const row=await this.getApproval({id});approvals.set(id,{...row,status:'IN_FLIGHT'});return row;},
    async finishApproval(id,{status}){const row=approvals.get(id);approvals.set(id,{...row,status});events.push(`approval:${status}`);},
    async acquire(){events.push('lock');return async()=>events.push('unlock');},async recentActivity(){events.push('recent-activity');return structuredClone(activity);},async lastFailure(){return lastFailure;},
    async reserve({operation}){const id=`${operation}-${events.length}`,row={id,operation,requestedAt:now.toISOString(),completedAt:null,status:'RESERVED',billingStatus:'ESTIMATED'};activity.push(row);events.push(`reserve:${operation}`);return {id,estimatedCostCents:20};},
    async complete(id,outcome){events.push(`complete:${id}:${outcome.status}`);const row=activity.find(item=>item.id===id);if(row)Object.assign(row,{status:outcome.status,completedAt:now.toISOString(),billingStatus:outcome.providerStatus===200?'BILLABLE_SUCCESS':'UNKNOWN_OR_NOT_BILLABLE'});if(outcome.status==='FAILED')lastFailure={operation:id.split('-')[0],failedAt:now.toISOString(),errorCode:outcome.errorCode,billingStatus:'UNKNOWN'};},async audit(value){events.push(`audit:${value.status}`);}
  },responses={
    property:[subject],
    valuation:{price:382000,priceRangeLow:350000,priceRangeHigh:415000,subjectProperty:subject,comparables:[]},
    sales:[{...subject,id:'comp-la-1',addressLine1:'41000 170th St E',formattedAddress:'41000 170th St E, Lancaster, CA 93535',latitude:34.621,longitude:-117.831,history:{'2026-08-01':{event:'Sale',date:'2026-08-01T00:00:00.000Z',price:360000}}},{...subject,id:'wrong-county',county:'Kern',addressLine1:'1 Kern St',formattedAddress:'1 Kern St, Mojave, CA',latitude:34.622,longitude:-117.832,history:{'2026-07-01':{event:'Sale',date:'2026-07-01T00:00:00.000Z',price:300000}}}]},fetchImpl=fetchOverride??(async url=>{const parsed=new URL(url),body=parsed.pathname.endsWith('/avm/value')?responses.valuation:Object.keys(Object.fromEntries(parsed.searchParams)).length===1?responses.property:responses.sales;return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});}),evidenceService={async persist(value){persisted.push(value);return {created:true};}},service=createProductionPropertyResearch({organizationId:user.organizationId,repository,store:memoryStore(),apiKey:'test-key',evidenceService,clock:()=>now,fetchImpl,timeoutMs});return {service,events,persisted,activity};
}

async function approve(service,input){const quote=await service.quote(input);return service.research({user:input.user,approvalId:quote.approvalId,idempotencyKey:`idempotency-${quote.approvalId}`});}

test('V2.8 performs property and valuation research once, persists immutable preliminary evidence and makes no automatic comp call',async()=>{
  const {service,events,persisted}=harness(),result=await approve(service,{user,address,addressValidation:{classification:'EXACT_ADDRESS',confirmationMethod:'GOOGLE_EXACT_AUTO'}});
  assert.equal(result.status,'COMPLETE');assert.equal(result.requestsUsed,2);assert.deepEqual(result.operations.map(item=>item.key),['propertyRecords','valuation']);assert.equal(result.property.avm.price,382000);assert.equal(result.property.attributes.county,'Los Angeles');assert.equal(result.property.attributes.assessorId,'TEST-APN-1');assert.equal(result.property.ownership.ownerOccupied,false);assert.equal(result.property.sales.length,0);assert.equal(persisted.length,1);assert.equal(persisted[0].classification,'RETAINED_RESEARCH');assert.match(result.property.evidenceFingerprint,/^[a-f0-9]{64}$/);assert.deepEqual(events.filter(item=>item.startsWith('reserve:')),['reserve:propertyRecords','reserve:valuation']);assert.equal(result.automaticRetries,0);
});

test('V2.8 explicit comparable research accepts same-county Lancaster sales and rejects Kern records',async()=>{
  const first=harness(),initial=await approve(first.service,{user,address,addressValidation:{classification:'EXACT_ADDRESS'}}),second=await approve(first.service,{user,address,currentProperty:initial.property,currentDetail:first.persisted[0].propertyDetail,operations:['comparableSales']});
  assert.equal(second.requestsUsed,1);assert.equal(second.property.sales.length,1);assert.equal(second.property.sales[0].providerId,'comp-la-1');assert.notEqual(second.property.evidenceFingerprint,initial.property.evidenceFingerprint);assert.equal(first.persisted.length,2);
});

test('V2.8 authorization, spending and UI boundaries remain explicit and fail closed',async()=>{
  const {service}=harness();assert.equal((await service.capability({user})).workflow,'AUTHENTICATED_PRODUCTION_RESEARCH_V2_8_1');await assert.rejects(()=>service.quote({user:{...user,role:'Analyst',providerResearchAllowed:false},address}),/PROVIDER_RESEARCH_NOT_AUTHORIZED/);await assert.rejects(()=>service.quote({user:{...user,organizationId:'foreign'},address}),/ORGANIZATION_NOT_AUTHORIZED/);
});

test('V2.8.1 cost confirmation is single-use and a new explicit retry is not blocked by a prior attempt',async()=>{
  const {service,events}=harness(),first=await service.quote({user,address}),result=await service.research({user,approvalId:first.approvalId,idempotencyKey:'idempotency-first'});assert.equal(result.requestsUsed,2);await assert.rejects(()=>service.research({user,approvalId:first.approvalId,idempotencyKey:'idempotency-second'}),/RESEARCH_APPROVAL_USED/);const retry=await service.quote({user,address,currentProperty:result.property,operations:['comparableSales'],refresh:true});assert.equal(retry.estimatedMaximumChargeCents,20);assert.equal(retry.recentProviderActivity.windowDays,7);assert.equal(retry.recentProviderActivity.requests.length,2);assert.match(retry.warnings.join(' '),/within the last 7 days/);await service.research({user,approvalId:retry.approvalId,idempotencyKey:'idempotency-retry'});assert.equal(events.filter(item=>item==='reserve:comparableSales').length,1);
});

test('V2.8.1 retained evidence is quoted at zero and performs no provider request',async()=>{
  const first=harness(),initial=await approve(first.service,{user,address}),before=first.events.filter(item=>item.startsWith('reserve:')).length,recentChecks=first.events.filter(item=>item==='recent-activity').length,quote=await first.service.quote({user,address,currentProperty:initial.property,currentDetail:first.persisted[0].propertyDetail,operations:['valuation']});assert.equal(quote.estimatedMaximumChargeCents,0);assert.deepEqual(quote.recentProviderActivity.requests,[]);assert.equal(first.events.filter(item=>item==='recent-activity').length,recentChecks);const restored=await first.service.research({user,approvalId:quote.approvalId,idempotencyKey:'idempotency-retained'});assert.equal(restored.requestsUsed,0);assert.equal(first.events.filter(item=>item.startsWith('reserve:')).length,before);
});

test('V2.8.1 requires a fresh warning when another same-property request appears after approval',async()=>{
  const {service,events,activity}=harness(),quote=await service.quote({user,address,operations:['propertyRecords']});activity.push({id:'concurrent-request',operation:'valuation',requestedAt:now.toISOString(),completedAt:now.toISOString(),status:'COMPLETE',billingStatus:'BILLABLE_SUCCESS'});await assert.rejects(()=>service.research({user,approvalId:quote.approvalId,idempotencyKey:'idempotency-stale-warning'}),error=>error?.message==='RECENT_PROVIDER_ACTIVITY_CHANGED'&&error?.status===409);assert.equal(events.some(item=>item.startsWith('reserve:')),false);
});

test('V2.8.1 failed provider research releases the request and permits an immediate disclosed retry without automatic retry',async()=>{
  let calls=0;const {service,events}=harness({timeoutMs:5_000,fetchOverride:async(_url,{signal})=>{calls++;if(calls===1)return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));return new Response(JSON.stringify([subject]),{status:200,headers:{'Content-Type':'application/json'}});}}),firstQuote=await service.quote({user,address,operations:['propertyRecords']}),first=await service.research({user,approvalId:firstQuote.approvalId,idempotencyKey:'idempotency-timeout'});assert.equal(first.status,'UNAVAILABLE');assert.equal(first.operations[0].error,'PROVIDER_TIMEOUT');assert.equal(calls,1);assert.equal(events.filter(item=>item==='unlock').length,1);const retryQuote=await service.quote({user,address,operations:['propertyRecords']});assert.equal(retryQuote.previousFailure.billingStatus,'UNKNOWN');const retried=await service.research({user,approvalId:retryQuote.approvalId,idempotencyKey:'idempotency-manual-retry'});assert.equal(retried.status,'COMPLETE');assert.equal(calls,2);assert.equal(events.filter(item=>item==='unlock').length,2);
});

test('V2.8 treats spelled and abbreviated street directions as the same provider address',()=>{
  const normalized=canonicalProviderAddress({street:'40924 173rd Street East',city:'Lancaster',state:'CA',zip:'93535'}),params=soldParams(normalized);assert.equal(normalized.street,'40924 173rd St E');assert.equal(identityMatches(normalized,subject),true);assert.equal(Object.hasOwn(params,'includeTotalCount'),false);
});

test('Guided Analysis follows a newly retained evidence snapshot without rewriting a saved scenario',async()=>{
  const [workspace,approval]=await Promise.all([readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'),readFile('apps/web/src/features/property-research/paid-research.js','utf8')]);assert.match(workspace,/updated\.evidenceFingerprint!==p\.evidenceFingerprint\)location\.hash=investmentRoute\(updated\.ref,updated\.evidenceFingerprint,null,'Sold Sales',mode\)/);assert.doesNotMatch(workspace,/updated\.evidenceFingerprint[^\n]+save\(/);assert.match(approval,/Approve & Research/);assert.match(approval,/No automatic retry/);assert.match(approval,/billing status is unknown/);assert.match(approval,/Recent RentCast activity/);assert.match(approval,/within the last/);
});
