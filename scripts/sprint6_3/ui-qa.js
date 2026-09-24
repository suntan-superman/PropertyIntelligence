import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {buildPlan} from './source-plan.js';
import {parseCsv} from '../../src/sources/kern/csv.js';
import {filters} from '../../src/persistence/assessorOpportunityRepository.js';
import {startWorkbench} from '../../src/workbench/server.js';
import {browser} from '../../src/reports/pdf.js';
// Presentation fixtures only. Real PostgreSQL API/filter certification is separate.
const plan=await buildPlan(),csv=parseCsv(await readFile('data/validation/sprint6_2-kern-atn-crosswalk.csv','utf8'));
const certified=new Map(csv.rows.map(row=>{const r=Object.fromEntries(csv.headers.map((h,i)=>[h,row[i]]));return [r.normalized_pts_atn,r];}));
const rows=plan.rows.map((assessor,i)=>{const c=certified.get(assessor.pts_atn_normalized);return {id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,atn:assessor.pts_atn_normalized,priority_band:c.priority,screening_score:c.score,candidate_status:'NEEDS_ADDRESS',identity_status:'PARTIAL',records:[],signals:[],assessor:{...assessor,import_batch_id:'QA_PRESENTATION_ONLY'}};});
const dir='data/runtime/sprint6_3/visual';await mkdir(dir,{recursive:true});
await copyFile('docs/SPRINT6_2_SOURCE_DISCLAIMER.md',`${dir}/COUNTY_SOURCE_DISCLAIMER.md`);
const app=await startWorkbench({port:0,env:{},mapConfig:{configured:false}}),instance=await browser(),page=await instance.newPage({viewport:{width:1366,height:950}});
const errors=[],external=[],checks=[],opportunityQueries=[];let analyzeRequests=0,maxRows=0;
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==app.url){external.push(url.origin);return route.abort();}
  const reply=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname==='/api/opportunities'){
    opportunityQueries.push(url.search);
    const o=Object.fromEntries(url.searchParams),f=filters(o),selected=rows.filter(r=>(!f.priority||r.priority_band===f.priority)&&(!f.exact||r.assessor.crosswalk_status===f.exact)&&(!f.categories||f.categories.includes(r.assessor.research_use_category))&&(!f.hasSitus||r.assessor.situs_status==='SITUS_PRESENT')&&(!f.geometry||r.assessor.geometry_status==='GEOMETRY_EXACT')&&(!f.review||r.assessor.review_flags.length));
    const p=Number(o.page)||1,size=Math.min(Number(o.pageSize)||25,100),slice=selected.slice((p-1)*size,p*size);maxRows=Math.max(maxRows,slice.length);
    return reply({opportunities:slice,total:selected.length,page:p,pageSize:size,metrics:{counts:{records:11321,candidates:11316,needs_address:11316}}});
  }
  if(/^\/api\/opportunities\/[^/]+\/analyze$/.test(url.pathname)){analyzeRequests++;return route.fulfill({status:400,contentType:'application/json',body:analyzeRequests===1?'{"error":"ADDRESS_INVALID"}':'{"error":"ENRICHMENT_CONFIRMATION_REQUIRED"}'});}
  if(/^\/api\/opportunities\/[^/]+\/address-resolution$/.test(url.pathname))return reply({addressResolution:null,history:[]});
  if(/^\/api\/opportunities\/[^/]+$/.test(url.pathname))return reply({opportunity:rows.find(r=>r.id===url.pathname.split('/').pop())});
  return route.continue();
});
try{
  await page.goto(`${app.url}/#opportunities`);await page.getByText('Page 1 of 453 · 11,316 candidates',{exact:true}).waitFor();assert.equal(await page.locator('#opportunities tbody tr').count(),25);
  const sort=page.getByRole('combobox',{name:'Sort opportunities',exact:true});assert.equal(await sort.count(),1);assert.deepEqual(await sort.locator('option').allTextContents(),['All sort opportunities','Priority','Amount','Updated','Atn']);assert.equal(await page.locator('#opportunities thead th').first().evaluate(el=>getComputedStyle(el).position),'sticky');await sort.selectOption('atn');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.waitForFunction(()=>![...document.querySelectorAll('#opportunities .fixture-buttons button')].some(button=>button.disabled));checks.push('Sticky headers / server-side sorting control');
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Page 2 of 453 · 11,316 candidates',{exact:true}).waitFor();await page.waitForFunction(()=>![...document.querySelectorAll('#opportunities .fixture-buttons button')].some(button=>button.disabled));checks.push('25-row pagination');
  await page.getByRole('button',{name:'High Priority — Residential Buildings',exact:true}).click();await page.getByText('Page 1 of 5 · 118 candidates',{exact:true}).waitFor();await page.waitForFunction(()=>![...document.querySelectorAll('#opportunities .fixture-buttons button')].some(button=>button.disabled));
  await page.getByRole('button',{name:'High Priority — Single Family',exact:true}).click();await page.getByText('Page 1 of 4 · 81 candidates',{exact:true}).waitFor();await page.waitForFunction(()=>![...document.querySelectorAll('#opportunities .fixture-buttons button')].some(button=>button.disabled));checks.push('118 / 81 preset presentation');
  await page.locator('#opportunities tbody button').filter({hasText:/^View$/}).first().click();await page.getByRole('heading',{name:'County Assessments',exact:true}).waitFor();
  const detail=await page.locator('.opportunity-detail-drawer').innerText();for(const text of ['County Land Assessment','County Improvement Assessment','County Net Assessment','County Base-Year Value','not an independent market valuation','not independently verified','APN9','PI Research Category'])assert.ok(detail.includes(text));assert.doesNotMatch(detail,/owner|assessee|billing|care.of/i);
  const resolver=page.getByRole('dialog',{name:'Confirm canonical property address'});const confirmationModal=page.locator('.confirm-modal');const analyzeButton=page.locator('.opportunity-detail-drawer').getByRole('button',{name:'Analyze Property',exact:true});await analyzeButton.click();await page.waitForTimeout(150);if(await resolver.isVisible()){assert.match(await resolver.innerText(),/County situs/i);await resolver.getByRole('button',{name:'Cancel',exact:true}).click({force:true});checks.push('Incomplete county situs opens resolver and cancel makes zero analysis requests');}else{await confirmationModal.waitFor();assert.match(await confirmationModal.innerText(),/may consume RentCast quota/i);await confirmationModal.getByRole('button',{name:'Cancel',exact:true}).click();checks.push('Canceled provider confirmation makes zero analysis requests');}assert.equal(analyzeRequests,0);assert.match(page.url(),/#opportunities$/);
  if(await page.locator('.modal-backdrop').count())await page.locator('.modal-backdrop button').first().evaluate(el=>el.click());await page.waitForTimeout(50);
  await page.screenshot({path:`${dir}/desktop.png`,fullPage:true});
  if(!await page.locator('.opportunity-detail-drawer').count()){await page.locator('#opportunities tbody button').filter({hasText:/^View$/}).first().click();await page.locator('.opportunity-detail-drawer').waitFor();await page.waitForFunction(()=>!document.querySelector('.opportunity-detail-drawer')?.textContent.includes('Loading opportunity detail'));}await page.locator('.opportunity-detail-drawer').screenshot({path:`${dir}/desktop-detail.png`});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${dir}/mobile.png`,fullPage:true});await page.locator('.opportunity-detail-drawer').screenshot({path:`${dir}/mobile-detail.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No page-wide overflow at 390px');checks.push('1366px / 390px detail, labels and privacy');
  await page.keyboard.press('Escape');await page.waitForTimeout(50);await page.getByRole('button',{name:'Clear filters',exact:true}).click();await page.getByRole('combobox',{name:'Assessor status',exact:true}).selectOption('UNMATCHED');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.getByText('Page 1 of 3 · 53 candidates',{exact:true}).waitFor();const beforeUnmatched=analyzeRequests;await page.locator('#opportunities tbody button').filter({hasText:/^Analyze Property$/}).first().click();await page.getByRole('alert').waitFor();assert.equal(analyzeRequests,beforeUnmatched);assert.match(await page.getByRole('alert').innerText(),/exact county identity/i);
  await page.locator('#opportunities tbody button').filter({hasText:/^View$/}).first().click();await page.locator('.opportunity-detail-drawer').waitFor();await page.waitForFunction(()=>{const text=document.querySelector('.opportunity-detail-drawer')?.textContent??'';return !text.includes('Loading opportunity detail')});assert.match(await page.locator('.opportunity-detail-drawer').innerText(),/Assessor match|County property record/i);checks.push('53 unmatched retained; no analysis action');
  assert.equal(maxRows,25);assert.ok(opportunityQueries.some(query=>new URLSearchParams(query).get('sort')==='atn'));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(analyzeRequests,0);
  await writeFile('data/validation/sprint6_3-ui-qa.json',JSON.stringify({status:'PASS',checks,fixtureTransport:true,realPostgresCertifiedSeparately:true,maxRows,providerCalls:0,externalRequests:0,analyzeRequests,visualDirectory:dir},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks}));
}finally{await instance.close();await app.close();}
