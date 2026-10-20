import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GUIDED_STEPS,guidedStepForTab,guidedStepNavigation} from '../apps/web/src/features/investment-workspace/workflow.js';
import {identifyRoute,investmentRoute,routeContext,requestedSubject,requestedScenario} from '../apps/web/src/features/property-detail/navigation.js';
import {searchRetainedAddress} from '../apps/web/src/features/property-search/address-identity.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';

const root=process.cwd(),evidence=await addPropertyDetails(await loadEvidence(root),root);

test('guided analysis has exactly seven ordered steps backed by existing workspace tabs',()=>{
  assert.deepEqual(GUIDED_STEPS.map(step=>step.label),['Identify Property','Property Research','Comparable Sales','Seller & Property Evidence','Financial Analysis','Risk Analysis','Investor Reports']);
  assert.equal(guidedStepForTab('Overview').id,'research');
  assert.equal(guidedStepForTab('Sold Sales').id,'comparables');
  assert.equal(guidedStepForTab('Seller Financial Position').id,'evidence');
  assert.equal(guidedStepForTab('Underwriting').id,'financial');
  assert.equal(guidedStepForTab('Risk').id,'risk');
  assert.equal(guidedStepForTab('Reports').id,'reports');
});

test('guided navigation supports back, continue and skip destinations without changing scenario data',()=>{
  const research=guidedStepNavigation('Overview'),risk=guidedStepNavigation('Risk');
  assert.equal(research.previous.id,'identify');
  assert.equal(research.next.id,'comparables');
  assert.equal(risk.previous.id,'financial');
  assert.equal(risk.next.id,'reports');
  assert.equal(risk.next.tabs[0],'Reports');
});

test('guided and advanced routes retain exact subject, snapshot and scenario binding',()=>{
  const property=evidence.properties.find(item=>item.ref==='GABE-01'),scenario={id:'11111111-1111-4111-8111-111111111111',propertyRef:property.ref,evidenceFingerprint:property.evidenceFingerprint??evidence.fingerprint};
  for(const mode of ['guided','advanced']){
    const route=investmentRoute(property.ref,scenario.evidenceFingerprint,scenario.id,'Risk',mode),context=routeContext(route);
    assert.equal(context.mode,mode);
    assert.equal(context.tab,'Risk');
    assert.equal(requestedSubject(route,evidence.properties,evidence.fingerprint),property);
    assert.equal(requestedScenario(route,property.ref,[scenario],scenario.evidenceFingerprint),scenario);
  }
});

test('identify-step route preserves the exact subject snapshot and scenario context',()=>{
  const property=evidence.properties.find(item=>item.ref==='GABE-01'),scenario='11111111-1111-4111-8111-111111111111',context=routeContext(identifyRoute(property.ref,property.evidenceFingerprint,scenario));
  assert.equal(context.subject,property.ref);assert.equal(context.snapshot,property.evidenceFingerprint);assert.equal(context.scenario,scenario);
});

test('property and workspace navigation retain subject context when returning to Identify Property',async()=>{
  const shell=await readFile('apps/web/src/features/desktop-shell/Shell.jsx','utf8'),detail=await readFile('apps/web/src/features/property-detail/PropertyDetail.jsx','utf8'),workspace=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8');
  assert.match(shell,/guidedHref='#analyze-property'/);
  assert.match(shell,/href=\{guidedHref\}/);
  assert.match(detail,/ProductNav guidedHref=\{identifyRoute\(p\.ref,p\.evidenceFingerprint\?\?data\.evidenceFingerprint\)\}/);
  assert.match(workspace,/const identifyHref=p\?identifyRoute\(p\.ref,p\.evidenceFingerprint\?\?data\.evidenceFingerprint,activeId\):'#analyze-property'/);
  assert.match(workspace,/href=\{identifyHref\}>Identify property/);
  const discovery=await readFile('apps/web/src/features/discovery/Discovery.jsx','utf8');
  assert.match(discovery,/const bound=identifyRoute\(property\.ref,property\.evidenceFingerprint\?\?retainedFingerprint,addressResult\.resumeScenario\)/);
  assert.match(discovery,/history\.replaceState\(null,'',bound\)/);
});

test('Crestview abbreviation variants and Haven resolve without a provider request',()=>{
  const crestviewShort=searchRetainedAddress({street:'1708 Crestview Dr',city:'Bakersfield',state:'CA',zip:'93305'},evidence.properties),crestviewLong=searchRetainedAddress({street:'1708 Crestview Drive',city:'Bakersfield',state:'CA',zip:'93305'},evidence.properties),haven=searchRetainedAddress({street:'3484 Haven Street',city:'Rosamond',state:'CA',zip:'93560'},evidence.properties);
  assert.equal(crestviewShort.status,'MATCH');assert.equal(crestviewLong.status,'MATCH');assert.equal(crestviewShort.matches[0].ref,'GABE-01');assert.equal(crestviewLong.matches[0].ref,'GABE-01');
  assert.equal(haven.status,'MATCH');assert.equal(haven.matches[0].subjectKind,'DURABLE_SAVED');
});

test('guided UI reuses the original scenario, evidence, risk and report implementation',async()=>{
  const source=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8');
  for(const required of ['SellerFinancialPosition','ScenarioComparison','synchronizeRiskMostLikely','runRisk','saveAndPreview','Generate PDF','Open Advanced Workspace','Save &amp; Exit','GuidedWorkspaceHeader','ScenarioActionsMenu','Scenario actions','Change Property','identifyRoute'])assert.match(source,new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(source,/document\.addEventListener\('pointerdown',outside\)/);
  assert.match(source,/event\.key==='Escape'/);
  assert.match(source,/aria-expanded=\{open\}/);
  assert.match(source,/if\(mode==='guided'\)window\.scrollTo\(\{top:0,left:0,behavior:'auto'\}\)/);
  assert.match(source,/function returnToIdentify\(\)\{window\.scrollTo\(\{top:0,left:0,behavior:'auto'\}\)/);
  assert.doesNotMatch(source,/iw-guided-summary/);
  assert.doesNotMatch(source,/guidedScenarioStore|guidedEvidenceStore|guidedFinancialEngine/);
});

test('Save and Exit opens the exact saved analysis instead of the durable-properties tab',async()=>{
  const workspace=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8'),myWorkspace=await readFile('apps/web/src/features/desktop-shell/MyWorkspace.jsx','utf8');
  assert.match(workspace,/#saved-deals\?scenario=\$\{encodeURIComponent\(saved\.id\)\}/);
  assert.match(myWorkspace,/focusedScenarioFor/);
  assert.match(myWorkspace,/workspace-saved-notice/);
  assert.match(myWorkspace,/workspace-row-focus/);
});

test('unknown-address path uses one authenticated cost confirmation without passwords or manual tokens',async()=>{
  const [source,approval]=await Promise.all([readFile('apps/web/src/features/discovery/Discovery.jsx','utf8'),readFile('apps/web/src/features/property-research/paid-research.js','utf8')]);
  assert.match(source,/Research New Property/);
  assert.match(approval,/property-research\/quote/);
  assert.match(approval,/property-research\/research/);
  assert.match(approval,/Approve & Research/);
  assert.doesNotMatch(source,/property-research\/(?:preview|plan|authorize|run)/);
  assert.doesNotMatch(source,/passwordRef|researchPassword|Authorize and Run Research|request-bound authorization/);
  assert.match(source,/Start Guided Analysis/);
});
