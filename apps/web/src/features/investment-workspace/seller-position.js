const current=(entry)=>entry?.status==='PRESENT';
const amount=value=>{
  if(typeof value==='number')return Number.isFinite(value)&&value>=0?value:null;
  if(typeof value!=='string'||!value.trim())return null;
  const normalized=value.trim().replace(/^\$/,'').replaceAll(',','');
  if(!/^\d+(?:\.\d{1,2})?$/.test(normalized))return null;
  const parsed=Number(normalized);return Number.isFinite(parsed)&&parsed>=0?parsed:null;
};
const newest=entries=>[...entries].sort((a,b)=>String(b.sourceDate||'').localeCompare(String(a.sourceDate||'')))[0]??null;
const entriesFor=(entries,category)=>entries.filter(entry=>entry.category===category);
const obligation=(entries,category,label)=>{
  const records=entriesFor(entries,category),present=records.filter(current),invalid=present.filter(entry=>amount(entry.value)===null);
  if(!records.length||invalid.length||records.some(entry=>entry.status==='UNKNOWN'))return {label,amount:null,status:'UNKNOWN',records:present.length};
  if(present.length)return {label,amount:present.reduce((sum,entry)=>sum+amount(entry.value),0),status:'KNOWN_OR_ESTIMATED',records:present.length};
  if(records.every(entry=>['ABSENT','RELEASED','NOT_APPLICABLE'].includes(entry.status)))return {label,amount:0,status:'EXPLICITLY_NONE_OR_RELEASED',records:0};
  return {label,amount:null,status:'UNKNOWN',records:0};
};
const evidenceAmount=(entries,category)=>{const entry=newest(entriesFor(entries,category).filter(current));return {entry,amount:entry?amount(entry.value):null};};

export function deriveSellerFinancialPosition({providerValuation=null,providerValuationSource='Provider as-is valuation',valuationBasis='PROVIDER_AVM',entries=[]}={}){
  const original=evidenceAmount(entries,'ORIGINAL_PRINCIPAL'),payoff=evidenceAmount(entries,'VERIFIED_PAYOFF'),estimated=evidenceAmount(entries,'ALGORITHMIC_BALANCE'),proposed=evidenceAmount(entries,'PROPOSED_SALE_PRICE');
  const mortgage=payoff.amount!==null?{amount:payoff.amount,status:'VERIFIED_PAYOFF',entry:payoff.entry,label:'Lender-confirmed / independently verified payoff'}:
    estimated.amount!==null?{amount:estimated.amount,status:'ESTIMATED_BALANCE',entry:estimated.entry,label:'Estimated outstanding mortgage balance'}:
      {amount:null,status:'UNKNOWN',entry:null,label:'Current mortgage obligation unknown'};
  const liens=obligation(entries,'LIEN','Other liens'),taxes=obligation(entries,'DELINQUENT_TAX','Delinquent property taxes');
  const selected=valuationBasis==='PROPOSED_SALE_PRICE'?{amount:proposed.amount,basis:'ANALYST PROPOSED SALE PRICE',source:proposed.entry?.sourceName||'Analyst assumption'}:
    {amount:amount(providerValuation),basis:'PROVIDER AS-IS VALUATION',source:providerValuationSource};
  const unresolved=[];
  if(selected.amount===null)unresolved.push('Selected property valuation');
  if(mortgage.amount===null)unresolved.push('Current mortgage balance or verified payoff');
  if(liens.amount===null)unresolved.push('Other liens');
  if(taxes.amount===null)unresolved.push('Delinquent property taxes');
  const knownAmounts=[mortgage.amount,liens.amount,taxes.amount].filter(Number.isFinite),knownObligations=knownAmounts.length?knownAmounts.reduce((sum,value)=>sum+value,0):null;
  const complete=unresolved.length===0;
  return Object.freeze({
    originalRecordedMortgage:{amount:original.amount,status:original.amount===null?'UNKNOWN':'RECORDED_OR_SOURCE_REPORTED',entry:original.entry},
    mortgage,liens,taxes,selectedValuation:selected,proposedSalePrice:{amount:proposed.amount,status:proposed.amount===null?'UNKNOWN':'ANALYST_ASSUMPTION',entry:proposed.entry},
    knownObligations,unresolvedObligations:unresolved,
    grossEquity:complete?selected.amount-knownObligations:null,
    estimatedSellerProceeds:complete&&proposed.amount!==null?proposed.amount-knownObligations:null,
    calculationStatus:complete?'ILLUSTRATIVE_COMPLETE':'INCOMPLETE_UNKNOWN_OBLIGATIONS',
    transactionCostsIncluded:false,
    caveat:'Illustrative gross amounts before commissions, closing costs, repairs, concessions, taxes due at closing, prepayment charges and any unresolved obligations.'
  });
}
