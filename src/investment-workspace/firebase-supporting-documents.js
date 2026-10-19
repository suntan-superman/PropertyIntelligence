import {assertCurrentDocumentEligibility,documentEligibility} from './supporting-documents.js';

const safeId=(value,label)=>{const text=String(value??'');if(!/^[A-Za-z0-9._-]{1,128}$/.test(text))throw new Error(`${label}_INVALID`);return text;};
const serializable=value=>JSON.parse(JSON.stringify(value));
const repositoryError=(code,status=409,details={})=>Object.assign(new Error(code),{code,status,details});

export function createFirestoreSupportingDocumentRepository({firestore}={}){
  if(!firestore?.collection||!firestore?.runTransaction)throw new Error('FIRESTORE_ADMIN_REQUIRED');
  const organization=id=>firestore.collection('organizations').doc(safeId(id,'ORGANIZATION_ID'));
  const property=(organizationId,propertyId)=>organization(organizationId).collection('properties').doc(safeId(propertyId,'PROPERTY_ID'));
  const documents=(organizationId,propertyId)=>property(organizationId,propertyId).collection('supportingDocuments');
  const document=(organizationId,propertyId,documentId)=>documents(organizationId,propertyId).doc(safeId(documentId,'DOCUMENT_ID'));
  const hashRef=(organizationId,sha256)=>organization(organizationId).collection('documentHashes').doc(safeId(sha256,'DOCUMENT_HASH'));
  async function hydrate(organizationId,propertyId,snapshot,{allowInconsistent=false}={}){
    if(!snapshot?.exists)return null;
    const versions=await snapshot.ref.collection('versions').get(),record={...snapshot.data(),id:snapshot.id,organizationId,propertyId,versions:versions.docs.map(row=>row.data()).sort((a,b)=>a.version-b.version)};
    try{assertCurrentDocumentEligibility(record);return {...record,eligibilityConsistent:true};}
    catch(error){
      if(!allowInconsistent||error.code!=='DOCUMENT_ELIGIBILITY_INCONSISTENT')throw error;
      return {...record,eligibilityConsistent:false,eligibilityError:error.code};
    }
  }
  return {
    async list(organizationId,propertyId){const snapshot=await documents(organizationId,propertyId).get();return Promise.all(snapshot.docs.map(row=>hydrate(organizationId,propertyId,row,{allowInconsistent:true})));},
    async get(organizationId,propertyId,documentId){return hydrate(organizationId,propertyId,await document(organizationId,propertyId,documentId).get());},
    async findByHash(organizationId,sha256){const reservation=await hashRef(organizationId,sha256).get();if(!reservation.exists)return null;const data=reservation.data();return hydrate(organizationId,data.propertyId,await document(organizationId,data.propertyId,data.documentId).get());},
    async createVersion(record,version){
      const parent=property(record.organizationId,record.propertyId),ref=document(record.organizationId,record.propertyId,record.id),versionRef=ref.collection('versions').doc(`v${String(version.version).padStart(6,'0')}`),reservation=hashRef(record.organizationId,version.sha256),top=serializable({...record,versions:undefined});
      const outcome=await firestore.runTransaction(async transaction=>{const [propertySnapshot,hashSnapshot,documentSnapshot,versionSnapshot]=await Promise.all([transaction.get(parent),transaction.get(reservation),transaction.get(ref),transaction.get(versionRef)]);if(!propertySnapshot.exists)throw new Error('DURABLE_PROPERTY_NOT_FOUND');if(hashSnapshot.exists)return {created:false,duplicate:hashSnapshot.data()};if(versionSnapshot.exists)throw new Error('IMMUTABLE_DOCUMENT_VERSION_CONFLICT');if(record.currentVersion===1&&documentSnapshot.exists)throw new Error('DOCUMENT_ALREADY_EXISTS');if(record.currentVersion>1&&!documentSnapshot.exists)throw new Error('DOCUMENT_NOT_FOUND');transaction.set(ref,top,{merge:false});transaction.create(versionRef,serializable(version));transaction.create(reservation,{organizationId:record.organizationId,propertyId:record.propertyId,documentId:record.id,version:version.version,sha256:version.sha256,createdAt:version.uploadedAt});transaction.update(parent,{updatedAt:record.updatedAt,lastEditedBy:record.updatedBy});return {created:true};});
      if(!outcome.created){const duplicate=outcome.duplicate;return {created:false,duplicate:await hydrate(record.organizationId,duplicate.propertyId,await document(record.organizationId,duplicate.propertyId,duplicate.documentId).get())};}return {created:true,record:await hydrate(record.organizationId,record.propertyId,await ref.get())};
    },
    async update(organizationId,propertyId,documentId,record){
      const ref=document(organizationId,propertyId,documentId),versionNumber=Number(record.currentVersion),versionRef=ref.collection('versions').doc(`v${String(versionNumber).padStart(6,'0')}`),proposedVersion=(record.versions??[]).find(item=>item.version===versionNumber),top=serializable({...record,versions:undefined});
      if(!Number.isInteger(versionNumber)||!proposedVersion)throw repositoryError('DOCUMENT_VERSION_NOT_FOUND',404);
      assertCurrentDocumentEligibility(record);
      await firestore.runTransaction(async transaction=>{
        const [snapshot,versionSnapshot]=await Promise.all([transaction.get(ref),transaction.get(versionRef)]);
        if(!snapshot.exists)throw repositoryError('DOCUMENT_NOT_FOUND',404);
        if(!versionSnapshot.exists)throw repositoryError('DOCUMENT_VERSION_NOT_FOUND',404);
        if(Number(snapshot.data().currentVersion)!==versionNumber)throw repositoryError('DOCUMENT_CURRENT_VERSION_CONFLICT');
        const storedVersion=versionSnapshot.data();
        for(const field of ['version','sha256','storageKey','filename','mimeType'])if(storedVersion[field]!==proposedVersion[field])throw repositoryError('IMMUTABLE_DOCUMENT_VERSION_CONFLICT',409,{field});
        transaction.set(ref,top,{merge:false});
        transaction.update(versionRef,serializable(documentEligibility(proposedVersion)));
        transaction.update(property(organizationId,propertyId),{updatedAt:record.updatedAt,lastEditedBy:record.updatedBy});
      });
      return hydrate(organizationId,propertyId,await ref.get());
    },
    async appendAudit(entry){const ref=organization(entry.organizationId).collection('documentAuditEvents').doc();await ref.create(serializable({...entry,id:ref.id,immutable:true}));return {...entry,id:ref.id};}
  };
}

export function createFirebasePrivateDocumentStorage({bucket}={}){
  if(!bucket?.file)throw new Error('FIREBASE_STORAGE_BUCKET_REQUIRED');
  return {
    async put(storageKey,bytes,{contentType,sha256}){const file=bucket.file(storageKey);await file.save(bytes,{resumable:false,validation:'crc32c',metadata:{contentType,cacheControl:'private, no-store, max-age=0',contentDisposition:'attachment',metadata:{sha256,private:'true'}},preconditionOpts:{ifGenerationMatch:0}});},
    async get(storageKey){const [bytes]=await bucket.file(storageKey).download();return bytes;},
    async remove(storageKey){await bucket.file(storageKey).delete({ignoreNotFound:true});}
  };
}
