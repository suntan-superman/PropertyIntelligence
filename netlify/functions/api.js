import {createRuntime} from '../../src/workbench/api/runtime.js';
import {createNetlifyAuthenticatedApi} from '../../src/auth/netlify-auth.js';

// One warm-instance runtime; no local .env access, filesystem cache, PDF or business logic here.
const api=createRuntime({runtime:'netlify',env:process.env});
let authenticatedApi;
async function runtime(){
  authenticatedApi??=import('../../src/auth/firebase-admin.js').then(async({initializeFirebaseAuthentication,initializeFirebaseDurableProperties,initializeFirebaseRetainedEvidence,initializeFirebaseDocumentMetadata,initializeFirebaseSupportingDocuments})=>{
    const authentication=await initializeFirebaseAuthentication({env:process.env,secureCookies:true});
    let durablePromise=null,evidencePromise=null,metadataPromise=null;
    const durableProperties=()=>durablePromise??=initializeFirebaseDurableProperties({authentication});
    const retainedEvidence=()=>evidencePromise??=initializeFirebaseRetainedEvidence({authentication});
    const documentMetadata=()=>metadataPromise??=durableProperties().then(async service=>{
      if(process.env.PI_FIREBASE_STORAGE_BUCKET&&process.env.PI_MALWARE_SCANNER_URL){
        const {loadCloudRunMalwareScanner}=await import('../../src/investment-workspace/cloud-run-malware-scanner.js'),malwareScanner=await loadCloudRunMalwareScanner(process.env);
        return initializeFirebaseSupportingDocuments({authentication,durableProperties:service,malwareScanner,bucketName:process.env.PI_FIREBASE_STORAGE_BUCKET});
      }
      return initializeFirebaseDocumentMetadata({authentication,durableProperties:service});
    });
    return createNetlifyAuthenticatedApi({api,authentication,durableProperties,retainedEvidence,documentMetadata,pdfAvailable:true});
  });
  return authenticatedApi;
}
export default async function handler(request){
  if(new URL(request.url).pathname.endsWith('/health'))return api(request);
  try{return await (await runtime())(request);}
  catch(error){
    const code=/^[A-Z0-9_-]+$/.test(String(error?.message))?error.message:'AUTHENTICATION_CONFIGURATION_FAILED';
    console.error(`PI authentication initialization failed: ${code}`);
    return new Response(JSON.stringify({error:'AUTHENTICATION_NOT_CONFIGURED',code}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
}
