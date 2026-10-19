import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';

const root=process.cwd(),output=path.join(root,'data/validation/pi-v2-3-comparable-presentation'),temporary=await mkdtemp(path.join(root,'.tmp','pi-v2-3-comps-'));await mkdir(output,{recursive:true});
const app=await startInvestmentWorkspace({port:0,root,propertyDetail:true,storeDirectory:path.join(temporary,'scenarios'),discoveryStoreDirectory:path.join(temporary,'discovery'),leadStoreDirectory:path.join(temporary,'leads')}),browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage();await page.setViewport({width:1280,height:900});
const checks=[],screenshots=[],external=[],errors=[],check=(name,value)=>{assert.ok(value,name);checks.push(name);},shot=async name=>{const file=path.join(output,`${name}.png`);await page.screenshot({path:file,fullPage:true});screenshots.push(file);};
await page.setRequestInterception(true);page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().startsWith(app.origin)||/^(data:|blob:|about:blank)/.test(request.url()))request.continue().catch(()=>{});else{external.push(request.url().split('?')[0]);request.abort().catch(()=>{});}});
const clickText=(selector,text)=>page.evaluate(({selector,text})=>{const control=[...document.querySelectorAll(selector)].find(node=>node.textContent.replace(/\s+/g,' ').trim().includes(text)&&!node.disabled);if(!control)throw new Error(`Missing control: ${text}`);control.click();},{selector,text});
try{
  const bootstrap=await (await fetch(`${app.origin}/api/investment/bootstrap`)).json(),property=bootstrap.properties.find(item=>item.ref==='GABE-01'),url=`${app.origin}/#investment?subject=${encodeURIComponent(property.ref)}&snapshot=${encodeURIComponent(property.evidenceFingerprint??bootstrap.evidenceFingerprint)}&tab=${encodeURIComponent('Sold Sales')}&mode=guided`;
  await page.goto(url,{waitUntil:'networkidle0'});await page.waitForSelector('.iw-comparable-table tbody tr');
  check('address is the primary comparable row control',await page.$eval('.iw-comparable-table tbody tr:first-child .iw-comp-address .link',(node,address)=>node.textContent.trim()===address,property.sales[0].address));
  check('suggested comparable columns are present',await page.$$eval('.iw-comparable-table thead th',nodes=>nodes.map(node=>node.textContent.trim()).join('|')==='Property address|Sold price and date|Property characteristics|Distance and relevance|Include / review'));
  check('raw references are hidden in the normal collapsed view',await page.$eval('.iw-comparable-table',(node,reference)=>!node.innerText.includes(reference)&&!node.innerText.includes('data/raw/')&&!node.innerText.includes('data\\raw\\'),property.sales[0].evidenceRef));
  check('desktop view has no document-level horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  await shot('01-address-first-comparables');
  const firstSource=await page.$('.iw-comparable-table .pi-source-details summary');await firstSource.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.iw-comparable-table .pi-source-details')?.open);
  check('Source Details opens from the keyboard',await page.$eval('.iw-comparable-table .pi-source-details',node=>node.open));
  check('raw audit reference appears only after Source Details opens',await page.$eval('.iw-comparable-table .pi-source-details',(node,reference)=>node.innerText.includes('Internal evidence reference')&&node.innerText.includes(reference),property.sales[0].evidenceRef));
  await shot('02-source-details-open');
  await clickText('.iw-comp-review summary','Review Comparable');const address=property.sales[0].address,checkbox=`input[aria-label="Include ${address} in research"]`,notes=`textarea[aria-label="Analyst notes for ${address}"]`;await page.click(checkbox);await page.type(notes,'Selected after address-first comparable review.');const scenarioId=await page.$eval('select[aria-label="Scenario"]',node=>node.value);await page.click('[data-testid="save-scenario"]');await page.waitForFunction(()=>document.body.innerText.includes('Saved locally as revision 1'));
  await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.iw-comparable-table tbody tr');check('inclusion persists after saved revision reload',await page.$eval(checkbox,node=>node.checked));await clickText('.iw-comp-review summary','Review Comparable');check('analyst notes persist after saved revision reload',await page.$eval(notes,node=>node.value==='Selected after address-first comparable review.'));
  check('same scenario remains selected after reload',await page.$eval('select[aria-label="Scenario"]',(node,id)=>node.value===id,scenarioId));
  await clickText('[data-testid="workspace-mode"]','Open Advanced Workspace');await clickText('.iw-stage-nav button','Property Research');await clickText('.iw-tabs button','Listings');await page.waitForSelector('.iw-listing-table');
  check('listing table is address-first and hides raw references by default',await page.$eval('.iw-listing-table',node=>node.querySelector('th')?.textContent.trim()==='Property address'&&!node.innerText.includes('data/raw/')));
  check('listing desktop view has no document-level horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));await shot('03-listings-cleanup');
  check('browser runtime has no errors',errors.length===0);check('no provider or other external requests were completed',external.length===0);
  const result={status:'PASS',at:new Date().toISOString(),checks,screenshots,providerCalls:0,databaseWrites:0,externalRequests:external,browserErrors:errors};await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks:checks.length,screenshots},null,2));
}finally{await browser.close();await app.close();}
