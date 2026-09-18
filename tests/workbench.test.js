import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {fixture,preservation,manualDeal,compView} from '../src/workbench/model.js';
import {resolve,readJson} from '../src/io/files.js';
import {reportHtml} from '../src/reports/html.js';
import {resolveCached} from '../src/workbench/search.js';
test('Sprint 1/2 source artifacts remain byte-for-byte preserved',async()=>assert.equal((await preservation()).status,'PASS'));
test('Shared screen/report data matches all cached Sprint 2 scenarios and break-even',async()=>{
  const m=await fixture('fantasia');const old=await readJson('data/analysis/scenarios/fantasia-scenarios.json');
  assert.deepEqual(m.analysis.scenarios,old.scenarios);assert.equal(m.analysis.breakEven.salePrice,180000);
  assert.equal(m.analysis.base.modeledProfit,99000);assert.equal(m.valuationStatus,'CONFLICTING');
  assert.equal(m.comps.length,15);assert.equal(m.comps.filter(c=>c.mappable).length,15);
  assert.equal(m.metrics.find(x=>x.label==='Independent AVM').value,122000);
  assert.ok(m.metrics.every(x=>x.references.length));assert.equal(m.analysis.base.fullyBurdenedProfit,null);
});
test('Property mode has no manufactured deal assumptions; gates persist',async()=>{
  const m=await fixture('fantasia','property');assert.equal(m.analysis,null);assert.deepEqual(m.claims,[]);
  assert.equal((await fixture('bass')).state,'SOURCE_STOP');assert.equal((await fixture('joyce')).state,'AMBIGUOUS');
  assert.throws(()=>manualDeal({...m,state:'SOURCE_STOP'},{}),/IDENTITY_STOP/);
});
test('Missing coordinates and listing evidence are not discarded or relabeled',()=>{
  const c=compView({address:'Unknown',price:null,status:'Inactive',latitude:null,longitude:3},0);
  assert.equal(c.mappable,false);assert.equal(c.locationStatus,'Map location unavailable');assert.equal(c.priceText,'Unknown');assert.equal(c.badge,'Inactive');
});
test('Manual claims use core engine, require every base cost, preserve evidence and extra cash timing',async()=>{
  const orig=await fixture('fantasia','property');const payload={origin:'ANALYST_ENTERED',acquisition:160000,repairs:10000,sale:279000,rent:3000,commission:5000,escrow:2000,holdDays:90,otherKnownCost:1000,otherCashTiming:'UPFRONT'};
  const m=manualDeal(orig,payload);assert.equal(m.analysis.base.modeledProfit,98000);assert.equal(m.analysis.base.scenarioCashInvested,174000);assert.equal(m.analysis.breakEven.salePrice,181000);
  assert.deepEqual(m.property,orig.property);assert.deepEqual(orig.claims,[]);assert.ok(m.analysis.base.excludedUnknownCosts.every(c=>c.value===null));
  assert.ok(m.claims.some(c=>c.field==='spaceRentForHoldingPeriod'));assert.ok(!m.claims.some(c=>c.field==='spaceRentThreeMonths'));
  assert.deepEqual(m.analysis.breakEven.provenance,m.provenance);assert.deepEqual(m.analysis.sensitivity.provenance,m.provenance);
  assert.throws(()=>manualDeal(orig,{...payload,repairs:''}),/EXPLICIT_COSTS_REQUIRED/);
});
test('Optional additional disposition costs change profit but not upfront cash; missing AVM range is not a conflict',async()=>{
  const orig=await fixture('fantasia','property');orig.property.valuation.high=null;
  const m=manualDeal(orig,{origin:'ANALYST_ENTERED',acquisition:160000,repairs:10000,sale:279000,rent:4000,commission:5000,escrow:2000,holdDays:120,otherKnownCost:1000,otherCashTiming:'DISPOSITION'});
  assert.equal(m.analysis.base.modeledProfit,97000);assert.equal(m.analysis.base.scenarioCashInvested,174000);assert.equal(m.analysis.base.modeledProceeds,267000);
  assert.equal(m.valuationStatus,'INDEPENDENT_ONLY');assert.equal(m.analysis.costModel.monthlySpaceRent,1000);
});
test('Current shared break-even and sensitivity equal preserved Sprint 2 values',async()=>{
  const m=await fixture('fantasia');assert.deepEqual(m.analysis.breakEven,await readJson('data/analysis/break-even/fantasia-break-even.json'));
  assert.deepEqual(m.analysis.sensitivity.ranking,await readJson('data/analysis/sensitivity/fantasia-deterministic-ranking.json'));
});
test('Repeated cached model loads are deterministic',async()=>assert.deepEqual(await fixture('fantasia'),await fixture('fantasia')));
test('Missing baseline ratios remain unavailable in manual sensitivities',async()=>{
  const m=manualDeal(await fixture('fantasia','property'),{origin:'ANALYST_ENTERED',acquisition:0,repairs:0,sale:0,rent:0,commission:0,escrow:0,holdDays:90});
  assert.equal(m.analysis.base.cashOnCash,null);assert.equal(m.analysis.base.profitMargin,null);
  assert.ok(m.analysis.sensitivity.ranking.rows.every(r=>r.outputs.changeVsSponsorCashOnCashPercentagePoints===null&&r.outputs.changeVsSponsorProfitMarginPercentagePoints===null));
});
test('Cached-address normalization requires confirmation for partial / original identities and preserves gates',async()=>{
  assert.equal((await resolveCached('8426 Fantasia Park Way, Riverview, FL 33578')).model.state,'READY_PROPERTY');
  assert.equal((await resolveCached('8426 Fantasia Parkway, Riverview, FL')).state,'AMBIGUOUS');
  assert.equal((await resolveCached('131 Joyce Place')).state,'AMBIGUOUS');
  assert.equal((await resolveCached('Unknown address')).state,'ERROR');
});
test('Report presentation escapes evidence and uses deterministic shared values',async()=>{
  const m=await fixture('fantasia');m.address='<script>alert(1)</script>';const html=reportHtml(m);
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
  assert.match(html,/-\$58,000/);assert.match(html,/\$180,000/);assert.doesNotMatch(html,/investment recommendation|offering memorandum|guaranteed return|investment approval/i);
});
test('Client code is isolated from secrets and server engines',async()=>{
  async function walk(dir){const out=[];for(const e of await readdir(resolve(dir),{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
  const files=await walk('apps/web/src');
  for(const file of files){const content=await readFile(resolve(file),'utf8');assert.doesNotMatch(content,/RENTCAST_API_KEY|MARKET_DATA_API_KEY|process\.env|import\.meta\.env|src\/underwriting|src\/analysis|HomeAdvisor/);}
});
