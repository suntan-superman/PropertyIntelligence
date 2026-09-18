// Read-only fixture smoke. Never calls /properties/analyze or a provider.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {browser} from '../src/reports/pdf.js';
import {writeJson,resolve} from '../src/io/files.js';
const base=new URL(process.argv[2]??'http://localhost:8888').origin;
const health=await(await fetch(base+'/api/health')).json();assert.equal(health.runtime,'netlify');assert.equal(health.ok,true);assert.equal(health.pdfAvailable,false);
const checks=['GET /api/health reaches Netlify JSON function, not SPA'];
for(const [id,state]of [['fantasia','READY_PROPERTY'],['bass','SOURCE_STOP'],['joyce','AMBIGUOUS']]){
  const res=await fetch(base+'/api/fixture',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({id,mode:'property'})});
  assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'application/json');const result=await res.json();assert.equal(result.model.state,state);assert.equal(result.model.cache.newProviderCalls,0);
  if(id==='fantasia')assert.equal(result.model.comps.length,15);checks.push(`${id}: ${state}, fixture calls 0`);
}
const missing=await fetch(base+'/api/unknown');assert.equal(missing.status,404);assert.equal(missing.headers.get('content-type'),'application/json');
const capability=await(await fetch(base+'/api/reports/capability')).json();assert.equal(capability.message,'PDF generation is currently available in the local analyst runtime.');
const instance=await browser(),page=await instance.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const mock=await readFile(resolve('scripts/fixtures/google-maps-browser.js'),'utf8');
await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.request().url().startsWith('https://maps.googleapis.com/maps/api/js')?route.fulfill({contentType:'text/javascript',body:mock}):route.abort());
// Synthetic public map config, including when deployment has not yet configured Google.
await page.route(base+'/api/maps/config',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({configured:true,browserKey:'synthetic-browser-key'})}));
try{
  await page.goto(base);await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();await page.locator('[data-map-engine="STREET"]').waitFor();
  assert.equal(await page.locator('[data-comp-row]').count(),15);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.getByRole('button',{name:'Create Deal Analysis',exact:true}).click();await page.getByText(capability.message,{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Generate Deal Review PDF',exact:true}).count(),0);
  checks.push('Netlify served UI: shared map mock, 15 comps, responsive, remote PDF accurately local-only');
  // Missing credentials visibly disable live actions without disabling fixtures.
  await page.route(base+'/api/health',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...health,rentcastConfigured:false})}));await page.reload();assert.equal(await page.getByRole('button',{name:'Analyze Property',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-testid="state"]')?.dataset.state==='READY_PROPERTY');checks.push('Missing-key health disables live action; fixtures still work');
  assert.deepEqual(errors,[]);await mkdir(resolve('data/validation/sprint3_2-visual/netlify'),{recursive:true});await page.screenshot({path:resolve('data/validation/sprint3_2-visual/netlify/fixture-narrow.png'),fullPage:true});
  const result={at:new Date().toISOString(),status:'PASS',target:base,remote:!['localhost','127.0.0.1'].includes(new URL(base).hostname),checks,fixtureProviderCalls:0,liveSmokeCount:0,realGoogleTiles:false,errors};
  await writeJson('data/validation/sprint3_2-netlify-smoke.json',result);console.log(JSON.stringify(result,null,2));
}finally{await instance.close();}
