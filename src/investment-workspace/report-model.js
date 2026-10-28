// Workspace V1.1 presentation model. Independent of HTML/Puppeteer; the original
// synthetic report adapter and every financial calculation remain untouched.
import {analyze} from './analysis.js';
import {ANALYST_EVIDENCE_CATEGORIES,evidenceGapSummary,safeReportEvidence} from './analyst-evidence.js';
import {deriveSellerFinancialPosition} from '../../apps/web/src/features/investment-workspace/seller-position.js';
import {groupComparableObservations} from '../../apps/web/src/features/investment-workspace/comparable-identity.js';
import {generateDueDiligenceChecklist} from './due-diligence-checklist.js';

export const REPORT_VERSION='Property Intelligence V3.2 Property Photo Gallery and Investor Report Polish';
export const NOTICE='Preliminary underwriting—not appraisal/title verification. Assumptions are not verified costs; simulation output is not predictive accuracy.';
export const RISK_NOTICE='Under entered assumptions; not a forecast of actual investment risk';
export const TYPES=Object.freeze({fact:'PROVIDER-REPORTED FACT',model:'PROVIDER MODEL ESTIMATE',county:'COUNTY HISTORICAL RECORD',assumption:'ANALYST ASSUMPTION',calculation:'PI CALCULATION',review:'PRELIMINARY ADDRESS REVIEW',unknown:'UNKNOWN'});
const TYPE_LABELS=Object.freeze({
  [TYPES.fact]:'Provider-reported fact',[TYPES.model]:'Provider model estimate',[TYPES.county]:'Historical county record',
  [TYPES.assumption]:'Analyst assumption',[TYPES.calculation]:'PI calculated output',[TYPES.review]:'Preliminary address review',
  [TYPES.unknown]:'Unknown','DURABLE PROPERTY REFERENCE':'Existing durable Property reference'
});
const STATUS_LABELS=Object.freeze({PRESENT:'Present',ABSENT:'Reported absent',RELEASED:'Reported released',NOT_APPLICABLE:'Not applicable',UNKNOWN:'Unknown'});
const VERIFICATION_LABELS=Object.freeze({
  RECORDED_DOCUMENT:'Recorded-document evidence',SOURCE_REPORTED:'Source-reported — not independently verified',
  ANALYST_ASSUMPTION:'Analyst assumption',INDEPENDENTLY_VERIFIED:'Independently verified',ANALYST_OBSERVED:'Analyst-observed',
  UNVERIFIED_NOTE:'Unverified note',UNKNOWN:'Unknown'
});
const missing=v=>v===null||v===undefined||v==='';
const moneySafe=value=>Number.isFinite(value)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value):'an unknown amount';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function datum(value,classification,source,asOf=null,retrievedAt=null){
  if(!source?.trim())throw new Error('A meaningful report source is required.');
  return {value:missing(value)?null:value,classification:missing(value)?TYPES.unknown:classification,source,asOf:asOf||null,retrievedAt:retrievedAt||null};
}
export function simulationFrequency(probability,iterations){
  if(!Number.isFinite(probability)||probability<0||probability>1||!Number.isInteger(iterations)||iterations<1)throw new Error('Invalid simulated frequency.');
  const count=Math.round(probability*iterations);
  if(Math.abs(count/iterations-probability)>1e-12)throw new Error('Frequency cannot be reconciled to the simulation count.');
  return {count,iterations,frequency:probability};
}
const lenderPayoffSupported=(entry,hasLinkedDocument=false)=>entry?.category==='VERIFIED_PAYOFF'&&entry.status==='PRESENT'&&entry.verificationClass==='INDEPENDENTLY_VERIFIED'&&Boolean(entry.sourceDate)&&Boolean(entry.attachmentReference||hasLinkedDocument)&&/\b(lender|bank|servicer|escrow|title|payoff (?:demand|statement))\b/i.test(String(entry.sourceName??''));
const publicPropertySource=p=>`RentCast property record · ${p.address}`;
const publicValuationSource=p=>p.avm?.price==null?'Valuation not checked / not available':`RentCast as-is valuation · ${p.address}`;
const materialCostLabels=Object.freeze({
  contingency:'Rehabilitation contingency',acquisitionFixed:'Acquisition closing costs',acquisitionRate:'Acquisition closing rate',
  propertyTaxes:'Holding property taxes',insurance:'Holding insurance',utilities:'Holding utilities',maintenance:'Holding maintenance',
  otherHolding:'Other holding costs',sellingCommissionRate:'Selling commission',sellerClosingFixed:'Seller closing costs',
  sellerClosingRate:'Seller closing rate',transferCost:'Transfer costs',otherUpfront:'Other upfront costs',otherAtExit:'Other exit costs'
});
const materialCostKeys=Object.freeze(Object.keys(materialCostLabels));
const KERN_LOCALITIES=new Set(['bakersfield','boron','delano','frazier park','kernville','lake isabella','lamont','lost hills','maricopa','mc farland','mcfarland','mojave','rosamond','shafter','taft','tehachapi','wasco']);
const actualKernSource=p=>{
  const refs=[p.historicalTrigger?.sourceRef,p.countyUse?.sourceRef,...(p.researchProvenance??[]).map(item=>item.reference)].filter(value=>value&&!/^No county|not present|unknown/i.test(String(value)));
  const city=String(p.addressComponents?.city??p.city??'').trim().toLowerCase(),kernJurisdiction=/^Kern(?: County)?$/i.test(String(p.attributes?.county??'').trim())||KERN_LOCALITIES.has(city);
  const structuredCountyEvidence=Boolean(p.historicalTrigger?.kind||p.historicalTrigger?.amount!=null||p.countyUse?.code);
  return refs.some(value=>/Kern County|Power[- ]to[- ]Sell|KERN_/i.test(String(value)))||(kernJurisdiction&&structuredCountyEvidence);
};
function costCompleteness(inputs){
  const items=materialCostKeys.map(key=>{
    const raw=inputs?.[key];
    if(raw===''||raw===null||raw===undefined)return {key,status:'NOT_REVIEWED',label:'Not reviewed'};
    if(!Number.isFinite(Number(raw)))return {key,status:'UNKNOWN',label:'Unknown'};
    if(Number(raw)===0)return {key,status:'EXPLICIT_ZERO_ASSUMPTION',label:'Explicitly assumed $0'};
    return {key,status:'ANALYST_ASSUMPTION',label:'Analyst assumption entered'};
  });
  const count=status=>items.filter(item=>item.status===status).length;
  const incomplete=items.filter(item=>['NOT_REVIEWED','UNKNOWN','EXPLICIT_ZERO_ASSUMPTION'].includes(item.status));
  return {items:items.map(item=>({...item,label:materialCostLabels[item.key]})),notReviewed:count('NOT_REVIEWED'),unknown:count('UNKNOWN'),explicitZero:count('EXPLICIT_ZERO_ASSUMPTION'),verifiedZero:0,entered:count('ANALYST_ASSUMPTION'),
    materialCostsIncomplete:incomplete.length>0,majorUnentered:incomplete.map(item=>materialCostLabels[item.key]),
    status:incomplete.length?'INCOMPLETE':'COMPLETE',profitLabel:incomplete.length?'Illustrative modeled spread after entered costs':'Estimated net profit',
    notice:incomplete.length?'Material cost categories are unentered or explicitly assumed $0; the result is not an estimated net profit.':'All tracked material cost categories contain an analyst-entered amount; values still require verification.'};
}
const claimValue=(s,fieldKey)=>{
  const entries=s.analystEvidence??[];
  const category={
    'SELLER.ORIGINAL_PRINCIPAL':'ORIGINAL_PRINCIPAL','SELLER.ALGORITHMIC_BALANCE':'ALGORITHMIC_BALANCE',
    'SELLER.VERIFIED_PAYOFF':'VERIFIED_PAYOFF','SELLER.DELINQUENT_TAX':'DELINQUENT_TAX','SELLER.PROPOSED_SALE_PRICE':'PROPOSED_SALE_PRICE'
  }[fieldKey];
  if(category){const entry=[...entries].filter(item=>item.category===category&&item.status==='PRESENT').sort((a,b)=>String(b.sourceDate??'').localeCompare(String(a.sourceDate??'')))[0];return entry&&Number.isFinite(Number(entry.value))?Number(entry.value):null;}
  if(fieldKey.startsWith('UNDERWRITING.')){const key=fieldKey.slice('UNDERWRITING.'.length).toLowerCase();const match=Object.keys(s.inputs??{}).find(item=>item.toLowerCase()===key);return match&&Number.isFinite(Number(s.inputs[match]))?Number(s.inputs[match]):null;}
  return null;
};
const DOCUMENT_AMOUNT_TYPES=Object.freeze({
  'SELLER.ORIGINAL_PRINCIPAL':'ORIGINAL_RECORDED_PRINCIPAL',
  'SELLER.ALGORITHMIC_BALANCE':'ESTIMATED_CURRENT_MORTGAGE_BALANCE',
  'SELLER.VERIFIED_PAYOFF':'LENDER_PAYOFF_AMOUNT',
  'SELLER.DELINQUENT_TAX':'DELINQUENT_PROPERTY_TAX_AMOUNT',
  'SELLER.PROPOSED_SALE_PRICE':'ANALYST_PROPOSED_SALE_PRICE',
  'UNDERWRITING.REHABCOST':'REHABILITATION_ESTIMATE',
  'UNDERWRITING.PURCHASEPRICE':'CONTRACT_PURCHASE_PRICE',
  'UNDERWRITING.EXITVALUE':'RESALE_VALUE_SUPPORT'
});
const reportItemEligible=item=>item?.version?.scanStatus==='CLEAN'&&['REVIEWED','INDEPENDENTLY_VERIFIED'].includes(item?.document?.reviewStatus)&&item?.document?.redistributionPermission==='APPROVED'&&item?.document?.confidentiality==='STANDARD'&&item?.document?.appendixSelected!==false;
const analystTranscription=(link,fieldKey)=>{
  const semanticType=DOCUMENT_AMOUNT_TYPES[fieldKey]??fieldKey,amount=Number(link?.documentAmount),page=Number(link?.documentAmountSourcePage),validPage=Number.isInteger(page)&&page>0,sourceNote=String(link?.documentAmountSourceNote??'').trim();
  if(link?.documentAmountAnalystConfirmed!==true||!Number.isFinite(amount)||link.documentAmountCurrency!=='USD'||link.documentAmountSemanticType!==semanticType||(!validPage&&!sourceNote))return null;
  return {amount,basis:'Analyst-entered document amount',sourcePage:validPage?page:null,sourceNote:sourceNote||null,semanticType,confirmedBy:'Authenticated analyst',confirmedAt:link.documentAmountConfirmedAt??null,currency:'USD'};
};
const structuredDocumentClaim=(item,link,fieldKey)=>{
  const entered=analystTranscription(link,fieldKey);
  if(entered)return {claim:entered,hasOtherApprovedAmount:false};
  const semanticType=DOCUMENT_AMOUNT_TYPES[fieldKey]??fieldKey;
  const enteredWrongClaim=link?.documentAmountAnalystConfirmed===true&&Number.isFinite(Number(link.documentAmount))&&Boolean(link.documentAmountSemanticType)&&link.documentAmountSemanticType!==semanticType;
  return {claim:null,hasOtherApprovedAmount:enteredWrongClaim};
};
function evidenceReconciliation(s,supportingDocuments){
  const rows=[];
  for(const link of s.evidenceAttachments??[]){
    const candidate=supportingDocuments.find(item=>item.document?.id===link.documentId&&Number(item.version?.version??item.document?.currentVersion??link.version)===Number(link.version)),item=reportItemEligible(candidate)?candidate:null;
    const scenarioAmount=claimValue(s,link.fieldKey),structuredResult=item?structuredDocumentClaim(item,link,link.fieldKey):{claim:null,hasOtherApprovedAmount:false},structured=structuredResult.claim;
    const delta=scenarioAmount!==null&&structured?Math.round((structured.amount-scenarioAmount)*100)/100:null;
    const status=!item?'DOCUMENT_NOT_INCLUDED':scenarioAmount===null?'NOT_RECONCILED':structured?Math.abs(delta)<0.005?'MATCH':'DIFFERENCE_REVIEW':structuredResult.hasOtherApprovedAmount?'NOT_COMPARABLE':'NOT_RECONCILED';
    rows.push({fieldKey:link.fieldKey,fieldLabel:link.fieldLabel,documentId:link.documentId,version:link.version,filename:item?.version?.filename??link.filename??'Supporting document',
      linked:Boolean(item),scanStatus:item?.version?.scanStatus??link.scanStatus??'UNKNOWN',reviewStatus:item?.document?.reviewStatus??link.reviewStatus??'UNKNOWN',
      redistributionPermission:item?.document?.redistributionPermission??link.redistributionPermission??'UNKNOWN',scenarioAmount,documentAmount:structured?.amount??null,
      documentAmountBasis:structured?.basis??null,documentAmountSourcePage:structured?.sourcePage??null,documentAmountSourceNote:structured?.sourceNote??null,documentAmountSemanticType:structured?.semanticType??null,
      documentAmountConfirmedBy:structured?.confirmedBy??null,documentAmountConfirmedAt:structured?.confirmedAt??null,appendix:item?.index??null,status,delta});
  }
  const discrepancies=rows.filter(row=>row.status==='DIFFERENCE_REVIEW');
  return {rows,discrepancies,notReconciled:rows.filter(row=>row.status==='NOT_RECONCILED'),notComparable:rows.filter(row=>row.status==='NOT_COMPARABLE'),
    status:discrepancies.length?'MATERIAL_DIFFERENCES_PRESENT':rows.length?'REVIEW_REQUIRED':'NO_LINKED_EVIDENCE',
    notice:'PI compares like-with-like amounts only when an analyst explicitly enters and confirms an amount, semantic claim type and source page for the approved immutable document version. It does not infer values from PDF text or OCR.'};
}
export function reportModel(p,s,{generatedAt=new Date().toISOString(),supportingDocuments=[]}={}){
  if(p.ref!==s.propertyRef)throw new Error('Report property and scenario do not match.');
  const durable=p.subjectKind==='DURABLE_SAVED',discovery=p.subjectKind==='DISCOVERY_CANDIDATE';
  const analysis=analyze(s,{risk:s.riskRequested}),e=analysis.deterministic,mc=analysis.monteCarlo;
  const propertySource=discovery?p.propertyRef:publicPropertySource(p),valuationSource=discovery?'Valuation not checked / not available':publicValuationSource(p);
  const fact=v=>datum(v,discovery?TYPES.county:TYPES.fact,propertySource,p.providerAsOf??p.historicalTrigger.sourceDate,p.propertyRetrievedAt);
  const assumption=v=>datum(v,TYPES.assumption,`${s.name} · revision ${s.revision}`,s.savedAt);
  const calc=v=>datum(v,TYPES.calculation,analysis.economicsVersion,s.savedAt);
  const unknown=source=>datum(null,TYPES.unknown,source);
  const comparableGroups=groupComparableObservations(p.sales),comparables=comparableGroups.map((group,index)=>{
    const c=group.records[0],reviews=group.records.map(record=>s.compReviews?.[record.evidenceRef]).filter(Boolean),roles=reviews.map(review=>String(review.role??'').toUpperCase()),includedReview=reviews.some(review=>review.include===true),excludedReview=reviews.some(review=>review.include===false||String(review.role??'').toUpperCase()==='EXCLUDED');
    // Existing boolean review contract: an explicit false is excluded; absence
    // means not selected. No selection changes the engine's resale assumption.
    const role=roles.includes('PRIMARY')?'PRIMARY':roles.includes('SECONDARY')?'SECONDARY':excludedReview?'EXCLUDED':'NOT_CLASSIFIED';
    const status=role==='EXCLUDED'?'Excluded':role==='PRIMARY'?'Primary comparable':role==='SECONDARY'?'Secondary comparable':includedReview?'Included in analyst analysis':'Not selected';
    const reference=`RC-SALE-${String(index+1).padStart(3,'0')}`,reported=v=>datum(v,TYPES.fact,`RentCast reported sale · ${c.address} · ${reference}`,c.saleDate,p.saleSearch.retrievedAt);
    return {reference,privateAuditReference:c.evidenceRef,privateAuditReferences:group.records.map(record=>record.evidenceRef),status,role,analystRationale:[...new Set(reviews.map(review=>String(review.notes??'').trim()).filter(Boolean))].join(' · ')||null,observationCount:group.records.length,duplicateStatus:group.identityStatus,duplicateReason:group.identityReason,reviewFlags:group.reviewFlags,
      address:reported(c.address),propertyType:reported(c.propertyType),salePrice:reported(c.salePrice),saleDate:reported(c.saleDate),
      distanceMiles:reported(c.distance),livingAreaSqft:reported(c.squareFootage),bedrooms:reported(c.bedrooms),bathrooms:reported(c.bathrooms),ageDays:reported(c.ageDays),
      similarity:reported(c.reason||'Comparability not established; transfer terms and condition unverified'),
      adjustments:unknown('No independently supported price adjustments'),
      transferTerms:unknown('No independently verified closing / arm’s-length evidence'),condition:unknown('No condition inspection')};
  });
  const included=comparables.filter(c=>c.role!=='EXCLUDED'&&c.status!=='Not selected'),primary=comparables.filter(c=>c.role==='PRIMARY'),prices=comparables.map(c=>c.salePrice.value).filter(Number.isFinite);
  const older=comparables.filter(c=>c.ageDays.value>180).length;
  const readableReference=p.ref.startsWith('PROPERTY-')?`Saved Property · ${p.address.split(',')[0]}`:discovery?`County Candidate · ${p.ref}`:p.ref;
  const sellerBase=deriveSellerFinancialPosition({providerValuation:p.avm.price,providerValuationSource:valuationSource,valuationBasis:s.sellerValuationBasis??'PROVIDER_AVM',entries:s.analystEvidence??[]});
  const originalEntry=sellerBase.originalRecordedMortgage.entry;
  const linkedTo=(fieldKey,entry=null)=>(s.evidenceAttachments??[]).some(link=>link.fieldKey===fieldKey||(entry&&link.fieldKey===`ANALYST.${entry.id}`));
  const originalDocumentSupported=originalEntry?.verificationClass==='RECORDED_DOCUMENT'&&!/^tax assessor$/i.test(String(originalEntry.sourceName??'').trim())&&Boolean(originalEntry.attachmentReference||linkedTo('SELLER.ORIGINAL_PRINCIPAL',originalEntry)||/deed|mortgage|document|recorder|title/i.test(String(originalEntry.sourceName??'')));
  const originalPrincipalPresentation=originalEntry?{
    documentSupported:originalDocumentSupported,
    label:originalDocumentSupported?'Recorded original principal':'Entered original mortgage amount',
    verification:originalDocumentSupported?'Recorded-document evidence':'Source attribution does not establish review of a recorded mortgage document',
    explanation:originalDocumentSupported?'Historical recorded principal—not current balance or payoff':'Entered historical amount; recorded-document status is not established'
  }:{documentSupported:false,label:'Original mortgage amount',verification:'Not established',explanation:'No original mortgage evidence supplied'};
  const estimatedEntry=sellerBase.mortgage.entry;
  const sellerReportedEstimate=sellerBase.mortgage.status==='ESTIMATED_BALANCE'&&estimatedEntry?.verificationClass==='SOURCE_REPORTED'&&/\bseller\b/i.test(estimatedEntry.sourceName??'');
  const payoffSupported=lenderPayoffSupported(estimatedEntry,linkedTo('SELLER.VERIFIED_PAYOFF',estimatedEntry)),unsupportedPayoff=sellerBase.mortgage.status==='VERIFIED_PAYOFF'&&!payoffSupported;
  const estimatedLabel=unsupportedPayoff?'Owner-reported payoff claim — unverified':sellerReportedEstimate?'Seller-reported estimated balance':sellerBase.mortgage.status==='ESTIMATED_BALANCE'?'Provider algorithmic estimated balance':sellerBase.mortgage.label;
  const unresolvedObligations=[...sellerBase.unresolvedObligations,...(unsupportedPayoff&&!sellerBase.unresolvedObligations.includes('Current lender-issued payoff demand')?['Current lender-issued payoff demand']:[])];
  const sellerComplete=unresolvedObligations.length===0;
  const taxEntry=[...(s.analystEvidence??[])].filter(entry=>entry.category==='DELINQUENT_TAX'&&entry.status==='PRESENT').sort((a,b)=>String(b.sourceDate??'').localeCompare(String(a.sourceDate??'')))[0]??null;
  const sellerFinancialPosition={...sellerBase,originalPrincipalPresentation,unresolvedObligations,mortgage:{...sellerBase.mortgage,status:unsupportedPayoff?'OWNER_REPORTED_PAYOFF_CLAIM':sellerBase.mortgage.status,label:estimatedLabel},taxes:{...sellerBase.taxes,entry:taxEntry},grossEquity:sellerComplete?sellerBase.grossEquity:null,estimatedSellerProceeds:sellerComplete?sellerBase.estimatedSellerProceeds:null,calculationStatus:sellerComplete?sellerBase.calculationStatus:'INCOMPLETE_UNKNOWN_OBLIGATIONS',provenance:{mortgage:estimatedEntry?.verificationClass??'UNKNOWN',source:estimatedEntry?.sourceName??null,lenderPayoffSupported:payoffSupported}};
  const costs=costCompleteness(s.inputs),reconciliation=evidenceReconciliation(s,supportingDocuments),unattributedClaims=unsupportedPayoff?['Owner-reported payoff claim lacks a dated lender-issued payoff demand.']:[];
  const latestEvidence=category=>[...(s.analystEvidence??[])].filter(entry=>entry.category===category&&entry.status==='PRESENT').sort((a,b)=>String(b.sourceDate??'').localeCompare(String(a.sourceDate??'')))[0]??null,currentOccupancy=latestEvidence('OCCUPANCY'),deliveryCondition=latestEvidence('DELIVERY_CONDITION'),possessionConfirmation=latestEvidence('POSSESSION');
  const occupancyDelivery={currentOccupancy:currentOccupancy?{value:currentOccupancy.value||'Present',verification:VERIFICATION_LABELS[currentOccupancy.verificationClass]??currentOccupancy.verificationClass,source:currentOccupancy.sourceName,date:currentOccupancy.sourceDate}:null,deliveryCondition:deliveryCondition?{value:deliveryCondition.value||'Delivery condition reported',verification:VERIFICATION_LABELS[deliveryCondition.verificationClass]??deliveryCondition.verificationClass,source:deliveryCondition.sourceName,date:deliveryCondition.sourceDate}:null,possessionConfirmation:possessionConfirmation?{value:possessionConfirmation.value||'Possession confirmed',verification:VERIFICATION_LABELS[possessionConfirmation.verificationClass]??possessionConfirmation.verificationClass,source:possessionConfirmation.sourceName,date:possessionConfirmation.sourceDate}:null,notice:'Current occupancy and advertised vacant delivery are separate claims. Neither establishes lawful possession at closing without appropriate confirmation.'};
  const readiness={status:costs.materialCostsIncomplete||unattributedClaims.length?'NOT_INVESTOR_READY':'INVESTOR_READY_DRAFT',label:costs.materialCostsIncomplete||unattributedClaims.length?'Not investor-ready — material assumptions and evidence require review':'Investor-ready draft',blockers:[...(costs.materialCostsIncomplete?['Material transaction, holding, financing or exit costs remain unreviewed, unknown or explicitly assumed $0.']:[]),...unattributedClaims]};
  const resaleSupport=primary.length?{status:'PRIMARY_RESEARCH_NOT_ADJUSTED_ARV',label:`Analyst exit assumption — ${primary.length} designated primary comparable${primary.length===1?'':'s'}`,notice:'Designated primary research does not establish an adjusted or independently supported ARV.'}:included.length===0?{status:'UNSUPPORTED_NO_SELECTED_COMPS',label:'Analyst exit assumption — no comparable sales selected',notice:'Comparable-supported ARV not established. Exit value not independently supported by selected comps.'}:{status:'UNCLASSIFIED_RESEARCH_NOT_ADJUSTED_ARV',label:`Analyst exit assumption — ${included.length} included sale${included.length===1?'':'s'}; roles not yet classified`,notice:'Comparable-supported ARV not established. No sale is designated Primary, and included research does not establish an adjusted or independently supported ARV.'};
  const grossSpread=Number(s.inputs.exitValue)-Number(s.inputs.purchasePrice)-Number(s.inputs.rehabCost);
  const checklist=generateDueDiligenceChecklist({property:p,scenario:s,comparables,costs,sellerFinancialPosition,supportingDocuments,reconciliation}),actionPlan=checklist.nextRecommendedActions;
  const model={modelVersion:'workspace-report-model-v2.8.2-due-diligence',
    reportMeta:{reportVersion:REPORT_VERSION,status:'PRELIMINARY / ILLUSTRATIVE',generatedAt,readableReference,propertyRef:p.ref,durablePropertyId:p.durablePropertyId??null,evidenceSnapshotId:p.evidenceSnapshotId??null,scenarioId:s.id,name:s.name,revision:s.revision,savedAt:s.savedAt,evidenceFingerprint:s.evidenceFingerprint,evidenceCutoff:p.saleSearch.retrievedAt??p.historicalTrigger.sourceDate,economicsVersion:analysis.economicsVersion,monteCarloVersion:mc?.modelVersion??'Not run'},
    demonstration:s.demonstration===true,notes:s.notes||null,
    property:{address:fact(p.address),propertyType:fact(p.attributes.propertyType),bedrooms:fact(p.attributes.bedrooms),bathrooms:fact(p.attributes.bathrooms),livingAreaSqft:fact(p.attributes.squareFootage),yearBuilt:fact(p.attributes.yearBuilt),lotArea:fact(p.attributes.lotSize),lastSaleDate:fact(p.attributes.lastSaleDate),lastSalePrice:fact(p.attributes.lastSalePrice)},
    identity:{address:datum(p.identityStatus,durable?'DURABLE PROPERTY REFERENCE':TYPES.review,durable?'Existing saved Property and retained evidence snapshot':discovery?'Retained county candidate; preliminary identity only':'Local preliminary address review',p.reviewDate??p.historicalTrigger.sourceDate),parcel:unknown('Legal parcel identity not verified'),ownershipTitle:unknown('Ownership and title not checked'),liens:unknown('Lien priority and current payoff not checked')},
    condition:unknown('No inspection or genuine analyst condition estimate supplied'),sellerMotivation:unknown('No seller evidence or genuine analyst estimate supplied'),occupancyDelivery,
    historical:{amount:datum(p.historicalTrigger.amount,TYPES.county,p.historicalTrigger.sourceRef,p.historicalTrigger.sourceDate),meaning:p.historicalTrigger.meaning,countyUse:datum(p.countyUse.code,TYPES.county,p.countyUse.sourceRef||p.historicalTrigger.sourceRef,p.historicalTrigger.sourceDate)},
    valuation:Object.fromEntries(['price','low','high'].map(k=>[k,datum(p.avm[k],TYPES.model,valuationSource,p.valuationAsOf,p.valuationRetrievedAt)])),
    comparables,resaleSupport,costCompleteness:costs,evidenceReconciliation:reconciliation,dueDiligenceChecklist:checklist,supportingDocumentSummary:{approvedLinked:supportingDocuments.length},readiness,research:{available:comparables.length,rawObservations:p.sales.length,duplicateObservations:p.sales.length-comparables.length,possibleDuplicates:comparables.filter(c=>c.duplicateStatus==='POSSIBLE_DUPLICATE').length,included:included.length,primary:primary.length,secondary:comparables.filter(c=>c.role==='SECONDARY').length,unclassified:comparables.filter(c=>c.role==='NOT_CLASSIFIED'&&c.status!=='Not selected').length,excluded:comparables.filter(c=>c.role==='EXCLUDED').length,notSelected:comparables.filter(c=>c.status==='Not selected').length,older,
      quality:comparables.length===0?'No retained sale evidence':comparables.length<3||older>0?'Thin/older evidence':'Unadjusted research examples',
      low:prices.length?Math.min(...prices):null,high:prices.length?Math.max(...prices):null,
      lowestReference:prices.length>1&&Math.min(...prices)<Math.max(...prices)?comparables.find(c=>c.salePrice.value===Math.min(...prices)).reference:null,
      findings:[...p.findings],retrievedAt:p.saleSearch.retrievedAt,recordsReturned:p.saleSearch.returned,eligible:p.saleSearch.eligible,radius:p.saleSearch.radius,partial:p.saleSearch.partial,
      listingsCount:p.listings.length},
    economics:{purchasePrice:assumption(Number(s.inputs.purchasePrice)),rehab:assumption(Number(s.inputs.rehabCost)),resaleValue:assumption(Number(s.inputs.exitValue)),grossSpread:calc(grossSpread),profit:calc(e.modeledProfit),profitLabel:costs.profitLabel,netProfitEligible:!costs.materialCostsIncomplete,return:calc(e.roi),cashOnCash:calc(e.cashOnCash),totalCost:calc(e.totalProjectCost),mao:calc(analysis.mao.deterministic.purchasePrice),breakEven:calc(analysis.mao.breakEven.purchasePrice)},
    investmentAssessment:{status:readiness.status==='NOT_INVESTOR_READY'?'CONTINUE DILIGENCE':'CONDITIONAL REVIEW',thesis:`The scenario has ${moneySafe(grossSpread)} of gross spread before acquisition, financing, holding and exit costs; investment merit remains conditional on cost completion, property diligence and market support.`,supported:['Retained property characteristics and provider-reported sale research.','Saved scenario inputs and reproducible deterministic calculations.','Immutable linked-document identities and review states where included.'],assumed:['Purchase price, rehabilitation budget, timing and exit value.','All explicit $0 cost entries.','Comparable relevance until analyst roles and adjustments are documented.'],blockers:[...readiness.blockers,...(reconciliation.discrepancies.length?[`${reconciliation.discrepancies.length} structured document amount discrepancy/discrepancies require resolution.`]:[])],actions:actionPlan},
    deterministicScenarios:analysis.deterministicScenarios.map(x=>({...x,classification:TYPES.calculation,source:analysis.economicsVersion})),
    equity:{estimate:sellerFinancialPosition.grossEquity===null?unknown('Unknown mortgage, lien, tax or valuation evidence blocks equity'):calc(sellerFinancialPosition.grossEquity)},
    sellerFinancialPosition,
    analystEvidence:{
      entries:safeReportEvidence(s.analystEvidence??[]).map(entry=>{
        const categoryLabel=ANALYST_EVIDENCE_CATEGORIES.find(([key])=>key===entry.category)?.[1]??entry.category;
        const sellerEstimate=entry.category==='ALGORITHMIC_BALANCE'&&entry.verificationClass==='SOURCE_REPORTED'&&/\bseller\b/i.test(entry.sourceName??'');
        const originalUnsupported=entry.category==='ORIGINAL_PRINCIPAL'&&entry.id===originalEntry?.id&&!originalDocumentSupported;
        const unsupportedPayoffEntry=entry.category==='VERIFIED_PAYOFF'&&!lenderPayoffSupported(entry,linkedTo('SELLER.VERIFIED_PAYOFF',entry));
        const ownerTaxZero=entry.category==='DELINQUENT_TAX'&&Number(entry.value)===0&&/\bowner\b/i.test(entry.sourceName??'');
        const displayLabel=originalUnsupported?'Entered original mortgage amount':entry.category==='ORIGINAL_PRINCIPAL'&&entry.verificationClass==='RECORDED_DOCUMENT'?'Recorded original principal':sellerEstimate?'Seller-reported estimated balance':entry.category==='ALGORITHMIC_BALANCE'?'Provider algorithmic estimated balance':unsupportedPayoffEntry?'Owner-reported payoff claim — unverified':entry.category==='VERIFIED_PAYOFF'?'Verified lender payoff':entry.category==='PROPOSED_SALE_PRICE'?'Analyst proposed sale price':categoryLabel;
        const displayVerification=originalUnsupported?'Source attribution does not establish a recorded mortgage document':unsupportedPayoffEntry?'Owner-reported; no dated lender-issued payoff demand attached':ownerTaxZero?'Owner-reported $0; not verified tax clearance':entry.category==='ALGORITHMIC_BALANCE'&&entry.verificationClass==='SOURCE_REPORTED'?'Seller-reported — not a verified payoff':VERIFICATION_LABELS[entry.verificationClass]??entry.verificationClass;
        return {...entry,label:categoryLabel,displayLabel,displayStatus:STATUS_LABELS[entry.status]??entry.status,displayVerification};
      }),
      gaps:evidenceGapSummary(s.analystEvidence??[]),
      privacyNotice:'Sensitive entries and local attachment paths are excluded from investor reports by default.'
    },
    assumptions:Object.fromEntries(Object.entries(s.inputs).map(([k,v])=>[k,assumption(missing(v)?null:Number(v))])),
    target:{type:s.targetType,rate:Number(s.inputs.targetRate)/100},
    monteCarlo:mc?{positive:simulationFrequency(mc.results.probabilityOfProfit,mc.simulation.iterations),loss:simulationFrequency(mc.results.probabilityOfLoss,mc.simulation.iterations),breakEven:simulationFrequency(mc.results.probabilityOfBreakEven,mc.simulation.iterations),target:simulationFrequency(mc.results.probabilityMeetingTarget,mc.simulation.iterations)}:null,
    evidence:[
      {label:discovery?'County property classification and situs':'Property characteristics',type:discovery?TYPES.county:TYPES.fact,source:propertySource,asOf:p.providerAsOf??p.historicalTrigger.sourceDate,retrievedAt:p.propertyRetrievedAt},
      {label:'As-is AVM',type:missing(p.avm.price)?TYPES.unknown:TYPES.model,source:valuationSource,asOf:p.valuationAsOf,retrievedAt:p.valuationRetrievedAt},
      {label:'Historical Power-to-Sell amount',type:missing(p.historicalTrigger.amount)?TYPES.unknown:TYPES.county,source:p.historicalTrigger.sourceRef,asOf:p.historicalTrigger.sourceDate,retrievedAt:null},
      {label:'Recorded-sale research',type:comparables.length?TYPES.fact:TYPES.unknown,source:comparables.map(c=>c.address.value).join('; ')||'No retained examples',asOf:comparables.length?'Individual reported Sale dates shown with examples':null,retrievedAt:p.saleSearch.retrievedAt},
      {label:durable?'Existing durable Property reference':discovery?'Preliminary county candidate identity':'Preliminary address review',type:durable?'DURABLE PROPERTY REFERENCE':TYPES.review,source:durable?`${p.durablePropertyId} · snapshot ${p.evidenceSnapshotId}; not legal/title certification`:discovery?'Retained county ATN/APN relationship; not legal identity certification':`Address submitted for preliminary analysis · ${p.address}; not legal identity certification`,asOf:p.reviewDate??p.historicalTrigger.sourceDate,retrievedAt:null},
      {label:'Scenario inputs',type:TYPES.assumption,source:`${s.name} r${s.revision}`,asOf:s.savedAt,retrievedAt:null},
      {label:'Economics / simulation',type:TYPES.calculation,source:`${analysis.economicsVersion} / ${mc?.modelVersion??'Simulation not run'}`,asOf:s.savedAt,retrievedAt:null}
    ].map(item=>({...item,displayType:TYPE_LABELS[item.type]??item.type})),
    distribution:{jurisdiction:p.attributes?.county??null,countyNoticeRequired:actualKernSource(p),countyNoticeStatus:actualKernSource(p)?'APPLICABLE_KERN_SOURCE':'NOT_APPLICABLE_NO_KERN_SOURCE',providerEvidence:'Retained provider evidence may be displayed only under the applicable account terms and redistribution rights; this report does not infer broader rights.',countyEvidence:actualKernSource(p)?'Keep the complete Kern County disclaimer with every distributed copy or extract containing county-derived information.':'No Kern County source material is included in this report; no substitute county disclaimer is invented.'}};
  if(/postgres(?:ql)?:\/\/|-----BEGIN .*PRIVATE KEY-----|(?:api[_-]?key|password|token)=/i.test(JSON.stringify(model)))throw new Error('REPORT_SENSITIVE_VALUE_STOP');
  return {model:freeze(model),analysis};
}
