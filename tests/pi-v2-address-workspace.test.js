import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {canonicalAddress,retainedSubjectKind,searchRetainedAddress} from '../apps/web/src/features/property-search/address-identity.js';
import {classifyScenarioRecord} from '../src/discovery/scenario-classification.js';
import {readReportRegistry,recordReportReference} from '../apps/web/src/features/desktop-shell/report-registry.js';

const evidence=await addPropertyDetails(await loadEvidence());
const crestview=evidence.properties.find(property=>property.ref==='GABE-01');
const haven=evidence.properties.find(property=>property.subjectKind==='DURABLE_SAVED');

test('routine suffix punctuation case and ZIP formatting canonicalize without fuzzy matching',()=>{
  assert.deepEqual(canonicalAddress({street:'1708 Crestview Drive.',city:'bakersfield',state:'California',zip:'93305-1234'}),{street:'1708 CRESTVIEW DR',city:'BAKERSFIELD',state:'CA',zip:'93305'});
  for(const street of ['1708 Crestview Dr','1708 Crestview Drive']){
    const result=searchRetainedAddress({street,city:'Bakersfield',state:'CA',zip:'93305'},evidence.properties);
    assert.equal(result.status,'MATCH');assert.equal(result.matches[0].ref,'GABE-01');
  }
  assert.equal(searchRetainedAddress({street:'1708 Crestview Ct',city:'Bakersfield',state:'CA',zip:'93305'},evidence.properties).status,'NO_MATCH');
});

test('durable Haven resolves while duplicate exact identities remain ambiguous',()=>{
  const parts={street:'3484 Haven Street',city:'Rosamond',state:'CA',zip:'93560'};
  assert.equal(searchRetainedAddress(parts,evidence.properties).matches[0].ref,haven.ref);
  const duplicate={...crestview,ref:'OTHER-IDENTITY'};
  const result=searchRetainedAddress({street:'1708 Crestview Drive',city:'Bakersfield',state:'CA',zip:'93305'},[crestview,duplicate]);
  assert.equal(result.status,'AMBIGUOUS');assert.equal(result.matches.length,2);
});

test('one established subject wins presentation without merging a separate county index record',()=>{
  const county={ref:'COUNTY-INDEX',subjectKind:'DISCOVERY_CANDIDATE',address:'1708 CRESTVIEW DR, BAKERSFIELD, CA'};
  const result=searchRetainedAddress({street:'1708 Crestview Drive',city:'Bakersfield',state:'CA',zip:'93305'},[crestview,county]);
  assert.equal(result.status,'MATCH');assert.equal(result.matches[0].ref,'GABE-01');assert.deepEqual(result.relatedMatches.map(item=>item.ref),['COUNTY-INDEX']);
});

test('startup-time preliminary records remain searchable when an older server snapshot lacks the new subjectKind field',()=>{
  const staleCrestview={...crestview};delete staleCrestview.subjectKind;delete staleCrestview.addressComponents;delete staleCrestview.evidenceFingerprint;
  const county={ref:'COUNTY-INDEX',subjectKind:'DISCOVERY_CANDIDATE',address:'1708 CRESTVIEW DR, BAKERSFIELD, CA'};
  assert.equal(retainedSubjectKind(staleCrestview),'PRELIMINARY_RESEARCH');
  const result=searchRetainedAddress({street:'1708 Crestview Drive',city:'Bakersfield',state:'CA',zip:'93305'},[staleCrestview,county]);
  assert.equal(result.status,'MATCH');assert.equal(result.matches[0].ref,'GABE-01');assert.deepEqual(result.relatedMatches.map(item=>item.ref),['COUNTY-INDEX']);
  assert.equal(retainedSubjectKind({...staleCrestview,identityStatus:'Unknown'}),null);
});

test('preliminary research is not silently promoted or automatically classified as QA',()=>{
  assert.equal(crestview.subjectKind,'PRELIMINARY_RESEARCH');
  assert.equal(haven.subjectKind,'DURABLE_SAVED');
  assert.equal(classifyScenarioRecord({propertyRef:'GABE-01',name:'Crestview acquisition analysis',demonstration:false}).classification,'USER_OR_UNCLASSIFIED');
  assert.equal(classifyScenarioRecord({propertyRef:'GABE-01',name:'Crestview acquisition analysis',demonstration:true}).classification,'CONFIRMED_QA');
});

test('report references retain exact scenario subject snapshot and revision',()=>{
  const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};globalThis.window={dispatchEvent:()=>{}};globalThis.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options.detail;}};
  const scenario={id:'11111111-1111-4111-8111-111111111111',propertyRef:'GABE-01',evidenceFingerprint:evidence.fingerprint,revision:2,name:'Crestview analysis'};
  recordReportReference({scenario,property:crestview,kind:'full',status:'PREVIEWED'});
  assert.deepEqual(readReportRegistry().map(({scenarioId,propertyRef,evidenceFingerprint,revision,kind})=>({scenarioId,propertyRef,evidenceFingerprint,revision,kind})),[{scenarioId:scenario.id,propertyRef:'GABE-01',evidenceFingerprint:evidence.fingerprint,revision:2,kind:'full'}]);
});

test('workspace surfaces durable properties analyses research and generated reports separately',async()=>{
  const workspace=await readFile('apps/web/src/features/desktop-shell/MyWorkspace.jsx','utf8'),discovery=await readFile('apps/web/src/features/discovery/Discovery.jsx','utf8');
  for(const label of ['Saved Properties','Analyses / Deals','Research','Reports'])assert.match(workspace,new RegExp(label.replace('/','\\/')));
  assert.match(workspace,/Analyze New Property/);assert.match(workspace,/WorkspaceSort/);assert.match(workspace,/role="listbox"/);assert.doesNotMatch(workspace,/<label>Sort<select/);
  assert.match(workspace,/subjectKind==='DURABLE_SAVED'/);assert.match(workspace,/\['PRELIMINARY_RESEARCH','DURABLE_SAVED'\]\.includes\(property\.subjectKind\)/);assert.match(workspace,/readReportRegistry/);
  assert.match(discovery,/Research New Property/);assert.match(discovery,/approveAndRunProviderResearch/);assert.doesNotMatch(discovery,/property-research\/(?:preview|plan|authorize|run)|Confirm and Research|Authorize and Run Research|request-bound authorization/);
  assert.match(discovery,/setRetainedFingerprint\(e\.evidenceFingerprint/);assert.match(discovery,/property\.evidenceFingerprint\?\?retainedFingerprint/);assert.doesNotMatch(discovery,/property\.evidenceFingerprint\?\?data\.evidenceFingerprint/);
});

