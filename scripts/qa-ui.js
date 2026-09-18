import assert from 'node:assert/strict';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {startWorkbench} from '../src/workbench/server.js';
import {browser} from '../src/reports/pdf.js';
import {fixture,preservation} from '../src/workbench/model.js';
import {synthetic} from '../src/workbench/synthetic.js';
import {resolve,writeJson} from '../src/io/files.js';
const dir='data/validation/sprint3_2-visual/ui';await mkdir(resolve(dir),{recursive:true});
const app=await startWorkbench({env:{},port:0,mapConfig:{configured:false,reason:'Offline regression fixture'}}),instance=await browser(),page=await instance.newPage({viewport:{width:1366,height:950}});
const errors=[],external=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>{if(!route.request().url().startsWith(app.url)){external.push(route.request().url());return route.abort();}return route.continue();});
async function state(s){await page.waitForFunction(expected=>document.querySelector('[data-testid="state"]')?.dataset.state===expected,s);}
try{
  await page.goto(app.url);await state('IDLE');
  await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();await state('READY_PROPERTY');
  await page.locator('[data-map-engine="OFFLINE_FALLBACK"]').waitFor();
  assert.equal(await page.locator('[data-comp-row]').count(),15);assert.equal(await page.locator('.comp-pin').count(),15);
  assert.equal(await page.getByRole('heading',{name:'Modeled deal economics',exact:true}).count(),0);checks.push('Property mode / no deal assumptions / 15 mapped and retained comps');
  await page.locator('[data-comp-row="comp-2"] button').click();await page.waitForFunction(()=>document.querySelector('.comp-pin.selected')?.textContent==='2');
  await page.locator('.comp-pin').filter({hasText:/^5$/}).focus();await page.keyboard.press('Enter');await page.locator('[data-comp-row="comp-5"] button[aria-pressed="true"]').waitFor();
  await page.locator('.comp-pin').filter({hasText:/^3$/}).focus();await page.keyboard.press('Enter');await page.locator('[data-comp-row="comp-3"] button[aria-pressed="true"]').waitFor();checks.push('Table → marker, marker click → table and keyboard activation of overlapping marker');
  await page.getByRole('combobox',{name:'Analysis mode'}).selectOption('deal');
  await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();await state('READY_DEAL');
  await page.getByRole('heading',{name:'Modeled deal economics',exact:true}).waitFor();
  assert.match(await page.locator('body').innerText(),/\$180,000/);assert.match(await page.locator('body').innerText(),/-\$58,000/);
  await page.getByRole('button',{name:'View all 21 scenarios',exact:true}).click();assert.equal(await page.locator('#scenarios tbody tr').count(),21);checks.push('Golden financial values / all 21 scenarios / unknown-cost warning');
  await page.locator('#evidence .detailed-evidence > summary').click();await page.locator('#evidence .evidence-group > details').first().locator('summary').first().click();assert.ok((await page.locator('#evidence .evidence-group > details').first().innerText()).includes('Independent evidence'));
  await page.locator('#sources summary').first().click();checks.push('Expandable evidence and source provenance');
  await page.screenshot({path:resolve(`${dir}/ui-laptop.png`),fullPage:true});
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:resolve(`${dir}/ui-laptop-top.png`)});
  await page.locator('.comp-map').screenshot({path:resolve(`${dir}/ui-map.png`)});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(`${dir}/ui-narrow.png`),fullPage:true});
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:resolve(`${dir}/ui-narrow-top.png`)});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'No page-wide horizontal overflow');
  await page.locator('#address').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Analysis mode');checks.push('390px responsive layout / keyboard focus sequence');
  await page.getByRole('button',{name:'Bass — STOP',exact:true}).click();await state('SOURCE_STOP');assert.match(await page.locator('body').innerText(),/Property representation needs verification/);
  await page.getByRole('button',{name:'Joyce — ambiguous',exact:true}).click();await state('AMBIGUOUS');assert.match(await page.locator('body').innerText(),/Address needs confirmation/);checks.push('Bass STOP / Joyce ambiguity retained');
  await page.locator('#address').fill('8426 Fantasia Park Way');await page.getByRole('button',{name:'Analyze cached evidence',exact:true}).click();await state('AMBIGUOUS');await page.getByRole('button',{name:/^Confirm 8426/}).click();await state('READY_DEAL');checks.push('Ambiguous abbreviated address requires explicit confirmation');
  await page.locator('#address').fill('999 Uncached Road, Elsewhere, FL 12345');await page.getByRole('button',{name:'Analyze cached evidence',exact:true}).click();await state('ERROR');assert.equal(await page.locator('[data-comp-row]').count(),0);assert.equal(await page.locator('.property-header').count(),0);checks.push('Failed lookup clears prior-property evidence');
  await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();await state('READY_DEAL');await page.locator('.deal-form summary').click();
  for(const [key,val] of Object.entries({acquisition:160000,repairs:10000,sale:279000,holdDays:90,rent:3000,commission:5000,acquisitionClosingCosts:1000,dispositionClosingCosts:2000,otherKnownCost:1000}))await page.locator(`[name="${key}"]`).fill(String(val));
  await page.getByRole('button',{name:'Analyze explicit claims',exact:true}).click();await state('READY_DEAL');assert.match(await page.locator('#economics').innerText(),/\$97,000/);checks.push('Manual claims isolated / core economics include explicit closing timing and additional cost');
  for(const kind of ['long','many-comps']){
    const model=await synthetic(kind);
    await page.route(`${app.url}/api/fixture`,route=>route.fulfill({contentType:'application/json',body:JSON.stringify({model,sessionId:'synthetic-qa'})}));
    await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();await state(model.state);
    await page.locator('[data-map-engine="OFFLINE_FALLBACK"], [data-map-engine="NO_COORDINATES"]').waitFor();
    assert.equal(await page.locator('[data-comp-row]').count(),model.comps.length);assert.equal(await page.locator('.comp-pin').count(),model.comps.filter(c=>c.mappable).length);
    assert.match(await page.locator('#comps').innerText(),/Map location unavailable/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await page.screenshot({path:resolve(`${dir}/ui-${kind}.png`),fullPage:true});await page.unroute(`${app.url}/api/fixture`);
  }checks.push('Synthetic long / missing fields and 70-comp UI retain every row');
  const post=(endpoint,data,origin=app.url)=>fetch(`${app.url}/api/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
  assert.equal((await post('fixture',{id:'fantasia',mode:'deal'},'https://external.invalid')).status,403);
  assert.equal((await fetch(`${app.url}/.env`)).status,403);assert.equal((await fetch(`${app.url}/api/reports/not-a-report`)).status,404);
  const saved=await (await post('fixture',{id:'fantasia',mode:'deal'})).json();assert.deepEqual(saved.model,await fixture('fantasia'));
  const pdf=await (await post('report',{sessionId:saved.sessionId})).json();assert.ok(pdf.download);assert.equal(pdf.digest,saved.model.digest);assert.equal((await fetch(app.url+pdf.download)).headers.get('content-type'),'application/pdf');checks.push('Same-origin API / environment blocked / report generated from exact server session');
  const bundleFiles=await readdir(resolve('apps/web/dist/assets'));const bundle=(await Promise.all(bundleFiles.map(f=>readFile(resolve(`apps/web/dist/assets/${f}`),'utf8')))).join('\n');
  for(const filename of ['.env','.env.example']){
    let env;try{env=await readFile(resolve(filename),'utf8');}catch(e){if(e.code==='ENOENT')continue;throw e;}
    const secrets=[...env.matchAll(/^\s*(?:RENTCAST_API_KEY|MARKET_DATA_API_KEY)\s*=\s*["']?([^\r\n"']+)/gm)].map(m=>m[1].trim()).filter(s=>s.length>10&&!/placeholder|your[_-]|example/i.test(s));
    assert.ok(secrets.every(s=>!bundle.includes(s)&&!bundle.includes(Buffer.from(s).toString('base64'))),'Client bundle secret scan failed');
  }
  assert.doesNotMatch(bundle,/RENTCAST_API_KEY|MARKET_DATA_API_KEY|X-Api-Key/);checks.push('Actual local key and encoded key absent from bundle; no provider headers');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await writeJson('data/validation/sprint3_2-ui-qa.json',{at:new Date().toISOString(),status:'PASS',checks,errors,externalRequests:external.length,newProviderCalls:0,report:pdf,preservation:await preservation()});
  console.log(JSON.stringify({status:'PASS',checks,reportPages:pdf.pages},null,2));
}finally{await instance.close();await app.close();}
// Exercise the development boundary too, including Vite source serving.
const dev=await startWorkbench({env:{},port:0,dev:true,mapConfig:{configured:false,reason:'Offline regression fixture'}}),b=await browser();
try{const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(dev.url);await p.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[data-testid="state"]')?.dataset.state==='READY_PROPERTY');assert.deepEqual(errors,[]);console.log('Development server fixture smoke: PASS');}finally{await b.close();await dev.close();}
