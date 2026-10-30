import {createRuntime} from '../../src/workbench/api/runtime.js';
import {createNetlifyAuthenticatedApi} from '../../src/auth/netlify-auth.js';

// One warm-instance runtime; no local .env access, filesystem cache, PDF or business logic here.
const api=createRuntime({runtime:'netlify',env:process.env});
let authenticatedApi;
async function runtime(){
  authenticatedApi??=import('../../src/auth/firebase-admin.js').then(async({initializeFirebaseAuthentication,initializeFirebaseDurableProperties,initializeFirebaseRetainedEvidence,initializeFirebaseProductionResearch,initializeFirebaseDocumentMetadata,initializeFirebaseSupportingDocuments,initializeFirebasePropertyPhotos,initializeFirebaseCommercial,initializeFirebaseInvestorCrm,initializeFirebaseUserAdministration,initializeFirebaseReportStorage})=>{
    const authentication=await initializeFirebaseAuthentication({env:process.env,secureCookies:true});
    let durablePromise=null,evidencePromise=null,metadataPromise=null,photosPromise=null,researchPromise=null,commercialPromise=null,investorPromise=null;
    const durableProperties=()=>durablePromise??=initializeFirebaseDurableProperties({authentication});
    const retainedEvidence=()=>evidencePromise??=initializeFirebaseRetainedEvidence({authentication});
    const production=()=>researchPromise??=retainedEvidence().then(evidence=>initializeFirebaseProductionResearch({authentication,retainedEvidence:evidence,env:process.env}));
    const productionResearch=()=>production().then(value=>value.research),addressValidation=()=>production().then(value=>value.addressValidation);
    const commercial=()=>commercialPromise??=initializeFirebaseCommercial({authentication,env:process.env});
    const investorCrm=()=>investorPromise??=initializeFirebaseInvestorCrm({authentication,env:process.env});
    const reportStorage=()=>initializeFirebaseReportStorage({authentication,bucketName:process.env.PI_FIREBASE_STORAGE_BUCKET});
    const inviteUser=await initializeFirebaseUserAdministration({authentication,env:process.env});
    const documentMetadata=()=>metadataPromise??=durableProperties().then(async service=>{
      if(process.env.PI_FIREBASE_STORAGE_BUCKET&&process.env.PI_MALWARE_SCANNER_URL){
        const {loadCloudRunMalwareScanner}=await import('../../src/investment-workspace/cloud-run-malware-scanner.js'),malwareScanner=await loadCloudRunMalwareScanner(process.env);
        return initializeFirebaseSupportingDocuments({authentication,durableProperties:service,malwareScanner,bucketName:process.env.PI_FIREBASE_STORAGE_BUCKET});
      }
      return initializeFirebaseDocumentMetadata({authentication,durableProperties:service});
    });
    const propertyPhotos=()=>photosPromise??=durableProperties().then(async service=>{
      if(!process.env.PI_FIREBASE_STORAGE_BUCKET||!process.env.PI_MALWARE_SCANNER_URL)throw new Error('PROPERTY_PHOTO_STORAGE_NOT_CONFIGURED');
      const {loadCloudRunMalwareScanner}=await import('../../src/investment-workspace/cloud-run-malware-scanner.js'),malwareScanner=await loadCloudRunMalwareScanner(process.env);
      return initializeFirebasePropertyPhotos({authentication,durableProperties:service,malwareScanner,bucketName:process.env.PI_FIREBASE_STORAGE_BUCKET});
    });
    const origin=process.env.URL??'https://worksidepropertyintelligence.netlify.app',successUrl=process.env.PI_STRIPE_SUCCESS_URL??`${origin}/#billing-success`,cancelUrl=process.env.PI_STRIPE_CANCEL_URL??`${origin}/#billing`,[{createStripeCheckoutClient,verifyStripeWebhook},{createStripeReadinessClient}]=await Promise.all([import('../../src/commercial/commercial-service.js'),import('../../src/commercial/stripe-readiness.js')]),checkout=createStripeCheckoutClient({secretKey:process.env.STRIPE_SECRET_KEY,priceId:process.env.STRIPE_PRICE_ID,successUrl,cancelUrl,enabled:process.env.PI_STRIPE_CHECKOUT_ENABLED==='true',liveModeEnabled:process.env.PI_STRIPE_LIVE_MODE_ENABLED==='true'}),readiness=createStripeReadinessClient({secretKey:process.env.STRIPE_SECRET_KEY,priceId:process.env.STRIPE_PRICE_ID,webhookSecret:process.env.STRIPE_WEBHOOK_SECRET,successUrl,cancelUrl,origin});
    return createNetlifyAuthenticatedApi({api,authentication,durableProperties,retainedEvidence,productionResearch,addressValidation,documentMetadata,propertyPhotos,commercial,investorCrm,reportStorage,inviteUser,stripeCheckout:input=>checkout.create(input),stripeWebhook:input=>verifyStripeWebhook({...input,secret:process.env.STRIPE_WEBHOOK_SECRET}),stripeReadiness:()=>readiness.inspect(),pdfAvailable:true});
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
