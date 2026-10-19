import {leafPaths,VARIABLES} from '../../src/analysis/monteCarlo/contract.js';

const constant=value=>({family:'CONSTANT',value});
const triangular=(min,mode,max)=>({family:'TRIANGULAR',min,mode,max});
const factors=(exitValue=1,rehabCost=1,renovationDays=1,marketingDays=1)=>({exitValue,rehabCost,renovationDays,marketingDays});
export function fixture(name='A_STRONG_MARGIN',iterations=10000){
  const input={scenarioId:`SYNTHETIC_MC_${name}`,strategy:'FIX_AND_FLIP',assumptionsVersion:'synthetic-flip-assumptions-v1',
    economics:{purchasePrice:145000,exitValue:300000,rehabCost:30000,rehabContingencyRate:.05,
      acquisitionFixed:2200,acquisitionRate:.015,sellingCommissionRate:.05,sellerClosingFixed:1800,sellerClosingRate:.01,
      transferCost:750,otherUpfront:500,otherAtExit:350,renovationDays:75,marketingDays:45,
      holdingDaily:{propertyTaxes:8,insurance:4,utilities:6,maintenance:3,other:2},
      financing:{mode:'ACQUISITION_INTEREST_ONLY',ltv:.7,annualRate:.1,points:.02,fees:800}},
    target:{type:'CASH_ON_CASH',rate:.25},simulation:{seed:'synthetic-mc-certification-v1',iterations},
    uncertainty:{variables:{exitValue:triangular(285000,300000,315000),rehabCost:triangular(27000,30000,33000),renovationDays:constant(75),marketingDays:constant(45)},
      dependence:{method:'SHARED_SCENARIO_MIXTURE',rationale:'Synthetic stable-scope scenario; cost and timing tail risk intentionally modest.',
        conditionalIndependenceRationale:'Residual sale and scope cost estimates assumed independent within each declared regime, not empirically calibrated.',
        scenarios:[{name:'BASE',probability:1,factors:factors()}]}},provenance:{}};
  if(name==='B_MARGINAL'){
    input.economics.exitValue=206000;input.uncertainty.variables.exitValue=triangular(181000,206000,231000);
  }else if(name==='C_RENOVATION_OVERRUN'){
    input.economics.exitValue=250000;input.economics.rehabContingencyRate=0;
    input.uncertainty.variables.exitValue=triangular(235000,250000,265000);
    input.uncertainty.dependence.rationale='Right-skewed scoped repair costs with common overrun severity driving both repair spending and renovation delay; no additional contingency layer.';
    input.uncertainty.dependence.scenarios=[{name:'NORMAL',probability:.7,factors:factors()},
      {name:'OVERRUN',probability:.2,factors:factors(1,1.6,1.5,1)},
      {name:'SEVERE',probability:.1,factors:factors(1,3,2.5,1)}];
  }else if(name==='D_MARKET_DOWNTURN'){
    input.economics.exitValue=240000;input.uncertainty.variables.exitValue=triangular(225000,240000,255000);
    input.uncertainty.dependence.rationale='Synthetic weak-market regime lowers sale proceeds and extends marketing time jointly; no independent appreciation adjustment.';
    input.uncertainty.dependence.scenarios=[{name:'NORMAL',probability:.6,factors:factors()},
      {name:'WEAK',probability:.3,factors:factors(.8,1,1,2)},
      {name:'SEVERE',probability:.1,factors:factors(.6,1,1,3)}];
  }else if(!['A_STRONG_MARGIN','E_INVALID'].includes(name))throw new Error('UNKNOWN_SYNTHETIC_FIXTURE');
  const paths=[...leafPaths(input.economics,'economics'),'target.type','target.rate',...VARIABLES.map(k=>`uncertainty.variables.${k}`),'uncertainty.dependence'];
  for(const p of paths)input.provenance[p]={classification:'SYNTHETIC_TEST_FIXTURE',reference:`synthetic:${name}:${p}`,asOf:null,
    rationale:'Artificial certification assumption, not a live property value or empirically calibrated estimate.'};
  if(name==='E_INVALID')input.economics.rehabCost=null;
  return input;
}
export const CASES=Object.freeze(['A_STRONG_MARGIN','B_MARGINAL','C_RENOVATION_OVERRUN','D_MARKET_DOWNTURN','E_INVALID']);
export function constantFixture(){const input=fixture();for(const k of VARIABLES)input.uncertainty.variables[k]=constant(input.economics[k]);return input;}
export const syntheticRiskRule=(overrides={})=>({minimumProfit:20000,minimumProbability:.8,maximumPurchasePrice:500000,
  provenance:{classification:'SYNTHETIC_TEST_FIXTURE',reference:'synthetic:mc-v1-risk-policy',asOf:null,
    rationale:'Explicit artificial minimum-profit, probability and search-bound assumptions for computational QA; not an approved investor risk policy.'},...overrides});
