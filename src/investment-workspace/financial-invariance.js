import {createHash} from 'node:crypto';

function projectAnalysis(value,path=[]){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map((item,index)=>projectAnalysis(item,[...path,String(index)]));
  const result={};
  for(const [key,item] of Object.entries(value)){
    if(key==='provenance')continue;
    if(key==='scenarioId'&&path.at(-1)==='inputs'&&path.includes('monteCarlo'))continue;
    result[key]=projectAnalysis(item,[...path,key]);
  }
  return result;
}

function canonical(value){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
}

export function financialScenarioProjection(scenario={}){
  return canonical({
    propertyRef:scenario.propertyRef??null,
    evidenceFingerprint:scenario.evidenceFingerprint??null,
    inputs:scenario.inputs??null,
    targetType:scenario.targetType??null,
    risk:scenario.risk??null,
    riskRequested:scenario.riskRequested===true,
    analysis:projectAnalysis(scenario.analysis??null)
  });
}

export function financialScenarioHash(scenario){
  return createHash('sha256').update(JSON.stringify(financialScenarioProjection(scenario))).digest('hex');
}

export function compareFinancialScenarios(baseline,candidate){
  const baselineHash=financialScenarioHash(baseline),candidateHash=financialScenarioHash(candidate);
  return {equal:baselineHash===candidateHash,baselineHash,candidateHash,baseline:financialScenarioProjection(baseline),candidate:financialScenarioProjection(candidate)};
}
