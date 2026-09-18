export const UNKNOWN_WARNING='Result excludes material unknown costs and is not a fully burdened profit estimate.';
export const COST_STATUSES=Object.freeze(['KNOWN_SUPPLIED','KNOWN_INDEPENDENT','UNKNOWN','NOT_APPLICABLE']);
export const UNKNOWN_COSTS=['acquisitionClosingCosts','taxes','insurance','utilities','financing',
  'repairContingency','extraHoldingCosts','additionalParkCommunityFees','transferApplicationFees','priceReductions','otherDispositionCosts'];
export function cents(value) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*100))) {
    throw new Error('UNAVAILABLE: required numeric amount missing or invalid');
  }
  return Math.round(value*100);
}
export function costModel(values,{provenance=[],sponsorTimelineDays=120}={}) {
  const mapping={acquisition:'acquisitionCost',repairs:'estimatedRepairs',spaceRent:'spaceRentThreeMonths',
    commission:'salesCommission',escrow:'escrowClosingCosts'};
  const costs=Object.entries(mapping).map(([field,claimField])=>({field,claimField,value:cents(values[claimField])/100,
    status:'KNOWN_SUPPLIED',source:'Brandon',notes:['Supplied amount, not independently verified cost.']}));
  costs.push(...UNKNOWN_COSTS.map(field=>({field,value:null,status:'UNKNOWN',source:null,
    notes:[field==='taxes'?'Historical annual provider taxes do not establish future holding allocation.':'No supported modeled amount.']})));
  const aggregate=values.spaceRentThreeMonths;
  const monthlySpaceRent=aggregate>0?aggregate/3:null;
  return {salePrice:cents(values.projectedListPrice)/100,costs,costCompleteness:'INCOMPLETE',
    monthlySpaceRent,derivation:monthlySpaceRent===null?{status:'UNAVAILABLE',reason:'No positive three-month rent aggregate.'}:
      {status:'DERIVED_FROM_SPONSOR_AGGREGATE',aggregate,months:3,monthlySpaceRent,
        daysPerModelMonth:30,notes:['30-day months are an explicit deterministic convention, not a lease billing rule.']},
    sponsorTimelineDays,baseRentCoverageDays:90,provenance,
    warnings:[UNKNOWN_WARNING,'Sponsor case retains 3-month rent despite the separate 120-day timeline; holding scenarios replace rent using explicit 30-day months.']};
}
