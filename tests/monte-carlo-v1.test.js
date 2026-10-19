import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runMonteCarlo,riskAdjustedMao} from '../src/analysis/monteCarlo/index.js';
import {normalizeInput,validateResult,fingerprint,MODEL_FINGERPRINT,MODEL_VERSION,GENERATOR_VERSION,VARIABLES} from '../src/analysis/monteCarlo/contract.js';
import {evaluateEconomics,deterministicMao,returnMetric} from '../src/analysis/monteCarlo/economics.js';
import {drawScenarios,generator,sample} from '../src/analysis/monteCarlo/sampling.js';
import {describe,quantile,mean,histogram} from '../src/analysis/monteCarlo/statistics.js';
import {evaluateMao,solveMao,MAO_MODEL_VERSION} from '../src/underwriting/mao.js';
import {fixture,constantFixture,CASES,syntheticRiskRule} from './fixtures/monteCarlo.js';
import {offlineStatus} from '../src/analysis/offline.js';
import {calculateDeal} from '../src/underwriting/deterministic.js';
import {costModel} from '../src/underwriting/costModel.js';
import {evaluate} from '../src/underwriting/metrics.js';
import {dealCostModel} from '../src/underwriting/dealCostModel.js';
import {dealEvaluate} from '../src/underwriting/dealMetrics.js';

const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const cash=e=>({...e,financing:{mode:'CASH',ltv:0,annualRate:0,points:0,fees:0}});
// Independent cents ledger: deliberately does not reuse model cost helpers.
function independent(e){
  const cent=v=>Math.round(v*100),days=e.renovationDays+e.marketingDays;
  const principal=e.financing.mode==='CASH'?0:cent(e.purchasePrice*e.financing.ltv),loan=principal/100;
  const upfront=[e.purchasePrice,e.acquisitionFixed,e.purchasePrice*e.acquisitionRate,e.rehabCost,e.rehabCost*e.rehabContingencyRate,e.otherUpfront,loan*e.financing.points,e.financing.fees,loan*e.financing.annualRate*days/365,...Object.values(e.holdingDaily).map(v=>v*days)].map(cent).reduce((a,b)=>a+b,0);
  const selling=[e.exitValue*e.sellingCommissionRate,e.sellerClosingFixed,e.exitValue*e.sellerClosingRate,e.transferCost,e.otherAtExit].map(cent).reduce((a,b)=>a+b,0);
  const sale=cent(e.exitValue),profit=sale-upfront-selling,equity=upfront-principal,exit=sale-selling-principal;
  return {profit:profit/100,total:(upfront+selling)/100,peak:Math.max(0,equity,equity-exit)/100,principal:loan,equity:equity/100,exit:exit/100};
}

for(const name of CASES.slice(0,4))test(`${name}: independent deterministic arithmetic, cents, costs and finite output`,()=>{
  const input=fixture(name),e=input.economics,a=evaluateEconomics(e),b=independent(e);
  assert.equal(a.modeledProfit,b.profit);assert.equal(a.totalProjectCost,b.total);assert.equal(a.cashRequired,b.peak);
  close(a.roi,b.profit/b.total);close(a.cashOnCash,b.profit/b.peak);
  assert.equal(a.loanPrincipal,b.principal);assert.equal(a.preSaleEquity,b.equity);assert.equal(a.exitEquity,b.exit);
  close(Object.values(a.costs).reduce((s,v)=>s+v,0),a.totalProjectCost);
  assert.equal(Object.keys(a.costs).filter(k=>/contingency/.test(k)).length,1);
});
test('cash versus financed economics: principal is not expense, and interest/points/fees occur once',()=>{
  const e=fixture().economics,c=evaluateEconomics(cash(e)),f=evaluateEconomics(e);
  close(c.modeledProfit-f.modeledProfit,f.costs.interest+f.costs.origination+f.costs.financingFees);
  close(c.cashRequired-f.cashRequired,f.loanPrincipal-f.costs.interest-f.costs.origination-f.costs.financingFees);
});
test('exit cash shortfall is included in peak cash; equity is not available cash',()=>{
  const e={...fixture().economics,exitValue:10000},r=evaluateEconomics(e);
  assert.ok(r.exitEquity<0);close(r.cashRequired,r.preSaleEquity-r.exitEquity);close(r.modeledProfit,r.exitEquity-r.preSaleEquity);
});
test('loan principal accounting defect is reproduced by independent legacy-MAO regression',()=>{
  const x={hurdle:{type:'CASH_ON_CASH',rate:.2},acquisitionCosts:[],dispositionCosts:[],holdingCosts:[],holdDays:365,
    rehab:{noRehabAssumption:true},financing:{mode:'LOAN',ltv:.7,interestRate:.1,points:.02,financingFees:500}};
  const r=evaluateMao(x,{exitValue:160000,purchasePrice:100000});
  assert.equal(r.totalProjectCost,108900);assert.equal(r.modeledProfit,51100);assert.equal(r.cashInvested,38900);
  assert.equal(MAO_MODEL_VERSION,'sprint5-mao-v2');
  const fixed=structuredClone(x);delete fixed.financing.ltv;fixed.financing.loanAmount=70000;assert.deepEqual(evaluateMao(fixed,{exitValue:160000,purchasePrice:100000}),r);
  assert.throws(()=>evaluateMao(fixed,{exitValue:160000,purchasePrice:60000}),/LOAN_EXCEEDS_PURCHASE/);
});
test('legacy MAO fixed debt and infeasible bounds stop, and contradictory loan bases fail',()=>{
  const x={hurdle:{type:'CASH_ON_CASH',rate:.2},acquisitionCosts:[],dispositionCosts:[],holdingCosts:[],holdDays:365,rehab:{noRehabAssumption:true},financing:{mode:'LOAN',loanAmount:70000,interestRate:.1,points:0,financingFees:0}};
  assert.equal(solveMao(x,{exitValue:1000}).status,'UNAVAILABLE');
  assert.throws(()=>evaluateMao({...x,financing:{...x.financing,ltv:.7}},{exitValue:100000,purchasePrice:90000}),/CONFLICTING_LOAN_BASIS/);
  assert.throws(()=>evaluateMao({...x,financing:{...x.financing,financingFees:-1}},{exitValue:100000,purchasePrice:90000}),/INVALID_FINANCING_FEES/);
});
test('existing sponsor/legacy/deal economics remain unchanged on artificial inputs',()=>{
  const values={projectedListPrice:310000,acquisitionCost:150000,estimatedRepairs:25000,spaceRentThreeMonths:3000,salesCommission:15000,escrowClosingCosts:2000};
  const sponsor=calculateDeal(values),legacy=evaluate(costModel(values));assert.equal(sponsor.projectedNetProfit,115000);assert.equal(legacy.modeledProfit,115000);assert.equal(legacy.scenarioCashInvested,178000);
  const deal=dealEvaluate(dealCostModel({...values,acquisitionClosingCosts:1000,dispositionClosingCosts:2000,holdDays:90}));assert.equal(deal.modeledProfit,114000);assert.equal(deal.scenarioCashInvested,179000);
  assert.equal(sponsor.fullyBurdened.calculable,false);assert.equal(deal.costCompleteness,'INCOMPLETE');
});
test('certified ledger reconciles with existing cash/financed MAO formulas within explicit rounding differences',()=>{
  for(const financed of [true,false]){const e=fixture().economics;if(!financed)e.financing=cash(e).financing;
    const legacy={hurdle:{type:'CASH_ON_CASH',rate:.25},holdDays:e.renovationDays+e.marketingDays,
      acquisitionCosts:[{basis:'FIXED',amount:e.acquisitionFixed+e.otherUpfront},{basis:'PERCENT_OF_PURCHASE',amount:e.acquisitionRate}],
      dispositionCosts:[{basis:'FIXED',amount:e.sellerClosingFixed+e.transferCost+e.otherAtExit},{basis:'PERCENT_OF_EXIT',amount:e.sellingCommissionRate},{basis:'PERCENT_OF_EXIT',amount:e.sellerClosingRate}],
      rehab:{items:[{estimatedCost:e.rehabCost}],contingency:{basis:'PERCENT_OF_REHAB',value:e.rehabContingencyRate}},
      holdingCosts:Object.values(e.holdingDaily).map(amount=>({basis:'PER_DAY',amount})),
      financing:financed?{mode:'LOAN',ltv:e.financing.ltv,interestRate:e.financing.annualRate,points:e.financing.points,financingFees:e.financing.fees}:{mode:'CASH'}};
    const a=evaluateMao(legacy,{exitValue:e.exitValue,purchasePrice:e.purchasePrice}),b=evaluateEconomics(e);
    close(a.modeledProfit,b.modeledProfit,.02);close(a.cashInvested,b.cashRequired,.02);
  }
});
test('zero uncertainty gives exactly deterministic outcomes, risk probabilities and seed-independent values',()=>{
  const input=constantFixture(),r=runMonteCarlo(input),base=evaluateEconomics(input.economics);
  for(const key of ['mean','median','p5','p10','p50','p90','p95','sampleMinimum','sampleMaximum'])assert.equal(r.results.profit[key],base.modeledProfit);
  close(r.results.roi.mean,base.roi);close(r.results.cashRequired.mean,base.cashRequired);assert.equal(r.results.samplingError.meanProfitStandardError,0);
  assert.equal(r.results.probabilityOfLoss,0);assert.equal(r.results.expectedLossConditionalOnLoss,null);assert.equal(r.results.probabilityOfProfit,1);
});
test('same normalized inputs and seed reproduce identical complete output without mutating or reordering inputs',()=>{
  const input=fixture('C_RENOVATION_OVERRUN',1000),before=JSON.stringify(input);
  const a=runMonteCarlo(input),b=runMonteCarlo(JSON.parse(before));assert.deepEqual(a,b);assert.equal(JSON.stringify(input),before);
  const reversed=Object.fromEntries(Object.entries(input).reverse());assert.deepEqual(runMonteCarlo(reversed),a);
  assert.equal(a.provenance.inputFingerprint,fingerprint(normalizeInput(input)));
});
test('different seed changes outcomes and sample fingerprint; iteration setting is explicit',()=>{
  const a=fixture('B_MARGINAL',1000),b=structuredClone(a);b.simulation.seed='different-synthetic-seed';
  const x=runMonteCarlo(a,{includeSensitivity:false}),y=runMonteCarlo(b,{includeSensitivity:false});
  assert.notEqual(x.provenance.sampleFingerprint,y.provenance.sampleFingerprint);assert.notEqual(x.results.profit.mean,y.results.profit.mean);
  delete a.simulation.iterations;assert.equal(normalizeInput(a).simulation.iterations,10000);
});
test('PRNG golden vector and uniform support are stable and independent of Math.random',()=>{
  const r=generator('mc-golden');const first=Array.from({length:5},()=>r());
  // Frozen version vector, not a predictive randomness or security certificate.
  assert.deepEqual(first,[0.29300142731517553,0.7832621084526181,0.8104567767586559,0.6114503955468535,0.8385890112258494]);
  const old=Math.random;try{Math.random=()=>{throw new Error('UNSEEDED_RANDOM');};const output=runMonteCarlo(fixture('A_STRONG_MARGIN',100),{includeSensitivity:false});assert.equal(output.simulation.samplesAccepted,100);}finally{Math.random=old;}
  for(let i=0;i<20000;i++){const u=r();assert.ok(u>=0&&u<1);}
});
test('triangular inverse CDF endpoints, mean and variance agree with analytical values',()=>{
  const d={family:'TRIANGULAR',min:10,mode:20,max:40};assert.equal(sample(d,0),10);close(sample(d,1/3),20);
  const rng=generator('triangular-test'),values=Array.from({length:50000},()=>sample(d,rng())),m=mean(values);
  close(m,(10+20+40)/3,.12);close(mean(values.map(x=>(x-m)**2)),(100+400+1600-200-400-800)/18,.6);
  assert.ok(values.every(v=>v>=10&&v<=40));
});
test('discrete probability masses and degenerate triangular modes retain bounded support',()=>{
  const d={family:'DISCRETE',outcomes:[{value:0,probability:.8},{value:10,probability:.2}]},rng=generator('discrete');const v=Array.from({length:20000},()=>sample(d,rng()));close(mean(v),2,.08);
  for(const mode of [0,10])for(const u of [0,.1,.5,.999999])assert.ok(sample({family:'TRIANGULAR',min:0,mode,max:10},u)>=0);
});
test('quantiles are type-7 with clear lower-tail orientation and exact histogram accounting',()=>{
  close(quantile([0,10,20,30],.1),3,1e-12);assert.equal(quantile([0,10,20,30],.5),15);
  const d=describe([-50,0,20,100]);assert.ok(d.p5<=d.p10&&d.p10<=d.p50&&d.p50<=d.p90&&d.p90<=d.p95);
  assert.equal(histogram([-50,0,20,100],4).reduce((n,b)=>n+b.count,0),4);assert.deepEqual(histogram([2,2]),[{min:2,max:2,count:2}]);
});
for(const name of CASES.slice(0,4))test(`${name}: scenario accounting, probabilities, percentiles and support invariants`,()=>{
  const input=fixture(name,1500),r=runMonteCarlo(input),p=r.results.profit;
  assert.ok(p.p5<=p.p10&&p.p10<=p.p50&&p.p50<=p.p90&&p.p90<=p.p95);assert.equal(p.median,p.p50);
  for(const k of ['probabilityOfProfit','probabilityOfLoss','probabilityOfBreakEven','probabilityMeetingTarget','probabilityExceedingTarget'])assert.ok(r.results[k]>=0&&r.results[k]<=1);
  close(r.results.probabilityOfProfit+r.results.probabilityOfLoss+r.results.probabilityOfBreakEven,1);
  assert.equal(r.results.profitDistribution.reduce((n,b)=>n+b.count,0),1500);assert.ok(r.results.holdingDays.sampleMinimum>0&&r.results.cashRequired.sampleMinimum>=0);
  function finite(v){if(typeof v==='number')assert.ok(Number.isFinite(v));if(v&&typeof v==='object')Object.values(v).forEach(finite);}finite(r);assert.deepEqual(JSON.parse(JSON.stringify(r)),r);
});
test('loss and break-even definitions, conditional loss and strict target exceedance are distinct',()=>{
  const input=constantFixture();input.economics=cash(input.economics);input.economics.sellingCommissionRate=0;input.economics.sellerClosingRate=0;
  const cost=evaluateEconomics(input.economics).totalProjectCost;input.economics.exitValue=cost;
  input.uncertainty.variables.exitValue={family:'CONSTANT',value:cost};input.target.rate=0;
  const zero=runMonteCarlo(input,{includeSensitivity:false});assert.equal(zero.results.probabilityOfBreakEven,1);assert.equal(zero.results.probabilityExceedingTarget,0);assert.equal(zero.results.probabilityMeetingTarget,1);
  input.uncertainty.variables.exitValue={family:'CONSTANT',value:cost-100};const loss=runMonteCarlo(input,{includeSensitivity:false});assert.equal(loss.results.expectedLossConditionalOnLoss,100);assert.equal(loss.results.probabilityOfLoss,1);assert.equal(loss.results.expectedLossMagnitude,100);
});
test('common renovation overrun regime creates right skew and positive cost/delay dependence',()=>{
  const input=normalizeInput(fixture('C_RENOVATION_OVERRUN')),samples=drawScenarios(input),values=samples.map(s=>s.rehabCost),avg=mean(values);
  assert.ok(mean(values.map(v=>(v-avg)**3))>0);assert.ok(describe(values).mean>describe(values).median);
  const r=runMonteCarlo(input,{includeSensitivity:false});assert.ok(r.dependenceDiagnostics.rehabHoldingSpearman>.6);
  const counts=r.dependenceDiagnostics.regimeCounts;close(counts.SEVERE/10000,.1,.015);
});
test('market regime gives lower price with longer marketing, without invented empirical correlation',()=>{
  const r=runMonteCarlo(fixture('D_MARKET_DOWNTURN'),{includeSensitivity:false});assert.ok(r.dependenceDiagnostics.exitHoldingSpearman<-.6);
  assert.match(r.dependenceDiagnostics.note,/not causal/);
});
test('monotone economic invariants across financed, cash and scenario configurations',()=>{
  for(const name of CASES.slice(0,4))for(const finance of [false,true]){
    const e=fixture(name).economics;if(!finance)e.financing=cash(e).financing;
    for(const s of drawScenarios(normalizeInput(fixture(name,100))).slice(0,20)){
      const b=evaluateEconomics(e,s);assert.ok(evaluateEconomics(e,s,e.purchasePrice+1000).modeledProfit<=b.modeledProfit);
      assert.ok(evaluateEconomics(e,{...s,rehabCost:s.rehabCost+1000}).modeledProfit<=b.modeledProfit);
      const longer=evaluateEconomics(e,{...s,marketingDays:s.marketingDays+30});assert.ok(longer.modeledProfit<=b.modeledProfit);assert.ok(longer.costs.interest>=b.costs.interest);
      assert.ok(evaluateEconomics(e,{...s,exitValue:s.exitValue-1000}).modeledProfit<=b.modeledProfit);
    }
  }
});
test('sensitivity recomputes complete economics with common scenarios, directional effects and honest ties',()=>{
  const input=fixture('B_MARGINAL',1000),r=runMonteCarlo(input),s=r.sensitivity;
  const sale=s.stresses.find(x=>x.factor==='exitValue'),rehab=s.stresses.find(x=>x.factor==='rehabCost'),hold=s.stresses.find(x=>x.factor==='marketingDays');
  assert.ok(sale.effects.netProfit.meanChange<0&&rehab.effects.cashRequired.meanChange>0);assert.ok(hold.effects.netProfit.meanChange<0);assert.equal(hold.effects.holdingDays.meanChange,30);
  assert.ok(sale.effects.lossProbability.meanChange>=0);assert.equal(s.rankings.holdingDays.ranking,null);
  const samples=drawScenarios(normalizeInput(input));const manual=samples.map(x=>evaluateEconomics(input.economics,{...x,rehabCost:x.rehabCost*1.2}).modeledProfit-evaluateEconomics(input.economics,x).modeledProfit);close(mean(manual),rehab.effects.netProfit.meanChange);
});
test('deterministic MAO and break-even are maximum feasible cents for every existing hurdle',()=>{
  for(const type of ['CASH_ON_CASH','RETURN_ON_TOTAL_PROJECT_COST','PROFIT_MARGIN_ON_SALE'])for(const financed of [true,false]){
    const input=fixture();input.target.type=type;if(!financed)input.economics=cash(input.economics);
    const result=deterministicMao(input),p=result.deterministic.purchasePrice;assert.equal(result.deterministic.status,'AVAILABLE');
    assert.ok(returnMetric(evaluateEconomics(input.economics,{},p),type)>=input.target.rate);
    assert.ok(returnMetric(evaluateEconomics(input.economics,{},p+.01),type)<input.target.rate);
    const be=result.breakEven.purchasePrice;assert.ok(evaluateEconomics(input.economics,{},be).modeledProfit>=0);assert.ok(evaluateEconomics(input.economics,{},be+.01).modeledProfit<0);
  }
});
test('risk-adjusted MAO meets its empirical rule, next cent fails; threshold tightening cannot raise price',()=>{
  const input=normalizeInput(fixture('B_MARGINAL',500)),samples=drawScenarios(input),rule=syntheticRiskRule({minimumProfit:10000,maximumPurchasePrice:300000});
  const a=riskAdjustedMao(input,samples,rule),b=riskAdjustedMao(input,samples,{...rule,minimumProbability:.95});
  assert.equal(a.status,'AVAILABLE');assert.ok(a.probabilityAtPrice>=.8);assert.ok(a.probabilityAtNextCent<.8);assert.ok(b.purchasePrice<=a.purchasePrice);
  const capped=riskAdjustedMao(input,samples,{...rule,maximumPurchasePrice:1});assert.equal(capped.status,'BOUND_LIMITED');
  const impossible=riskAdjustedMao(input,samples,{...rule,minimumProfit:1e8});assert.equal(impossible.status,'NO_FEASIBLE_PRICE');
  assert.throws(()=>riskAdjustedMao(input,samples,{...rule,minimumProbability:2}),/MC_INVALID/);
  const {provenance,...withoutProvenance}=rule;assert.throws(()=>riskAdjustedMao(input,samples,withoutProvenance),/MC_RISK_RULE/);
});
test('zero-uncertainty risk MAO agrees with a deterministic minimum-profit ceiling',()=>{
  const input=normalizeInput({...constantFixture(),simulation:{seed:'constant-mao',iterations:100}}),samples=drawScenarios(input);
  const risk=riskAdjustedMao(input,samples,syntheticRiskRule({minimumProfit:0,minimumProbability:1}));
  assert.equal(risk.purchasePrice,deterministicMao(input).breakEven.purchasePrice);
});
test('risk policy is explicitly attributed, included in run identity and not mutated/frozen on the caller',()=>{
  const input=fixture('B_MARGINAL',100),rule=syntheticRiskRule(),before=JSON.stringify(rule);
  const a=runMonteCarlo(input,{includeSensitivity:false,riskRule:rule});assert.equal(JSON.stringify(rule),before);assert.equal(Object.isFrozen(rule.provenance),false);
  const b=runMonteCarlo(input,{includeSensitivity:false,riskRule:syntheticRiskRule({minimumProfit:10000})});assert.notEqual(a.provenance.runFingerprint,b.provenance.runFingerprint);
  assert.equal(a.riskAdjustedMao.rule.provenance.classification,'SYNTHETIC_TEST_FIXTURE');
});
test('output contract version, fingerprints, provenance and renderer independence',async()=>{
  const r=runMonteCarlo(fixture('A_STRONG_MARGIN',100),{includeSensitivity:false});assert.equal(r.modelVersion,MODEL_VERSION);assert.equal(r.simulation.generatorVersion,GENERATOR_VERSION);assert.equal(r.provenance.modelFingerprint,MODEL_FINGERPRINT);
  const copy=structuredClone(r);delete copy.provenance.resultFingerprint;assert.equal(fingerprint(copy),r.provenance.resultFingerprint);
  assert.ok(Object.values(r.inputs.provenance).every(p=>p.classification==='SYNTHETIC_TEST_FIXTURE'));assert.equal(r.simulation.samplesDiscarded,0);
  for(const file of ['index.js','economics.js','sampling.js','statistics.js','contract.js']){const source=await readFile(new URL(`../src/analysis/monteCarlo/${file}`,import.meta.url),'utf8');assert.doesNotMatch(source,/Math\.random\(|puppeteer|createDatabase|loadEnvFile|fetch\(/);}
  assert.equal(offlineStatus().networkAttempts,0);
});
test('versioned output validates after JSON roundtrip, is frozen and rejects altered metrics/provenance',()=>{
  const r=runMonteCarlo(fixture('B_MARGINAL',100),{includeSensitivity:false});assert.equal(validateResult(JSON.parse(JSON.stringify(r))),true);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.results.profit)&&Object.isFrozen(r.inputs.economics));
  for(const [mutate,code] of [[x=>x.results.probabilityOfLoss=2,'MC_INVALID_result.probabilityOfLoss'],[x=>x.results.profit.p5=x.results.profit.p95+1,'MC_RESULT_PERCENTILE_ORDER'],[x=>x.inputs.economics.purchasePrice+=1,'MC_RESULT_BINDING'],[x=>x.provenance.resultFingerprint='0'.repeat(64),'MC_RESULT_FINGERPRINT_MISMATCH']]){
    const copy=structuredClone(r);mutate(copy);assert.throws(()=>validateResult(copy),{message:code});
  }
});
test('iteration prefixes preserve exact draws and sensitivity stresses cannot silently discard invalid samples',()=>{
  const small=normalizeInput(fixture('C_RENOVATION_OVERRUN',100)),large=normalizeInput(fixture('C_RENOVATION_OVERRUN',1000));assert.deepEqual(drawScenarios(small),drawScenarios(large).slice(0,100));
  const invalid=fixture('A_STRONG_MARGIN',100);invalid.economics.renovationDays=3630;invalid.economics.marketingDays=1;
  invalid.uncertainty.variables.renovationDays={family:'CONSTANT',value:3630};invalid.uncertainty.variables.marketingDays={family:'CONSTANT',value:1};
  assert.throws(()=>runMonteCarlo(invalid),/MC_HOLD_DURATION|MC_INVALID_renovationDays/);
});
for(const [label,change] of [
  ['missing rehab',x=>delete x.economics.rehabCost],['negative cost',x=>x.economics.acquisitionFixed=-1],
  ['negative duration',x=>x.economics.renovationDays=-1],['percent instead of fraction',x=>x.economics.acquisitionRate=2],
  ['invalid LTV',x=>x.economics.financing.ltv=1],['cash fees',x=>x.economics.financing.mode='CASH'],
  ['nonfinite',x=>x.economics.exitValue=Infinity],['null fixture',x=>x.economics.rehabCost=null],
  ['missing evidence',x=>delete x.provenance['economics.purchasePrice']],['unclassified evidence',x=>x.provenance['economics.purchasePrice'].classification='VERIFIED'],
  ['unknown field',x=>x.economics.hiddenTax=10],['unsupported strategy',x=>x.strategy='RENTAL'],
  ['missing dependence',x=>delete x.uncertainty.dependence],['unknown correlation',x=>x.uncertainty.dependence.correlation=.9],
  ['invalid regime weight',x=>x.uncertainty.dependence.scenarios[0].probability=.9],['negative factor',x=>x.uncertainty.dependence.scenarios[0].factors.rehabCost=-1],
  ['invalid triangle',x=>x.uncertainty.variables.rehabCost.mode=1e6],['unknown distribution',x=>x.uncertainty.variables.rehabCost.family='NORMAL'],
  ['bad discrete',x=>x.uncertainty.variables.rehabCost={family:'DISCRETE',outcomes:[{value:1,probability:.2}]}],
  ['zero iterations',x=>x.simulation.iterations=0],['excessive iterations',x=>x.simulation.iterations=100001],['empty seed',x=>x.simulation.seed='']
])test(`invalid input fails closed: ${label}`,()=>{const input=fixture('A_STRONG_MARGIN',100);change(input);assert.throws(()=>runMonteCarlo(input),/MC_/);});
test('invalid/incomplete scenario is rejected with no partial fabricated metrics',()=>{assert.throws(()=>runMonteCarlo(fixture('E_INVALID')),/MC_INVALID_rehabCost/);});
