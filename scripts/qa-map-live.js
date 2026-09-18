// Explicit opt-in: loads live Google Maps at the authorized local referrer.
// This is intentionally not part of default tests and never calls RentCast.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startWorkbench} from '../src/workbench/server.js';
import {readMapConfig} from '../src/workbench/mapConfig.js';
import {browser} from '../src/reports/pdf.js';
import {preservation} from '../src/workbench/model.js';
import {resolve,writeJson} from '../src/io/files.js';

if(!process.argv.includes('--live'))throw new Error('Explicit --live required; this uses Google Maps quota.');
const config=await readMapConfig();if(!config.configured)throw new Error(config.reason);
const url='http://127.0.0.1:4173',directory='data/validation/map-update/live';
await mkdir(resolve(directory),{recursive:true});
let server=null,instance=null,page=null;
const errors=[],googleErrors=[],violations=[],checks=[],externalHosts=new Set();
const safe=message=>String(message).split(config.browserKey).join('[REDACTED]').replace(/https?:\/\/[^\s)]+/g,'[URL omitted]');
let status='FAIL';
try {
  let existing=false;
  try{const response=await fetch(`${url}/api/fixtures`,{signal:AbortSignal.timeout(1000)});existing=response.ok&&Array.isArray((await response.json()).fixtures);}catch{}
  if(!existing)server=await startWorkbench({port:4173});
  instance=await browser();const context=await instance.newContext({viewport:{width:1366,height:950}});page=await context.newPage();
  page.on('pageerror',error=>errors.push(safe(error.message)));
  page.on('console',message=>{const match=message.text().match(/Google Maps JavaScript API error:\s*([A-Za-z0-9_]+)/);if(match)googleErrors.push(match[1]);});
  await page.addInitScript(()=>{window.__liveMapViolations=[];window.addEventListener('securitypolicyviolation',e=>window.__liveMapViolations.push({directive:e.violatedDirective,origin:e.blockedURI.startsWith('http')?new URL(e.blockedURI).origin:e.blockedURI}));});
  await page.route('**/*',route=>{
    const requestURL=new URL(route.request().url());
    if(requestURL.origin===url)return route.continue();
    externalHosts.add(requestURL.hostname);
    if(requestURL.protocol==='https:'&&/\.(googleapis|gstatic|google|googleusercontent)\.com$/.test(requestURL.hostname))return route.continue();
    return route.abort();
  });
  await page.goto(url);await page.getByRole('button',{name:'Florida Portfolio / Fantasia',exact:true}).click();
  await page.locator('[data-map-engine="STREET"], [data-map-engine="OFFLINE_FALLBACK"]').waitFor({timeout:30000});
  const engine=await page.locator('.comp-map').getAttribute('data-map-engine');
  console.log(JSON.stringify({engine,googleErrors}));
  assert.equal(engine,'STREET','Live Google street map did not load');
  assert.equal(await page.locator('[data-comp-row]').count(),15);checks.push('Live street basemap loaded; 15 retained comp rows');
  await page.waitForTimeout(700); // Let Google finish marker-label painting after tilesloaded.
  await page.locator('.comp-map').screenshot({path:resolve(`${directory}/street-laptop.png`)});
  await page.locator('[data-comp-row="comp-2"] button').click();await page.locator('[data-map-popup="comp-2"]').waitFor();
  assert.match(await page.locator('[data-map-popup="comp-2"]').innerText(),/Land tenure unknown/);
  assert.equal(await page.locator('[data-comp-row="comp-2"] button').getAttribute('aria-pressed'),'true');checks.push('Live comp popup/table selection and evidence');
  await page.waitForTimeout(700); // Live InfoWindow auto-pan is animated.
  await page.locator('.comp-map').screenshot({path:resolve(`${directory}/popup-laptop.png`)});
  await page.getByRole('button',{name:'Clear map selection',exact:true}).click();
  await page.locator('.map-overlaps button').first().click();
  await page.locator('.map-overlap-roster li button').first().click();await page.locator('[data-map-popup]').waitFor();
  await page.getByRole('button',{name:'Clear map selection',exact:true}).click();
  await page.getByRole('button',{name:'Fit all locations',exact:true}).click();
  await page.locator('.comp-map [title="Subject: 8426 Fantasia Park Way, Riverview, FL 33578"]').first().click();await page.locator('[data-map-popup="subject"]').waitFor();
  assert.match(await page.locator('[data-map-popup="subject"]').innerText(),/\$122,000/);checks.push('Overlap roster and rich subject popup');
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-comp-row="comp-2"] button').click();await page.locator('[data-map-popup="comp-2"]').waitFor();
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.locator('.comp-map').screenshot({path:resolve(`${directory}/popup-narrow.png`)});checks.push('390px responsive live map/popup');
  await context.setOffline(true);await page.locator('[data-map-engine="OFFLINE_FALLBACK"]').waitFor();await page.locator('[data-map-popup="comp-2"]').waitFor();
  assert.equal(await page.locator('.comp-pin').count(),15);checks.push('Live-to-offline fallback retains all 15 comp markers and selection');
  await page.locator('.comp-map').screenshot({path:resolve(`${directory}/offline-narrow.png`)});
  await context.setOffline(false);await page.getByRole('button',{name:'Retry street basemap',exact:true}).click();
  await page.locator('[data-map-engine="STREET"]').waitFor({timeout:20000});await page.locator('[data-map-popup="comp-2"]').waitFor();checks.push('Explicit retry restores live street map and selected popup');
  violations.push(...await page.evaluate(()=>window.__liveMapViolations));
  assert.deepEqual(errors,[]);assert.deepEqual(googleErrors,[]);assert.deepEqual(violations,[]);
  status='PASS';
}catch(error){
  errors.push(safe(error.message));
  if(page){violations.push(...await page.evaluate(()=>window.__liveMapViolations??[]).catch(()=>[]));await page.locator('.comp-map').screenshot({path:resolve(`${directory}/failure.png`)}).catch(()=>{});}
  process.exitCode=1;
}finally{
  const result={at:new Date().toISOString(),status,liveGoogle:true,rentcastCalls:0,checks,googleErrors,errors,violations,externalHosts:[...externalHosts],preservation:await preservation()};
  await writeJson('data/validation/map-live-qa.json',result);console.log(JSON.stringify(result,null,2));
  await instance?.close();await server?.close();
}
