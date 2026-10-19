import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {CATEGORIES,categoryRecords,comparableEvidence,groupObservations} from '../apps/web/src/features/comps-map/evidence.js';
import {detailRoute,investmentRoute,requestedScenario,requestedSubject} from '../apps/web/src/features/property-detail/navigation.js';
import {loadEvidence,sha} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {blankInputs} from '../src/investment-workspace/analysis.js';
import {reportModel,workspaceReportHtml} from '../src/investment-workspace/reports.js';

const original=await loadEvidence();
const evidence=await addPropertyDetails(original);
const byRef=ref=>evidence.properties.find(p=>p.ref===ref);
const model=ref=>evidence.propertyDetails.find(p=>p.subjectRef===ref);
const scenario=(p,reviews={})=>({id:randomUUID(),propertyRef:p.ref,name:'V1.3 focused QA',revision:1,savedAt:'2026-10-13T22:00:00.000Z',evidenceFingerprint:p.evidenceFingerprint??evidence.fingerprint,inputs:{...blankInputs(),purchasePrice:'180000',rehabCost:'35000',exitValue:'300000'},notes:'Artificial QA assumptions only.',targetType:'PROFIT_MARGIN_ON_SALE',compReviews:reviews,risk:{seed:'v13',iterations:100,variables:{},rationale:''},demonstration:true,riskRequested:false});

test('four comparable views use distinct concepts and an inclusive all-observations view',()=>{
  assert.deepEqual(CATEGORIES,['Recorded sales','Active listings','Inactive listings','All provider observations']);
  const rows=comparableEvidence(model('GABE-01'));
  assert.equal(categoryRecords(rows,CATEGORIES[3]).length,rows.length);
  assert.equal(categoryRecords(rows,CATEGORIES[0]).length,4);
  assert.ok(categoryRecords(rows,CATEGORIES[1]).every(x=>x.evidenceKind==='AVM_OBSERVATION'));
  assert.ok(categoryRecords(rows,CATEGORIES[2]).every(x=>x.evidenceKind==='AVM_OBSERVATION'));
});

test('Haven retains 15 observations but has zero subject-bound recorded sales',()=>{
  const rows=comparableEvidence(model(evidence.properties.at(-1).ref));
  assert.equal(rows.length,15);
  assert.equal(categoryRecords(rows,CATEGORIES[0]).length,0);
  assert.equal(rows.filter(x=>x.mappable).length,15);
});

test('grouping preserves source history and never merges conflicting identities or units',()=>{
  const base={address:'100 Test St',providerId:'same',evidenceKind:'AVM_OBSERVATION',price:1};
  const grouped=groupObservations([base,{...base,id:'b',price:2}]);
  assert.equal(grouped.length,1);assert.equal(grouped[0].records.length,2);
  assert.equal(groupObservations([base,{...base,id:'c',providerId:'other'}]).length,2);
  assert.equal(groupObservations([{...base,unit:'1'},{...base,id:'d',unit:'2'}]).length,2);
});

test('GABE acceptance evidence remains subject-bound and truthful',()=>{
  assert.equal(byRef('GABE-01').sales.length,4);
  assert.equal(byRef('GABE-04').sales.length,4);
  assert.equal(Math.min(...byRef('GABE-04').sales.map(x=>x.salePrice)),75000);
  assert.ok(byRef('GABE-04').findings.some(x=>x.includes('$75,000')&&x.includes('Verify transfer terms')));
  assert.equal(byRef('GABE-05').sales.length,2);
  assert.ok(byRef('GABE-05').findings.some(x=>x.includes('Do not derive a numerical ARV')));
});

test('one selected GABE-01 sale and three not-selected statuses survive report generation',()=>{
  const p=byRef('GABE-01'),s=scenario(p,{[p.sales[0].evidenceRef]:{include:true,notes:'Selected for QA relevance review only.'}}),m=reportModel(p,s).model;
  assert.equal(m.research.included,1);assert.equal(m.research.notSelected,3);
  const html=workspaceReportHtml(p,s,evidence,'full');
  assert.match(html,/Included in analyst analysis/);assert.match(html,/Not selected/);assert.match(html,/Selected for QA relevance review only/);
});

test('GABE-04 low-price record can be explicitly excluded without setting ARV',()=>{
  const p=byRef('GABE-04'),low=p.sales.find(x=>x.salePrice===75000),s=scenario(p,{[low.evidenceRef]:{include:false,notes:'Excluded as a low-price outlier pending transfer and condition evidence.'}}),m=reportModel(p,s).model;
  assert.equal(m.research.excluded,1);assert.equal(m.economics.resaleValue.value,300000);
  assert.notEqual(m.economics.resaleValue.value,low.salePrice);
  assert.match(workspaceReportHtml(p,s,evidence,'full'),/low-price outlier/);
});

test('scenario route is bound to the same subject, snapshot and scenario',()=>{
  const p=byRef('GABE-01'),s=scenario(p),route=investmentRoute(p.ref,p.evidenceFingerprint??evidence.fingerprint,s.id);
  assert.equal(requestedSubject(route,evidence.properties,evidence.fingerprint).ref,p.ref);
  assert.equal(requestedScenario(route,p.ref,[s],p.evidenceFingerprint??evidence.fingerprint).id,s.id);
  assert.throws(()=>requestedScenario(route,'GABE-02',[s]),/does not belong/);
  assert.throws(()=>requestedScenario(investmentRoute(p.ref,p.evidenceFingerprint??evidence.fingerprint,randomUUID()),p.ref,[s]),/does not belong/);
  assert.throws(()=>requestedScenario(route,p.ref,[{...s,evidenceFingerprint:'stale-snapshot'}],p.evidenceFingerprint??evidence.fingerprint),/does not match/);
  assert.equal(requestedSubject(detailRoute(p.ref,p.evidenceFingerprint??evidence.fingerprint),evidence.properties,evidence.fingerprint).ref,p.ref);
});

test('saved Haven and Gabe scenarios cannot exchange subject evidence',()=>{
  const haven=byRef(evidence.properties.at(-1).ref),gabe=byRef('GABE-01');
  assert.throws(()=>reportModel(haven,scenario(gabe)),/do not match/);
  assert.throws(()=>reportModel(gabe,scenario(haven)),/do not match/);
});

test('V1.3 UI remains local-only and certified engines are not imported into browser code',async()=>{
  const ui=(await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'))+(await readFile('apps/web/src/features/property-detail/PropertyDetail.jsx','utf8'));
  assert.doesNotMatch(ui,/process\.env|import\.meta\.env|DATABASE_URL|API_KEY|src\/analysis|src\/underwriting|fetch\(['"]https?:/);
  assert.match(ui,/Observed \/ provider-reported evidence/);assert.match(ui,/Analyst assumptions/);assert.match(ui,/Calculated outputs/);
});

test('retained source evidence bytes remain unchanged',async()=>{
  assert.equal(sha(await readFile('data/runtime/property-detail-v1-2/saved-haven.json')),'970461132bcb09adc17a546192d633afc459a5af7766e9b531bd3ab816069a80');
  assert.equal(sha(await readFile('data/runtime/gabe-demo-v2-1-2026-10-13/REVIEW_DECISIONS.json')),'48e6821613570a055ed7f53f0f488d025bbd705f3f81cdb3cde07d0364643cf1');
});
