import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {reportScenario} from './fixtures/workspaceReports.js';

test('workspace comparables are address-first and raw references require Source Details',async()=>{
  const workspace=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'),sourceDetails=await readFile('apps/web/src/components/SourceDetails.jsx','utf8');
  for(const heading of ['Property address','Sold price and date','Property characteristics','Distance and relevance','Include / review'])assert.match(workspace,new RegExp(heading,'i'));
  assert.match(workspace,/Include \$\{address\} in research/);
  assert.match(workspace,/Review Comparable/);
  assert.match(workspace,/Internal evidence reference/);
  assert.doesNotMatch(workspace,/data-sale-ref/);
  assert.match(sourceDetails,/<details/);
  assert.match(sourceDetails,/<summary>/);
});

test('property research, listings and map views keep raw identifiers behind disclosures',async()=>{
  const workspace=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'),comps=await readFile('apps/web/src/features/comps-map/Comps.jsx','utf8'),map=await readFile('apps/web/src/features/comps-map/mapData.js','utf8');
  assert.match(workspace,/RentCast retained valuation evidence/);
  assert.match(workspace,/ListingsTable/);
  assert.match(comps,/SourceDetails/);
  assert.doesNotMatch(comps,/RentCast · \{.*sourceReference/);
  assert.doesNotMatch(map,/\['Source reference',c\.sourceReference\]/);
});

test('investor report renders public comparable references but never private source paths',async()=>{
  const evidence=await loadEvidence(),property=evidence.properties[0],scenario=reportScenario(evidence),html=workspaceReportHtml(property,scenario,evidence,'full');
  assert.doesNotMatch(html,/(?:[A-Za-z]:\\Users\\|data[\\/](?:raw|runtime)[\\/])/i);
  const addressIndex=html.indexOf(property.sales[0].address),publicReferenceIndex=html.indexOf('RC-SALE-001');
  assert.ok(addressIndex>=0&&publicReferenceIndex>addressIndex);
  assert.ok(scenario.compReviews[property.sales[0].evidenceRef].include);
  assert.match(html,/Research only; condition and transfer terms require verification/);
});
