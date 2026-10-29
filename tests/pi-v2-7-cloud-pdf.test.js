import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFirebaseSessionService} from '../src/auth/firebase-session.js';
import {createNetlifyAuthenticatedApi,durableWorkspaceSubject} from '../src/auth/netlify-auth.js';

const project='pi-v2-7-test',organizationId='property-intelligence-local',uid='admin-v2-7',clock=new Date('2026-10-19T20:00:00.000Z');
const decoded={uid,aud:project,iss:`https://securetoken.google.com/${project}`,role:'Administrator',piOrganizationId:organizationId,piProviderResearch:true,email_verified:true,auth_time:Math.floor(clock.getTime()/1000),iat:Math.floor(clock.getTime()/1000),exp:Math.floor(clock.getTime()/1000)+3600};
const authentication=createFirebaseSessionService({adminAuth:{verifyIdToken:async()=>decoded,createSessionCookie:async()=>'session-cookie',verifySessionCookie:async()=>({...decoded,iss:`https://session.firebase.google.com/${project}`})},expectedProjectId:project,initialAdministratorUid:uid,expectedOrganizationId:organizationId,publicConfig:{apiKey:'public',authDomain:`${project}.firebaseapp.com`,projectId:project,appId:'test'},secureCookies:true,clock:()=>clock,csrfBytes:()=>Buffer.alloc(24,7)});
const fallback=async()=>new Response(JSON.stringify({error:'NOT_FOUND'}),{status:404,headers:{'Content-Type':'application/json'}});
const scenario=JSON.parse(await readFile(new URL('../data/runtime/investment-workspace-v1/scenarios/6f7b1d62-0e91-4da1-9e31-250101000101.r1.json',import.meta.url),'utf8'));
const property={id:'52638a00-8167-4cff-85c0-f56a0445a5a9',organizationId,address:'400 Decatur St, Bakersfield, CA 93308',addressComponents:{street:'400 Decatur St',city:'Bakersfield',state:'CA',zip:'93308'},sourceSubjectRef:scenario.propertyRef,evidenceSnapshotIds:[scenario.evidenceFingerprint],lifecycleStatus:'SAVED_PROPERTY',propertyType:'Single Family'};
const selectedIds=[...new Set(scenario.evidenceAttachments.map(item=>item.documentId))],authorizedIds=['6f7b1d62-0e91-4da1-9e31-250101000001','6f7b1d62-0e91-4da1-9e31-250101000002','6f7b1d62-0e91-4da1-9e31-250101000003'];

async function session(handler){
  const config=await handler(new Request('https://pi.example/api/auth/config')),csrf=(await config.json()).csrfToken,csrfCookie=config.headers.get('set-cookie').split(';')[0],login=await handler(new Request('https://pi.example/api/auth/session',{method:'POST',headers:{Origin:'https://pi.example','Content-Type':'application/json','X-PI-CSRF':csrf,Cookie:csrfCookie},body:JSON.stringify({idToken:'token'})})),sessionCookie=login.headers.get('set-cookie').split(';')[0];
  return {csrf,cookie:`${csrfCookie}; ${sessionCookie}`};
}

function fixture(renderer){
  const calls=[],documents=authorizedIds.map((id,index)=>({id,propertyId:property.id,documentType:['RECORDED_MORTGAGE','PAYOFF_STATEMENT','REHABILITATION_ESTIMATE'][index],description:`Synthetic QA ${index+1}`,source:'Synthetic QA fixture',sourceDate:'2026-10-19',reviewStatus:'REVIEWED',confidentiality:'STANDARD',redistributionPermission:'APPROVED',appendixSelected:true,currentVersion:1,versionCount:1,eligibilityConsistent:true,currentVersionMetadata:{version:1,filename:`synthetic-${index+1}.pdf`,mimeType:'application/pdf',sizeBytes:100,pageCount:1,uploadedAt:'2026-10-19T00:00:00.000Z',scanStatus:'CLEAN'}})),appendices=documents.map((document,index)=>({index:index+1,document,version:{...document.currentVersionMetadata,sha256:`hash-${index+1}`},bytes:Buffer.from(`pdf-${index+1}`),claims:scenario.evidenceAttachments.filter(item=>item.documentId===document.id).map(item=>({fieldKey:item.fieldKey,fieldLabel:item.fieldLabel}))}));
  const retainedProperty={...durableWorkspaceSubject(property),attributes:{propertyType:'Single Family',bedrooms:3,bathrooms:1,squareFootage:824},avm:{price:200000,low:180000,high:220000},sales:Object.keys(scenario.compReviews??{}).map(evidenceRef=>({evidenceRef,address:'Retained comparable',salePrice:150000})),listings:[],saleSearch:{retrievedAt:'2026-10-18T00:00:00.000Z',returned:11,eligible:11},findings:[]},retainedRecord={subjectRef:scenario.propertyRef,evidenceFingerprint:scenario.evidenceFingerprint,payload:{property:retainedProperty,propertyDetail:null}};
  const durable={async list({user}){assert.equal(user.organizationId,organizationId);return [property];},async scenarioRevisions({user,id}){assert.equal(user.organizationId,organizationId);assert.equal(id,property.id);return [{scenario}];},async linkReport(input){calls.push(['report',input.kind,input.status,input.supportingDocuments.map(item=>item.documentId)]);return {id:'report'};}},retained={async find({subjectRef,evidenceFingerprint}){return subjectRef===scenario.propertyRef&&evidenceFingerprint===scenario.evidenceFingerprint?retainedRecord:null;},async bootstrap(){return {properties:[retainedProperty],propertyDetails:[],records:[retainedRecord]};}},documentService={async list({user,propertyId}){assert.equal(user.organizationId,organizationId);assert.equal(propertyId,property.id);return documents;},async completeness(){return [];},async reportDocuments({user,propertyId,references}){assert.equal(user.organizationId,organizationId);assert.equal(propertyId,property.id);assert.deepEqual([...new Set(references.map(item=>item.documentId))],selectedIds);calls.push(['documents',references.length]);return appendices;}};
  return {calls,handler:createNetlifyAuthenticatedApi({api:fallback,authentication,durableProperties:async()=>durable,retainedEvidence:async()=>retained,documentMetadata:async()=>documentService,pdfRenderer:renderer})};
}

test('authenticated cloud export previews and generates exact saved synthetic revision with three appendices',async()=>{
  assert.deepEqual(selectedIds,authorizedIds);
  let rendered;
  const {handler,calls}=fixture(async(html,options)=>{rendered={html,options};return {bytes:Buffer.from('%PDF-v2.7'),totalPages:22,appendixPages:9};}),{csrf,cookie}=await session(handler),headers={Origin:'https://pi.example','Content-Type':'application/json','X-PI-Workspace':'local-v1',Cookie:cookie};
  const preview=await handler(new Request('https://pi.example/api/investment/report',{method:'POST',headers,body:JSON.stringify({id:scenario.id,revision:scenario.revision,kind:'full'})})),previewBody=await preview.json();
  assert.equal(preview.status,200,JSON.stringify(previewBody));assert.equal(previewBody.pdfAvailable,true);assert.equal(previewBody.classification,'SYNTHETIC_QA');assert.match(previewBody.html,/PI_FULL_PACKAGE_COVER_START/);assert.match(previewBody.html,/SYNTHETIC QA \/ NOT FOR INVESTOR DISTRIBUTION/);
  const noCsrf=await handler(new Request('https://pi.example/api/investment/report',{method:'POST',headers,body:JSON.stringify({id:scenario.id,revision:scenario.revision,kind:'full',pdf:true})}));assert.equal(noCsrf.status,403);
  const pdf=await handler(new Request('https://pi.example/api/investment/report',{method:'POST',headers:{...headers,'X-PI-CSRF':csrf},body:JSON.stringify({id:scenario.id,revision:scenario.revision,kind:'full',pdf:true,requestId:'request-v2-7-0001'})}));
  assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.equal(pdf.headers.get('cache-control'),'private, no-store, max-age=0');assert.equal(pdf.headers.get('x-pi-report-pages'),'22');assert.equal(Buffer.from(await pdf.arrayBuffer()).toString(),'%PDF-v2.7');assert.equal(rendered.options.appendices.length,3);assert.equal(rendered.options.qaNotForDistribution,true);assert.match(rendered.html,/PI_FULL_PACKAGE_COVER_START/);assert.deepEqual(calls,[['documents',scenario.evidenceAttachments.length],['report','full','QA_NOT_FOR_DISTRIBUTION',authorizedIds]]);
});

test('Opportunity Brief cloud PDF has no cover or embedded appendices',async()=>{
  let rendered;
  const {handler}=fixture(async(html,options)=>{rendered={html,options};return {bytes:Buffer.from('%PDF-brief'),totalPages:3,appendixPages:0};}),{csrf,cookie}=await session(handler),response=await handler(new Request('https://pi.example/api/investment/report',{method:'POST',headers:{Origin:'https://pi.example','Content-Type':'application/json','X-PI-Workspace':'local-v1','X-PI-CSRF':csrf,Cookie:cookie},body:JSON.stringify({id:scenario.id,revision:scenario.revision,kind:'brief',pdf:true,requestId:'request-v2-7-brief'})}));
  assert.equal(response.status,200);assert.doesNotMatch(rendered.html,/PI_FULL_PACKAGE_COVER_START/);assert.equal(rendered.options.appendices.length,0);assert.equal(response.headers.get('x-pi-appendix-pages'),'0');
});

test('cloud PDF export fails closed on timeout and rejects unauthenticated requests',async()=>{
  const timeout=Object.assign(new Error('PDF_RENDER_TIMEOUT'),{code:'PDF_RENDER_TIMEOUT',status:504}),{handler}=fixture(async()=>{throw timeout;}),{csrf,cookie}=await session(handler),body=JSON.stringify({id:scenario.id,revision:scenario.revision,kind:'brief',pdf:true,requestId:'request-v2-7-timeout'}),headers={Origin:'https://pi.example','Content-Type':'application/json','X-PI-Workspace':'local-v1','X-PI-CSRF':csrf,Cookie:cookie};
  const unauthorized=await handler(new Request('https://pi.example/api/investment/report',{method:'POST',headers:{Origin:'https://pi.example','Content-Type':'application/json','X-PI-Workspace':'local-v1'},body}));assert.equal(unauthorized.status,401);
  const response=await handler(new Request('https://pi.example/api/investment/report',{method:'POST',headers,body}));assert.equal(response.status,504);assert.equal((await response.json()).error,'PDF_RENDER_TIMEOUT');
});

test('cloud renderer serializes concurrent PDF work in one warm function instance',async()=>{
  let release,started;const running=new Promise(resolve=>{release=resolve;}),entered=new Promise(resolve=>{started=resolve;});
  const {handler}=fixture(async()=>{started();await running;return {bytes:Buffer.from('%PDF-one'),totalPages:1,appendixPages:0};}),{csrf,cookie}=await session(handler),headers={Origin:'https://pi.example','Content-Type':'application/json','X-PI-Workspace':'local-v1','X-PI-CSRF':csrf,Cookie:cookie},request=requestId=>new Request('https://pi.example/api/investment/report',{method:'POST',headers,body:JSON.stringify({id:scenario.id,revision:scenario.revision,kind:'brief',pdf:true,requestId})});
  const first=handler(request('request-v2-7-first'));await entered;const second=await handler(request('request-v2-7-second'));assert.equal(second.status,409);assert.equal((await second.json()).error,'PDF_RENDER_IN_PROGRESS');release();assert.equal((await first).status,200);
});

test('production function is isolated, bounded and UI exposes the three-step report workflow',async()=>{
  const [entry,config,ui]=await Promise.all([readFile(new URL('../netlify/functions/report.js',import.meta.url),'utf8'),readFile(new URL('../netlify.toml',import.meta.url),'utf8'),readFile(new URL('../apps/web/src/features/investment-workspace/Workspace.jsx',import.meta.url),'utf8')]);
  const compactUi=ui.replace(/\s+/g,'');
  assert.match(entry,/renderNetlifyWorkspacePdf/);assert.match(entry,/rateLimit/);assert.doesNotMatch(entry,/memory:/);assert.match(config,/from = "\/api\/investment\/report\/pdf"[\s\S]*functions\/report/);assert.match(compactUi,/deployed\?["']\/report\/pdf["']:["']\/report["']/);for(const label of ['Preview Report','Generate PDF','Download PDF'])assert.match(ui,new RegExp(label));assert.doesNotMatch(ui,/PDF export remains disabled/);
});
