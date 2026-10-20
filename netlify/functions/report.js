import {createRuntime} from '../../src/workbench/api/runtime.js';
import {createNetlifyAuthenticatedApi} from '../../src/auth/netlify-auth.js';
import {renderNetlifyWorkspacePdf} from '../../src/investment-workspace/netlify-pdf-renderer.js';

const api=createRuntime({runtime:'netlify',env:process.env});
let authenticatedReportApi;

async function runtime(){
  authenticatedReportApi??=import('../../src/auth/firebase-admin.js').then(async({initializeFirebaseAuthentication,initializeFirebaseDurableProperties,initializeFirebaseRetainedEvidence,initializeFirebaseDocumentMetadata,initializeFirebaseSupportingDocuments})=>{
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
    return createNetlifyAuthenticatedApi({api,authentication,durableProperties,retainedEvidence,documentMetadata,pdfRenderer:renderNetlifyWorkspacePdf});
  });
  return authenticatedReportApi;
}

export const config={rateLimit:{windowSize:60,windowLimit:8,aggregateBy:['domain','ip']}};

export default async function handler(request){
  try{
    const url=new URL(request.url),normalized=url.pathname==='/api/investment/report/pdf'||url.pathname.endsWith('/.netlify/functions/report')?new Request(new URL('/api/investment/report',url.origin),request):request;
    return await (await runtime())(normalized);
  }
  catch(error){
    const code=/^[A-Z0-9_-]+$/.test(String(error?.message))?error.message:'REPORT_SERVICE_CONFIGURATION_FAILED';
    console.error(`PI report service initialization failed: ${code}`);
    return new Response(JSON.stringify({error:'REPORT_SERVICE_UNAVAILABLE',code}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
}
