// Local presentation adapter. All financial arithmetic stays in the existing engines.
import {evaluateEconomics, deterministicMao, maximumPrice} from '../analysis/monteCarlo/economics.js';
import {runMonteCarlo} from '../analysis/monteCarlo/index.js';
import {ECONOMICS_VERSION, MODEL_VERSION, VARIABLES, leafPaths} from '../analysis/monteCarlo/contract.js';

export const FIELDS = Object.freeze({
  purchasePrice:'Acquisition price ($)', exitValue:'Resale / exit price ($)', rehabCost:'Rehab ($)',
  contingency:'Rehab contingency (%)', acquisitionFixed:'Purchase closing costs ($)', acquisitionRate:'Purchase closing costs (%)',
  loanAmount:'Acquisition loan amount ($)', annualRate:'Interest rate (%)', points:'Loan points (%)', financingFees:'Loan fees ($)',
  renovationDays:'Renovation days', marketingDays:'Marketing days', propertyTaxes:'Property taxes ($/day)', insurance:'Insurance ($/day)',
  utilities:'Utilities ($/day)', maintenance:'Maintenance ($/day)', otherHolding:'Other holding ($/day)',
  sellingCommissionRate:'Selling commission (%)', sellerClosingFixed:'Seller closing costs ($)', sellerClosingRate:'Seller closing costs (%)',
  transferCost:'Transfer costs ($)', otherUpfront:'Other upfront costs ($)', otherAtExit:'Other exit costs ($)', targetRate:'Target return (%)', targetProfit:'Optional minimum profit ($)'
});
export const ILLUSTRATIVE_EXPENSE_PRESET=Object.freeze({contingency:'10',acquisitionRate:'1.5',sellingCommissionRate:'5',sellerClosingRate:'1',propertyTaxes:'8',insurance:'3',utilities:'5'});
export function blankInputs(){return {...Object.fromEntries(Object.keys(FIELDS).map(k=>[k,'0'])),purchasePrice:'',exitValue:'',rehabCost:'',renovationDays:'90',marketingDays:'30',targetRate:'15',targetProfit:''};}
export function applyIllustrativeExpensePreset(inputs){return {...inputs,...ILLUSTRATIVE_EXPENSE_PRESET};}
export function economicInput(s){
  const i=s.inputs??{}, errors={};
  const n=k=>{const v=i[k];if(v===''||v==null||!['string','number'].includes(typeof v)||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1e9){errors[k]=`Enter a nonnegative number for ${FIELDS[k]}.`;return 0;}return Number(v);};
  const numbers=Object.fromEntries(Object.keys(FIELDS).filter(k=>k!=='targetProfit').map(k=>[k,n(k)]));
  if(!numbers.purchasePrice)errors.purchasePrice='Enter an acquisition price greater than zero.';
  if(!numbers.exitValue)errors.exitValue='Enter an explicit resale assumption greater than zero; the AVM is not ARV.';
  if(numbers.loanAmount>numbers.purchasePrice*.95)errors.loanAmount='Acquisition debt cannot exceed 95% of the acquisition price.';
  if(!numbers.loanAmount&&['annualRate','points','financingFees'].some(k=>numbers[k]))errors.loanAmount='Cash scenarios must have zero interest, points and financing fees.';
  for(const k of ['contingency','acquisitionRate','annualRate','points','sellingCommissionRate','sellerClosingRate','targetRate'])if(numbers[k]>(k==='targetRate'?99:100))errors[k]='Enter a percentage within the supported 0–100 range (target maximum 99%).';
  if(numbers.sellingCommissionRate+numbers.sellerClosingRate>=100)errors.sellingCommissionRate='Combined selling percentages must be below 100%.';
  if(numbers.renovationDays+numbers.marketingDays<=0||numbers.renovationDays+numbers.marketingDays>3650)errors.renovationDays='Total holding duration must be 1–3,650 days.';
  if(i.targetProfit!==''&&i.targetProfit!=null)n('targetProfit');
  const type=s.targetType??'PROFIT_MARGIN_ON_SALE';
  if(!['PROFIT_MARGIN_ON_SALE','RETURN_ON_TOTAL_PROJECT_COST','CASH_ON_CASH'].includes(type))errors.targetRate='Choose a supported return target.';
  if(Object.keys(errors).length)throw Object.assign(new Error('Complete or correct the highlighted analyst assumptions.'),{errors});
  const economics={purchasePrice:numbers.purchasePrice,exitValue:numbers.exitValue,rehabCost:numbers.rehabCost,
    rehabContingencyRate:numbers.contingency/100,acquisitionFixed:numbers.acquisitionFixed,acquisitionRate:numbers.acquisitionRate/100,
    sellingCommissionRate:numbers.sellingCommissionRate/100,sellerClosingFixed:numbers.sellerClosingFixed,sellerClosingRate:numbers.sellerClosingRate/100,
    transferCost:numbers.transferCost,otherUpfront:numbers.otherUpfront,otherAtExit:numbers.otherAtExit,
    renovationDays:numbers.renovationDays,marketingDays:numbers.marketingDays,
    holdingDaily:{propertyTaxes:numbers.propertyTaxes,insurance:numbers.insurance,utilities:numbers.utilities,maintenance:numbers.maintenance,other:numbers.otherHolding},
    financing:{mode:numbers.loanAmount?'ACQUISITION_INTEREST_ONLY':'CASH',ltv:numbers.loanAmount/numbers.purchasePrice,annualRate:numbers.annualRate/100,points:numbers.points/100,fees:numbers.financingFees}};
  return {economics,target:{type,rate:numbers.targetRate/100}};
}
export function monteCarloInput(s, base=economicInput(s)){
  const risk=s.risk??{};const errors={};const variables={};
  for(const k of VARIABLES){const v=risk.variables?.[k];if(!v||['min','mode','max'].some(n=>v[n]===''||v[n]==null||!Number.isFinite(Number(v[n]))||Number(v[n])<0)||Number(v.min)>Number(v.mode)||Number(v.mode)>Number(v.max)){errors[k]=`Enter ordered minimum, most likely and maximum for ${k}.`;continue;}
    variables[k]=Number(v.min)===Number(v.max)?{family:'CONSTANT',value:Number(v.mode)}:{family:'TRIANGULAR',min:Number(v.min),mode:Number(v.mode),max:Number(v.max)};
  }
  if(!risk.seed?.trim())errors.seed='Enter a reproducible simulation seed.';
  if(!Number.isInteger(Number(risk.iterations))||Number(risk.iterations)<100||Number(risk.iterations)>20000)errors.iterations='Use 100–20,000 iterations for this local workspace.';
  if(!risk.rationale?.trim())errors.rationale='Explain the uncertainty bounds and independence assumption.';
  if(Object.keys(errors).length)throw Object.assign(new Error('Complete the uncertainty assumptions before running Monte Carlo.'),{errors});
  const input={scenarioId:s.id,strategy:'FIX_AND_FLIP',assumptionsVersion:`workspace-v1-r${s.revision??0}`, ...base,
    uncertainty:{variables,dependence:{method:'SHARED_SCENARIO_MIXTURE',rationale:risk.rationale,
      conditionalIndependenceRationale:'Analyst-selected independent residuals within one scenario; not empirically calibrated. '+risk.rationale,
      scenarios:[{name:'ANALYST_BASE',probability:1,factors:Object.fromEntries(VARIABLES.map(k=>[k,1]))}]}},
    simulation:{seed:risk.seed,iterations:Number(risk.iterations)},provenance:{}};
  for(const p of [...leafPaths(input.economics,'economics'),'target.type','target.rate',...VARIABLES.map(k=>`uncertainty.variables.${k}`),'uncertainty.dependence'])input.provenance[p]={classification:s.demonstration?'SYNTHETIC_TEST_FIXTURE':'INVESTOR_ASSUMPTION',reference:`local-scenario:${s.id}:r${s.revision??0}`,asOf:s.savedAt??null,rationale:s.demonstration?'Explicit artificial demonstration assumption; not observed property economics.':'Explicit local analyst assumption, not verified costs or predictive evidence.'};
  return input;
}
export function deterministicScenarios(s){
  const base=evaluateEconomics(economicInput(s).economics);
  const cases=[
    ['RESALE_DOWN_10','Resale price decreases 10%',{exitValue:String(Number(s.inputs.exitValue)*.9)}],
    ['REHAB_UP_20','Rehabilitation expenses increase 20%',{rehabCost:String(Number(s.inputs.rehabCost)*1.2)}],
    ['HOLDING_PLUS_30','Holding period increases 30 days',{marketingDays:String(Number(s.inputs.marketingDays)+30)}]
  ];
  return cases.map(([id,label,patch])=>{const scenario={...s,inputs:{...s.inputs,...patch}},result=evaluateEconomics(economicInput(scenario).economics);return {id,label,inputChanges:patch,modeledProfit:result.modeledProfit,profitChange:result.modeledProfit-base.modeledProfit,totalProjectCost:result.totalProjectCost,cashRequired:result.cashRequired,holdingDays:result.holdDays};});
}
export function analyze(s,{risk=false}={}){
  const input=economicInput(s),deterministic=evaluateEconomics(input.economics),mao=deterministicMao(input);
  const profitMao=s.inputs.targetProfit===''||s.inputs.targetProfit==null?null:maximumPrice(p=>evaluateEconomics(input.economics,{},p).modeledProfit>=Number(s.inputs.targetProfit),input.economics.exitValue);
  return {economicsVersion:ECONOMICS_VERSION,modelVersion:MODEL_VERSION,deterministic,mao,profitMao,deterministicScenarios:deterministicScenarios(s),
    monteCarlo:risk?runMonteCarlo(monteCarloInput(s,input)):null};
}
