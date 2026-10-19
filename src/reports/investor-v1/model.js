import {createHash} from 'node:crypto';
import {validateCertifiedAnalysis} from './analysisTrust.js';

export const REPORT_MODEL_VERSION='investor-report-model-v1';
export const CLASSIFICATIONS=Object.freeze(['RECORDED / VERIFIED','PROVIDER ESTIMATE','PI CALCULATION','INVESTOR ASSUMPTION','UNKNOWN / REQUIRES VERIFICATION']);
export const EVIDENCE_STATUSES=Object.freeze(['RETURNED','NOT_RETURNED','NOT_CHECKED','NOT_AVAILABLE','REQUIRES_VERIFICATION']);
const secret=/password|secret|token|api.?key|authorization|connection.?string|database.?url|raw.?payload|provenance.?payload/i;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const clean=(v,key='')=>{if(secret.test(key))throw new Error('REPORT_SENSITIVE_FIELD_STOP');if(typeof v==='string'&&/postgres(?:ql)?:\/\/|-----BEGIN .*PRIVATE KEY-----|(?:api[_-]?key|password|token)=/i.test(v))throw new Error('REPORT_SENSITIVE_VALUE_STOP');if(Array.isArray(v))return v.map(x=>clean(x));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clean(x,k)]));return v;};
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
export const fingerprint=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');

/** Provider-neutral, allowlisted report contract. Does not import or depend on any renderer. */
export function normalizeInvestorReport(input){
  if(!input||typeof input!=='object')throw new Error('REPORT_MODEL_REQUIRED');
  if(!['INVESTIGATE','WATCH','PASS'].includes(input.disposition?.value)&&!(input.certifiedAnalysis&&input.disposition?.value==='NOT_ASSESSED'))throw new Error('REPORT_DISPOSITION_INVALID');
  if(!input.property||!input.reportMeta||!input.valuation||!input.economics)throw new Error('REPORT_REQUIRED_SECTION_MISSING');
  const d=x=>{if(x==null)return datum(null,{status:'NOT_AVAILABLE',classification:'UNKNOWN / REQUIRES VERIFICATION',source:'Not supplied'});if(x&&typeof x==='object'&&Object.hasOwn(x,'value'))return datum(x.value,x);return datum(x);};
  const arr=x=>(Array.isArray(x)?x:[]).map(d);
  const normalized={modelVersion:REPORT_MODEL_VERSION,
    reportMeta:{reportId:String(input.reportMeta.reportId??'synthetic-report'),reportVersion:String(input.reportMeta.reportVersion??'1.0'),generatedAt:String(input.reportMeta.generatedAt??new Date().toISOString()),evidenceCutoff:String(input.reportMeta.evidenceCutoff??'Not supplied'),assumptionSetVersion:String(input.reportMeta.assumptionSetVersion??'1.0'),scoringVersion:String(input.reportMeta.scoringVersion??'Not supplied'),monteCarloVersion:String(input.reportMeta.monteCarloVersion??'Not supplied')},
    property:{address:d(input.property.address),propertyType:d(input.property.propertyType),bedrooms:d(input.property.bedrooms),bathrooms:d(input.property.bathrooms),livingAreaSqft:d(input.property.livingAreaSqft),yearBuilt:d(input.property.yearBuilt),lotArea:d(input.property.lotArea),identityStatus:d(input.property.identityStatus)},
    selection:{reasons:arr(input.selection?.reasons)},
    disposition:d(input.disposition),distress:{events:(input.distress?.events??[]).map(e=>({date:d(e.date),event:d(e.event),source:d(e.source)})),status:d(input.distress?.status)},
    valuation:{estimate:d(input.valuation.estimate),low:d(input.valuation.low),high:d(input.valuation.high),basis:d(input.valuation.basis),status:d(input.valuation.status)},
    comparables:(input.comparables??[]).map(c=>({address:d(c.address),salePrice:d(c.salePrice),saleDate:d(c.saleDate),distanceMiles:d(c.distanceMiles),livingAreaSqft:d(c.livingAreaSqft),bedrooms:d(c.bedrooms),bathrooms:d(c.bathrooms),adjustments:d(c.adjustments),similarity:d(c.similarity)})),
    mortgages:{recorded:(input.mortgages?.recorded??[]).map(m=>({lender:d(m.lender),recordedAmount:d(m.recordedAmount),recordedDate:d(m.recordedDate),status:d(m.status)})),modeled:(input.mortgages?.modeled??[]).map(m=>({loanBalance:d(m.loanBalance),lienPosition:d(m.lienPosition),asOf:d(m.asOf),status:d(m.status)})),status:d(input.mortgages?.status)},
    equity:{estimate:d(input.equity?.estimate),basis:d(input.equity?.basis),status:d(input.equity?.status)},
    encumbrances:{items:(input.encumbrances?.items??[]).map(x=>({type:d(x.type),amount:d(x.amount),status:d(x.status),source:d(x.source)})),titleReviewStatus:d(input.encumbrances?.titleReviewStatus)},
    transactions:(input.transactions??[]).map(x=>({date:d(x.date),type:d(x.type),amount:d(x.amount),source:d(x.source)})),
    assumptions:arr(input.assumptions),
    economics:{mao:d(input.economics.mao),purchasePrice:d(input.economics.purchasePrice),rehab:d(input.economics.rehab),closingCosts:d(input.economics.closingCosts),holdingCosts:d(input.economics.holdingCosts),resaleValue:d(input.economics.resaleValue),profit:d(input.economics.profit),return:d(input.economics.return),notes:arr(input.economics.notes)},
    monteCarlo:{iterations:d(input.monteCarlo?.iterations),probabilityPositive:d(input.monteCarlo?.probabilityPositive),probabilityTarget:d(input.monteCarlo?.probabilityTarget),probabilityLoss:d(input.monteCarlo?.probabilityLoss),percentiles:{p10:d(input.monteCarlo?.percentiles?.p10),p50:d(input.monteCarlo?.percentiles?.p50),p90:d(input.monteCarlo?.percentiles?.p90)},profitDistribution:(input.monteCarlo?.profitDistribution??[]).map(x=>({label:d(x.label),count:d(x.count),min:d(x.min),max:d(x.max)})),sensitivities:(input.monteCarlo?.sensitivities??[]).map(x=>({factor:d(x.factor),impact:d(x.impact)})),status:d(input.monteCarlo?.status)},
    risks:arr(input.risks),diligence:arr(input.diligence),evidence:arr(input.evidence),disclaimer:String(input.disclaimer??'For investment screening only. Not an appraisal, title opinion, legal advice, or investment recommendation.')};
  if(input.certifiedAnalysis!==undefined)normalized.certifiedAnalysis=validateCertifiedAnalysis(input.certifiedAnalysis);
  clean(normalized);
  const content=JSON.stringify(stable(normalized));normalized.modelFingerprint=createHash('sha256').update(content).digest('hex');
  return freeze(normalized);
}

export function datum(value,meta={}){const classification=meta.classification??'UNKNOWN / REQUIRES VERIFICATION',status=meta.status??(value==null?'NOT_AVAILABLE':'RETURNED');if(!CLASSIFICATIONS.includes(classification))throw new Error('REPORT_CLASSIFICATION_INVALID');if(!EVIDENCE_STATUSES.includes(status))throw new Error('REPORT_EVIDENCE_STATUS_INVALID');if(value!=null&&typeof value==='object')throw new Error('REPORT_DATUM_VALUE_INVALID');return {value:value??null,source:meta.source??'Not supplied',classification,asOf:meta.asOf??null,retrievedAt:meta.retrievedAt??null,status,confidence:meta.confidence??null,notes:meta.notes??null};}
