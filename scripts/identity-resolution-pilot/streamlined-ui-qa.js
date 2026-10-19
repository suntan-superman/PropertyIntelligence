// Synthetic-only browser QA. Existing local Chromium; no acquisition or real saves.
import {fork} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {syntheticReviewDirectory} from './review-fixtures.js';
import {addSyntheticSuggestions} from './suggestion-fixtures.js';
import {sha} from './review-model.js';
let worker,browser;const checks=[];
const ipc=value=>new Promise((ok,reject)=>{const timer=setTimeout(()=>reject(new Error('WORKER_TIMEOUT')),10000);worker.once('message',r=>{clearTimeout(timer);r.error?reject(new Error(r.error)):ok(r);});worker.send(value);});
async function main(){
  const directory=await syntheticReviewDirectory();
  const file=join(directory,'IP-P2-review.json'),packet=JSON.parse(await readFile(file));
  packet.addressReview.components.street='2 Synthetic Extended Evidence Comparison Demonstration Boulevard With A Deliberately Long Street Name';
  packet.addressReview.rawCountySitus=packet.addressReview.components.street+', Example City';
  delete packet.packetSha256;packet.packetSha256=sha(JSON.stringify(packet));await writeFile(file,JSON.stringify(packet));
  const decisionFile=join(directory,'IP-P2-analyst-decision.json'),decision=JSON.parse(await readFile(decisionFile));decision.packetSha256=packet.packetSha256;await writeFile(decisionFile,JSON.stringify(decision));
  await addSyntheticSuggestions(directory);
  worker=fork(resolve('scripts/identity-resolution-pilot/review-qa-worker.js'),[],{stdio:['ignore','pipe','pipe','ipc'],env:{PATH:process.env.PATH,SYSTEMROOT:process.env.SYSTEMROOT,TEMP:process.env.TEMP,TMP:process.env.TMP}});
  const app=await ipc({action:'start',directory});
  browser=await chromium.launch({headless:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),external=[],errors=[],paths=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==app.origin){external.push('EXTERNAL');return route.abort();}paths.push(new URL(route.request().url()).pathname);return route.continue();});
  const page=await context.newPage();page.on('pageerror',()=>errors.push('PAGE_ERROR'));page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE_ERROR');});
  await page.goto(app.origin);await page.locator('#access-code').fill(app.token);await page.getByRole('button',{name:'Open private review'}).click();await page.locator('#review-content').waitFor({state:'visible'});
  const nav=async code=>{await page.getByRole('button',{name:new RegExp(`^${code}`)}).click();if(await page.locator('#navigation-warning').isVisible())await page.locator('#discard').click();await page.waitForFunction(c=>document.getElementById('packet-title').textContent.startsWith(c),code);};
  const layout=async()=>{
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'HORIZONTAL_OVERFLOW');
    assert.equal(await page.evaluate(()=>{const r=[...document.querySelectorAll('.form-actions button')].map(e=>e.getBoundingClientRect());return r.every((a,i)=>r.every((b,j)=>i===j||Math.min(a.right,b.right)<=Math.max(a.left,b.left)||Math.min(a.bottom,b.bottom)<=Math.max(a.top,b.top)));}),true,'ACTION_OVERLAP');
  };
  const screenshots=[];
  for(const [width,height,label]of [[1440,1000,'desktop'],[768,1024,'tablet'],[390,844,'mobile']]){
    await page.setViewportSize({width,height});await nav('IP-P2');
    assert.equal(await page.locator('#review-tier').innerText(),'Routine address review');assert.equal(await page.locator('#routine-controls').isVisible(),true);assert.equal(await page.locator('#routine-evidence-ack').isChecked(),false);assert.equal(await page.locator('#decision').inputValue(),'');
    assert.equal(await page.locator('#detailed-review').getAttribute('open'),null);assert.equal(await page.locator('#supporting-review').getAttribute('open'),null);assert.equal(await page.locator('#synthetic-banner').isVisible(),true);await layout();
    const routine=`routine-${label}.png`;await page.screenshot({path:join(directory,routine),fullPage:true});screenshots.push(routine);
    await page.locator('#supporting-review > summary').click();assert.equal(await page.locator('#assembled-reference-list').isVisible(),true);assert.match(await page.locator('#assembled-reference-list').innerText(),/GOOGLE_TEMPORARY_SUGGESTION/);await layout();
    const evidence=`supporting-evidence-${label}.png`;await page.screenshot({path:join(directory,evidence),fullPage:true});screenshots.push(evidence);
    await nav('IP-P3');assert.equal(await page.locator('#review-tier').innerText(),'Exception review');assert.equal(await page.locator('#component-fields').isVisible(),true);assert.equal(await page.locator('#acreage-ack').isVisible(),true);assert.match(await page.locator('#suggestion-suffix').innerText(),/County suffix: CI/);assert.match(await page.locator('#suggestion-suffix').innerText(),/Suggested suffix: Circle\/Cir/);await layout();
    const exception=`exception-${label}.png`;await page.screenshot({path:join(directory,exception),fullPage:true});screenshots.push(exception);
  }
  checks.push('1440/768/390px routine compact, supporting evidence expands, long address wraps, exception details/acreage/suffix remain visible; no horizontal overflow or overlapping action buttons.');
  await page.setViewportSize({width:1440,height:1000});await nav('IP-P2');
  const auth={Authorization:`Bearer ${app.token}`,Origin:app.origin};
  const v=await(await context.request.get(app.origin+'/api/pilots/IP-P1',{headers:auth})).json();
  assert.equal((await context.request.post(app.origin+'/api/pilots/IP-P1/validate',{headers:auth,data:{pilotCode:'IP-P1',packetSha256:v.packet.packetSha256,reviewMode:'ROUTINE',routineEvidenceReviewed:true,suggestionEvidenceRef:v.googleSuggestion.reference}})).status(),409);
  const before=await readFile(decisionFile,'utf8');
  await page.locator('#decision').selectOption('APPROVED');await page.locator('#reviewer-ack').check();await page.locator('#save').click();await page.waitForFunction(()=>document.getElementById('validation-results').textContent.includes('EXPLICIT_EVIDENCE_REVIEW_REQUIRED'));
  assert.equal(await readFile(decisionFile,'utf8'),before);
  await page.locator('#routine-evidence-ack').check();await page.locator('#validate').click();await page.waitForFunction(()=>document.getElementById('validation-results').textContent.includes('Nothing was saved'));
  assert.equal(await readFile(decisionFile,'utf8'),before);
  await page.locator('#save').click();await page.waitForFunction(()=>document.getElementById('save-confirmation').textContent.startsWith('Saved locally: Approved'));
  assert.equal(await page.locator('#reviewer-ack').isChecked(),false);assert.equal(await page.locator('#routine-evidence-ack').isChecked(),false);assert.match(await page.locator('#audit-entries').innerText(),/APPROVED/);
  const saved=await readFile(decisionFile,'utf8');await nav('IP-P1');assert.equal(await page.locator('#review-tier').innerText(),'Exception review');await nav('IP-P2');assert.equal(await readFile(decisionFile,'utf8'),saved);
  assert.match(await page.locator('#routine-notes').inputValue(),/Reviewer explicitly confirmed/);
  await page.locator('#detailed-review > summary').click();await page.locator('#routine-controls').waitFor({state:'hidden'});assert.equal(await page.locator('#decision').inputValue(),'');assert.equal(await page.locator('#reviewer-ack').isChecked(),false);
  checks.push('Explicit group review and personal attestation required; validate-only read-only; synthetic compact approval saves/reopens with source binding; forged routine request for exception rejected.');
  const diagFile=join(directory,'google-geocoding-ip-p2/diagnostic.json'),diag=JSON.parse(await readFile(diagFile));
  diag.retention.deleteOrReviewBy=new Date(Date.now()-1000).toISOString();await writeFile(diagFile,JSON.stringify(diag));
  // A changed/expired original fails closed; never re-pin or extend the real evidence.
  await page.reload();await page.locator('#access-code').fill(app.token);await page.getByRole('button',{name:'Open private review'}).click();await page.locator('#review-content').waitFor({state:'visible'});await nav('IP-P2');
  assert.equal(await page.locator('#review-tier').innerText(),'Insufficient evidence');assert.equal(await page.locator('#tier-address').innerText(),'No permitted complete address proposal');assert.equal(await page.locator('#decision').inputValue(),'');assert.equal(await page.locator('#component-postalCode').inputValue(),'');
  assert.match(await page.locator('#audit-entries').innerText(),/APPROVED/);assert.match(await page.locator('#audit-state').innerText(),/SUSPENDED/);assert.equal(await readFile(decisionFile,'utf8'),saved);
  const expired='suspended-history-desktop.png';await page.screenshot({path:join(directory,expired),fullPage:true});screenshots.push(expired);
  checks.push('Unavailable evidence clears content, hides derived fields and suspends effectiveness without erasing historical decision or changing its stored bytes.');
  await page.getByRole('button',{name:'Lock review',exact:true}).click();assert.equal(await page.locator('#tier-address').innerText(),'');assert.equal(await page.locator('#audit-entries').innerText(),'');assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  assert.equal(external.length,0);assert.equal(errors.length,0);await browser.close();browser=null;const stopped=await ipc({action:'stop'});assert.equal(stopped.offline.networkAttempts,0);
  const summary={status:'PASS',at:new Date().toISOString(),checks,screenshots,syntheticOnly:true,viewports:[1440,768,390],localBrowserRequests:paths.length,externalBrowserRequests:external.length,consoleOrPageErrors:errors.length,serverOutboundAttempts:stopped.offline.networkAttempts,providerCalls:0,databaseConnections:0,realDecisionsChanged:0,realPropertiesCreated:0};
  await writeFile(join(directory,'streamlined-ui-qa.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...summary,directory}));
}
try{await main();}catch(e){console.error(JSON.stringify({status:'STREAMLINED_QA_FAILED',error:e.message,location:e.stack?.split('\n').find(l=>l.includes('streamlined-ui-qa.js:')),completedChecks:checks.length}));process.exitCode=1;}finally{await browser?.close().catch(()=>{});if(worker?.connected){try{await ipc({action:'stop'});}catch{worker.kill();}}}
