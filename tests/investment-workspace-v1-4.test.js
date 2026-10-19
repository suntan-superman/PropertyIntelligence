import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {blankInputs,applyIllustrativeExpensePreset,ILLUSTRATIVE_EXPENSE_PRESET,analyze,economicInput} from '../src/investment-workspace/analysis.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {reportModel,workspaceReportHtml} from '../src/investment-workspace/reports.js';
import {evaluateEconomics} from '../src/analysis/monteCarlo/economics.js';
import {calculateAcquisitionDecision} from '../src/underwriting/mao.js';

const evidence=await addPropertyDetails(await loadEvidence());
const byRef=ref=>evidence.properties.find(x=>x.ref===ref);
const scenario=(p,inputs={})=>({id:randomUUID(),propertyRef:p.ref,name:'V1.4 practical underwriting',revision:1,savedAt:'2026-10-14T16:00:00.000Z',evidenceFingerprint:p.evidenceFingerprint??evidence.fingerprint,inputs:{...blankInputs(),purchasePrice:'180000',rehabCost:'35000',exitValue:'300000',...inputs},targetType:'PROFIT_MARGIN_ON_SALE',compReviews:{},notes:'Artificial V1.4 QA assumptions.',risk:{variables:{},seed:'',iterations:1000,rationale:''},demonstration:true,riskRequested:false});

test('illustrative expense preset is explicit, exact and never part of a blank scenario',()=>{
  const blank=blankInputs();for(const [key,value] of Object.entries(ILLUSTRATIVE_EXPENSE_PRESET)){assert.notEqual(blank[key],value);}
  const applied=applyIllustrativeExpensePreset(blank);assert.deepEqual(Object.fromEntries(Object.keys(ILLUSTRATIVE_EXPENSE_PRESET).map(k=>[k,applied[k]])),ILLUSTRATIVE_EXPENSE_PRESET);
  assert.equal(applied.purchasePrice,'');assert.equal(applied.exitValue,'');assert.equal(applied.rehabCost,'');
});

test('three immediate downside cases reuse the certified deterministic engine exactly',()=>{
  const p=byRef('GABE-01'),s=scenario(p,applyIllustrativeExpensePreset(blankInputs()));s.inputs={...s.inputs,purchasePrice:'180000',rehabCost:'35000',exitValue:'300000'};
  const result=analyze(s);assert.deepEqual(result.deterministicScenarios.map(x=>x.id),['RESALE_DOWN_10','REHAB_UP_20','HOLDING_PLUS_30']);
  const expected=[{exitValue:'270000'},{rehabCost:'42000'},{marketingDays:'60'}].map(patch=>evaluateEconomics(economicInput({...s,inputs:{...s.inputs,...patch}}).economics));
  result.deterministicScenarios.forEach((row,i)=>assert.equal(row.modeledProfit,expected[i].modeledProfit));
});

test('four required evidence cases remain distinct and subject-bound',()=>{
  const haven=evidence.properties.find(x=>x.subjectKind==='DURABLE_SAVED');assert.equal(haven.sales.length,0);
  assert.equal(byRef('GABE-01').sales.length,4);
  assert.equal(Math.min(...byRef('GABE-04').sales.map(x=>x.salePrice)),75000);
  assert.equal(byRef('GABE-05').sales.length,2);assert.ok(byRef('GABE-05').sales.every(x=>x.ageDays>180));
  assert.throws(()=>reportModel(haven,scenario(byRef('GABE-01'))),/do not match/);
});

test('Haven 279,167 cash-on-cash result requires 18,000 of disposition cost under the certified legacy equation',()=>{
  const input={strategy:'FIX_AND_FLIP',hurdle:{type:'CASH_ON_CASH',rate:.2},selectedExitBasis:'ANALYST_EXIT',exitBases:[{basis:'ANALYST_EXIT',value:353000}],acquisitionCosts:[],rehab:{items:[],noRehabAssumption:true},holdingCosts:[],financing:{mode:'CASH'}};
  const zero=calculateAcquisitionDecision({...input,dispositionCosts:[]}),traced=calculateAcquisitionDecision({...input,dispositionCosts:[{name:'modeled exit costs',amount:18000}]});
  assert.equal(zero.calculatedMao,294166.66);assert.equal(traced.calculatedMao,279166.66);
  assert.equal(traced.exitResults[0].modeledProfit,55833.34);assert.equal(traced.exitResults[0].cashInvested,279166.66);
  assert.ok(Math.abs(traced.exitResults[0].selectedReturnMetric-.2)<1e-7);
});

test('blank seller ask remains unknown rather than zero',()=>{
  const decision=calculateAcquisitionDecision({strategy:'FIX_AND_FLIP',hurdle:{type:'CASH_ON_CASH',rate:.2},selectedExitBasis:'ANALYST_EXIT',exitBases:[{basis:'ANALYST_EXIT',value:353000}],acquisitionCosts:[],dispositionCosts:[],rehab:{items:[],noRehabAssumption:true},holdingCosts:[],financing:{mode:'CASH'},sellerAskingPrice:null});
  assert.equal(decision.sellerAskingPrice,null);assert.equal(decision.sellerAskEconomics,null);assert.equal(decision.apparentSellerEquityAtAsk,null);
});

test('V1.4 reports use readable headers, preserve metadata IDs and include deterministic risks',()=>{
  const p=evidence.properties.find(x=>x.subjectKind==='DURABLE_SAVED'),s=scenario(p),{model}=reportModel(p,s),html=workspaceReportHtml(p,s,evidence,'full');
  assert.match(model.reportMeta.readableReference,/Saved Property · 3484 Haven St/);assert.match(model.reportMeta.propertyRef,/^PROPERTY-/);
  assert.doesNotMatch(html.split('</div>')[0],/[a-f0-9]{8}-[a-f0-9-]{27,}/i);assert.match(html,/Immediate deterministic downside cases/);assert.match(html,/Resale price decreases 10%/);assert.match(html,/Cash-on-cash/);
});

test('browser implementation exposes Basic, Advanced, authenticated sale research and unsaved-change controls without external transport',async()=>{
  const source=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8');
  for(const phrase of ['Basic underwriting assumptions','Advanced settings · all certified inputs','Apply illustrative preset','Find Recent Sold Properties','Authenticated RentCast research','/api/property-research/research','useNotificationDialog'])assert.match(source,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.doesNotMatch(source,/request-bound authorization|Expected: 1 request|conservative exposure \$0\.20|Live refresh disabled/);
  assert.doesNotMatch(source,/beforeunload|window\.confirm|window\.alert/);
  assert.doesNotMatch(source,/fetch\(['"]https?:|process\.env|import\.meta\.env|DATABASE_URL|API_KEY/);
});
