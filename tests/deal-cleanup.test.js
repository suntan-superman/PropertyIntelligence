import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,manualDeal} from '../src/workbench/model.js';
import {costModel} from '../src/underwriting/costModel.js';
import {dealCostModel} from '../src/underwriting/dealCostModel.js';
import {sensitivity} from '../src/analysis/sensitivity.js';
import {diligenceQuestions} from '../src/analysis/diligenceQuestions.js';

const explicitPayload={origin:'ANALYST_ENTERED',acquisition:160000,repairs:10000,sale:279000,rent:3000,
  commission:5000,acquisitionClosingCosts:1000,dispositionClosingCosts:2000,holdDays:90,
  otherKnownCost:null,otherCashTiming:'UPFRONT'};

test('manual deals distinguish acquisition and disposition closing costs without double counting',async()=>{
  const m=manualDeal(await fixture('fantasia','property'),explicitPayload);
  assert.equal(m.analysis.base.includedCosts.acquisitionClosingCosts,1000);
  assert.equal(m.analysis.base.includedCosts.dispositionClosingCosts,2000);
  assert.equal(m.analysis.base.scenarioCashInvested,174000);
  assert.equal(m.analysis.base.modeledProceeds,269000);
  assert.equal(m.analysis.base.modeledProfit,98000);
  assert.equal(m.analysis.costModel.costs.find(c=>c.field==='acquisitionClosingCosts').cashTiming,'UPFRONT');
  assert.equal(m.analysis.costModel.costs.find(c=>c.field==='dispositionClosingCosts').cashTiming,'DISPOSITION');
});

test('blank explicit closing costs stay unknown and explicit zero stays known zero',async()=>{
  const original=await fixture('fantasia','property');
  const blank=manualDeal(original,{...explicitPayload,acquisitionClosingCosts:null,dispositionClosingCosts:null});
  assert.equal(blank.analysis.base.includedCosts.acquisitionClosingCosts,undefined);
  assert.equal(blank.analysis.base.includedCosts.dispositionClosingCosts,undefined);
  assert.ok(blank.analysis.base.excludedUnknownCosts.some(c=>c.field==='acquisitionClosingCosts'&&c.value===null));
  assert.ok(blank.analysis.base.excludedUnknownCosts.some(c=>c.field==='dispositionClosingCosts'&&c.value===null));
  const zero=manualDeal(original,{...explicitPayload,acquisitionClosingCosts:0,dispositionClosingCosts:0});
  assert.equal(zero.analysis.base.includedCosts.acquisitionClosingCosts,0);
  assert.equal(zero.analysis.base.includedCosts.dispositionClosingCosts,0);
});

test('legacy Fantasia escrow arithmetic remains unchanged',async()=>{
  const m=await fixture('fantasia');
  assert.equal(m.analysis.base.modeledProfit,99000);
  assert.equal(m.analysis.base.scenarioCashInvested,173000);
  assert.equal(m.analysis.base.cashOnCash,99000/173000);
  assert.equal(m.analysis.breakEven.salePrice,180000);
});

test('unsupported holding sensitivity is unavailable and not ranked; partial holding is labeled',async()=>{
  const original=await fixture('fantasia','property');
  const noRent=manualDeal(original,{...explicitPayload,rent:0});
  const hold=noRent.analysis.sensitivity.holding[0].outputs;
  assert.equal(hold.status,'UNAVAILABLE');
  assert.equal(hold.profitImpact,null);
  assert.equal(hold.reason,'RECURRING_HOLDING_COSTS_UNKNOWN');
  assert.ok(!noRent.analysis.sensitivity.ranking.rows.some(r=>r.label==='Holding +30 days'));
  assert.ok(noRent.analysis.sensitivity.ranking.unavailable.some(r=>r.label==='Holding +30 days'));
  const partial=manualDeal(original,explicitPayload);
  const partialHold=partial.analysis.sensitivity.holding[0].outputs;
  assert.equal(partialHold.status,'PARTIAL');
  assert.match(partialHold.basis,/supplied recurring holding costs/);
});

test('diligence questions are deterministic, deal-aware and manufactured-conditional',()=>{
  const manufactured=diligenceQuestions({
    id:'synthetic',claimOrigin:'SPONSOR_SUPPLIED',property:{propertyType:'Manufactured',comps:[{status:'Active'}],valuation:{low:40000,high:204000}},
    claims:[{field:'acquisitionCost',value:160000},{field:'projectedListPrice',value:279000},{field:'estimatedRepairs',value:10000},{field:'holdDays',value:120},{field:'salesCommission',value:5000}],
    evidence:[{field:'projectedResalePrice',status:'CONFLICTING',independentValue:{low:40000,high:204000}},{field:'comparables',status:'PARTIAL',independentValue:[{}]}]
  });
  assert.ok(manufactured.some(q=>q.category==='Acquisition'&&/purchase agreement|acquisition price/i.test(q.question)));
  assert.ok(manufactured.some(q=>q.category==='Valuation'&&/outside|diverg/i.test(q.question)));
  assert.ok(manufactured.some(q=>q.category==='Manufactured / Community'));
  assert.ok(manufactured.every(q=>q.status==='UNANSWERED'&&q.relatedFields?.length));
  const sfr=diligenceQuestions({id:'sfr',claimOrigin:'ANALYST_ENTERED',property:{propertyType:'Single Family',comps:[],valuation:null},claims:[],evidence:[]});
  assert.ok(!sfr.some(q=>q.category==='Manufactured / Community'));
});

test('cost model exposes explicit closing timing and unknown values without zero substitution',()=>{
  const model=dealCostModel({projectedListPrice:279000,acquisitionCost:160000,estimatedRepairs:10000,spaceRentThreeMonths:3000,salesCommission:5000,acquisitionClosingCosts:null,dispositionClosingCosts:0});
  assert.equal(model.costs.find(c=>c.field==='acquisitionClosingCosts').status,'UNKNOWN');
  assert.equal(model.costs.find(c=>c.field==='acquisitionClosingCosts').value,null);
  assert.equal(model.costs.find(c=>c.field==='dispositionClosingCosts').value,0);
  assert.equal(model.costs.find(c=>c.field==='dispositionClosingCosts').cashTiming,'DISPOSITION');
});
