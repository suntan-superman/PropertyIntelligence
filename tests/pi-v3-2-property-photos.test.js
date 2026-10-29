import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {createPropertyPhotoService,inspectPropertyPhoto,photoSelectionFingerprint,PropertyPhotoError} from '../src/investment-workspace/property-photos.js';
import {createMemoryPropertyPhotoRepository} from '../src/investment-workspace/memory-property-photos.js';
import {createMemoryPrivateDocumentStorage} from '../src/investment-workspace/memory-supporting-documents.js';
import {createMockMalwareScanner} from '../src/investment-workspace/supporting-documents.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {reportModel} from '../src/investment-workspace/report-model.js';

const user={uid:'analyst-one',organizationId:'org-one',role:'Analyst'},other={...user,uid:'analyst-two',organizationId:'org-two'};
const now=new Date('2026-10-28T18:00:00.000Z');
async function image(format='jpeg',text='SYNTHETIC QA PROPERTY PHOTO'){
  const svg=Buffer.from(`<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="800" fill="#164b5b"/><rect x="80" y="80" width="1040" height="640" fill="#e8f2f0"/><text x="600" y="390" text-anchor="middle" font-size="44" font-family="Arial" fill="#164b5b">${text}</text></svg>`);
  return sharp(svg).withMetadata({exif:{IFD0:{Copyright:'QA fixture'},IFD3:{GPSLatitudeRef:'N'}}})[format]().toBuffer();
}
const mime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'},extension={jpeg:'jpg',png:'png',webp:'webp'};
async function setup(){
  const repository=createMemoryPropertyPhotoRepository(),storage=createMemoryPrivateDocumentStorage(),durableProperties={async get({user:actor,id}){if(actor.organizationId!=='org-one'||id!=='property-one')throw new PropertyPhotoError('PHOTO_PROPERTY_NOT_FOUND',404);return {id};}},service=createPropertyPhotoService({repository,storage,malwareScanner:createMockMalwareScanner({clock:()=>now}),durableProperties,clock:()=>now,idFactory:(()=>{let value=0;return()=>`photo-${++value}`;})()});
  return {repository,storage,service};
}
test('JPEG, PNG and WebP are decoded; report derivatives are JPEG with metadata stripped',async()=>{
  for(const format of ['jpeg','png','webp']){const original=await image(format),result=await inspectPropertyPhoto({bytes:original,mimeType:mime[format],filename:`qa.${extension[format]}`}),metadata=await sharp(result.derivative).metadata();assert.equal(result.mimeType,mime[format]);assert.equal(result.derivativeMimeType,'image/jpeg');assert.ok(result.derivative.length>0);assert.equal(metadata.exif,undefined);assert.equal(metadata.width,1200);assert.equal(metadata.height,800);}
  await assert.rejects(()=>inspectPropertyPhoto({bytes:Buffer.from('not-an-image'),mimeType:'image/jpeg',filename:'bad.jpg'}),error=>error.code==='PHOTO_CONTENT_MISMATCH');
  await assert.rejects(()=>inspectPropertyPhoto({bytes:Buffer.alloc(10*1024*1024+1),mimeType:'image/jpeg',filename:'large.jpg'}),error=>error.code==='PHOTO_TOO_LARGE');
});
test('private gallery supports metadata, cover, ordering, soft removal and exact-version report reads',async()=>{
  const {service,storage,repository}=await setup(),first=await service.upload({user,propertyId:'property-one',metadata:{caption:'Front exterior',category:'EXTERIOR',sourceDescription:'Analyst site visit',captureDate:'2026-10-27',captureDateSource:'FILE_METADATA'},file:{filename:'front.jpg',mimeType:'image/jpeg',bytes:await image('jpeg','FRONT')}}),second=await service.upload({user,propertyId:'property-one',metadata:{caption:'Kitchen',category:'KITCHEN'},file:{filename:'kitchen.png',mimeType:'image/png',bytes:await image('png','KITCHEN')}});
  assert.equal(first.isCover,true);assert.equal(first.captureDateSource,'FILE_METADATA');assert.equal(second.captureDateSource,'UNKNOWN');assert.equal(second.isCover,false);assert.equal((await service.list({user,propertyId:'property-one'})).length,2);
  await service.update({user,propertyId:'property-one',photoId:second.id,patch:{isCover:true,caption:'Kitchen before repairs'}});let gallery=await service.reorder({user,propertyId:'property-one',photoIds:[second.id,first.id]});assert.deepEqual(gallery.map(item=>item.id),[second.id,first.id]);assert.equal(gallery[0].isCover,true);
  const references=gallery.map(item=>({photoId:item.id,version:item.currentVersion,caption:item.caption,category:item.category,isCover:item.isCover})),scenario={id:'scenario-one',revision:2,photoSelections:references,photoRightsAcknowledgment:{confirmed:true,userId:user.uid,organizationId:'org-one',confirmedAt:now.toISOString(),scenarioId:'scenario-one',revision:1,selectionFingerprint:photoSelectionFingerprint(references)}};
  const report=await service.reportPhotos({user,propertyId:'property-one',scenario,auditInclusion:true});assert.equal(report.length,2);assert.ok(report[0].dataUrl.startsWith('data:image/jpeg;base64,'));assert.equal(repository._state.audit.at(-1).action,'PROPERTY_PHOTOS_INCLUDED_IN_REPORT');
  const objectCount=storage._state.objects.size;await service.update({user,propertyId:'property-one',photoId:second.id,patch:{removed:true}});gallery=await service.list({user,propertyId:'property-one'});assert.equal(gallery.length,1);assert.equal(gallery[0].isCover,true);assert.equal(storage._state.objects.size,objectCount,'soft removal does not delete immutable private objects');assert.equal((await service.reportPhotos({user,propertyId:'property-one',scenario})).length,2,'historical exact-version selection remains reproducible after soft removal');
});
test('10 MiB production path uses a bounded private direct upload before server validation and scanning',async()=>{
  const {service,storage}=await setup(),bytes=await image('webp','DIRECT UPLOAD');storage.createUploadUrl=async(storageKey,{contentType,expiresAt})=>({url:`memory://${storageKey}`,method:'PUT',headers:{'Content-Type':contentType},expiresAt});
  const initiated=await service.initiateUpload({user,propertyId:'property-one',file:{filename:'direct.webp',mimeType:'image/webp',sizeBytes:bytes.length}});assert.equal(initiated.directUpload,true);assert.equal(initiated.photoId,'photo-1');assert.match(initiated.uploadUrl,/organizations\/org-one\/properties\/property-one\/photos\/photo-1\/versions\/v000001\/original-upload\.webp$/);
  const storageKey=initiated.uploadUrl.slice('memory://'.length);await storage.put(storageKey,bytes,{contentType:'image/webp'});const completed=await service.completeUpload({user,propertyId:'property-one',photoId:initiated.photoId,metadata:{caption:'Direct upload'},file:{filename:'direct.webp',mimeType:'image/webp',sizeBytes:bytes.length}});assert.equal(completed.caption,'Direct upload');assert.equal(completed.currentVersionMetadata.scanStatus,'CLEAN');assert.equal(storage._state.objects.size,2);
});
test('authorization, duplicate, scanner and redistribution failures fail closed',async()=>{
  const {service}=await setup(),bytes=await image('jpeg','ONE'),photo=await service.upload({user,propertyId:'property-one',metadata:{},file:{filename:'one.jpg',mimeType:'image/jpeg',bytes}});
  await assert.rejects(()=>service.upload({user,propertyId:'property-one',metadata:{},file:{filename:'copy.jpg',mimeType:'image/jpeg',bytes}}),error=>error.code==='DUPLICATE_PHOTO_CONTENT');
  await assert.rejects(()=>service.list({user:other,propertyId:'property-one'}),error=>error.code==='PHOTO_PROPERTY_NOT_FOUND');
  const refs=[{photoId:photo.id,version:1}];await assert.rejects(()=>service.reportPhotos({user,propertyId:'property-one',scenario:{id:'s',revision:1,photoSelections:refs}}),error=>error.code==='PHOTO_REDISTRIBUTION_ACKNOWLEDGMENT_REQUIRED');
  await assert.rejects(()=>service.reportPhotos({user,propertyId:'property-one',scenario:{id:'s',revision:1,photoSelections:refs,photoRightsAcknowledgment:{confirmed:true,userId:user.uid,organizationId:'org-one',confirmedAt:now.toISOString(),scenarioId:'s',revision:1,selectionFingerprint:'wrong'}}}),error=>error.code==='PHOTO_REDISTRIBUTION_ACKNOWLEDGMENT_REQUIRED');
  const tooMany=Array.from({length:13},(_,index)=>({photoId:`photo-${index}`,version:1}));await assert.rejects(()=>service.reportPhotos({user,propertyId:'property-one',scenario:{id:'s',revision:1,photoSelections:tooMany,photoRightsAcknowledgment:{confirmed:true,userId:user.uid,organizationId:'org-one',confirmedAt:now.toISOString(),scenarioId:'s',revision:1,selectionFingerprint:photoSelectionFingerprint(tooMany)}}}),error=>error.code==='PHOTO_REPORT_LIMIT');
  const repository=createMemoryPropertyPhotoRepository(),storage=createMemoryPrivateDocumentStorage(),infected=createPropertyPhotoService({repository,storage,malwareScanner:{async scan(){return {available:true,clean:false,result:'INFECTED'};}},durableProperties:{async get(){return {id:'property-one'};}}});await assert.rejects(()=>infected.upload({user,propertyId:'property-one',metadata:{},file:{filename:'infected.jpg',mimeType:'image/jpeg',bytes}}),error=>error.code==='PHOTO_MALWARE_DETECTED');assert.equal(storage._state.objects.size,0);
});

test('report rendering is optional, photo-aware and financially invariant',async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/pi-v3-2-taft-property-photo-qa.json',import.meta.url),'utf8')),property=fixture.property,scenario=fixture.scenario,generatedAt='2026-10-28T23:30:00.000Z',baseline=reportModel(property,scenario,{generatedAt}).analysis;
  const bytes=await image('jpeg','REPORT'),dataUrl=`data:image/jpeg;base64,${bytes.toString('base64')}`,photos=Array.from({length:8},(_,index)=>({photo:{id:`photo-${index+1}`,caption:`Synthetic QA photo ${index+1}`,category:index?'INTERIOR':'EXTERIOR',sourceDescription:'PI V3.2 offline fixture',isCover:index===0},version:{version:1,derivativeSha256:'a'.repeat(64)},dataUrl}));
  const withoutPhotos=workspaceReportHtml(property,scenario,fixture.evidence,'full',{generatedAt,photos:[]}),withPhotos=workspaceReportHtml(property,scenario,fixture.evidence,'full',{generatedAt,photos,qaNotForDistribution:true}),brief=workspaceReportHtml(property,scenario,fixture.evidence,'brief',{generatedAt,photos});
  assert.doesNotMatch(withoutPhotos,/<h1>Property photo overview|<div class="photo-gallery-report"|<figure class="brief-photo"/);
  assert.match(withPhotos,/<h1>Property photo overview/);assert.match(withPhotos,/<h1>Property Condition &amp; Rehabilitation Photos/);assert.match(withPhotos,/Photo evidence boundary/);assert.match(withPhotos,/SYNTHETIC QA \/ NOT FOR INVESTOR DISTRIBUTION/);
  assert.match(brief,/<figure class="brief-photo"/);assert.doesNotMatch(brief,/<h1>Property photo overview|<h1>Property Condition/);
  assert.match(withPhotos,/Current occupancy/);assert.match(withPhotos,/Advertised delivery condition/);assert.match(withPhotos,/Possession \/ vacancy confirmation/);
  assert.deepEqual(reportModel(property,{...scenario,photoSelections:photos.map(item=>({photoId:item.photo.id,version:1,isCover:item.photo.isCover}))},{generatedAt}).analysis,baseline);
});

test('report controls explain missing photo permission while standalone checklists remain available',async()=>{
  const [workspace,checklist,cloud,local]=await Promise.all([
    readFile(new URL('../apps/web/src/features/investment-workspace/Workspace.jsx',import.meta.url),'utf8'),
    readFile(new URL('../apps/web/src/features/investment-workspace/InteractiveChecklist.jsx',import.meta.url),'utf8'),
    readFile(new URL('../src/auth/netlify-auth.js',import.meta.url),'utf8'),
    readFile(new URL('../src/investment-workspace/server.js',import.meta.url),'utf8')
  ]);
  assert.match(workspace,/Photo permission is required before generating an investor report/);
  assert.match(workspace,/Review photos and confirm permission/);
  assert.match(workspace,/photoRightsMissing&&kind!=='checklist'/);
  assert.match(checklist,/reportBlockedReason/);
  assert.match(checklist,/disabled=\{Boolean\(reportBlockedReason\)\}/);
  assert.match(cloud,/kind!=='checklist'.*reportPhotos/);
  assert.match(local,/input\.kind!=='checklist'.*reportPhotos/);
});
