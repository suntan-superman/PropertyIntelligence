import path from 'node:path';
import {readFile,realpath,stat} from 'node:fs/promises';
import {applicationDefault,cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {createFirebaseSessionService} from './firebase-session.js';
import {AccessDenied} from './access-control.js';

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
  const ownerOrganizationId=required(env,'PI_FIREBASE_ORGANIZATION_ID'),externalBetaEnabled=env.PI_EXTERNAL_BETA_ENABLED==='true',service=createFirebaseSessionService({adminAuth,expectedProjectId:binding.expectedProjectId,initialAdministratorUid:INITIAL_ADMINISTRATOR_UID,expectedOrganizationId:ownerOrganizationId,publicConfig:clientConfig,secureCookies}),{getFirestore}=await import('firebase-admin/firestore'),firestore=getFirestore(app),checkOrganization=async user=>{if(user.organizationId!==ownerOrganizationId&&!externalBetaEnabled)throw new AccessDenied('EXTERNAL_BETA_DISABLED',403);const row=await firestore.collection('organizations').doc(user.organizationId).get();if(row.exists&&row.data()?.status==='SUSPENDED')throw new AccessDenied('ORGANIZATION_SUSPENDED',403);return user;};
  return {...service,authenticate:async request=>checkOrganization(await service.authenticate(request)),createSession:async(idToken,response)=>checkOrganization(await service.createSession(idToken,response)),verifyRecentIdToken:async(...args)=>checkOrganization(await service.verifyRecentIdToken(...args))};
}

export async function initializeFirebaseDurableProperties({authentication}={}){
  if(!authentication?.enabled||!authentication.expectedProjectId)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');
  const [{getApp},{getFirestore},{createFirestoreDurablePropertyRepository},{createDurablePropertyService}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('../investment-workspace/firestore-durable-properties.js'),import('../investment-workspace/durable-properties.js')]);
  const app=getApp('pi-v2-3a');
  if(app.options.projectId!==authentication.expectedProjectId)throw new Error('FIRESTORE_PROJECT_MISMATCH');
  return createDurablePropertyService({repository:createFirestoreDurablePropertyRepository({firestore:getFirestore(app)})});
}

export async function initializeFirebaseRetainedEvidence({authentication}={}){
  if(!authentication?.enabled||!authentication.expectedProjectId)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');
  const [{getApp},{getFirestore},{createFirestoreRetainedEvidenceRepository,createRetainedEvidenceService}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('../investment-workspace/firestore-retained-evidence.js')]);
  const app=getApp('pi-v2-3a');
  if(app.options.projectId!==authentication.expectedProjectId)throw new Error('FIRESTORE_PROJECT_MISMATCH');
  return createRetainedEvidenceService({repository:createFirestoreRetainedEvidenceRepository({firestore:getFirestore(app)})});
}

export async function initializeFirebaseCommercial({authentication,env=process.env}={}){
  if(!authentication?.enabled||!authentication.expectedProjectId)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');
  const [{getApp},{getFirestore},{createFirestoreCommercialRepository},{createCommercialService}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('../commercial/firestore-commercial-repository.js'),import('../commercial/commercial-service.js')]);
  const app=getApp('pi-v2-3a');if(app.options.projectId!==authentication.expectedProjectId)throw new Error('FIRESTORE_PROJECT_MISMATCH');
  return createCommercialService({repository:createFirestoreCommercialRepository({firestore:getFirestore(app)}),flags:{externalBetaEnabled:env.PI_EXTERNAL_BETA_ENABLED==='true',stripeCheckoutEnabled:env.PI_STRIPE_CHECKOUT_ENABLED==='true',stripeLiveModeEnabled:env.PI_STRIPE_LIVE_MODE_ENABLED==='true',ownerOrganizationId:String(env.PI_FIREBASE_ORGANIZATION_ID??'').trim()||null}});
}

export async function initializeFirebaseInvestorCrm({authentication,env=process.env}={}){
  if(!authentication?.enabled||!authentication.expectedProjectId)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');
  const [{getApp},{getFirestore},{createFirestoreInvestorRepository},{createInvestorCrmService}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('../investor-crm/firestore-repository.js'),import('../investor-crm/investor-service.js')]);
  const app=getApp('pi-v2-3a');if(app.options.projectId!==authentication.expectedProjectId)throw new Error('FIRESTORE_PROJECT_MISMATCH');
  // No general outbound provider is configured in PI today. Campaign preparation,
  // consent enforcement and secure access are production-ready; dispatch fails
  // closed until a separately configured transactional provider is supplied.
  return createInvestorCrmService({repository:createFirestoreInvestorRepository({firestore:getFirestore(app)}),emailSender:null,publicOrigin:String(env.URL??'https://worksidepropertyintelligence.netlify.app').replace(/\/$/,'')});
}

export async function initializeFirebaseUserAdministration({authentication,env=process.env}={}){
  if(!authentication?.enabled)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');const [{getApp},{getAuth}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/auth')]),auth=getAuth(getApp('pi-v2-3a')),apiKey=required(env,'PI_PUBLIC_FIREBASE_API_KEY');
  const sendReset=async({email})=>{const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestType:'PASSWORD_RESET',email})});if(!response.ok)throw Object.assign(new Error('FIREBASE_PASSWORD_RESET_EMAIL_FAILED'),{status:502});return {requested:true};};
  const setClaims=async({uid,organizationId,role,organizationName})=>{const account=await auth.getUser(uid),existingOrg=account.customClaims?.piOrganizationId;if(existingOrg&&existingOrg!==organizationId)throw Object.assign(new Error('USER_ALREADY_BELONGS_TO_ANOTHER_ORGANIZATION'),{status:409});await auth.setCustomUserClaims(uid,{...(account.customClaims??{}),role,piOrganizationId:organizationId,piOrganizationName:String(organizationName??account.customClaims?.piOrganizationName??organizationId).slice(0,160),piProviderResearch:['Platform Administrator','Organization Administrator','Analyst'].includes(role)});return account;};
  const invite=async invitation=>{let account;try{account=await auth.getUserByEmail(invitation.email);}catch(error){if(error?.code!=='auth/user-not-found')throw error;account=await auth.createUser({email:invitation.email,emailVerified:false,disabled:false});}await setClaims({uid:account.uid,organizationId:invitation.organizationId,organizationName:invitation.organizationName,role:invitation.role});if(account.disabled)await auth.updateUser(account.uid,{disabled:false});await sendReset({email:invitation.email});return {uid:account.uid,displayName:account.displayName??''};};
  invite.setRole=async input=>{const account=await setClaims(input);return {uid:account.uid};};
  invite.setSuspended=async input=>{await setClaims(input);await auth.updateUser(input.uid,{disabled:input.suspended===true});return {uid:input.uid,disabled:input.suspended===true};};
  invite.sendPasswordReset=sendReset;
  invite.describeUsers=async uids=>{const identifiers=[...new Set((uids??[]).filter(Boolean))].slice(0,100).map(uid=>({uid}));if(!identifiers.length)return [];const result=await auth.getUsers(identifiers);return result.users.map(account=>({uid:account.uid,email:account.email??'',displayName:account.displayName??'',emailVerified:account.emailVerified===true,disabled:account.disabled===true,createdAt:account.metadata.creationTime??null,lastSignInAt:account.metadata.lastSignInTime??null}));};
  return invite;
}

export async function initializeFirebaseReportStorage({authentication,bucketName=process.env.PI_FIREBASE_STORAGE_BUCKET}={}){
  if(!authentication?.enabled)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');const name=String(bucketName??'').trim();if(name!==`${authentication.expectedProjectId}.firebasestorage.app`)throw new Error('FIREBASE_STORAGE_BUCKET_PROJECT_MISMATCH');const [{getApp},{getStorage},{createFirebasePrivateReportStorage}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/storage'),import('../commercial/firebase-report-storage.js')]);return createFirebasePrivateReportStorage({bucket:getStorage(getApp('pi-v2-3a')).bucket(name)});
}

export async function initializeFirebaseProductionResearch({authentication,retainedEvidence,env=process.env}={}){
  if(!authentication?.enabled||!authentication.expectedProjectId||!retainedEvidence)throw new Error('FIREBASE_PRODUCTION_RESEARCH_REQUIRED');
  const apiKey=String(env.RENTCAST_API_KEY??env.MARKET_DATA_API_KEY??'').trim();if(!apiKey||/\s/.test(apiKey))throw new Error('RENTCAST_API_KEY_REQUIRED');
  const [{getApp},{getFirestore},{createFirestoreRentCastStore,createFirestoreResearchRepository,createProductionPropertyResearch},{createFirestoreAddressValidation}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('../investment-workspace/firestore-production-research.js'),import('../discovery/firestore-address-validation.js')]);
  const app=getApp('pi-v2-3a');if(app.options.projectId!==authentication.expectedProjectId)throw new Error('FIRESTORE_PROJECT_MISMATCH');const firestore=getFirestore(app),clock=()=>new Date();
  const timeoutMs=Number(String(env.PI_RENTCAST_TIMEOUT_MS??'18000').trim());if(!Number.isSafeInteger(timeoutMs)||timeoutMs<5_000||timeoutMs>18_000)throw new Error('PI_RENTCAST_TIMEOUT_MS_INVALID');
  const googleApiKey=String(env.GOOGLE_GEOCODING_API_KEY??env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY??'').trim()||null,services=new Map(),validators=new Map(),forOrg=organizationId=>{if(!organizationId)throw new Error('ORGANIZATION_MEMBERSHIP_REQUIRED');if(!services.has(organizationId)){const store=createFirestoreRentCastStore({firestore,organizationId}),repository=createFirestoreResearchRepository({firestore,organizationId,clock});services.set(organizationId,createProductionPropertyResearch({organizationId,repository,store,apiKey,evidenceService:retainedEvidence,clock,timeoutMs}));}return services.get(organizationId);},validator=organizationId=>{if(!validators.has(organizationId))validators.set(organizationId,createFirestoreAddressValidation({firestore,organizationId,googleApiKey,clock}));return validators.get(organizationId);};
  const research={capability:input=>forOrg(input.user.organizationId).capability(input),quote:input=>forOrg(input.user.organizationId).quote(input),research:input=>forOrg(input.user.organizationId).research(input),creditKey:input=>forOrg(input.user.organizationId).creditKey(input),getSettings:input=>forOrg(input.user.organizationId).getSettings(input),updateSettings:input=>forOrg(input.user.organizationId).updateSettings(input)};
  const addressValidation={validateForResearch:(input,context)=>validator(context.organizationId).validateForResearch(input,context),confirmForResearch:(input,context)=>validator(context.organizationId).confirmForResearch(input,context),consumeResearchToken:(token,context)=>validator(context.organizationId).consumeResearchToken(token,context)};
  return {research,addressValidation};
}

export function durableWorkspaceDocument(document={}){
  const version=document.currentVersionMetadata;
  return {id:document.id,propertyId:document.propertyId,documentType:document.documentType,description:document.description,source:document.source,sourceDate:document.sourceDate,uploadedAt:document.uploadedAt,updatedAt:document.updatedAt,reviewStatus:document.reviewStatus,confidentiality:document.confidentiality,redistributionPermission:document.redistributionPermission,appendixSelected:document.appendixSelected,evidenceClaim:document.evidenceClaim,currentVersion:document.currentVersion,versionCount:document.versionCount,eligibilityConsistent:document.eligibilityConsistent,currentVersionMetadata:version?{version:version.version,filename:version.filename,mimeType:version.mimeType,sizeBytes:version.sizeBytes,pageCount:version.pageCount,uploadedAt:version.uploadedAt,scanStatus:version.scanStatus}:null};
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
    const property=await durableProperties.get({user,id:propertyId}),records=await repository.list(user.organizationId,property.id),documents=records.map(record=>durableWorkspaceDocument(publicSupportingDocument(record)));
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

export async function initializeFirebasePropertyPhotos({authentication,durableProperties,malwareScanner,bucketName=process.env.PI_FIREBASE_STORAGE_BUCKET}={}){
  if(!authentication?.enabled||!authentication.expectedProjectId)throw new Error('FIREBASE_AUTHENTICATION_REQUIRED');
  if(!durableProperties)throw new Error('DURABLE_PROPERTY_SERVICE_REQUIRED');
  if(!malwareScanner)throw new Error('PHOTO_MALWARE_SCANNER_REQUIRED');
  const name=String(bucketName??'').trim();if(!name)throw new Error('PI_FIREBASE_STORAGE_BUCKET_REQUIRED');
  if(name!==`${authentication.expectedProjectId}.firebasestorage.app`)throw new Error('FIREBASE_STORAGE_BUCKET_PROJECT_MISMATCH');
  const [{getApp},{getFirestore},{getStorage},{createFirestorePropertyPhotoRepository},{createFirebasePrivateDocumentStorage},{createPropertyPhotoService}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore'),import('firebase-admin/storage'),import('../investment-workspace/firebase-property-photos.js'),import('../investment-workspace/firebase-supporting-documents.js'),import('../investment-workspace/property-photos.js')]);
  const app=getApp('pi-v2-3a');if(app.options.projectId!==authentication.expectedProjectId)throw new Error('FIREBASE_STORAGE_PROJECT_MISMATCH');
  const bucket=getStorage(app).bucket(name),[metadata]=await bucket.getMetadata(),location=String(metadata.location??'').toUpperCase(),uniform=metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled===true,publicAccessPrevention=String(metadata.iamConfiguration?.publicAccessPrevention??'').toLowerCase();
  if(location!=='US-WEST2'||!uniform||publicAccessPrevention!=='enforced')throw new Error('FIREBASE_STORAGE_SECURITY_CONFIGURATION_REQUIRED');
  return createPropertyPhotoService({repository:createFirestorePropertyPhotoRepository({firestore:getFirestore(app)}),storage:createFirebasePrivateDocumentStorage({bucket}),malwareScanner,durableProperties});
}
