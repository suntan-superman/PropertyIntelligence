import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {startWorkbench} from '../src/workbench/server.js';
import {browser} from '../src/reports/pdf.js';
import {fixture,preservation} from '../src/workbench/model.js';
import {resolve,writeJson} from '../src/io/files.js';

const mock=await readFile(resolve('scripts/fixtures/google-maps-browser.js'),'utf8');
const root='data/validation/map-update';await mkdir(resolve(root),{recursive:true});
const app=await startWorkbench({port:0,mapConfig:{provider:'google',configured:true,browserKey:'qa-browser-key-no-live-access'}}),instance=await browser(),results=[];
async function scenario(name,{width=1366,network='mock',noTiles=false,missing=false}={}) {
  const context=await instance.newContext({viewport:{width,height:950}}),page=await context.newPage(),errors=[],violations=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({noTiles})=>{window.__mapTestNoTiles=noTiles;window.addEventListener('securitypolicyviolation',e=>{(window.__cspViolations??=[]).push(e.violatedDirective);});},{noTiles});
  await page.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(app.url))return route.continue();
    requests.push(new URL(url).origin+new URL(url).pathname);
    if(url.startsWith('https://maps.googleapis.com/maps/api/js')&&network==='mock')return route.fulfill({contentType:'text/javascript',body:mock});
    if(url.startsWith('https://maps.googleapis.com/maps/api/js')&&network==='auth')return route.fulfill({contentType:'text/javascript',body:'window.gm_authFailure();'});
    return route.abort();
  });
  if(missing){const m=await fixture('fantasia');m.comps[0]={...m.comps[0],latitude:null,longitude:null,mappable:false,locationStatus:'Map location unavailable'};
    // Two exact duplicates exercise the expansion picker without any coordinate offset.
    m.comps[2]={...m.comps[2],latitude:m.comps[1].latitude,longitude:m.comps[1].longitude};
    m.comps[0].address='<img src=x onerror="window.__injected=true">';
    await page.route(`${app.url}/api/fixture`,route=>route.fulfill({contentType:'application/json',body:JSON.stringify({model:m,sessionId:'qa'})}));
  }
  if(network==='missing')await page.route(`${app.url}/api/maps/config`,route=>route.fulfill({contentType:'application/json',body:JSON.stringify({configured:false,reason:'Browser key not configured.'})}));
  try {
    await page.goto(app.url);await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();
    const engine=network==='mock'&&!noTiles?'STREET':'OFFLINE_FALLBACK';
    await page.locator(`[data-map-engine="${engine}"]`).waitFor({timeout:18000});
    assert.equal(await page.locator('[data-comp-row]').count(),15);
    if(engine==='STREET'){
      assert.equal(await page.locator('.leaflet-container').count(),0,'Grid cannot be the normal map');
      assert.equal(await page.evaluate(()=>window.__mapTestInstances.at(-1).markers.filter(m=>!m.title.startsWith('Expand ')).length),missing?15:16);
      assert.equal(await page.evaluate(()=>window.__mapTestInstances.at(-1).options.mapTypeId),'roadmap');
      const originalPositions=await page.evaluate(()=>window.__mapTestInstances.at(-1).markers.filter(m=>!m.title.startsWith('Expand ')).map(m=>m.position));
      await page.locator('[data-comp-row="comp-2"] button').click();await page.locator('[data-map-popup="comp-2"]').waitFor();
      assert.match(await page.locator('[data-map-popup="comp-2"]').innerText(),/Days on market/);assert.match(await page.locator('[data-map-popup="comp-2"]').innerText(),/Land tenure unknown/);
      assert.equal(await page.locator('[data-map-popup="comp-2"]').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'Popup text must wrap without horizontal clipping');
      assert.equal(await page.locator('[data-comp-row="comp-2"] button').getAttribute('aria-pressed'),'true');
      await page.getByRole('button',{name:'Close popup',exact:true}).click();assert.equal(await page.locator('[data-comp-row="comp-2"] button').getAttribute('aria-pressed'),'false');
      await page.getByRole('button',{name:/^Subject: 8426/}).click();await page.locator('[data-map-popup="subject"]').waitFor();assert.match(await page.locator('[data-map-popup="subject"]').innerText(),/\$122,000/);
      await page.getByRole('button',{name:'Close popup',exact:true}).click();
      await page.locator('[data-comp-row="comp-2"] button').click();await page.getByRole('button',{name:'Close popup',exact:true}).focus();await page.keyboard.press('Escape');assert.equal(await page.locator('[data-comp-row="comp-2"] button').getAttribute('aria-pressed'),'false');
      await page.locator('.map-overlaps button').first().click();await page.locator('.map-overlap-roster').waitFor();
      await page.locator('.map-overlap-roster li button').first().click();assert.equal(await page.locator('[data-map-popup]').count(),1);
      await page.getByRole('button',{name:'Zoom to group',exact:true}).click();
      const newPositions=await page.evaluate(()=>window.__mapTestInstances.at(-1).markers.filter(m=>!m.title.startsWith('Expand ')).map(m=>m.position));assert.deepEqual(newPositions,originalPositions);
      if(missing){
        await page.locator('[data-comp-row="comp-1"] button').click();assert.match(await page.locator('[data-testid="selected-comp"]').innerText(),/Map location unavailable/);assert.equal(await page.locator('[data-map-popup]').count(),0);
        assert.equal(await page.evaluate(()=>window.__injected),undefined);
      }
      assert.equal(requests.length,1,'No repeated Maps API load on selection or rerender');
      await page.locator('#comps').screenshot({path:resolve(`${root}/${name}.png`)});
      await page.locator('.comp-map').screenshot({path:resolve(`${root}/${name}-popup.png`)});
      // A real browser offline transition must preserve selected evidence and all comps.
      await page.locator('[data-comp-row="comp-2"] button').click();await context.setOffline(true);
      await page.locator('[data-map-engine="OFFLINE_FALLBACK"]').waitFor();await page.locator('[data-map-popup="comp-2"]').waitFor();
      assert.equal(await page.locator('.comp-pin').count(),missing?14:15);
      await context.setOffline(false);assert.equal(await page.locator('[data-map-engine="OFFLINE_FALLBACK"]').count(),1,'No automatic retry storm');
      await page.getByRole('button',{name:'Retry street basemap',exact:true}).click();await page.locator('[data-map-engine="STREET"]').waitFor();await page.locator('[data-map-popup="comp-2"]').waitFor();
    }else {
      assert.equal(await page.locator('.comp-pin').count(),15);
      await page.locator('[data-comp-row="comp-2"] button').click();await page.locator('[data-map-popup="comp-2"]').waitFor();
      assert.match(await page.locator('[data-map-popup="comp-2"]').innerText(),/Provider status/);
      await page.locator('.comp-pin').filter({hasText:/^3$/}).focus();await page.keyboard.press('Enter');await page.locator('[data-map-popup="comp-3"]').waitFor();
      assert.equal(await page.locator('[data-map-popup="comp-3"]').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
      assert.equal(await page.locator('[data-comp-row="comp-3"] button').getAttribute('aria-pressed'),'true');
      await page.locator('#comps').screenshot({path:resolve(`${root}/${name}.png`)});
      await page.locator('.comp-map').screenshot({path:resolve(`${root}/${name}-popup.png`)});
    }
    assert.equal(await page.locator('.price-label').count(),0,'No persistent price-label clutter');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    violations.push(...await page.evaluate(()=>window.__cspViolations??[]));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
    results.push({name,status:'PASS',width,engine,mockProvider:network==='mock',blockedExternalRequests:requests.length,checks:['15 comps retained','responsive','popup/marker/table selection','evidence statuses','no coordinate displacement','no persistent price labels','offline fallback','no browser/CSP errors']});
    console.log(`${name}: PASS`);
  }catch(error){await page.screenshot({path:resolve(`${root}/${name}-failure.png`),fullPage:true});console.error('Map browser errors:',errors);throw error;}finally{await context.close();}
}
try {
  await scenario('google-laptop');await scenario('google-narrow',{width:390});
  await scenario('google-missing-duplicates',{width:390,missing:true});
  await scenario('offline-network',{network:'blocked'});await scenario('offline-auth-narrow',{width:390,network:'auth'});
  await scenario('offline-tile-timeout',{noTiles:true});
  await scenario('offline-missing-key',{network:'missing',width:390});
  await writeJson('data/validation/map-update-qa.json',{at:new Date().toISOString(),results,preservation:await preservation(),liveProviderCalls:0,liveBasemapVerified:false,note:'Google contract-double tests plus real Leaflet fallback. Live Google map requires an authorized browser key; no Google tiles or RentCast calls consumed.'});
}finally{await instance.close();await app.close();}
