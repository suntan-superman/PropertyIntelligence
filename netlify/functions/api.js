import {createRuntime} from '../../src/workbench/api/runtime.js';
import {createNetlifyAuthenticatedApi} from '../../src/auth/netlify-auth.js';

// One warm-instance runtime; no local .env access, filesystem cache, PDF or business logic here.
const api=createRuntime({runtime:'netlify',env:process.env});
let authenticatedApi;
async function runtime(){
  authenticatedApi??=import('../../src/auth/firebase-admin.js').then(({initializeFirebaseAuthentication})=>initializeFirebaseAuthentication({env:process.env,secureCookies:true})).then(authentication=>createNetlifyAuthenticatedApi({api,authentication}));
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
