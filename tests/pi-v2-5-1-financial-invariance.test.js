import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {analyze,blankInputs} from '../src/investment-workspace/analysis.js';
import {VARIABLES} from '../src/analysis/monteCarlo/contract.js';
import {compareFinancialScenarios,financialScenarioProjection} from '../src/investment-workspace/financial-invariance.js';

const base=()=>({id:randomUUID(),propertyRef:'RESEARCH-QA',name:'Baseline',revision:1,savedAt:'2026-10-18T12:00:00.000Z',evidenceFingerprint:'snapshot-one',inputs:{...blankInputs(),purchasePrice:'120000',rehabCost:'30000',exitValue:'210000',contingency:'10',acquisitionFixed:'12500',renovationDays:'90',marketingDays:'30',targetRate:'15'},targetType:'PROFIT_MARGIN_ON_SALE',risk:{seed:'invariance-qa',iterations:1000,variables:{},rationale:''},riskRequested:false,demonstration:false,analystEvidence:[],evidenceAttachments:[],notes:'Baseline'});
const analyzed=scenario=>({...scenario,analysis:analyze(scenario,{risk:scenario.riskRequested===true})});

test('QA identity, timestamps, links, rationale and provenance fingerprints do not change the financial projection',()=>{
  const source=analyzed(base()),candidate=analyzed({...base(),id:randomUUID(),name:'Synthetic QA',revision:1,savedAt:'2026-10-19T12:00:00.000Z',demonstration:true,notes:'Synthetic rationale',evidenceAttachments:[{id:randomUUID(),fieldKey:'UNDERWRITING.REHABCOST',fieldLabel:'Estimated rehabilitation cost',documentId:'synthetic-document',version:1,filename:'fixture.pdf',description:'Synthetic',source:'QA',sourceDate:'2026-10-19',reviewStatus:'REVIEWED',confidentiality:'STANDARD',redistributionPermission:'APPROVED',scanStatus:'CLEAN',linkedAt:'2026-10-19T12:00:00.000Z'}]});
  const comparison=compareFinancialScenarios(source,candidate);assert.equal(comparison.equal,true);assert.deepEqual(financialScenarioProjection(source),financialScenarioProjection(candidate));
});

test('a changed underwriting input and its recalculated outputs fail invariance',()=>{
  const source=analyzed(base()),changed={...base(),inputs:{...base().inputs,purchasePrice:'121000'}};changed.analysis=analyze(changed,{risk:false});const comparison=compareFinancialScenarios(source,changed);assert.equal(comparison.equal,false);assert.notEqual(comparison.baselineHash,comparison.candidateHash);
});

test('a changed Monte Carlo or deterministic calculation result cannot be hidden as provenance',()=>{
  const source=analyzed(base()),tampered=structuredClone(source);tampered.analysis.deterministic.profit+=1;assert.equal(compareFinancialScenarios(source,tampered).equal,false);
  const variables=Object.fromEntries(VARIABLES.map(key=>[key,{min:'1',mode:'1',max:'1'}]));
  variables.exitValue={min:'190000',mode:'210000',max:'225000'};
  const withRisk={...base(),riskRequested:true,risk:{seed:'invariance-qa',iterations:1000,variables,rationale:'Synthetic regression bounds.'}};withRisk.analysis=analyze(withRisk,{risk:true});const riskTampered=structuredClone(withRisk);riskTampered.analysis.monteCarlo.results.profit.mean+=1;assert.equal(compareFinancialScenarios(withRisk,riskTampered).equal,false);
});
