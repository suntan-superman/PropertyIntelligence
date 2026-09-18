import {cents} from './costModel.js';
export function dealEvaluate(model,overrides={}) {
  const allowed=['salePrice','acquisition','repairs','spaceRent','commission','acquisitionClosingCosts','dispositionClosingCosts','holdDays'];
  if(Object.keys(overrides).some(key=>!allowed.includes(key)))throw new Error('Unknown scenario override');
  if(overrides.holdDays!==undefined&&overrides.spaceRent!==undefined)throw new Error('Conflicting holding overrides');
  const amounts={};
  for(const cost of model.costs.filter(c=>c.status==='KNOWN_SUPPLIED'||c.status==='KNOWN_INDEPENDENT'))amounts[cost.field]=cents(overrides[cost.field]===undefined?cost.value:overrides[cost.field]);
  const warnings=[...model.warnings];let holdDays=model.baseRentCoverageDays;
  if(overrides.holdDays!==undefined){if(typeof overrides.holdDays!=='number'||!Number.isFinite(overrides.holdDays)||overrides.holdDays<0)throw new Error('Invalid holding duration');if(model.monthlySpaceRent===null)return {status:'UNAVAILABLE',reason:'RECURRING_HOLDING_COSTS_UNKNOWN',profitImpact:null,costCompleteness:'INCOMPLETE',warnings};holdDays=overrides.holdDays;amounts.spaceRent=cents(model.monthlySpaceRent*holdDays/30);warnings.push('Holding scenarios use only supplied recurring space/lot rent; taxes, insurance, utilities, financing and other recurring costs remain excluded.');}
  const sale=cents(overrides.salePrice===undefined?model.salePrice:overrides.salePrice);
  const {acquisition,repairs,spaceRent,commission}=amounts;if([acquisition,repairs,spaceRent,commission].some(v=>v===undefined))throw new Error('UNAVAILABLE: modeled base costs incomplete');
  const acqClose=amounts.acquisitionClosingCosts??0,dispClose=amounts.dispositionClosingCosts??0;
  const extraCosts=model.costs.filter(c=>!['acquisition','repairs','spaceRent','commission','acquisitionClosingCosts','dispositionClosingCosts'].includes(c.field)&&amounts[c.field]!==undefined);
  const extra=extraCosts.reduce((sum,c)=>sum+amounts[c.field],0),extraCash=extraCosts.filter(c=>c.cashTiming==='UPFRONT').reduce((sum,c)=>sum+amounts[c.field],0);
  const projectCost=acquisition+repairs+spaceRent+commission+acqClose+dispClose+extra,profit=sale-projectCost,cash=acquisition+repairs+spaceRent+acqClose+extraCash;
  return {status:'AVAILABLE',grossSale:sale/100,modeledProceeds:(sale-commission-dispClose-spaceRent-(extra-extraCash))/100,modeledProjectCost:projectCost/100,modeledProfit:profit/100,scenarioCashInvested:cash/100,cashOnCash:cash===0?null:profit/cash,profitMargin:sale===0?null:profit/sale,includedCosts:Object.fromEntries(Object.entries(amounts).map(([k,v])=>[k,v/100])),modeledHoldingDays:holdDays,sponsorTimelineDays:model.sponsorTimelineDays,costCompleteness:model.costCompleteness,excludedUnknownCosts:model.costs.filter(c=>c.status==='UNKNOWN'),fullyBurdenedProfit:null,warnings};
}
