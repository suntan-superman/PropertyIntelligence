export const SCREEN_VERSION='kern-screen-v1';
export const PRIORITY_BANDS=Object.freeze(['HIGH_REVIEW_PRIORITY','MEDIUM_REVIEW_PRIORITY','LOW_REVIEW_PRIORITY','INSUFFICIENT_DATA']);
export const IDENTITY_STATUSES=Object.freeze(['UNRESOLVED','PARTIAL','RESOLVED','AMBIGUOUS','SOURCE_STOP']);
export const CANDIDATE_STATUSES=Object.freeze(['NEW','REVIEWING','NEEDS_ADDRESS','READY_FOR_ENRICHMENT','ENRICHED','DEAL_CREATED','DEFERRED','REJECTED','ARCHIVED']);
export const REJECTION_REASONS=Object.freeze(['DUPLICATE','NOT_TARGET_PROPERTY_TYPE','BAD_IDENTITY','INSUFFICIENT_DATA','ALREADY_RESOLVED_EXTERNALLY','OUTSIDE_CURRENT_SCOPE','OTHER']);

const amountBand=value=>typeof value!=='number'||!Number.isFinite(value)||value<0?null:value>=100000?{label:'100K_PLUS',points:40}:value>=25000?{label:'25K_TO_99_999',points:30}:value>=10000?{label:'10K_TO_24_999',points:20}:value>0?{label:'POSITIVE_UNDER_10K',points:10}:{label:'ZERO',points:0};

export function candidateIdentityHints(record={}){
  const atn=record.atn??record.normalized?.atn??null,apn=record.apn??record.normalized?.apn??null;
  if(record.conflictingIds===true||record.identityConflict===true||record.normalized?.conflictingIds===true||record.normalized?.identityConflict===true)return {candidateKey:`CONFLICT:${record.recordFingerprint??record.fingerprint??record.normalized?.recordFingerprint??'UNKNOWN'}`,identityStatus:'AMBIGUOUS',identityBasis:'CONFLICTING_STABLE_IDENTIFIERS'};
  if(atn&&apn)return {candidateKey:`ATN:${atn}|APN:${apn}`,identityStatus:'PARTIAL',identityBasis:'ATN_AND_APN_PRESENT;NO_EQUIVALENCE_ASSUMED'};
  if(atn)return {candidateKey:`ATN:${atn}`,identityStatus:'PARTIAL',identityBasis:'ATN_STABLE'};
  if(apn)return {candidateKey:`APN:${apn}`,identityStatus:'PARTIAL',identityBasis:'APN_STABLE'};
  const fingerprint=record.recordFingerprint??record.fingerprint??'UNKNOWN';
  return {candidateKey:`ROW:${fingerprint}`,identityStatus:'UNRESOLVED',identityBasis:'NO_STABLE_IDENTIFIER'};
}

export function deriveSignals(record={},context={}){
  const normalized=record.normalized??record;const sourceRecordId=record.id??record.sourceRecordId??null;const signals=[];const identityConflict=record.conflictingIds===true||record.identityConflict===true||normalized.conflictingIds===true||normalized.identityConflict===true;
  if(!identityConflict&&(normalized.atn||normalized.apn))signals.push({signalType:'IDENTIFIER_COMPLETE',numericValue:25,textValue:'Stable source identifier present',status:'OBSERVED',sourceRecordId,evidencePayload:{field:normalized.atn?'atn':'apn',basis:'SOURCE_FIELD'}});
  if(identityConflict)signals.push({signalType:'IDENTITY_CONFLICT',numericValue:0,textValue:'Conflicting stable identifiers require manual stop',status:'STOP',sourceRecordId,evidencePayload:{basis:'SOURCE_CONFLICT'}});
  signals.push({signalType:'POWER_TO_SELL_PRESENT',numericValue:1,textValue:'Record appears in supplied Power-to-Sell source',status:'OBSERVED',sourceRecordId,evidencePayload:{sourceType:'KERN_POWER_TO_SELL'}});
  const amount=normalized.parcelAmountOwed??normalized.amountOwed??null;const band=amountBand(amount);
  if(band)signals.push({signalType:'TAX_DEFAULT_AMOUNT',numericValue:amount,textValue:band.label,status:'OBSERVED',sourceRecordId,evidencePayload:{field:'parcel_amount_owed',band:band.label,points:band.points}});
  const optional=[['REPEAT_SOURCE_EDITION',context.repeatEdition,5,'Repeated source edition observed'],['ADDRESS_RESOLVED',context.addressResolved,15,'Analyst-resolved full address'],['PROPERTY_LINKED',context.propertyLinked,10,'Linked to canonical Property'],['INDEPENDENT_VALUE_AVAILABLE',context.independentValueAvailable,10,'Independent value evidence available'],['MAO_AVAILABLE',context.maoAvailable,10,'Acquisition decision MAO available']];
  for(const [type,present,points,text] of optional)if(present)signals.push({signalType:type,numericValue:points,textValue:text,status:'OBSERVED',sourceRecordId,evidencePayload:{points}});
  return signals;
}

export function scoreSignals(signals=[]){
  const byType=new Map();for(const signal of signals){const prior=byType.get(signal.signalType);if(!prior||Number(signal.numericValue??0)>Number(prior.numericValue??0))byType.set(signal.signalType,signal);}
  let score=0;const explain=[];
  for(const signal of byType.values()){
    let points=0;
    if(signal.signalType==='IDENTIFIER_COMPLETE')points=25;
    if(signal.signalType==='TAX_DEFAULT_AMOUNT')points=amountBand(Number(signal.numericValue))?.points??0;
    if(['REPEAT_SOURCE_EDITION','ADDRESS_RESOLVED','PROPERTY_LINKED','INDEPENDENT_VALUE_AVAILABLE','MAO_AVAILABLE'].includes(signal.signalType))points=Number(signal.numericValue??0);
    score+=points;if(points>0)explain.push({signalType:signal.signalType,points,value:signal.numericValue??null,text:signal.textValue??null});
  }
  score=Math.min(100,Math.max(0,score));
  const priorityBand=score>=55?'HIGH_REVIEW_PRIORITY':score>=40?'MEDIUM_REVIEW_PRIORITY':score>=20?'LOW_REVIEW_PRIORITY':'INSUFFICIENT_DATA';
  return {score,priorityBand,scoreVersion:SCREEN_VERSION,explanation:explain.sort((a,b)=>b.points-a.points||a.signalType.localeCompare(b.signalType))};
}

export function screenCandidate(record,context={}){const signals=deriveSignals(record,context);return {...scoreSignals(signals),signals};}

export function rankingExplanation(candidate={}){
  const explanation=candidate.scoreExplanation??candidate.explanation??[];
  if(!explanation.length)return 'Insufficient source-supported signals; analyst review is required.';
  return explanation.map(item=>`${item.signalType} (+${item.points})${item.value!=null?` value=${item.value}`:''}`).join('; ');
}

export function normalizeCandidateStatus(identityStatus){return identityStatus==='UNRESOLVED'||identityStatus==='PARTIAL'?'NEEDS_ADDRESS':'NEW';}
