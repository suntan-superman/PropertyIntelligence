import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPropertyPhotoService,photoSelectionFingerprint,PropertyPhotoError,PHOTO_CLASSIFICATIONS} from '../src/investment-workspace/property-photos.js';
import {createMemoryPropertyPhotoRepository} from '../src/investment-workspace/memory-property-photos.js';
import {createMemoryPrivateDocumentStorage} from '../src/investment-workspace/memory-supporting-documents.js';
import {createMockMalwareScanner} from '../src/investment-workspace/supporting-documents.js';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {reportModel} from '../src/investment-workspace/report-model.js';

const user={uid:'concept-analyst',organizationId:'org-one',role:'Analyst'},other={...user,organizationId:'org-two'},now=new Date('2026-10-30T17:00:00.000Z');
const originalUrl=new URL('./fixtures/pi-v3-4-2-renovation-concepts/existing-condition.jpg',import.meta.url),conceptUrl=new URL('./fixtures/pi-v3-4-2-renovation-concepts/ai-renovation-concept.png',import.meta.url);
async function setup(){
  const repository=createMemoryPropertyPhotoRepository(),storage=createMemoryPrivateDocumentStorage(),durableProperties={async get({user:actor,id}){if(actor.organizationId!=='org-one'||id!=='property-one')throw new PropertyPhotoError('PHOTO_PROPERTY_NOT_FOUND',404);return {id};}},ids=['actual-photo','concept-photo','extra-concept'];
  const service=createPropertyPhotoService({repository,storage,malwareScanner:createMockMalwareScanner({clock:()=>now}),durableProperties,clock:()=>now,idFactory:()=>ids.shift()});
  const actual=await service.upload({user,propertyId:'property-one',metadata:{classification:PHOTO_CLASSIFICATIONS.ACTUAL,caption:'Existing front condition',category:'EXTERIOR',sourceDescription:'Owner-provided local QA fixture'},file:{filename:'existing-condition.jpg',mimeType:'image/jpeg',bytes:await readFile(originalUrl)}});
  const concept=await service.upload({user,propertyId:'property-one',metadata:{classification:PHOTO_CLASSIFICATIONS.CONCEPT,caption:'Welcoming landscaped bungalow yard',conceptTitle:'Welcoming landscaped bungalow yard',improvementDescription:'Illustrative exterior finish, landscape, lighting, fencing and hardscape concept.',originalPhotoId:actual.id,originalPhotoVersion:actual.currentVersion,includeInReports:true,selectedAsCover:true,redistributionAcknowledgment:true},file:{filename:'ai-renovation-concept.png',mimeType:'image/png',bytes:await readFile(conceptUrl)}});
  const references=[{photoId:concept.id,version:concept.currentVersion,originalPhotoId:actual.id,originalPhotoVersion:actual.currentVersion,conceptTitle:concept.conceptTitle,improvementDescription:concept.improvementDescription,selectedAsCover:true}],scenario={id:'scenario-one',revision:2,renovationConceptSelections:references,renovationConceptRightsAcknowledgment:{confirmed:true,userId:user.uid,organizationId:user.organizationId,confirmedAt:now.toISOString(),scenarioId:'scenario-one',revision:2,selectionFingerprint:photoSelectionFingerprint(references)}};
  return {service,repository,storage,actual,concept,references,scenario};
}

test('AI concept upload creates a stable exact-version pair without changing the original',async()=>{
  const {service,repository,actual,concept}=await setup(),gallery=await service.list({user,propertyId:'property-one'}),rawActual=await repository.get('org-one','property-one',actual.id);
  assert.equal(gallery.length,2);assert.equal(actual.classification,PHOTO_CLASSIFICATIONS.ACTUAL);assert.equal(concept.classification,PHOTO_CLASSIFICATIONS.CONCEPT);assert.equal(concept.originalPhotoId,actual.id);assert.equal(concept.originalPhotoVersion,1);assert.equal(concept.conditionClaim,null);assert.equal(rawActual.caption,'Existing front condition');assert.equal(rawActual.currentVersion,1);
  await assert.rejects(()=>service.update({user,propertyId:'property-one',photoId:concept.id,patch:{originalPhotoVersion:2}}),error=>error.code==='CONCEPT_ASSOCIATION_IMMUTABLE');
  await assert.rejects(()=>service.update({user,propertyId:'property-one',photoId:concept.id,patch:{isCover:true}}),error=>error.code==='CONCEPT_CANNOT_BE_PROPERTY_COVER');
});

test('concept eligibility, permission, tenant isolation and evidence boundaries fail closed',async()=>{
  const {service,concept,scenario}=await setup();
  const report=await service.reportConcepts({user,propertyId:'property-one',scenario,auditInclusion:true});assert.equal(report.length,1);assert.equal(report[0].concept.classification,PHOTO_CLASSIFICATIONS.CONCEPT);assert.equal(report[0].original.photo.classification,PHOTO_CLASSIFICATIONS.ACTUAL);
  await assert.rejects(()=>service.reportConcepts({user,propertyId:'property-one',scenario:{...scenario,renovationConceptRightsAcknowledgment:null}}),error=>error.code==='CONCEPT_REDISTRIBUTION_ACKNOWLEDGMENT_REQUIRED');
  await assert.rejects(()=>service.reportConcepts({user:other,propertyId:'property-one',scenario}),error=>error.code==='PHOTO_PROPERTY_NOT_FOUND');
  const actualScenario={id:'scenario-one',revision:2,photoSelections:[{photoId:concept.id,version:1}],photoRightsAcknowledgment:{confirmed:true,userId:user.uid,organizationId:user.organizationId,confirmedAt:now.toISOString(),scenarioId:'scenario-one',revision:2,selectionFingerprint:photoSelectionFingerprint([{photoId:concept.id,version:1}])}};
  await assert.rejects(()=>service.reportPhotos({user,propertyId:'property-one',scenario:actualScenario}),error=>error.code==='CONCEPT_NOT_PROPERTY_EVIDENCE');
});

test('soft removal preserves immutable concept report reproducibility and stored bytes',async()=>{
  const {service,storage,concept,scenario}=await setup(),before=storage._state.objects.size;
  await service.update({user,propertyId:'property-one',photoId:concept.id,patch:{removed:true}});assert.equal((await service.list({user,propertyId:'property-one'})).length,1);assert.equal(storage._state.objects.size,before);assert.equal((await service.reportConcepts({user,propertyId:'property-one',scenario})).length,1);
});

test('Full Investor Package adds concept cover and paired page while brief stays single analytical page',async()=>{
  const {service,scenario:conceptScenario}=await setup(),concepts=await service.reportConcepts({user,propertyId:'property-one',scenario:conceptScenario}),fixture=JSON.parse(await readFile(new URL('./fixtures/pi-v3-2-taft-property-photo-qa.json',import.meta.url),'utf8')),generatedAt='2026-10-30T17:30:00.000Z';
  const baseline=reportModel(fixture.property,fixture.scenario,{generatedAt}).analysis,full=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'full',{generatedAt,renovationConcepts:concepts,qaNotForDistribution:true}),brief=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'brief',{generatedAt,renovationConcepts:concepts}),without=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'full',{generatedAt});
  assert.match(full,/AI-GENERATED RENOVATION CONCEPT/);assert.match(full,/Renovation Vision — Existing Condition &amp; Concept/);assert.match(full,/AI-generated conceptual renovation/);assert.match(full,/not property-condition evidence/i);assert.match(full,/EXISTING CONDITION/);assert.match(full,/AI RENOVATION CONCEPT/);
  assert.doesNotMatch(without,/Renovation Vision — Existing Condition/);assert.match(brief,/AI-GENERATED RENOVATION CONCEPT/);assert.equal((brief.match(/class="page/g)??[]).length,1);assert.doesNotMatch(brief,/Renovation Vision — Existing Condition/);
  assert.deepEqual(reportModel(fixture.property,{...fixture.scenario,renovationConceptSelections:conceptScenario.renovationConceptSelections},{generatedAt}).analysis,baseline);
});

test('UI and report pipeline expose the paired concept workflow without a generation API',async()=>{
  const [ui,cloud,local]=await Promise.all([readFile(new URL('../apps/web/src/features/investment-workspace/PropertyPhotos.jsx',import.meta.url),'utf8'),readFile(new URL('../src/auth/netlify-auth.js',import.meta.url),'utf8'),readFile(new URL('../src/investment-workspace/server.js',import.meta.url),'utf8')]);
  assert.match(ui,/Create Before\/Concept Pair/);assert.match(ui,/AI concepts never count as condition evidence/);assert.match(ui,/originalPhotoVersion/);assert.doesNotMatch(ui,/imagegen|openai|generateConcept/i);assert.match(cloud,/reportConcepts/);assert.match(local,/reportConcepts/);
});
