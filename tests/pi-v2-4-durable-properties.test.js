import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDurablePropertyService,DurablePropertyError,PROPERTY_LIFECYCLE,propertyPromotionCandidate} from '../src/investment-workspace/durable-properties.js';
import {createMemoryDurablePropertyRepository} from '../src/investment-workspace/memory-durable-properties.js';

const analyst={uid:'analyst-1',role:'Analyst',organizationId:'kern-investments'},otherTenant={uid:'analyst-2',role:'Analyst',organizationId:'other-organization'},viewer={uid:'viewer-1',role:'Viewer',organizationId:'kern-investments'};
const decatur={ref:'RESEARCH-DECATUR',address:'400 Decatur St, Bakersfield, CA 93308',subjectKind:'PRELIMINARY_RESEARCH',addressComponents:{street:'400 Decatur Street',city:'Bakersfield',state:'CA',zip:'93308'},evidenceFingerprint:'snapshot-decatur-v1',providerId:'rentcast-decatur',propertyRef:'private/server/evidence/property.json',valuationRef:'private/server/evidence/valuation.json',identityStatus:'Provider-reported address match; legal parcel identity not verified',attributes:{propertyType:'Single Family',bedrooms:3,bathrooms:1,squareFootage:824}};
const scenario={id:'11111111-1111-4111-8111-111111111111',propertyRef:decatur.ref,name:'Decatur base case',revision:3,evidenceFingerprint:decatur.evidenceFingerprint,inputs:{purchasePrice:'150000'},risk:{seed:'12345'},analysis:{deterministic:{modeledProfit:42000}},savedAt:'2026-10-18T18:00:00.000Z'};

function fixture(){let next=0;const repository=createMemoryDurablePropertyRepository(),clock=()=>new Date(`2026-10-18T18:00:0${next}.000Z`),idFactory=()=>`00000000-0000-4000-8000-${String(++next).padStart(12,'0')}`;return {repository,service:createDurablePropertyService({repository,clock,idFactory}),serviceAgain:()=>createDurablePropertyService({repository,clock,idFactory})};}

test('Decatur can be explicitly promoted with unknown APN without claiming legal verification',async()=>{
  const f=fixture(),preview=await f.service.preview({user:analyst,subject:decatur});
  assert.equal(preview.lifecycleStatus,PROPERTY_LIFECYCLE.PRELIMINARY);assert.deepEqual(preview.parcelIdentifiers,[]);assert.equal(preview.verificationStatus.parcel,'UNKNOWN');assert.equal(preview.identityConfidence,'PROVIDER_REPORTED_ADDRESS_MATCH');assert.deepEqual(preview.potentialDuplicates,[]);
  const saved=await f.service.promote({user:analyst,subject:decatur,scenario});
  assert.equal(saved.lifecycleStatus,PROPERTY_LIFECYCLE.SAVED);assert.match(saved.id,/^[a-f0-9-]{36}$/);assert.deepEqual(saved.evidenceSnapshotIds,[decatur.evidenceFingerprint]);assert.equal(saved.scenarioCount,1);assert.equal(saved.verificationStatus.title,'UNKNOWN');assert.equal(saved.organizationId,analyst.organizationId);
  assert.doesNotMatch(JSON.stringify(saved),/private\/server|property\.json|valuation\.json/);
});

test('shared mocked Firestore repository restores the same property and scenario in another session',async()=>{
  const f=fixture(),saved=await f.service.promote({user:analyst,subject:decatur,scenario}),nextSession=f.serviceAgain(),restored=(await nextSession.list({user:analyst}))[0],revisions=await nextSession.scenarioRevisions({user:analyst,id:saved.id});
  assert.equal(restored.id,saved.id);assert.equal(restored.sourceSubjectRef,decatur.ref);assert.equal(revisions.length,1);assert.deepEqual(revisions[0].scenario,scenario);assert.equal(revisions[0].evidenceSnapshotId,decatur.evidenceFingerprint);
});

test('organization isolation applies to reads, writes and duplicate keys',async()=>{
  const f=fixture(),first=await f.service.promote({user:analyst,subject:decatur,scenario});assert.equal((await f.service.list({user:otherTenant})).length,0);
  const other=await f.service.promote({user:otherTenant,subject:decatur,scenario});assert.notEqual(other.id,first.id);assert.equal((await f.service.list({user:analyst})).length,1);assert.equal((await f.service.list({user:otherTenant})).length,1);
  await assert.rejects(()=>f.service.promote({user:viewer,subject:{...decatur,address:'402 Decatur St, Bakersfield, CA 93308'}}),error=>error instanceof DurablePropertyError&&error.code==='ROLE_NOT_AUTHORIZED');
});

test('normalized address and APN duplicate protection never auto-merges and is race safe',async()=>{
  const f=fixture(),attempts=await Promise.allSettled([f.service.promote({user:analyst,subject:decatur,scenario}),f.service.promote({user:analyst,subject:{...decatur,address:'400 Decatur Street, Bakersfield, CA 93308',addressComponents:{...decatur.addressComponents,street:'400 Decatur St'}},scenario})]);
  assert.equal(attempts.filter(item=>item.status==='fulfilled').length,1);const rejected=attempts.find(item=>item.status==='rejected').reason;assert.equal(rejected.code,'DUPLICATE_PROPERTY');assert.equal(rejected.details.duplicates[0].address,decatur.address);
  const zipFixture=fixture();await zipFixture.service.promote({user:analyst,subject:{...decatur,address:'400 Decatur St, Bakersfield, CA',addressComponents:{...decatur.addressComponents,zip:''}}});await assert.rejects(()=>zipFixture.service.promote({user:analyst,subject:decatur}),error=>error.code==='DUPLICATE_PROPERTY');
  const apnSubject={...decatur,ref:'APN-ONE',address:'100 First Ave, Bakersfield, CA 93308',addressComponents:{street:'100 First Ave',city:'Bakersfield',state:'CA',zip:'93308'},apn:'123-456-78'},otherAddress={...decatur,ref:'APN-TWO',address:'200 Second Ave, Bakersfield, CA 93308',addressComponents:{street:'200 Second Ave',city:'Bakersfield',state:'CA',zip:'93308'},apn:'12345678'};
  const second=fixture();await second.service.promote({user:analyst,subject:apnSubject});await assert.rejects(()=>second.service.promote({user:analyst,subject:otherAddress}),error=>error.code==='DUPLICATE_PROPERTY');
});

test('archiving preserves evidence, scenarios and reports and supports restoration',async()=>{
  const f=fixture(),saved=await f.service.promote({user:analyst,subject:decatur,scenario});await f.service.linkReport({user:analyst,subjectRef:decatur.ref,scenario,kind:'full',filename:'decatur-investor-package.pdf',status:'DOWNLOADED'});
  const archived=await f.service.setArchived({user:analyst,id:saved.id,archived:true});assert.equal(archived.lifecycleStatus,PROPERTY_LIFECYCLE.ARCHIVED);assert.equal((await f.service.list({user:analyst})).length,0);const history=await f.service.list({user:analyst,includeArchived:true});assert.equal(history[0].scenarioCount,1);assert.equal(history[0].reportCount,1);assert.deepEqual(history[0].evidenceSnapshotIds,[decatur.evidenceFingerprint]);
  const restored=await f.service.setArchived({user:analyst,id:saved.id,archived:false});assert.equal(restored.lifecycleStatus,PROPERTY_LIFECYCLE.SAVED);assert.equal((await f.service.list({user:analyst})).length,1);
});

test('saved scenario revisions are immutable and later revisions remain distinct',async()=>{
  const f=fixture();await f.service.promote({user:analyst,subject:decatur,scenario});await f.service.linkScenarioRevision({user:analyst,subjectRef:decatur.ref,scenario});
  await assert.rejects(()=>f.service.linkScenarioRevision({user:analyst,subjectRef:decatur.ref,scenario:{...scenario,inputs:{purchasePrice:'1'}}}),/IMMUTABLE_SCENARIO_REVISION_CONFLICT/);
  await f.service.linkScenarioRevision({user:analyst,subjectRef:decatur.ref,scenario:{...scenario,revision:4,evidenceFingerprint:'snapshot-decatur-with-comps',inputs:{purchasePrice:'145000'},savedAt:'2026-10-18T19:00:00.000Z'}});const property=(await f.service.list({user:analyst}))[0],revisions=await f.service.scenarioRevisions({user:analyst,id:property.id});assert.equal(property.scenarioCount,1);assert.deepEqual(revisions.map(item=>item.revision),[3,4]);assert.deepEqual(property.evidenceSnapshotIds,[decatur.evidenceFingerprint,'snapshot-decatur-with-comps']);
});

test('lifecycle and verification remain separate and Firestore stays server-only',async()=>{
  const candidate=propertyPromotionCandidate(decatur);assert.equal(candidate.verificationStatus.ownership,'UNKNOWN');
  const [serverAdapter,clientPackage,server,rules,workspace]=await Promise.all([readFile('src/investment-workspace/firestore-durable-properties.js','utf8'),readFile('package.json','utf8'),readFile('src/investment-workspace/server.js','utf8'),readFile('config/firestore.rules.proposed','utf8'),readFile('apps/web/src/features/desktop-shell/MyWorkspace.jsx','utf8')]);
  assert.match(serverAdapter,/firebase|firestore/i);assert.doesNotMatch(clientPackage,/"@firebase\/firestore"/);assert.match(server,/authentication\.authenticate\(req\)/);assert.match(server,/requireCsrf\(req\)/);assert.match(rules,/allow read, write: if false/);assert.match(workspace,/evidenceFingerprint\?\?report\.evidenceSnapshotId/);
});
