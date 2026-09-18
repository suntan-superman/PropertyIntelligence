import {context} from './context.js';
export function valuationStatus(sponsor,range,{comparable=false}={}) {
  if(sponsor==null||range?.low==null||range?.high==null) return 'PARTIAL';
  if(sponsor<range.low||sponsor>range.high) return 'CONFLICTING';
  return comparable?'SUPPORTED':'PARTIAL';
}
const missingFields=[
  ['landTenure','identity','Ownership versus leased land is unresolved.'],
  ['parkCommunity','identity','Park/community identity is unknown.'],
  ['ownershipResidencyTransferRestrictions','identity','Investor/resale, age, occupancy, buyer approval and transfer rules not supplied.'],
  ['acquisitionPriceSupport','acquisition','Purchase agreement or closing evidence not supplied.'],
  ['acquisitionClosingCosts','acquisition','Separate acquisition closing costs are unknown.'],
  ['repairScope','repairs','Itemized scope not supplied.'],['contractorEstimate','repairs','Contractor estimate not supplied.'],
  ['repairContingency','repairs','No contingency amount supported.'],['conditionEvidence','repairs','Photos/inspection not supplied.'],
  ['compLandTenure','valuation','Comparable home/land tenure is unresolved.'],
  ['insurance','holding','No policy quote or cost supplied.'],['utilities','holding','No recurring amounts supplied.'],
  ['financing','holding','Financing terms/costs unknown.'],['additionalParkFees','holding','Additional community/park fees unknown.'],
  ['extraHoldingCosts','holding','Other holding charges beyond modeled space rent unknown.'],
  ['transferApplicationFees','selling','Transfer/application charges unknown.'],
  ['priceReductions','selling','No supported price-reduction allowance; scenario reductions are hypotheses.'],
  ['otherDispositionCosts','selling','Other disposition costs unknown.'],
  ['titleEncumbrances','legal','No title/encumbrance evidence supplied.'],
  ['proposedLienPriority','legal','Proposed priority and enforceability unverified.'],
];
export function evidenceCompleteness(input) {
  const properties=input.portfolio.deals.map(deal=>{
    const {seed,result,values,provenance}=context(input,deal.id);
    const accepted=result.status==='INDEPENDENT_EVIDENCE_AVAILABLE';
    const p=accepted?result.property:null;
    const fields=[];
    function add(field,category,sponsorValue=null,independentValue=null,notes=[],forced=null) {
      const s=sponsorValue!==null, i=independentValue!==null;
      const identityUnresolved=!accepted&&['identity','valuation'].includes(category);
      const status=forced??(identityUnresolved?'IDENTITY_UNRESOLVED':s||i?'PARTIAL':'MISSING');
      let supportLevel=s&&i?(status==='CONFLICTING'?'SPONSOR_AND_INDEPENDENT_CONFLICT':'SPONSOR_AND_INDEPENDENT_ALIGNED')
        :s?'SPONSOR_ONLY':i?'INDEPENDENT_ONLY':'NO_EVIDENCE';
      if(field==='projectedResalePrice'&&s&&i&&(independentValue.low==null||independentValue.high==null)) {
        supportLevel='SPONSOR_ONLY';
        notes=[...notes,'Independent estimate retained, but no complete range permits an alignment or conflict determination.'];
      }
      const sources=[];
      if(s)sources.push({source:'Brandon',reference:'data/deals/florida-portfolio.json',field});
      if(i)sources.push(...provenance.filter(source=>source.source==='RentCast'));
      if(field==='address'&&seed.addressConfirmation)sources.push({source:'Stan',reference:seed.addressConfirmation.sourceDocument});
      fields.push({field,category,sponsorValue,independentValue,status,supportLevel,sources,notes,materiality:'MATERIAL'});
    }
    add('address','identity',seed.sponsorAddress,p?.address??null,
      ['Original sponsor wording retained.',...(seed.addressConfirmation?['User confirmation resolves the intended corrected address; not title verification.']:[])],accepted?'SUPPORTED':null);
    for(const field of ['propertyType','bedrooms','bathrooms','squareFeet','yearBuilt']) add(field,'identity',null,p?.[field]??null,
      ['Provider-reported, not VERIFIED.'],p?.[field]!=null?'SUPPORTED':null);
    add('manufacturedIdentity','identity',null,p?.propertyType??null,['Type is reported; home/parcel/tenure documentation remains incomplete.']);
    add('acquisitionCost','acquisition',values.acquisitionCost);
    add('estimatedRepairs','repairs',values.estimatedRepairs);
    add('projectedResalePrice','valuation',values.projectedListPrice,p?.valuation??null,
      ['AVM is an independent estimate, not verified resale value. Tenure and comparability remain unresolved.'],
      accepted?valuationStatus(values.projectedListPrice,p?.valuation):'IDENTITY_UNRESOLVED');
    add('avm','valuation',null,p?.valuation?.price??null,['Provider estimate, not verified fact.']);
    add('avmRange','valuation',null,p?.valuation?{low:p.valuation.low,high:p.valuation.high}:null,['Range is not a probability distribution.']);
    add('comparables','valuation',null,p?.comps??null,['All returned comps retained, without proprietary filtering.']);
    add('compClosedSaleStatus','valuation',null,p?.comps?.map(c=>({id:c.providerId,status:c.status,lastSaleDate:c.lastSaleDate,listedDate:c.listedDate}))??null,
      ['Listing status or removal does not prove a completed sale.']);
    add('daysOnMarket','valuation',null,p?.comps?.map(c=>({id:c.providerId,daysOnMarket:c.daysOnMarket}))??null,
      ['Comp listing DOM is not the subject sale duration.']);
    add('spaceRentThreeMonths','holding',values.spaceRentThreeMonths,null,['Three-month sponsor aggregate; recurring terms and extra fees unverified.']);
    const timeline=input.portfolio.claims.find(c=>c.field==='estimatedTimelineDays').value;
    add('holdingDuration','holding',timeline,null,['Portfolio 120-day schedule lacks milestones; three-month rent aggregate is a distinct assumption.']);
    add('taxes','holding',null,p?.taxes??null,['Historical provider annual taxes are not a supported future holding tax allocation; modeled tax cost remains UNKNOWN.']);
    add('salesCommission','selling',values.salesCommission,null,['Fixed sponsor amount, not a sale-price percentage.']);
    add('escrowClosingCosts','selling',values.escrowClosingCosts,null,['Sponsor sale-closing amount; acquisition/transfer costs remain separate unknowns.']);
    add('liens','legal','Sponsor reports liens on three properties',null,['Instruments and priority not verified.']);
    for(const [field,category,note] of missingFields)add(field,category,null,null,[note]);
    return {propertyId:deal.id,resolutionStatus:result.status,fields};
  });
  const summary={};for(const p of properties)for(const field of p.fields)summary[field.status]=(summary[field.status]??0)+1;
  return {schemaVersion:1,properties,summary,collateral:{status:'OUT_OF_SCOPE',supportLevel:'SPONSOR_ONLY',
    claims:input.portfolio.collateralClaims,notes:['No collateral verification performed.']},
    notes:['SUPPORTED means evidence exists for this field; it is not VERIFIED truth. No numeric score.']};
}
export function sponsorInformationRequest() {
  const requests=[
    ['resaleSupport','Supply the evidence/comps supporting $279,000; identify closed sales versus listings and home/land tenure.'],
    ['landTenure','Does Fantasia include owned land, a leasehold, or home-only/chattel rights? Supply supporting documents.'],
    ['parkCommunity','Identify the park/community and provide governing documents.'],
    ['spaceRent','Confirm monthly space rent, billing terms, rent increases and all additional fees.'],
    ['restrictions','Provide investor/resale, buyer approval, age, occupancy and transfer restrictions.'],
    ['repairs','Supply itemized repair scope, contractor estimates and contingency support.'],
    ['condition','Supply current photos and inspection/condition evidence.'],
    ['taxes','Supply taxes applicable during holding and at transfer, including allocation rules.'],
    ['insurance','Supply insurance quote, coverage period and premiums.'],
    ['utilities','Supply utilities, maintenance and other recurring holding costs.'],
    ['acquisitionClosing','Supply acquisition closing costs and purchase agreement support.'],
    ['financing','Supply financing terms, fees, interest and payment timing.'],
    ['title','Supply title/encumbrance information, proposed lien instruments and priority.'],
    ['schedule','Explain the 120-day schedule and milestones for renovation, listing and closing; reconcile three months of rent.'],
    ['sellingCosts','Support commission/escrow and supply transfer/application fees and other disposition costs.'],
  ].map(([id,question])=>({id:`fantasia-${id}`,propertyId:'fantasia',question,status:'UNANSWERED',priority:'MATERIAL'}));
  requests.push({id:'bass-identity',propertyId:'bass',question:'Supply manufactured-home type, unit/lot, parcel/home identifiers and structural details for 95 Bass Circle; provider record is insufficient.',status:'UNANSWERED',priority:'STOP_GATE'},
    {id:'joyce-address',propertyId:'joyce',question:'Confirm complete street/city/state/ZIP and any unit/lot for 131 Joyce Place.',status:'UNANSWERED',priority:'STOP_GATE'});
  return {status:'DRAFT_NOT_SENT',requests,notes:['No message sent. Collateral verification remains outside this sprint.']};
}
export function monteCarloReadiness(input) {
  const {result,values}=context(input);
  const p=result.property;
  const variables=[
    ['resalePrice',{sponsor:values.projectedListPrice,provider:p?.valuation??null},valuationStatus(values.projectedListPrice,p?.valuation)==='CONFLICTING',
      ['Reconcile sponsor and provider valuation evidence','Establish land tenure and comp comparability','Support sale-price variability']],
    ['repairCost',{sponsor:values.estimatedRepairs},false,['Itemized scope','Contractor estimates','Condition evidence','Observed uncertainty']],
    ['renovationDuration',null,false,['Renovation schedule and milestones','Duration evidence']],
    ['saleDuration',{compDaysOnMarket:p?.comps?.map(c=>c.daysOnMarket)??null},false,['Subject sale-duration evidence','Separate listing and closing time']],
    ['spaceRent',{threeMonthSponsorAggregate:values.spaceRentThreeMonths},false,['Lease/park rent terms','Increases and additional fees']],
    ['taxes',{historicalProviderTaxes:p?.taxes??null},false,['Applicable holding tax basis and allocation']],
    ['insurance',null,false,['Premium quote and coverage period']],['utilities',null,false,['Monthly bills or supported estimates']],
    ['financing',null,false,['Loan amount, fees, rate and payment timing']],
    ['sellingCosts',{commission:values.salesCommission,escrow:values.escrowClosingCosts},false,['Contracts and transfer/disposition charges']],
    ['unexpectedRepairs',null,false,['Inspection evidence','Contingency support and relevant cost history']],
  ].map(([variable,evidenceAvailable,unresolvedConflict,missingInputs])=>({variable,distributionReady:false,evidenceAvailable,
    unresolvedConflict,missingInputs,notes:['Readiness schema only. No distribution, probability or simulation assigned.']}));
  return {propertyId:'fantasia',status:'NOT_READY',variables};
}
