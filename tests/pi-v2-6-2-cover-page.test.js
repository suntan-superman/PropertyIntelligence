import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {analyze} from '../src/investment-workspace/analysis.js';
import {restoreDurablePropertyEvidence} from '../src/investment-workspace/automatic-property-research.js';
import {addQaAcceptanceLabel} from '../src/investment-workspace/document-appendices.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';

const root=path.resolve(import.meta.dirname,'..'),generatedAt='2026-10-19T20:00:00.000Z',sha=value=>createHash('sha256').update(value).digest('hex');
let evidence=await loadEvidence(root);
evidence=await restoreDurablePropertyEvidence(evidence,[{sourceSubjectRef:'RESEARCH-EB66B8421C47',addressComponents:{street:'400 Decatur St',city:'Bakersfield',state:'CA',zip:'93308'},evidenceSnapshotIds:['3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71']}]);
const load=async relative=>{const scenario=JSON.parse(await readFile(path.join(root,relative),'utf8')),property=evidence.properties.find(item=>item.ref===scenario.propertyRef);assert.ok(property);return {scenario,property};};
const decatur=await load('data/runtime/investment-workspace-v1/scenarios/6f7b1d62-0e91-4da1-9e31-250101000101.r1.json');
const normal=await load('data/runtime/investment-workspace-v1/scenarios/0f75719a-293b-4b29-bace-d3c5b71a4b20.r2.json');
const withoutCover=html=>html.replace(/<!-- PI_FULL_PACKAGE_COVER_START -->[\s\S]*?<!-- PI_FULL_PACKAGE_COVER_END -->/,'');
const baselines={
  decatur:{full:'f12d00f67d70af720cf17a926b74bdfcbc2b8b4da89e44c807b001ffccd3312d',brief:'abfed1a8d4e9dc1cb3e2f7ce64a9d3d24d189bb80ac97a5731e9c9e838985131',analysis:'cedab2938a71df32c483e2721d8660a5fe780b8c41380b121aa5560bebd20f52'},
  normal:{full:'ad89501e77dd5768792ef22b41a2dbfe5917fac6a39b7e285344b8bc8309fc91',brief:'5405bc46c7787969f52a570800a922f49b466ad94df9505a85b037154708d118',analysis:'7a5f8e022aeb1d64d5dace3ce31535286272d4233105676cf5fe435683b17aa9'}
};

test('Full Investor Package begins with the approved dynamic cover and provisional investor disclaimer',()=>{
  const html=workspaceReportHtml(normal.property,normal.scenario,evidence,'full',{generatedAt});
  assert.ok(html.indexOf('PI_FULL_PACKAGE_COVER_START')<html.indexOf('snapshot full'));
  assert.match(html,/FULL INVESTOR PACKAGE/);
  assert.match(html,/1708 Crestview Dr/);
  assert.match(html,/Bakersfield, CA 93305/);
  assert.match(html,/October 19, 2026/);
  assert.match(html,/PRELIMINARY — FOR INFORMATIONAL PURPOSES/);
  assert.match(html,/This report is not an appraisal, title report, legal opinion, investment recommendation or guarantee of future performance/);
  assert.doesNotMatch(html,/future legal review/i);
});

test('synthetic scenario can never receive ordinary preliminary cover classification',()=>{
  const html=workspaceReportHtml(decatur.property,decatur.scenario,evidence,'full',{generatedAt});
  assert.match(html,/data-report-classification="SYNTHETIC_QA"/);
  assert.match(html,/SYNTHETIC QA \/ NOT FOR INVESTOR DISTRIBUTION/);
  assert.doesNotMatch(html,/data-report-classification="PRELIMINARY"/);
  const labeled=addQaAcceptanceLabel(html);
  assert.ok(labeled.indexOf('PI_FULL_PACKAGE_COVER_END')<labeled.indexOf('<div class="pi-qa-acceptance-notice">'));
});

test('V2.8.2 checklist integration preserves the approved cover, core report content and all calculations',()=>{
  for(const [name,fixture] of Object.entries({decatur,normal})){
    const full=workspaceReportHtml(fixture.property,fixture.scenario,evidence,'full',{generatedAt}),analysis=analyze(fixture.scenario,{risk:fixture.scenario.riskRequested});
    assert.match(withoutCover(full),/Investment Due Diligence Checklist/);
    assert.match(full,/Project economics · complete input ledger/);
    assert.match(full,/Sources, dates &amp; licensing boundaries|Sources, dates & licensing boundaries/);
    assert.equal(sha(JSON.stringify(analysis)),baselines[name].analysis);
  }
});

test('Opportunity Brief remains compact, has no cover and preserves calculations',()=>{
  for(const [name,fixture] of Object.entries({decatur,normal})){
    const brief=workspaceReportHtml(fixture.property,fixture.scenario,evidence,'brief',{generatedAt}),analysis=analyze(fixture.scenario,{risk:fixture.scenario.riskRequested});
    assert.doesNotMatch(brief,/PI_FULL_PACKAGE_COVER|FULL INVESTOR PACKAGE/);
    assert.match(brief,/class="checklist-summary"/);
    assert.doesNotMatch(brief,/class="checklist-table"/);
    assert.equal(sha(JSON.stringify(analysis)),baselines[name].analysis);
  }
});
