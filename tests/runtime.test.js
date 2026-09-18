import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../src/workbench/api/router.js';
import {fixture} from '../src/workbench/model.js';
import {readFile} from 'node:fs/promises';
import {hash,readJson,resolve} from '../src/io/files.js';
import {createRuntime} from '../src/workbench/api/runtime.js';
import {loadFixture} from '../src/workbench/fixtureRepository.js';
import {memoryStore} from '../src/sources/rentcast/stores.js';
import {cacheLocation} from '../src/sources/rentcast/cache.js';
import {createLiveService} from '../src/workbench/api/live.js';
import {request as browserRequest,UNAVAILABLE} from '../apps/web/src/services/api.js';
import netlifyHandler from '../netlify/functions/api.js';

const request=(path,data,origin='https://pi.example')=>new Request(`https://pi.example/api/${path}`,data===undefined?{}:{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
test('Shared router: safe health, fixture gates, report capability, same-origin and routes',async()=>{
  const api=createApi({runtime:'netlify',loadFixture:fixture});
  const health=await (await api(request('health'))).json();
  assert.equal(health.runtime,'netlify');assert.equal(health.rentcastConfigured,false);assert.equal(health.pdfAvailable,false);
  for(const [id,state] of [['fantasia','READY_PROPERTY'],['bass','SOURCE_STOP'],['joyce','AMBIGUOUS']]){
    const response=await api(request('fixture',{id,mode:'property'}));assert.equal(response.status,200);
    const {model}=await response.json();assert.equal(model.state,state);assert.equal(model.cache.newProviderCalls,0);
  }
  assert.equal((await api(request('fixture',{id:'fantasia'},'https://evil.example'))).status,403);
  assert.equal((await api(request('unknown',{}))).status,404);
  assert.equal((await api(request('report',{}))).status,503);
});

const sample=await readJson('tests/fixtures/rentcast.json');
const address='10 Example Pkwy, Example City, FL 00000';
const secret='synthetic-private-rentcast-key';
const env={RENTCAST_API_KEY:secret,GOOGLE_MAPS_BROWSER_KEY:'synthetic-browser-map-key'};
function mocked({properties=[sample.property],avm,status=200}={}){
  let count=0;
  const body=avm??{...sample.avm,subjectProperty:{...sample.avm.subjectProperty,zipCode:'00000'},comparables:Array.from({length:15},(_,i)=>({...sample.avm.comparables[i%2],id:`mock-${i}`,latitude:i===0?null:28+i/1000,longitude:i===0?null:-81}))};
  const fetchImpl=async(url,options)=>{
    count++;assert.equal(url.origin,'https://api.rentcast.io');assert.equal(options.headers['X-Api-Key'],secret);assert.equal(options.redirect,'error');
    return new Response(JSON.stringify(status===200?(url.pathname.endsWith('/properties')?properties:body):{error:'Provider failure',secret}),{status});
  };
  const api=createRuntime({env,fetchImpl});
  return {api,count:()=>count,body};
}
async function post(api,path,data){const response=await api(request(path,data));return {status:response.status,...await response.json()};}
test('Packaged models match local shared models, including all six fixture/mode combinations',async()=>{
  for(const id of ['fantasia','bass','joyce'])for(const mode of ['property','deal'])assert.deepEqual(await loadFixture(id,mode),await fixture(id,mode));
});
test('Netlify entry routes canonical and rewritten paths through shared JSON health',async()=>{
  for(const path of ['/api/health','/.netlify/functions/api/health']){
    const res=await netlifyHandler(new Request('https://pi.example'+path));assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'application/json');assert.equal((await res.json()).runtime,'netlify');
  }
});
test('Source controlled API redirect precedes SPA fallback and function imports no PDF renderer',async()=>{
  const toml=await readFile(resolve('netlify.toml'),'utf8');assert.ok(toml.indexOf('from = "/api/*"')<toml.indexOf('from = "/*"'));
  assert.match(toml,/node_bundler = "esbuild"/);assert.match(toml,/publish = "apps\/web\/dist"/);
  const entry=await readFile(resolve('netlify/functions/api.js'),'utf8');assert.match(entry,/createRuntime/);assert.doesNotMatch(entry,/reports\/pdf|playwright|readFile|loadEnvFile/);
  const local=await readFile(resolve('src/workbench/server.js'),'utf8');assert.match(local,/createRuntime/);assert.doesNotMatch(local,/manualDeal\(/);
});
test('Fixtures and exact cached lookup never contact provider; Bass and Joyce confirmation preserves gates',async()=>{
  const m=mocked();
  for(const id of ['fantasia','bass','joyce'])assert.equal((await post(m.api,'fixture',{id,mode:'property'})).status,200);
  const exact=await post(m.api,'properties/analyze',{address:'8426 Fantasia Park Way, Riverview, FL 33578'});assert.equal(exact.model.comps.length,15);
  for(const [address,state] of [['95 Bass Circle','SOURCE_STOP'],['131 Joyce Place','AMBIGUOUS']]){
    const result=await post(m.api,'resolve',{address,mode:'property'});assert.equal(result.state,'AMBIGUOUS');
    const selected=await post(m.api,'confirm',{confirmationId:result.confirmationId,id:result.candidates[0].id});assert.equal(selected.model.state,state);
  }
  assert.equal(m.count(),0);
});
test('Mock live retrieval shares all-comps model, timestamp, nonverified provenance and no automatic deal',async()=>{
  const m=mocked(),result=await post(m.api,'properties/analyze',{address});assert.equal(result.status,200);
  const model=result.model;assert.equal(m.count(),2);assert.equal(model.state,'READY_PROPERTY');assert.equal(model.analysis,null);assert.deepEqual(model.claims,[]);
  assert.equal(model.comps.length,15);assert.equal(model.comps[0].mappable,false);assert.equal(model.comps[1].badge,'Inactive');assert.ok(model.comps.every(c=>c.tenure==='Land tenure unknown'));
  assert.ok(model.provenance.every(p=>p.status==='INDEPENDENT_ONLY'));assert.ok(model.provenance.every(p=>Number.isFinite(Date.parse(p.retrievedAt))));
  assert.equal(model.cache.durable,false);assert.match(model.cache.limitation,/not durable/);assert.equal(model.cache.source,'Live provider retrieval');
  assert.equal(model.digest,hash(JSON.stringify({...model,digest:undefined})));
  assert.equal(model.property.lotSize,null);assert.equal(model.property.bathrooms,0);
  assert.ok(!JSON.stringify(result).includes(secret));assert.ok(!JSON.stringify(result).includes('X-Api-Key'));
});
test('In-flight dedupe, cache preference and acknowledged refresh retain old evidence',async()=>{
  const m=mocked();const [a,b]=await Promise.all([post(m.api,'properties/analyze',{address}),post(m.api,'properties/analyze',{address})]);
  assert.equal(m.count(),2);assert.equal(a.model.digest,b.model.digest);
  const old=JSON.stringify(a.model);const cached=await post(m.api,'properties/analyze',{address});assert.equal(m.count(),2);assert.equal(cached.model.cache.source,'Cached evidence');assert.equal(cached.model.cache.newProviderCalls,0);
  assert.equal((await post(m.api,'properties/analyze',{address,refresh:true})).status,400);assert.equal(m.count(),2);
  const refreshed=await post(m.api,'properties/analyze',{address,refresh:true,acknowledgeQuota:true});assert.equal(m.count(),4);assert.notDeepEqual(refreshed.model.cache.retrievedAt,a.model.cache.retrievedAt);assert.equal(JSON.stringify(a.model),old);
});
test('Multiple candidates require explicit opaque-token confirmation, never first-result guess',async()=>{
  const m=mocked({properties:[sample.property,{...sample.property,id:'other'}]});
  const pending=await post(m.api,'properties/analyze',{address});assert.equal(pending.state,'AMBIGUOUS');assert.equal(m.count(),1);assert.equal(pending.model,undefined);assert.equal(pending.candidates.length,2);
  assert.deepEqual(Object.keys(pending.candidates[0]).sort(),['address','id','propertyType']);
  assert.equal((await post(m.api,'confirm',{confirmationId:pending.confirmationId,id:'invented'})).status,400);
  const chosen=await post(m.api,'confirm',{confirmationId:pending.confirmationId,id:pending.candidates[0].id});assert.equal(chosen.model.state,'READY_PROPERTY');assert.equal(m.count(),2);
  assert.ok(chosen.model.provenance.some(p=>p.status==='IDENTITY_CONFIRMED_NOT_VERIFIED'));
  assert.equal((await post(m.api,'confirm',{confirmationId:pending.confirmationId,id:pending.candidates[0].id})).status,400);
});
test('Wrong identity requires confirmation; missing representation and unexpected units cannot force AVM',async()=>{
  const mismatch=mocked({properties:[{...sample.property,city:'Other City'}]});assert.equal((await post(mismatch.api,'properties/analyze',{address})).state,'AMBIGUOUS');assert.equal(mismatch.count(),1);
  for(const raw of [{...sample.property,propertyType:null},{...sample.property,squareFootage:null}]){
    const m=mocked({properties:[raw]}),result=await post(m.api,'properties/analyze',{address});assert.equal(result.model.state,'SOURCE_STOP');assert.equal(m.count(),1);
    assert.equal((await post(m.api,'deal/start',{sessionId:result.sessionId})).status,409);
  }
  const unit=mocked({properties:[{...sample.property,addressLine2:'Unit 2'}]});const pending=await post(unit.api,'properties/analyze',{address});
  const result=await post(unit.api,'confirm',{confirmationId:pending.confirmationId,id:pending.candidates[0].id});assert.equal(result.model.state,'SOURCE_STOP');assert.equal(unit.count(),1);
});
test('Nonmanufactured live property must retain matching AVM type; Florida defaults remain manufactured',async()=>{
  const p={...sample.property,propertyType:'Single Family'},avm={...sample.avm,subjectProperty:{...sample.avm.subjectProperty,zipCode:'00000',propertyType:'Single Family'}};
  const good=mocked({properties:[p],avm});assert.equal((await post(good.api,'properties/analyze',{address})).model.state,'READY_PROPERTY');
  const bad=mocked({properties:[p]});assert.equal((await post(bad.api,'properties/analyze',{address})).model.state,'SOURCE_STOP');
});
test('Property to manual deal invokes existing engine, leaves unknowns null and fixture bytes unchanged',async()=>{
  const m=mocked(),result=await post(m.api,'properties/analyze',{address});
  const draft=await post(m.api,'deal/start',{sessionId:result.sessionId});assert.equal(draft.model.analysis,null);assert.deepEqual(draft.model.claims,[]);assert.match(draft.model.notes.join(' '),/Nonpersistent/);
  const claims={origin:'ANALYST_ENTERED',acquisition:160000,repairs:10000,sale:279000,rent:3000,commission:5000,escrow:2000,holdDays:90};
  const deal=await post(m.api,'deal',{sessionId:draft.sessionId,claims});assert.equal(deal.model.analysis.base.modeledProfit,99000);assert.equal(deal.model.analysis.base.fullyBurdenedProfit,null);assert.ok(deal.model.analysis.base.excludedUnknownCosts.length>0);
  assert.ok(deal.model.claims.every(c=>c.status==='ANALYST_ENTERED'));assert.equal(deal.model.comps.length,15);assert.equal(m.count(),2);
});
test('Cold cloud instance reconstructs allowlisted fixture evidence for manual deal without provider calls',async()=>{
  const a=createRuntime(),first=await post(a,'fixture',{id:'fantasia',mode:'property'});
  const draft=await post(createRuntime(),'deal/start',{sessionId:first.sessionId});assert.equal(draft.model.state,'READY_DEAL');assert.equal(draft.model.analysis,null);
  const claims={origin:'ANALYST_ENTERED',acquisition:160000,repairs:10000,sale:279000,rent:3000,commission:5000,escrow:2000,holdDays:90};
  const deal=await post(createRuntime(),'deal',{sessionId:draft.sessionId,claims});assert.equal(deal.model.analysis.base.modeledProfit,99000);
  assert.equal((await post(createRuntime(),'deal/start',{sessionId:'fixture:../../.env:property'})).status,410);
  assert.equal((await post(createRuntime(),'deal/start',{sessionId:'lost-live-session'})).status,410);
  const pending=await post(createRuntime(),'resolve',{address:'95 Bass Circle',mode:'property'});
  const confirmed=await post(createRuntime(),'confirm',{confirmationId:pending.confirmationId,id:pending.candidates[0].id});assert.equal(confirmed.model.state,'SOURCE_STOP');
});
test('No live key keeps fixture use available; health and map config never expose server secrets',async()=>{
  const api=createRuntime({env:{}});assert.equal((await post(api,'fixture',{id:'fantasia'})).status,200);assert.equal((await post(api,'properties/analyze',{address})).status,503);
  const m=mocked();const health=await (await m.api(request('health'))).json();assert.equal(health.rentcastConfigured,true);assert.ok(!JSON.stringify(health).includes(secret));
  const maps=await(await m.api(request('maps/config'))).json();assert.equal(maps.browserKey,env.GOOGLE_MAPS_BROWSER_KEY);assert.ok(!JSON.stringify(maps).includes(secret));assert.equal(m.count(),0);
});
test('HTTP security: oversize bytes, JSON only, URL/module/path injection, origin and method allowlists',async()=>{
  const m=mocked();
  for(const data of [{address:'https://evil.example'}, {address,url:'https://evil.example'}, {address,file:'../../.env'},{address,module:'node:child_process'}])assert.equal((await post(m.api,'properties/analyze',data)).status,400);
  assert.equal((await post(m.api,'properties/analyze',{address:'x'.repeat(17000)})).status,413);
  assert.equal((await post(m.api,'properties/analyze',{address:'界'.repeat(6000)})).status,413);
  const base='https://pi.example/api/properties/analyze';
  assert.equal((await m.api(new Request(base,{method:'POST',headers:{Origin:'https://pi.example','Content-Type':'text/plain'},body:'{}'}))).status,415);
  assert.equal((await m.api(new Request(base,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}))).status,403);
  assert.equal((await m.api(new Request(base,{method:'OPTIONS'}))).status,405);
  assert.equal((await m.api(request('properties/analyze'))).status,405);assert.equal(m.count(),0);
});
test('Rate limit/auth failures cleanly stop, never retry or leak response; cooldown prevents immediate repeated calls',async()=>{
  for(const [status,code] of [[429,'RATE_LIMIT_STOP'],[401,'AUTHENTICATION_STOP'],[402,'QUOTA_STOP']]){
    const m=mocked({status}),result=await post(m.api,'properties/analyze',{address});assert.equal(result.error,code);assert.equal(result.status,status===429?429:400);assert.equal(m.count(),1);assert.ok(!JSON.stringify(result).includes(secret));
    if(status===429){await post(m.api,'properties/analyze',{address});assert.equal(m.count(),1);}
  }
});
test('Memory store get/put/has, immutable return values, bounded cache and clean cold instance',async()=>{
  const store=memoryStore({limit:1}),location=cacheLocation('/properties',{address});assert.equal(await store.has(location),false);
  const one=await store.put(location,{httpStatus:200,retrievedAt:'2026-09-18T00:00:00Z',body:[sample.property]});assert.equal(await store.has(location),true);
  one.body[0].id='tampered';assert.notEqual((await store.get(location)).body[0].id,'tampered');
  await store.put(cacheLocation('/properties',{address:'other'}),{httpStatus:200,retrievedAt:'2026-09-18T00:00:01Z',body:[]});assert.equal(await store.has(location),false);assert.equal(store.durable,false);assert.equal(await memoryStore().has(location),false);
});
test('HTML, empty, invalid JSON, error paths and network errors render sanitized API-unavailable messages',async()=>{
  const saved=globalThis.fetch;
  try{
    for(const [body,type,status] of [['<!DOCTYPE html>private environment path','text/html',200],['','application/json',200],['bad parser payload','application/json',404]]){
      globalThis.fetch=async()=>new Response(body,{status,headers:{'Content-Type':type}});
      await assert.rejects(()=>browserRequest('health'),e=>e.message.startsWith(UNAVAILABLE)&&!e.message.includes('Unexpected token')&&!e.message.includes('private environment'));
    }
    globalThis.fetch=async()=>new Response(JSON.stringify({error:'C:/secret/path'}),{status:500,headers:{'Content-Type':'application/json'}});await assert.rejects(()=>browserRequest('health'),e=>!e.message.includes('C:/'));
    globalThis.fetch=async()=>{throw new Error(secret);};await assert.rejects(()=>browserRequest('health'),e=>e.message===UNAVAILABLE);
  }finally{globalThis.fetch=saved;}
});
test('Sprint 3.2 baseline protects all original evidence and analytical engine bytes',async()=>{
  const manifest=await readJson('data/validation/sprint3_2-protected-inputs.json');
  for(const item of manifest.files)assert.equal(hash(await readFile(resolve(item.file))),item.sha256,item.file);
});
