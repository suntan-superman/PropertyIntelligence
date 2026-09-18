import {cents} from './costModel.js';

export const DEAL_UNKNOWN_WARNING='Result excludes material unknown costs and is not a fully burdened profit estimate.';
const unknown=['taxes','insurance','utilities','financing','repairContingency','extraHoldingCosts','additionalParkCommunityFees','transferApplicationFees','priceReductions','otherDispositionCosts'];

export function dealCostModel(values,{provenance=[],sponsorTimelineDays=120}={}) {
  const costs=[
    ['acquisition','acquisitionCost','UPFRONT'],['repairs','estimatedRepairs','UPFRONT'],['spaceRent','spaceRentThreeMonths','HOLDING'],['commission','salesCommission','DISPOSITION']
  ].map(([field,claimField,cashTiming])=>({field,claimField,value:cents(values[claimField])/100,status:'KNOWN_SUPPLIED',source:'Analyst',cashTiming,notes:['Supplied amount, not independently verified cost.']}));
  for(const [field,description,cashTiming,timing] of [
    ['acquisitionClosingCosts','Buyer-side title, escrow, recording and transfer costs.','UPFRONT','CASH INVESTED'],
    ['dispositionClosingCosts','Seller-side title, escrow, transfer and disposition costs, excluding commission unless included.','DISPOSITION','DEDUCTED AT EXIT']
  ]) {
    const value=values[field];
    costs.push({field,claimField:field,value:value===null||value===undefined?null:cents(value)/100,status:value===null||value===undefined?'UNKNOWN':'KNOWN_SUPPLIED',source:value===null||value===undefined?null:'Analyst',cashTiming,timing,notes:[description,'Supplied amount, not independently verified cost.']});
  }
  costs.push(...unknown.map(field=>({field,value:null,status:'UNKNOWN',source:null,notes:['No supported modeled amount.']})));
  const aggregate=values.spaceRentThreeMonths,monthlySpaceRent=aggregate>0?aggregate/3:null;
  return {salePrice:cents(values.projectedListPrice)/100,costs,costCompleteness:'INCOMPLETE',closingCostMode:'EXPLICIT',
    monthlySpaceRent,derivation:monthlySpaceRent===null?{status:'UNAVAILABLE',reason:'No positive recurring holding-cost basis.'}:{status:'DERIVED_FROM_EXPLICIT_AGGREGATE',aggregate,days:values.holdDays,monthlySpaceRent,daysPerModelMonth:30},
    sponsorTimelineDays,baseRentCoverageDays:values.holdDays,provenance,
    warnings:[DEAL_UNKNOWN_WARNING,'Holding scenarios use only supplied recurring space/lot rent; other recurring costs remain unknown.']};
}
