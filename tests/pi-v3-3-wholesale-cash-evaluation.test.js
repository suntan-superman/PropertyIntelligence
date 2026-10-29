import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {analyze,blankInputs,economicInput,evaluationMode,EVALUATION_MODES,scenarioCalculationKey} from '../src/investment-workspace/analysis.js';
import {validateDraft} from '../src/investment-workspace/store.js';
import {reportModel} from '../src/investment-workspace/report-model.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';

const evidence=await loadEvidence();
const property=structuredClone(evidence.properties[0]);
property.ref='RESEARCH-TYLER-V3-3-QA';
property.address='603 Tyler St, Taft, CA 93268';
property.addressComponents={street:'603 Tyler St',city:'Taft',state:'CA',zip:'93268'};
property.city='Taft';
property.evidenceFingerprint=evidence.fingerprint;
const isolatedEvidence={...evidence,properties:[property]};
const baseScenario=()=>({
  id:'33000000-0000-4000-8000-000000000001',propertyRef:property.ref,name:'Tyler V3.3 isolated wholesale QA',revision:1,
  evidenceFingerprint:evidence.fingerprint,savedAt:'2026-10-29T18:00:00.000Z',evaluationMode:'WHOLESALE_CASH',financingMode:'CASH',
  wholesaleFeeTreatment:'INCLUDED',wholesaleFeeAmount:'',expenseTreatments:{acquisitionFixed:'NOT_INCLUDED',sellingCommissionRate:'NOT_INCLUDED'},
  inputs:{...blankInputs(),purchasePrice:'111000',rehabCost:'20000',exitValue:'176000'},targetType:'PROFIT_MARGIN_ON_SALE',
  risk:{seed:'tyler-v3-3-local',iterations:100,variables:{exitValue:{min:'158400',mode:'176000',max:'184800'},rehabCost:{min:'18000',mode:'20000',max:'26000'},renovationDays:{min:'75',mode:'90',max:'120'},marketingDays:{min:'20',mode:'30',max:'60'}},rationale:'Isolated analyst-entered ranges for local V3.3 QA only.'},
  riskRequested:true,compReviews:{},analystEvidence:[],evidenceAttachments:[],photoSelections:[],notes:'Synthetic local V3.3 QA; no live property or provider writes.',demonstration:true
});

test('legacy scenarios retain detailed underwriting without migration',()=>{
  const legacy=baseScenario();delete legacy.evaluationMode;delete legacy.financingMode;delete legacy.wholesaleFeeTreatment;delete legacy.wholesaleFeeAmount;delete legacy.expenseTreatments;
  assert.equal(evaluationMode(legacy),EVALUATION_MODES.DETAILED_UNDERWRITING);
  assert.equal(validateDraft(legacy,isolatedEvidence).evaluationMode,undefined);
});

test('wholesale metadata validates and is revision-persistable without changing input values',()=>{
  const scenario=baseScenario(),inputs=structuredClone(scenario.inputs),clean=validateDraft(scenario,isolatedEvidence);
  assert.equal(clean.evaluationMode,'WHOLESALE_CASH');assert.equal(clean.financingMode,'CASH');assert.equal(clean.wholesaleFeeTreatment,'INCLUDED');
  assert.deepEqual(clean.inputs,inputs);assert.notEqual(scenarioCalculationKey(scenario),scenarioCalculationKey({...scenario,evaluationMode:'DETAILED_UNDERWRITING'}));
});

test('cash financing is not applicable and hidden financing values are not charged',()=>{
  const scenario=baseScenario();Object.assign(scenario.inputs,{loanAmount:'90000',annualRate:'12',points:'3',financingFees:'2400'});
  const economics=economicInput(scenario).economics;
  assert.equal(economics.financing.mode,'CASH');assert.equal(economics.financing.ltv,0);assert.equal(economics.financing.fees,0);
});

test('potential gross spread is exactly resale minus purchase minus rehabilitation',()=>{
  const {model}=reportModel(property,baseScenario());
  assert.equal(model.economics.grossSpread.value,45000);
  assert.equal(model.wholesaleEvaluation.financing,'CASH');
});

test('included wholesale fee is never double counted and additional fee is counted once',()=>{
  const included=baseScenario(),additional={...baseScenario(),wholesaleFeeTreatment:'ADDITIONAL',wholesaleFeeAmount:'5000'};
  const includedResult=analyze(included).deterministic,additionalResult=analyze(additional).deterministic;
  assert.equal(economicInput(included).economics.otherUpfront,0);
  assert.equal(economicInput(additional).economics.otherUpfront,5000);
  assert.equal(includedResult.modeledProfit-additionalResult.modeledProfit,5000);
});

test('optional expense states distinguish entered, not included and not applicable without deleting stored values',()=>{
  const scenario=baseScenario();scenario.inputs.acquisitionFixed='2500';scenario.expenseTreatments={acquisitionFixed:'NOT_INCLUDED'};
  assert.equal(economicInput(scenario).economics.acquisitionFixed,0);assert.equal(scenario.inputs.acquisitionFixed,'2500');
  scenario.expenseTreatments.acquisitionFixed='ENTERED';assert.equal(economicInput(scenario).economics.acquisitionFixed,2500);
  scenario.expenseTreatments.acquisitionFixed='NOT_APPLICABLE';assert.equal(economicInput(scenario).economics.acquisitionFixed,0);
});

test('wholesale mode preserves certified deterministic and Monte Carlo results when economics are unchanged',()=>{
  const wholesale=baseScenario(),detailed={...baseScenario(),evaluationMode:'DETAILED_UNDERWRITING',financingMode:undefined,wholesaleFeeTreatment:undefined,wholesaleFeeAmount:undefined,expenseTreatments:undefined};
  assert.deepEqual(analyze(wholesale,{risk:true}),analyze(detailed,{risk:true}));
});

test('Opportunity Brief presents one-page wholesale hierarchy and qualified follow-up language',()=>{
  const scenario=baseScenario(),html=workspaceReportHtml(property,scenario,isolatedEvidence,'brief');
  const financial='Preliminary estimates based on available information. Gross spread excludes additional transaction, holding, financing and selling expenses where applicable.';
  const diligence='Property condition, resale assumptions, title and transaction terms should be independently reviewed before purchase.';
  assert.equal((html.match(new RegExp(financial.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))??[]).length,1);
  assert.equal((html.match(new RegExp(diligence.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))??[]).length,1);
  assert.match(html,/Potential Gross Investment Spread/);assert.match(html,/\$45,000\.00/);assert.match(html,/Additional Due Diligence Recommended/);
  assert.doesNotMatch(html,/Not investor-ready|Failed|Analysis completeness/);
});

test('Full Investor Package leads with simple opportunity economics and moves MAO to additional metrics',()=>{
  const html=workspaceReportHtml(property,baseScenario(),isolatedEvidence,'full');
  assert.match(html,/Investment Due Diligence &amp; Recommended Follow-Up/);
  assert.match(html,/Wholesale \/ cash evaluation/);
  assert.match(html,/Additional Investment Metrics/);
  assert.ok(html.indexOf('Potential Gross Investment Spread')<html.indexOf('Additional Investment Metrics'));
});

test('outstanding diligence remains visible but does not block preliminary report generation',()=>{
  const {model}=reportModel(property,baseScenario());
  assert.equal(model.readiness.status,'ADDITIONAL_DUE_DILIGENCE_RECOMMENDED');
  assert.ok(model.dueDiligenceChecklist.outstanding.length>0);
  assert.doesNotThrow(()=>workspaceReportHtml(property,baseScenario(),isolatedEvidence,'full'));
});

test('Guided and Advanced workspaces expose the same saved evaluation selector and simplified inputs',async()=>{
  const source=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8');
  assert.match(source,/function EvaluationModeSelect/);assert.match(source,/Wholesale \/ Cash evaluation/);assert.match(source,/Detailed underwriting/);
  assert.match(source,/Potential Gross Investment Spread/);assert.match(source,/Wholesale fee treatment/);assert.match(source,/Additional Investment Metrics/);
  assert.match(source,/onEvaluationMode/);assert.match(source,/mode === "advanced"/);
});
