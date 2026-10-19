import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFirebaseSessionService,CSRF_COOKIE,SESSION_COOKIE} from '../src/auth/firebase-session.js';
import {createNetlifyAuthenticatedApi} from '../src/auth/netlify-auth.js';

const project='netlify-auth-test',organization='property-intelligence-local',uid='admin-test',now=new Date('2026-10-19T20:00:00.000Z');
const decoded={uid,aud:project,iss:`https://securetoken.google.com/${project}`,role:'Administrator',piOrganizationId:organization,piProviderResearch:true,email_verified:true,auth_time:Math.floor(now.getTime()/1000),iat:Math.floor(now.getTime()/1000),exp:Math.floor(now.getTime()/1000)+3600};
const sessionDecoded={...decoded,iss:`https://session.firebase.google.com/${project}`};
const authentication=createFirebaseSessionService({adminAuth:{verifyIdToken:async token=>{if(token!=='id-token')throw new Error('invalid');return decoded;},createSessionCookie:async()=> 'session-cookie',verifySessionCookie:async token=>{if(token!=='session-cookie')throw new Error('invalid');return sessionDecoded;}},expectedProjectId:project,initialAdministratorUid:uid,expectedOrganizationId:organization,publicConfig:{apiKey:'public-api-key',authDomain:`${project}.firebaseapp.com`,projectId:project,appId:'1:test:web:test'},secureCookies:true,clock:()=>now,csrfBytes:()=>Buffer.alloc(24,3)});
const api=async request=>new Response(JSON.stringify({ok:true,path:new URL(request.url).pathname}),{headers:{'Content-Type':'application/json'}}),secured=createNetlifyAuthenticatedApi({api,authentication});

test('Netlify Firebase config is runtime-supplied and issues a secure CSRF cookie',async()=>{
  for(const path of ['/api/auth/config','/.netlify/functions/api/auth/config']){
    const response=await secured(new Request(`https://pi.example${path}`)),body=await response.json();
    assert.equal(response.status,200);assert.equal(body.firebaseConfig.apiKey,'public-api-key');assert.equal(body.firebaseConfig.projectId,project);assert.ok(body.csrfToken);
    assert.match(response.headers.get('set-cookie'),new RegExp(`^${CSRF_COOKIE}=`));assert.match(response.headers.get('set-cookie'),/Secure/);
  }
});

test('Netlify API fails closed until a same-origin Firebase session is established',async()=>{
  const signedOut=await secured(new Request('https://pi.example/api/auth/me'));assert.equal(signedOut.status,200);assert.equal((await signedOut.json()).user,null);
  assert.equal((await secured(new Request('https://pi.example/api/fixtures'))).status,401);
  const config=await secured(new Request('https://pi.example/api/auth/config')),csrf=(await config.json()).csrfToken,csrfCookie=config.headers.get('set-cookie').split(';')[0];
  const login=await secured(new Request('https://pi.example/api/auth/session',{method:'POST',headers:{Origin:'https://pi.example','Content-Type':'application/json','X-PI-CSRF':csrf,Cookie:csrfCookie},body:JSON.stringify({idToken:'id-token'})}));
  assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),new RegExp(`^${SESSION_COOKIE}=`));assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/Secure/);
  const sessionCookie=login.headers.get('set-cookie').split(';')[0],authorized=await secured(new Request('https://pi.example/api/fixtures',{headers:{Cookie:sessionCookie}}));
  assert.equal(authorized.status,200);assert.equal((await authorized.json()).ok,true);
  const me=await secured(new Request('https://pi.example/api/auth/me',{headers:{Cookie:sessionCookie}}));assert.equal((await me.json()).user.organizationId,organization);
  const foreign=await secured(new Request('https://pi.example/api/auth/session',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json','X-PI-CSRF':csrf,Cookie:csrfCookie},body:JSON.stringify({idToken:'id-token'})}));assert.equal(foreign.status,403);
});

test('health remains available for deployment monitoring without opening business APIs',async()=>{
  const health=await secured(new Request('https://pi.example/api/health'));assert.equal(health.status,200);
});

test('Firebase Admin dependency bridge loads jose through ESM in the Netlify bundle',async()=>{
  const files=[new URL('../node_modules/jwks-rsa/src/utils.js',import.meta.url),new URL('../node_modules/jwks-rsa/src/integrations/passport.js',import.meta.url)],source=(await Promise.all(files.map(file=>readFile(file,'utf8')))).join('\n');assert.doesNotMatch(source,/require\(['"]jose['"]\)/);assert.match(source,/PI_JWKS_ESM_INTEROP_PATCH_v1/);assert.match(source,/PI_JWKS_PASSPORT_ESM_INTEROP_PATCH_v1/);
});
