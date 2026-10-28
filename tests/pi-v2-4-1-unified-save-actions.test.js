import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDurablePropertyService} from '../src/investment-workspace/durable-properties.js';
import {createMemoryDurablePropertyRepository} from '../src/investment-workspace/memory-durable-properties.js';

const administrator={uid:'admin-v241',role:'Administrator',organizationId:'pi-v241'};
const decatur={ref:'RESEARCH-DECATUR-V241',address:'400 Decatur St, Bakersfield, CA 93308',subjectKind:'PRELIMINARY_RESEARCH',addressComponents:{street:'400 Decatur Street',city:'Bakersfield',state:'CA',zip:'93308'},evidenceFingerprint:'snapshot-decatur-v241',providerId:'rentcast-decatur',attributes:{propertyType:'Single Family',bedrooms:3,bathrooms:1,squareFootage:824}};
const scenario={id:'24100000-0000-4000-8000-000000000001',propertyRef:decatur.ref,name:'Decatur analysis',revision:1,evidenceFingerprint:decatur.evidenceFingerprint,inputs:{purchasePrice:'150000'},savedAt:'2026-10-18T20:00:00.000Z'};

test('all five promotion surfaces reuse the shared SaveAsPropertyButton',async()=>{
  const [button,discovery,workspace,guided]=await Promise.all([
    readFile('apps/web/src/components/SaveAsPropertyButton.jsx','utf8'),
    readFile('apps/web/src/features/discovery/Discovery.jsx','utf8'),
    readFile('apps/web/src/features/desktop-shell/MyWorkspace.jsx','utf8'),
    readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8')
  ]);
  assert.match(button,/DURABLE_PROPERTY_SAVED_EVENT/);
  assert.match(button,/\/api\/durable-properties\/preview/);assert.match(button,/\/api\/durable-properties\/save/);
  assert.match(discovery,/Recent Research/);assert.match(discovery,/local-evidence-promote/);assert.match(discovery,/addressResult\.property/);
  assert.match(workspace,/Property status/);assert.match(workspace,/tab==='Research'/);assert.match(workspace,/scenario=\{scenario\}/);assert.match(workspace,/savedAction="open"/);
  assert.match(guided,/prepareScenario=\{onSave\}/);
});

test('Recent Research is collapsed by default and card selection never performs promotion',async()=>{
  const discovery=await readFile('apps/web/src/features/discovery/Discovery.jsx','utf8');
  assert.match(discovery,/<details className="local-evidence-picker"/);assert.doesNotMatch(discovery,/<details className="local-evidence-picker" open/);
  assert.match(discovery,/Selection never creates a Saved Property or initiates a provider request/);
  assert.match(discovery,/onClick=\{\(\)=>openLocalEvidence\(entry\)\}/);
});

test('repeated and concurrent entry points resolve to one stable organization property',async()=>{
  const repository=createMemoryDurablePropertyRepository(),service=createDurablePropertyService({repository}),attempts=await Promise.allSettled([
    service.promote({user:administrator,subject:decatur,scenario}),
    service.promote({user:administrator,subject:{...decatur,address:'400 Decatur Street, Bakersfield, CA 93308'},scenario})
  ]);
  assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);assert.equal(attempts.filter(result=>result.status==='rejected').length,1);
  const records=await service.list({user:administrator});assert.equal(records.length,1);assert.equal(records[0].sourceSubjectRef,decatur.ref);assert.equal(records[0].scenarioCount,1);
});

test('storage failure propagates and cannot report a browser-local success',async()=>{
  let attempted=0;
  const repository={async findDuplicates(){return [];},async create(){attempted++;throw Object.assign(new Error('FIRESTORE_UNAVAILABLE'),{code:14});}};
  const service=createDurablePropertyService({repository});
  await assert.rejects(()=>service.promote({user:administrator,subject:decatur,scenario}),error=>error.code===14&&error.message==='FIRESTORE_UNAVAILABLE');
  assert.equal(attempted,1);
  const button=await readFile('apps/web/src/components/SaveAsPropertyButton.jsx','utf8');assert.match(button,/did not fall back to browser-local storage/);
});

test('workspace promotion event updates durable views only with the confirmed server record',async()=>{
  const [button,workspace]=await Promise.all([readFile('apps/web/src/components/SaveAsPropertyButton.jsx','utf8'),readFile('apps/web/src/features/desktop-shell/MyWorkspace.jsx','utf8')]);
  const responseIndex=button.indexOf("request('/api/durable-properties/save'"),eventIndex=button.indexOf('window.dispatchEvent'),scenarioSaveIndex=button.indexOf('prepareScenario?await prepareScenario()');
  assert.ok(responseIndex>=0&&eventIndex>responseIndex&&scenarioSaveIndex>eventIndex,'the durable parent must be created before its scenario revision is prepared and saved');assert.match(workspace,/window\.addEventListener\(DURABLE_PROPERTY_SAVED_EVENT/);assert.match(workspace,/properties\.some\(item=>item\.id===record\.id\)/);
});

test('preliminary analysis remains read-only while save ordering prevents an orphaned scenario request',async()=>{
  const [button,workspace,server]=await Promise.all([readFile('apps/web/src/components/SaveAsPropertyButton.jsx','utf8'),readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'),readFile('src/auth/netlify-auth.js','utf8')]);
  assert.match(button,/!prepareScenario&&scenario\?\.id&&scenario\.revision>0/);assert.match(button,/Property saved; scenario not saved/);
  assert.match(workspace,/DURABLE_PROPERTY_NOT_FOUND:'This preliminary property can be analyzed now/);assert.match(workspace,/setResult\(analysis\);setValidation\(\{\}\)/);
  const analyzeRoute=server.slice(server.indexOf("path==='/api/investment/analyze'"),server.indexOf("path==='/api/investment/save'"));assert.doesNotMatch(analyzeRoute,/if\(!property\)return json\(404,\{error:'DURABLE_PROPERTY_NOT_FOUND'\}\)/);
});
