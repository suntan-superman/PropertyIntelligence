const valueOf=(claims,...fields)=>{
  const item=claims.find(claim=>fields.includes(claim.field));
  return item?.value;
};
const evidenceOf=(evidence,field)=>evidence.find(item=>item.field===field);
const hasValue=value=>value!==null&&value!==undefined&&value!=='';
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);

/**
 * Deterministic, presentation-neutral deal diligence questions.
 * This function only reads the supplied normalized model; it never calls a provider.
 */
export function diligenceQuestions({id='deal',claimOrigin='ANALYST_ENTERED',property={},claims=[],evidence=[],analysis=null}={}) {
  const questions=[];
  const add=(category,key,question,trigger,materiality='MATERIAL',relatedFields=[])=>questions.push({
    id:`${id}-${key}`,category,question,trigger,materiality,relatedFields,status:'UNANSWERED'
  });
  const claim=(...fields)=>valueOf(claims,...fields);
  const field=(name)=>evidenceOf(evidence,name);
  const supported=(name)=>['SUPPORTED','AVAILABLE'].includes(field(name)?.status);
  const missing=(name)=>!field(name)||['MISSING','NO_EVIDENCE','IDENTITY_UNRESOLVED'].includes(field(name)?.status);
  const acquisition=claim('acquisitionCost','acquisition');
  const repairs=claim('estimatedRepairs','repairs');
  const resale=claim('projectedListPrice','sale');
  const holdDays=claim('holdDays','holdingDuration');
  const rent=claim('spaceRentForHoldingPeriod','spaceRentThreeMonths','rent');
  const commission=claim('salesCommission','commission');
  const acquisitionClosing=claim('acquisitionClosingCosts');
  const dispositionClosing=claim('dispositionClosingCosts');
  const legacyClosing=claim('escrowClosingCosts','escrow');
  const explicitClosing=claims.some(item=>['acquisitionClosingCosts','dispositionClosingCosts'].includes(item.field));

  if(hasValue(acquisition)&&!supported('acquisitionPriceSupport')) {
    add('Acquisition','acquisition-support',`What supports the ${money(acquisition)} acquisition price? Please provide the purchase agreement, offer, assignment, auction result, or other acquisition evidence.`,
      'Acquisition price support is not independently available.', 'MATERIAL',['acquisitionCost','acquisitionPriceSupport']);
  }
  if(explicitClosing ? !hasValue(acquisitionClosing) : !supported('acquisitionClosingCosts')) {
    add('Acquisition','acquisition-closing','What buyer-side acquisition closing costs should be expected for title, escrow, recording, transfer and other purchase fees?',
      'Acquisition closing costs are unknown or not separately supported.','MATERIAL',['acquisitionClosingCosts']);
  }

  if(hasValue(repairs)) {
    if(missing('repairScope')) add('Repairs & Condition','repair-scope','What work is included in the repair budget? Please provide a contractor or itemized scope.',
      'Repair scope is not supported.','MATERIAL',['estimatedRepairs','repairScope']);
    if(missing('contractorEstimate')) add('Repairs & Condition','contractor-estimate','Please provide contractor estimates or other itemized pricing supporting the repair budget.',
      'Contractor estimate is not supported.','MATERIAL',['estimatedRepairs','contractorEstimate']);
  }
  if(missing('repairContingency')) add('Repairs & Condition','repair-contingency','What contingency amount or percentage is included for repairs?',
    'Repair contingency is not supplied.','MATERIAL',['repairContingency']);
  if(missing('conditionEvidence')) add('Repairs & Condition','condition','Please provide current photos, inspection findings and other condition evidence.',
    'Condition evidence is not supplied.','MATERIAL',['conditionEvidence']);

  if(hasValue(resale)) {
    const independent=field('projectedResalePrice')?.independentValue??property.valuation;
    const outside=independent?.low!=null&&independent?.high!=null&&(resale<independent.low||resale>independent.high);
    if(outside) add('Valuation','resale-divergence',`The projected resale of ${money(resale)} lies outside the independent range. What evidence explains that divergence?`,
      'Projected resale is outside the independent valuation range.','MATERIAL',['projectedListPrice','projectedResalePrice','avmRange']);
    else if(missing('projectedResalePrice')||['PARTIAL','CONFLICTING','SPONSOR_ONLY'].includes(field('projectedResalePrice')?.status))
      add('Valuation','resale-support',`What supports the projected resale price of ${money(resale)}? Please provide the exit valuation basis.`,
        'Projected resale support is not independently available.','MATERIAL',['projectedListPrice','projectedResalePrice']);
  }
  if(Array.isArray(property.comps)&&property.comps.length&&!field('compBasis')) {
    add('Valuation','comp-basis','Please provide the supporting exit comps and distinguish closed sales from active or inactive listings.',
      'Independent comparables exist, but a sponsor or analyst exit-comp basis is not supplied.','MATERIAL',['comparables','compBasis','compClosedSaleStatus']);
  }

  if(hasValue(holdDays)) add('Schedule','holding-basis',`What supports the ${holdDays}-day holding period, including renovation, listing and closing milestones?`,
    'Holding period is supplied without milestone support.','MATERIAL',['holdDays','holdingDuration']);
  const recurring=[['taxes','tax treatment'],['insurance','insurance'],['utilities','utilities'],['financing','financing and interest'],['maintenance','maintenance/security']];
  for(const [fieldName,label] of recurring) if(missing(fieldName)) add('Holding Costs',`holding-${fieldName}`,`Please provide the expected ${label} costs during the holding period.`,
    `${label[0].toUpperCase()+label.slice(1)} costs are not supported.`, 'MATERIAL',[fieldName]);
  if(hasValue(rent)&&missing('spaceRentTerms')) add('Holding Costs','space-rent','Please provide space or lot rent terms, increases and all additional community fees.',
    'Recurring space/lot rent terms are not supplied.','MATERIAL',['spaceRentForHoldingPeriod','spaceRentThreeMonths','spaceRentTerms']);

  if(missing('titleEncumbrances')||missing('title')) add('Title / Legal','title','Please provide current title, encumbrance and ownership evidence.',
    'Title or encumbrance evidence is not supplied.','MATERIAL',['titleEncumbrances','title']);
  if(claims.some(item=>/lien|security|promissory/i.test(item.field))||missing('proposedLienPriority')) add('Title / Legal','lien-priority','Please provide lien positions, security instruments and priority/enforceability support as applicable.',
    'Security or lien structure is unresolved.','MATERIAL',['liens','proposedLienPriority']);

  const manufactured=/manufactured|mobile|park/i.test(String(property.propertyType??''));
  if(manufactured) {
    for(const [key,question,fields] of [
      ['land-tenure','Does the deal include owned land, a leasehold or home-only/chattel rights? Please provide supporting documents.',['landTenure']],
      ['community','Which community or park governs the property? Please provide the lot agreement and fee schedule.',['parkCommunity']],
      ['transfer-restrictions','What buyer approval, age, occupancy, investor/resale or transfer restrictions apply?',['ownershipResidencyTransferRestrictions']],
      ['comp-tenure','What is the land/home tenure for the exit comps, and how does it compare with the subject?',['compLandTenure']]
    ]) if(missing(fields[0])) add('Manufactured / Community',key,question,'Manufactured-home land, community or transfer evidence is incomplete.','MATERIAL',fields);
  }

  if(hasValue(commission)&&missing('commissionSupport')) add('Other Deal Costs','commission-basis','What commission basis or rate supports the modeled commission amount?',
    'Commission amount is supplied without supporting basis.','MATERIAL',['salesCommission','commissionSupport']);
  if(explicitClosing ? !hasValue(dispositionClosing) : !supported('dispositionClosingCosts')) add('Other Deal Costs','disposition-closing','What seller-side disposition closing costs should be expected for title, escrow, transfer and other exit fees, excluding commission unless explicitly included?',
    'Disposition closing costs are unknown or not separately supported.','MATERIAL',['dispositionClosingCosts']);
  else if(hasValue(legacyClosing)&&missing('dispositionClosingCosts')) add('Other Deal Costs','disposition-closing-basis','Please confirm what the legacy sale-closing amount includes and whether any transfer or disposition fees are excluded.',
    'Legacy closing claim lacks a category breakdown.','MATERIAL',['escrowClosingCosts','dispositionClosingCosts']);

  return questions.map(question=>({...question,claimOrigin}));
}

export const diligenceQuestionCategories=Object.freeze(['Acquisition','Valuation','Repairs & Condition','Holding Costs','Title / Legal','Manufactured / Community','Schedule','Other Deal Costs']);
