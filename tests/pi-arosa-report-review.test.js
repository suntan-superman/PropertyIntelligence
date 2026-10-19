import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addRetainedPropertyResearch} from '../src/investment-workspace/retained-property-research.js';
import {addCachedPropertyResearch,mergeSales,mergeValuation} from '../src/investment-workspace/automatic-property-research.js';
import {reportModel} from '../src/investment-workspace/report-model.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {reportFilename,resolveReportFilenameCollision} from '../apps/web/src/features/investment-workspace/report-filename.js';

const valuationRef='data/raw/rentcast/property-research-v2-3/a30ec21aa9d123d5a5b099bda475275b4e70d23e7c2b7cc53093e9771714f597/343b644bce415a5a622c46fbe1bac39a5e392d3dedb0c895414d9b1e599f82c8.json';
const salesRef='data/raw/rentcast/property-research-v2-3/a30ec21aa9d123d5a5b099bda475275b4e70d23e7c2b7cc53093e9771714f597/70553016d660475892f56e6743ca600f6bc40cc9b25c29aebaf5d67555d3fae6.json';
const scenarioRef='data/runtime/investment-workspace-v1/scenarios/84dd0a9e-08e5-4b35-b1e2-a482c722f608.r1.json';
const generatedAt='2026-10-17T05:30:00.000Z';

async function arosa(){
  const evidence=await addRetainedPropertyResearch(await loadEvidence()),scenario=JSON.parse(await readFile(scenarioRef,'utf8'));
  let property=evidence.properties.find(item=>item.ref===scenario.propertyRef);
  property=mergeValuation(property,{...JSON.parse(await readFile(valuationRef,'utf8')),rawResponseRef:valuationRef});
  property=mergeSales(property,{...JSON.parse(await readFile(salesRef,'utf8')),rawResponseRef:salesRef});
  return {evidence,scenario,property};
}

test('Arosa report correction preserves financial engines and blocks unsupported investor-ready claims',async()=>{
  const {evidence,scenario,property}=await arosa(),{model,analysis}=reportModel(property,scenario,{generatedAt});
  assert.deepEqual({purchase:model.economics.purchasePrice.value,rehab:model.economics.rehab.value,exit:model.economics.resaleValue.value,total:analysis.deterministic.totalProjectCost,profit:analysis.deterministic.modeledProfit,roi:analysis.deterministic.roi,mao:analysis.mao.deterministic.purchasePrice},{purchase:260000,rehab:15000,exit:380000,total:275000,profit:105000,roi:105000/275000,mao:308000});
  assert.equal(model.research.available,3);assert.equal(model.research.included,0);assert.equal(model.resaleSupport.status,'UNSUPPORTED_NO_SELECTED_COMPS');
  assert.equal(model.valuation.price.value,403000);assert.equal(model.readiness.status,'NOT_INVESTOR_READY');assert.equal(model.costCompleteness.explicitZero,14);
  assert.equal(model.sellerFinancialPosition.mortgage.status,'OWNER_REPORTED_PAYOFF_CLAIM');assert.equal(model.sellerFinancialPosition.grossEquity,null);assert.equal(model.sellerFinancialPosition.estimatedSellerProceeds,null);assert.ok(model.sellerFinancialPosition.unresolvedObligations.includes('Other liens'));
  assert.ok(model.analystEvidence.entries.some(entry=>entry.displayLabel==='Owner-reported payoff claim — unverified'));
  assert.ok(model.analystEvidence.entries.some(entry=>entry.displayVerification==='Owner-reported $0; not verified tax clearance'));
  for(const kind of ['brief','full']){
    const html=workspaceReportHtml(property,scenario,evidence,kind,{generatedAt});
    assert.doesNotMatch(html,/data[\\/]raw|[a-f0-9]{64}\.json/i);assert.match(html,/Illustrative; material costs unentered\/assumed zero/);assert.match(html,/Address submitted for analysis; no verified distress evidence attached/);if(kind==='full'){assert.match(html,/Owner-reported payoff claim — unverified/);assert.match(html,/Not investor-ready|material assumptions and evidence require review/);}assert.match(html,/17860 Alps Dr/);assert.match(html,/22311 Zurich Dr/);assert.match(html,/22381 William Tell Trl/);
  }
});

test('successful retained Arosa research cache survives a local server restart without provider calls',async()=>{
  const retained=await addRetainedPropertyResearch(await loadEvidence()),hydrated=await addCachedPropertyResearch(retained),property=hydrated.properties.find(item=>item.ref==='RESEARCH-5E20929A08C8');
  assert.equal(property.avm.price,403000);assert.equal(property.sales.length,3);assert.deepEqual(property.sales.map(item=>item.address),['17860 Alps Dr, Tehachapi, CA 93561','22311 Zurich Dr, Tehachapi, CA 93561','22381 William Tell Trl, Tehachapi, CA 93561']);
});

test('property-based report filenames are deterministic, bounded and safe',()=>{
  const property={ref:'RESEARCH-5E20929A08C8',address:'21950 Arosa Road, Tehachapi, CA 93561',addressComponents:{street:'21950 Arosa Road',city:'Tehachapi',state:'CA',zip:'93561'}},scenario={propertyRef:property.ref,revision:1};
  assert.equal(reportFilename({property,scenario,kind:'brief',generatedAt}),'21950_Arosa_Rd_Tehachapi_CA_93561_Opportunity_Brief_2026-10-16_R1.pdf');
  assert.equal(reportFilename({property,scenario,kind:'full',generatedAt}),'21950_Arosa_Rd_Tehachapi_CA_93561_Full_Investor_Package_2026-10-16_R1.pdf');
  const unit=reportFilename({property:{ref:'P-2',addressComponents:{street:'12 Main Street Unit 4/B',city:'Taft',state:'CA'}},scenario:{revision:2},kind:'brief',generatedAt});assert.match(unit,/12_Main_St_Unit_4_B_Taft_CA_Opportunity_Brief_2026-10-16_R2\.pdf/);assert.doesNotMatch(unit,/[<>:"/\\|?*]/);
  const otherCity=reportFilename({property:{ref:'P-3',addressComponents:{street:'21950 Arosa Rd',city:'Bakersfield',state:'CA',zip:'93561'}},scenario:{revision:1},kind:'brief',generatedAt});assert.notEqual(otherCity,reportFilename({property,scenario,kind:'brief',generatedAt}));
  const fallback=reportFilename({property:{ref:'RESEARCH-ABC123',address:'../../CON'},scenario:{revision:1},kind:'full',generatedAt});assert.match(fallback,/^Property_ABC123_/);assert.ok(fallback.length<=180);assert.doesNotMatch(fallback,/\.\.|[<>:"/\\|?*]/);
  const long=reportFilename({property:{ref:'P-LONG',addressComponents:{street:`123 ${'Very Long Boulevard '.repeat(20)}`,city:'Bakersfield',state:'CA',zip:'93305'}},scenario:{revision:9},kind:'full',generatedAt});assert.ok(long.length<=180);
  const first=reportFilename({property,scenario,kind:'brief',generatedAt}),collision=resolveReportFilenameCollision(first,[first],property.ref);assert.notEqual(collision,first);assert.match(collision,/5E20929A08C8\.pdf$/);
});

test('server header, browser download and report registry share the generated filename',async()=>{
  const server=await readFile('src/investment-workspace/server.js','utf8'),workspace=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'),registry=await readFile('apps/web/src/features/desktop-shell/report-registry.js','utf8'),list=await readFile('apps/web/src/features/desktop-shell/MyWorkspace.jsx','utf8');
  assert.match(server,/reportFilename\(\{property:p,scenario:s,kind:input\.kind,generatedAt\}\)/);assert.match(server,/Content-Disposition.*filename/);
  assert.match(workspace,/headerName\?\?preview\.filename/);assert.match(workspace,/recordReportReference\(\{scenario:s,property:p,kind,status:'DOWNLOADED',filename\}\)/);
  assert.match(registry,/filename/);assert.match(list,/workspace-report-filename/);
});

