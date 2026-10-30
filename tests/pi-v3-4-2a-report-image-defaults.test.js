import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {workspaceReportHtml} from '../src/investment-workspace/report-html.js';
import {reportModel} from '../src/investment-workspace/report-model.js';

const generatedAt='2026-10-30T22:30:00.000Z';
const image=(id,caption,category,isCover=false)=>({
  photo:{id,caption,category,isCover,classification:'ACTUAL_PROPERTY_PHOTO',sourceDescription:'V3.4.2a local QA fixture'},
  version:{version:1,derivativeSha256:id.padEnd(64,'0').slice(0,64)},
  dataUrl:`data:image/jpeg;base64,${Buffer.from(id).toString('base64')}`
});
const concept=original=>({
  concept:{id:'ai-concept',conceptTitle:'AI exterior renovation concept',improvementDescription:'Presentation-only renovation idea.',selectedAsCover:true,classification:'AI_GENERATED_CONCEPT'},
  version:{version:1,derivativeSha256:'c'.repeat(64)},
  dataUrl:`data:image/jpeg;base64,${Buffer.from('ai-concept').toString('base64')}`,
  original
});
const coverSection=html=>html.match(/PI_FULL_PACKAGE_COVER_START[\s\S]*?PI_FULL_PACKAGE_COVER_END/)?.[0]??'';

test('actual selected cover wins over AI concept for Full Investor Package and Opportunity Brief',async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/pi-v3-2-taft-property-photo-qa.json',import.meta.url),'utf8'));
  const exterior=image('actual-exterior','Actual exterior fallback','EXTERIOR'),selected=image('actual-selected','Selected actual property cover','INTERIOR',true),conceptEntry=concept(exterior),photos=[exterior,selected],concepts=[conceptEntry],before=structuredClone({photos,concepts});
  const full=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'full',{generatedAt,photos,renovationConcepts:concepts}),brief=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'brief',{generatedAt,photos,renovationConcepts:concepts}),cover=coverSection(full);
  assert.match(cover,/Selected actual property cover/);assert.doesNotMatch(cover,/AI exterior renovation concept|AI_GENERATED_CONCEPT/);
  assert.match(brief,/<figure class="brief-photo"[\s\S]*Selected actual property cover/);assert.doesNotMatch(brief,/AI exterior renovation concept|AI_GENERATED_CONCEPT/);
  assert.equal((brief.match(/class="page/g)??[]).length,1,'Opportunity Brief remains one page');
  assert.match(full,/Renovation Vision — Existing Condition &amp; Concept/);assert.match(full,/EXISTING CONDITION/);assert.match(full,/AI RENOVATION CONCEPT/);
  assert.ok(full.indexOf('PI_FULL_PACKAGE_COVER_END')<full.indexOf('Renovation Vision — Existing Condition &amp; Concept'),'comparison remains immediately after the cover');
  assert.deepEqual({photos,concepts},before,'rendering does not rewrite historical image metadata or concept-cover flags');
});

test('actual exterior fallback is used when no eligible actual cover is selected',async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/pi-v3-2-taft-property-photo-qa.json',import.meta.url),'utf8')),interior=image('interior','Interior first in input','INTERIOR'),exterior=image('exterior','Eligible actual exterior','EXTERIOR'),concepts=[concept(interior)];
  const full=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'full',{generatedAt,photos:[interior,exterior],renovationConcepts:concepts}),brief=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'brief',{generatedAt,photos:[interior,exterior],renovationConcepts:concepts});
  assert.match(coverSection(full),/Eligible actual exterior/);assert.doesNotMatch(coverSection(full),/Interior first in input|AI exterior renovation concept/);
  assert.match(brief,/<figure class="brief-photo"[\s\S]*Eligible actual exterior/);
});

test('reports fall back to text-only primary presentation when no actual photo is eligible',async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/pi-v3-2-taft-property-photo-qa.json',import.meta.url),'utf8')),original=image('paired-original','Paired historical original','EXTERIOR'),concepts=[concept(original)];
  const full=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'full',{generatedAt,photos:[],renovationConcepts:concepts}),brief=workspaceReportHtml(fixture.property,fixture.scenario,fixture.evidence,'brief',{generatedAt,photos:[],renovationConcepts:concepts});
  assert.doesNotMatch(coverSection(full),/<figure class="cover-photo"|AI exterior renovation concept/);assert.doesNotMatch(brief,/<figure class="brief-photo"|AI exterior renovation concept/);
  assert.match(full,/Renovation Vision — Existing Condition &amp; Concept/,'AI concept remains in its dedicated comparison section');
});

test('image defaults do not change financial or Monte Carlo results',async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/pi-v3-2-taft-property-photo-qa.json',import.meta.url),'utf8')),baseline=reportModel(fixture.property,fixture.scenario,{generatedAt}).analysis,scenario={...fixture.scenario,photoSelections:[{photoId:'actual-selected',version:1,isCover:true}],renovationConceptSelections:[{photoId:'ai-concept',version:1,selectedAsCover:true}]};
  assert.deepEqual(reportModel(fixture.property,scenario,{generatedAt}).analysis,baseline);
});
