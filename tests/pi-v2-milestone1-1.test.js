import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {WORKFLOW_STAGES,normalizeWorkspaceTab,stageForTab,illustrativeRiskAssumptions,hasCustomRiskValues,scenarioAnalysis} from '../apps/web/src/features/investment-workspace/workflow.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {blankInputs} from '../src/investment-workspace/analysis.js';
import {createStore} from '../src/investment-workspace/store.js';

test('five stages retain every legacy subview and aliases',()=>{
  assert.deepEqual(WORKFLOW_STAGES.map(stage=>stage.label),['Property Research','Comparable Sales','Seller & Property Evidence','Financial Analysis','Investor Reports']);
  assert.equal(stageForTab('Sold Sales').id,'comparables');
  assert.equal(stageForTab('Seller Financial Position').id,'evidence');
  assert.equal(normalizeWorkspaceTab('Compare'),'Scenarios');
  assert.equal(normalizeWorkspaceTab('MonteCarlo'),'Risk');
  assert.equal(normalizeWorkspaceTab('nonsense'),'Underwriting');
});

test('illustrative distributions derive exactly from current positive assumptions',()=>{
  const seeded=illustrativeRiskAssumptions({exitValue:'280000',rehabCost:'15000',renovationDays:'90',marketingDays:'30'});
  assert.equal(seeded.ok,true);
  assert.deepEqual(seeded.variables.exitValue,{min:'252000',mode:'280000',max:'294000'});
  assert.deepEqual(seeded.variables.rehabCost,{min:'15000',mode:'18000',max:'24000'});
  assert.deepEqual(seeded.variables.renovationDays,{min:'75',mode:'90',max:'120'});
  assert.deepEqual(seeded.variables.marketingDays,{min:'20',mode:'30',max:'60'});
});

test('missing or zero bases do not silently create risk distributions',()=>{
  const seeded=illustrativeRiskAssumptions({exitValue:'280000',rehabCost:'0',renovationDays:'',marketingDays:'30'});
  assert.equal(seeded.ok,false);
  assert.deepEqual(seeded.missing,['rehabCost','renovationDays']);
  assert.equal(hasCustomRiskValues({variables:{exitValue:{min:'1'}}}),true);
  assert.equal(hasCustomRiskValues({variables:{}}),false);
});

test('dirty comparison uses only matching calculated preview and never invents loss',()=>{
  const scenario={id:'draft',dirty:true,inputs:{purchasePrice:'175000'},targetType:'CASH_ON_CASH',risk:{variables:{}}};
  const key=JSON.stringify([scenario.id,scenario.inputs,scenario.targetType,scenario.risk]);
  const analysis={deterministic:{modeledProfit:1},mao:{deterministic:{purchasePrice:2}},monteCarlo:null};
  assert.equal(scenarioAnalysis(scenario,{draft:{key,analysis}}).label,'Unsaved draft — calculated preview');
  assert.equal(scenarioAnalysis({...scenario,inputs:{purchasePrice:'1'}},{draft:{key,analysis}}).analysis,null);
});

test('saved revision history remains append-only and available for comparison',async()=>{
  const evidence=await loadEvidence(),property=evidence.properties[0],directory=await mkdtemp(path.join(os.tmpdir(),'pi-m1-1-')),store=createStore(directory,evidence);
  const draft={id:randomUUID(),propertyRef:property.ref,name:'Revision one',revision:0,evidenceFingerprint:property.evidenceFingerprint??evidence.fingerprint,inputs:blankInputs(),targetType:'PROFIT_MARGIN_ON_SALE',risk:{variables:{},seed:'',iterations:1000,rationale:''},compReviews:{},analystEvidence:[],sellerValuationBasis:'PROVIDER_AVM',notes:'',demonstration:false,riskRequested:false};
  const one=await store.save(draft),two=await store.save({...one,name:'Revision two'}),history=await store.all();
  assert.deepEqual(history.map(item=>[item.revision,item.name]),[[1,'Revision one'],[2,'Revision two']]);
  assert.equal(history[0].id,history[1].id);
});

test('workflow UI does not import or rewrite certified financial engines',async()=>{
  const source=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8');
  assert.doesNotMatch(source,/src\/analysis|src\/underwriting|runMonteCarlo|deterministicMao/);
});
