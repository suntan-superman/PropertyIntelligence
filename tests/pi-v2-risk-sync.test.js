import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEFAULT_RISK_SEED,RISK_VALUE_ORIGINS,editRiskValue,hasCustomRiskValues,illustrativeRiskAssumptions,markIllustrativeRiskValues,riskReadiness,riskValueOrigin,synchronizeRiskMostLikely} from '../apps/web/src/features/investment-workspace/workflow.js';

const inputs=(exitValue='315000',rehabCost='40000',renovationDays='90',marketingDays='30')=>({exitValue,rehabCost,renovationDays,marketingDays});
const blankRisk=()=>({variables:{},valueOrigins:{},seed:'',iterations:1000,rationale:''});

test('valid underwriting assumptions initialize Most Likely and a reproducible seed without creating ranges',()=>{
  const synchronized=synchronizeRiskMostLikely(blankRisk(),inputs());
  assert.equal(synchronized.changed,true);
  assert.equal(synchronized.risk.seed,DEFAULT_RISK_SEED);
  assert.deepEqual(Object.fromEntries(Object.entries(synchronized.risk.variables).map(([key,value])=>[key,value.mode])),{exitValue:'315000',rehabCost:'40000',renovationDays:'90',marketingDays:'30'});
  for(const key of Object.keys(synchronized.risk.variables)){
    assert.equal(riskValueOrigin(synchronized.risk,key,'mode'),RISK_VALUE_ORIGINS.INHERITED);
    assert.equal(riskValueOrigin(synchronized.risk,key,'min'),'UNSET');
    assert.equal(riskValueOrigin(synchronized.risk,key,'max'),'UNSET');
  }
});

test('underwriting changes update inherited values but preserve manual overrides',()=>{
  let risk=synchronizeRiskMostLikely(blankRisk(),inputs()).risk;
  risk=editRiskValue(risk,'exitValue','mode','325000');
  risk=synchronizeRiskMostLikely(risk,inputs('350000','45000','100','40')).risk;
  assert.equal(risk.variables.exitValue.mode,'325000');
  assert.equal(riskValueOrigin(risk,'exitValue','mode'),RISK_VALUE_ORIGINS.MANUAL);
  assert.equal(risk.variables.rehabCost.mode,'45000');
  assert.equal(risk.variables.renovationDays.mode,'100');
  assert.equal(risk.variables.marketingDays.mode,'40');
});

test('illustrative preset is labeled and is not silently rewritten by later underwriting changes',()=>{
  const seeded=illustrativeRiskAssumptions(inputs());assert.equal(seeded.ok,true);
  const risk=markIllustrativeRiskValues({...blankRisk(),seed:DEFAULT_RISK_SEED},seeded.variables);
  const synchronized=synchronizeRiskMostLikely(risk,inputs('350000','45000','100','40')).risk;
  assert.equal(synchronized.variables.exitValue.mode,'315000');
  assert.equal(synchronized.variables.rehabCost.mode,'48000');
  for(const key of Object.keys(synchronized.variables))for(const bound of ['min','mode','max'])assert.equal(riskValueOrigin(synchronized,key,bound),RISK_VALUE_ORIGINS.ILLUSTRATIVE);
});

test('legacy saved values are preserved as manual and saved metadata survives restoration',()=>{
  const legacy={variables:{exitValue:{min:'280000',mode:'300000',max:'330000'}},seed:'saved-seed',iterations:500,rationale:'Saved analyst rationale'};
  const synchronized=synchronizeRiskMostLikely(legacy,inputs()).risk;
  assert.equal(synchronized.variables.exitValue.mode,'300000');
  assert.equal(riskValueOrigin(synchronized,'exitValue','mode'),RISK_VALUE_ORIGINS.MANUAL);
  assert.equal(synchronized.seed,'saved-seed');
  assert.equal(hasCustomRiskValues(synchronized),true);
  assert.deepEqual(JSON.parse(JSON.stringify(synchronized)),synchronized);
});

test('scenario risk records remain isolated and invalid inherited inputs clear rather than leak',()=>{
  const first=synchronizeRiskMostLikely(blankRisk(),inputs('315000')).risk;
  const second=synchronizeRiskMostLikely(blankRisk(),inputs('220000','25000','60','20')).risk;
  const firstEdited=editRiskValue(first,'exitValue','mode','330000');
  assert.equal(second.variables.exitValue.mode,'220000');
  assert.equal(synchronizeRiskMostLikely(second,inputs('','25000','60','20')).risk.variables.exitValue.mode,'');
  assert.equal(firstEdited.variables.exitValue.mode,'330000');
});

test('Monte Carlo readiness requires every displayed range and required supporting field',()=>{
  const variables=Object.fromEntries(['exitValue','rehabCost','renovationDays','marketingDays'].map(key=>[key,{min:'1',mode:'2',max:'3'}])),valid={variables,seed:'12345',iterations:'1000',rationale:'Analyst-selected bounds based on the current scenario.'};
  assert.deepEqual(riskReadiness(valid),{ready:true,missing:[]});
  const incomplete=riskReadiness({...valid,variables:{...variables,rehabCost:{min:'',mode:'2',max:'1'}},seed:'',iterations:'99',rationale:' '});
  assert.equal(incomplete.ready,false);assert.deepEqual(incomplete.missing,['rehabCost.min','seed','iterations','rationale']);
  const unordered=riskReadiness({...valid,variables:{...variables,exitValue:{min:'3',mode:'2',max:'1'}}});assert.equal(unordered.ready,false);assert.deepEqual(unordered.missing,['exitValue.order']);
});

test('workspace binds asynchronous previews and simulations to the newest active calculation',async()=>{
  const source=await readFile('apps/web/src/features/investment-workspace/Workspace.jsx','utf8');
  assert.match(source,/analysisRequest=useRef\(0\)/);
  assert.match(source,/request!==analysisRequest\.current/);
  assert.match(source,/data-origin=\{origin\}/);
  assert.match(source,/does not save the draft automatically/);
  assert.match(source,/disabled=\{busy\|\|!riskCanRun\}/);
  assert.match(source,/iw-required-mark/);
  assert.match(source,/aria-required="true"/);
});

