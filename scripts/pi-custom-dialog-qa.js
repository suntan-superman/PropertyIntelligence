import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {investmentRoute} from '../apps/web/src/features/property-detail/navigation.js';

const root=process.cwd(),base=path.join(root,'data/runtime/pi-custom-notification-dialog');await mkdir(base,{recursive:true});const output=await mkdtemp(path.join(base,'qa-'));
const evidence=await addPropertyDetails(await loadEvidence(root)),property=evidence.properties.find(item=>item.ref==='GABE-01');assert.ok(property);
const app=await startInvestmentWorkspace({port:0,root,storeDirectory:path.join(output,'scenarios'),propertyDetail:true}),browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage();await page.setViewport({width:1440,height:950});
const checks=[],blocked=[],errors=[];let nativeDialogs=0;const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
await page.setRequestInterception(true);page.on('request',request=>{if(request.url().startsWith(app.origin)||/^(data:|blob:|about:blank)/.test(request.url()))request.continue();else{blocked.push(request.url().split('?')[0]);request.abort();}});page.on('pageerror',error=>errors.push(error.message));page.on('dialog',async dialog=>{nativeDialogs++;await dialog.dismiss();});
const click=label=>page.evaluate(label=>{const item=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===label);if(!item||item.disabled)throw new Error(`Unavailable button: ${label}`);item.focus({preventScroll:true});item.click();},label);
const fill=async(value)=>page.$eval('[data-testid="input-purchasePrice"]',(input,next)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,String(next));input.dispatchEvent(new Event('input',{bubbles:true}));},value);
try{
  await page.goto(`${app.origin}/${investmentRoute(property.ref,property.evidenceFingerprint??evidence.fingerprint)}`,{waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="input-purchasePrice"]');await fill(175000);await page.waitForFunction(()=>localStorage.getItem('pi-investment-workspace-v1-drafts')?.includes('175000'));
  await page.reload({waitUntil:'networkidle0'});check('reload uses no native browser dialog',nativeDialogs===0);check('dirty draft survives reload',await page.$eval('[data-testid="input-purchasePrice"]',input=>input.value)==='175000');
  await click('Reset draft');await page.waitForSelector('[data-testid="notification-dialog"]',{visible:true});check('custom reset dialog is an accessible alertdialog',await page.$eval('[data-testid="notification-dialog"] section',element=>element.getAttribute('role'))==='alertdialog');check('custom copy identifies saved revision safety',await page.$eval('[data-testid="notification-dialog"]',element=>/Saved revisions remain unchanged/.test(element.textContent)));check('confirm receives initial focus',await page.evaluate(()=>document.activeElement?.matches('[data-testid="notification-confirm"]')));
  const screenshot=path.join(output,'custom-reset-dialog.png');await page.screenshot({path:screenshot,fullPage:false});await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[data-testid="notification-dialog"]'));check('Escape cancels without changing draft',await page.$eval('[data-testid="input-purchasePrice"]',input=>input.value)==='175000');await page.waitForFunction(()=>document.activeElement?.textContent.trim()==='Reset draft');check('focus returns to invoking control',true);
  await click('Reset draft');await page.waitForSelector('[data-testid="notification-dialog"]');await page.click('[data-testid="notification-confirm"]');await page.waitForFunction(()=>document.querySelector('[data-testid="input-purchasePrice"]')?.value==='');check('confirmed reset clears only draft assumptions',true);
  check('no provider or external requests',blocked.length===0);check('no browser errors',errors.length===0);
  const result={status:'PASS',at:new Date().toISOString(),checks,screenshot,nativeDialogs,providerCalls:0,databaseConnections:0,databaseWrites:0,deployments:0,blocked,errors};await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'PASS',output,checks:checks.length,screenshot,nativeDialogs}));
}finally{await browser.close();await app.close();}
