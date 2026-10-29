import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {readFile} from 'node:fs/promises';
import {reportModel} from '../src/investment-workspace/report-model.js';
import {dueDiligenceChecklistPages,workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {supportingEvidenceHtml,addSupportingEvidenceToHtml} from '../src/investment-workspace/document-appendices.js';
import {groupComparableObservations,normalizedComparableAddress} from '../apps/web/src/features/investment-workspace/comparable-identity.js';
import {reportFilename} from '../apps/web/src/features/investment-workspace/report-filename.js';
import {reportScenario} from './fixtures/workspaceReports.js';

const evidence=await loadEvidence(),property=evidence.properties[0],scenario=reportScenario(evidence);

test('the diligence checklist is evidence-aware and assumptions do not become verification',()=>{
  const {model}=reportModel(property,scenario);
  const checklist=model.dueDiligenceChecklist;
  assert.equal(checklist.propertyAddress,property.address);
  assert.equal(checklist.scenarioName,scenario.name);
  assert.equal(checklist.revision,scenario.revision);
  assert.ok(checklist.outstanding.some(item=>item.category==='Valuation'&&item.status==='Analyst assumption only'));
  assert.ok(checklist.outstanding.some(item=>item.category==='Rehabilitation'&&item.status==='Analyst assumption only'));
  assert.ok(checklist.outstanding.some(item=>item.category==='Title and seller obligations'));
  assert.match(checklist.overallStatus,/Material diligence outstanding/);
});

test('three reviewed Primary sales move valuation to completed without claiming a verified ARV',()=>{
  const reviewed=structuredClone(scenario);reviewed.compReviews={};
  for(const sale of property.sales.slice(0,3))reviewed.compReviews[sale.evidenceRef]={include:true,role:'PRIMARY',notes:'Reviewed for proximity, size and date; condition and transfer terms remain unverified.'};
  const checklist=reportModel(property,reviewed).model.dueDiligenceChecklist;
  assert.ok(checklist.completed.some(item=>item.category==='Valuation'&&/not independently established/.test(item.information)));
  assert.ok(!checklist.outstanding.some(item=>item.category==='Valuation'));
});

test('checklist pagination preserves every item and identifies continuation pages',()=>{
  const outstanding=Array.from({length:17},(_,index)=>({priority:index<3?'Critical':'Important',category:`Category ${index+1}`,missingInformation:`Missing ${index+1}`,why:`Why ${index+1}`,recommendedAction:`Action ${index+1}`,status:'Missing'}));
  const pages=dueDiligenceChecklistPages({dueDiligenceChecklist:{title:'Investment Due Diligence Checklist',propertyAddress:'Test address',scenarioName:'Test scenario',revision:1,analysisDate:'2026-10-20T00:00:00.000Z',overallStatus:'Preliminary',outstanding,completed:[],nextRecommendedActions:['Action 1'],counts:{critical:3,important:14,total:17},footer:'Preliminary'}});
  assert.equal(pages.length,2);assert.match(pages[1],/continued 2 of 2/);
  for(const entry of outstanding)assert.equal(pages.filter(page=>page.includes(`>${entry.missingInformation}<`)).length,1);
});

test('Kern source notice is included only for actual Kern-derived evidence',()=>{
  const kern=workspaceReportHtml(property,scenario,evidence,'full');
  assert.match(kern,/Kern County source disclaimer/);
  const lancaster=structuredClone(property),lancasterScenario=structuredClone(scenario);
  lancaster.ref='RESEARCH-LANCASTER';lancaster.address='40924 173rd St E, Lancaster, CA 93535';lancaster.addressComponents={street:'40924 173rd St E',city:'Lancaster',state:'CA',zip:'93535'};lancaster.city='Lancaster';lancaster.attributes.county='Los Angeles';lancaster.historicalTrigger={kind:'COUNTY_TAX_RECORD',amount:1200,sourceDate:'2026-09-01',sourceRef:'Los Angeles County tax source',meaning:'Historical county source'};lancaster.countyUse={code:'R1',sourceRef:'Los Angeles County use source'};lancaster.researchProvenance=[];lancasterScenario.propertyRef=lancaster.ref;
  const html=workspaceReportHtml(lancaster,lancasterScenario,{...evidence,properties:[lancaster]},'full');
  assert.doesNotMatch(html,/Kern County source disclaimer|Kern County source notice applies/);
  assert.match(html,/Los Angeles/);
});

test('empty document registers and Opportunity Brief attachment pages are suppressed',()=>{
  const document=[{index:1,document:{documentType:'OTHER',description:'Support',reviewStatus:'REVIEWED',currentVersion:1},version:{version:1},claims:[]}];
  assert.equal(supportingEvidenceHtml([],{kind:'full'}),'');
  assert.equal(supportingEvidenceHtml(document,{kind:'brief'}),'');
  assert.equal(supportingEvidenceHtml(document,{kind:'checklist'}),'');
  assert.equal(addSupportingEvidenceToHtml('<html><body>brief</body></html>',document,{kind:'brief'}),'<html><body>brief</body></html>');
  assert.match(supportingEvidenceHtml(document,{kind:'full'}),/Supporting document appendix index/);
});

test('comparable grouping consolidates directional variants but preserves observations and flags uncertainty',()=>{
  assert.equal(normalizedComparableAddress('40912 168th St E, Lancaster, CA 93535'),normalizedComparableAddress('40912 E 168th Street, Lancaster, CA 93535'));
  const rows=[
    {evidenceRef:'a',address:'40912 168th St E, Lancaster, CA 93535',saleDate:'2026-06-01',salePrice:300000,squareFootage:1200,propertyType:'Single Family'},
    {evidenceRef:'b',address:'40912 E 168th Street, Lancaster, CA 93535',saleDate:'2026-06-01',salePrice:300000,squareFootage:1200,propertyType:'Single Family'},
    {evidenceRef:'c',address:'40912 E 168th St, Lancaster, CA 93535',saleDate:'2024-05-01',salePrice:67500,squareFootage:1200,propertyType:'Single Family'},
    {evidenceRef:'d',address:'41000 170th St E, Lancaster, CA 93535',saleDate:'2026-06-10',salePrice:325000,squareFootage:1180,propertyType:'Single Family'}
  ],groups=groupComparableObservations(rows);
  assert.equal(groups.length,3);assert.equal(groups[0].records.length,2);assert.equal(groups[0].identityStatus,'DUPLICATE_ESTABLISHED');
  assert.equal(groups[1].identityStatus,'POSSIBLE_DUPLICATE');assert.ok(groups[1].reviewFlags.some(flag=>/Unusual transaction price/.test(flag)));
  assert.deepEqual(groups.flatMap(group=>group.records.map(row=>row.evidenceRef)).sort(),['a','b','c','d']);
});

test('Comparable Sales UI renders one row per logical transaction while keeping underlying records',async()=>{
  const source=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8');
  assert.match(source,/groups\.map\(group=>/);assert.doesNotMatch(source,/groups\.flatMap\(group=>group\.records\.map/);
  assert.match(source,/source observations represent one logical transaction; underlying observations are preserved/);
});

test('Opportunity Brief has only a concise checklist summary while full and standalone outputs retain details',()=>{
  const brief=workspaceReportHtml(property,scenario,evidence,'brief'),full=workspaceReportHtml(property,scenario,evidence,'full'),checklist=workspaceReportHtml(property,scenario,evidence,'checklist');
  assert.match(brief,/class="checklist-summary"/);assert.doesNotMatch(brief,/class="checklist-table"/);
  assert.match(full,/class="checklist-table"/);assert.match(checklist,/Investment Due Diligence Checklist/);
  assert.doesNotMatch(checklist,/FULL INVESTOR PACKAGE|Supporting document appendix index/);
});

test('standalone checklist filenames are deterministic and investor-safe',()=>{
  const filename=reportFilename({property,scenario,kind:'checklist',generatedAt:'2026-10-20T12:00:00.000Z'});
  assert.match(filename,/Investment_Due_Diligence_Checklist_2026-10-20_R2\.pdf$/);
});
