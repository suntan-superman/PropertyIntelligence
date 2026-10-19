import {reconcile} from '../rentcast-reconciliation-v1-1/reconcile.js';
import {seal,sha as originalSha,addressComparison,countyContext} from '../rentcast-controlled-pilot/core.js';
import {sealedValid} from '../rentcast-reconciliation-v1-1/source.js';
import {check,object,text,day,hash,CLOSED} from './contract.js';

const strings=['id','assessorID','formattedAddress','addressLine1','addressLine2','city','state','stateFips','county','countyFips','zipCode','propertyType'];
const numbers=['bedrooms','bathrooms','squareFootage','lotSize','yearBuilt','latitude','longitude','lastSalePrice'];
const dates=['lastSaleDate','lastUpdatedDate','updatedAt','asOf'];
function pick(o,keys){return Object.fromEntries(keys.filter(k=>o[k]!==undefined).map(k=>[k,o[k]]));}
function numeric(v){return typeof v==='number'&&Number.isFinite(v);}
export function projectRecord(raw){
  check(object(raw),'RECORD_SCHEMA_STOP');const r={};
  for(const k of strings)if(raw[k]!=null){check(text(raw[k])||k==='addressLine2'&&raw[k]==='','STRING_SCHEMA_STOP');r[k]=raw[k];}
  for(const k of numbers)if(raw[k]!=null){check(numeric(raw[k])&&(k==='longitude'||raw[k]>=0),'NUMBER_SCHEMA_STOP');r[k]=raw[k];}
  for(const k of dates)if(raw[k]!=null){check(day(raw[k])!==null,'DATE_SCHEMA_STOP');r[k]=raw[k];}
  if(raw.history!=null){
    check(object(raw.history)&&Object.keys(raw.history).length<=100,'HISTORY_SCHEMA_STOP');r.history={};
    for(const [date,event] of Object.entries(raw.history)){
      check(day(date)!==null&&object(event),'HISTORY_SCHEMA_STOP');
      const value=pick(event,['event','date','price']);
      check(value.event==='Sale'&&day(value.date)!==null&&value.date.slice(0,10)===date.slice(0,10)&&numeric(value.price)&&value.price>0,'SALE_HISTORY_STOP');r.history[date]=value;
    }
  }
  for(const [field,keys] of [['propertyTaxes',['total']],['taxAssessments',['value','land','improvements']]])if(raw[field]!=null){
    check(object(raw[field])&&Object.keys(raw[field]).length<=100,'TAX_SCHEMA_STOP');r[field]={};
    for(const [year,v] of Object.entries(raw[field])){
      check(/^\d{4}$/.test(year)&&object(v),'TAX_SCHEMA_STOP');const item=pick(v,keys);
      check(Object.values(item).every(n=>numeric(n)&&n>=0),'TAX_SCHEMA_STOP');r[field][year]=item;
    }
  }
  return r;
}
export function validateTemplate(candidate,template){
  check(object(template)&&hash(template.candidate)===hash(candidate),'CANDIDATE_SOURCE_BINDING_STOP');
  let m;try{m=JSON.parse(template.mappingText);}catch{check(false,'MAPPING_SCHEMA_STOP');}
  check(sealedValid(m)&&m.candidates?.length===1&&hash(m.candidates[0])===hash(candidate),'MAPPING_SEAL_STOP');
  check(template.mappingSha256===originalSha(template.mappingText),'MAPPING_HASH_STOP');
}
export function discovery(candidate,body,template){
  check(Array.isArray(body)&&body.length===1,'DISCOVERY_CARDINALITY_STOP');
  const subject=projectRecord(body[0]);
  check(text(subject.id)&&text(subject.assessorID)&&countyContext(subject)&&subject.propertyType==='Single Family'&&addressComparison(candidate.requestAddress,subject).allAgree,'DISCOVERY_IDENTITY_STOP');
  validateTemplate(candidate,template);
  const evidence=seal({pilotCode:candidate.pilotCode,county:candidate.county,countyIdentityFingerprint:originalSha(JSON.stringify(candidate.county)),sourceRecordReference:candidate.sourceRecordReference,httpStatus:200,providerRecord:subject,sourceFingerprint:originalSha(JSON.stringify(subject)),reconciliation:{matchClassification:'NEW_OFFLINE_DISCOVERY_NOT_ANALYST_APPROVED'}});
  const evidenceText=JSON.stringify(evidence),mapping=JSON.parse(template.mappingText);
  const result=reconcile({candidate,evidence,evidenceText,mappingText:template.mappingText,source:template.source,binding:{
    mappingPath:'PRIVATE_LOCAL_SEALED_SOURCE_MAPPING',evidencePath:'PRIVATE_NEW_STAGE_A_PROJECTION',mappingFileSha256:template.mappingSha256,mappingPacketSha256:mapping.packetSha256,
    evidenceFileSha256:originalSha(evidenceText),candidateSha256:originalSha(JSON.stringify(candidate)),providerIdOccurrences:1}});
  check(result.historicalSourceCrosswalk.status==='PASS'&&result.contradictions.length===0,'RULE_C_IDENTITY_STOP');
  return {subject,identity:{status:'PASS',meaning:'HISTORICAL_SOURCE_RELATIONSHIP_ONLY',strategy:result.historicalSourceCrosswalk.strategy,reconciliationFingerprint:result.reconciliationFingerprint,sourceFingerprints:result.sourceFingerprints,sourceRowReferences:result.sourceRowReferences,currentIdentityVerified:false,analystApproved:false},authorizations:{...CLOSED}};
}
export function avm(accepted,body){
  check(object(body)&&object(body.subjectProperty),'AVM_SCHEMA_STOP');
  check(text(body.subjectProperty.id)&&body.subjectProperty.id===accepted.subject.id,'AVM_SUBJECT_STOP');
  const s=projectRecord(body.subjectProperty),a=accepted.subject;
  check(text(s.id)&&s.id===a.id&&countyContext(s)&&s.propertyType==='Single Family'&&addressComparison({street:a.addressLine1,city:a.city,state:a.state},s).allAgree&&s.zipCode===a.zipCode,'AVM_SUBJECT_STOP');
  for(const k of ['assessorID','bedrooms','bathrooms','squareFootage','lotSize','yearBuilt'])check(a[k]==null||s[k]==null||s[k]===a[k],'AVM_ATTRIBUTE_CONFLICT_STOP');
  check([body.price,body.priceRangeLow,body.priceRangeHigh].every(n=>numeric(n)&&n>0)&&body.priceRangeLow<=body.price&&body.price<=body.priceRangeHigh,'AVM_RANGE_STOP');
  check(Array.isArray(body.comparables)&&body.comparables.length<=15,'LISTING_COMPARABLE_SCHEMA_STOP');
  const listings=body.comparables.map(r=>{
    const p=projectRecord(r);check(text(p.id)&&numeric(r.price)&&r.price>0,'LISTING_SCHEMA_STOP');
    const context={};for(const k of ['listedDate','removedDate'])if(r[k]!=null){check(day(r[k])!==null,'LISTING_DATE_STOP');context[k]=r[k];}
    return {...p,...context,listingPrice:r.price,priceMeaning:'LISTING_PRICE_NOT_CLOSED_SALE',qualifiedSoldComp:false};
  });
  const providerDates={};for(const k of ['asOf','lastUpdatedDate','updatedAt'])if(body[k]!=null){check(day(body[k])!==null,'AVM_DATE_STOP');providerDates[k]=body[k];}
  return {subjectId:s.id,estimate:body.price,low:body.priceRangeLow,high:body.priceRangeHigh,meaning:'AS_IS_AVM_CONTEXT_NOT_ARV',intervalIsMonteCarloDistribution:false,subject:s,listingComparables:listings,providerDates,authorizations:{...CLOSED}};
}
function coordinates(r){return numeric(r.latitude)&&Math.abs(r.latitude)<=90&&numeric(r.longitude)&&Math.abs(r.longitude)<=180;}
function distance(a,b){const rad=d=>d*Math.PI/180,dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);return 3958.7613*2*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2));}
export function noPagination(headers){check(!Object.keys(headers).some(k=>/^(?:link|x-next-page|x-next-offset|content-range|x-has-more|x-pagination.*)$/i.test(k)),'SOLD_PAGINATION_STOP');}
export function sold(accepted,body,headers,request,now){
  check(Array.isArray(body)&&body.length>0&&body.length<=50,'SOLD_POPULATION_STOP');
  const total=headers['x-total-count'];
  check(typeof total==='string'&&/^\d+$/.test(total)&&Number(total)===body.length&&Number(total)<=50,'SOLD_TOTAL_OR_TRUNCATION_STOP');
  noPagination(headers);
  check(coordinates(accepted.subject),'SOLD_CENTER_LOCATION_STOP');const ids=new Set();
  const candidates=body.map(raw=>{
    const r=projectRecord(raw);
    check(text(r.id)&&r.id!==accepted.subject.id&&!ids.has(r.id),'SOLD_DUPLICATE_ID_STOP');ids.add(r.id);
    check(countyContext(r)&&r.propertyType==='Single Family'&&text(r.addressLine1)&&text(r.city)&&/^\d{5}$/.test(r.zipCode)&&coordinates(r)&&distance(accepted.subject,r)<=request.params.radius,'SOLD_GEOGRAPHY_STOP');
    const time=day(r.lastSaleDate);check(time!==null&&time<=now&&time>=now-request.params.saleDateRange*86400000&&numeric(r.lastSalePrice)&&r.lastSalePrice>0,'SOLD_DATE_PRICE_STOP');
    for(const e of Object.values(r.history??{}))if(e.date.slice(0,10)===r.lastSaleDate.slice(0,10))check(e.price===r.lastSalePrice,'SOLD_HISTORY_CONFLICT_STOP');
    // No undocumented quality code interpretation. Unknown quality is not absence.
    const quality={};for(const k of ['armsLength','multiParcel','partialInterest','distressed'])if(raw[k]!=null){check(typeof raw[k]==='boolean','SALE_QUALITY_SCHEMA_STOP');quality[k]=raw[k];}
    return {...r,transactionQuality:quality,qualityStatus:'REQUIRES_ANALYST_REVIEW',qualifiedSoldComp:false,role:'COMPARABLE_CANDIDATE_ONLY'};
  });
  return {candidates,totalCount:Number(total),pages:1,arvSupported:false,authorizations:{...CLOSED}};
}
