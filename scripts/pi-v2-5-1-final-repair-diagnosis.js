import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const ROOT=path.resolve(import.meta.dirname,'..');
process.chdir(ROOT);
try{process.loadEnvFile(path.join(ROOT,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}

const organizationId='property-intelligence-local';
const propertyId='52638a00-8167-4cff-85c0-f56a0445a5a9';
const documentIds=['6f7b1d62-0e91-4da1-9e31-250101000001','6f7b1d62-0e91-4da1-9e31-250101000002','6f7b1d62-0e91-4da1-9e31-250101000003'];
const expectedHashes=['a6af653d497d3886a84852616b9f46e59ff42e415a739a0f616ae4b8cc5e5a6a','60b9ebbca8aca57db587eaf422ccecbecbc3964ee13b55a3f9bb7c2a5692728c','775fbe2d91a5e40a5906c394fe8309b2ccf0be891652d1fdc132ab931172d2c0'];
const eligibility=value=>({reviewStatus:value.reviewStatus,confidentiality:value.confidentiality,redistributionPermission:value.redistributionPermission,appendixSelected:value.appendixSelected,reviewedAt:value.reviewedAt?.toDate?.().toISOString?.()??value.reviewedAt??null,reviewedBy:value.reviewedBy??null});
const canonical=value=>{if(value===null||typeof value!=='object')return value;if(typeof value.toDate==='function')return value.toDate().toISOString();if(Array.isArray(value))return value.map(canonical);return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));},dataHash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const cookies=response=>{const result={};for(const item of response.headers.getSetCookie?.()??[]){const [pair]=item.split(';'),index=pair.indexOf('=');result[pair.slice(0,index)]=decodeURIComponent(pair.slice(index+1));}return result;};
const cookieHeader=jar=>Object.entries(jar).map(([key,value])=>`${key}=${encodeURIComponent(value)}`).join('; ');
const body=async response=>{const text=await response.text();try{return JSON.parse(text);}catch{return text;}};

assert.equal(process.version,'v22.12.0');
const [{initializeFirebaseAuthentication},{getApp},{getAuth},{getFirestore},{getStorage},{createFirestoreDurablePropertyRepository},{createDurablePropertyService},{createFirestoreSupportingDocumentRepository,createFirebasePrivateDocumentStorage},{createSupportingDocumentService},{startInvestmentWorkspace}]=await Promise.all([
  import('../src/auth/firebase-admin.js'),import('firebase-admin/app'),import('firebase-admin/auth'),import('firebase-admin/firestore'),import('firebase-admin/storage'),import('../src/investment-workspace/firestore-durable-properties.js'),import('../src/investment-workspace/durable-properties.js'),import('../src/investment-workspace/firebase-supporting-documents.js'),import('../src/investment-workspace/supporting-documents.js'),import('../src/investment-workspace/server.js')
]);
const authentication=await initializeFirebaseAuthentication(),app=getApp('pi-v2-3a'),adminAuth=getAuth(app),db=getFirestore(app),bucket=getStorage(app).bucket(process.env.PI_FIREBASE_STORAGE_BUCKET);
const raw=[];
for(let index=0;index<documentIds.length;index++){
  const id=documentIds[index],parentRef=db.doc(`organizations/${organizationId}/properties/${propertyId}/supportingDocuments/${id}`),versionRef=parentRef.collection('versions').doc('v000001'),[parent,version]=await Promise.all([parentRef.get(),versionRef.get()]);
  raw.push({id,parentExists:parent.exists,versionExists:version.exists,parent:eligibility(parent.data()),version:eligibility(version.data()),hash:version.data()?.sha256,hashMatches:version.data()?.sha256===expectedHashes[index],scanStatus:version.data()?.scanStatus});
}
const repairAudits=await db.collection(`organizations/${organizationId}/documentAuditEvents`).where('action','==','DOCUMENT_ELIGIBILITY_REPAIRED').get();
const reports=await db.collection(`organizations/${organizationId}/properties/${propertyId}/reportRevisions`).get();
const propertyRef=db.doc(`organizations/${organizationId}/properties/${propertyId}`),[property,evidenceSnapshots,scenarioRevisions,allDocuments,allProperties]=await Promise.all([propertyRef.get(),propertyRef.collection('evidenceSnapshots').get(),propertyRef.collection('scenarioRevisions').get(),propertyRef.collection('supportingDocuments').get(),db.collection(`organizations/${organizationId}/properties`).get()]),fourth=allDocuments.docs.find(item=>item.id==='253ed077-bfd7-49a0-a71a-2cfe75271a0a'),fourthVersions=await fourth.ref.collection('versions').get(),[objects]=await bucket.getFiles({prefix:`organizations/${organizationId}/properties/${propertyId}/`}),objectManifest=await Promise.all(objects.map(async file=>{const [metadata]=await file.getMetadata();return {name:file.name,generation:String(metadata.generation),size:Number(metadata.size),sha256:metadata.metadata?.sha256??null};})),preflight=JSON.parse(await (await import('node:fs/promises')).readFile(path.join(ROOT,'data/validation/pi-v2-5-1-final-three-document-repair/preflight.json'),'utf8')),baseline=preflight.baseline;
const integrity={propertyUnchanged:dataHash(property.data())===baseline.propertyHash,evidenceSnapshotsUnchanged:JSON.stringify(Object.fromEntries(evidenceSnapshots.docs.map(item=>[item.ref.path,dataHash(item.data())])))===JSON.stringify(baseline.evidenceHashes),scenarioRevisionsUnchanged:JSON.stringify(Object.fromEntries(scenarioRevisions.docs.map(item=>[item.ref.path,dataHash(item.data())])))===JSON.stringify(baseline.scenarioHashes),parentDocumentsUnchanged:JSON.stringify(Object.fromEntries(allDocuments.docs.map(item=>[item.ref.path,dataHash(item.data())])))===JSON.stringify(baseline.documentHashes),historicalReportsUnchanged:JSON.stringify(Object.fromEntries(reports.docs.map(item=>[item.ref.path,dataHash(item.data())])))===JSON.stringify(baseline.reportHashes),fourthDocumentUnchanged:dataHash(fourth.data())===baseline.fourthDocumentHash,fourthVersionsUnchanged:JSON.stringify(Object.fromEntries(fourthVersions.docs.map(item=>[item.ref.path,dataHash(item.data())])))===JSON.stringify(baseline.fourthVersionHashes),otherPropertiesUnchanged:JSON.stringify(Object.fromEntries(allProperties.docs.filter(item=>item.id!==propertyId).map(item=>[item.ref.path,dataHash(item.data())])))===JSON.stringify(baseline.otherPropertyHashes),storageObjectsUnchanged:JSON.stringify(objectManifest)===JSON.stringify(baseline.objectManifest),newReportCreated:reports.docs.some(item=>item.id==='6f7b1d62-0e91-4da1-9e31-250101000202')};

const durableProperties=createDurablePropertyService({repository:createFirestoreDurablePropertyRepository({firestore:db})});
const supportingDocuments=createSupportingDocumentService({repository:createFirestoreSupportingDocumentRepository({firestore:db}),storage:createFirebasePrivateDocumentStorage({bucket}),malwareScanner:{async scan(){throw new Error('READ_ONLY_DIAGNOSIS_SCAN_PROHIBITED');}},durableProperties});
const server=await startInvestmentWorkspace({port:0,root:ROOT,viteEnabled:false,propertyDetail:true,authentication,durableProperties,supportingDocuments,propertyResearch:null});
const routeResults=[];
try{
  const jar={};
  const configResponse=await fetch(`${server.origin}/api/auth/config`);Object.assign(jar,cookies(configResponse));const config=await body(configResponse);routeResults.push({route:'GET /api/auth/config',status:configResponse.status,body:config});
  const signInResponse=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(process.env.PI_PUBLIC_FIREBASE_API_KEY)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PW,returnSecureToken:true})});const signIn=await body(signInResponse);routeResults.push({route:'Firebase password sign-in',status:signInResponse.status,body:{localId:signIn.localId,emailVerified:signIn.registered,error:signIn.error?.message??null}});
  const sessionResponse=await fetch(`${server.origin}/api/auth/session`,{method:'POST',headers:{Origin:server.origin,'Content-Type':'application/json','X-PI-CSRF':jar.pi_csrf,Cookie:cookieHeader(jar)},body:JSON.stringify({idToken:signIn.idToken})});Object.assign(jar,cookies(sessionResponse));routeResults.push({route:'POST /api/auth/session',status:sessionResponse.status,body:await body(sessionResponse)});
  for(const route of ['/api/auth/me','/api/investment/bootstrap','/api/investment/scenarios',`/api/durable-properties/${propertyId}/documents`]){
    const response=await fetch(`${server.origin}${route}`,{headers:{Cookie:cookieHeader(jar)}}),parsed=await body(response);routeResults.push({route:`GET ${route}`,status:response.status,body:response.status===200?{kind:Array.isArray(parsed)?'array':'object',count:Array.isArray(parsed)?parsed.length:parsed.documents?.length??parsed.properties?.length??null,error:null}:{error:parsed?.error,code:parsed?.code,details:parsed?.details}});
  }
}finally{await server.close();}

const result={status:'READ_ONLY_DIAGNOSIS_COMPLETE',at:new Date().toISOString(),mutationsPerformed:0,raw,repairAuditCount:repairAudits.size,repairAudits:repairAudits.docs.map(item=>({id:item.id,documentId:item.data().documentId,at:item.data().at,path:item.ref.path})),reports:reports.docs.map(item=>({id:item.id,path:item.ref.path,status:item.data().status,filename:item.data().filename})),integrity,routes:routeResults};
console.log(JSON.stringify(result,null,2));
