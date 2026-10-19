// Browser screenshots and writes use synthetic records only. No provider requests.
import {fork} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {syntheticReviewDirectory} from './review-fixtures.js';
import {addSyntheticSuggestions} from './suggestion-fixtures.js';
import {sha} from './review-model.js';
let worker,browser,app;
const checks=[];
const ipc=message=>new Promise((ok,reject)=>{const timeout=setTimeout(()=>reject(new Error('QA_WORKER_TIMEOUT')),10000);worker.once('message',value=>{clearTimeout(timeout);value.error?reject(new Error(value.error)):ok(value);});worker.send(message);});
async function main(){
  const directory=await syntheticReviewDirectory();await addSyntheticSuggestions(directory);
  const decisions=Object.fromEntries(await Promise.all(['IP-P1','IP-P2','IP-P3'].map(async c=>[c,sha(await readFile(join(directory,`${c}-analyst-decision.json`)))])));
  worker=fork(resolve('scripts/identity-resolution-pilot/review-qa-worker.js'),[],{stdio:['ignore','pipe','pipe','ipc'],env:{PATH:process.env.PATH,SYSTEMROOT:process.env.SYSTEMROOT,TEMP:process.env.TEMP,TMP:process.env.TMP}});
  app=await ipc({action:'start',directory});
  browser=await chromium.launch({headless:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  const external=[],errors=[],paths=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==app.origin){external.push('BLOCKED_EXTERNAL');return route.abort();}paths.push(new URL(route.request().url()).pathname);return route.continue();});
  const page=await context.newPage();page.on('pageerror',()=>errors.push('PAGE_SCRIPT_ERROR'));
  const login=async()=>{await page.locator('#access-code').fill(app.token);await page.getByRole('button',{name:'Open private review'}).click();await page.locator('#review-content').waitFor({state:'visible'});};
  const navigate=async code=>{await page.getByRole('button',{name:new RegExp(`^${code}`)}).click();if(await page.locator('#navigation-warning').isVisible())await page.locator('#discard').click();await page.waitForFunction(code=>document.getElementById('packet-title').textContent.startsWith(code),code);};
  await page.goto(app.origin);await login();
  const headers={Authorization:`Bearer ${app.token}`};
  assert.equal((await context.request.get(app.origin+'/api/pilots/IP-P1/suggestion')).status(),401);
  assert.equal((await context.request.post(app.origin+'/api/pilots/IP-P1/suggestion',{headers:{...headers,Origin:app.origin},data:{}})).status(),403);
  assert.equal((await context.request.post(app.origin+'/api/pilots/IP-P1/verify',{headers:{...headers,Origin:app.origin},data:{}})).status(),404);
  assert.equal((await context.request.get(app.origin+'/data/runtime/identity-resolution-pilot/google-review-access.json',{headers})).status(),404);
  for(const code of ['IP-P1','IP-P2','IP-P3']){
    await navigate(code);if(await page.locator('#supporting-review').getAttribute('open')===null)await page.locator('#supporting-review > summary').click();assert.equal(await page.locator('#suggestion-content').isVisible(),true);assert.equal(await page.locator('#verify-address').isDisabled(),true);
    assert.equal(await page.locator('#component-state').inputValue(),'');assert.equal(await page.locator('#component-postalCode').inputValue(),'');
    assert.equal(await page.locator('#acreage-card').isVisible(),code!=='IP-P2');
    const api=await context.request.get(app.origin+`/api/pilots/${code}`,{headers});const body=await api.text();assert.equal(api.status(),200);assert.ok(!/FORBIDDEN|apiKey|coordinates|placeId/.test(body));
    if(code==='IP-P3'){assert.equal(await page.locator('#suggestion-suffix').isVisible(),true);assert.match(await page.locator('#suggestion-suffix').innerText(),/County suffix: CI/);assert.match(await page.locator('#suggestion-suffix').innerText(),/Suggested suffix: Circle\/Cir/);assert.match(await page.locator('#suggestion-facts').innerText(),/PARTIAL\/AMBIGUOUS/);}
  }
  checks.push('Three synthetic suggestions render; P3 suffix and acreage remain visible; no automatic field population; live route disabled; private/raw routes denied.');
  await page.screenshot({path:join(directory,'suggestion-p3-discrepancy-desktop.png'),fullPage:true});
  await page.locator('#decision').selectOption('APPROVED');await page.locator('#verification-state').selectOption('VERIFIED');await page.locator('#reviewer-ack').check();
  await page.locator('#use-suggestion').click();await page.waitForFunction(()=>document.getElementById('component-state').value==='CA');
  assert.equal(await page.locator('#decision').inputValue(),'');assert.equal(await page.locator('#reviewer-ack').isChecked(),false);
  for(const field of ['street','city','state','postalCode'])assert.equal(await page.locator(`#verification-${field}`).inputValue(),'UNVERIFIED');
  assert.equal(await page.locator('#acreage-ack').isChecked(),false);
  await page.locator('#decision').selectOption('APPROVED');await page.locator('#validate').click();await page.waitForFunction(()=>document.getElementById('validation-results').textContent.includes('Explicit component verification required'));
  await page.locator('#suggestion-needs-evidence').click();await page.waitForFunction(()=>document.getElementById('decision').value==='NEEDS_MORE_EVIDENCE');
  assert.equal(await page.locator('#contradiction-status').inputValue(),'UNRESOLVED');assert.equal(await page.locator('#reviewer-ack').isChecked(),false);
  for(const [code,hash]of Object.entries(decisions))assert.equal(sha(await readFile(join(directory,`${code}-analyst-decision.json`))),hash);
  checks.push('Use copies draft only, clears approval/attestation, leaves all components unverified; approval and acreage gates remain; Needs more evidence does not save.');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:join(directory,'suggestion-p3-discrepancy-mobile.png'),fullPage:true});await page.locator('#google-suggestion').screenshot({path:join(directory,'suggestion-panel-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});await navigate('IP-P1');
  await page.screenshot({path:join(directory,'suggestion-p1-exact-desktop.png'),fullPage:true});
  const evidenceFile=join(directory,'google-geocoding-ip-p1/diagnostic.json');const d=JSON.parse(await readFile(evidenceFile));d.candidates[0].formattedAddress='Tampered content never shown';await writeFile(evidenceFile,JSON.stringify(d));
  await page.locator('#use-suggestion').click();await page.locator('#suggestion-unavailable').waitFor({state:'visible'});assert.equal(await page.locator('#suggestion-content').isVisible(),false);assert.equal(await page.locator('#suggestion-address').innerText(),'');
  const denied=await(await context.request.get(app.origin+'/api/pilots/IP-P1/suggestion',{headers})).json();assert.deepEqual(Object.keys(denied).sort(),['available','liveLookupEnabled','message']);
  checks.push('Tampered evidence is blocked on action recheck and never crosses browser boundary.');
  const expiryFile=join(directory,'google-geocoding-ip-p2/diagnostic.json'),expiring=JSON.parse(await readFile(expiryFile));
  const expiresAt=new Date(Date.now()+9000).toISOString();expiring.retention.deleteOrReviewBy=expiresAt;const content=JSON.stringify(expiring,null,2)+'\n';await writeFile(expiryFile,content);
  const accessFile=join(directory,'google-review-access.json'),access=JSON.parse(await readFile(accessFile));const grant=access.grants.find(g=>g.pilotCode==='IP-P2');grant.expiresAt=expiresAt;grant.evidenceSha256=sha(content);await writeFile(accessFile,JSON.stringify(access));
  await navigate('IP-P2');await page.locator('#supporting-review > summary').click();await page.locator('#use-suggestion').click();await page.waitForFunction(()=>document.getElementById('component-postalCode').value==='99999');
  await page.waitForFunction(()=>document.getElementById('suggestion-content').hidden&&document.getElementById('component-postalCode').value==='',null,{timeout:14000});
  assert.equal(await page.locator('#component-state').inputValue(),'');assert.equal(await page.locator('#decision').inputValue(),'');assert.equal(await page.locator('#suggestion-address').innerText(),'');
  assert.equal(await page.locator('#save-confirmation').innerText(),'');assert.equal(await page.locator('#saved-status').innerText(),'STALE · REVIEW AGAIN');
  await page.screenshot({path:join(directory,'suggestion-expired-desktop.png'),fullPage:true});
  checks.push('Open-tab expiry clears Google panel and suggestion-derived draft, references and decision state; no silent refresh.');
  await navigate('IP-P3');const packetFile=join(directory,'IP-P3-review.json'),packet=JSON.parse(await readFile(packetFile));delete packet.packetSha256;packet.evidence.localVerificationAt='changed-in-synthetic-QA';packet.packetSha256=sha(JSON.stringify(packet));await writeFile(packetFile,JSON.stringify(packet));
  await page.locator('#use-suggestion').click();await page.locator('#suggestion-content').waitFor({state:'hidden'});assert.equal(await page.locator('#suggestion-content').isVisible(),false);
  checks.push('Changed packet fingerprint blocks reuse before draft copy.');
  await page.getByRole('button',{name:'Lock review',exact:true}).click();if(await page.locator('#navigation-warning').isVisible())await page.locator('#discard').click();
  assert.equal(await page.locator('#workspace').isVisible(),false);assert.equal(await page.locator('#suggestion-address').innerText(),'');assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  assert.equal(external.length,0);assert.equal(errors.length,0);await browser.close();browser=null;
  const stopped=await ipc({action:'stop'});assert.equal(stopped.offline.networkAttempts,0);
  for(const [code,hash]of Object.entries(decisions))assert.equal(sha(await readFile(join(directory,`${code}-analyst-decision.json`))),hash);
  const summary={status:'PASS',at:new Date().toISOString(),checks,externalBrowserRequests:external.length,serverOutboundAttempts:stopped.offline.networkAttempts,providerCalls:0,databaseCalls:0,decisionsWritten:0,localBrowserRequests:paths.length,
    screenshots:['suggestion-p1-exact-desktop.png','suggestion-p3-discrepancy-desktop.png','suggestion-p3-discrepancy-mobile.png','suggestion-panel-mobile.png','suggestion-expired-desktop.png'],syntheticOnly:true};
  await writeFile(join(directory,'suggestion-ui-qa.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...summary,directory}));
}
try{await main();}catch(error){console.error(JSON.stringify({status:'SUGGESTION_UI_QA_FAILED',error:error.message,location:error.stack?.split('\n').find(l=>l.includes('suggestion-ui-qa.js:')),completedChecks:checks.length}));process.exitCode=1;}finally{await browser?.close().catch(()=>{});if(worker?.connected){try{await ipc({action:'stop'});}catch{worker.kill();}}}
