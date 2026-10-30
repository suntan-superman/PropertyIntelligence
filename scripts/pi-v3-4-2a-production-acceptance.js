import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createCanvas} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT=path.resolve(import.meta.dirname,'..');
const ORIGIN='https://worksidepropertyintelligence.netlify.app';
const PROPERTY_ID='911fb89d-0d92-4eb3-b61a-670a6b816f71';
const SCENARIO_ID='ff0642bd-92e6-4d0f-b81c-538f0245aaa1';
const EXPECTED_BASELINE_REVISION=6;
const EXPECTED_DEPLOY_COMMIT='9a626e8f5d1f3e0441caf6638138a0f9427f0d4d';
const EXECUTE=process.argv.includes('--execute');
const DIAGNOSE=process.argv.includes('--diagnose');
const RESUME=process.argv.includes('--resume');
const VERIFY_EXISTING=process.argv.includes('--verify-existing');
const OUTPUT=path.join(ROOT,'data','validation','pi-v3-4-2a-report-image-defaults-production');
if(typeof process.loadEnvFile==='function')process.loadEnvFile(path.join(ROOT,'.env'));
for(const key of ['ADMIN_EMAIL','ADMIN_PW'])assert.ok(String(process.env[key]??'').trim(),`${key}_REQUIRED`);

const jar=new Map();
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const html=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const photoLabel=category=>({EXTERIOR:'Exterior Photo',INTERIOR:'Interior Photo',KITCHEN:'Kitchen Photo',BATHROOM:'Bathroom Photo',ROOF:'Roof Photo',FOUNDATION:'Property Condition Photo',REPAIRS_DAMAGE:'Property Condition Photo',CONDITION:'Property Condition Photo',LANDSCAPING:'Exterior Photo',OTHER:'Property Photo'})[category]??'Property Photo';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const hash=value=>createHash('sha256').update(Buffer.isBuffer(value)?value:JSON.stringify(stable(value))).digest('hex');
const projection=scenario=>({inputs:scenario.inputs,analysis:{deterministic:scenario.analysis?.deterministic,mao:scenario.analysis?.mao,monteCarlo:scenario.analysis?.monteCarlo},risk:scenario.risk});
const canonicalFinancial=value=>Array.isArray(value)?value.map(canonicalFinancial):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['provenance','assumptionsVersion','interpretations'].includes(key)).map(([key,child])=>[key,canonicalFinancial(child)])):value;
const financialProjection=scenario=>canonicalFinancial(projection(scenario));
function absorb(response){for(const header of response.headers.getSetCookie?.()??[]){const pair=header.split(';',1)[0],index=pair.indexOf('=');if(index>0)jar.set(pair.slice(0,index),pair.slice(index+1));}}
const cookie=()=>[...jar].map(([key,value])=>`${key}=${value}`).join('; ');
async function responseJson(response){const body=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(body.error??`HTTP_${response.status}`),{status:response.status,body});return body;}
async function request(route,{method='GET',body=null,csrfToken=null,binary=false}={}){
  const response=await fetch(`${ORIGIN}${route}`,{method,headers:{Cookie:cookie(),...(method!=='GET'?{Origin:ORIGIN}:{}),...(body?{'Content-Type':'application/json','X-PI-Workspace':'local-v1'}:{}),...(csrfToken?{'X-PI-CSRF':csrfToken}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  if(binary){if(!response.ok)await responseJson(response);return response;}
  return responseJson(response);
}
async function signIn(){
  jar.clear();
  const configResponse=await fetch(`${ORIGIN}/api/auth/config`,{cache:'no-store'}),config=await responseJson(configResponse);absorb(configResponse);
  const firebaseResponse=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.firebaseConfig.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PW,returnSecureToken:true})}),firebaseUser=await responseJson(firebaseResponse),sessionResponse=await fetch(`${ORIGIN}/api/auth/session`,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json','X-PI-CSRF':config.csrfToken,Cookie:cookie()},body:JSON.stringify({idToken:firebaseUser.idToken})});
  absorb(sessionResponse);await responseJson(sessionResponse);
  const me=await request('/api/auth/me');assert.ok(['Administrator','Platform Administrator'].includes(me.user.role));assert.equal(me.user.organizationId,'property-intelligence-local');assert.equal(me.user.emailVerified,true);
  return {csrfToken:config.csrfToken,user:me.user};
}
async function state(){
  const listed=await request('/api/durable-properties?includeArchived=true'),property=listed.properties.find(item=>item.id===PROPERTY_ID);assert.ok(property,'TYLER_PROPERTY_NOT_FOUND');assert.match(property.address,/603\s+Tyler\s+St/i);assert.equal(property.organizationId,'property-intelligence-local');
  const workspace=await request(`/api/durable-properties/${property.id}/workspace`),links=workspace.revisions.filter(item=>item.scenarioId===SCENARIO_ID&&item.scenario).sort((a,b)=>b.revision-a.revision),scenario=links[0]?.scenario;assert.ok(scenario,'TYLER_SCENARIO_NOT_FOUND');assert.equal(scenario.propertyRef,property.sourceSubjectRef);assert.ok(scenario.analysis?.deterministic);assert.ok(scenario.analysis?.monteCarlo);
  const register=await request(`/api/durable-properties/${property.id}/photos`);return {property,workspace,scenario,photos:register.photos};
}
function selections(current){
  const byId=new Map(current.photos.map(photo=>[photo.id,photo])),actual=current.scenario.photoSelections.map(reference=>({reference,photo:byId.get(reference.photoId)})),concepts=current.scenario.renovationConceptSelections.map(reference=>({reference,photo:byId.get(reference.photoId)}));
  assert.ok(actual.length,'NO_ACTUAL_REPORT_PHOTOS_SELECTED');
  for(const item of actual){assert.ok(item.photo,`PHOTO_NOT_FOUND_${item.reference.photoId}`);assert.equal(item.photo.classification,'ACTUAL_PROPERTY_PHOTO');assert.equal(item.photo.currentVersion,item.reference.version);assert.equal(item.photo.currentVersionMetadata?.scanStatus,'CLEAN');assert.equal(item.photo.deletedAt,null);}
  assert.ok(concepts.length,'NO_RENOVATION_CONCEPT_SELECTED');
  for(const item of concepts){assert.ok(item.photo,`CONCEPT_NOT_FOUND_${item.reference.photoId}`);assert.equal(item.photo.classification,'AI_GENERATED_CONCEPT');assert.equal(item.photo.currentVersion,item.reference.version);assert.equal(item.photo.currentVersionMetadata?.scanStatus,'CLEAN');assert.equal(item.photo.deletedAt,null);assert.equal(item.photo.redistributionAcknowledgment,true);}
  const selected=actual.find(item=>item.reference.isCover===true)??actual.find(item=>item.reference.category==='EXTERIOR'||item.photo.category==='EXTERIOR')??actual[0];
  return {actual,concepts,primary:selected};
}
function assertPreview(preview,kind,selected){
  assert.match(preview.html,/603\s+Tyler\s+St/i);assert.equal(preview.classification,'PRELIMINARY');
  const caption=clean(selected.primary.reference.caption||selected.primary.photo.caption||photoLabel(selected.primary.reference.category||selected.primary.photo.category));
  assert.ok(caption,'PRIMARY_ACTUAL_PHOTO_CAPTION_REQUIRED');
  if(kind==='full'){
    const cover=preview.html.match(/<!-- PI_FULL_PACKAGE_COVER_START -->([\s\S]*?)<!-- PI_FULL_PACKAGE_COVER_END -->/)?.[1]??'';assert.ok(cover,'FULL_PACKAGE_COVER_MISSING');assert.ok(cover.includes('cover-photo'),'ACTUAL_COVER_PHOTO_MISSING');assert.ok(cover.includes(html(caption)),'SELECTED_ACTUAL_COVER_NOT_USED');for(const item of selected.concepts)assert.ok(!cover.includes(html(item.photo.conceptTitle)),'AI_CONCEPT_USED_AS_COVER');
    assert.match(preview.html,/Renovation Vision — Existing Condition &amp; Concept/);assert.match(preview.html,/AI RENOVATION CONCEPT/);
  }else{
    const hero=preview.html.match(/<header class="hero[\s\S]*?<\/header>/)?.[0]??'';assert.ok(hero.includes('brief-photo'),'OPPORTUNITY_BRIEF_ACTUAL_THUMBNAIL_MISSING');assert.ok(hero.includes(html(caption)),'OPPORTUNITY_BRIEF_WRONG_THUMBNAIL');for(const item of selected.concepts)assert.ok(!hero.includes(html(item.photo.conceptTitle)),'AI_CONCEPT_USED_AS_BRIEF_THUMBNAIL');
  }
}
async function preview(scenario,kind,selected){const result=await request('/api/investment/report',{method:'POST',body:{id:scenario.id,revision:scenario.revision,kind,pdf:false}});assertPreview(result,kind,selected);return {kind,filename:result.filename,classification:result.classification};}
async function generatePdf(session,scenario,kind){
  const response=await request('/api/investment/report/pdf',{method:'POST',csrfToken:session.csrfToken,body:{id:scenario.id,revision:scenario.revision,kind,pdf:true,requestId:randomUUID()},binary:true}),bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');const disposition=response.headers.get('content-disposition')??'',filename=disposition.match(/filename="([^"]+)"/)?.[1]??`Tyler-${kind}-R${scenario.revision}.pdf`;assert.match(filename,new RegExp(`R${scenario.revision}\\.pdf$`));await writeFile(path.join(OUTPUT,filename),bytes);return {kind,filename,bytes,headerPages:Number(response.headers.get('x-pi-report-pages')??0),appendixPages:Number(response.headers.get('x-pi-appendix-pages')??0)};
}
async function inspectPdf(item){
  const standardFontDataUrl=pathToFileURL(path.join(ROOT,'node_modules/pdfjs-dist/standard_fonts')+path.sep).href,pdf=await getDocument({data:new Uint8Array(item.bytes),useSystemFonts:true,standardFontDataUrl,verbosity:0}).promise,pages=[];
  try{for(let number=1;number<=pdf.numPages;number++){const page=await pdf.getPage(number),content=await page.getTextContent(),items=content.items.filter(value=>value.str?.trim()),text=clean(items.map(value=>value.str).join(' ')),viewport=page.getViewport({scale:1}),outOfBounds=items.filter(value=>value.transform[4]<-1||value.transform[4]+value.width>viewport.width+2||value.transform[5]<-1||value.transform[5]>viewport.height+2);assert.ok(text.length>80,`${item.kind.toUpperCase()}_SPARSE_PAGE_${number}`);assert.equal(outOfBounds.length,0,`${item.kind.toUpperCase()}_CLIPPED_PAGE_${number}`);pages.push({number,text,characters:text.length,outOfBounds:outOfBounds.length});if(number===1||(item.kind==='full'&&number===2)){const view=page.getViewport({scale:1.5}),canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;await writeFile(path.join(OUTPUT,`${item.kind}-page-${number}.png`),canvas.toBuffer('image/png'));}}}finally{await pdf.destroy();}
  const text=pages.map(page=>page.text).join(' ');assert.match(text,/603\s+Tyler\s+St/i);assert.ok(pages.every(page=>page.text.includes(`Page ${page.number} of ${pages.length}`)||page.text.includes(`${page.number} / ${pages.length}`)),`${item.kind.toUpperCase()}_PAGINATION_INCOMPLETE`);
  if(item.kind==='brief'){assert.equal(pages.length,1,'OPPORTUNITY_BRIEF_MUST_REMAIN_ONE_PAGE');assert.ok(pages[0].text.replace(/\s+/g,'').toUpperCase().includes('OPPORTUNITYBRIEF'));}
  if(item.kind==='full'){assert.ok(pages[0].text.replace(/\s+/g,'').toUpperCase().includes('FULLINVESTORPACKAGE'));const comparison=pages[1].text.replace(/\s+/g,'').toUpperCase();assert.ok(comparison.includes('RENOVATIONVISION'));assert.ok(comparison.includes('EXISTINGCONDITION'));assert.ok(comparison.includes('AIRENOVATIONCONCEPT'));}
  return {kind:item.kind,filename:item.filename,bytes:item.bytes.length,sha256:hash(item.bytes),pageCount:pages.length,reportPages:item.headerPages,appendixPages:item.appendixPages,pages:pages.map(({number,characters,outOfBounds})=>({number,characters,outOfBounds}))};
}

await mkdir(OUTPUT,{recursive:true});
const session=await signIn(),before=await state(),selectedBefore=selections(before),scenarioRevisions=before.workspace.revisions.filter(item=>item.scenarioId===SCENARIO_ID&&item.scenario).map(item=>item.scenario),baselineScenario=scenarioRevisions.find(item=>item.revision===EXPECTED_BASELINE_REVISION),projectionBefore=hash(financialProjection(baselineScenario)),historicalReports=before.workspace.reports.filter(report=>report.revision<=EXPECTED_BASELINE_REVISION).map(({id,scenarioId,revision,kind,filename,generatedAt})=>({id,scenarioId,revision,kind,filename,generatedAt}));assert.ok(baselineScenario,'R6_BASELINE_NOT_FOUND');
if(DIAGNOSE){
  const revisions=before.workspace.revisions.filter(item=>item.scenarioId===SCENARIO_ID&&item.scenario).map(item=>item.scenario).sort((a,b)=>a.revision-b.revision),baseline=revisions.find(item=>item.revision===EXPECTED_BASELINE_REVISION),current=revisions.find(item=>item.revision===EXPECTED_BASELINE_REVISION+1);assert.ok(baseline&&current,'R6_AND_R7_REQUIRED_FOR_DIAGNOSIS');
  const differences=[];function compare(left,right,key='projection'){if(Object.is(left,right))return;if(Array.isArray(left)&&Array.isArray(right)){for(let index=0;index<Math.max(left.length,right.length);index++)compare(left[index],right[index],`${key}[${index}]`);return;}if(left&&right&&typeof left==='object'&&typeof right==='object'){for(const child of new Set([...Object.keys(left),...Object.keys(right)]))compare(left[child],right[child],`${key}.${child}`);return;}differences.push({key,before:left??null,after:right??null});}compare(projection(baseline),projection(current));
  process.stdout.write(`${JSON.stringify({baselineRevision:baseline.revision,currentRevision:current.revision,baselineHash:hash(projection(baseline)),currentHash:hash(projection(current)),differences,reportsForR7:before.workspace.reports.filter(report=>report.scenarioId===SCENARIO_ID&&report.revision===EXPECTED_BASELINE_REVISION+1)},null,2)}\n`);process.exit(0);
}
assert.equal(before.scenario.id,SCENARIO_ID);assert.equal(before.scenario.revision,RESUME||VERIFY_EXISTING?EXPECTED_BASELINE_REVISION+1:EXPECTED_BASELINE_REVISION,RESUME||VERIFY_EXISTING?'R7_RESUME_REVISION_NOT_AVAILABLE':'BASELINE_REVISION_CHANGED_ABORTING');const reportsExist=before.workspace.reports.some(report=>report.scenarioId===SCENARIO_ID&&report.revision===EXPECTED_BASELINE_REVISION+1);assert.equal(reportsExist,VERIFY_EXISTING,VERIFY_EXISTING?'R7_REPORTS_NOT_AVAILABLE_FOR_VERIFICATION':'R7_REPORT_ALREADY_EXISTS_ABORTING');assert.equal(hash(financialProjection(before.scenario)),projectionBefore,'FINANCIAL_OR_MONTE_CARLO_RESULTS_CHANGED');
const preflightPreviews=[];for(const kind of ['brief','full'])preflightPreviews.push(await preview(before.scenario,kind,selectedBefore));
const preflight={status:'PASS',at:new Date().toISOString(),origin:ORIGIN,deployment:{commit:EXPECTED_DEPLOY_COMMIT},property:{id:before.property.id,address:before.property.address},scenario:{id:before.scenario.id,revision:before.scenario.revision,evidenceFingerprint:before.scenario.evidenceFingerprint,projectionSha256:projectionBefore},photos:{actual:selectedBefore.actual.map(item=>({id:item.photo.id,version:item.reference.version,caption:item.reference.caption||item.photo.caption,category:item.reference.category||item.photo.category,isCover:item.reference.isCover===true,sha256:item.photo.currentVersionMetadata.sha256})),primaryActualPhotoId:selectedBefore.primary.photo.id,concepts:selectedBefore.concepts.map(item=>({id:item.photo.id,version:item.reference.version,title:item.photo.conceptTitle,selectedAsCoverHistoricalMetadata:item.reference.selectedAsCover===true,sha256:item.photo.currentVersionMetadata.sha256}))},previews:preflightPreviews,historicalReportCount:historicalReports.length,providerRequests:0};
await writeFile(path.join(OUTPUT,'preflight.json'),`${JSON.stringify(preflight,null,2)}\n`);
if(!EXECUTE&&!VERIFY_EXISTING){process.stdout.write(`${JSON.stringify({output:OUTPUT,...preflight},null,2)}\n`);process.exit(0);}

const saved=RESUME||VERIFY_EXISTING?before.scenario:await request('/api/investment/save',{method:'POST',csrfToken:session.csrfToken,body:before.scenario});assert.equal(saved.id,SCENARIO_ID);assert.equal(saved.revision,EXPECTED_BASELINE_REVISION+1);assert.equal(hash(financialProjection(saved)),projectionBefore,'FINANCIAL_OR_MONTE_CARLO_CHANGED_ON_SAVE');
const afterSave=await state();assert.equal(afterSave.scenario.revision,saved.revision);const selectedAfter=selections(afterSave);assert.equal(selectedAfter.primary.photo.id,selectedBefore.primary.photo.id);assert.equal(hash(financialProjection(afterSave.scenario)),projectionBefore);
const previews=[];for(const kind of ['brief','full'])previews.push(await preview(afterSave.scenario,kind,selectedAfter));
const generated=[];if(VERIFY_EXISTING){const files=await readdir(OUTPUT);for(const kind of ['brief','full']){const marker=kind==='brief'?'Opportunity_Brief':'Full_Investor_Package',filename=files.find(value=>value.includes(marker)&&value.endsWith('_R7.pdf'));assert.ok(filename,`${kind.toUpperCase()}_R7_PDF_NOT_FOUND`);generated.push({kind,filename,bytes:await readFile(path.join(OUTPUT,filename)),headerPages:0,appendixPages:0});}}else for(const kind of ['brief','full'])generated.push(await generatePdf(session,afterSave.scenario,kind));
const inspections=[];for(const item of generated)inspections.push(await inspectPdf(item));
const finalState=await state(),finalProjection=hash(financialProjection(finalState.scenario)),newReports=finalState.workspace.reports.filter(report=>!historicalReports.some(old=>old.id===report.id));assert.equal(finalState.scenario.revision,EXPECTED_BASELINE_REVISION+1);assert.equal(finalProjection,projectionBefore);assert.equal(newReports.length,2,'EXPECTED_EXACTLY_TWO_NEW_REPORT_HISTORY_RECORDS');assert.deepEqual(newReports.map(report=>report.kind).sort(),['brief','full']);assert.ok(newReports.every(report=>report.revision===EXPECTED_BASELINE_REVISION+1));assert.ok(newReports.every(report=>report.propertyPhotoCount===selectedAfter.actual.length));assert.ok(newReports.every(report=>report.renovationConceptCount===selectedAfter.concepts.length));
for(const old of historicalReports){const preserved=finalState.workspace.reports.find(report=>report.id===old.id);assert.ok(preserved,`HISTORICAL_REPORT_REMOVED_${old.id}`);assert.deepEqual({id:preserved.id,scenarioId:preserved.scenarioId,revision:preserved.revision,kind:preserved.kind,filename:preserved.filename,generatedAt:preserved.generatedAt},old);}
const result={status:'PASS',classification:'PI V3.4.2a — REPORT IMAGE DEFAULTS CORRECTION: PRODUCTION ACCEPTED',completedAt:new Date().toISOString(),origin:ORIGIN,deployment:{commit:EXPECTED_DEPLOY_COMMIT},authentication:{role:session.user.role,organizationId:session.user.organizationId,emailVerified:session.user.emailVerified},property:preflight.property,scenario:{id:saved.id,baselineRevision:EXPECTED_BASELINE_REVISION,newRevision:saved.revision,evidenceFingerprint:saved.evidenceFingerprint,financialAndMonteCarloProjectionSha256Before:projectionBefore,financialAndMonteCarloProjectionSha256After:finalProjection,invariant:true},photos:preflight.photos,reports:inspections,reportHistory:{historicalCountBefore:historicalReports.length,historicalCountAfter:finalState.workspace.reports.length,newReports:newReports.map(report=>({id:report.id,kind:report.kind,revision:report.revision,filename:report.filename,generatedAt:report.generatedAt})),historicalReportsPreserved:true},resourceUsage:{scenarioRevisionsCreated:1,reportTransactions:2,newPhotoUploads:0,malwareScans:0,providerRequests:0,automaticRetries:0},verification:{actualPhotoOnFullPackageCover:true,actualPhotoOnOpportunityBrief:true,aiConceptExcludedFromPrimaryImages:true,beforeConceptComparisonPreserved:true,opportunityBriefOnePage:true,historicalReportsImmutable:true,financialAndMonteCarloInvariant:true}};
await writeFile(path.join(OUTPUT,'acceptance-report.json'),`${JSON.stringify(result,null,2)}\n`);process.stdout.write(`${JSON.stringify({output:OUTPUT,...result},null,2)}\n`);
