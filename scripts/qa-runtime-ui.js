import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {startWorkbench} from '../src/workbench/server.js';
import {browser} from '../src/reports/pdf.js';
import {readJson,resolve,writeJson} from '../src/io/files.js';
import {memoryStore} from '../src/sources/rentcast/stores.js';

const sample=await readJson('tests/fixtures/rentcast.json');
const maps=await readFile(resolve('scripts/fixtures/google-maps-browser.js'),'utf8');
let providerCalls=0;
const app=await startWorkbench({port:0,cacheStore:memoryStore(),env:{RENTCAST_API_KEY:'synthetic-runtime-key'},mapConfig:{configured:true,browserKey:'synthetic-browser-key'},fetchImpl:async url=>{
  providerCalls++;return new Response(JSON.stringify(url.pathname.endsWith('/properties')?[sample.property]:{...sample.avm,subjectProperty:{...sample.avm.subjectProperty,zipCode:'00000'},comparables:Array.from({length:15},(_,i)=>({...sample.avm.comparables[i%2],id:`runtime-${i}`,latitude:28.1+i/10000,longitude:-81.1}))}));
}});
const instance=await browser(),page=await instance.newPage({viewport:{width:390,height:844}}),errors=[],checks=[];
const directory='data/validation/sprint3_2-visual/runtime';await mkdir(resolve(directory),{recursive:true});
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>route.request().url().startsWith(app.url)?route.continue():route.request().url().startsWith('https://maps.googleapis.com/maps/api/js')?route.fulfill({contentType:'text/javascript',body:maps}):route.abort());
try{
  await page.goto(app.url);await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Analyze Property')?.disabled);
  assert.equal(providerCalls,0);checks.push('Page load / health consumes zero provider calls');
  await page.locator('#address').fill('10 Example Pkwy, Example City, FL 00000');
  await page.getByRole('button',{name:'Analyze Property',exact:true}).click();await page.locator('[data-testid="state"]').filter({hasText:'READY_PROPERTY'}).waitFor();
  await page.locator('[data-map-engine="STREET"]').waitFor();assert.equal(providerCalls,2);assert.equal(await page.locator('[data-comp-row]').count(),15);
  assert.equal(await page.locator('#economics').count(),0);assert.match(await page.locator('.cache').innerText(),/Live provider retrieval/);
  await page.locator('[data-comp-row="comp-2"] button').click();await page.locator('[data-comp-row="comp-2"] button[aria-pressed="true"]').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:resolve(`${directory}/live-property-narrow.png`),fullPage:true});checks.push('Explicit mocked live result uses shared Google map/table, 15 comps, responsive at 390px');
  await page.getByRole('button',{name:'Create Deal Analysis',exact:true}).click();await page.locator('[data-testid="state"]').filter({hasText:'READY_DEAL'}).waitFor();assert.equal(await page.locator('#economics').count(),0);
  await page.getByText('Enter a separate deal scenario',{exact:true}).click();
  for(const [key,value]of Object.entries({acquisition:160000,repairs:10000,sale:279000,holdDays:90,rent:3000,commission:5000,escrow:2000}))await page.locator(`.deal-form input[name="${key}"]`).fill(String(value));
  await page.getByRole('button',{name:'Analyze explicit claims'}).click();await page.locator('#economics').waitFor();assert.match(await page.locator('#economics').innerText(),/\$99,000/);assert.equal(providerCalls,2);checks.push('Create Deal starts blank; explicit analyst claims use existing engine with no extra provider calls');
  await page.getByRole('button',{name:'Analyze Property',exact:true}).click();await page.locator('[data-testid="state"]').filter({hasText:'READY_PROPERTY'}).waitFor();assert.match(await page.locator('.cache').innerText(),/Cached evidence/);assert.equal(providerCalls,2);checks.push('Explicit repeated analysis uses cache');
  await page.route(`${app.url}/api/resolve`,route=>route.fulfill({status:404,contentType:'text/html',body:'<html>SPA fallback</html>'}));
  await page.getByRole('button',{name:'Analyze cached evidence'}).click();await page.locator('[data-testid="state"]').filter({hasText:'API is unavailable'}).waitFor();assert.doesNotMatch(await page.locator('[data-testid="state"]').innerText(),/Unexpected token/);checks.push('HTML fallback displays sanitized service-unavailable error and clears stale property');
  assert.deepEqual(errors,[]);
  await writeJson('data/validation/sprint3_2-runtime-ui-qa.json',{status:'PASS',at:new Date().toISOString(),checks,mockedProviderCalls:providerCalls,liveProviderCalls:0,errors});console.log(JSON.stringify({status:'PASS',checks},null,2));
}finally{await instance.close();await app.close();}
