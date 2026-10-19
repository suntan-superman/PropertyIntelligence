// Offline worker only. The original Rule C source module intentionally blocks networking.
import '../../src/analysis/offline.js';
import {readFile} from 'node:fs/promises';
import {verifyShortlist} from '../rentcast-financial-controlled-client-v1/guard.js';
import {loadInputs} from '../real-financial-evidence-v1/audit.js';
import {SOURCES} from '../rentcast-reconciliation-v1-1/source.js';
import {schema,scanDbf} from '../sprint6_2/dbf.js';
import {fileHash} from '../sprint6_2/io.js';
import {seal,sha as originalSha} from '../rentcast-controlled-pilot/core.js';
import {discovery,projectRecord,noPagination} from '../rentcast-financial-controlled-client-v1/evidence.js';
import {check,hash,FIRST_SELECTION,requestFor,CLOSED} from '../rentcast-financial-controlled-client-v1/contract.js';

export async function prepareSource(){
  const saved=await verifyShortlist(),original=saved.candidates[0],inputs=await loadInputs();
  const audit=inputs.gate1b.candidates.filter(r=>r.county_atn===original.county.atn&&r.county_apn9===original.county.apn9);
  const crosswalk=inputs.crosswalk.filter(r=>r.normalized_pts_atn===original.county.atn&&r.apn9===original.county.apn9);
  check(audit.length===1&&crosswalk.length===1,'SOURCE_RELATIONSHIP_STOP');const b=audit[0],w=crosswalk[0];
  check(b.candidate.id===original.candidateId&&b.assessor.id===original.assessorId&&/^\d+$/.test(original.assessorSourceRow),'SOURCE_IDENTITY_STOP');
  const candidate={pilotCode:'RFE_STAGE_A_ORDINAL_1',technicalOrdinal:1,selectionFingerprint:FIRST_SELECTION,originalShortlistCandidateFingerprint:hash(original),candidateId:original.candidateId,assessorId:original.assessorId,county:original.county,
    requestAddress:{street:original.address.street,city:original.address.city,state:'CA'},stateBasis:'COUNTY_JURISDICTION_CONSTRAINT_NOT_POSTAL_VERIFICATION',sourceRecordReference:original.sourceReference,sourceDates:original.sourceDates,exclusions:original.exclusions,
    assessor:{sourceRow:Number(original.assessorSourceRow),useCode:w.use_code,researchCategory:w.use_category},countyAddressReview:{rawCountySitus:original.address.rawAssessorSitus},
    existingIdentity:{conflicts:b.conflicts,activeLinks:b.active_links,durablePropertyId:b.durable_property_id,resolved_property_id:b.candidate.resolved_property_id,archived:b.candidate.archived,qa_marker:b.candidate.qa_marker,source_relationship_verified:b.candidate.source_relationship_verified}};
  const fingerprints={};for(const [name,ref] of Object.entries(SOURCES)){fingerprints[name]=await fileHash(ref.path);check(fingerprints[name]===ref.sha256,'ORIGINAL_SOURCE_PIN_STOP');}
  const xml=await readFile(SOURCES.metadata.path,'utf8');check(xml.includes('extended with final check-digit')&&xml.includes('APN9 field as the SQL join key'),'COUNTY_DEFINITION_STOP');
  const source={edition:'2026_FINAL',jurisdiction:'KERN_CA',fingerprints,metadataReference:{...SOURCES.metadata},tables:{}};
  const scan=async(kind,fields,keep)=>{
    const ref=SOURCES[kind],s=await schema(ref.path),rows=[];
    const result=await scanDbf(ref.path,fields,(values,ordinal)=>{if(keep(values))rows.push({values,reference:{path:ref.path,sha256:ref.sha256,ordinal,byteOffset:s.headerBytes+(ordinal-1)*s.recordBytes,projectionSha256:originalSha(JSON.stringify(values))}});});
    check(result.active===ref.rows&&result.deleted===0,'SOURCE_CENSUS_STOP');
    return {path:ref.path,sha256:ref.sha256,scannedRows:result.active,deletedRows:result.deleted,headerBytes:s.headerBytes,recordBytes:s.recordBytes,rows};
  };
  const first=await scan('parcel',['APN','APN9','APN_LABEL'],r=>r.APN9===candidate.county.apn9);
  check(first.rows.length===1,'PARCEL_CARDINALITY_STOP');const storedApn=first.rows[0].values.APN;
  source.tables.parcel=await scan('parcel',['APN','APN9','APN_LABEL'],r=>r.APN===storedApn||r.APN9===candidate.county.apn9);
  check(source.tables.parcel.rows.length===1,'PARCEL_REVERSE_CARDINALITY_STOP');
  source.tables.land=await scan('land',['ATN','APN9','ADDR_SITUS','USE_CODE','ROLL'],r=>r.APN9===candidate.county.apn9||r.ATN===candidate.county.atn);
  check(source.tables.land.rows.length===1,'ASSESSOR_CARDINALITY_STOP');const land=source.tables.land.rows[0];
  check(land.reference.ordinal===candidate.assessor.sourceRow&&land.values.ATN===candidate.county.atn&&land.values.APN9===candidate.county.apn9&&land.values.ADDR_SITUS===candidate.countyAddressReview.rawCountySitus&&land.values.USE_CODE===candidate.assessor.useCode,'ORIGINAL_ASSESSOR_BINDING_STOP');
  source.tables.history=await scan('history',['APN9','EVT_NUM_CR','EVT_TYP_CR','DT_CREATE','EVT_NUM_IN','EVT_TYP_IN','DT_INACT'],r=>r.APN9===candidate.county.apn9);
  // Verify source bytes again after scanning (no partial-file or time-of-check shortcut).
  for(const kind of ['parcel','land','history'])check(await fileHash(SOURCES[kind].path)===SOURCES[kind].sha256,'SOURCE_CHANGED_DURING_SCAN');
  const mappingText=JSON.stringify(seal({candidates:[candidate]}));
  const template={candidate,mappingText,mappingSha256:originalSha(mappingText),source};
  const context={version:'LIVE_STAGE_A_SOURCE_V1',candidate,template,request:requestFor('A',candidate),sourceInputHashes:inputs.hashes};
  return {...context,contextFingerprint:hash(context)};
}
export function evaluate(context,body,headers){
  const {contextFingerprint,...payload}=context;check(hash(payload)===contextFingerprint,'SOURCE_CONTEXT_HASH_STOP');
  try{
    noPagination(headers);if(Object.hasOwn(headers,'x-total-count'))check(headers['x-total-count']==='1','DISCOVERY_TOTAL_STOP');
    const evidence=discovery(context.candidate,body,context.template);
    return {classification:'STAGE_A_DISCOVERY_ACCEPTED_FOR_REVIEW',historicalReconciliation:'PASS',evidence,authorizations:{...CLOSED}};
  }catch(e){
    const code=typeof e.code==='string'&&/^[A-Z_]+$/.test(e.code)?e.code:'EVIDENCE_VALIDATION_STOP';
    const identity=['DISCOVERY_CARDINALITY_STOP','DISCOVERY_IDENTITY_STOP','RULE_C_IDENTITY_STOP'].includes(code);
    let subject=null;if(identity&&Array.isArray(body)&&body.length===1){try{subject=projectRecord(body[0]);}catch{/* Unsafe schema is not persisted. */}}
    return {classification:identity?'STAGE_A_IDENTITY_EXCEPTION':'STAGE_A_PROVIDER_FAILURE',historicalReconciliation:identity?'EXCEPTION':'NOT EXECUTED',code,evidence:subject?{subject,identity:{status:'EXCEPTION',currentIdentityVerified:false,analystApproved:false},authorizations:{...CLOSED}}:null,authorizations:{...CLOSED}};
  }
}
