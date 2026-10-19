import {createHash} from 'node:crypto';

export const MODEL_VERSION='pi-monte-carlo-v1';
export const GENERATOR_VERSION='sha256-mulberry32-v1';
export const ECONOMICS_VERSION='pi-flip-cents-v1';
export const VARIABLES=Object.freeze(['exitValue','rehabCost','renovationDays','marketingDays']);
export const CLASSIFICATIONS=Object.freeze(['PROVIDER_EVIDENCE','COUNTY_EVIDENCE','ANALYST_ESTIMATE','INVESTOR_ASSUMPTION','SYNTHETIC_TEST_FIXTURE']);
export const MODEL_DEFINITION=Object.freeze({modelVersion:MODEL_VERSION,economicsVersion:ECONOMICS_VERSION,
  generatorVersion:GENERATOR_VERSION,currency:'USD',rates:'FRACTION',interestDaysPerYear:365,
  rounding:'HALF_UP_NONNEGATIVE_LINE_ITEMS_TO_CENTS',quantile:'LINEAR_TYPE_7',
  dependency:'EXPLICIT_JOINT_SCENARIO_MIXTURE_WITH_CONDITIONALLY_INDEPENDENT_RESIDUALS',
  invalidSamples:'ABORT_ENTIRE_RUN_NO_RESAMPLING',defaultIterations:10000,maximumIterations:100000,
  capital:'PEAK_CUMULATIVE_EQUITY_OUTFLOW_INCLUDING_EXIT_SHORTFALL',
  financing:'ACQUISITION_ONLY_INTEREST_ONLY_NO_REHAB_DRAWS',sensitivity:'PAIRED_COMMON_RANDOM_NUMBER_STRESSES_V1',
  riskPolicy:'EXPLICIT_PROVENANCED_MINIMUM_PROFIT_AND_EMPIRICAL_PROBABILITY'});
export const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
export const fingerprint=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export const MODEL_FINGERPRINT=fingerprint(MODEL_DEFINITION);
export const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};
export const requireThat=(ok,code)=>{if(!ok)throw new Error(`MC_${code}`);};
export const number=(v,path,min=0,max=1e9)=>{requireThat(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,`INVALID_${path}`);return Object.is(v,-0)?0:v;};
const string=(v,path)=>{requireThat(typeof v==='string'&&v.trim().length>0&&v.length<=500,`INVALID_${path}`);return v;};
const keys=(obj,allowed,path)=>{requireThat(obj&&Object.getPrototypeOf(obj)===Object.prototype,`OBJECT_${path}`);requireThat(Object.keys(obj).every(k=>allowed.includes(k)),`UNKNOWN_FIELD_${path}`);};
export function validateEvidence(meta,path='evidence'){
  keys(meta,['classification','reference','asOf','rationale'],path);requireThat(CLASSIFICATIONS.includes(meta.classification),'EVIDENCE_CLASSIFICATION');
  string(meta.reference,'reference');string(meta.rationale,'rationale');requireThat(meta.asOf===null||typeof meta.asOf==='string'&&Number.isFinite(Date.parse(meta.asOf)),'AS_OF');
}
export function leafPaths(value,prefix){return Object.entries(value).flatMap(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)?leafPaths(v,`${prefix}.${k}`):[`${prefix}.${k}`]);}

export function validateEconomics(e){
  const scalar=['purchasePrice','exitValue','rehabCost','rehabContingencyRate','acquisitionFixed','acquisitionRate',
    'sellingCommissionRate','sellerClosingFixed','sellerClosingRate','transferCost','otherUpfront','otherAtExit','renovationDays','marketingDays'];
  keys(e,[...scalar,'holdingDaily','financing'],'economics');
  for(const k of scalar)number(e[k],k,0,k.endsWith('Rate')?1:k.endsWith('Days')?3650:1e9);
  requireThat(e.renovationDays+e.marketingDays>0&&e.renovationDays+e.marketingDays<=3650,'HOLD_DURATION');
  requireThat(e.sellingCommissionRate+e.sellerClosingRate<1,'SELLING_RATE_TOTAL');
  keys(e.holdingDaily,['propertyTaxes','insurance','utilities','maintenance','other'],'holdingDaily');
  for(const k of ['propertyTaxes','insurance','utilities','maintenance','other'])number(e.holdingDaily[k],`holdingDaily.${k}`,0,1e6);
  keys(e.financing,['mode','ltv','annualRate','points','fees'],'financing');
  requireThat(['CASH','ACQUISITION_INTEREST_ONLY'].includes(e.financing.mode),'FINANCING_MODE');
  for(const k of ['ltv','annualRate','points'])number(e.financing[k],`financing.${k}`,0,k==='ltv'?.95:1);
  number(e.financing.fees,'financing.fees');
  if(e.financing.mode==='CASH')requireThat(['ltv','annualRate','points','fees'].every(k=>e.financing[k]===0),'CASH_WITH_FINANCING_CHARGES');
  return e;
}

export function validateDistribution(d,path){
  requireThat(d&&typeof d==='object','DISTRIBUTION_REQUIRED');
  if(d.family==='CONSTANT'){keys(d,['family','value'],path);number(d.value,path);return [d.value,d.value];}
  if(d.family==='TRIANGULAR'){
    keys(d,['family','min','mode','max'],path);for(const k of ['min','mode','max'])number(d[k],`${path}.${k}`);
    requireThat(d.min<=d.mode&&d.mode<=d.max&&d.min<d.max,`TRIANGULAR_BOUNDS_${path}`);return [d.min,d.max];
  }
  if(d.family==='DISCRETE'){
    keys(d,['family','outcomes'],path);requireThat(Array.isArray(d.outcomes)&&d.outcomes.length>0&&d.outcomes.length<=32,`DISCRETE_${path}`);
    d.outcomes.forEach(o=>{keys(o,['value','probability'],path);number(o.value,path);number(o.probability,path,Number.MIN_VALUE,1);});
    requireThat(Math.abs(d.outcomes.reduce((s,o)=>s+o.probability,0)-1)<1e-12,`PROBABILITY_SUM_${path}`);
    return [Math.min(...d.outcomes.map(o=>o.value)),Math.max(...d.outcomes.map(o=>o.value))];
  }
  throw new Error(`MC_DISTRIBUTION_FAMILY_${path}`);
}

export function normalizeInput(input){
  // Strict JSON-compatible inputs: no silent JSON coercion of NaN/undefined/Infinity.
  function json(v){requireThat(v!==undefined&&typeof v!=='function'&&typeof v!=='bigint','NON_JSON_INPUT');if(typeof v==='number')requireThat(Number.isFinite(v),'NONFINITE_INPUT');if(v&&typeof v==='object'){requireThat(Array.isArray(v)||Object.getPrototypeOf(v)===Object.prototype,'NON_PLAIN_INPUT');Object.values(v).forEach(json);}}
  json(input);keys(input,['scenarioId','strategy','assumptionsVersion','economics','target','uncertainty','simulation','provenance'],'input');
  string(input.scenarioId,'scenarioId');string(input.assumptionsVersion,'assumptionsVersion');requireThat(input.strategy==='FIX_AND_FLIP','STRATEGY_NOT_SUPPORTED');
  validateEconomics(input.economics);requireThat(input.economics.purchasePrice>0,'PURCHASE_REQUIRED');
  keys(input.target,['type','rate'],'target');requireThat(['CASH_ON_CASH','RETURN_ON_TOTAL_PROJECT_COST','PROFIT_MARGIN_ON_SALE'].includes(input.target.type),'TARGET_TYPE');number(input.target.rate,'target.rate',0,.99);
  keys(input.uncertainty,['variables','dependence'],'uncertainty');keys(input.uncertainty.variables,VARIABLES,'variables');
  const bounds={};for(const k of VARIABLES)bounds[k]=validateDistribution(input.uncertainty.variables[k],k);
  const dep=input.uncertainty.dependence;
  keys(dep,['method','rationale','conditionalIndependenceRationale','scenarios'],'dependence');
  requireThat(dep.method==='SHARED_SCENARIO_MIXTURE','DEPENDENCE_METHOD');string(dep.rationale,'dependence.rationale');string(dep.conditionalIndependenceRationale,'conditionalIndependenceRationale');
  requireThat(Array.isArray(dep.scenarios)&&dep.scenarios.length>0&&dep.scenarios.length<=16,'SCENARIOS');
  const names=new Set();for(const s of dep.scenarios){keys(s,['name','probability','factors'],'scenario');string(s.name,'scenario.name');requireThat(!names.has(s.name),'DUPLICATE_SCENARIO');names.add(s.name);number(s.probability,'scenario.probability',Number.MIN_VALUE,1);keys(s.factors,VARIABLES,'scenario.factors');for(const k of VARIABLES)number(s.factors[k],`factor.${k}`,0,10);
    const lowDays=bounds.renovationDays[0]*s.factors.renovationDays+bounds.marketingDays[0]*s.factors.marketingDays;
    const highDays=bounds.renovationDays[1]*s.factors.renovationDays+bounds.marketingDays[1]*s.factors.marketingDays;
    requireThat(lowDays>0&&highDays<=3650,'SAMPLED_DURATION_SUPPORT');
    for(const k of VARIABLES)requireThat(bounds[k][1]*s.factors[k]<= (k.endsWith('Days')?3650:1e9),'SAMPLED_SUPPORT');
  }
  requireThat(Math.abs(dep.scenarios.reduce((sum,s)=>sum+s.probability,0)-1)<1e-12,'SCENARIO_PROBABILITY_SUM');
  keys(input.simulation,['seed','iterations'],'simulation');string(input.simulation.seed,'seed');
  const iterations=input.simulation.iterations??MODEL_DEFINITION.defaultIterations;requireThat(Number.isInteger(iterations)&&iterations>=100&&iterations<=100000,'ITERATIONS');
  const required=[...leafPaths(input.economics,'economics'),'target.type','target.rate',...VARIABLES.map(k=>`uncertainty.variables.${k}`),'uncertainty.dependence'];
  keys(input.provenance,required,'provenance');
  for(const p of required)validateEvidence(input.provenance[p],`provenance.${p}`);
  return stable({...structuredClone(input),simulation:{...input.simulation,iterations}});
}

/** Structural/integrity validation, not proof of predictive validity. */
export function validateResult(result){
  requireThat(result?.modelVersion===MODEL_VERSION&&result.economicsVersion===ECONOMICS_VERSION&&result.strategy==='FIX_AND_FLIP','RESULT_VERSION');
  const input=normalizeInput(result.inputs),s=result.simulation,r=result.results,p=result.provenance;
  requireThat(s.generatorVersion===GENERATOR_VERSION&&s.seed===input.simulation.seed&&s.iterations===input.simulation.iterations,'RESULT_SIMULATION');
  requireThat(s.samplesAccepted===s.iterations&&s.samplesDiscarded===0,'RESULT_SAMPLE_ACCOUNTING');
  for(const k of ['probabilityOfProfit','probabilityOfLoss','probabilityOfBreakEven','probabilityMeetingTarget','probabilityExceedingTarget'])number(r[k],`result.${k}`,0,1);
  requireThat(Math.abs(r.probabilityOfProfit+r.probabilityOfLoss+r.probabilityOfBreakEven-1)<1e-12,'RESULT_PROBABILITY_ACCOUNTING');
  requireThat(r.probabilityExceedingTarget<=r.probabilityMeetingTarget,'RESULT_TARGET_ORDER');
  for(const k of ['profit','roi','cashOnCash','cashRequired','holdingDays']){
    const d=r[k];if(d===null){requireThat(['roi','cashOnCash'].includes(k),'RESULT_DISTRIBUTION_MISSING');continue;}
    const fields=['mean','median','p5','p10','p50','p90','p95','sampleMinimum','sampleMaximum'];
    requireThat(fields.every(f=>typeof d[f]==='number'&&Number.isFinite(d[f])),'RESULT_NONFINITE');
    const ordered=['sampleMinimum','p5','p10','p50','p90','p95','sampleMaximum'].map(f=>d[f]);requireThat(ordered.every((v,i)=>!i||v>=ordered[i-1]),'RESULT_PERCENTILE_ORDER');requireThat(d.median===d.p50,'RESULT_MEDIAN');
  }
  requireThat(r.profitDistribution.every(b=>Number.isInteger(b.count)&&b.count>=0&&Number.isFinite(b.min)&&Number.isFinite(b.max)&&b.min<=b.max)&&r.profitDistribution.reduce((sum,b)=>sum+b.count,0)===s.iterations,'RESULT_HISTOGRAM');
  requireThat((r.probabilityOfLoss===0&&r.expectedLossConditionalOnLoss===null)||(r.probabilityOfLoss>0&&r.expectedLossConditionalOnLoss>0&&Number.isFinite(r.expectedLossConditionalOnLoss)),'RESULT_CONDITIONAL_LOSS');
  for(const k of ['inputFingerprint','modelFingerprint','sampleFingerprint','runFingerprint','resultFingerprint'])requireThat(/^[a-f0-9]{64}$/.test(p[k]),'RESULT_FINGERPRINT_FORMAT');
  requireThat(p.inputFingerprint===fingerprint(input)&&p.modelFingerprint===MODEL_FINGERPRINT,'RESULT_BINDING');
  const copy=structuredClone(result);delete copy.provenance.resultFingerprint;requireThat(p.resultFingerprint===fingerprint(copy),'RESULT_FINGERPRINT_MISMATCH');
  return true;
}
