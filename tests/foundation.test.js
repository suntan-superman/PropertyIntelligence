import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { floridaSeed } from '../src/domain/floridaSeed.js';
import { claim } from '../src/domain/claim.js';
import { claimValues } from '../src/domain/deal.js';
import { property } from '../src/domain/property.js';
import { evidence } from '../src/domain/evidence.js';
import { calculateDeal, calculatePortfolio, assertSponsorMath } from '../src/underwriting/deterministic.js';
import { comparePrice, comparePortfolio } from '../src/underwriting/comparison.js';
import { configuration } from '../src/sources/rentcast/config.js';
import { createClient, redact, retryDelay } from '../src/sources/rentcast/client.js';
import { selectProperty, lookupProperty } from '../src/sources/rentcast/propertyLookup.js';
import { normalizeValuation } from '../src/sources/rentcast/valuation.js';
import { normalizeProperty } from '../src/sources/rentcast/normalizer.js';
import { verifyOne } from '../src/sources/rentcast/verify.js';
import { root, csv } from '../src/io/files.js';
const fixture = JSON.parse(await readFile(new URL('./fixtures/rentcast.json', import.meta.url)));
const address = { street:'10 Example Parkway', city:'Example City', state:'FL', zip:null };
const record = { retrievedAt:'2026-09-18T00:00:00.000Z', rawResponseRef:'fixture.json' };
const config = { ...configuration({ RENTCAST_API_KEY:'fake-test-secret' }), delayMs:0, timeoutMs:1000 };
async function clientFixture(t, responses, overrides = {}) {
  const temporary = await mkdtemp(path.join(tmpdir(), 'property-intelligence-test-'));
  t.after(() => rm(temporary, { recursive:true, force:true }));
  const requests = []; const sleeps = [];
  const client = createClient({ ...config, ...overrides }, { cachePrefix:path.relative(root, temporary),
    sleep:async (ms) => { sleeps.push(ms); }, fetchImpl:async (url, options) => {
      requests.push({ url:String(url), options });
      const next = responses.shift();
      if (next instanceof Error) throw next;
      if (!next) throw new Error('Unexpected mock call');
      return new Response(next.raw ?? JSON.stringify(next.body), { status:next.status ?? 200, headers:next.headers });
    } });
  return { client, requests, sleeps, temporary };
}
test('sponsor seed is idempotent, retains all claims and incomplete identities', () => {
  const seed = floridaSeed(); assert.deepEqual(seed, floridaSeed());
  assert.equal(seed.deals.length,3); assert.equal(seed.deals[0].claims.length,10);
  assert.equal(seed.properties[2].sponsorAddress.state,null);
  assert.equal(seed.collateralClaims.length,5);
  assert.ok(seed.deals.flatMap((d)=>d.claims).every((c)=>c.status==='SPONSOR_SUPPLIED' && c.suppliedAt===null));
});
test('all sponsor arithmetic and portfolio acceptance values reconcile', () => {
  const result = calculatePortfolio(floridaSeed());
  assert.deepEqual(result.deals.map((d)=>d.projectedNetProfit),[99000,30600,22378]);
  assert.deepEqual(result.deals.map((d)=>Number((100*d.projectedCashOnCashReturn).toFixed(1))),[57.2,104.1,170.5]);
  assert.equal(result.totals.combinedProjectedNetProfit,151978);
  assert.equal(result.totals.totalCashInvested,215522);
  assert.equal(Number((result.totals.projectedCashOnCashReturn*100).toFixed(1)),70.5);
  assert.equal(result.fullyBurdened.profit,null);
});
test('missing amounts, denominator zero and arithmetic discrepancies do not become guesses', () => {
  const supplied = claimValues(floridaSeed().deals[0]);
  assert.throws(()=>calculateDeal({...supplied, estimatedRepairs:null}));
  assert.throws(()=>assertSponsorMath(calculateDeal(supplied), {...supplied, projectedNetProfit:1}), /STOP/);
  const modified=floridaSeed(); modified.claims[0].value=0; assert.throws(()=>calculatePortfolio(modified),/STOP/);
  const zero = calculateDeal(Object.fromEntries(Object.keys(supplied).map((key)=>[key,0])));
  assert.equal(zero.projectedCashOnCashReturn,null);
});
test('domain validation rejects invalid states and preserves zero distinct from missing', () => {
  assert.throws(()=>claim({field:'x',value:1,suppliedBy:'x',sourceDocument:'x',status:'FAKE'}));
  assert.throws(()=>evidence({field:'x'}));
  assert.throws(()=>property({id:'x',bedrooms:'2'}));
  assert.equal(property({id:'x',bathrooms:0}).bathrooms,0);
  assert.equal(property({id:'x'}).bathrooms,null);
});
test('exact address normalization and APN leading zeros survive', () => {
  assert.equal(selectProperty(address,[fixture.property]).status,'MATCHED_ADDRESS');
  const result=normalizeProperty('test',fixture.property,record);
  assert.equal(result.property.identifiers.apn,'001-0002');
  assert.equal(result.property.bathrooms,0); assert.equal(result.property.lotSize,null);
  assert.ok(result.evidence.every((item)=>item.rawResponseRef==='fixture.json' && item.source==='RentCast'));
});
test('no match, multiple matches, wrong city/street and unexpected unit reject identity', () => {
  assert.equal(selectProperty(address,[]).status,'NO_MATCH');
  assert.equal(selectProperty(address,[fixture.property,fixture.property]).status,'ADDRESS_AMBIGUOUS');
  for(const change of [{city:'Other City'},{addressLine1:'100 Example Pkwy'},{addressLine2:'Unit 7'}]) {
    assert.equal(selectProperty(address,[{...fixture.property,...change}]).selected,null);
  }
  assert.throws(()=>selectProperty(address,{results:[]}),/API_CONTRACT/);
});
test('incomplete Joyce identity is never selected even with one plausible Florida candidate', async () => {
  const incomplete={street:'131 Joyce Place'};
  const candidate={addressLine1:'131 Joyce Pl',city:'Unconfirmed City',state:'FL'};
  assert.equal(selectProperty(incomplete,[candidate]).status,'AMBIGUOUS_PENDING_CONFIRMATION');
  assert.equal(selectProperty(incomplete,[candidate,candidate]).status,'ADDRESS_AMBIGUOUS');
  const result=await lookupProperty({get:()=>{throw new Error('No call allowed');}},incomplete);
  assert.equal(result.status,'ADDRESS_AMBIGUOUS');
});
test('AVM ranges stay missing and all comps including zero distance and mismatched type survive', () => {
  const full=normalizeValuation(fixture.avm); assert.equal(full.comps.length,2);
  assert.equal(full.comps[0].distance,0); assert.equal(full.comps[0].daysOnMarket,0);
  assert.equal(full.comps[1].propertyType,'Single Family');
  const partial=normalizeValuation({price:60000,comparables:[]});
  assert.equal(partial.low,null); assert.equal(partial.high,null);
  assert.throws(()=>normalizeValuation({price:60000,priceRangeLow:2,priceRangeHigh:1}),/API_CONTRACT/);
  assert.throws(()=>normalizeValuation({price:60000,comparables:{}}),/API_CONTRACT/);
  assert.throws(()=>normalizeValuation({price:'60000'}),/API_CONTRACT/);
});
test('comparison statuses, boundaries and variance denominator', () => {
  const avm={price:100,low:90,high:110};
  for(const [price,status] of [[89,'BELOW_INDEPENDENT_RANGE'],[90,'WITHIN_INDEPENDENT_RANGE'],
    [110,'WITHIN_INDEPENDENT_RANGE'],[111,'ABOVE_INDEPENDENT_RANGE']]) {
    assert.equal(comparePrice(price,avm,'INDEPENDENT_EVIDENCE_AVAILABLE').status,status);
  }
  assert.equal(comparePrice(120,{price:100},'INDEPENDENT_EVIDENCE_AVAILABLE').variancePercent,20);
  assert.equal(comparePrice(120,{price:100},'INDEPENDENT_EVIDENCE_AVAILABLE').status,'INDEPENDENT_ESTIMATE_ONLY');
  assert.equal(comparePrice(120,null,'NOT_QUERIED').status,'NO_INDEPENDENT_EVIDENCE');
  assert.equal(comparePrice(120,avm,'ADDRESS_AMBIGUOUS').independentAvm,null);
  assert.equal(comparePrice(120,avm,'MANUFACTURED_REPRESENTATION_STOP').independentAvm,null);
});
test('comparison does not mutate or verify sponsor claims', () => {
  const seed=floridaSeed(); const before=JSON.stringify(seed);
  const rows=comparePortfolio(seed,{properties:[]});
  assert.equal(rows.length,3); assert.equal(JSON.stringify(seed),before);
  assert.equal(rows[0].sponsorClaim.status,'SPONSOR_SUPPLIED');
  assert.equal(rows[0].independentAvm,null);
});
test('client reuses cache, refreshes and retains immutable raw evidence', async(t) => {
  const {client,requests}=await clientFixture(t,[{body:[fixture.property]},{body:[]}]);
  const params={address:'Example'};
  const first=await client.get('/properties',params);
  const cached=await client.get('/properties',params);
  assert.deepEqual(cached,first); assert.equal(requests.length,1);
  const refreshed=await client.get('/properties',params,{refresh:true});
  assert.notEqual(first.rawResponseRef,refreshed.rawResponseRef);
  assert.equal(client.metrics.cacheHits,1);
  assert.equal(JSON.parse(await readFile(path.join(root,first.rawResponseRef),'utf8')).body.length,1);
});
test('requests are encoded and secrets excluded from raw cache and request metadata', async(t) => {
  const {client,requests}=await clientFixture(t,[{body:{token:'hidden',nested:{message:'fake-test-secret'}}}]);
  const result=await client.get('/properties',{address:'A & B'});
  assert.equal(new URL(requests[0].url).searchParams.get('address'),'A & B');
  assert.equal(requests[0].options.redirect,'error');
  assert.equal(JSON.stringify(result).includes('fake-test-secret'),false);
  assert.equal(JSON.stringify(result).includes('X-Api-Key'),false);
  assert.equal(result.body.token,'[REDACTED]');
});
test('redaction handles nested secrets, encoded key and auth field names', () => {
  const secret='fake+secret';
  const result=redact({headers:{'X-Api-Key':secret},text:encodeURIComponent(secret),array:[secret]},[secret]);
  assert.equal(JSON.stringify(result).includes(secret),false);
  assert.equal(result.text,'[REDACTED]');
});
test('429 respects Retry-After and transient failure retries', async(t) => {
  const {client,sleeps}=await clientFixture(t,[{status:429,body:{message:'limit'},headers:{'Retry-After':'2'}},
    {status:503,body:{}},{body:[]}]);
  await client.get('/properties',{address:'retry'});
  assert.equal(client.metrics.apiCalls,3); assert.equal(client.metrics.retries,2);
  assert.equal(client.metrics.rateLimits,1); assert.ok(sleeps.includes(2000));
  assert.equal(retryDelay('Thu, 01 Jan 1970 00:00:03 GMT',1000),2000);
});
test('network retry is bounded and does not expose exception secret', async(t) => {
  const {client}=await clientFixture(t,[new Error('fake-test-secret'),{body:[]}]);
  await client.get('/properties',{address:'network'}); assert.equal(client.metrics.retries,1);
  assert.equal(JSON.stringify(client.metrics).includes('fake-test-secret'),false);
});
test('authentication errors do not retry and only safe code is thrown', async(t) => {
  const {client}=await clientFixture(t,[{status:401,body:{message:'fake-test-secret'}}]);
  await assert.rejects(client.get('/properties',{address:'auth'}),/AUTHENTICATION_STOP/);
  assert.equal(client.metrics.apiCalls,1);
});
test('quota and long rate-limit wait stop immediately', async(t) => {
  const {client}=await clientFixture(t,[{status:429,body:{},headers:{'Retry-After':'90'}}]);
  await assert.rejects(client.get('/properties',{address:'quota'}),/RATE_LIMIT_STOP/);
  assert.equal(client.metrics.apiCalls,1);
});
test('call budget stops additional uncached requests', async(t) => {
  const {client}=await clientFixture(t,[{body:[]}],{maxCalls:1});
  await client.get('/properties',{address:'one'});
  await assert.rejects(client.get('/properties',{address:'two'}),/QUOTA_BUDGET_STOP/);
});
test('malformed JSON and deterministic provider errors do not retry', async(t) => {
  const {client}=await clientFixture(t,[{raw:'not JSON'},{status:400,body:{error:'bad query'}}]);
  await assert.rejects(client.get('/properties',{address:'bad'}),/API_CONTRACT_STOP/);
  await assert.rejects(client.get('/properties',{address:'invalid'}),/HTTP_400_STOP/);
  assert.equal(client.metrics.retries,0);
});
test('configuration and request allowlists prevent credential redirection', async(t) => {
  assert.throws(()=>configuration({}),/CONFIGURATION_STOP/);
  assert.throws(()=>configuration({RENTCAST_API_KEY:'fake',RENTCAST_BASE_URL:'https://other.invalid'}),/CONFIGURATION_STOP/);
  const {client}=await clientFixture(t,[]);
  await assert.rejects(client.get('/listings/sale',{address:'x'}),/REQUEST_CONTRACT_STOP/);
  await assert.rejects(client.get('/properties',{address:'x',apiKey:'bad'}),/REQUEST_CONTRACT_STOP/);
  assert.equal(client.metrics.apiCalls,0);
});
test('successful verification retains provider comps, provenance and original sponsor identity', async(t) => {
  const {client}=await clientFixture(t,[{body:[fixture.property]},{body:fixture.avm}]);
  const result=await verifyOne(client,{id:'example',sponsorAddress:address});
  assert.equal(result.status,'INDEPENDENT_EVIDENCE_AVAILABLE'); assert.equal(result.property.comps.length,2);
  assert.equal(result.property.valuation.price,60000); assert.deepEqual(result.sponsorAddress,address);
  assert.equal(result.evidence.filter((item)=>item.field.startsWith('comps[')).length,2);
});
test('wrong manufactured type and ambiguous complete addresses stop before AVM', async(t) => {
  const {client}=await clientFixture(t,[{body:[{...fixture.property,propertyType:'Single Family'}]}]);
  const result=await verifyOne(client,{id:'example',sponsorAddress:address});
  assert.equal(result.stopReason,'MANUFACTURED_REPRESENTATION_STOP'); assert.equal(client.metrics.apiCalls,1);
  const ambiguous=await verifyOne({get:async()=>({...record,body:[fixture.property,fixture.property]})},
    {id:'example',sponsorAddress:address});
  assert.equal(ambiguous.stopReason,'ADDRESS_IDENTITY_STOP');
});
test('AVM subject mismatch never becomes independent value for the deal', async(t) => {
  const {client}=await clientFixture(t,[{body:[fixture.property]},
    {body:{...fixture.avm,subjectProperty:{...fixture.avm.subjectProperty,addressLine1:'Other'}}}]);
  const result=await verifyOne(client,{id:'example',sponsorAddress:address});
  assert.equal(result.stopReason,'AVM_SUBJECT_IDENTITY_STOP'); assert.equal(result.property.valuation,null);
});
test('CSV quoting and missing values are explicit', () => {
  assert.equal(csv([{name:'A,"B"',value:null}],['name','value']), '"name","value"\r\n"A,""B""",""\r\n');
});
test('Fantasia confirmation preserves the sponsor address and controls exact lookup/AVM requests', async () => {
  const input=floridaSeed().properties.find((item)=>item.id==='fantasia');
  assert.equal(input.sponsorAddress.street,'8426 Fantasia Parkway');
  assert.equal(input.addressClaim.value.zip,null);
  assert.equal(input.addressConfirmation.suppliedBy,'Stan');
  const confirmed={...fixture.property,id:'confirmed-fantasia',addressLine1:'8426 Fantasia Park Way',
    city:'Riverview',state:'FL',zipCode:'33578',formattedAddress:'8426 Fantasia Park Way, Riverview, FL 33578'};
  const requests=[];
  const client={get:async(endpoint,params)=>{
    requests.push({endpoint,params});
    return {...record,body:endpoint==='/properties' ? [confirmed] : {...fixture.avm,subjectProperty:confirmed}};
  }};
  const result=await verifyOne(client,input);
  assert.equal(result.status,'INDEPENDENT_EVIDENCE_AVAILABLE');
  assert.equal(result.sponsorAddress.street,'8426 Fantasia Parkway');
  assert.equal(result.verificationAddress.zip,'33578');
  assert.ok(requests.every((request)=>request.params.address==='8426 Fantasia Park Way, Riverview, FL, 33578'));
  assert.equal(selectProperty(input.sponsorAddress,[confirmed]).status,'ADDRESS_AMBIGUOUS');
  assert.equal(selectProperty(input.addressConfirmation.address,[{...confirmed,zipCode:'00000'}]).status,'ADDRESS_AMBIGUOUS');
});
