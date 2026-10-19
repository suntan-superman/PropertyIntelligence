import path from 'node:path';
import {readFile,realpath,stat} from 'node:fs/promises';
import {applicationDefault,cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {createFirebaseSessionService} from './firebase-session.js';

export const INITIAL_ADMINISTRATOR_UID='d2NTUCs0lGe6C64pDnRGtgTXm0O2';
const required=(env,name)=>{const value=String(env[name]??'').trim();if(!value)throw new Error(`${name}_REQUIRED`);return value;};
export const firebasePublicConfig=env=>({apiKey:required(env,'PI_PUBLIC_FIREBASE_API_KEY'),authDomain:required(env,'PI_PUBLIC_FIREBASE_AUTH_DOMAIN'),projectId:required(env,'PI_PUBLIC_FIREBASE_PROJECT_ID'),appId:required(env,'PI_PUBLIC_FIREBASE_APP_ID')});

function validServiceAccount(record,expectedProjectId){
  if(record?.type!=='service_account'||record.project_id!==expectedProjectId||typeof record.private_key!=='string'||!record.private_key.includes('BEGIN PRIVATE KEY')||typeof record.client_email!=='string'||!record.client_email.endsWith('.gserviceaccount.com'))throw new Error('FIREBASE_CREDENTIAL_PROJECT_MISMATCH');
  return record;
}

export async function verifyFirebaseCredentialBinding(env=process.env){
  const expectedProjectId=required(env,'FIREBASE_PROJECT_ID'),encoded=String(env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64??'').trim();
  if(encoded){
    let record;
    try{const bytes=Buffer.from(encoded,'base64');if(!bytes.length||bytes.toString('base64').replace(/=+$/,'')!==encoded.replace(/=+$/,''))throw new Error('invalid');record=JSON.parse(bytes.toString('utf8'));}
    catch{throw new Error('FIREBASE_CREDENTIAL_ENV_INVALID');}
    validServiceAccount(record,expectedProjectId);
    return {expectedProjectId,credentialProjectId:record.project_id,source:'environment',serviceAccount:record};
  }
  const configured=required(env,'GOOGLE_APPLICATION_CREDENTIALS'),absolute=path.resolve(configured),actual=await realpath(absolute),info=await stat(actual);
  if(actual.toLowerCase()!==absolute.toLowerCase()||info.isSymbolicLink()||!info.isFile())throw new Error('FIREBASE_CREDENTIAL_FILE_INVALID');
  const record=validServiceAccount(JSON.parse(await readFile(actual,'utf8')),expectedProjectId);
  return {expectedProjectId,credentialProjectId:record.project_id,source:'file',path:absolute,serviceAccount:record};
}

export async function initializeFirebaseAuthentication({env=process.env,secureCookies=false}={}){
  const binding=await verifyFirebaseCredentialBinding(env),clientConfig=firebasePublicConfig(env);
  if(clientConfig.projectId!==binding.expectedProjectId)throw new Error('FIREBASE_WEB_ADMIN_PROJECT_MISMATCH');
  const credential=binding.source==='environment'?cert({projectId:binding.serviceAccount.project_id,clientEmail:binding.serviceAccount.client_email,privateKey:binding.serviceAccount.private_key}):applicationDefault();
  const existing=getApps().find(app=>app.name==='pi-v2-3a'),app=existing??initializeApp({credential,projectId:binding.expectedProjectId},'pi-v2-3a'),adminAuth=getAuth(app);
  return createFirebaseSessionService({adminAuth,expectedProjectId:binding.expectedProjectId,initialAdministratorUid:INITIAL_ADMINISTRATOR_UID,expectedOrganizationId:required(env,'PI_FIREBASE_ORGANIZATION_ID'),publicConfig:clientConfig,secureCookies});
}

export async function initializeFirebaseDurableProperties({authentication}={}){
  if(!authentication?.enabled||!authentication.expectedProjectId)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');
  const [{getApp},{getFirestore},{createFirestoreDurablePropertyRepository},{createDurablePropertyService}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('../investment-workspace/firestore-durable-properties.js'),import('../investment-workspace/durable-properties.js')]);
  const app=getApp('pi-v2-3a');
  if(app.options.projectId!==authentication.expectedProjectId)throw new Error('FIRESTORE_PROJECT_MISMATCH');
  return createDurablePropertyService({repository:createFirestoreDurablePropertyRepository({firestore:getFirestore(app)})});
}

/**
 * Read-only supporting-document metadata for cloud workspace views. File bytes,
 * Storage paths and scanner credentials remain server-side and are not needed
 * to list the evidence register.
 */
export async function initializeFirebaseDocumentMetadata({authentication,durableProperties}={}){
  if(!authentication?.enabled||!authentication.expectedProjectId)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');
  if(!durableProperties)throw new Error('DURABLE_PROPERTY_SERVICE_REQUIRED');
  const [{getApp},{getFirestore},{createFirestoreSupportingDocumentRepository},{publicSupportingDocument,documentCompleteness}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('../investment-workspace/firebase-supporting-documents.js'),import('../investment-workspace/supporting-documents.js')]);
  const app=getApp('pi-v2-3a');
  if(app.options.projectId!==authentication.expectedProjectId)throw new Error('FIRESTORE_PROJECT_MISMATCH');
  const repository=createFirestoreSupportingDocumentRepository({firestore:getFirestore(app)});
  return {async list({user,propertyId}){
    const property=await durableProperties.get({user,id:propertyId}),records=await repository.list(user.organizationId,property.id),documents=records.map(publicSupportingDocument);
    return {documents,completeness:documentCompleteness(documents)};
  }};
}

export async function initializeFirebaseSupportingDocuments({authentication,durableProperties,malwareScanner,bucketName=process.env.PI_FIREBASE_STORAGE_BUCKET}={}){
  if(!authentication?.enabled||!authentication.expectedProjectId)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');
  if(!durableProperties)throw new Error('DURABLE_PROPERTY_SERVICE_REQUIRED');
  if(!malwareScanner)throw new Error('DOCUMENT_MALWARE_SCANNER_REQUIRED');
  const name=String(bucketName??'').trim();if(!name)throw new Error('PI_FIREBASE_STORAGE_BUCKET_REQUIRED');
  if(name!==`${authentication.expectedProjectId}.firebasestorage.app`)throw new Error('FIREBASE_STORAGE_BUCKET_PROJECT_MISMATCH');
  const [{getApp},{getFirestore},{getStorage},{createFirestoreSupportingDocumentRepository,createFirebasePrivateDocumentStorage},{createSupportingDocumentService}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('firebase-admin/storage'),import('../investment-workspace/firebase-supporting-documents.js'),import('../investment-workspace/supporting-documents.js')]);
  const app=getApp('pi-v2-3a');if(app.options.projectId!==authentication.expectedProjectId)throw new Error('FIREBASE_STORAGE_PROJECT_MISMATCH');
  const bucket=getStorage(app).bucket(name),[metadata]=await bucket.getMetadata(),location=String(metadata.location??'').toUpperCase(),uniform=metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled===true,publicAccessPrevention=String(metadata.iamConfiguration?.publicAccessPrevention??'').toLowerCase();
  if(location!=='US-WEST2'||!uniform||publicAccessPrevention!=='enforced')throw new Error('FIREBASE_STORAGE_SECURITY_CONFIGURATION_REQUIRED');
  return createSupportingDocumentService({repository:createFirestoreSupportingDocumentRepository({firestore:getFirestore(app)}),storage:createFirebasePrivateDocumentStorage({bucket}),malwareScanner,durableProperties});
}
