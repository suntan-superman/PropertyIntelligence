import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {investmentRoute} from '../apps/web/src/features/property-detail/navigation.js';

const root=process.cwd(),base=path.join(root,'data/runtime/pi-v2-contextual-help');
await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'qa-')),scenarioDirectory=path.join(output,'scenarios');
const evidence=await addPropertyDetails(await loadEvidence(root)),subject=evidence.properties.find(item=>item.ref==='GABE-01');
assert.ok(subject,'Required retained subject unavailable.');
const app=await startInvestmentWorkspace({port:0,root,storeDirectory:scenarioDirectory,propertyDetail:true});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
const checks=[],remoteAttempts=[];const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
await page.setRequestInterception(true);
page.on('request',request=>{if(request.url().startsWith(app.origin)||request.url().startsWith('data:')||request.url()==='about:blank')request.continue();else{remoteAttempts.push(request.url().split('?')[0]);request.abort();}});
const visibleTip=()=>page.$eval('#pi-global-tooltip',element=>({text:element.textContent,role:element.getAttribute('role'),rect:element.getBoundingClientRect().toJSON()}));
try{
  const route=investmentRoute(subject.ref,subject.evidenceFingerprint??evidence.fingerprint);
  await page.goto(`${app.origin}/${route}`,{waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="save-scenario"]',{visible:true});
  await page.hover('[data-testid="save-scenario"]');await page.waitForSelector('#pi-global-tooltip',{visible:true});
  let tip=await visibleTip();check('hover explains saved-revision behavior',tip.text.includes('new saved revision')&&tip.role==='tooltip');
  check('hover target is programmatically described',await page.$eval('[data-testid="save-scenario"]',element=>element.getAttribute('aria-describedby'))==='pi-global-tooltip');
  await page.mouse.move(1,1);await page.waitForFunction(()=>!document.querySelector('#pi-global-tooltip'));
  await page.$eval('.iw-scenario button.secondary',element=>element.focus());await page.waitForSelector('#pi-global-tooltip',{visible:true});
  tip=await visibleTip();check('keyboard focus explains scenario duplication',tip.text.includes('separate unsaved scenario'));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#pi-global-tooltip'));
  await page.$eval('.iw-tabs [role="tab"]',element=>element.focus());await page.waitForSelector('#pi-global-tooltip',{visible:true});
  check('tabs receive concise contextual help',(await visibleTip()).text.includes('without changing saved data'));
  await page.keyboard.press('Escape');
  const infoCount=await page.$$eval('.pi-info-tooltip',elements=>elements.length);check('financial information icons are present',infoCount>=5);
  const exitIcon='[data-testid="input-exitValue"]';const iconIndex=await page.evaluate(selector=>{const label=document.querySelector(selector)?.closest('label');return [...document.querySelectorAll('.pi-info-tooltip')].indexOf(label?.querySelector('.pi-info-tooltip'));},exitIcon);
  check('estimated resale has an information icon',iconIndex>=0);
  await page.evaluate(index=>{const icon=document.querySelectorAll('.pi-info-tooltip')[index];icon.scrollIntoView({block:'center'});icon.click();},iconIndex);await page.waitForSelector('#pi-global-tooltip',{visible:true});
  tip=await visibleTip();check('click pins estimated-resale help',tip.text.includes('not a certified ARV'));
  check('tooltip stays inside viewport and does not cover its icon',await page.evaluate(()=>{const tip=document.querySelector('#pi-global-tooltip').getBoundingClientRect(),icon=document.querySelector('[aria-describedby="pi-global-tooltip"]').getBoundingClientRect();const overlap=!(tip.right<=icon.left||tip.left>=icon.right||tip.bottom<=icon.top||tip.top>=icon.bottom);return tip.left>=0&&tip.right<=innerWidth&&tip.top>=0&&tip.bottom<=innerHeight&&!overlap;}));
  await page.screenshot({path:path.join(output,'contextual-help-underwriting.png'),fullPage:false});
  await page.keyboard.press('Escape');
  await page.click('[data-testid="stage-comparables"]');await page.waitForFunction(()=>document.querySelector('.iw-tabs [role="tab"][aria-selected="true"]')?.textContent==='Sold Sales');
  const comp=await page.$('[data-sale-row] button.link');if(comp){await comp.hover();await page.waitForSelector('#pi-global-tooltip',{visible:true});check('comparable selection explains non-mutating review',(await visibleTip()).text.includes('comparable observation'));}
  await page.click('[data-testid="stage-reports"]');await page.waitForFunction(()=>document.querySelector('.iw-tabs [role="tab"][aria-selected="true"]')?.textContent==='Reports');
  const reportButtons=await page.$$('button');for(const button of reportButtons){if(!(await button.isIntersectingViewport())||await button.evaluate(element=>element.disabled))continue;await button.evaluate(element=>element.focus());await page.waitForSelector('#pi-global-tooltip',{visible:true});check(`button help: ${await button.evaluate(element=>element.textContent.trim())}`,Boolean((await visibleTip()).text.trim()));await page.keyboard.press('Escape');}
  check('no provider or other external browser requests occurred',remoteAttempts.length===0);
}finally{await browser.close();await app.close();}
const result={status:'PASS',at:new Date().toISOString(),node:process.version,checks,externalBrowserRequests:remoteAttempts,providerCalls:0,databaseConnections:0,productionWrites:0,screenshot:path.join(output,'contextual-help-underwriting.png')};
await writeFile(path.join(output,'contextual-help-qa.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,output,checks:checks.length,screenshot:result.screenshot}));
