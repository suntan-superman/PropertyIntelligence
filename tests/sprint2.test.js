import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from '../src/io/files.js';
import { claimValues } from '../src/domain/deal.js';
import { costModel, UNKNOWN_WARNING } from '../src/underwriting/costModel.js';
import { evaluate } from '../src/underwriting/metrics.js';
import { evidenceCompleteness, valuationStatus } from '../src/analysis/evidenceCompleteness.js';
import { breakEven } from '../src/analysis/breakEven.js';
import { buildScenarios } from '../src/analysis/scenarios.js';
import { sensitivity } from '../src/analysis/sensitivity.js';
import {monteCarloReadiness,sponsorInformationRequest} from '../src/analysis/evidenceCompleteness.js';
import {checkPreservation} from '../src/analysis/inputs.js';
const portfolio = await readJson('data/deals/florida-portfolio.json');
const verification = await readJson('data/normalized/florida-verification.json');
const input = { portfolio, verification };
const values = claimValues(portfolio.deals.find(d=>d.id==='fantasia'));

test('Sprint 2 never changes sponsor claims or cached normalized evidence', () => {
  const before=JSON.stringify(input);
  evidenceCompleteness(input); buildScenarios(input); breakEven(input); sensitivity(input);
  assert.equal(JSON.stringify(input),before);
});
test('unknown costs remain null and incomplete outputs carry required warning', () => {
  const model=costModel(values);
  assert.ok(model.costs.filter(c=>c.status==='UNKNOWN').length>=11);
  assert.ok(model.costs.filter(c=>c.status==='UNKNOWN').every(c=>c.value===null));
  const output=evaluate(model);
  assert.equal(output.costCompleteness,'INCOMPLETE');
  assert.ok(output.warnings.includes(UNKNOWN_WARNING));
  assert.equal(output.modeledProfit,99000);
  assert.equal(output.scenarioCashInvested,173000);
  assert.equal(Number((output.cashOnCash*100).toFixed(1)),57.2);
  assert.equal(output.fullyBurdenedProfit,null);
});
test('unknown required base costs stop calculation rather than converting to zero', () => {
  assert.throws(()=>costModel({...values,estimatedRepairs:null}),/UNAVAILABLE/);
  assert.throws(()=>costModel({...values,spaceRentThreeMonths:undefined}),/UNAVAILABLE/);
});
test('Sprint 1 hashes are unchanged',async()=>{assert.equal((await checkPreservation()).status,'PASS');});
test('break-even and all signed repair/acquisition capacities',()=>{
  const result=breakEven(input);
  assert.equal(result.salePrice,180000);
  assert.equal(evaluate(costModel(values),{salePrice:result.salePrice}).modeledProfit,0);
  assert.deepEqual(result.capacities.map(r=>r.maximumRepairBudget),[109000,-48000,34000,-130000]);
  assert.deepEqual(result.capacities.map(r=>r.maximumAcquisitionPrice),[259000,102000,184000,20000]);
  assert.equal(result.capacities[0].holding.capacityDays,3060);
  assert.equal(result.capacities[1].holding.capacityDays,-1650);
  assert.equal(result.capacities[1].holding.feasibleDurationDays,null);
});
test('all required scenario families and exact modeled values',()=>{
  const result=buildScenarios(input);
  const byId=Object.fromEntries(result.scenarios.map(s=>[s.id,s.outputs]));
  assert.equal(result.scenarios.length,21);
  for(const [id,profit] of Object.entries({SPONSOR_CASE:99000,INDEPENDENT_AVM_POINT:-58000,
    INDEPENDENT_AVM_LOW:-140000,INDEPENDENT_AVM_HIGH:24000,SALE_MINUS_5:85050,
    SALE_MINUS_10:71100,SALE_MINUS_15:57150,SALE_MINUS_20:43200,
    REPAIR_PLUS_20:97000,REPAIR_PLUS_50:94000,REPAIR_PLUS_100:89000,
    AVM_HIGH_REPAIR_PLUS_0:24000,AVM_HIGH_REPAIR_PLUS_20:22000,AVM_HIGH_REPAIR_PLUS_50:19000,
    COMBINED_10_20:69100,COMBINED_15_50:52150,COMBINED_20_100:33200,
    HOLD_120:98000,HOLD_150:97000,HOLD_180:96000,HOLD_240:94000}))assert.equal(byId[id].modeledProfit,profit,id);
  assert.equal(byId.INDEPENDENT_AVM_POINT.changeVsSponsorDollars,-157000);
  assert.equal(byId.SPONSOR_CASE.changeVsSponsorCashOnCashPercentagePoints,0);
  assert.equal(byId.HOLD_120.scenarioCashInvested,174000);
});
test('holding derivation is explicit, excludes unknown recurring costs and never rewrites sponsor rent',()=>{
  const model=costModel(values),base=evaluate(model),held=evaluate(model,{holdDays:120});
  assert.equal(model.monthlySpaceRent,1000);
  assert.equal(model.derivation.status,'DERIVED_FROM_SPONSOR_AGGREGATE');
  assert.equal(base.includedCosts.spaceRent,3000);assert.equal(held.includedCosts.spaceRent,4000);
  assert.equal(base.modeledHoldingDays,90);assert.equal(base.sponsorTimelineDays,120);
  assert.ok(held.warnings.some(w=>w.includes('taxes, insurance, utilities')));
  assert.equal(evaluate(costModel({...values,spaceRentThreeMonths:0}),{holdDays:120}).status,'UNAVAILABLE');
});
test('sensitivity matrix dimensions and cells; fixed-dollar commission not sale percent',()=>{
  const result=sensitivity(input);
  assert.equal(result.sale.length,8);assert.equal(result.repair.length,6);assert.equal(result.holding.length,5);
  assert.equal(result.matrix.length,5);assert.ok(result.matrix.every(r=>r.cells.length===4));
  assert.deepEqual(result.matrix[0].cells.map(c=>c.modeledProfit),[99000,97000,94000,89000]);
  assert.deepEqual(result.matrix[4].cells.map(c=>c.modeledProfit),[-58000,-60000,-63000,-68000]);
  assert.equal(result.sale[0].outputs.modeledProfit,15300);
  assert.equal(result.sale[0].outputs.includedCosts.commission,5000);
  assert.deepEqual(result.ranking.rows.map(r=>r.absoluteDollarImpact),[27900,2000,1000,1000,400]);
  assert.deepEqual(result.ranking.rows.map(r=>r.rank),[1,2,3,3,5]);
});
test('valuation conflict requires a full independent range; provider is never verified',()=>{
  assert.equal(valuationStatus(279000,{low:40000,high:204000}),'CONFLICTING');
  assert.equal(valuationStatus(30000,{low:40000,high:204000}),'CONFLICTING');
  assert.equal(valuationStatus(279000,{price:122000}),'PARTIAL');
  assert.equal(valuationStatus(100000,{low:40000,high:204000}),'PARTIAL');
  assert.equal(valuationStatus(204000,{low:40000,high:204000},{comparable:true}),'SUPPORTED');
  const fields=evidenceCompleteness(input).properties[0].fields;
  const sale=fields.find(f=>f.field==='projectedResalePrice');
  assert.equal(sale.status,'CONFLICTING');assert.equal(sale.supportLevel,'SPONSOR_AND_INDEPENDENT_CONFLICT');
  assert.ok(sale.notes.some(n=>n.includes('not verified resale value')));
  assert.ok(sale.sources.some(s=>s.retrievedAt && s.reference.startsWith('data/raw/rentcast/')));
  assert.equal(fields.find(f=>f.field==='landTenure').status,'MISSING');
});
test('Bass and Joyce remain in all portfolio/evidence outputs with their original STOP states',()=>{
  const evidence=evidenceCompleteness(input);
  assert.equal(evidence.properties[1].resolutionStatus,'MANUFACTURED_REPRESENTATION_STOP');
  assert.equal(evidence.properties[2].resolutionStatus,'ADDRESS_AMBIGUOUS');
  assert.equal(evidence.properties[1].fields.find(f=>f.field==='avm').independentValue,null);
  assert.equal(evidence.properties[2].fields.find(f=>f.field==='address').status,'IDENTITY_UNRESOLVED');
  const portfolioOut=buildScenarios(input).portfolio;
  assert.equal(portfolioOut.sponsorCase.modeledProfit,151978);
  assert.equal(portfolioOut.independentCase.status,'INCOMPLETE');
  assert.equal(portfolioOut.independentCase.modeledProfit,null);
  assert.equal(portfolioOut.partialStress[0].modeledProfit,-5022);
  assert.ok(portfolioOut.partialStress.every(row=>row.label==='PARTIAL_PORTFOLIO_STRESS'));
});
test('Monte Carlo readiness is schema only and sponsor questions are not sent',()=>{
  const readiness=monteCarloReadiness(input);
  assert.equal(readiness.variables.length,11);
  assert.ok(readiness.variables.every(v=>v.distributionReady===false));
  assert.equal(readiness.variables[0].unresolvedConflict,true);
  const requests=sponsorInformationRequest();assert.equal(requests.status,'DRAFT_NOT_SENT');
  assert.ok(requests.requests.some(r=>r.propertyId==='bass'));assert.ok(requests.requests.some(r=>r.propertyId==='joyce'));
});
test('analysis is deterministic with finite numbers and no recommendation/probability fields',()=>{
  const build=()=>({evidence:evidenceCompleteness(input),scenarios:buildScenarios(input),breakEven:breakEven(input),sensitivity:sensitivity(input)});
  const actual=build();assert.deepEqual(actual,build());
  function walk(value){if(typeof value==='number')assert.ok(Number.isFinite(value));
    if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
      assert.ok(!['netProfit','investmentRecommendation','recommendedInvestment','probability','distribution','evidenceScore'].includes(key),key);walk(child);
    }}walk(actual);
  const zero=evaluate(costModel({...values,projectedListPrice:0,acquisitionCost:0,estimatedRepairs:0,spaceRentThreeMonths:0,salesCommission:0,escrowClosingCosts:0}));
  assert.equal(zero.cashOnCash,null);assert.equal(zero.profitMargin,null);
});
test('missing valuation and unsupported holding still yield explicit unavailable analytical rows',()=>{
  const copy=structuredClone(input);copy.verification.properties[0].property.valuation=null;
  const missing=buildScenarios(copy);
  assert.equal(missing.scenarios[0].saleAssumptionEvidenceStatus,'SPONSOR_ONLY');
  assert.equal(monteCarloReadiness(copy).variables[0].unresolvedConflict,false);
  assert.equal(missing.scenarios.find(s=>s.id==='INDEPENDENT_AVM_POINT').outputs.status,'UNAVAILABLE');
  assert.equal(missing.portfolio.partialStress[0].modeledProfit,null);
  assert.equal(breakEven(copy).capacities[1].status,'UNAVAILABLE');
  assert.equal(sensitivity(copy).matrix[4].cells[0].status,'UNAVAILABLE');
  copy.portfolio.deals[0].claims.find(c=>c.field==='spaceRentThreeMonths').value=0;
  assert.equal(sensitivity(copy).holding[0].outputs.status,'UNAVAILABLE');
});
