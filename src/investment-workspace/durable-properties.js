import {createHash,randomUUID} from 'node:crypto';
import {canonicalAddress,addressParts} from '../../apps/web/src/features/property-search/address-identity.js';
import {ROLES} from '../auth/access-control.js';

export const PROPERTY_LIFECYCLE=Object.freeze({PRELIMINARY:'PRELIMINARY_RESEARCH',SAVED:'SAVED_PROPERTY',ARCHIVED:'ARCHIVED_PROPERTY'});
const writableRoles=new Set(['Administrator',ROLES.PLATFORM_ADMINISTRATOR,ROLES.ORGANIZATION_ADMINISTRATOR,ROLES.ANALYST]);
const clean=value=>String(value??'').trim();
const digest=value=>createHash('sha256').update(String(value??'')).digest('hex');
const clone=value=>value==null?value:structuredClone(value);

export class DurablePropertyError extends Error{
  constructor(code,status=400,details={}){super(code);this.code=code;this.status=status;this.details=details;}
}

function trustedUser(user,{write=false}={}){
  if(!user?.uid||!user?.organizationId)throw new DurablePropertyError('AUTHENTICATION_REQUIRED',401);
  if(write&&!writableRoles.has(user.role))throw new DurablePropertyError('ROLE_NOT_AUTHORIZED',403);
  return {uid:clean(user.uid),organizationId:clean(user.organizationId),role:user.role};
}

function parcelIdentifiers(subject){
  const candidates=[subject?.apn,subject?.parcelId,subject?.attributes?.apn,subject?.attributes?.parcelId,subject?.discovery?.apn,subject?.discovery?.assessor?.apn9];
  return [...new Set(candidates.map(clean).filter(Boolean))].map(value=>({type:'APN',value,normalized:value.toUpperCase().replace(/[^A-Z0-9]/g,'')}));
}

function identityConfidence(subject,parcels){
  if(subject?.subjectKind==='DURABLE_SAVED')return 'EXISTING_DURABLE_RECORD';
  if(parcels.length)return 'REVIEWED_ADDRESS_WITH_UNVERIFIED_PARCEL';
  if(subject?.providerId)return 'PROVIDER_REPORTED_ADDRESS_MATCH';
  return 'REVIEWED_ADDRESS_ONLY';
}

function sourceReferences(subject){
  const values=[['SUBJECT',subject?.ref],['PROVIDER_PROPERTY',subject?.providerId],['PROPERTY_EVIDENCE',subject?.propertyRef],['VALUATION_EVIDENCE',subject?.valuationRef]].filter(([,value])=>clean(value));
  return values.map(([type,value])=>({type,reference:clean(value),referenceDigest:digest(value)}));
}

export function propertyPromotionCandidate(subject){
  if(!subject?.ref||!subject?.address)throw new DurablePropertyError('PROPERTY_SUBJECT_REQUIRED');
  const address=addressParts(subject),normalized=canonicalAddress(address);
  if(!normalized.street||!normalized.city||!normalized.state)throw new DurablePropertyError('PROPERTY_ADDRESS_REVIEW_REQUIRED',409);
  const parcels=parcelIdentifiers(subject),confidence=identityConfidence(subject,parcels),snapshot=clean(subject.evidenceFingerprint);
  if(!snapshot)throw new DurablePropertyError('EVIDENCE_SNAPSHOT_REQUIRED',409);
  return {
    sourceSubjectRef:clean(subject.ref),sourceSubjectKind:subject.subjectKind??PROPERTY_LIFECYCLE.PRELIMINARY,address:clean(subject.address),addressComponents:{street:clean(address.street),city:clean(address.city),state:clean(address.state).toUpperCase(),zip:clean(address.zip)},normalizedAddress:normalized,normalizedAddressKey:[normalized.street,normalized.city,normalized.state,normalized.zip].join('|'),normalizedAddressMatchKey:[normalized.street,normalized.city,normalized.state].join('|'),parcelIdentifiers:parcels,identityConfidence:confidence,
    verificationStatus:{address:'REVIEWED_NOT_LEGALLY_VERIFIED',parcel:parcels.length?'REPORTED_NOT_LEGALLY_VERIFIED':'UNKNOWN',title:'UNKNOWN',ownership:'UNKNOWN'},evidenceSnapshotId:snapshot,propertyType:subject.attributes?.propertyType??null,sourceReferences:sourceReferences(subject)
  };
}

export function publicDurableProperty(record){
  if(!record)return null;
  return {id:record.id,stablePropertyId:record.id,organizationId:record.organizationId,address:record.address,addressComponents:clone(record.addressComponents),normalizedAddress:clone(record.normalizedAddress),parcelIdentifiers:clone(record.parcelIdentifiers??[]),identityConfidence:record.identityConfidence,verificationStatus:clone(record.verificationStatus),evidenceSnapshotIds:clone(record.evidenceSnapshotIds??[]),sourceSubjectRef:record.sourceSubjectRef,sourceSubjectKind:record.sourceSubjectKind,propertyType:record.propertyType??null,lifecycleStatus:record.lifecycleStatus,createdAt:record.createdAt,updatedAt:record.updatedAt,createdBy:record.createdBy,lastEditedBy:record.lastEditedBy,archivedAt:record.archivedAt??null,scenarioCount:record.scenarioCount??0,reportCount:record.reportCount??0};
}

export function createDurablePropertyService({repository,clock=()=>new Date(),idFactory=randomUUID}={}){
  if(!repository)throw new Error('DURABLE_PROPERTY_REPOSITORY_REQUIRED');
  const now=()=>clock().toISOString();
  async function preview({user,subject}){
    const actor=trustedUser(user,{write:true}),candidate=propertyPromotionCandidate(subject),duplicates=await repository.findDuplicates(actor.organizationId,candidate);
    return {...candidate,lifecycleStatus:PROPERTY_LIFECYCLE.PRELIMINARY,potentialDuplicates:duplicates.map(publicDurableProperty)};
  }
  async function promote({user,subject,scenario=null}){
    const actor=trustedUser(user,{write:true}),candidate=propertyPromotionCandidate(subject),timestamp=now(),record={id:idFactory(),organizationId:actor.organizationId,...candidate,lifecycleStatus:PROPERTY_LIFECYCLE.SAVED,evidenceSnapshotIds:[candidate.evidenceSnapshotId],createdAt:timestamp,updatedAt:timestamp,createdBy:actor.uid,lastEditedBy:actor.uid,archivedAt:null};
    const result=await repository.create(record);
    if(!result.created)throw new DurablePropertyError('DUPLICATE_PROPERTY',409,{duplicates:result.duplicates.map(publicDurableProperty)});
    if(scenario?.id&&Number.isInteger(scenario.revision)&&scenario.revision>0)await repository.linkScenarioRevision(actor.organizationId,record.id,{scenario:clone(scenario),scenarioId:scenario.id,revision:scenario.revision,evidenceSnapshotId:scenario.evidenceFingerprint,linkedAt:timestamp,linkedBy:actor.uid,contentHash:digest(JSON.stringify(scenario))});
    return publicDurableProperty(await repository.get(actor.organizationId,record.id));
  }
  async function list({user,includeArchived=false}){const actor=trustedUser(user);return (await repository.list(actor.organizationId,{includeArchived})).map(publicDurableProperty);}
  async function get({user,id}){const actor=trustedUser(user),record=await repository.get(actor.organizationId,id);if(!record)throw new DurablePropertyError('DURABLE_PROPERTY_NOT_FOUND',404);return publicDurableProperty(record);}
  async function findBySubject({user,subjectRef,includeArchived=false}){const actor=trustedUser(user),record=await repository.findBySubject(actor.organizationId,subjectRef,{includeArchived});return publicDurableProperty(record);}
  async function setArchived({user,id,archived}){const actor=trustedUser(user,{write:true}),record=await repository.setLifecycle(actor.organizationId,id,archived?PROPERTY_LIFECYCLE.ARCHIVED:PROPERTY_LIFECYCLE.SAVED,{at:now(),userId:actor.uid});if(!record)throw new DurablePropertyError('DURABLE_PROPERTY_NOT_FOUND',404);return publicDurableProperty(record);}
  async function linkScenarioRevision({user,subjectRef,scenario}){const actor=trustedUser(user,{write:true}),property=await repository.findBySubject(actor.organizationId,subjectRef,{includeArchived:false});if(!property)return null;if(!scenario?.id||!Number.isInteger(scenario.revision)||scenario.revision<1)throw new DurablePropertyError('SAVED_SCENARIO_REVISION_REQUIRED',409);await repository.linkScenarioRevision(actor.organizationId,property.id,{scenario:clone(scenario),scenarioId:scenario.id,revision:scenario.revision,evidenceSnapshotId:scenario.evidenceFingerprint,linkedAt:now(),linkedBy:actor.uid,contentHash:digest(JSON.stringify(scenario))});return publicDurableProperty(await repository.get(actor.organizationId,property.id));}
  async function linkReport({user,subjectRef,scenario,kind,filename,status,supportingDocuments=[],propertyPhotos=[],finalization=null}){const actor=trustedUser(user,{write:true}),property=await repository.findBySubject(actor.organizationId,subjectRef,{includeArchived:false});if(!property)return null;const timestamp=now(),report={id:idFactory(),propertyId:property.id,propertyAddress:property.address,propertyRef:property.sourceSubjectRef,scenarioId:scenario.id,scenarioName:scenario.name,revision:scenario.revision,evidenceSnapshotId:scenario.evidenceFingerprint,kind,filename,status,supportingDocuments:clone(supportingDocuments),propertyPhotos:clone(propertyPhotos),finalization:finalization?clone({id:finalization.id,status:finalization.status,finalizedAt:finalization.finalizedAt,preparedBy:{displayName:finalization.preparedBy?.displayName,role:finalization.preparedBy?.role},organizationName:finalization.organizationName,counts:finalization.counts,acknowledgmentVersion:finalization.acknowledgment?.version}):null,generatedAt:timestamp,linkedBy:actor.uid};await repository.linkReport(actor.organizationId,property.id,report);return report;}
  async function scenarioRevisions({user,id}){const actor=trustedUser(user);return repository.listScenarioRevisions(actor.organizationId,id);}
  async function reports({user,id}){const actor=trustedUser(user);return repository.listReports(actor.organizationId,id);}
  async function removeReport({user,id,reportId}){
    const actor=trustedUser(user,{write:true}),property=await repository.get(actor.organizationId,id);
    if(!property)throw new DurablePropertyError('DURABLE_PROPERTY_NOT_FOUND',404);
    const report=(await repository.listReports(actor.organizationId,id)).find(item=>item.id===clean(reportId));
    if(!report)throw new DurablePropertyError('REPORT_NOT_FOUND',404);
    await repository.removeReport(actor.organizationId,id,report.id);
    return report;
  }
  async function removeScenario({user,id,scenarioId}){
    const actor=trustedUser(user,{write:true}),property=await repository.get(actor.organizationId,id);
    if(!property)throw new DurablePropertyError('DURABLE_PROPERTY_NOT_FOUND',404);
    const target=clean(scenarioId),reportsForScenario=(await repository.listReports(actor.organizationId,id)).filter(item=>item.scenarioId===target);
    if(reportsForScenario.length)throw new DurablePropertyError('SCENARIO_HAS_REPORTS',409,{reportCount:reportsForScenario.length});
    const removed=await repository.removeScenarioRevisions(actor.organizationId,id,target);
    if(!removed)throw new DurablePropertyError('SAVED_SCENARIO_NOT_FOUND',404);
    return {scenarioId:target,revisionsRemoved:removed};
  }
  return {preview,promote,list,get,findBySubject,setArchived,linkScenarioRevision,linkReport,scenarioRevisions,reports,removeReport,removeScenario};
}
