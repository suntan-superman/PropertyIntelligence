const labels={
  propertyType:'Property type',bedrooms:'Bedrooms',bathrooms:'Bathrooms',squareFeet:'Living area',lotSize:'Lot size',yearBuilt:'Year built',
  saleHistory:'Sale history',lastSaleDate:'Last sale date',lastSalePrice:'Last sale price',legalDescription:'Legal description',
  repairCondition:'Property condition / repair needs',insuranceCost:'Insurance cost',propertyTaxHoldingCost:'Holding-period property taxes',
  landTenure:'Land / ownership structure',parkCommunity:'Park / community',ownershipResidencyTransferRestrictions:'Ownership / residency / transfer restrictions',
  county:'County',coordinates:'Coordinates',identifiers:'Property identifiers',apn:'APN / parcel',rentcastId:'Provider property ID',taxes:'Property taxes',assessments:'Assessments',
  valuation:'Estimated value',comps:'Comparable properties',comparables:'Comparable properties',compClosedSaleStatus:'Comparable sale status',daysOnMarket:'Days on market',
  features:'Features',zoning:'Zoning',title:'Title',condition:'Property condition',repairs:'Repair needs',address:'Address',avm:'Estimated value',avmRange:'Provider range'
};
const statuses={INDEPENDENT_ONLY:'Independent evidence',INDEPENDENT_EVIDENCE_AVAILABLE:'Independent evidence available',SPONSOR_SUPPLIED:'Sponsor supplied',ANALYST_ENTERED:'Analyst entered',DERIVED:'Property Intelligence calculation',SUPPORTED:'Supported',PARTIAL:'Evidence available',PARTIALLY_SUPPORTED:'Evidence available',CONFLICTING:'Conflicting evidence',ADDRESS_AMBIGUOUS:'Address needs confirmation',MANUFACTURED_REPRESENTATION_STOP:'Property representation needs verification',SOURCE_STOP:'Additional verification required',IDENTITY_UNRESOLVED:'Identity needs confirmation',NO_EVIDENCE:'Not available',MISSING:'Not available',READY_PROPERTY:'Property evidence ready',READY_DEAL:'Deal analysis ready',IDLE:'Ready',RESOLVING:'Analyzing property',LOADING_EVIDENCE:'Loading evidence',ERROR:'Action unavailable',NOT_QUERIED:'Not queried'};
export const humanizeKey=key=>labels[key]??String(key??'').replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export const humanizeStatus=status=>statuses[status]??humanizeKey(status);
export function missingLabel(field){if(/title|tenure|ownership|transfer/i.test(field))return 'Not independently verified';if(/condition|repair/i.test(field))return 'Not assessed';return 'Not available from current evidence';}
export function displayValue(value,field=''){if(value===null||value===undefined||value==='')return missingLabel(field);if(typeof value==='boolean')return value?'Yes':'No';if(Array.isArray(value))return value.length?value.join(', '):missingLabel(field);if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>`${humanizeKey(k)}: ${displayValue(v,k)}`).join(' · ');return String(value);}
export const evidenceGroups=[
  ['identity','Identity & Location',f=>/address|county|parcel|apn|coordinate|rentcastid/i.test(f.field)],
  ['characteristics','Property Characteristics',f=>/propertytype|bedrooms|bathrooms|squarefeet|lotsize|yearbuilt|feature/i.test(f.field)],
  ['valuation','Valuation & Market',f=>/avm|valuation|compar|daysonmarket|price/i.test(f.field)],
  ['tax','Tax & Assessment',f=>/tax|assessment/i.test(f.field)],
  ['transaction','Transaction History',f=>/sale|history/i.test(f.field)],
  ['legal','Legal / Ownership / Condition',f=>/legal|zoning|tenure|ownership|title|condition|repair|insurance|holdingperiod/i.test(f.field)]
];
export function groupEvidence(fields=[]){
  const used=new Set();return evidenceGroups.map(([id,title,match])=>{const items=fields.filter(f=>{const yes=match(f);if(yes)used.add(f.field);return yes;});return {id,title,items};}).concat([{id:'other',title:'Other evidence',items:fields.filter(f=>!used.has(f.field))}]).filter(g=>g.items.length);
}
export function propertyFacts(model){const p=model?.property??{};return [
  ['Property type',p.propertyType,'propertyType'],['Bedrooms',p.bedrooms,'bedrooms'],['Bathrooms',p.bathrooms,'bathrooms'],['Living area',p.squareFeet==null?null:`${p.squareFeet.toLocaleString()} SF`,'squareFeet'],['Year built',p.yearBuilt,'yearBuilt'],['Lot size',p.lotSize==null?null:`${p.lotSize.toLocaleString()} SF`,'lotSize'],['APN / parcel',p.identifiers?.apn,'apn'],['County',p.county,'county']
];}
export function latestRecord(value){if(!value||typeof value!=='object'||Array.isArray(value))return null;const keys=Object.keys(value).sort((a,b)=>String(b).localeCompare(String(a)));return keys.length?[keys[0],value[keys[0]]]:null;}
