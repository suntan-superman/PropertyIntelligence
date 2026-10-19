import assert from 'node:assert/strict';
import test from 'node:test';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {analyze} from '../src/investment-workspace/analysis.js';
import {newAnalystEvidence,validateAnalystEvidence} from '../src/investment-workspace/analyst-evidence.js';
import {deriveSellerFinancialPosition} from '../apps/web/src/features/investment-workspace/seller-position.js';
import {reportModel} from '../src/investment-workspace/report-model.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {reportScenario} from './fixtures/workspaceReports.js';

const evidence=await loadEvidence(),property=evidence.properties[0];
const entry=(category,value,{status='PRESENT',verificationClass='SOURCE_REPORTED',sourceName='QA evidence source',sourceDate='2026-10-15',attachmentReference=''}={})=>({...newAnalystEvidence(category),status,value:String(value),verificationClass,sourceName,sourceDate,attachmentReference});
const absent=category=>entry(category,'',{status:'ABSENT',verificationClass:'SOURCE_REPORTED'});

test('missing current balance, lien and tax evidence blocks equity instead of coercing unknown to zero',()=>{
  const position=deriveSellerFinancialPosition({providerValuation:300000,entries:[entry('ORIGINAL_PRINCIPAL',200000,{verificationClass:'RECORDED_DOCUMENT'})]});
  assert.equal(position.originalRecordedMortgage.amount,200000);
  assert.equal(position.mortgage.amount,null);assert.equal(position.knownObligations,null);assert.equal(position.grossEquity,null);assert.equal(position.estimatedSellerProceeds,null);
  assert.deepEqual(position.unresolvedObligations,['Current mortgage balance or verified payoff','Other liens','Delinquent property taxes']);
});

test('verified payoff supersedes estimated balance and original principal is never double counted',()=>{
  const entries=[entry('ORIGINAL_PRINCIPAL',240000,{verificationClass:'RECORDED_DOCUMENT'}),entry('ALGORITHMIC_BALANCE',175000),entry('VERIFIED_PAYOFF',168500,{verificationClass:'INDEPENDENTLY_VERIFIED'}),absent('LIEN'),absent('DELINQUENT_TAX')];
  const position=deriveSellerFinancialPosition({providerValuation:300000,entries});
  assert.equal(position.mortgage.status,'VERIFIED_PAYOFF');assert.equal(position.mortgage.amount,168500);assert.equal(position.knownObligations,168500);assert.equal(position.grossEquity,131500);
});

test('estimated balance remains explicitly estimated and multiple liens aggregate without entering investor costs',()=>{
  const entries=[entry('ALGORITHMIC_BALANCE',100000),entry('LIEN',10000,{verificationClass:'RECORDED_DOCUMENT'}),entry('LIEN',5000,{verificationClass:'RECORDED_DOCUMENT'}),absent('DELINQUENT_TAX')];
  const position=deriveSellerFinancialPosition({providerValuation:300000,entries});
  assert.equal(position.mortgage.status,'ESTIMATED_BALANCE');assert.equal(position.liens.amount,15000);assert.equal(position.knownObligations,115000);assert.equal(position.grossEquity,185000);
});

test('proposed sale price yields estimated proceeds and identifies negative equity before omitted costs',()=>{
  const entries=[entry('VERIFIED_PAYOFF',210000,{verificationClass:'INDEPENDENTLY_VERIFIED'}),entry('LIEN',15000,{verificationClass:'RECORDED_DOCUMENT'}),entry('DELINQUENT_TAX',5000),entry('PROPOSED_SALE_PRICE',200000,{verificationClass:'ANALYST_ASSUMPTION',sourceName:'Analyst proposed price'})];
  const position=deriveSellerFinancialPosition({providerValuation:250000,valuationBasis:'PROPOSED_SALE_PRICE',entries});
  assert.equal(position.knownObligations,230000);assert.equal(position.grossEquity,-30000);assert.equal(position.estimatedSellerProceeds,-30000);assert.equal(position.transactionCostsIncluded,false);assert.match(position.caveat,/commissions/);
});

test('analyst evidence validation enforces independently verified payoff and accepts proposed-price assumption',()=>{
  assert.throws(()=>validateAnalystEvidence([entry('VERIFIED_PAYOFF',100000)]),/independently verified/i);
  assert.doesNotThrow(()=>validateAnalystEvidence([entry('PROPOSED_SALE_PRICE',325000,{verificationClass:'ANALYST_ASSUMPTION',sourceName:'Analyst scenario'})]));
});

test('Full Investor Package shows sourced seller position while certified acquisition economics remain invariant',()=>{
  const scenario=reportScenario(evidence),before=analyze(scenario,{risk:scenario.riskRequested});scenario.sellerValuationBasis='PROVIDER_AVM';scenario.analystEvidence=[entry('ORIGINAL_PRINCIPAL',240000,{verificationClass:'RECORDED_DOCUMENT'}),entry('ALGORITHMIC_BALANCE',175000),entry('VERIFIED_PAYOFF',168500,{verificationClass:'INDEPENDENTLY_VERIFIED',sourceName:'Lender payoff demand',attachmentReference:'local-fixture/lender-payoff-demand.pdf'}),entry('LIEN',7500,{verificationClass:'RECORDED_DOCUMENT',sourceName:'Recorded lien index'}),entry('DELINQUENT_TAX',2200,{sourceName:'County tax statement'}),entry('PROPOSED_SALE_PRICE',310000,{verificationClass:'ANALYST_ASSUMPTION',sourceName:'Analyst proposed price'})];
  const {model,analysis}=reportModel(property,scenario),html=workspaceReportHtml(property,scenario,evidence,'full'),brief=workspaceReportHtml(property,scenario,evidence,'brief');
  assert.deepEqual(analysis,before);assert.equal(model.sellerFinancialPosition.mortgage.status,'VERIFIED_PAYOFF');assert.equal(model.sellerFinancialPosition.grossEquity,112800);assert.equal(model.sellerFinancialPosition.estimatedSellerProceeds,131800);
  for(const phrase of ['Seller Financial Position','$168,500','Lender-confirmed / independently verified payoff','$112,800','$131,800','before commissions, closing costs','never added to acquisition expenses or MAO'])assert.match(html,new RegExp(phrase.replaceAll('$','\\$'),'i'));
  assert.doesNotMatch(brief,/Seller Financial Position/);
});
