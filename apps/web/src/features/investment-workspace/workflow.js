export const WORKFLOW_STAGES=Object.freeze([
  Object.freeze({id:'research',label:'Property Research',tabs:Object.freeze(['Overview','County / Distress','Property Facts','Listings'])}),
  Object.freeze({id:'comparables',label:'Comparable Sales',tabs:Object.freeze(['Sold Sales'])}),
  Object.freeze({id:'evidence',label:'Seller & Property Evidence',tabs:Object.freeze(['Seller Financial Position','Analyst Evidence','Supporting Documents'])}),
  Object.freeze({id:'financial',label:'Financial Analysis',tabs:Object.freeze(['Underwriting','Scenarios','Risk'])}),
  Object.freeze({id:'reports',label:'Investor Reports',tabs:Object.freeze(['Reports'])})
]);

export const GUIDED_STEPS=Object.freeze([
  Object.freeze({id:'identify',label:'Identify Property',purpose:'Start with a known address. PI checks saved properties and retained research before offering any explicit provider lookup.',tabs:Object.freeze([])}),
  Object.freeze({id:'research',label:'Property Research',purpose:'Review property characteristics, valuation evidence, county indicators and the important information that is still missing.',tabs:Object.freeze(['Overview','County / Distress','Property Facts','Listings'])}),
  Object.freeze({id:'comparables',label:'Comparable Sales',purpose:'Review reported sales separately from listings, then record which examples are relevant and why.',tabs:Object.freeze(['Sold Sales'])}),
  Object.freeze({id:'evidence',label:'Seller & Property Evidence',purpose:'Record mortgage, payoff, lien, tax, occupancy, condition and supporting-document evidence without treating unknown amounts as zero.',tabs:Object.freeze(['Seller Financial Position','Analyst Evidence','Supporting Documents'])}),
  Object.freeze({id:'financial',label:'Financial Analysis',purpose:'Enter your purchase, rehabilitation, resale and financing assumptions, then review calculated returns and offer limits.',tabs:Object.freeze(['Underwriting','Scenarios'])}),
  Object.freeze({id:'risk',label:'Risk Analysis',purpose:'Test editable illustrative ranges only when you choose to run the simulation, and read the results in everyday language.',tabs:Object.freeze(['Risk'])}),
  Object.freeze({id:'reports',label:'Investor Reports',purpose:'Review completeness and unresolved questions, preview a saved revision and export the investor package.',tabs:Object.freeze(['Reports'])})
]);

const LEGACY_TAB_ALIASES=Object.freeze({Compare:'Scenarios','Scenario comparison':'Scenarios',County:'County / Distress',Comps:'Sold Sales',MonteCarlo:'Risk',Report:'Reports'});

export function normalizeWorkspaceTab(tab){
  const normalized=LEGACY_TAB_ALIASES[tab]??tab;
  return WORKFLOW_STAGES.some(stage=>stage.tabs.includes(normalized))?normalized:'Underwriting';
}

export function stageForTab(tab){
  const normalized=normalizeWorkspaceTab(tab);
  return WORKFLOW_STAGES.find(stage=>stage.tabs.includes(normalized))??WORKFLOW_STAGES[3];
}

export function guidedStepForTab(tab){
  const normalized=normalizeWorkspaceTab(tab);
  return GUIDED_STEPS.find(step=>step.tabs.includes(normalized))??GUIDED_STEPS[1];
}

export function guidedStepNavigation(tab){
  const current=guidedStepForTab(tab),index=GUIDED_STEPS.findIndex(step=>step.id===current.id);
  return {
    current,
    previous:index>1?GUIDED_STEPS[index-1]:index===1?GUIDED_STEPS[0]:null,
    next:index>=0&&index<GUIDED_STEPS.length-1?GUIDED_STEPS[index+1]:null
  };
}

const finitePositive=value=>value!==''&&value!=null&&Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;
const displayNumber=value=>Number.isInteger(value)?String(value):String(Number(value.toFixed(2)));
export const DEFAULT_RISK_SEED='12345';
export const RISK_VALUE_ORIGINS=Object.freeze({INHERITED:'INHERITED',ILLUSTRATIVE:'ILLUSTRATIVE',MANUAL:'MANUAL'});
export const RISK_VARIABLE_KEYS=Object.freeze(['exitValue','rehabCost','renovationDays','marketingDays']);

export function riskValueOrigin(risk,key,bound){
  const explicit=risk?.valueOrigins?.[key]?.[bound];
  if(Object.values(RISK_VALUE_ORIGINS).includes(explicit))return explicit;
  return String(risk?.variables?.[key]?.[bound]??'').trim()===''?'UNSET':RISK_VALUE_ORIGINS.MANUAL;
}

export function synchronizeRiskMostLikely(risk={},inputs={}){
  const next={...risk,variables:structuredClone(risk.variables??{}),valueOrigins:structuredClone(risk.valueOrigins??{}),seed:String(risk.seed??'').trim()||DEFAULT_RISK_SEED,iterations:risk.iterations??1000,rationale:risk.rationale??''};
  let changed=next.seed!==risk.seed||next.iterations!==risk.iterations||next.rationale!==risk.rationale;
  for(const key of RISK_VARIABLE_KEYS){
    const bounds={...(next.variables[key]??{})},origins={...(next.valueOrigins[key]??{})};
    for(const bound of ['min','mode','max'])if(!origins[bound]&&String(bounds[bound]??'').trim()!==''){origins[bound]=RISK_VALUE_ORIGINS.MANUAL;changed=true;}
    const inherited=origins.mode===RISK_VALUE_ORIGINS.INHERITED,available=finitePositive(inputs[key]);
    if(!origins.mode&&String(bounds.mode??'').trim()===''&&available!==null){bounds.mode=displayNumber(available);origins.mode=RISK_VALUE_ORIGINS.INHERITED;changed=true;}
    else if(inherited){const value=available===null?'':displayNumber(available);if(bounds.mode!==value){bounds.mode=value;changed=true;}}
    next.variables[key]=bounds;
    if(Object.keys(origins).length)next.valueOrigins[key]=origins;
  }
  return {risk:next,changed};
}

export function markIllustrativeRiskValues(risk,variables){
  return {...risk,variables:structuredClone(variables),valueOrigins:Object.fromEntries(RISK_VARIABLE_KEYS.map(key=>[key,{min:RISK_VALUE_ORIGINS.ILLUSTRATIVE,mode:RISK_VALUE_ORIGINS.ILLUSTRATIVE,max:RISK_VALUE_ORIGINS.ILLUSTRATIVE}]))};
}

export function editRiskValue(risk,key,bound,value){
  if(!RISK_VARIABLE_KEYS.includes(key)||!['min','mode','max'].includes(bound))throw new Error('Unknown risk assumption field.');
  return {...risk,variables:{...(risk.variables??{}),[key]:{...(risk.variables?.[key]??{}),[bound]:value}},valueOrigins:{...(risk.valueOrigins??{}),[key]:{...(risk.valueOrigins?.[key]??{}),[bound]:RISK_VALUE_ORIGINS.MANUAL}}};
}

export function illustrativeRiskAssumptions(inputs){
  const values={
    exitValue:finitePositive(inputs?.exitValue),
    rehabCost:finitePositive(inputs?.rehabCost),
    renovationDays:finitePositive(inputs?.renovationDays),
    marketingDays:finitePositive(inputs?.marketingDays)
  };
  const missing=Object.entries(values).filter(([,value])=>value===null).map(([key])=>key);
  if(missing.length)return {ok:false,missing,reason:`Enter a positive ${missing.join(', ')} assumption before populating illustrative risk bounds.`};
  const triangular=(min,mode,max)=>({min:displayNumber(min),mode:displayNumber(mode),max:displayNumber(max)});
  return {ok:true,variables:{
    exitValue:triangular(values.exitValue*.9,values.exitValue,values.exitValue*1.05),
    rehabCost:triangular(values.rehabCost,values.rehabCost*1.2,values.rehabCost*1.6),
    renovationDays:triangular(Math.round(values.renovationDays*.83),Math.round(values.renovationDays),Math.round(values.renovationDays*1.33)),
    marketingDays:triangular(Math.round(values.marketingDays*.67),Math.round(values.marketingDays),Math.round(values.marketingDays*2))
  }};
}

export function hasCustomRiskValues(risk){
  return Object.entries(risk?.variables??{}).some(([variable,bounds])=>['min','mode','max'].some(bound=>String(bounds?.[bound]??'').trim()!==''&&riskValueOrigin(risk,variable,bound)!==RISK_VALUE_ORIGINS.INHERITED));
}

export function riskReadiness(risk={}){
  const missing=[];
  for(const key of RISK_VARIABLE_KEYS){
    const bounds=risk.variables?.[key]??{},numbers={};
    for(const bound of ['min','mode','max']){
      const value=bounds[bound],number=Number(value);
      if(String(value??'').trim()===''||!Number.isFinite(number)||number<0)missing.push(`${key}.${bound}`);
      else numbers[bound]=number;
    }
    if(Object.keys(numbers).length===3&&(numbers.min>numbers.mode||numbers.mode>numbers.max))missing.push(`${key}.order`);
  }
  if(!String(risk.seed??'').trim())missing.push('seed');
  const iterations=Number(risk.iterations);
  if(!Number.isInteger(iterations)||iterations<100||iterations>20000)missing.push('iterations');
  if(!String(risk.rationale??'').trim())missing.push('rationale');
  return {ready:missing.length===0,missing};
}

export function missingInputSummary(validation={}){
  const preferred=['purchasePrice','rehabCost','exitValue','renovationDays','marketingDays'];
  return [...preferred.filter(key=>validation[key]),...Object.keys(validation).filter(key=>!preferred.includes(key))].map(key=>validation[key]);
}

export function scenarioAnalysis(scenario,previewById={}){
  if(!scenario.dirty)return {analysis:scenario.analysis??null,label:`Saved revision r${scenario.revision}`,reason:scenario.validation?.message??null};
  const preview=previewById[scenario.id];
  if(preview?.key===JSON.stringify([scenario.id,scenario.inputs,scenario.targetType,scenario.risk]))return {analysis:preview.analysis,label:'Unsaved draft — calculated preview',reason:null};
  return {analysis:null,label:'Unsaved draft — incomplete',reason:preview?.reason??'Complete the required underwriting inputs to calculate this preview.'};
}
