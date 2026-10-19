import {MODEL_VERSION,GENERATOR_VERSION,MODEL_DEFINITION,MODEL_FINGERPRINT,ECONOMICS_VERSION,VARIABLES,
  normalizeInput,fingerprint,requireThat,number,validateEvidence,validateResult,deepFreeze} from './contract.js';
import {drawScenarios} from './sampling.js';
import {evaluateEconomics,returnMetric,deterministicMao,maximumPrice} from './economics.js';
import {describe,mean,histogram,standardError,spearman} from './statistics.js';

const LIMITATIONS=Object.freeze([
  'Conditional on stated assumptions; not empirically calibrated future-performance probabilities.',
  'Percentiles describe simulated outcomes, not confidence guarantees or worst possible losses.',
  'Bounded input/scenario support excludes unmodeled tail events, title, condition, tax and transaction risks.',
  'Rehab and contingency are modeled as spent; no contingency reserve is counted again as equity or profit.',
  'Acquisition-only interest-only debt; rehab paid upfront, holding/interest funded before sale, principal repaid at sale. No construction draws, amortization, tax benefits or refinancing.',
  'Sensitivity is paired hypothetical stress, not causal attribution or calibrated variance contribution.',
  'No provider valuation range is automatically converted to a probability distribution.'
]);
function summarize(rows,target){
  const profits=rows.map(r=>r.modeledProfit),losses=profits.filter(v=>v<0),count=rows.length;
  const validRoi=rows.map(r=>r.roi).filter(v=>v!==null),validCoc=rows.map(r=>r.cashOnCash).filter(v=>v!==null);
  const positive=profits.filter(v=>v>0).length,zero=profits.filter(v=>v===0).length;
  const probabilityOfProfit=positive/count,probabilityOfLoss=losses.length/count;
  const probabilityExceedingTarget=rows.filter(r=>{const v=returnMetric(r,target.type);return v!==null&&v>target.rate;}).length/count;
  const probabilityMeetingTarget=rows.filter(r=>{const v=returnMetric(r,target.type);return v!==null&&v>=target.rate;}).length/count;
  return {profit:describe(profits),probabilityOfProfit,probabilityOfLoss,probabilityOfBreakEven:zero/count,
    expectedLossConditionalOnLoss:losses.length?-mean(losses):null,expectedLossMagnitude:losses.length?-mean(losses)*losses.length/count:0,
    roi:validRoi.length?describe(validRoi):null,cashOnCash:validCoc.length?describe(validCoc):null,
    undefinedRoiCount:count-validRoi.length,undefinedCashOnCashCount:count-validCoc.length,
    cashRequired:describe(rows.map(r=>r.cashRequired)),holdingDays:describe(rows.map(r=>r.holdDays)),
    probabilityExceedingTarget,probabilityMeetingTarget,profitDistribution:histogram(profits),
    samplingError:{meanProfitStandardError:standardError(profits),probabilityOfLossStandardError:Math.sqrt(probabilityOfLoss*(1-probabilityOfLoss)/count),
      note:'Monte Carlo estimator standard errors only, not predictive accuracy; plug-in probability SE is zero at observed 0/1 and does not prove no tail risk.'}};
}
export function pairedSensitivity(input,samples,baseRows){
  const definitions=[{factor:'exitValue',change:'-10%',apply:s=>({...s,exitValue:s.exitValue*.9})},
    {factor:'rehabCost',change:'+20%',apply:s=>({...s,rehabCost:s.rehabCost*1.2})},
    {factor:'renovationDays',change:'+30 days',apply:s=>({...s,renovationDays:s.renovationDays+30})},
    {factor:'marketingDays',change:'+30 days',apply:s=>({...s,marketingDays:s.marketingDays+30})}];
  const metrics={netProfit:r=>r.modeledProfit,lossProbability:r=>r.modeledProfit<0?1:0,cashRequired:r=>r.cashRequired,holdingDays:r=>r.holdDays};
  const stresses=definitions.map(d=>{
    const rows=samples.map(s=>evaluateEconomics(input.economics,d.apply(s))),effects={};
    for(const [name,read] of Object.entries(metrics)){
      const delta=rows.map((r,i)=>read(r)-read(baseRows[i])),value=mean(delta),half=Math.floor(delta.length/2);
      effects[name]={meanChange:value,pairedStandardError:standardError(delta),firstHalf:mean(delta.slice(0,half)),secondHalf:mean(delta.slice(half))};
    }
    return {factor:d.factor,stress:d.change,effects};
  });
  const rankings={};for(const metric of Object.keys(metrics)){
    const order=part=>[...stresses].sort((a,b)=>Math.abs(b.effects[metric][part])-Math.abs(a.effects[metric][part])||a.factor.localeCompare(b.factor)).map(s=>s.factor);
    const ranked=[...stresses].sort((a,b)=>Math.abs(b.effects[metric].meanChange)-Math.abs(a.effects[metric].meanChange)||a.factor.localeCompare(b.factor));
    const separated=ranked.every((s,i)=>!i||Math.abs(ranked[i-1].effects[metric].meanChange)-Math.abs(s.effects[metric].meanChange)>3*(ranked[i-1].effects[metric].pairedStandardError+s.effects[metric].pairedStandardError)+1e-12);
    const stable=separated&&JSON.stringify(order('firstHalf'))===JSON.stringify(order('secondHalf'));
    rankings[metric]={status:stable?'STABLE_FOR_SPECIFIED_STRESSES':'UNRESOLVED_OR_TIED',ranking:stable?ranked.map(s=>s.factor):null};
  }
  return {method:'PAIRED_COMMON_RANDOM_NUMBER_STRESSES_V1',stresses,rankings,
    note:'Reuse each complete joint scenario; change only the named variable, then recompute dependent holding/finance costs. Unequal stress sizes are explicit assumptions, not causal effects or variance shares. Stability is a within-run heuristic, not external validation.'};
}
export function riskAdjustedMao(input,samples,rule){
  requireThat(rule&&Object.keys(rule).sort().join(',')==='maximumPurchasePrice,minimumProbability,minimumProfit,provenance','RISK_RULE');
  validateEvidence(rule.provenance,'riskRule.provenance');
  number(rule.minimumProfit,'minimumProfit');number(rule.minimumProbability,'minimumProbability',Number.MIN_VALUE,1);number(rule.maximumPurchasePrice,'maximumPurchasePrice',.01);
  const requiredCount=Math.ceil(rule.minimumProbability*samples.length-1e-12);
  const count=p=>samples.reduce((n,s)=>n+(evaluateEconomics(input.economics,s,p).modeledProfit>=rule.minimumProfit?1:0),0);
  const result=maximumPrice(p=>count(p)>=requiredCount,rule.maximumPurchasePrice);
  return {...result,method:'EMPIRICAL_COMMON_SAMPLES_CENT_BISECTION',rule:structuredClone(rule),requiredCount,
    probabilityAtPrice:result.purchasePrice===null?null:count(result.purchasePrice)/samples.length,
    probabilityAtNextCent:result.status==='AVAILABLE'?count(result.purchasePrice+.01)/samples.length:null,
    note:'Sample-based conditional price ceiling, not a calibrated guarantee. BOUND_LIMITED is not a proven global maximum. Does not replace deterministic MAO or investor policy.'};
}
export function runMonteCarlo(raw,{includeSensitivity=true,riskRule=null}={}){
  requireThat(typeof includeSensitivity==='boolean','SENSITIVITY_OPTION');
  const input=normalizeInput(raw),samples=drawScenarios(input),rows=samples.map(s=>evaluateEconomics(input.economics,s));
  const results=summarize(rows,input.target),deterministic=evaluateEconomics(input.economics);
  const sensitivity=includeSensitivity?pairedSensitivity(input,samples,rows):null;
  const riskMao=riskRule===null?null:riskAdjustedMao(input,samples,riskRule);
  const interpretations=[`Results are conditional on ${input.assumptionsVersion}; probability is not empirical confidence.`];
  if(results.profit.mean>0&&results.probabilityOfLoss>0)interpretations.push('Positive expected profit coexists with simulated downside; inspect loss probability and conditional loss magnitude.');
  if(results.probabilityMeetingTarget<.5)interpretations.push('Fewer than half the simulated outcomes meet the stated target at the proposed price.');
  if(sensitivity?.stresses.find(s=>s.factor==='rehabCost').effects.netProfit.meanChange<0)interpretations.push('The specified renovation-cost stress reduces mean profit; this is not a calibrated event likelihood.');
  if(input.economics.financing.annualRate>0)interpretations.push('Longer holding increases modeled interest on outstanding acquisition debt.');
  const output={modelVersion:MODEL_VERSION,strategy:'FIX_AND_FLIP',economicsVersion:ECONOMICS_VERSION,
    simulation:{...input.simulation,generatorVersion:GENERATOR_VERSION,invalidSamplePolicy:MODEL_DEFINITION.invalidSamples,samplesAccepted:rows.length,samplesDiscarded:0},
    inputs:input,deterministic,mao:deterministicMao(input),results,sensitivity,riskAdjustedMao:riskMao,
    dependenceDiagnostics:{method:input.uncertainty.dependence.method,regimeCounts:Object.fromEntries(input.uncertainty.dependence.scenarios.map(r=>[r.name,samples.filter(s=>s.regime===r.name).length])),
      rehabHoldingSpearman:spearman(samples.map(s=>s.rehabCost),rows.map(r=>r.holdDays)),exitHoldingSpearman:spearman(samples.map(s=>s.exitValue),rows.map(r=>r.holdDays)),
      note:'Observed sample association under declared scenario assumptions; not causal or empirically estimated correlation.'},
    evidenceStatus:'CONDITIONAL_ON_INPUT_EVIDENCE_AND_ASSUMPTIONS',materialAssumptions:VARIABLES.map(k=>({variable:k,distribution:input.uncertainty.variables[k],provenance:input.provenance[`uncertainty.variables.${k}`]})),
    interpretations,limitations:[...LIMITATIONS],provenance:{inputFingerprint:fingerprint(input),modelFingerprint:MODEL_FINGERPRINT,
      sampleFingerprint:fingerprint(samples),runFingerprint:fingerprint({input,modelFingerprint:MODEL_FINGERPRINT,includeSensitivity,riskRule})}};
  output.provenance.resultFingerprint=fingerprint(output);
  validateResult(output);
  return deepFreeze(output);
}
