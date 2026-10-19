import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFirebaseSessionService,CSRF_COOKIE,SESSION_COOKIE} from '../src/auth/firebase-session.js';
import {createNetlifyAuthenticatedApi,durableWorkspaceReport} from '../src/auth/netlify-auth.js';
import {durableWorkspaceDocument} from '../src/auth/firebase-admin.js';

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

test('authenticated Netlify workspace restores organization-scoped Firestore properties and revisions',async()=>{
  const property={id:'property-one',organizationId:organization,address:'400 Decatur St, Bakersfield, CA 93308',lifecycleStatus:'SAVED_PROPERTY'},revision={scenarioId:'scenario-one',revision:1,scenario:{name:'Scenario 1'}},report={id:'report-one',kind:'full'},calls=[];
  const durableService={
    async list(input){calls.push(['list',input.user.organizationId,input.includeArchived]);return [property];},
    async get(input){calls.push(['get',input.user.organizationId,input.id]);return property;},
    async scenarioRevisions(input){calls.push(['scenarios',input.user.organizationId,input.id]);return [revision];},
    async reports(input){calls.push(['reports',input.user.organizationId,input.id]);return [report];},
    async setArchived(input){calls.push(['archive',input.user.organizationId,input.id,input.archived]);return {...property,lifecycleStatus:input.archived?'ARCHIVED_PROPERTY':'SAVED_PROPERTY'};}
  },documentService={async list(input){calls.push(['documents',input.user.organizationId,input.propertyId]);return {documents:[{id:'document-one'}],completeness:[]};}},cloud=createNetlifyAuthenticatedApi({api,authentication,durableProperties:async()=>durableService,documentMetadata:async()=>documentService});
  const config=await cloud(new Request('https://pi.example/api/auth/config')),csrf=(await config.json()).csrfToken,csrfCookie=config.headers.get('set-cookie').split(';')[0],login=await cloud(new Request('https://pi.example/api/auth/session',{method:'POST',headers:{Origin:'https://pi.example','Content-Type':'application/json','X-PI-CSRF':csrf,Cookie:csrfCookie},body:JSON.stringify({idToken:'id-token'})})),sessionCookie=login.headers.get('set-cookie').split(';')[0],cookie=`${csrfCookie}; ${sessionCookie}`;
  const list=await cloud(new Request('https://pi.example/api/durable-properties?includeArchived=true',{headers:{Cookie:cookie}})),listed=await list.json();assert.equal(list.status,200);assert.equal(listed.properties[0].address,property.address);
  const workspace=await cloud(new Request('https://pi.example/api/durable-properties/property-one/workspace',{headers:{Cookie:cookie}})),restored=await workspace.json();assert.equal(workspace.status,200);assert.equal(restored.revisions[0].scenarioId,'scenario-one');assert.equal(restored.reports[0].id,'report-one');assert.equal(restored.documents[0].id,'document-one');
  const denied=await cloud(new Request('https://pi.example/api/durable-properties/property-one/archive',{method:'POST',headers:{Origin:'https://pi.example','Content-Type':'application/json',Cookie:cookie},body:'{}'}));assert.equal(denied.status,403);
  const archived=await cloud(new Request('https://pi.example/api/durable-properties/property-one/archive',{method:'POST',headers:{Origin:'https://pi.example','Content-Type':'application/json','X-PI-CSRF':csrf,Cookie:cookie},body:'{}'}));assert.equal(archived.status,200);assert.equal((await archived.json()).property.lifecycleStatus,'ARCHIVED_PROPERTY');
  assert.ok(calls.every(call=>call[1]===organization));assert.deepEqual(calls.map(call=>call[0]),['list','get','scenarios','reports','documents','archive']);
});

test('Firebase Admin dependency bridge loads jose through ESM in the Netlify bundle',async()=>{
  const files=[new URL('../node_modules/jwks-rsa/src/utils.js',import.meta.url),new URL('../node_modules/jwks-rsa/src/integrations/passport.js',import.meta.url)],source=(await Promise.all(files.map(file=>readFile(file,'utf8')))).join('\n');assert.doesNotMatch(source,/require\(['"]jose['"]\)/);assert.match(source,/PI_JWKS_ESM_INTEROP_PATCH_v1/);assert.match(source,/PI_JWKS_PASSPORT_ESM_INTEROP_PATCH_v1/);
});

test('deployed durable workspace stays behind server APIs and hides private document internals',async()=>{
  const source=await readFile(new URL('../apps/web/src/features/durable-workspace/CloudPropertyWorkspace.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/firebase\/firestore|getFirestore|storageKey|sha256/i);assert.match(source,/\/api\/durable-properties/);assert.match(source,/Saved Property is a lifecycle status, not legal verification/);assert.match(source,/Opening this view does not recalculate or change underwriting or Monte Carlo results/);
  const sanitized=durableWorkspaceDocument({id:'document-one',propertyId:'property-one',currentVersion:1,currentVersionMetadata:{version:1,filename:'evidence.pdf',mimeType:'application/pdf',sizeBytes:10,pageCount:1,uploadedAt:'2026-10-19T00:00:00.000Z',scanStatus:'CLEAN',sha256:'secret-hash',storageKey:'private/path'}});
  assert.equal(sanitized.currentVersionMetadata.filename,'evidence.pdf');assert.doesNotMatch(JSON.stringify(sanitized),/secret-hash|private\/path|sha256|storageKey/);
  const report=durableWorkspaceReport({id:'report-one',scenarioId:'scenario-one',revision:1,kind:'full',status:'generated',generatedAt:'2026-10-19T00:00:00.000Z',supportingDocuments:[{documentId:'internal-document',sha256:'secret-hash',storageKey:'private/path'}]});
  assert.equal(report.supportingDocumentCount,1);assert.doesNotMatch(JSON.stringify(report),/secret-hash|private\/path|sha256|storageKey|internal-document/);
});
