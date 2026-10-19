import {fork,execFileSync} from 'node:child_process';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import http from 'node:http';
import {chromium} from 'playwright-core';
import {syntheticReviewDirectory} from './review-fixtures.js';
import {sha} from './review-model.js';

const actual='data/runtime/identity-resolution-pilot';
const hashFile=async p=>sha(await readFile(p));
const checks=[];let worker,browser,app;
async function message(value){return new Promise((ok,reject)=>{const timeout=setTimeout(()=>reject(new Error('QA_WORKER_TIMEOUT')),10000);worker.once('message',r=>{clearTimeout(timeout);if(r.error)reject(new Error(r.error));else ok(r);});worker.send(value);});}
async function main(){
  const directory=await syntheticReviewDirectory();
  const before={};for(const file of await readdir(actual,{withFileTypes:true}))if(file.isFile())before[`${actual}/${file.name}`]=await hashFile(`${actual}/${file.name}`);
  const protectedFiles=JSON.parse(await readFile(`${actual}/identity-verification-results.json`)).protectedFileHashes;
  for(const [path,hash]of Object.entries(protectedFiles))assert.equal(await hashFile(path),hash,'BASELINE_CHANGED_BEFORE_QA');
  for(const path of ['apps/web/src/app/App.jsx','apps/web/src/features/opportunities/Opportunities.jsx','netlify.toml','package.json','package-lock.json','.gitignore'])before[path]=await hashFile(path);
  const testFiles=['scripts/identity-resolution-pilot/review.test.js','scripts/identity-resolution-pilot/pilot.test.js','scripts/mls-validation-round1/gate1b-identity-audit.test.js','scripts/mls-validation-round1/harness.test.js','scripts/sprint6_3_1/address.test.js','scripts/sprint6_3_3/linkage.test.js','tests/persistence.test.js'];
  const tap=execFileSync(process.execPath,['--import','./src/analysis/offline.js','--test',...testFiles],{encoding:'utf8'});
  const metric=name=>Number(tap.match(new RegExp(`^# ${name} (\\d+)$`,'m'))?.[1]);
  assert.equal(metric('tests'),68);assert.equal(metric('pass'),68);assert.equal(metric('fail'),0);assert.equal(metric('skipped'),0);
  checks.push('68 offline unit/regression tests passed, including read-only load of all three actual packets.');
  worker=fork(resolve('scripts/identity-resolution-pilot/review-qa-worker.js'),[],{stdio:['ignore','pipe','pipe','ipc'],env:{PATH:process.env.PATH,SYSTEMROOT:process.env.SYSTEMROOT,TEMP:process.env.TEMP,TMP:process.env.TMP}});
  app=await message({action:'start',directory});
  const request=(path,{method='GET',headers={},body}={})=>new Promise((ok,reject)=>{
    const req=http.request(`${app.origin}${path}`,{method,headers},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>ok({status:res.statusCode,headers:res.headers,text}));});req.on('error',reject);if(body)req.write(body);req.end();
  });
  const auth={Authorization:`Bearer ${app.token}`};
  assert.equal((await request('/api/pilots')).status,401);
  assert.equal((await request('/api/pilots',{headers:{...auth,Host:'attacker.invalid'}})).status,403);
  assert.equal((await request('/api/pilots',{headers:{...auth,Origin:'https://attacker.invalid'}})).status,403);
  assert.equal((await request('/api/pilots',{headers:{...auth,'Sec-Fetch-Site':'cross-site'}})).status,403);
  assert.equal((await request('/api/pilots/IP-P1/decision',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await request('/api/pilots/IP-P1/decision',{method:'POST',headers:{...auth,Origin:app.origin,'Content-Type':'text/plain'},body:'{}'})).status,415);
  assert.equal((await request('/.env',{headers:auth})).status,404);
  assert.equal((await request('/data/runtime/identity-resolution-pilot/IP-P1-review.json',{headers:auth})).status,404);
  const shell=await request('/');assert.equal(shell.status,200);assert.ok(!shell.text.includes('90000000001'));assert.equal(shell.headers['cache-control'],'no-store');assert.match(shell.headers['content-security-policy'],/frame-ancestors 'none'/);
  checks.push('Access-code, exact Host/Origin, cross-site, content-type, raw-file denial, no-cache and CSP controls passed.');
  browser=await chromium.launch({headless:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  const external=[],errors=[],requests=[];
  await context.route('**/*',route=>{const url=route.request().url();if(new URL(url).origin!==app.origin){external.push('BLOCKED_NONLOCAL_REQUEST');return route.abort();}requests.push(new URL(url).pathname);return route.continue();});
  const page=await context.newPage();page.on('pageerror',()=>errors.push('PAGE_SCRIPT_ERROR'));
  const login=async()=>{await page.locator('#access-code').fill(app.token);await page.getByRole('button',{name:'Open private review'}).click();await page.locator('#review-content').waitFor({state:'visible'});};
  await page.goto(app.origin);assert.equal(await page.locator('#workspace').isVisible(),false);await login();
  for(const code of ['IP-P1','IP-P2','IP-P3']){
    await page.getByRole('button',{name:new RegExp(`^${code}`)}).click();await page.waitForFunction(code=>document.getElementById('packet-title').textContent.startsWith(code),code);
    assert.equal(await page.locator('#component-state').inputValue(),'');assert.equal(await page.locator('#component-postalCode').inputValue(),'');
    assert.match(await page.locator('#missing-components').innerText(),/State and ZIP-5/);
    assert.equal(await page.locator('#acreage-card').isVisible(),code!=='IP-P2');assert.equal(await page.locator('#decision').inputValue(),'');
  }
  checks.push('All three synthetic packets display; missing state/ZIP emphasized; acreage warning visible only for flagged packets.');
  await page.getByRole('button',{name:/^IP-P1/}).click();await page.waitForFunction(()=>document.getElementById('packet-title').textContent.startsWith('IP-P1'));
  await page.locator('#decision').selectOption('APPROVED');await page.locator('#reviewer-ack').check();await page.locator('#supporting-evidence').fill('Synthetic QA reference, pages 1–2.');await page.locator('#review-notes').fill('Synthetic browser decision; not a real analyst decision.');
  await page.getByRole('button',{name:'Save local decision'}).click();await page.waitForFunction(()=>document.getElementById('validation-results').textContent.includes('Approval requires a complete address'));
  for(const f of ['street','city','state','postalCode']){await page.locator(`#evidence-${f}`).fill(`Synthetic evidence for ${f}`);await page.locator(`#verification-${f}`).selectOption('VERIFIED');}
  await page.locator('#component-state').fill('CA');await page.locator('#component-postalCode').fill('99999');await page.locator('#contradiction-status').selectOption('NONE_REMAINING');
  await page.getByRole('button',{name:'Save local decision'}).click();await page.waitForFunction(()=>document.getElementById('validation-results').textContent.includes('Acknowledge the county acreage discrepancy'));
  await page.locator('#acreage-ack').check();await page.locator('#acreage-notes').fill('Synthetic acreage flag reviewed; uncertainty documented.');
  const decisionPath=join(directory,'IP-P1-analyst-decision.json'),beforeValidate=await hashFile(decisionPath);
  await page.getByRole('button',{name:'Validate without saving'}).click();await page.waitForFunction(()=>document.getElementById('validation-results').textContent.includes('Nothing was saved'));
  assert.equal(await hashFile(decisionPath),beforeValidate);
  await page.getByRole('button',{name:'Save local decision'}).click();await page.waitForFunction(()=>document.getElementById('save-confirmation').textContent.startsWith('Saved locally: Approved'));
  const saved=await readFile(decisionPath,'utf8');
  await page.reload();await login();assert.equal(await page.locator('#component-state').inputValue(),'CA');assert.equal(await page.locator('#component-postalCode').inputValue(),'99999');assert.equal(await page.locator('#decision').inputValue(),'APPROVED');assert.equal(await page.locator('#reviewer-ack').isChecked(),false);assert.equal(await readFile(decisionPath,'utf8'),saved);
  checks.push('Browser rejects incomplete/unacknowledged approval; validate-only is read-only; synthetic save and reload preserve content with renewed human attestation required.');
  await page.screenshot({path:join(directory,'synthetic-review-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:join(directory,'synthetic-review-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  const packetPath=join(directory,'IP-P1-review.json'),packet=JSON.parse(await readFile(packetPath));delete packet.packetSha256;packet.evidence.localVerificationAt='2026-03-01';packet.packetSha256=sha(JSON.stringify(packet));await writeFile(packetPath,JSON.stringify(packet,null,2));
  await page.reload();await login();assert.equal(await page.locator('#stale-warning').isVisible(),true);assert.equal(await page.locator('#decision').inputValue(),'');assert.equal(await page.locator('#verification-state').inputValue(),'UNVERIFIED');assert.equal(await page.locator('#acreage-ack').isChecked(),false);assert.equal(await readFile(decisionPath,'utf8'),saved);
  checks.push('Changed packet fingerprint invalidates prior approval in UI and resets verification without mutating historical decision.');
  await page.getByRole('button',{name:'Lock review',exact:true}).click();assert.equal(await page.locator('#workspace').isVisible(),false);assert.equal(await page.locator('#raw-situs').innerText(),'');assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  assert.equal(external.length,0);assert.equal(errors.length,0);
  await browser.close();browser=null;
  const stopped=await message({action:'stop'});assert.equal(stopped.offline.networkAttempts,0);
  for(const [path,hash]of Object.entries({...before,...protectedFiles}))assert.equal(await hashFile(path),hash,'REAL_OR_PROTECTED_FILE_CHANGED');
  checks.push('Real packets/decisions, exclusions, Round 1 flags, application code, packages, Netlify and protected baselines unchanged.');
  const report={status:'READY FOR ANALYST DECISIONS',at:new Date().toISOString(),tests:{pass:metric('pass'),fail:metric('fail'),skipped:metric('skipped')},browser:'Installed local Chromium via Playwright',checks,actualPacketsRead:3,actualDecisionsWritten:0,syntheticOnlyWrites:true,localBrowserRequests:requests.length,externalBrowserRequests:external.length,serverOutboundConnectionAttempts:stopped.offline.networkAttempts,databaseConnections:0,providerCalls:0,productionWrites:0,mlsAccess:0,realPropertiesCreated:0,round1PropertiesSelected:0,realArtifactsUnchanged:true};
  await writeFile(join(directory,'human-review-qa.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({...report,privateQaDirectory:directory},null,2));
}
try{await main();}catch(e){console.error(JSON.stringify({status:'HUMAN_REVIEW_QA_STOP',error:e.message}));process.exitCode=1;}finally{await browser?.close().catch(()=>{});if(worker?.connected){try{await message({action:'stop'});}catch{worker.kill();}}}
