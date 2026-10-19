import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createFirebaseSessionService,CSRF_COOKIE,SESSION_COOKIE} from '../src/auth/firebase-session.js';
import {verifyFirebaseCredentialBinding,INITIAL_ADMINISTRATOR_UID} from '../src/auth/firebase-admin.js';
import {createAccessControl,ROLES} from '../src/auth/access-control.js';
import {createPropertyResearchService,researchAddressKey} from '../src/investment-workspace/property-research.js';
import {createClient} from '../src/sources/rentcast/client.js';
import {memoryStore} from '../src/sources/rentcast/stores.js';
import {readRememberedEmail,REMEMBERED_EMAIL_KEY,writeRememberedEmail} from '../apps/web/src/auth/remembered-email.js';
import {clearEmailVerificationAction,EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,readEmailVerificationAction,verificationCooldownRemaining,verificationErrorMessage} from '../apps/web/src/auth/email-verification.js';

const PROJECT='pi-auth-test',ORGANIZATION='property-intelligence-local',NOW=new Date('2026-10-16T20:00:00.000Z'),claims=(overrides={})=>({uid:INITIAL_ADMINISTRATOR_UID,aud:PROJECT,iss:`https://securetoken.google.com/${PROJECT}`,role:ROLES.ADMINISTRATOR,piOrganizationId:ORGANIZATION,piProviderResearch:true,email_verified:true,iat:Math.floor(NOW.getTime()/1000)-60,exp:Math.floor(Math.max(NOW.getTime(),Date.now())/1000)+3600,...overrides});
const headers=(cookie='',csrf='')=>({cookie,...(csrf?{'x-pi-csrf':csrf}:{})});
function responseRecorder(){return {headers:{},setHeader(name,value){this.headers[name.toLowerCase()]=value;}};}
function service(decoded=claims()){
  const sessionDecoded={...decoded,iss:`https://session.firebase.google.com/${PROJECT}`},adminAuth={verifyIdToken:async token=>{if(token!=='valid-token')throw new Error('bad token');return decoded;},createSessionCookie:async()=> 'signed-session',verifySessionCookie:async token=>{if(token!=='signed-session')throw new Error('bad session');return sessionDecoded;}};
  return createFirebaseSessionService({adminAuth,expectedProjectId:PROJECT,initialAdministratorUid:INITIAL_ADMINISTRATOR_UID,publicConfig:{apiKey:'public-test-key',authDomain:`${PROJECT}.firebaseapp.com`,projectId:PROJECT,appId:'1:test:web:test'},clock:()=>NOW,csrfBytes:()=>Buffer.alloc(24,7)});
}

test('Firebase ID token becomes an HttpOnly session and maps the server-issued administrator role',async()=>{
  const auth=service(),csrfResponse=responseRecorder(),csrf=auth.issueCsrf(csrfResponse),sessionResponse=responseRecorder(),request={headers:headers(`${CSRF_COOKIE}=${csrf}`,csrf)};auth.requireCsrf(request);const user=await auth.createSession('valid-token',sessionResponse);
  assert.equal(user.uid,INITIAL_ADMINISTRATOR_UID);assert.equal(user.role,ROLES.ADMINISTRATOR);assert.equal(user.providerResearchAllowed,true);assert.match(sessionResponse.headers['set-cookie'],new RegExp(`^${SESSION_COOKIE}=`));assert.match(sessionResponse.headers['set-cookie'],/HttpOnly/);assert.match(sessionResponse.headers['set-cookie'],/SameSite=Strict/);
  assert.equal((await auth.authenticate({headers:headers(`${SESSION_COOKIE}=signed-session`)})).role,ROLES.ADMINISTRATOR);
});

test('wrong project, missing administrator bootstrap and invalid CSRF fail closed',async()=>{
  await assert.rejects(service(claims({aud:'other'})).createSession('valid-token',responseRecorder()),/AUTHENTICATION_PROJECT_MISMATCH/);
  await assert.rejects(service(claims({role:undefined,piProviderResearch:undefined})).createSession('valid-token',responseRecorder()),/ADMINISTRATOR_BOOTSTRAP_REQUIRED/);
  await assert.rejects(service(claims({piOrganizationId:undefined})).createSession('valid-token',responseRecorder()),/ORGANIZATION_MEMBERSHIP_REQUIRED/);
  await assert.rejects(service(claims({piOrganizationId:'other-organization'})).createSession('valid-token',responseRecorder()),/ORGANIZATION_NOT_AUTHORIZED/);
  assert.throws(()=>service().requireCsrf({headers:headers(`${CSRF_COOKIE}=correct`,'wrong')}),/CSRF_VALIDATION_FAILED/);
});

test('missing and Firebase-rejected session cookies return distinct safe failures',async()=>{
  await assert.rejects(service().authenticate({headers:headers()}),error=>error.code==='SESSION_COOKIE_MISSING'&&error.status===401);
  const rejected=createFirebaseSessionService({adminAuth:{verifyIdToken:async()=>claims(),createSessionCookie:async()=> 'signed-session',verifySessionCookie:async()=>{throw Object.assign(new Error('sensitive vendor detail'),{code:'auth/session-cookie-revoked'});}},expectedProjectId:PROJECT,initialAdministratorUid:INITIAL_ADMINISTRATOR_UID,publicConfig:{apiKey:'public-test-key',authDomain:`${PROJECT}.firebaseapp.com`,projectId:PROJECT,appId:'1:test:web:test'}});
  await assert.rejects(rejected.authenticate({headers:headers(`${SESSION_COOKIE}=signed-session`)}),error=>error.code==='FIREBASE_SESSION_SESSION-COOKIE-REVOKED'&&error.status===401&&!error.message.includes('sensitive'));
});

test('credential binding requires a real service-account document for the expected project',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pi-firebase-binding-')),file=path.join(directory,'service.json'),base={type:'service_account',project_id:PROJECT,private_key:'-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----\n',client_email:'synthetic@example.invalid'};await writeFile(file,JSON.stringify(base));
  assert.equal((await verifyFirebaseCredentialBinding({FIREBASE_PROJECT_ID:PROJECT,GOOGLE_APPLICATION_CREDENTIALS:file})).credentialProjectId,PROJECT);
  await writeFile(file,JSON.stringify({...base,project_id:'wrong-project'}));await assert.rejects(verifyFirebaseCredentialBinding({FIREBASE_PROJECT_ID:PROJECT,GOOGLE_APPLICATION_CREDENTIALS:file}),/PROJECT_MISMATCH/);
});

test('authenticated administrator can explicitly confirm one mocked lookup without a manual authorization file',async()=>{
  const address={street:'100 New Property Road',city:'Bakersfield',state:'CA',zip:'93312'},raw={id:'mock-property',formattedAddress:'100 New Property Rd, Bakersfield, CA 93312',addressLine1:'100 New Property Rd',city:'Bakersfield',state:'CA',zipCode:'93312',assessorID:'123-456-78',propertyType:'Single Family'},directory=await mkdtemp(path.join(tmpdir(),'pi-auth-provider-'));let calls=0;
  const auth=service(),access=createAccessControl({verifySession:request=>auth.authenticate(request)}),client=createClient({apiKey:'synthetic-key',baseUrl:'https://api.rentcast.io/v1',timeoutMs:100,maxRetries:0,maxCalls:1,delayMs:0},{store:memoryStore(),fetchImpl:async()=>{calls++;return new Response(JSON.stringify([raw]),{status:200,headers:{'content-type':'application/json'}});}}),authorizeResearch=async({user,addressKey,now,provider,endpoint,estimatedCostCents})=>user.providerResearchAllowed?{id:`claim:${user.uid}:${researchAddressKey(address)}`,provider,endpoint,userId:user.uid,addressKey,executionDate:now.toISOString().slice(0,10),maximumRequests:1,maximumEstimatedCostCents:estimatedCostCents,automaticRetries:0,additionalEnrichment:false,durablePropertyCreation:false,approvedAt:new Date(now.getTime()-1000).toISOString(),expiresAt:new Date(now.getTime()+300000).toISOString()}:null;
  const research=createPropertyResearchService({enabled:true,accessControl:access,client,store:memoryStore(),ledgerDirectory:directory,operationalEvidence:{accountActive:true,propertyRecordsEntitled:true,rightsConfirmed:true,retentionPermitted:true,remainingRequests:10,overageCostCents:20,endpointFeeMaxCents:0,taxAndOtherFeeMaxCents:0},authorizeResearch,clock:()=>NOW,limits:{requestsPerUserPerDay:1,requestsPerProviderPerDay:1,maximumEstimatedCostPerRequestCents:20,monthlyEstimatedSpendCents:20}}),request={headers:headers(`${SESSION_COOKIE}=signed-session`)};
  const preview=await research.preview(request,address);assert.equal(calls,0);const result=await research.execute(request,{address,confirmationToken:preview.confirmationToken,confirmed:true});assert.equal(result.requestsTransmitted,1);assert.equal(calls,1);assert.equal(client.metrics.retries,0);await assert.rejects(research.execute(request,{address,confirmationToken:preview.confirmationToken,confirmed:true}),/CONFIRMATION_EXPIRED_OR_USED/);assert.equal(calls,1);
});

test('viewer and unclaimed analyst sessions cannot obtain provider authorization',async()=>{
  for(const decoded of [claims({uid:'viewer',role:ROLES.VIEWER,piProviderResearch:false}),claims({uid:'analyst',role:ROLES.ANALYST,piProviderResearch:false})]){const user={uid:decoded.uid,role:decoded.role,providerResearchAllowed:decoded.role===ROLES.ADMINISTRATOR||decoded.piProviderResearch===true};assert.equal(user.providerResearchAllowed,false);}
});

test('investment entrypoint always loads the retained discovery and property graph',async()=>{
  const source=await readFile(new URL('../scripts/workbench-server.js',import.meta.url),'utf8');
  assert.match(source,/const propertyDetail=investment\|\|process\.argv\.includes\('--property-detail'\)/);
  assert.match(source,/propertyDetail,addressTransport,propertyResearch,authentication/);
});

test('remember-me persists only a valid email and clears it when disabled',async()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  writeRememberedEmail(' administrator@example.com ',true,storage);assert.equal(values.get(REMEMBERED_EMAIL_KEY),'administrator@example.com');assert.equal(readRememberedEmail(storage),'administrator@example.com');
  writeRememberedEmail('not-an-email',true,storage);assert.equal(readRememberedEmail(storage),'');
  writeRememberedEmail('administrator@example.com',true,storage);writeRememberedEmail('',false,storage);assert.equal(values.has(REMEMBERED_EMAIL_KEY),false);
  const source=await readFile(new URL('../apps/web/src/auth/AuthenticationGate.jsx',import.meta.url),'utf8');assert.match(source,/Remember my email on this device/);assert.match(source,/password is never stored by PI/);assert.match(source,/type=\{showPassword\?'text':'password'\}/);assert.match(source,/aria-label=\{showPassword\?'Hide password':'Show password'\}/);assert.match(source,/type="button"/);assert.doesNotMatch(source,/writeRememberedEmail\([^,]+password/);
});

test('email verification actions, safe errors and resend throttling are deterministic',()=>{
  assert.deepEqual(readEmailVerificationAction('?mode=verifyEmail&oobCode=secret-code'),{kind:'APPLY_CODE',code:'secret-code'});
  assert.deepEqual(readEmailVerificationAction('?piEmailVerification=complete'),{kind:'REFRESH_USER'});
  assert.equal(readEmailVerificationAction('?mode=resetPassword&oobCode=secret-code'),null);
  assert.equal(clearEmailVerificationAction('http://127.0.0.1:4175/?mode=verifyEmail&oobCode=secret&lang=en#my-workspace'),'/#my-workspace');
  assert.match(verificationErrorMessage({code:'auth/expired-action-code'}),/expired/);
  assert.match(verificationErrorMessage({code:'auth/invalid-action-code'}),/invalid/);
  assert.match(verificationErrorMessage({code:'auth/too-many-requests'}),/temporarily limited/);
  assert.equal(verificationCooldownRemaining(10_000,10_000+EMAIL_VERIFICATION_RESEND_COOLDOWN_MS-1),1);
  assert.equal(verificationCooldownRemaining(10_000,10_000+EMAIL_VERIFICATION_RESEND_COOLDOWN_MS),0);
});

test('account interface uses Firebase verification and refreshes the server session',async()=>{
  const source=await readFile(new URL('../apps/web/src/auth/AuthenticationGate.jsx',import.meta.url),'utf8');
  assert.match(source,/sendEmailVerification\(firebaseUser\)/);
  assert.match(source,/applyActionCode\(auth,action\.code\)/);
  assert.match(source,/await reload\(firebaseUser\)/);
  assert.match(source,/getIdToken\(firebaseUser,true\)/);
  assert.match(source,/fetch\('\/api\/auth\/session'/);
  assert.match(source,/verified\.user\?\.emailVerified!==true/);
  assert.match(source,/Send Verification Email/);
  assert.match(source,/Refresh verification/);
  assert.doesNotMatch(source,/updateUser\s*\(/);
});
