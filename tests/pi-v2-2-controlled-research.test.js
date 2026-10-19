import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createAccessControl,ROLES} from '../src/auth/access-control.js';
import {createPropertyResearchService,researchAddressKey,toPreliminaryEvidence} from '../src/investment-workspace/property-research.js';
import {addRetainedPropertyResearch} from '../src/investment-workspace/retained-property-research.js';
import {createClient} from '../src/sources/rentcast/client.js';
import {configuration} from '../src/sources/rentcast/config.js';
import {memoryStore} from '../src/sources/rentcast/stores.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {searchRetainedAddress} from '../apps/web/src/features/property-search/address-identity.js';
import {loadLocalResearchConfiguration} from '../src/investment-workspace/live-research-config.js';

const NOW='2026-10-16T17:00:00.000Z',address={street:'21950 Arosa Road',city:'Tehachapi',state:'CA',zip:'93561'};
const raw={id:'rc-arosa-1',formattedAddress:'21950 Arosa Rd, Tehachapi, CA 93561',addressLine1:'21950 Arosa Rd',city:'Tehachapi',state:'CA',zipCode:'93561',county:'Kern',propertyType:'Single Family',bedrooms:3,bathrooms:2,squareFootage:1640,lotSize:43560,yearBuilt:1987,latitude:35.1,longitude:-118.4};
const user=(uid='analyst-1',role=ROLES.ANALYST)=>({uid,role,emailVerified:true,sessionExpiresAt:'2099-01-01T00:00:00.000Z'});
const access=createAccessControl({verifySession:async request=>request.user});
const operationalEvidence={accountActive:true,propertyRecordsEntitled:true,rightsConfirmed:true,retentionPermitted:true,remainingRequests:40,overageCostCents:20,endpointFeeMaxCents:0,taxAndOtherFeeMaxCents:0,observedAt:NOW};
const authorization=(uid='analyst-1')=>({id:'auth-arosa-2026-10-16',provider:'RentCast',endpoint:'/properties',userId:uid,addressKey:researchAddressKey(address),executionDate:'2026-10-16',maximumRequests:1,maximumEstimatedCostCents:20,automaticRetries:0,additionalEnrichment:false,durablePropertyCreation:false,approvedAt:'2026-10-16T16:55:00.000Z',expiresAt:'2026-10-16T18:00:00.000Z'});
const response=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...headers}});

async function fixture({fetchImpl=async()=>response([raw]),limits={},auth=authorization(),sessionAccess=access}={}){
  const directory=await mkdtemp(path.join(tmpdir(),'pi-v2-2-')),store=memoryStore(),client=createClient({apiKey:'synthetic-key-12345',baseUrl:'https://api.rentcast.io/v1',timeoutMs:20,maxRetries:0,maxCalls:20,delayMs:0},{fetchImpl,store,clock:()=>NOW}),added=[];
  const service=createPropertyResearchService({enabled:true,accessControl:sessionAccess,client,store,ledgerDirectory:directory,operationalEvidence:structuredClone(operationalEvidence),authorization:auth,clock:()=>new Date(NOW),secret:Buffer.alloc(32,7),limits:{requestsPerUserPerDay:3,requestsPerProviderPerDay:10,maximumEstimatedCostPerRequestCents:20,monthlyEstimatedSpendCents:100,...limits},onEvidence:value=>added.push(value)});
  return {service,directory,client,added,request:{user:user()}};
}

test('authorized address-bound lookup requires preview and explicit confirmation, transmits once and creates only preliminary evidence',async()=>{
  let calls=0;const f=await fixture({fetchImpl:async()=>{calls++;return response([raw]);}}),preview=await f.service.preview(f.request,address);
  assert.equal(preview.expectedRequests,1);assert.equal(preview.estimatedCostCents,20);assert.equal(preview.address.street,address.street);
  await assert.rejects(f.service.execute(f.request,{address,confirmationToken:preview.confirmationToken,confirmed:false}),/EXPLICIT_CONFIRMATION_REQUIRED/);
  const result=await f.service.execute(f.request,{address,confirmationToken:preview.confirmationToken,confirmed:true});
  assert.equal(calls,1);assert.equal(result.status,'EXACT_SUPPORTED_MATCH');assert.equal(result.requestsTransmitted,1);assert.equal(result.property.subjectKind,'PRELIMINARY_RESEARCH');assert.match(result.identityBoundary,/not verified/i);assert.equal(f.added.length,1);
  const cachedPreview=await f.service.preview(f.request,address);assert.equal(cachedPreview.expectedRequests,0);assert.equal(cachedPreview.estimatedCostCents,0);const cachedResult=await f.service.execute(f.request,{address,confirmationToken:cachedPreview.confirmationToken,confirmed:true});assert.equal(cachedResult.cacheHit,true);assert.equal(cachedResult.requestsTransmitted,0);assert.equal(calls,1);
  const rows=(await readFile(path.join(f.directory,'usage.jsonl'),'utf8')).trim().split(/\r?\n/).map(JSON.parse);assert.equal(rows.filter(row=>row.kind==='RESERVATION').length,1);assert.equal(rows[0].estimatedCostCents,20);assert.equal(rows[0].actualCostCents,null);
});

test('authorization, role, altered address and cross-user boundaries fail before transmission',async()=>{
  let calls=0;const f=await fixture({fetchImpl:async()=>{calls++;return response([raw]);}}),preview=await f.service.preview(f.request,address);
  await assert.rejects(f.service.execute({user:user('viewer-1',ROLES.VIEWER)},{address,confirmationToken:preview.confirmationToken,confirmed:true}),/AUTHORIZATION_FAILURE/);
  await assert.rejects(f.service.execute({user:user('analyst-2')},{address,confirmationToken:preview.confirmationToken,confirmed:true}),/AUTHORIZATION_FAILURE/);
  await assert.rejects(f.service.execute(f.request,{address:{...address,street:'21952 Arosa Road'},confirmationToken:preview.confirmationToken,confirmed:true}),/CONFIRMATION_ADDRESS_CHANGED/);
  assert.equal(calls,0);
});

test('request authorization must contain the exact execution and scope restrictions',async()=>{
  for(const change of [
    {executionDate:'2026-10-15'},
    {maximumEstimatedCostCents:21},
    {automaticRetries:1},
    {additionalEnrichment:true},
    {durablePropertyCreation:true}
  ]){
    let calls=0;const f=await fixture({auth:{...authorization(),...change},fetchImpl:async()=>{calls++;return response([raw]);}});
    await assert.rejects(f.service.preview(f.request,address),/REQUEST_AUTHORIZATION_REQUIRED/);
    assert.equal(calls,0);
  }
});

test('missing credentials and disabled operational prerequisites fail closed',async()=>{
  assert.throws(()=>configuration({}),/CONFIGURATION_STOP/);
  const f=await fixture();f.service.operationalEvidence.accountActive=false;
  const capability=await f.service.capability(f.request);assert.equal(capability.enabled,false);assert.ok(capability.blockers.includes('CURRENT_ACCOUNT_STATUS_REQUIRED'));
  await assert.rejects(f.service.preview(f.request,address),/CURRENT_ACCOUNT_STATUS_REQUIRED/);
});

test('duplicate token and duplicate attempted address cannot transmit twice',async()=>{
  let calls=0;const failing=await fixture({fetchImpl:async()=>{calls++;throw new Error('synthetic network failure');}}),first=await failing.service.preview(failing.request,address);
  await assert.rejects(failing.service.execute(failing.request,{address,confirmationToken:first.confirmationToken,confirmed:true}),/PROVIDER_ERROR/);
  await assert.rejects(failing.service.execute(failing.request,{address,confirmationToken:first.confirmationToken,confirmed:true}),/CONFIRMATION_EXPIRED_OR_USED/);
  const second=await failing.service.preview(failing.request,address);await assert.rejects(failing.service.execute(failing.request,{address,confirmationToken:second.confirmationToken,confirmed:true}),/DUPLICATE_REQUEST_BLOCKED/);assert.equal(calls,1);
});

test('timeout is bounded with zero automatic retries',async()=>{
  let calls=0;const f=await fixture({fetchImpl:async(_url,{signal})=>{calls++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}}),preview=await f.service.preview(f.request,address);
  await assert.rejects(f.service.execute(f.request,{address,confirmationToken:preview.confirmationToken,confirmed:true}),/PROVIDER_ERROR/);assert.equal(calls,1);assert.equal(f.client.metrics.retries,0);
});

test('daily, provider, monthly and per-request limits are server-enforced',async()=>{
  for(const limits of [{requestsPerUserPerDay:0},{requestsPerProviderPerDay:0},{monthlyEstimatedSpendCents:0},{maximumEstimatedCostPerRequestCents:19}]){const f=await fixture({limits});await assert.rejects(f.service.preview(f.request,address));assert.equal(f.client.metrics.apiCalls,0);}
});

test('invalid, no-match, ambiguous and provider-quota outcomes are distinct',async()=>{
  const invalid=await fixture();await assert.rejects(invalid.service.preview(invalid.request,{...address,state:'NV'}),/INVALID_ADDRESS/);
  for(const [body,status,expected] of [[[],200,'NO_PROPERTY_FOUND'],[[raw,{...raw,id:'other'}],200,'AMBIGUOUS_MATCH'],[{message:'quota'},429,'QUOTA_EXCEEDED']]){const f=await fixture({fetchImpl:async()=>response(body,status)}),preview=await f.service.preview(f.request,address);await assert.rejects(f.service.execute(f.request,{address,confirmationToken:preview.confirmationToken,confirmed:true}),new RegExp(expected));}
});

test('Crestview and Haven remain retained-first and do not require provider research',async()=>{
  const evidence=await addPropertyDetails(await loadEvidence(process.cwd()),process.cwd()),crestview=searchRetainedAddress({street:'1708 Crestview Drive',city:'Bakersfield',state:'CA',zip:'93305'},evidence.properties),haven=searchRetainedAddress({street:'3484 Haven Street',city:'Rosamond',state:'CA',zip:'93560'},evidence.properties);
  assert.equal(crestview.status,'MATCH');assert.equal(crestview.matches[0].ref,'GABE-01');assert.equal(haven.status,'MATCH');assert.equal(haven.matches[0].subjectKind,'DURABLE_SAVED');
});

test('local live configuration requires exact private evidence hashes before accepting credentials',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'pi-v2-2-config-')),source=path.join(root,'source_docs'),operator=path.join(root,'data/runtime/pi-v2-2/operator');await mkdir(source,{recursive:true});await mkdir(operator,{recursive:true});const bytes=Buffer.from('synthetic reviewed account evidence only');await writeFile(path.join(source,'account.txt'),bytes);const reference={path:'source_docs/account.txt',sha256:createHash('sha256').update(bytes).digest('hex')},record={version:'PI_LOCAL_PROPERTY_RESEARCH_V1',mode:'EXPLICIT_LOCAL_DEVELOPMENT',provider:'RentCast',endpoint:'/properties',localUser:user(),operationalEvidence:{...operationalEvidence,observedAt:NOW},authorization:authorization(),limits:{requestsPerUserPerDay:1,requestsPerProviderPerDay:1,maximumEstimatedCostPerRequestCents:20,monthlyEstimatedSpendCents:20},evidence:{account:reference,usage:reference,rights:reference,fees:reference,authorization:reference}};await writeFile(path.join(operator,'research-access.json'),JSON.stringify(record));
  await assert.doesNotReject(loadLocalResearchConfiguration({root,env:{RENTCAST_API_KEY:'synthetic-config-key'},clock:()=>new Date(NOW)}));record.evidence.account.sha256='0'.repeat(64);await writeFile(path.join(operator,'research-access.json'),JSON.stringify(record));await assert.rejects(loadLocalResearchConfiguration({root,env:{RENTCAST_API_KEY:'synthetic-config-key'},clock:()=>new Date(NOW)}),/HASH_MISMATCH/);
});

test('completed preliminary research reloads from exact retained hashes without a provider call',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'pi-v2-2-retained-')),rawRelative='data/raw/rentcast/property-research-v2-2/a/response.json',acceptanceRelative='data/runtime/pi-v2-2/live-acceptance/a/acceptance.json',registryRelative='data/runtime/pi-v2-2/retained-subjects.json';
  await mkdir(path.join(root,path.dirname(rawRelative)),{recursive:true});await mkdir(path.join(root,path.dirname(acceptanceRelative)),{recursive:true});
  const body=[raw],bodyHash=createHash('sha256').update(JSON.stringify(body)).digest('hex'),rawRecord={schemaVersion:1,retrievedAt:NOW,httpStatus:200,bodyHash,request:{endpoint:'/properties',params:{address:'21950 Arosa Road, Tehachapi, CA, 93561'}},body},rawBytes=Buffer.from(JSON.stringify(rawRecord)),acceptanceBytes=Buffer.from('{"status":"PASS"}');
  await writeFile(path.join(root,rawRelative),rawBytes);await writeFile(path.join(root,acceptanceRelative),acceptanceBytes);
  const subjectRef=toPreliminaryEvidence(raw,{...rawRecord,rawResponseRef:rawRelative}).property.ref,registry={version:'PI_V2_2_RETAINED_RESEARCH_V1',subjects:[{subjectRef,provider:'RentCast',endpoint:'/properties',providerRecordId:raw.id,rawResponseRef:rawRelative,rawResponseSha256:createHash('sha256').update(rawBytes).digest('hex'),bodyHash,acceptanceRef:acceptanceRelative,acceptanceSha256:createHash('sha256').update(acceptanceBytes).digest('hex'),retainedAt:NOW}]};
  await mkdir(path.join(root,path.dirname(registryRelative)),{recursive:true});await writeFile(path.join(root,registryRelative),JSON.stringify(registry));
  const retained=await addRetainedPropertyResearch({properties:[],propertyDetails:[]},root);assert.equal(retained.properties.length,1);assert.equal(retained.properties[0].ref,subjectRef);assert.equal(retained.properties[0].subjectKind,'PRELIMINARY_RESEARCH');assert.equal(retained.propertyDetails[0].resolutionStatus,'PROVIDER_REPORTED_PRELIMINARY');
  await writeFile(path.join(root,rawRelative),Buffer.from(`${rawBytes} `));await assert.rejects(addRetainedPropertyResearch({properties:[]},root),/HASH_MISMATCH/);
});
