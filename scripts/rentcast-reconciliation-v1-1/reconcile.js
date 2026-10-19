// Offline-only strategy. No application route, provider fetch, database or writer.
import {sha,apnComparison,addressComparison,countyContext} from '../rentcast-controlled-pilot/core.js';
import {SOURCES,sealedValid} from './source.js';
export const VERSION='RENTCAST_RECONCILIATION_V1_1';
export const RULE_C='KERN_EXACT_SOURCE_APN_CROSSWALK_V1';
export const comparisonOnly=value=>typeof value==='string'&&/^[0-9 -]+$/.test(value)?value.replace(/[ -]/g,''):null;

export function reconcile(input,options={}){
  if(Object.keys(options).length)throw new Error('RECONCILIATION_ONLY_NO_APPROVAL_OR_PERSISTENCE');
  const c=input.candidate??{},e=input.evidence??{},r=e.providerRecord??{},s=input.source??{},b=input.binding??{};
  const reasons=[],contradictions=[];
  const result={schemaVersion:VERSION,pilotCode:c.pilotCode??null,ruleVersion:RULE_C,
    identifiers:{rentcastAssessorId:{raw:r.assessorID??null,evidencePath:b.evidencePath??null,field:'providerRecord.assessorID'},
      rentcastId:{raw:r.id??null,sourceSystem:'RENTCAST',role:'EXTERNAL_PROVIDER_ID_ONLY'},
      countyAtn:{raw:c.county?.atn??null,mappingPath:b.mappingPath??null},countyApn9:{raw:c.county?.apn9??null,mappingPath:b.mappingPath??null},matchedSourceApn:null},
    originalEvidence:{sha256:b.evidenceFileSha256??null,packetSha256:e.packetSha256??null,originalClassification:e.reconciliation?.matchClassification??null},
    sourceEdition:s.edition??null,sourceFingerprints:s.fingerprints??null,sourceRowReferences:[],metadataReference:s.metadataReference??null,
    evaluationOrder:[],legacyComparison:null,ruleCEvaluation:'NOT_EVALUATED',cardinality:{},addressAgreement:null,propertyTypeAgreement:false,
    historicalSourceCrosswalk:{status:'NOT_ESTABLISHED',classification:'IDENTIFIER_RELATIONSHIP_UNRESOLVED',strategy:null},
    currentIdentityFreshness:'CURRENT_IDENTITY_FRESHNESS_UNVERIFIED',currentIdentityVerified:false,history:{status:'NOT_EVALUATED'},
    observedAtnRelationship:{matchesAfterFormattingOnly:false,acceptedAsEquivalence:false},
    analystReview:{tier:'EXCEPTION_REVIEW_REQUIRED',routineEligible:false,exceptionReviewEligible:false,approval:null},
    persistenceAuthorization:false,round1Selected:false,contradictions,reasons};
  function finish(){
    result.reasons=[...new Set([...reasons,'CURRENT_IDENTITY_FRESHNESS_UNVERIFIED','ANALYST_APPROVAL_NOT_AUTHORIZED','PERSISTENCE_NOT_AUTHORIZED'])];
    result.contradictions=[...new Set(contradictions)];return {...result,reconciliationFingerprint:sha(JSON.stringify(result))};
  }
  function require(ok,code,conflict=false){if(!ok){reasons.push(code);if(conflict)contradictions.push(code);}return !!ok;}
  result.evaluationOrder.push('SOURCE_AND_JURISDICTION');
  let originals=false;
  try{
    const mapping=JSON.parse(input.mappingText),original=JSON.parse(input.evidenceText);
    originals=sealedValid(mapping)&&sealedValid(e)&&sha(input.mappingText)===b.mappingFileSha256&&mapping.packetSha256===b.mappingPacketSha256
      &&sha(input.evidenceText)===b.evidenceFileSha256&&JSON.stringify(original)===JSON.stringify(e)
      &&sha(JSON.stringify(c))===b.candidateSha256&&mapping.candidates.filter(x=>x.pilotCode===c.pilotCode&&JSON.stringify(x)===JSON.stringify(c)).length===1
      &&e.pilotCode===c.pilotCode&&JSON.stringify(e.county)===JSON.stringify(c.county)
      &&e.countyIdentityFingerprint===sha(JSON.stringify(c.county))&&JSON.stringify(e.sourceRecordReference)===JSON.stringify(c.sourceRecordReference)
      &&e.httpStatus===200&&e.sourceFingerprint===sha(JSON.stringify(r));
  }catch{/* Invalid/missing original material is a closed provenance gate. */}
  if(!require(originals,'ORIGINAL_EVIDENCE_OR_MAPPING_BINDING_FAILED'))return finish();
  const sourceOk=s.edition==='2026_FINAL'&&s.jurisdiction==='KERN_CA'
    &&Object.entries(SOURCES).every(([k,ref])=>s.fingerprints?.[k]===ref.sha256)
    &&s.metadataReference?.path===SOURCES.metadata.path&&s.metadataReference?.sha256===SOURCES.metadata.sha256;
  if(!require(sourceOk,'SOURCE_FINGERPRINT_EDITION_OR_DOCUMENTATION_FAILED'))return finish();
  const tablesOk=['parcel','land','history'].every(k=>{const t=s.tables?.[k],ref=SOURCES[k];return t&&t.path===ref.path&&t.sha256===ref.sha256&&t.scannedRows===ref.rows&&t.deletedRows===0&&Array.isArray(t.rows)
      &&t.rows.every(row=>row?.reference?.path===ref.path&&row.reference.sha256===ref.sha256&&Number.isSafeInteger(row.reference.ordinal)&&row.reference.ordinal>0&&row.reference.ordinal<=ref.rows
        &&row.reference.byteOffset===t.headerBytes+(row.reference.ordinal-1)*t.recordBytes&&row.reference.projectionSha256===sha(JSON.stringify(row.values)));});
  if(!require(tablesOk,'SOURCE_COVERAGE_OR_ROW_REFERENCE_FAILED'))return finish();
  if(!require(c.county?.jurisdiction==='KERN_CA'&&c.requestAddress?.state==='CA'&&countyContext(r),'COUNTY_OR_STATE_CONFLICT',true))return finish();
  if(!require(typeof c.county?.atn==='string'&&/^\d{11}$/.test(c.county.atn)&&typeof c.county?.apn9==='string'&&/^\d{9}$/.test(c.county.apn9),'ORIGINAL_COUNTY_IDENTIFIER_INVALID'))return finish();
  if(!require(typeof r.id==='string'&&r.id.length>0&&input.binding.providerIdOccurrences===1,'PROVIDER_ID_MISSING_OR_DUPLICATED'))return finish();
  result.analystReview.exceptionReviewEligible=true;
  result.addressAgreement=addressComparison(c.requestAddress,r);result.propertyTypeAgreement=r.propertyType==='Single Family'&&c.assessor?.researchCategory==='RESIDENTIAL_SINGLE_FAMILY';
  require(result.addressAgreement.allAgree,'ADDRESS_CONSISTENCY_REVIEW_REQUIRED',true);
  require(result.propertyTypeAgreement,'PROPERTY_TYPE_CONFLICT',true);
  const id=comparisonOnly(r.assessorID);
  result.observedAtnRelationship.matchesAfterFormattingOnly=id===c.county.atn;
  result.evaluationOrder.push('EXISTING_EXACT_APN9');result.legacyComparison=apnComparison(c.county,r);
  const exact=['EXACT_APN_MATCH','NORMALIZED_APN_MATCH'].includes(result.legacyComparison);
  let matches=[];
  if(exact){
    matches=s.tables.parcel.rows.filter(row=>row.values.APN9===c.county.apn9);
    result.historicalSourceCrosswalk.strategy='EXISTING_EXACT_APN9';result.ruleCEvaluation='NOT_NEEDED';
  }else{
    result.evaluationOrder.push(RULE_C);result.ruleCEvaluation='NOT_SATISFIED';
    if(typeof r.assessorID!=='string'||!id||!/^\d{8}$/.test(id)){reasons.push('NO_SUPPORTED_EIGHT_DIGIT_SOURCE_APN');return finish();}
    matches=s.tables.parcel.rows.filter(row=>row.values.APN===id);
    result.historicalSourceCrosswalk.strategy=RULE_C;
  }
  result.cardinality.matchingParcelRows=matches.length;
  if(!require(matches.length===1,matches.length?'DUPLICATE_OR_CONFLICTING_PARCEL_ROWS':'SOURCE_APN_NOT_FOUND',matches.length>1))return finish();
  const parcel=matches[0],p=parcel.values;
  result.identifiers.matchedSourceApn={raw:p.APN,reference:parcel.reference,field:'APN'};
  result.sourceRowReferences.push({role:'parcel',...parcel.reference});
  if(!require(typeof p.APN==='string'&&/^\d{8}$/.test(p.APN)&&typeof p.APN9==='string'&&/^\d{9}$/.test(p.APN9),'SOURCE_IDENTIFIER_TYPE_OR_WIDTH_INVALID'))return finish();
  // APN9 is retrieved from this row. Never compute or derive it from r.assessorID.
  if(!require(p.APN9===c.county.apn9,'CANDIDATE_APN9_CONFLICT',true))return finish();
  const parcelReverse=s.tables.parcel.rows.filter(row=>row.values.APN9===p.APN9),land=s.tables.land.rows.filter(row=>row.values.APN9===p.APN9),atn=s.tables.land.rows.filter(row=>row.values.ATN===c.county.atn);
  Object.assign(result.cardinality,{parcelRowsForApn9:parcelReverse.length,landRowsForApn9:land.length,landRowsForOriginalAtn:atn.length});
  if(!require(parcelReverse.length===1&&land.length===1&&atn.length===1,'ASSESSMENT_OR_PARCEL_CARDINALITY_CONFLICT',true))return finish();
  const assessment=land[0];result.sourceRowReferences.push({role:'land',...assessment.reference});
  if(!require(assessment.values.ATN===c.county.atn&&atn[0].values.APN9===p.APN9,'CANDIDATE_ATN_CONFLICT',true))return finish();
  if(!require(assessment.reference.ordinal===c.assessor?.sourceRow&&assessment.values.ADDR_SITUS===c.countyAddressReview?.rawCountySitus&&assessment.values.USE_CODE===c.assessor?.useCode,'ORIGINAL_ASSESSOR_ROW_CONFLICT',true))return finish();
  const existing=c.existingIdentity;
  if(!require(existing&&Array.isArray(existing.conflicts)&&existing.conflicts.length===0&&Array.isArray(existing.activeLinks)&&existing.activeLinks.length===0&&existing.durablePropertyId===null&&existing.resolved_property_id===null&&existing.archived===false&&existing.qa_marker===false&&existing.source_relationship_verified===true,'EXISTING_IDENTITY_REVIEW_REQUIRED',true))return finish();
  const history=s.tables.history.rows.filter(row=>row.values.APN9===p.APN9);result.cardinality.historyRows=history.length;
  if(!require(history.length===1,'REQUIRED_HISTORY_MISSING_OR_AMBIGUOUS'))return finish();
  const h=history[0].values;result.sourceRowReferences.push({role:'history',...history[0].reference});
  const inactive=!!h.DT_INACT||!!h.EVT_TYP_IN||(typeof h.EVT_NUM_IN==='string'&&!/^(?:0|0\.0+)$/.test(h.EVT_NUM_IN));
  const unresolvedChange=['CT','CB','DT','AR','DS','SG'].includes(h.EVT_TYP_CR)||['CT','CB','DT','AR','DS','SG'].includes(h.EVT_TYP_IN);
  const unknownHistory=!['CV','CR'].includes(h.EVT_TYP_CR)||typeof h.DT_CREATE!=='string'||!/^\d{8}$/.test(h.DT_CREATE)||h.EVT_NUM_IN==null||h.EVT_TYP_IN==null||h.DT_INACT==null;
  result.history={status:inactive?'KNOWN_INACTIVATION_REQUIRES_REVIEW':unresolvedChange?'UNRESOLVED_HISTORY_CHANGE':unknownHistory?'HISTORY_MEANING_UNRESOLVED':'NO_INACTIVATION_RECORDED_IN_SNAPSHOT',blankInactivationProvesCurrentActivity:false};
  require(!inactive,'KNOWN_HISTORICAL_INACTIVATION',true);require(!unresolvedChange,'UNRESOLVED_SPLIT_MERGE_OR_TRANSFER',true);require(!unknownHistory,'HISTORY_ACTIVITY_UNKNOWN');
  if(reasons.length){result.historicalSourceCrosswalk.status='QUARANTINED';return finish();}
  if(!exact)result.ruleCEvaluation='PASS';
  result.historicalSourceCrosswalk={status:'PASS',strategy:exact?'EXISTING_EXACT_APN9':RULE_C,classification:exact?result.legacyComparison:'DOCUMENTED_HISTORICAL_APN_CROSSWALK'};
  return finish();
}
