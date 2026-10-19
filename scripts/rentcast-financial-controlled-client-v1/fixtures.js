// Entirely synthetic QA. Pinned source references mimic the unchanged Rule C
// reader contract; these rows are NOT claims about the actual county delivery.
import {SOURCES} from '../rentcast-reconciliation-v1-1/source.js';
import {seal,sha} from '../rentcast-controlled-pilot/core.js';
import {hash,requestFor,preflight} from './contract.js';
export const NOW='2026-10-12T12:00:00.000Z';
const row=(kind,values)=>({values,reference:{path:SOURCES[kind].path,sha256:SOURCES[kind].sha256,ordinal:1,byteOffset:100,projectionSha256:sha(JSON.stringify(values))}});
const table=(kind,values)=>({...SOURCES[kind],scannedRows:SOURCES[kind].rows,deletedRows:0,headerBytes:100,recordBytes:100,rows:[row(kind,values)]});
export function fixture(){
  const county={jurisdiction:'KERN_CA',atn:'00100203004',apn9:'001002037'};
  const candidate={pilotCode:'SYNTHETIC-RCFC-1',candidateId:'synthetic-rcfc-candidate',technicalOrdinal:1,selectionFingerprint:'a'.repeat(64),county,
    requestAddress:{street:'1 Synthetic Street',city:'Test City',state:'CA'},stateBasis:'COUNTY_JURISDICTION_CONSTRAINT_NOT_POSTAL_VERIFICATION',
    sourceRecordReference:{source:'synthetic-source',row:1},exclusions:{ip:false,rc:false,historicalFixture:false,round1Selected:false},
    assessor:{sourceRow:1,useCode:'0101',researchCategory:'RESIDENTIAL_SINGLE_FAMILY'},countyAddressReview:{rawCountySitus:'1 Synthetic Street, Test City'},
    existingIdentity:{conflicts:[],activeLinks:[],durablePropertyId:null,resolved_property_id:null,archived:false,qa_marker:false,source_relationship_verified:true}};
  const mappingText=JSON.stringify(seal({candidates:[candidate]}));
  const template={candidate:structuredClone(candidate),mappingText,mappingSha256:sha(mappingText),source:{edition:'2026_FINAL',jurisdiction:'KERN_CA',
    fingerprints:Object.fromEntries(Object.entries(SOURCES).map(([k,r])=>[k,r.sha256])),metadataReference:{...SOURCES.metadata},tables:{
      parcel:table('parcel',{APN:'00100203',APN9:county.apn9,APN_LABEL:'001-002-03'}),
      land:table('land',{ATN:county.atn,APN9:county.apn9,ADDR_SITUS:candidate.countyAddressReview.rawCountySitus,USE_CODE:'0101',ROLL:'1'}),
      history:table('history',{APN9:county.apn9,EVT_TYP_CR:'CV',DT_CREATE:'19940901',EVT_NUM_CR:'0.00000',EVT_TYP_IN:'',DT_INACT:'',EVT_NUM_IN:'0.00000'})}}};
  const subject={id:'synthetic-provider-0001',assessorID:'00100203',addressLine1:'1 Synthetic St',city:'Test City',state:'CA',zipCode:'90001',county:'Kern',countyFips:'029',stateFips:'06',propertyType:'Single Family',bedrooms:3,bathrooms:2,squareFootage:1400,lotSize:6000,yearBuilt:1980,latitude:35,longitude:-119,
    history:{'2025-01-01':{event:'Sale',date:'2025-01-01T00:00:00.000Z',price:100000,owner:'PRIVATE_OWNER_SENTINEL'}},propertyTaxes:{2025:{total:2000,owner:'PRIVATE_OWNER_SENTINEL'}},taxAssessments:{2025:{value:100000,land:25000,improvements:75000,contact:'PRIVATE_CONTACT_SENTINEL'}},owner:{names:['PRIVATE_OWNER_SENTINEL']},email:'PRIVATE_CONTACT_SENTINEL',raw:{apiKey:'PRIVATE_SECRET_SENTINEL'}};
  const avm={subjectProperty:{...subject},price:220000,priceRangeLow:200000,priceRangeHigh:240000,comparables:[{id:'synthetic-listing-1',price:225000,addressLine1:'2 Synthetic St',city:'Test City',state:'CA',zipCode:'90001',propertyType:'Single Family',owner:{names:['PRIVATE_OWNER_SENTINEL']}}]};
  const sold=[{id:'synthetic-sale-1',addressLine1:'3 Synthetic St',city:'Test City',state:'CA',zipCode:'90001',county:'Kern',propertyType:'Single Family',latitude:35.001,longitude:-119.001,lastSalePrice:210000,lastSaleDate:'2026-09-15T00:00:00.000Z',bedrooms:3,bathrooms:2,squareFootage:1380,owner:{names:['PRIVATE_OWNER_SENTINEL']}}];
  const account={verified:true,reviewer:'SYNTHETIC_REVIEWER',evidenceSha256:'b'.repeat(64),verifiedAt:'2026-10-11',expiresAt:'2026-10-13',currency:'USD',active:true,endpoints:{properties:true,value:true},rights:{retention:true,saas:true,pdf:true,thirdPartyReviewed:true,termsVersion:'SYNTHETIC_TERMS_ONLY',evidenceSha256:'c'.repeat(64)},chargesVerified:true,taxFeesVerified:true,endpointChargesVerified:true,enforceableUpperBound:true,rateCents:20,maxTaxAndFeesPerAttemptCents:5,allInCapCents:100,includedQuotaCredited:0};
  const approvedBounds={approved:true,reviewer:'SYNTHETIC_REVIEWER',evidenceSha256:'d'.repeat(64),marketContext:'URBAN',radius:1.5,days:120,propertyType:'Single Family',compCount:15};
  return {candidate,template,subject,avm,sold,account,approvedBounds};
}
export function approval(f,stage,accepted=null,previousReceiptHash=null){
  const request=requestFor(stage,f.candidate,accepted,f.approvedBounds);
  return {scope:'OFFLINE_SYNTHETIC_ONLY',explicitStageApproval:true,stage,technicalOrdinal:1,selectionFingerprint:f.candidate.selectionFingerprint,candidateFingerprint:hash(f.candidate),requestFingerprint:hash(request),boundsFingerprint:stage==='A'?null:hash(f.approvedBounds),accountFingerprint:preflight(f.account,Date.parse(NOW)).accountFingerprint,previousReceiptHash,
    operator:'SYNTHETIC_OPERATOR',evidenceSha256:'e'.repeat(64),approvedAt:'2026-10-11',expiresAt:'2026-10-13'};
}
