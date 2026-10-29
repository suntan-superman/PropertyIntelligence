import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {analyze} from '../src/investment-workspace/analysis.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {restoreDurablePropertyEvidence} from '../src/investment-workspace/automatic-property-research.js';
import {reportModel,workspaceReportHtml} from '../src/investment-workspace/reports.js';

const root=path.resolve(import.meta.dirname,'..');
const scenarioPath=path.join(root,'data/runtime/investment-workspace-v1/scenarios/6f7b1d62-0e91-4da1-9e31-250101000101.r1.json');
let evidence=await loadEvidence(root);evidence=await restoreDurablePropertyEvidence(evidence,[{sourceSubjectRef:'RESEARCH-EB66B8421C47',addressComponents:{street:'400 Decatur St',city:'Bakersfield',state:'CA',zip:'93308'},evidenceSnapshotIds:['3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71']}]);
const scenario=JSON.parse(await readFile(scenarioPath,'utf8'));
const property=evidence.properties.find(item=>item.ref===scenario.propertyRef);
assert.ok(property,'Decatur retained evidence is required for V2.6 report QA.');
const document=(id,filename,claims,structuredClaims=[])=>({index:Number(id.at(-1)),document:{id,documentType:'OTHER',description:filename,source:'Synthetic QA issuer',sourceDate:'2026-10-18',reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',confidentiality:'STANDARD',currentVersion:1,currentVersionMetadata:{version:1,filename,sha256:'a'.repeat(64),scanStatus:'CLEAN'}},version:{version:1,filename,mimeType:'application/pdf',sha256:'a'.repeat(64),scanStatus:'CLEAN',structuredClaims},claims,structuredClaims});
const documents=[
  document('6f7b1d62-0e91-4da1-9e31-250101000001','mortgage.pdf',[{fieldKey:'SELLER.ORIGINAL_PRINCIPAL',fieldLabel:'Original recorded mortgage amount'},{fieldKey:'SELLER.ALGORITHMIC_BALANCE',fieldLabel:'Estimated balance'}]),
  document('6f7b1d62-0e91-4da1-9e31-250101000002','payoff.pdf',[{fieldKey:'SELLER.VERIFIED_PAYOFF',fieldLabel:'Verified payoff'},{fieldKey:'SELLER.ALGORITHMIC_BALANCE',fieldLabel:'Estimated balance'}]),
  document('6f7b1d62-0e91-4da1-9e31-250101000003','rehab.pdf',[{fieldKey:'UNDERWRITING.REHABCOST',fieldLabel:'Estimated rehabilitation cost'}])
];
const qaScenario=structuredClone(scenario);
const enteredAmounts={
  'SELLER.ORIGINAL_PRINCIPAL':['ORIGINAL_RECORDED_PRINCIPAL',150000,1],
  'SELLER.VERIFIED_PAYOFF':['LENDER_PAYOFF_AMOUNT',134912.66,1],
  'UNDERWRITING.REHABCOST':['REHABILITATION_ESTIMATE',30000,1]
};
qaScenario.evidenceAttachments=qaScenario.evidenceAttachments.map(link=>enteredAmounts[link.fieldKey]?{...link,documentAmount:enteredAmounts[link.fieldKey][1],documentAmountCurrency:'USD',documentAmountSemanticType:enteredAmounts[link.fieldKey][0],documentAmountSourcePage:enteredAmounts[link.fieldKey][2],documentAmountSourceNote:'Synthetic QA fixture transcription',documentAmountAnalystConfirmed:true,documentAmountConfirmedAt:'2026-10-19T19:45:00.000Z'}:link);

test('incomplete material costs prevent a net-profit label without changing calculations',()=>{
  const {model,analysis}=reportModel(property,scenario,{supportingDocuments:documents});
  assert.equal(model.costCompleteness.status,'INCOMPLETE');
  assert.equal(model.economics.netProfitEligible,false);
  assert.equal(model.economics.profitLabel,'Illustrative modeled result — incomplete costs');
  assert.equal(model.economics.profit.value,analysis.deterministic.modeledProfit);
  assert.ok(model.costCompleteness.majorUnentered.includes('Selling commission'));
  assert.ok(!JSON.stringify(model).includes('Estimated net profit'));
});

test('estimated net profit is used only when every tracked material cost is entered',()=>{
  const complete=structuredClone(scenario);
  for(const item of ['contingency','acquisitionFixed','acquisitionRate','propertyTaxes','insurance','utilities','maintenance','otherHolding','sellingCommissionRate','sellerClosingFixed','sellerClosingRate','transferCost','otherUpfront','otherAtExit'])complete.inputs[item]='1';
  const {model}=reportModel(property,complete);
  assert.equal(model.costCompleteness.status,'COMPLETE');
  assert.equal(model.economics.netProfitEligible,true);
  assert.equal(model.economics.profitLabel,'Estimated net profit');
});

test('document reconciliation uses persisted analyst transcriptions and exposes synthetic QA discrepancies',()=>{
  const {model}=reportModel(property,qaScenario,{supportingDocuments:documents});
  assert.deepEqual(model.evidenceReconciliation.discrepancies.map(item=>item.fieldKey),['SELLER.ORIGINAL_PRINCIPAL','SELLER.VERIFIED_PAYOFF','UNDERWRITING.REHABCOST']);
  assert.equal(model.evidenceReconciliation.notComparable.length,0);
  assert.equal(model.evidenceReconciliation.notReconciled.length,2);
  assert.match(model.evidenceReconciliation.notice,/does not infer values from PDF text or OCR/i);
  const expected={
    'SELLER.ORIGINAL_PRINCIPAL':{scenarioAmount:100000,documentAmount:150000,delta:50000,sourcePage:1},
    'SELLER.VERIFIED_PAYOFF':{scenarioAmount:101000,documentAmount:134912.66,delta:33912.66,sourcePage:1},
    'UNDERWRITING.REHABCOST':{scenarioAmount:35000,documentAmount:30000,delta:-5000,sourcePage:1}
  };
  for(const [fieldKey,values] of Object.entries(expected)){
    const row=model.evidenceReconciliation.rows.find(item=>item.fieldKey===fieldKey);
    assert.deepEqual({scenarioAmount:row.scenarioAmount,documentAmount:row.documentAmount,delta:row.delta,sourcePage:row.documentAmountSourcePage,status:row.status,version:row.version},{...values,status:'DIFFERENCE_REVIEW',version:1});
  }
  assert.ok(model.evidenceReconciliation.rows.filter(item=>item.fieldKey==='SELLER.ALGORITHMIC_BALANCE').every(item=>item.status==='NOT_RECONCILED'));
});

test('unconfirmed, unlocated or semantically mismatched transcriptions never become report comparisons',()=>{
  const unsafe=structuredClone(qaScenario),link=unsafe.evidenceAttachments.find(item=>item.fieldKey==='SELLER.ORIGINAL_PRINCIPAL');
  link.documentAmountAnalystConfirmed=false;
  const row=reportModel(property,unsafe,{supportingDocuments:documents}).model.evidenceReconciliation.rows.find(item=>item.documentId===documents[0].document.id&&item.fieldKey==='SELLER.ORIGINAL_PRINCIPAL');
  assert.equal(row.documentAmount,null);assert.equal(row.status,'NOT_RECONCILED');
  link.documentAmountAnalystConfirmed=true;link.documentAmountSemanticType='LENDER_PAYOFF_AMOUNT';
  const wrong=reportModel(property,unsafe,{supportingDocuments:documents}).model.evidenceReconciliation.rows.find(item=>item.documentId===documents[0].document.id&&item.fieldKey==='SELLER.ORIGINAL_PRINCIPAL');
  assert.equal(wrong.documentAmount,null);assert.equal(wrong.status,'NOT_COMPARABLE');
  link.documentAmountSemanticType='ORIGINAL_RECORDED_PRINCIPAL';link.documentAmountSourcePage=null;link.documentAmountSourceNote='';
  const missingLocator=reportModel(property,unsafe,{supportingDocuments:documents}).model.evidenceReconciliation.rows.find(item=>item.documentId===documents[0].document.id&&item.fieldKey==='SELLER.ORIGINAL_PRINCIPAL');
  assert.equal(missingLocator.documentAmount,null);assert.equal(missingLocator.status,'NOT_RECONCILED');
});

test('matching amount remains authenticity-unverified and disallowed documents never disclose transcriptions',()=>{
  const matching=structuredClone(qaScenario),link=matching.evidenceAttachments.find(item=>item.fieldKey==='SELLER.ORIGINAL_PRINCIPAL');link.documentAmount=100000;
  const match=reportModel(property,matching,{supportingDocuments:documents}).model.evidenceReconciliation.rows.find(item=>item.fieldKey==='SELLER.ORIGINAL_PRINCIPAL');
  assert.equal(match.status,'MATCH');assert.equal(match.delta,0);
  const confidential=structuredClone(documents);confidential[0].document.confidentiality='CONFIDENTIAL';
  const blocked=reportModel(property,qaScenario,{supportingDocuments:confidential}).model.evidenceReconciliation.rows.find(item=>item.fieldKey==='SELLER.ORIGINAL_PRINCIPAL');
  assert.equal(blocked.status,'DOCUMENT_NOT_INCLUDED');assert.equal(blocked.documentAmount,null);
  const superseded=structuredClone(documents);superseded[0].document.reviewStatus='SUPERSEDED';
  const retired=reportModel(property,qaScenario,{supportingDocuments:superseded}).model.evidenceReconciliation.rows.find(item=>item.fieldKey==='SELLER.ORIGINAL_PRINCIPAL');
  assert.equal(retired.status,'DOCUMENT_NOT_INCLUDED');assert.equal(retired.documentAmount,null);
});

test('comparable roles are explicit and an included boolean is not silently promoted to Primary',()=>{
  const {model}=reportModel(property,scenario);
  assert.equal(model.research.primary,0);
  assert.equal(model.research.unclassified,11);
  assert.match(model.resaleSupport.label,/roles not yet classified/i);
  const classified=structuredClone(scenario),references=Object.keys(classified.compReviews);
  classified.compReviews[references[0]].role='PRIMARY';classified.compReviews[references[1]].role='SECONDARY';classified.compReviews[references[2]].role='EXCLUDED';
  const result=reportModel(property,classified).model;
  assert.equal(result.research.primary,1);assert.equal(result.research.secondary,1);assert.equal(result.research.excluded,1);
});

test('brief is decision-oriented and omits an unclassified comparable table from its main page',()=>{
  const html=workspaceReportHtml(property,qaScenario,evidence,'brief',{supportingDocuments:documents,generatedAt:'2026-10-19T20:00:00.000Z'});
  assert.match(html,/CONTINUE DILIGENCE/);
  assert.match(html,/Primary comparable set not yet classified/);
  assert.match(html,/Evidence discrepancy alert/);
  assert.match(html,/Gross spread before unentered expenses/);
  assert.match(html,/Illustrative ROI — incomplete costs/);
  assert.doesNotMatch(html,/class="sale-summary"/);
  assert.doesNotMatch(html,/Estimated net profit/);
  assert.doesNotMatch(html,/[A-Za-z]:\\Users\\|data[\\/]raw[\\/]/);
});

test('V2.6.2 HTML uses full-width ledger, explicit reconciliation language and investor-safe labels',()=>{
  const html=workspaceReportHtml(property,qaScenario,evidence,'full',{supportingDocuments:documents,generatedAt:'2026-10-19T20:00:00.000Z'});
  assert.match(html,/class="input-ledger"/);assert.doesNotMatch(html,/two-col ledger/);
  assert.match(html,/Modeled costs, returns &amp; purchase limits|Modeled costs, returns & purchase limits/);
  assert.match(html,/Comparable-supported ARV not established/);
  assert.match(html,/Difference — review · \+\$50,000\.00/);
  assert.match(html,/Difference — review · −\$5,000\.00/);
  assert.match(html,/Not reconciled — no structured document amount/);
  assert.doesNotMatch(html,/<td>[^<]*RC-SALE-\d{3}/);
  assert.equal((html.match(/Raw scenario identifiers/g)??[]).length,1);
});

test('V2.6 presentation leaves certified deterministic and Monte Carlo outputs invariant',()=>{
  const before=analyze(scenario,{risk:scenario.riskRequested});
  reportModel(property,scenario,{supportingDocuments:documents});
  const after=analyze(scenario,{risk:scenario.riskRequested});
  assert.deepEqual(after,before);
});
