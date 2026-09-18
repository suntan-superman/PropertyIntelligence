import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startWorkbench} from '../src/workbench/server.js';
import {browser} from '../src/reports/pdf.js';
import {resolve,writeJson} from '../src/io/files.js';

const app=await startWorkbench({port:0,mapConfig:{configured:false,reason:'UX visual QA uses the offline map fallback.'}});
const instance=await browser(),directory='data/validation/sprint3_2-ux-visual',widths=[1366,1024,768,390],checks=[],errors=[];await mkdir(resolve(directory),{recursive:true});
try{
 for(const width of widths){
  const page=await instance.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(`${width}: ${e.message}`));
  await page.goto(app.url);await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();await page.locator('[data-state="READY_PROPERTY"]').waitFor();
  assert.equal(await page.locator('#economics').count(),0);assert.equal(await page.locator('#scenarios').count(),0);assert.equal(await page.locator('#sensitivity').count(),0);assert.equal(await page.locator('#questions').count(),0);
  for(const anchor of ['#overview','#valuation','#comps','#details','#evidence','#sources'])assert.equal(await page.locator(`a[href="${anchor}"]`).count(),1);
  assert.equal(await page.locator('#evidence').innerText().then(text=>text.includes('comps[')),false);assert.equal(await page.locator('#evidence').innerText().then(text=>text.includes('PARTIAL')),false);assert.equal(await page.locator('[data-comp-row]').count(),15);assert.equal(await page.locator('#valuation .range-marker').count(),3);assert.match(await page.locator('#valuation [role="img"]').getAttribute('aria-label'),/Provider range/);assert.match(await page.locator('#details').innerText(),/Land \/ ownership structure/);assert.match(await page.locator('#details').innerText(),/Not independently verified/);
  await page.locator('#details summary').first().click().catch(()=>{});await page.screenshot({path:resolve(`${directory}/fantasia-property-${width}.png`),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);checks.push(`Property Mode hierarchy/details/anchors/15 comps at ${width}px`);
  await page.close();
 }
 const page=await instance.newPage({viewport:{width:1366,height:900}});await page.goto(app.url);await page.getByRole('combobox',{name:'Analysis mode'}).selectOption('deal');await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();await page.locator('[data-state="READY_DEAL"]').waitFor();
 for(const anchor of ['#economics','#scenarios','#sensitivity','#questions'])assert.equal(await page.locator(`a[href="${anchor}"]`).count(),1);assert.equal(await page.locator('#economics').count(),1);assert.equal(await page.locator('#questions').count(),1);checks.push('Deal Mode retains applicable economics/scenarios/sensitivity/questions');
 await page.screenshot({path:resolve(`${directory}/fantasia-deal-1366.png`),fullPage:true});await page.close();
 assert.deepEqual(errors,[]);const result={at:new Date().toISOString(),status:'PASS',referenceModel:'Fantasia cached evidence; no persisted Mainsail fixture is present in this repository',widths,checks,providerCalls:0,errors};await writeJson('data/validation/sprint3_2-ux-visual-qa.json',result);console.log(JSON.stringify(result,null,2));
}finally{await instance.close();await app.close();}
