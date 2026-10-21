import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {createCanvas} from '@napi-rs/canvas';
import {createDurablePropertyService} from '../src/investment-workspace/durable-properties.js';
import {createMemoryDurablePropertyRepository} from '../src/investment-workspace/memory-durable-properties.js';
import {createMemoryPrivateDocumentStorage,createMemorySupportingDocumentRepository} from '../src/investment-workspace/memory-supporting-documents.js';
import {createMockMalwareScanner,createSupportingDocumentService,createUnavailableMalwareScanner,inspectSupportingDocument,SupportingDocumentError} from '../src/investment-workspace/supporting-documents.js';
import {addQaAcceptanceLabel,addSupportingEvidenceToHtml,appendSupportingDocuments,INVESTOR_SUPPORTING_DOCUMENT_DISCLAIMER,markQaNotForDistribution} from '../src/investment-workspace/document-appendices.js';
import {createCloudRunMalwareScanner,loadCloudRunMalwareScanner,normalizeGoogleIdentityToken} from '../src/investment-workspace/cloud-run-malware-scanner.js';
import {requireInvestmentBootstrap} from '../src/investment-workspace/server.js';

const analyst={uid:'analyst-docs',role:'Analyst',organizationId:'kern-docs'},administrator={...analyst,uid:'admin-docs',role:'Administrator'},viewer={...analyst,uid:'viewer-docs',role:'Viewer'},other={...analyst,uid:'other-docs',organizationId:'other-docs'};
const subject={ref:'RESEARCH-DOCUMENTS',address:'400 Decatur St, Bakersfield, CA 93308',subjectKind:'PRELIMINARY_RESEARCH',addressComponents:{street:'400 Decatur St',city:'Bakersfield',state:'CA',zip:'93308'},evidenceFingerprint:'snapshot-docs',providerId:'mock-decatur',attributes:{propertyType:'Single Family'}};
const metadata={documentType:'PROPERTY_CONDITION',description:'Exterior condition photographs',source:'Analyst site visit',sourceDate:'2026-10-18',reviewStatus:'PENDING_REVIEW',confidentiality:'STANDARD',redistributionPermission:'NOT_APPROVED',evidenceClaim:'PROPERTY_CONDITION'};
async function pdfBytes(text='Supporting evidence'){const pdf=await PDFDocument.create(),page=pdf.addPage([612,792]);page.drawText(text,{x:60,y:700,size:18});return Buffer.from(await pdf.save());}
function pngBytes(){return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');}
function jpegBytes(){const canvas=createCanvas(2,2),context=canvas.getContext('2d');context.fillStyle='#146c60';context.fillRect(0,0,2,2);return canvas.toBuffer('image/jpeg');}
async function fixture(){
  let next=0;const now=()=>new Date(`2026-10-18T20:00:0${next}.000Z`),durableRepository=createMemoryDurablePropertyRepository(),durable=createDurablePropertyService({repository:durableRepository,idFactory:()=>`10000000-0000-4000-8000-${String(++next).padStart(12,'0')}`}),property=await durable.promote({user:analyst,subject}),repository=createMemorySupportingDocumentRepository(),storage=createMemoryPrivateDocumentStorage(),documents=createSupportingDocumentService({repository,storage,malwareScanner:createMockMalwareScanner({clock:now}),durableProperties:durable,idFactory:()=>`doc-${++next}`,clock:now});return {durable,property,repository,storage,documents};
}

test('authenticated analyst uploads, downloads and audits an immutable private version',async()=>{
  const f=await fixture(),bytes=await pdfBytes(),document=await f.documents.upload({user:analyst,propertyId:f.property.id,metadata:{...metadata,reviewStatus:'INDEPENDENTLY_VERIFIED',redistributionPermission:'APPROVED',appendixSelected:true},file:{filename:'condition.pdf',mimeType:'application/pdf',bytes}}),download=await f.documents.download({user:analyst,propertyId:f.property.id,documentId:document.id});
  assert.equal(document.currentVersion,1);assert.equal(document.reviewStatus,'PENDING_REVIEW');assert.equal(document.redistributionPermission,'NOT_APPROVED');assert.equal(document.appendixSelected,false);assert.equal(document.currentVersionMetadata.scanStatus,'CLEAN');assert.equal(document.currentVersionMetadata.scanEngine,'ClamAV mock');assert.equal(document.currentVersionMetadata.scanEngineVersion,'1.4.3-test');assert.equal(document.currentVersionMetadata.scanSignatureVersion,'test-signatures-1');assert.equal(document.currentVersionMetadata.sha256.length,64);assert.deepEqual(download.bytes,bytes);assert.equal(f.repository._state.audit.map(item=>item.action).join(','),'DOCUMENT_UPLOADED,DOCUMENT_DOWNLOADED');assert.doesNotMatch(JSON.stringify(document),/storageKey|organizations\//);
});

test('valid PDF, JPEG and PNG files pass content validation and clean mocked scanning',async()=>{
  const f=await fixture(),files=[['evidence.pdf','application/pdf',await pdfBytes()],['photo.jpg','image/jpeg',jpegBytes()],['photo.png','image/png',pngBytes()]];
  for(const [filename,mimeType,bytes] of files){const document=await f.documents.upload({user:analyst,propertyId:f.property.id,metadata:{...metadata,description:filename},file:{filename,mimeType,bytes}});assert.equal(document.currentVersionMetadata.mimeType,mimeType);assert.equal(document.currentVersionMetadata.scanStatus,'CLEAN');}
  assert.equal(f.storage._state.objects.size,3);
});

test('tenant isolation and role enforcement apply to metadata and file bytes',async()=>{
  const f=await fixture(),document=await f.documents.upload({user:analyst,propertyId:f.property.id,metadata,file:{filename:'condition.pdf',mimeType:'application/pdf',bytes:await pdfBytes()}});
  await assert.rejects(()=>f.documents.list({user:other,propertyId:f.property.id}),error=>error.code==='DURABLE_PROPERTY_NOT_FOUND');
  await assert.rejects(()=>f.documents.download({user:other,propertyId:f.property.id,documentId:document.id}),error=>error.code==='DURABLE_PROPERTY_NOT_FOUND');
  await assert.rejects(()=>f.documents.update({user:viewer,propertyId:f.property.id,documentId:document.id,patch:{reviewStatus:'REVIEWED'}}),error=>error.code==='ROLE_NOT_AUTHORIZED');
});

test('duplicate hashes are rejected and new content creates an immutable next version',async()=>{
  const f=await fixture(),firstBytes=await pdfBytes('Version one'),first=await f.documents.upload({user:analyst,propertyId:f.property.id,metadata,file:{filename:'condition.pdf',mimeType:'application/pdf',bytes:firstBytes}});
  await assert.rejects(()=>f.documents.upload({user:administrator,propertyId:f.property.id,metadata,file:{filename:'copy.pdf',mimeType:'application/pdf',bytes:firstBytes}}),error=>error.code==='DUPLICATE_DOCUMENT_CONTENT');
  await f.documents.update({user:analyst,propertyId:f.property.id,documentId:first.id,patch:{reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true}});const second=await f.documents.upload({user:analyst,propertyId:f.property.id,documentId:first.id,metadata:{...metadata,reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true},file:{filename:'condition-v2.pdf',mimeType:'application/pdf',bytes:await pdfBytes('Version two')}});assert.equal(second.currentVersion,2);assert.equal(second.versionCount,2);assert.equal(second.reviewStatus,'PENDING_REVIEW');assert.equal(second.redistributionPermission,'NOT_APPROVED');assert.equal(second.appendixSelected,false);assert.notEqual(second.currentVersionMetadata.sha256,first.currentVersionMetadata.sha256);
});

test('appendix selection requires review, standard confidentiality and redistribution approval',async()=>{
  const f=await fixture(),document=await f.documents.upload({user:analyst,propertyId:f.property.id,metadata,file:{filename:'condition.pdf',mimeType:'application/pdf',bytes:await pdfBytes()}});
  await assert.rejects(()=>f.documents.update({user:analyst,propertyId:f.property.id,documentId:document.id,patch:{appendixSelected:true}}),error=>error.code==='DOCUMENT_NOT_ELIGIBLE_FOR_APPENDIX');
  const approved=await f.documents.update({user:analyst,propertyId:f.property.id,documentId:document.id,patch:{reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true}});assert.equal(approved.appendixSelected,true);assert.equal((await f.documents.reportDocuments({user:analyst,propertyId:f.property.id})).length,1);assert.ok(f.repository._state.audit.some(item=>item.action==='DOCUMENT_INCLUDED_IN_REPORT'));
  const confidential=await f.documents.update({user:analyst,propertyId:f.property.id,documentId:document.id,patch:{confidentiality:'CONFIDENTIAL'}});assert.equal(confidential.appendixSelected,false);assert.equal((await f.documents.reportDocuments({user:analyst,propertyId:f.property.id})).length,0);
});

test('completeness distinguishes missing, uploaded, reviewed, verified and stale evidence',async()=>{
  const f=await fixture(),document=await f.documents.upload({user:analyst,propertyId:f.property.id,metadata,file:{filename:'condition.png',mimeType:'image/png',bytes:pngBytes()}});let summary=await f.documents.completeness({user:analyst,propertyId:f.property.id});assert.equal(summary.find(item=>item.documentType==='PROPERTY_CONDITION').status,'DOCUMENT_UPLOADED_NOT_REVIEWED');assert.equal(summary.find(item=>item.documentType==='MORTGAGE_PAYOFF').status,'EVIDENCE_MISSING');
  await f.documents.update({user:analyst,propertyId:f.property.id,documentId:document.id,patch:{reviewStatus:'INDEPENDENTLY_VERIFIED'}});summary=await f.documents.completeness({user:analyst,propertyId:f.property.id});assert.equal(summary.find(item=>item.documentType==='PROPERTY_CONDITION').status,'EVIDENCE_INDEPENDENTLY_VERIFIED');
});

test('malicious, malformed, MIME-mismatched and oversized files fail closed',async()=>{
  const validPdf=await pdfBytes();
  await assert.rejects(()=>inspectSupportingDocument({filename:'active.pdf',mimeType:'application/pdf',bytes:Buffer.from('%PDF-1.4\n/JavaScript malicious')}),error=>error.code==='DOCUMENT_ACTIVE_CONTENT_REJECTED');
  await assert.rejects(()=>inspectSupportingDocument({filename:'fake.pdf',mimeType:'application/pdf',bytes:Buffer.from('not a pdf')}),error=>error.code==='DOCUMENT_CONTENT_MISMATCH');
  await assert.rejects(()=>inspectSupportingDocument({filename:'wrong.png',mimeType:'image/png',bytes:validPdf}),error=>error.code==='DOCUMENT_CONTENT_MISMATCH');
  await assert.rejects(()=>inspectSupportingDocument({filename:'large.pdf',mimeType:'application/pdf',bytes:Buffer.alloc(1025),sizeLimit:1024}),error=>error.code==='DOCUMENT_TOO_LARGE');
  await assert.rejects(()=>inspectSupportingDocument({filename:'../escape.pdf',mimeType:'application/pdf',bytes:validPdf}),error=>error.code==='DOCUMENT_FILENAME_INVALID');
});

test('unavailable malware scanning blocks storage instead of bypassing inspection',async()=>{
  const f=await fixture(),bytes=await pdfBytes(),documents=createSupportingDocumentService({repository:f.repository,storage:f.storage,malwareScanner:createUnavailableMalwareScanner(),durableProperties:f.durable});await assert.rejects(()=>documents.upload({user:analyst,propertyId:f.property.id,metadata,file:{filename:'condition.pdf',mimeType:'application/pdf',bytes}}),error=>error.code==='DOCUMENT_MALWARE_SCANNER_UNAVAILABLE'&&error.status===503);assert.equal(f.storage._state.objects.size,0);
});

test('detected malware and stale ClamAV signatures fail closed before storage',async()=>{
  const infectedFixture=await fixture(),infectedBytes=Buffer.concat([await pdfBytes(),Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')]);
  await assert.rejects(()=>infectedFixture.documents.upload({user:analyst,propertyId:infectedFixture.property.id,metadata,file:{filename:'infected.pdf',mimeType:'application/pdf',bytes:infectedBytes}}),error=>error.code==='DOCUMENT_MALWARE_DETECTED');
  assert.equal(infectedFixture.storage._state.objects.size,0);

  const staleFixture=await fixture(),staleBytes=await pdfBytes(),staleScanner={async scan(bytes,{sha256}){return {available:true,clean:true,result:'CLEAN',sha256,engine:'ClamAV',engineVersion:'1.4.3',signatureVersion:'old-signatures',signatureUpdatedAt:'2026-10-01T00:00:00.000Z',scannedAt:'2026-10-18T20:00:00.000Z'};}},staleDocuments=createSupportingDocumentService({repository:staleFixture.repository,storage:staleFixture.storage,malwareScanner:staleScanner,durableProperties:staleFixture.durable,clock:()=>new Date('2026-10-18T20:00:00.000Z')});
  await assert.rejects(()=>staleDocuments.upload({user:analyst,propertyId:staleFixture.property.id,metadata,file:{filename:'stale.pdf',mimeType:'application/pdf',bytes:staleBytes}}),error=>error.code==='DOCUMENT_MALWARE_SIGNATURE_STALE');
  assert.equal(staleFixture.storage._state.objects.size,0);
});

test('unclean or incomplete scan metadata independently blocks review, download and report inclusion',async()=>{
  const f=await fixture(),document=await f.documents.upload({user:analyst,propertyId:f.property.id,metadata,file:{filename:'condition.pdf',mimeType:'application/pdf',bytes:await pdfBytes()}});await f.documents.update({user:analyst,propertyId:f.property.id,documentId:document.id,patch:{reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true}});
  const stored=[...f.repository._state.documents.values()][0];stored.versions[0].scanStatus='PENDING';
  await assert.rejects(()=>f.documents.update({user:analyst,propertyId:f.property.id,documentId:document.id,patch:{reviewStatus:'INDEPENDENTLY_VERIFIED'}}),error=>error.code==='DOCUMENT_SCAN_NOT_CLEAN');
  await assert.rejects(()=>f.documents.download({user:analyst,propertyId:f.property.id,documentId:document.id}),error=>error.code==='DOCUMENT_SCAN_NOT_CLEAN');
  await assert.rejects(()=>f.documents.reportDocuments({user:analyst,propertyId:f.property.id}),error=>error.code==='DOCUMENT_SCAN_NOT_CLEAN');
});

test('stored-byte hash mismatch blocks download and report inclusion',async()=>{
  const f=await fixture(),document=await f.documents.upload({user:analyst,propertyId:f.property.id,metadata,file:{filename:'condition.pdf',mimeType:'application/pdf',bytes:await pdfBytes()}});await f.documents.update({user:analyst,propertyId:f.property.id,documentId:document.id,patch:{reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true}});
  const object=[...f.storage._state.objects.values()][0];object.bytes=Buffer.from('tampered');
  await assert.rejects(()=>f.documents.download({user:analyst,propertyId:f.property.id,documentId:document.id}),error=>error.code==='DOCUMENT_INTEGRITY_FAILURE');
  await assert.rejects(()=>f.documents.reportDocuments({user:analyst,propertyId:f.property.id}),error=>error.code==='DOCUMENT_INTEGRITY_FAILURE');
});

test('Cloud Run scanner transport authenticates once, does not retry and fails closed on timeout',async()=>{
  const bytes=Buffer.from('safe'),sha256='8b3369944dd2a3fab39e32d1aeb1f627bf9a748ab4ea4940aafb0ecb9e5cbe8f';let requests=0,tokens=0;
  const scanner=createCloudRunMalwareScanner({url:'https://scanner.example.test',timeoutMs:100,identityTokenProvider:async audience=>{tokens++;assert.equal(audience,'https://scanner.example.test');return 'test-token';},fetchImpl:async(url,options)=>{requests++;assert.equal(url,'https://scanner.example.test/v1/scan');assert.equal(options.headers.Authorization,'Bearer test-token');return new Response(JSON.stringify({protocolVersion:1,result:'CLEAN',sha256,engine:'ClamAV',engineVersion:'1.4.3',signatureVersion:'27800',signatureUpdatedAt:'2026-10-18T19:00:00.000Z',scannedAt:'2026-10-18T20:00:00.000Z'}),{status:200});}}),result=await scanner.scan(bytes,{filename:'safe.pdf',mimeType:'application/pdf',sha256});assert.equal(result.clean,true);assert.equal(requests,1);assert.equal(tokens,1);
  let timeoutRequests=0;const timeoutScanner=createCloudRunMalwareScanner({url:'https://scanner.example.test',timeoutMs:5,identityTokenProvider:async()=> 'test-token',fetchImpl:async(url,options)=>{timeoutRequests++;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));}}),timedOut=await timeoutScanner.scan(bytes,{filename:'safe.pdf',mimeType:'application/pdf',sha256});assert.equal(timedOut.clean,false);assert.equal(timedOut.available,false);assert.equal(timedOut.error,'SCANNER_TIMEOUT');assert.equal(timeoutRequests,1);
});

test('Cloud Run identity tokens are preserved beyond the previous 500-character boundary',()=>{
  const token=`${'a'.repeat(320)}.${'b'.repeat(320)}.${'c'.repeat(320)}`;
  assert.equal(normalizeGoogleIdentityToken(`Bearer ${token}`),token);
  assert.throws(()=>normalizeGoogleIdentityToken('Bearer truncated-token'),/MALWARE_SCANNER_ID_TOKEN_UNAVAILABLE/);
});

test('serverless scanner loader binds the Firebase service account without filesystem credentials',async()=>{
  const account={type:'service_account',project_id:'property-intelligence-test',client_email:'scanner-invoker@property-intelligence-test.iam.gserviceaccount.com',private_key:'-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n'},env={FIREBASE_PROJECT_ID:account.project_id,FIREBASE_SERVICE_ACCOUNT_JSON_BASE64:Buffer.from(JSON.stringify(account)).toString('base64'),PI_MALWARE_SCANNER_URL:'https://scanner.example.test'};
  const scanner=await loadCloudRunMalwareScanner(env);assert.equal(typeof scanner.scan,'function');
  await assert.rejects(()=>loadCloudRunMalwareScanner({...env,FIREBASE_PROJECT_ID:'another-project'}),/MALWARE_SCANNER_IDENTITY_CONFIGURATION_INVALID/);
});

test('full package appends indexed PDF and image pages while brief adds no standalone evidence page',async()=>{
  const base=await pdfBytes('Full investor package'),source=await pdfBytes('Payoff statement'),document={id:'doc-1',documentType:'MORTGAGE_PAYOFF',description:'Lender payoff statement',source:'Example Bank',sourceDate:'2026-10-18',reviewStatus:'REVIEWED',currentVersion:1,currentVersionMetadata:{version:1,filename:'payoff.pdf',mimeType:'application/pdf',sha256:'a'.repeat(64)}},appendices=[{index:1,document,version:{...document.currentVersionMetadata,uploadedAt:'2026-10-18T20:00:00Z'},bytes:source}];
  const fullHtml=addSupportingEvidenceToHtml('<html><body><p>Package</p></body></html>',appendices,{kind:'full'}),briefHtml=addSupportingEvidenceToHtml('<html><body><p>Brief</p></body></html>',appendices,{kind:'brief'});assert.match(fullHtml,/Supporting document appendix index/);assert.ok(fullHtml.includes(INVESTOR_SUPPORTING_DOCUMENT_DISCLAIMER));assert.equal(briefHtml,'<html><body><p>Brief</p></body></html>');assert.ok(!briefHtml.includes(INVESTOR_SUPPORTING_DOCUMENT_DISCLAIMER));
  const merged=await appendSupportingDocuments(base,appendices),pdf=await PDFDocument.load(merged.bytes);assert.equal(pdf.getPageCount(),3);assert.equal(merged.appendixPages,2);
});

test('report generation requires bootstrap initialization and QA output is visibly restricted',async()=>{
  assert.throws(()=>requireInvestmentBootstrap(false),error=>error.code==='INVESTMENT_BOOTSTRAP_REQUIRED'&&error.status===409);
  assert.doesNotThrow(()=>requireInvestmentBootstrap(true));
  const html=addQaAcceptanceLabel('<html><head></head><body><p>Package</p></body></html>');assert.match(html,/QA \/ NOT FOR DISTRIBUTION/);assert.match(html,/synthetic test material/i);
  const source=await pdfBytes('Acceptance package'),marked=await markQaNotForDistribution(source),pdf=await PDFDocument.load(marked);assert.equal(pdf.getPageCount(),1);assert.match(pdf.getTitle(),/QA \/ NOT FOR DISTRIBUTION/);
});

test('UI and Firebase adapters keep storage server-side and expose the required register fields',async()=>{
  const [ui,server,adapter,firestoreRules,storageRules]=await Promise.all([readFile('apps/web/src/features/investment-workspace/SupportingDocuments.jsx','utf8'),readFile('src/investment-workspace/server.js','utf8'),readFile('src/investment-workspace/firebase-supporting-documents.js','utf8'),readFile('config/firestore.rules.proposed','utf8'),readFile('config/storage.rules.proposed','utf8')]);
  for(const field of ['Document type','Description','Source','Source date','Review status','Confidentiality','Redistribution','Evidence claim'])assert.match(ui,new RegExp(field));assert.match(server,/X-Content-Type-Options/);assert.match(adapter,/private, no-store/);assert.doesNotMatch(ui,/firebase\/storage|getStorage|storageKey/);assert.match(firestoreRules,/allow read, write: if false/);assert.match(storageRules,/allow read, write: if false/);
});

test('normal private-development startup enables documents without enabling a built or public runtime',async()=>{
  const packageJson=JSON.parse(await readFile('package.json','utf8')),command=packageJson.scripts['pi:local'],rollback=packageJson.scripts['pi:local:no-documents'];
  for(const flag of ['--investment','--operational-persistence','--supporting-documents'])assert.match(command,new RegExp(flag));
  assert.doesNotMatch(command,/--built|--host\s+0\.0\.0\.0/);
  assert.match(rollback,/--operational-persistence/);assert.doesNotMatch(rollback,/--supporting-documents|--built/);
});
