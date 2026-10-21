import {createHash} from 'node:crypto';

export const RETAINED_EVIDENCE_SCHEMA='PI_RETAINED_EVIDENCE_V1';
const safeId=(value,label)=>{const text=String(value??'').trim();if(!/^[A-Za-z0-9._-]{1,128}$/.test(text))throw new Error(`${label}_INVALID`);return text;};
const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const clean=value=>value===undefined?null:value;
const firestoreClone=value=>JSON.parse(JSON.stringify(value));

export function canonicalJson(value){
  if(Array.isArray(value))return `[${value.map(item=>canonicalJson(clean(item))).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(clean(value[key]))}`).join(',')}}`;
  return JSON.stringify(clean(value));
}

export const retainedEvidencePayloadHash=payload=>digest(canonicalJson(payload));
export const retainedEvidenceDocumentId=(subjectRef,evidenceFingerprint)=>digest(`${subjectRef}\n${evidenceFingerprint}`);

export function createRetainedEvidenceRecord({organizationId,property,propertyDetail=null,classification='RETAINED_RESEARCH',importedAt,importedBy,source='Retained normalized RentCast evidence'}={}){
  if(!property?.ref||!property?.evidenceFingerprint)throw new Error('RETAINED_EVIDENCE_IDENTITY_REQUIRED');
  if(propertyDetail&&propertyDetail.subjectRef!==property.ref)throw new Error('RETAINED_EVIDENCE_DETAIL_IDENTITY_MISMATCH');
  const payload=firestoreClone({property,propertyDetail:propertyDetail??null});
  const payloadBytes=Buffer.byteLength(JSON.stringify(payload));
  if(payloadBytes>850_000)throw new Error('RETAINED_EVIDENCE_FIRESTORE_DOCUMENT_TOO_LARGE');
  return {schemaVersion:RETAINED_EVIDENCE_SCHEMA,id:retainedEvidenceDocumentId(property.ref,property.evidenceFingerprint),organizationId:safeId(organizationId,'ORGANIZATION_ID'),subjectRef:property.ref,evidenceFingerprint:property.evidenceFingerprint,classification,source,payload,payloadHash:retainedEvidencePayloadHash(payload),payloadBytes,immutable:true,importedAt:String(importedAt),importedBy:String(importedBy)};
}

export function verifyRetainedEvidenceRecord(record){
  if(record?.schemaVersion!==RETAINED_EVIDENCE_SCHEMA||record?.immutable!==true||!record?.subjectRef||!record?.evidenceFingerprint||!record?.payload)throw new Error('RETAINED_EVIDENCE_RECORD_INVALID');
  if(record.payload.property?.ref!==record.subjectRef||record.payload.property?.evidenceFingerprint!==record.evidenceFingerprint||record.payload.propertyDetail&&record.payload.propertyDetail.subjectRef!==record.subjectRef)throw new Error('RETAINED_EVIDENCE_IDENTITY_MISMATCH');
  if(retainedEvidencePayloadHash(record.payload)!==record.payloadHash)throw new Error('RETAINED_EVIDENCE_INTEGRITY_FAILURE');
  return record;
}

export function createFirestoreRetainedEvidenceRepository({firestore}={}){
  if(!firestore?.collection||!firestore?.runTransaction)throw new Error('FIRESTORE_ADMIN_REQUIRED');
  const collection=organizationId=>firestore.collection('organizations').doc(safeId(organizationId,'ORGANIZATION_ID')).collection('retainedEvidenceSnapshots');
  const reference=(organizationId,id)=>collection(organizationId).doc(safeId(id,'RETAINED_EVIDENCE_ID'));
  return {
    async list(organizationId){const snapshot=await collection(organizationId).get();return snapshot.docs.map(row=>verifyRetainedEvidenceRecord({...row.data(),id:row.id})).sort((a,b)=>a.payload.property.address.localeCompare(b.payload.property.address));},
    async get(organizationId,id){const snapshot=await reference(organizationId,id).get();return snapshot.exists?verifyRetainedEvidenceRecord({...snapshot.data(),id:snapshot.id}):null;},
    async createImmutable(record){
      verifyRetainedEvidenceRecord(record);const ref=reference(record.organizationId,record.id);
      return firestore.runTransaction(async transaction=>{const existing=await transaction.get(ref);if(existing.exists){const current=verifyRetainedEvidenceRecord({...existing.data(),id:existing.id});if(current.payloadHash!==record.payloadHash)throw new Error('IMMUTABLE_RETAINED_EVIDENCE_CONFLICT');return {created:false,record:current};}transaction.create(ref,record);return {created:true,record};});
    }
  };
}

const trustedUser=user=>{if(!user?.uid||!user?.organizationId)throw Object.assign(new Error('AUTHENTICATION_REQUIRED'),{status:401});return user;};
export function createRetainedEvidenceService({repository}={}){
  if(!repository)throw new Error('RETAINED_EVIDENCE_REPOSITORY_REQUIRED');
  const records=async user=>repository.list(trustedUser(user).organizationId);
  const newest=rows=>[...rows].sort((a,b)=>String(b.importedAt).localeCompare(String(a.importedAt))||b.id.localeCompare(a.id));
  const current=rows=>{const selected=new Map();for(const row of newest(rows))if(!selected.has(row.subjectRef))selected.set(row.subjectRef,row);return [...selected.values()].sort((a,b)=>a.payload.property.address.localeCompare(b.payload.property.address));};
  return {
    async list({user,includeHistorical=false}={}){const rows=await records(user);return includeHistorical?newest(rows):current(rows);},
    async find({user,subjectRef,evidenceFingerprint=null}){return newest(await records(user)).find(record=>record.subjectRef===subjectRef&&(!evidenceFingerprint||record.evidenceFingerprint===evidenceFingerprint))??null;},
    async get({user,id}){return repository.get(trustedUser(user).organizationId,id);},
    async persist({user,property,propertyDetail=null,classification='RETAINED_RESEARCH',source='Authenticated RentCast research'}={}){const trusted=trustedUser(user);if(!['Administrator','Platform Administrator','Organization Administrator','Analyst'].includes(trusted.role))throw Object.assign(new Error('ROLE_NOT_AUTHORIZED'),{status:403});const record=createRetainedEvidenceRecord({organizationId:trusted.organizationId,property,propertyDetail,classification,source,importedAt:new Date().toISOString(),importedBy:trusted.uid});return repository.createImmutable(record);},
    async bootstrap({user}){const rows=current(await records(user));return {properties:rows.map(row=>structuredClone(row.payload.property)),propertyDetails:rows.map(row=>row.payload.propertyDetail).filter(Boolean).map(value=>structuredClone(value)),records:rows};}
  };
}
