import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createAccessControl,ROLES} from '../src/auth/access-control.js';
import {createFirebaseSessionService} from '../src/auth/firebase-session.js';
import {createAutomaticPropertyResearch} from '../src/investment-workspace/automatic-property-research.js';
import {unavailableAuthenticatedResearch} from '../src/investment-workspace/authenticated-research-config.js';
import {toPreliminaryEvidence} from '../src/investment-workspace/property-research.js';
import {createResearchClientV2_3B,validateResearchRequestV2_3B} from '../src/sources/rentcast/research-client-v2-3b.js';
import {memoryStore} from '../src/sources/rentcast/stores.js';

const NOW='2026-10-16T20:00:00.000Z',projectId='pi-v2-3b-test',uid='admin-v23b',organizationId='property-intelligence-local',address={street:'21950 Arosa Road',city:'Tehachapi',state:'CA',zip:'93561'};
const subject={id:'rc-arosa-1',assessorID:'123-456-78',formattedAddress:'21950 Arosa Rd, Tehachapi, CA 93561',addressLine1:'21950 Arosa Rd',city:'Tehachapi',state:'CA',zipCode:'93561',county:'Kern',propertyType:'Single Family',bedrooms:3,bathrooms:2,squareFootage:1452,lotSize:43560,yearBuilt:1987,latitude:35.142,longitude:-118.449};
const valuation={price:245000,priceRangeLow:225000,priceRangeHigh:265000,asOf:'2026-10-16',subjectProperty:subject,comparables:[{id:'listing-1',formattedAddress:'22000 Example Rd, Tehachapi, CA 93561',propertyType:'Single Family',status:'Active',price:255000,bedrooms:3,bathrooms:2,squareFootage:1500,latitude:35.145,longitude:-118.45}]};
const sold=[{id:'sold-1',formattedAddress:'21800 Sample Rd, Tehachapi, CA 93561',addressLine1:'21800 Sample Rd',city:'Tehachapi',state:'CA',zipCode:'93561',county:'Kern',propertyType:'Single Family',bedrooms:3,bathrooms:2,squareFootage:1500,latitude:35.146,longitude:-118.447,lastSaleDate:'2026-08-01',lastSalePrice:238000,history:{'2026-08-01':{event:'Sale',date:'2026-08-01',price:238000}}}];
const user={uid,role:ROLES.ADMINISTRATOR,emailVerified:true,providerResearchAllowed:true,organizationId,authenticatedAt:NOW,sessionExpiresAt:'2099-10-17T00:00:00.000Z'};
const operationalEvidence={accountActive:true,propertyRecordsEntitled:true,valuationEntitled:true,soldSearchEntitled:true,rightsConfirmed:true,retentionPermitted:true,remainingRequests:27,overageCostCents:20,endpointFeeMaxCents:0,taxAndOtherFeeMaxCents:0,observedAt:NOW};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

async function fixture({fetchImpl,limits={},evidence:seed,authentication:authenticationOverride,store:storeOverride,directory:directoryOverride}={}){
  const retained=toPreliminaryEvidence(subject,{retrievedAt:'2026-10-16T17:55:00.000Z',bodyHash:'a'.repeat(64),rawResponseRef:'memory://retained/arosa'}),state=seed??{properties:[retained.property],propertyDetails:[retained.detail]};
  let current=structuredClone(state),reauthentications=0;
  const calls=[],store=storeOverride??memoryStore(),client=createResearchClientV2_3B({apiKey:'synthetic-v23b-key',baseUrl:'https://api.rentcast.io/v1',timeoutMs:100,maxRetries:0,maxCalls:3,delayMs:0},{store,cachePrefix:'data/raw/rentcast/property-research-v2-3',clock:()=>NOW,fetchImpl:fetchImpl??(async url=>{calls.push(url);return url.pathname.endsWith('/avm/value')?response(valuation):response(sold);})}),accessControl=createAccessControl({verifySession:request=>request.user}),authentication=authenticationOverride??{verifyRecentIdToken:async(token,session)=>{reauthentications++;assert.equal(token,'fresh-id-token');assert.equal(session.uid,uid);return user;}},directory=directoryOverride??await mkdtemp(path.join(tmpdir(),'pi-v2-3b-'));
  const service=createAutomaticPropertyResearch({accessControl,authentication,client,store,ledgerDirectory:directory,operationalEvidence:structuredClone(operationalEvidence),organizationId,clock:()=>new Date(NOW),limits:{requestsPerUserPerDay:20,requestsPerProviderPerDay:20,maximumRequestsPerProperty:3,maximumEstimatedCostPerPropertyCents:100,monthlyEstimatedSpendCents:2000,...limits},evidenceProvider:()=>current,onEvidence:({property,detail})=>{current={...current,properties:current.properties.some(item=>item.ref===property.ref)?current.properties.map(item=>item.ref===property.ref?property:item):[...current.properties,property],propertyDetails:detail?(current.propertyDetails.some(item=>item.subjectRef===property.ref)?current.propertyDetails.map(item=>item.subjectRef===property.ref?detail:item):[...current.propertyDetails,detail]):current.propertyDetails};}});
  return {service,request:{user},calls,client,directory,store,current:()=>current,reauthentications:()=>reauthentications};
}

test('Arosa reuses retained Property Records and performs valuation and sold research under one authenticated policy',async()=>{
  const f=await fixture(),capability=await f.service.capability(f.request);
  assert.equal(capability.workflow,'AUTHENTICATED_RESEARCH_V1');assert.equal(capability.enabled,true);assert.equal(capability.maximumRequests,3);assert.equal(capability.maximumEstimatedCostCents,100);
  const result=await f.service.research(f.request,address);
  assert.equal(f.reauthentications(),0);assert.equal(result.status,'COMPLETE');assert.equal(result.requestsUsed,2);assert.equal(result.estimatedSpendingCents,40);assert.deepEqual(result.operations.map(item=>item.status),['Available','Retrieved','Retrieved']);
  assert.equal(f.calls.length,2);assert.ok(f.calls[0].pathname.endsWith('/avm/value'));assert.ok(f.calls[1].pathname.endsWith('/properties'));assert.equal(f.client.metrics.retries,0);
  const enriched=f.current().properties[0];assert.deepEqual(enriched.avm,{price:245000,low:225000,high:265000});assert.equal(enriched.sales.length,1);assert.equal(enriched.sales[0].salePrice,238000);assert.equal(enriched.listings[0].priceMeaning,'Provider comparable listing price; not a closed-sale price');assert.equal(enriched.subjectKind,'PRELIMINARY_RESEARCH');
  const repeat=await f.service.research(f.request,address);assert.equal(repeat.requestsUsed,0);assert.ok(repeat.operations.every(item=>item.status==='Available'));assert.equal(f.calls.length,2);
});

test('a failed valuation is preserved as unavailable while sold research succeeds without retry',async()=>{
  const f=await fixture({fetchImpl:async url=>url.pathname.endsWith('/avm/value')?response({error:'synthetic'},500):response(sold)}),result=await f.service.research(f.request,address);
  assert.equal(result.status,'PARTIAL');assert.equal(result.requestsUsed,2);assert.equal(result.operations.find(item=>item.key==='valuation').status,'Unavailable');assert.equal(result.operations.find(item=>item.key==='comparableSales').status,'Retrieved');assert.equal(f.client.metrics.retries,0);assert.equal(f.current().properties[0].sales.length,1);assert.equal(f.current().properties[0].avm.price,null);
});

test('suffix-equivalent cached research is restored before duplicate blocking after a restart',async()=>{
  const sharedStore=memoryStore(),directory=await mkdtemp(path.join(tmpdir(),'pi-v2-3b-cache-')),empty={properties:[],propertyDetails:[]},abbreviated={street:'21950 Arosa Rd',city:'Tehachapi',state:'CA',zip:'93561'};
  const provider=async url=>url.pathname.endsWith('/avm/value')?response(valuation):url.searchParams.has('radius')?response(sold):response([subject]);
  const first=await fixture({store:sharedStore,directory,evidence:empty,fetchImpl:provider}),acquired=await first.service.research(first.request,abbreviated);
  assert.equal(acquired.status,'COMPLETE');assert.equal(acquired.requestsUsed,3);assert.equal(first.client.metrics.apiCalls,3);
  const second=await fixture({store:sharedStore,directory,evidence:empty,fetchImpl:async()=>{throw new Error('Provider must not be called when compatible cache exists.');}});second.service.operationalEvidence.accountEvidenceCurrent=false;const capability=await second.service.capability(second.request);assert.equal(capability.enabled,true);assert.equal(capability.liveProviderEnabled,false);assert.equal(capability.cacheRestoreOnly,true);const restored=await second.service.research(second.request,address);
  assert.equal(restored.status,'COMPLETE');assert.equal(restored.requestsUsed,0);assert.equal(restored.estimatedSpendingCents,0);assert.equal(second.client.metrics.apiCalls,0);assert.ok(restored.property);assert.ok(restored.operations.every(item=>item.status==='Available'&&item.source==='Authorized provider cache'));
  const catalog=await second.service.localEvidence(second.request);assert.equal(catalog.entries.length,1);assert.equal(catalog.entries[0].address,'21950 Arosa Rd, Tehachapi, CA 93561');assert.deepEqual(catalog.entries[0].evidence,{propertyRecords:true,valuation:true,comparableSales:true});
  const removed=await second.service.removeLocalEvidence(second.request,address);assert.equal(removed.records,3);assert.equal((await second.service.localEvidence(second.request)).entries.length,0);
});

test('quota, organization, authorization reuse and account controls fail closed',async()=>{
  const quota=await fixture({limits:{requestsPerProviderPerDay:1}});await assert.rejects(quota.service.research(quota.request,address),/QUOTA_EXCEEDED/);assert.equal(quota.calls.length,0);
  const wrongOrg=await fixture();await assert.rejects(wrongOrg.service.research({user:{...user,organizationId:'other'}},address),/ORGANIZATION_NOT_AUTHORIZED/);
  const inactive=await fixture();inactive.service.operationalEvidence.accountActive=false;const capability=await inactive.service.capability(inactive.request);assert.equal(capability.enabled,false);assert.deepEqual(capability.blockers,['CURRENT_ACCOUNT_STATUS_REQUIRED']);
  const expired=await fixture();expired.service.operationalEvidence.accountEvidenceCurrent=false;const expiredCapability=await expired.service.capability(expired.request);assert.deepEqual(expiredCapability.blockers,['CURRENT_ACCOUNT_EVIDENCE_EXPIRED']);assert.equal(expiredCapability.enabled,true);assert.equal(expiredCapability.cacheRestoreOnly,true);await assert.rejects(expired.service.research(expired.request,address),/CURRENT_ACCOUNT_EVIDENCE_EXPIRED/);assert.equal(expired.calls.length,0);
});

test('missing account configuration stays default-deny with one actionable workflow blocker',async()=>{
  const service=unavailableAuthenticatedResearch();assert.deepEqual((await service.capability()).blockers,['PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED']);assert.throws(()=>service.research({},address),/PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED/);
});

test('versioned provider client admits only the bounded V2.3B request contracts',async()=>{
  assert.equal(validateResearchRequestV2_3B('/properties',{address:'21950 Arosa Rd, Tehachapi, CA 93561'}),true);
  assert.equal(validateResearchRequestV2_3B('/avm/value',{address:'21950 Arosa Rd, Tehachapi, CA 93561',lookupSubjectAttributes:true,compCount:15,maxRadius:2,daysOld:180}),true);
  assert.equal(validateResearchRequestV2_3B('/properties',{address:'21950 Arosa Rd, Tehachapi, CA 93561',radius:2,saleDateRange:365,propertyType:'Single Family',limit:50,offset:0}),true);
  assert.equal(validateResearchRequestV2_3B('/properties',{address:'21950 Arosa Rd, Tehachapi, CA 93561',radius:20,saleDateRange:365,propertyType:'Single Family',limit:50,offset:0,includeTotalCount:true}),false);
  assert.equal(validateResearchRequestV2_3B('/listings/sale',{address:'21950 Arosa Rd, Tehachapi, CA 93561'}),false);
});

test('provider client distinguishes a bounded timeout from a network failure without retrying',async()=>{
  const client=createResearchClientV2_3B({apiKey:'synthetic-v23b-key',baseUrl:'https://api.rentcast.io/v1',timeoutMs:5,maxRetries:0,maxCalls:1,delayMs:0},{store:memoryStore(),fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))});
  await assert.rejects(client.get('/properties',{address:'40924 173rd St E, Lancaster, CA, 93535',radius:2,saleDateRange:365,propertyType:'Single Family',limit:50,offset:0}),error=>error.code==='TIMEOUT_STOP');
  assert.equal(client.metrics.apiCalls,1);assert.equal(client.metrics.retries,0);assert.deepEqual(client.metrics.events,[{endpoint:'/properties',status:'TIMEOUT_STOP',attempt:0}]);
});

test('unknown property stops dependent operations when Property Records fails',async()=>{
  const f=await fixture({evidence:{properties:[],propertyDetails:[]},fetchImpl:async()=>response([],200)}),result=await f.service.research(f.request,address);assert.equal(result.requestsUsed,1);assert.equal(result.property,null);assert.deepEqual(result.operations.map(item=>item.status),['Unavailable','Unavailable','Unavailable']);assert.equal(f.client.metrics.apiCalls,1);
});

test('Firebase recent-login verifier binds project user role organization and auth_time',async()=>{
  let decoded={uid,sub:uid,aud:projectId,iss:`https://securetoken.google.com/${projectId}`,role:ROLES.ADMINISTRATOR,piProviderResearch:true,piOrganizationId:organizationId,email_verified:true,auth_time:Math.floor(Date.parse(NOW)/1000)-30,exp:Math.floor(Date.parse(NOW)/1000)+3600};
  const service=createFirebaseSessionService({adminAuth:{verifyIdToken:async()=>decoded,verifySessionCookie:async()=>({...decoded,iss:`https://session.firebase.google.com/${projectId}`}),createSessionCookie:async()=> 'session'},expectedProjectId:projectId,initialAdministratorUid:uid,expectedOrganizationId:organizationId,publicConfig:{projectId},clock:()=>new Date(NOW)}),session={...user};
  await assert.doesNotReject(service.verifyRecentIdToken('fresh',session));decoded={...decoded,auth_time:Math.floor(Date.parse(NOW)/1000)-601};await assert.rejects(service.verifyRecentIdToken('stale',session),/RECENT_FIREBASE_LOGIN_REQUIRED/);decoded={...decoded,uid:'different',sub:'different',auth_time:Math.floor(Date.parse(NOW)/1000)};await assert.rejects(service.verifyRecentIdToken('wrong-user',session),/REAUTHENTICATION_IDENTITY_MISMATCH/);
});

test('browser implementation uses one authenticated quote and approval without password reentry',async()=>{
  const auth=await readFile('apps/web/src/auth/AuthenticationGate.jsx','utf8'),discovery=await readFile('apps/web/src/features/discovery/Discovery.jsx','utf8'),approval=await readFile('apps/web/src/features/property-research/paid-research.js','utf8'),toast=await readFile('apps/web/src/components/StatusToast.jsx','utf8'),workspace=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8');
  assert.doesNotMatch(auth,/reauthenticateWithCredential/);assert.doesNotMatch(discovery,/passwordRef|researchPassword|Authorize and Run Research|property-research\/(?:plan|authorize|run|preview)|request-bound authorization/);assert.match(approval,/property-research\/quote/);assert.match(approval,/property-research\/research/);assert.match(approval,/Approve & Research/);assert.match(approval,/PROVIDER_TIMEOUT/);assert.match(approval,/No automatic retry occurred/);assert.match(discovery,/property-research\/local-evidence/);assert.match(discovery,/pi-guided-address-draft-v1/);assert.match(discovery,/Recent Research/);assert.match(discovery,/research-progress-grid/);assert.match(discovery,/Restore Existing Research/);assert.match(discovery,/Cached research is ready and can be restored without a provider request/);assert.match(discovery,/scrollIntoView\(\{behavior:'smooth',block:'start'\}\)/);assert.match(discovery,/opened from.*No provider request was made/);assert.match(toast,/role="status"/);assert.match(toast,/aria-live="polite"/);assert.match(workspace,/approveAndRunProviderResearch/);assert.match(workspace,/Find Recent Sold Properties/);assert.doesNotMatch(workspace,/request-bound authorization|Live refresh disabled|conservative exposure \$0\.20/);
});
