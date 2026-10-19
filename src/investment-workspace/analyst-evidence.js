import {randomUUID} from 'node:crypto';

export const ANALYST_EVIDENCE_CATEGORIES=Object.freeze([
  ['RECORDED_MORTGAGE','Recorded mortgage / deed of trust'],
  ['ORIGINAL_PRINCIPAL','Original principal'],
  ['ALGORITHMIC_BALANCE','Algorithmic estimated balance'],
  ['VERIFIED_PAYOFF','Separately verified payoff'],
  ['LIEN','Lien / encumbrance'],
  ['RELEASE','Release / reconveyance'],
  ['PROPERTY_TAX','Property tax'],
  ['DELINQUENT_TAX','Delinquent property taxes'],
  ['PROPOSED_SALE_PRICE','Analyst proposed sale price'],
  ['FORECLOSURE_EVENT','NOD / trustee-sale / foreclosure event'],
  ['TITLE','Title research'],
  ['PERMITS_ZONING','Permits and zoning'],
  ['OCCUPANCY','Occupancy'],
  ['CONDITION','Property condition'],
  ['SELLER_AGENT_NOTE','Seller / agent note']
]);
export const ANALYST_EVIDENCE_CLASSES=Object.freeze(['UNKNOWN','UNVERIFIED_NOTE','SOURCE_REPORTED','RECORDED_DOCUMENT','ANALYST_OBSERVED','ANALYST_ASSUMPTION','INDEPENDENTLY_VERIFIED']);
const categorySet=new Set(ANALYST_EVIDENCE_CATEGORIES.map(([key])=>key));
const idPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const text=(value,max)=>typeof value==='string'&&value.length<=max;
const date=value=>value===''||/^\d{4}-\d{2}-\d{2}$/.test(value);

export function newAnalystEvidence(category='RECORDED_MORTGAGE'){
  if(!categorySet.has(category))throw new Error('Unsupported analyst evidence category.');
  return {id:randomUUID(),category,status:'UNKNOWN',value:'',sourceName:'',sourceDate:'',retrievedAt:'',verificationClass:'UNKNOWN',notes:'',attachmentReference:'',includeInReport:true,sensitive:false};
}

export function validateAnalystEvidence(entries=[]){
  if(!Array.isArray(entries)||entries.length>100)throw new Error('Analyst evidence must contain no more than 100 entries.');
  const ids=new Set();
  return entries.map((entry,index)=>{
    if(!entry||!idPattern.test(entry.id)||ids.has(entry.id))throw new Error(`Analyst evidence entry ${index+1} has an invalid or duplicate identifier.`);ids.add(entry.id);
    if(!categorySet.has(entry.category)||!['UNKNOWN','PRESENT','ABSENT','RELEASED','NOT_APPLICABLE'].includes(entry.status)||!ANALYST_EVIDENCE_CLASSES.includes(entry.verificationClass))throw new Error(`Analyst evidence entry ${index+1} uses an unsupported classification.`);
    for(const [key,max] of [['value',500],['sourceName',160],['notes',1000],['attachmentReference',300]])if(!text(entry[key]??'',max))throw new Error(`Analyst evidence entry ${index+1} ${key} is too long.`);
    if(!date(entry.sourceDate??'')||!date(entry.retrievedAt??''))throw new Error(`Analyst evidence entry ${index+1} has an invalid date.`);
    if(typeof entry.includeInReport!=='boolean'||typeof entry.sensitive!=='boolean')throw new Error(`Analyst evidence entry ${index+1} has invalid privacy controls.`);
    if(entry.status!=='UNKNOWN'&&(!String(entry.sourceName).trim()||entry.verificationClass==='UNKNOWN'))throw new Error(`Analyst evidence entry ${index+1} requires a source and verification class.`);
    if(entry.category==='VERIFIED_PAYOFF'&&entry.status==='PRESENT'&&entry.verificationClass!=='INDEPENDENTLY_VERIFIED')throw new Error('A payoff may be labeled verified only with independently verified evidence.');
    return structuredClone(entry);
  });
}

export function safeReportEvidence(entries=[]){
  return validateAnalystEvidence(entries).filter(entry=>entry.includeInReport&&!entry.sensitive).map(entry=>({...entry,attachmentReference:entry.attachmentReference?'Private attachment reference retained locally':'',notes:entry.notes}));
}

export function evidenceGapSummary(entries=[]){
  const current=new Map(validateAnalystEvidence(entries).map(entry=>[entry.category,entry]));
  return ANALYST_EVIDENCE_CATEGORIES.map(([category,label])=>({category,label,status:current.get(category)?.status??'UNKNOWN'}));
}
