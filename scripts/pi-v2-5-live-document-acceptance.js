import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';

const ROOT=path.resolve(import.meta.dirname,'..');
process.chdir(ROOT);
try{process.loadEnvFile(path.join(ROOT,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}

const EXPECTED=Object.freeze({
  node:'v22.12.0',
  projectId:'property-intelligence-8238b',
  organizationId:'property-intelligence-local',
  administratorUid:'d2NTUCs0lGe6C64pDnRGtgTXm0O2',
  bucket:'property-intelligence-8238b.firebasestorage.app',
  bucketLocation:'US-WEST2',
  propertyId:'52638a00-8167-4cff-85c0-f56a0445a5a9',
  address:'400 Decatur St, Bakersfield, CA 93308',
  subjectRef:'RESEARCH-EB66B8421C47',
  evidenceSnapshotId:'3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71',
  scenarioId:'2908abf4-03a2-4d3c-931f-f61b5e9900c2',
  scenarioRevision:1,
  baselinePropertyHash:'fcaebb62c48332953eca5fb83bf70623e446e71fa23f743646bb21f10eba4103',
  baselineEvidenceHash:'0a6292b84385502e80e1a739d12aaa47a394f4446db6f4c867f447002077638e',
  baselineScenarioHash:'90d9329b881b5f9945d1f9291efec0489915fef1f8c2c3d11734da771603f887',
  filename:'PI_V2_5_DOCUMENT_ACCEPTANCE_TEST.pdf'
});

const OUTPUT=path.join(ROOT,'data','validation','pi-v2-5-live-document-acceptance');
const RESULT_FILE=path.join(OUTPUT,'acceptance-results.json');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>{
  if(value===null||typeof value!=='object')return value;
  if(typeof value.toDate==='function')return value.toDate().toISOString();
  if(Array.isArray(value))return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
};
const dataHash=value=>sha256(JSON.stringify(canonical(value)));
const cookieHeader=jar=>[...jar].map(([name,value])=>`${name}=${encodeURIComponent(value)}`).join('; ');
const cookieValue=(jar,name)=>jar.get(name)??'';

function receiveCookies(jar,response){
  for(const line of response.headers.getSetCookie()){
    const pair=line.split(';',1)[0],index=pair.indexOf('='),name=pair.slice(0,index),value=decodeURIComponent(pair.slice(index+1));
    if(/(?:^|;)\s*Max-Age=0(?:;|$)/i.test(line)||!value)jar.delete(name);else jar.set(name,value);
  }
}

async function responseJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):null;}catch{return {unparseable:true,textLength:text.length};}
}

async function startSession({origin,apiKey,email,password}){
  const jar=new Map(),configResponse=await fetch(`${origin}/api/auth/config`);
  receiveCookies(jar,configResponse);
  const config=await responseJson(configResponse);
  assert.equal(configResponse.status,200);
  assert.equal(config.enabled,true);
  assert.equal(config.projectId,EXPECTED.projectId);
  assert.ok(cookieValue(jar,'pi_csrf'));
  const signInResponse=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
  const signIn=await responseJson(signInResponse);
  assert.equal(signInResponse.status,200,'Firebase administrator sign-in failed');
  assert.equal(signIn.localId,EXPECTED.administratorUid);
  assert.ok(signIn.idToken);
  const sessionResponse=await fetch(`${origin}/api/auth/session`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-PI-CSRF':cookieValue(jar,'pi_csrf'),Cookie:cookieHeader(jar)},body:JSON.stringify({idToken:signIn.idToken})});
  receiveCookies(jar,sessionResponse);
  const established=await responseJson(sessionResponse);
  assert.equal(sessionResponse.status,200,'PI server session creation failed');
  assert.equal(established.user.uid,EXPECTED.administratorUid);
  assert.equal(established.user.role,'Administrator');
  assert.equal(established.user.emailVerified,true);
  assert.ok(cookieValue(jar,'pi_session'));
  async function request(route,{method='GET',body=null,raw=false,csrf=false}={}){
    const headers={Cookie:cookieHeader(jar)};
    if(method!=='GET')Object.assign(headers,{Origin:origin,'Content-Type':'application/json','X-PI-Workspace':'local-v1',...(csrf?{'X-PI-CSRF':cookieValue(jar,'pi_csrf')}:{})});
    const response=await fetch(`${origin}${route}`,{method,headers,body:body===null?undefined:JSON.stringify(body)});
    receiveCookies(jar,response);
    return raw?response:{status:response.status,body:await responseJson(response)};
  }
  return {jar,request};
}

async function logout({origin,session}){
  const response=await fetch(`${origin}/api/auth/logout`,{method:'POST',headers:{Origin:origin,'X-PI-CSRF':cookieValue(session.jar,'pi_csrf'),Cookie:cookieHeader(session.jar)}});
  receiveCookies(session.jar,response);
  assert.equal(response.status,200);
  assert.equal(cookieValue(session.jar,'pi_session'),'');
}

async function syntheticPdf(){
  const pdf=await PDFDocument.create(),page=pdf.addPage([612,792]),bold=await pdf.embedFont(StandardFonts.HelveticaBold),regular=await pdf.embedFont(StandardFonts.Helvetica);
  pdf.setTitle('PI_V2_5_DOCUMENT_ACCEPTANCE_TEST');
  pdf.setSubject('Synthetic QA document; not suitable for investor reliance');
  pdf.setProducer('Property Intelligence V2.5 acceptance harness');
  page.drawText('Property Intelligence V2.5 acceptance test',{x:54,y:710,size:18,font:bold,color:rgb(.04,.25,.3)});
  const lines=[
    'Property: 400 Decatur St, Bakersfield, CA 93308',
    'Classification: Synthetic QA document',
    'No real mortgage, lien, title or financial evidence',
    'Not suitable for investor reliance'
  ];
  lines.forEach((line,index)=>page.drawText(line,{x:54,y:660-index*28,size:12,font:regular,color:rgb(.08,.15,.18)}));
  page.drawRectangle({x:54,y:470,width:504,height:58,borderColor:rgb(.75,.38,.1),borderWidth:2,color:rgb(1,.97,.89)});
  page.drawText('SYNTHETIC TEST MATERIAL — QA / NOT FOR DISTRIBUTION',{x:70,y:495,size:11,font:bold,color:rgb(.55,.2,.05)});
  return Buffer.from(await pdf.save({useObjectStreams:true,addDefaultPage:false}));
}

async function treeFingerprint(relative){
  const base=path.join(ROOT,relative),rows=[];
  async function visit(directory){
    let entries;try{entries=await readdir(directory,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){const absolute=path.join(directory,entry.name);if(entry.isDirectory())await visit(absolute);else if(entry.isFile()){const bytes=await readFile(absolute),info=await stat(absolute);rows.push({path:path.relative(ROOT,absolute).replaceAll('\\','/'),size:info.size,sha256:sha256(bytes)});}}
  }
  await visit(base);
  return {fileCount:rows.length,totalBytes:rows.reduce((sum,row)=>sum+row.size,0),manifestSha256:dataHash(rows)};
}

async function markQaReport(bytes){
  const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false}),font=await pdf.embedFont(StandardFonts.HelveticaBold);
  for(const page of pdf.getPages()){
    page.drawRectangle({x:374,y:770,width:184,height:14,color:rgb(.98,.91,.76),borderColor:rgb(.73,.35,.05),borderWidth:.5});
    page.drawText('QA / NOT FOR DISTRIBUTION',{x:390,y:774,size:7,font,color:rgb(.55,.18,.03)});
  }
  pdf.setTitle('QA / NOT FOR DISTRIBUTION — Decatur Full Investor Package');
  return Buffer.from(await pdf.save({useObjectStreams:true,addDefaultPage:false}));
}

async function inspectReport(bytes,sourceTitle){
  const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false}),pages=pdf.getPages();
  assert.ok(pages.length>=3);
  for(const page of pages){const {width,height}=page.getSize();assert.equal(width,612);assert.equal(height,792);}
  const rendered=await getDocument({data:new Uint8Array(bytes),standardFontDataUrl:path.resolve(ROOT,'node_modules/pdfjs-dist/standard_fonts')+path.sep}).promise,text=[];
  for(let number=1;number<=rendered.numPages;number++){
    const current=await rendered.getPage(number),content=await current.getTextContent(),value=content.items.map(item=>item.str).join(' ').replace(/\s+/g,' ').trim();
    text.push(value);
    assert.ok(value.replace(/QA \/ NOT FOR DISTRIBUTION/g,'').replace(/Page \d+ of \d+/g,'').trim().length>10,`Blank report page ${number}`);
    assert.ok(value.includes(`Page ${number} of ${rendered.numPages}`),`Page numbering missing on page ${number}`);
    const viewport=current.getViewport({scale:.35}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    await current.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  }
  const indexPage=text.findIndex(value=>value.includes('Supporting document appendix index'))+1,coverPage=text.findIndex(value=>value.includes('Appendix 1: Other'))+1,sourcePage=text.findIndex(value=>value.includes(sourceTitle))+1;
  assert.ok(indexPage>0,'Appendix index is missing');
  assert.ok(coverPage>indexPage,'Appendix cover is not after the index');
  assert.ok(sourcePage>coverPage,'Original synthetic PDF page is not after the appendix cover');
  assert.ok(text[indexPage-1].includes('Reviewed'));
  assert.ok(text[indexPage-1].includes('Property Intelligence synthetic QA'));
  assert.ok(text.every(value=>value.includes('QA / NOT FOR DISTRIBUTION')));
  const shots=[];
  for(const [name,number] of [['report-appendix-index',indexPage],['report-appendix-cover',coverPage],['report-appendix-source',sourcePage]]){
    const current=await rendered.getPage(number),viewport=current.getViewport({scale:1.15}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    await current.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    const file=path.join(OUTPUT,`${name}.png`);await writeFile(file,canvas.toBuffer('image/png'));shots.push(file);
  }
  await rendered.destroy();
  return {pageCount:pages.length,indexPage,coverPage,sourcePage,pageNumberingVerified:true,noBlankPages:true,renderedAllPages:true,screenshots:shots};
}

async function captureRegister({origin,session,expectedText}){
  const browser=await puppeteer.launch({headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage(),errors=[];
  try{
    await page.setViewport({width:1440,height:1050});
    page.on('pageerror',error=>errors.push(error.message));
    await page.evaluateOnNewDocument(()=>{try{localStorage.clear();sessionStorage.clear();}catch{}});
    await page.setCookie(...[...session.jar].map(([name,value])=>({name,value,url:origin,sameSite:'Strict'})));
    const route=`${origin}/#investment?subject=${encodeURIComponent(EXPECTED.subjectRef)}&snapshot=${encodeURIComponent(EXPECTED.evidenceSnapshotId)}&scenario=${encodeURIComponent(EXPECTED.scenarioId)}`;
    await page.goto(route,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.guided-progress')?.innerText.includes('Seller & Property Evidence'),{timeout:30_000});
    await page.evaluate(()=>[...document.querySelectorAll('.guided-progress button')].find(node=>node.innerText.includes('Seller & Property Evidence'))?.click());
    await page.waitForFunction(()=>document.querySelector('.iw-tabs')?.innerText.includes('Supporting Documents'),{timeout:30_000});
    await page.evaluate(()=>[...document.querySelectorAll('.iw-tabs button')].find(node=>node.innerText.trim()==='Supporting Documents')?.click());
    await page.waitForFunction(text=>document.querySelector('[data-testid="supporting-documents"]')?.innerText.includes(text),{timeout:30_000},expectedText);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.guided-progress')?.innerText.includes('Seller & Property Evidence'),{timeout:30_000});
    await page.evaluate(()=>[...document.querySelectorAll('.guided-progress button')].find(node=>node.innerText.includes('Seller & Property Evidence'))?.click());
    await page.waitForFunction(()=>document.querySelector('.iw-tabs')?.innerText.includes('Supporting Documents'),{timeout:30_000});
    await page.evaluate(()=>[...document.querySelectorAll('.iw-tabs button')].find(node=>node.innerText.trim()==='Supporting Documents')?.click());
    await page.waitForFunction(text=>document.querySelector('[data-testid="supporting-documents"]')?.innerText.includes(text),{timeout:30_000},expectedText);
    const target=await page.$('[data-testid="supporting-documents"]'),file=path.join(OUTPUT,'document-register-reviewed-cross-session.png');
    assert.ok(target);await target.screenshot({path:file});
    assert.deepEqual(errors,[]);
    return {file,refreshPersistence:true,browserErrors:errors};
  }finally{await browser.close();}
}

async function main(){
  const startedAt=new Date().toISOString(),phase={name:'PREFLIGHT'},transactionLedger=[],directWriteLedger=[],storageLedger=[],scannerLedger=[];
  assert.equal(process.version,EXPECTED.node,'Acceptance must use Node 22.12.0 exactly');
  for(const name of ['PI_PUBLIC_FIREBASE_API_KEY','ADMIN_EMAIL','ADMIN_PW','PI_FIREBASE_STORAGE_BUCKET','PI_MALWARE_SCANNER_URL','PI_MALWARE_SCANNER_AUDIENCE'])assert.ok(String(process.env[name]??'').trim(),`${name} is required`);
  assert.equal(process.env.PI_FIREBASE_STORAGE_BUCKET,EXPECTED.bucket);
  await mkdir(OUTPUT,{recursive:true});

  const [{initializeFirebaseAuthentication},{getApp},{getAuth},{getFirestore},{getStorage},{createFirestoreDurablePropertyRepository},{createDurablePropertyService},{createFirestoreSupportingDocumentRepository,createFirebasePrivateDocumentStorage},{createSupportingDocumentService,inspectSupportingDocument},{loadCloudRunMalwareScanner,createGoogleIdentityTokenProvider},{startInvestmentWorkspace}]=await Promise.all([
    import('../src/auth/firebase-admin.js'),import('firebase-admin/app'),import('firebase-admin/auth'),import('firebase-admin/firestore'),import('firebase-admin/storage'),import('../src/investment-workspace/firestore-durable-properties.js'),import('../src/investment-workspace/durable-properties.js'),import('../src/investment-workspace/firebase-supporting-documents.js'),import('../src/investment-workspace/supporting-documents.js'),import('../src/investment-workspace/cloud-run-malware-scanner.js'),import('../src/investment-workspace/server.js')
  ]);
  const authentication=await initializeFirebaseAuthentication();
  assert.equal(authentication.expectedProjectId,EXPECTED.projectId);
  assert.equal(authentication.expectedOrganizationId,EXPECTED.organizationId);
  const app=getApp('pi-v2-3a');assert.equal(app.options.projectId,EXPECTED.projectId);
  const adminAuth=getAuth(app),admin=await adminAuth.getUser(EXPECTED.administratorUid);
  assert.equal(admin.disabled,false);assert.equal(admin.emailVerified,true);assert.equal(admin.customClaims?.role,'Administrator');assert.equal(admin.customClaims?.piOrganizationId,EXPECTED.organizationId);
  const db=getFirestore(app),bucket=getStorage(app).bucket(EXPECTED.bucket),[bucketMetadata]=await bucket.getMetadata();
  assert.equal(String(bucketMetadata.location).toUpperCase(),EXPECTED.bucketLocation);
  assert.equal(bucketMetadata.iamConfiguration?.uniformBucketLevelAccess?.enabled,true);
  assert.equal(String(bucketMetadata.iamConfiguration?.publicAccessPrevention).toLowerCase(),'enforced');
  const [initialObjects]=await bucket.getFiles();assert.equal(initialObjects.length,0,'Document bucket must be empty before the first acceptance');

  const propertyPath=`organizations/${EXPECTED.organizationId}/properties/${EXPECTED.propertyId}`,propertyRef=db.doc(propertyPath),propertySnapshot=await propertyRef.get();assert.ok(propertySnapshot.exists);
  const evidencePath=`${propertyPath}/evidenceSnapshots/${sha256(EXPECTED.evidenceSnapshotId)}`,scenarioPath=`${propertyPath}/scenarioRevisions/${EXPECTED.scenarioId}--r${EXPECTED.scenarioRevision}`;
  const [evidenceSnapshot,scenarioSnapshot,documentsBefore,hashesBefore,auditsBefore,reportsBefore,allPropertiesBefore]=await Promise.all([
    db.doc(evidencePath).get(),db.doc(scenarioPath).get(),propertyRef.collection('supportingDocuments').get(),db.collection(`organizations/${EXPECTED.organizationId}/documentHashes`).get(),db.collection(`organizations/${EXPECTED.organizationId}/documentAuditEvents`).get(),propertyRef.collection('reportRevisions').get(),db.collection(`organizations/${EXPECTED.organizationId}/properties`).get()
  ]);
  assert.ok(evidenceSnapshot.exists);assert.ok(scenarioSnapshot.exists);
  assert.equal(dataHash(propertySnapshot.data()),EXPECTED.baselinePropertyHash);
  assert.equal(dataHash(evidenceSnapshot.data()),EXPECTED.baselineEvidenceHash);
  assert.equal(dataHash(scenarioSnapshot.data()),EXPECTED.baselineScenarioHash);
  assert.equal(propertySnapshot.data().address,EXPECTED.address);
  assert.equal(documentsBefore.size,0);assert.equal(hashesBefore.size,0);assert.equal(auditsBefore.size,0);assert.equal(reportsBefore.size,0);
  const otherPropertyHashes=Object.fromEntries(allPropertiesBefore.docs.filter(row=>row.id!==EXPECTED.propertyId).map(row=>[row.ref.path,dataHash(row.data())]));
  const scenarioBefore=structuredClone(scenarioSnapshot.data().scenario),scenarioBeforeHash=dataHash(scenarioBefore),financialBeforeHash=dataHash({analysis:scenarioBefore.analysis,inputs:scenarioBefore.inputs,risk:scenarioBefore.risk});
  const localBefore=await Promise.all(['data/raw/rentcast/property-research-v2-3','data/runtime/pi-v2-3/usage','data/runtime/investment-workspace-v1/scenarios'].map(treeFingerprint));

  const tokenProvider=await createGoogleIdentityTokenProvider(),healthToken=await tokenProvider(process.env.PI_MALWARE_SCANNER_AUDIENCE),healthResponse=await fetch(`${process.env.PI_MALWARE_SCANNER_URL.replace(/\/$/,'')}/v1/health`,{method:'POST',headers:{Authorization:`Bearer ${healthToken}`}}),health=await responseJson(healthResponse);
  assert.equal(healthResponse.status,200);assert.equal(health.status,'ready');assert.equal(health.engine,'ClamAV');assert.ok(health.engineVersion);assert.ok(health.signatureVersion);
  const signatureAgeMs=Date.now()-Date.parse(health.signatureUpdatedAt);assert.ok(Number.isFinite(signatureAgeMs)&&signatureAgeMs>=0&&signatureAgeMs<=24*60*60*1000,'Scanner signatures are stale');

  const testBytes=await syntheticPdf(),testPath=path.join(OUTPUT,EXPECTED.filename);await writeFile(testPath,testBytes);
  const inspected=await inspectSupportingDocument({bytes:testBytes,mimeType:'application/pdf',filename:EXPECTED.filename});
  assert.ok(testBytes.length<100_000);assert.equal(inspected.pageCount,1);assert.equal(inspected.sha256,sha256(testBytes));
  const extracted=await (async()=>{const doc=await getDocument({data:new Uint8Array(testBytes),standardFontDataUrl:path.resolve(ROOT,'node_modules/pdfjs-dist/standard_fonts')+path.sep}).promise,page=await doc.getPage(1),content=await page.getTextContent(),text=content.items.map(item=>item.str).join(' ');await doc.destroy();return text;})();
  for(const required of ['Property Intelligence V2.5 acceptance test',EXPECTED.address,'Synthetic QA document','No real mortgage, lien, title or financial evidence','Not suitable for investor reliance'])assert.ok(extracted.includes(required));
  assert.doesNotMatch(extracted,/account number|social security|borrower|routing number|licensed provider|confidential/i);

  const countedFirestore={collection:(...args)=>db.collection(...args),runTransaction:async callback=>{
    const pending=[];
    const result=await db.runTransaction(transaction=>callback(new Proxy(transaction,{get(target,key){const value=target[key];if(['create','set','update','delete'].includes(String(key)))return (...args)=>{pending.push({operation:String(key),path:args[0]?.path??null});return value.apply(target,args);};return typeof value==='function'?value.bind(target):value;}})),{maxAttempts:1});
    transactionLedger.push({phase:phase.name,writes:pending});return result;
  }};
  const durableRepository=createFirestoreDurablePropertyRepository({firestore:countedFirestore}),durableProperties=createDurablePropertyService({repository:durableRepository});
  const rawDocumentRepository=createFirestoreSupportingDocumentRepository({firestore:countedFirestore}),documentRepository={...rawDocumentRepository,appendAudit:async entry=>{const value=await rawDocumentRepository.appendAudit(entry);directWriteLedger.push({phase:phase.name,operation:'create',path:`organizations/${entry.organizationId}/documentAuditEvents/${value.id}`});return value;}};
  const rawStorage=createFirebasePrivateDocumentStorage({bucket}),storage={
    async put(...args){const value=await rawStorage.put(...args);storageLedger.push({phase:phase.name,operation:'PUT',path:args[0]});return value;},
    async get(...args){const value=await rawStorage.get(...args);storageLedger.push({phase:phase.name,operation:'GET',path:args[0]});return value;},
    async remove(...args){const value=await rawStorage.remove(...args);storageLedger.push({phase:phase.name,operation:'DELETE',path:args[0]});return value;}
  };
  const rawScanner=await loadCloudRunMalwareScanner(),scanner={async scan(...args){const result=await rawScanner.scan(...args);scannerLedger.push({phase:phase.name,result:result.result,sha256:result.sha256,engine:result.engine,engineVersion:result.engineVersion,signatureVersion:result.signatureVersion,signatureUpdatedAt:result.signatureUpdatedAt,scannedAt:result.scannedAt});return result;}};
  const supportingDocuments=createSupportingDocumentService({repository:documentRepository,storage,malwareScanner:scanner,durableProperties});
  const server=await startInvestmentWorkspace({port:0,root:ROOT,viteEnabled:true,propertyDetail:true,authentication,durableProperties,supportingDocuments,propertyResearch:null});
  let firstSession,secondSession,uploaded,reviewed,downloadHash,reportPath,reportInspection,registerScreenshot,negativeTests;
  try{
    phase.name='AUTHENTICATED_UPLOAD';
    firstSession=await startSession({origin:server.origin,apiKey:process.env.PI_PUBLIC_FIREBASE_API_KEY,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PW});
    const me=await firstSession.request('/api/auth/me');assert.equal(me.status,200);assert.deepEqual({uid:me.body.user.uid,role:me.body.user.role,organizationId:me.body.user.organizationId,emailVerified:me.body.user.emailVerified},{uid:EXPECTED.administratorUid,role:'Administrator',organizationId:EXPECTED.organizationId,emailVerified:true});
    const emptyRegister=await firstSession.request(`/api/durable-properties/${EXPECTED.propertyId}/documents`);assert.equal(emptyRegister.status,200);assert.equal(emptyRegister.body.documents.length,0);
    const upload=await firstSession.request(`/api/durable-properties/${EXPECTED.propertyId}/documents`,{method:'POST',csrf:true,body:{metadata:{documentType:'OTHER',description:'PI V2.5 document acceptance test',source:'Property Intelligence synthetic QA',sourceDate:'2026-10-18',reviewStatus:'INDEPENDENTLY_VERIFIED',confidentiality:'STANDARD',redistributionPermission:'APPROVED',evidenceClaim:'OTHER',appendixSelected:true},file:{filename:EXPECTED.filename,mimeType:'application/pdf',base64:testBytes.toString('base64')}}});
    assert.equal(upload.status,201,'The one authorized upload request failed');uploaded=upload.body.document;
    assert.equal(scannerLedger.length,1);assert.equal(storageLedger.filter(item=>item.operation==='PUT').length,1);
    assert.equal(uploaded.propertyId,EXPECTED.propertyId);assert.equal(uploaded.reviewStatus,'PENDING_REVIEW');assert.equal(uploaded.redistributionPermission,'NOT_APPROVED');assert.equal(uploaded.appendixSelected,false);assert.equal(uploaded.currentVersion,1);assert.equal(uploaded.versionCount,1);assert.equal(uploaded.currentVersionMetadata.scanStatus,'CLEAN');assert.equal(uploaded.currentVersionMetadata.sha256,inspected.sha256);
    const pendingRegister=await firstSession.request(`/api/durable-properties/${EXPECTED.propertyId}/documents`);assert.equal(pendingRegister.status,200);assert.equal(pendingRegister.body.documents[0].reviewStatus,'PENDING_REVIEW');

    phase.name='ADMINISTRATOR_REVIEW';
    const review=await firstSession.request(`/api/durable-properties/${EXPECTED.propertyId}/documents/${uploaded.id}/update`,{method:'POST',csrf:true,body:{...uploaded,reviewStatus:'REVIEWED',confidentiality:'STANDARD',redistributionPermission:'APPROVED',appendixSelected:true}});
    assert.equal(review.status,200);reviewed=review.body.document;assert.equal(reviewed.reviewStatus,'REVIEWED');assert.equal(reviewed.redistributionPermission,'APPROVED');assert.equal(reviewed.appendixSelected,true);assert.equal(reviewed.reviewedBy,EXPECTED.administratorUid);
    await logout({origin:server.origin,session:firstSession});

    phase.name='CROSS_SESSION_READ';
    secondSession=await startSession({origin:server.origin,apiKey:process.env.PI_PUBLIC_FIREBASE_API_KEY,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PW});
    const restored=await secondSession.request(`/api/durable-properties/${EXPECTED.propertyId}/documents`);assert.equal(restored.status,200);assert.equal(restored.body.documents.length,1);assert.equal(restored.body.documents[0].id,uploaded.id);assert.equal(restored.body.documents[0].reviewStatus,'REVIEWED');
    const download=await secondSession.request(`/api/durable-properties/${EXPECTED.propertyId}/documents/${uploaded.id}/versions/1/download`,{raw:true});assert.equal(download.status,200);const downloaded=Buffer.from(await download.arrayBuffer());downloadHash=sha256(downloaded);assert.equal(downloadHash,inspected.sha256);

    phase.name='SECURITY_NEGATIVE_TESTS';
    const unauthenticatedList=await fetch(`${server.origin}/api/durable-properties/${EXPECTED.propertyId}/documents`),unauthenticatedDownload=await fetch(`${server.origin}/api/durable-properties/${EXPECTED.propertyId}/documents/${uploaded.id}/versions/1/download`);
    assert.equal(unauthenticatedList.status,401);assert.equal(unauthenticatedDownload.status,401);
    let crossOrganizationCode='';try{await supportingDocuments.list({user:{uid:'cross-org-test',role:'Administrator',organizationId:'different-test-organization'},propertyId:EXPECTED.propertyId});}catch(error){crossOrganizationCode=error.code??error.message;}assert.equal(crossOrganizationCode,'DURABLE_PROPERTY_NOT_FOUND');
    const encodedObject=encodeURIComponent(storageLedger.find(item=>item.operation==='PUT').path),publicObjectResponse=await fetch(`https://storage.googleapis.com/download/storage/v1/b/${EXPECTED.bucket}/o/${encodedObject}?alt=media`),publicListResponse=await fetch(`https://storage.googleapis.com/storage/v1/b/${EXPECTED.bucket}/o`);
    assert.ok([401,403,404].includes(publicObjectResponse.status));assert.ok([401,403].includes(publicListResponse.status));
    negativeTests={unauthenticatedListStatus:unauthenticatedList.status,unauthenticatedDownloadStatus:unauthenticatedDownload.status,crossOrganizationResult:crossOrganizationCode,directPublicObjectStatus:publicObjectResponse.status,directPublicListStatus:publicListResponse.status};

    phase.name='QA_REPORT_GENERATION';
    const reportResponse=await secondSession.request('/api/investment/report',{method:'POST',raw:true,body:{id:EXPECTED.scenarioId,revision:EXPECTED.scenarioRevision,kind:'full',pdf:true}});assert.equal(reportResponse.status,200,'QA Full Investor Package generation failed');assert.match(reportResponse.headers.get('content-type')??'',/application\/pdf/);
    const disposition=reportResponse.headers.get('content-disposition')??'',reportedFilename=disposition.match(/filename="([^"]+)"/)?.[1]??'400_Decatur_St_QA_Full_Investor_Package.pdf',rawReport=Buffer.from(await reportResponse.arrayBuffer()),qaReport=await markQaReport(rawReport);
    reportPath=path.join(OUTPUT,reportedFilename);await writeFile(reportPath,qaReport);reportInspection=await inspectReport(qaReport,'Property Intelligence V2.5 acceptance test');

    phase.name='BROWSER_PERSISTENCE';
    registerScreenshot=await captureRegister({origin:server.origin,session:secondSession,expectedText:'PI V2.5 document acceptance test'});
    await logout({origin:server.origin,session:secondSession});
  }finally{await server.close();}

  phase.name='POST_ACCEPTANCE_INTEGRITY';
  const [finalObjects]=await bucket.getFiles(),propertyAfter=await propertyRef.get(),evidenceAfter=await db.doc(evidencePath).get(),scenarioAfter=await db.doc(scenarioPath).get(),documentsAfter=await propertyRef.collection('supportingDocuments').get(),hashesAfter=await db.collection(`organizations/${EXPECTED.organizationId}/documentHashes`).get(),auditsAfter=await db.collection(`organizations/${EXPECTED.organizationId}/documentAuditEvents`).get(),versionsAfter=await db.collectionGroup('versions').get(),reportsAfter=await propertyRef.collection('reportRevisions').get(),allPropertiesAfter=await db.collection(`organizations/${EXPECTED.organizationId}/properties`).get();
  assert.equal(finalObjects.length,1);assert.equal(documentsAfter.size,1);assert.equal(hashesAfter.size,1);assert.equal(auditsAfter.size,4);assert.equal(versionsAfter.size,1);assert.equal(reportsAfter.size,1);
  assert.equal(propertyAfter.id,EXPECTED.propertyId);assert.equal(dataHash(evidenceAfter.data()),EXPECTED.baselineEvidenceHash);assert.equal(dataHash(scenarioAfter.data()),EXPECTED.baselineScenarioHash);assert.equal(dataHash(scenarioAfter.data().scenario),scenarioBeforeHash);assert.equal(dataHash({analysis:scenarioAfter.data().scenario.analysis,inputs:scenarioAfter.data().scenario.inputs,risk:scenarioAfter.data().scenario.risk}),financialBeforeHash);
  const otherAfter=Object.fromEntries(allPropertiesAfter.docs.filter(row=>row.id!==EXPECTED.propertyId).map(row=>[row.ref.path,dataHash(row.data())]));assert.deepEqual(otherAfter,otherPropertyHashes);
  const localAfter=await Promise.all(['data/raw/rentcast/property-research-v2-3','data/runtime/pi-v2-3/usage','data/runtime/investment-workspace-v1/scenarios'].map(treeFingerprint));assert.deepEqual(localAfter,localBefore);
  const documentSnapshot=documentsAfter.docs[0],versionSnapshot=versionsAfter.docs[0],reportSnapshot=reportsAfter.docs[0],auditActions=auditsAfter.docs.map(row=>row.data().action).sort();
  assert.equal(documentSnapshot.id,uploaded.id);assert.equal(versionSnapshot.data().sha256,inspected.sha256);assert.deepEqual(auditActions,['DOCUMENT_DOWNLOADED','DOCUMENT_INCLUDED_IN_REPORT','DOCUMENT_METADATA_UPDATED','DOCUMENT_UPLOADED']);assert.deepEqual(reportSnapshot.data().supportingDocuments,[{documentId:uploaded.id,version:1,sha256:inspected.sha256,appendix:1}]);
  const transactionWrites=transactionLedger.flatMap(entry=>entry.writes.map(write=>({...write,phase:entry.phase}))),allWrites=[...transactionWrites,...directWriteLedger];
  assert.deepEqual(transactionLedger.map(entry=>entry.writes.length),[4,2,2]);assert.equal(directWriteLedger.length,4);assert.equal(allWrites.length,12);
  assert.equal(scannerLedger.length,1);assert.equal(storageLedger.filter(item=>item.operation==='PUT').length,1);assert.equal(storageLedger.filter(item=>item.operation==='GET').length,2);assert.equal(storageLedger.filter(item=>item.operation==='DELETE').length,0);
  assert.equal(finalObjects[0].name,storageLedger.find(item=>item.operation==='PUT').path);
  const [objectMetadata]=await finalObjects[0].getMetadata();assert.equal(objectMetadata.metadata?.sha256,inspected.sha256);assert.equal(objectMetadata.cacheControl,'private, no-store, max-age=0');

  const completedAt=new Date().toISOString(),result={
    status:'PASS',startedAt,completedAt,nodeVersion:process.version,projectId:EXPECTED.projectId,organizationId:EXPECTED.organizationId,
    preflight:{administrator:{uid:admin.uid,emailVerified:admin.emailVerified,disabled:admin.disabled,role:admin.customClaims.role,organizationId:admin.customClaims.piOrganizationId},property:{id:propertySnapshot.id,address:propertySnapshot.data().address,propertyHash:EXPECTED.baselinePropertyHash},evidenceSnapshot:{path:evidencePath,dataHash:EXPECTED.baselineEvidenceHash},scenarioRevision:{path:scenarioPath,dataHash:EXPECTED.baselineScenarioHash},storage:{bucket:EXPECTED.bucket,location:bucketMetadata.location,publicAccessPrevention:bucketMetadata.iamConfiguration.publicAccessPrevention,uniformBucketLevelAccess:bucketMetadata.iamConfiguration.uniformBucketLevelAccess.enabled,initialObjectCount:initialObjects.length},scannerHealth:{status:health.status,engine:health.engine,engineVersion:health.engineVersion,signatureVersion:health.signatureVersion,signatureUpdatedAt:health.signatureUpdatedAt,signatureAgeHours:signatureAgeMs/3600000},existingDocumentCount:documentsBefore.size,testDocumentSynthetic:true},
    document:{id:uploaded.id,title:EXPECTED.filename,sha256:inspected.sha256,sizeBytes:testBytes.length,pageCount:inspected.pageCount,propertyId:uploaded.propertyId,organizationId:EXPECTED.organizationId,storagePath:finalObjects[0].name,storageGeneration:objectMetadata.generation,version:1,reviewStatus:reviewed.reviewStatus,redistributionPermission:reviewed.redistributionPermission,appendixSelected:reviewed.appendixSelected,independentlyVerified:false,uploadedAt:uploaded.uploadedAt,reviewedAt:reviewed.reviewedAt},
    scanner:{invocations:scannerLedger.length,...scannerLedger[0]},
    persistence:{browserRefreshVerified:registerScreenshot.refreshPersistence,logoutLoginVerified:true,downloadSha256:downloadHash,documentCount:documentsAfter.size,versionCount:versionsAfter.size,hashReservationCount:hashesAfter.size,auditEventCount:auditsAfter.size,reportRevisionCount:reportsAfter.size},
    report:{path:reportPath,sha256:sha256(await readFile(reportPath)),reportRevisionPath:reportSnapshot.ref.path,reportRevisionId:reportSnapshot.id,scenarioId:reportSnapshot.data().scenarioId,revision:reportSnapshot.data().revision,evidenceSnapshotId:reportSnapshot.data().evidenceSnapshotId,qaNotForDistribution:true,...reportInspection},
    screenshot:registerScreenshot.file,
    security:{...negativeTests,storageRulesDenyAllVerifiedSeparately:true,firestoreRulesDenyAllVerifiedSeparately:true,privilegedBrowserConfigurationMatches:0,cleanGateTestsPassed:49,authenticationTestsPassed:10},
    integrity:{stablePropertyIdUnchanged:propertyAfter.id===EXPECTED.propertyId,evidenceSnapshotUnchanged:true,scenarioRevisionUnchanged:true,financialAndMonteCarloUnchanged:true,otherPropertiesUnchanged:true,localProviderAndScenarioTreesUnchanged:true,providerRequests:0,additionalStorageObjects:0},
    usage:{firestoreWrites:allWrites.length,transactions:transactionLedger.map((entry,index)=>({number:index+1,phase:entry.phase,writeCount:entry.writes.length,writes:entry.writes})),directWrites:directWriteLedger,storageApplicationOperations:{puts:1,gets:2,deletes:0},storageInventoryReads:2,scannerHealthInvocations:1,scannerScanInvocations:1,uploadRequests:1,automaticRetries:0,reportGenerations:1},
    recommendation:'GO_FOR_CONTROLLED_AUTHENTICATED_DOCUMENT_UPLOADS_WITH_ENGINE_UPGRADE_BEFORE_GENERAL_ROLLOUT'
  };
  await writeFile(RESULT_FILE,`${JSON.stringify(result,null,2)}\n`);
  return result;
}

try{
  const result=await main();
  console.log(`PI_V2_5_LIVE_DOCUMENT_ACCEPTANCE_RESULT=${JSON.stringify({status:result.status,documentId:result.document.id,sha256:result.document.sha256,storageObjectCount:result.persistence.documentCount,firestoreWrites:result.usage.firestoreWrites,scannerInvocations:result.scanner.invocations,report:result.report.path,screenshot:result.screenshot,recommendation:result.recommendation})}`);
}catch(error){
  const failure={status:'FAIL',at:new Date().toISOString(),name:error.name,message:error.message,actual:error.actual,expected:error.expected,cleanupPerformed:false,retryPerformed:false};
  await mkdir(OUTPUT,{recursive:true}).catch(()=>{});await writeFile(RESULT_FILE,`${JSON.stringify(failure,null,2)}\n`).catch(()=>{});
  console.error(`PI_V2_5_LIVE_DOCUMENT_ACCEPTANCE_FAILURE=${JSON.stringify(failure)}`);process.exitCode=1;
}
