import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {investmentRoute} from '../apps/web/src/features/property-detail/navigation.js';

const root=process.cwd(),base=path.join(root,'data/runtime/pi-v2-risk-sync');await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'qa-')),storeDirectory=path.join(output,'scenarios'),discoveryStoreDirectory=path.join(output,'discovery-state');
const evidence=await addPropertyDetails(await loadEvidence(root)),property=evidence.properties.find(item=>item.ref==='GABE-01');assert.ok(property);
const app=await startInvestmentWorkspace({port:0,root,storeDirectory,discoveryStoreDirectory,propertyDetail:true});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage();await page.setViewport({width:1440,height:1000});
const checks=[],screenshots=[],blocked=[],errors=[];const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
await page.setRequestInterception(true);page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().startsWith(app.origin)||/^(data:|blob:|about:blank)/.test(request.url()))request.continue();else{blocked.push(request.url().split('?')[0]);request.abort();}});
const button=label=>page.evaluate(label=>{const item=[...document.querySelectorAll('button,a')].find(node=>node.textContent.trim()===label);if(!item||item.disabled)throw new Error(`Unavailable control: ${label}`);item.click();},label);
const setInput=async(selector,value)=>{await page.waitForSelector(selector);await page.$eval(selector,(input,next)=>{const prototype=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:input instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,String(next));input.dispatchEvent(new Event(input instanceof HTMLSelectElement?'change':'input',{bubbles:true}));},value);};
const value=selector=>page.$eval(selector,input=>input.value),origin=selector=>page.$eval(selector,input=>input.dataset.origin),shot=async(name,selector='.iw-stage-content')=>{const file=path.join(output,`${name}.png`);await page.$eval(selector,node=>node.scrollIntoView({block:'start'}));await new Promise(resolve=>setTimeout(resolve,100));await page.screenshot({path:file,fullPage:false});screenshots.push(file);};
const setUnderwriting=async values=>{await button('Underwriting');for(const [key,next] of Object.entries(values))await setInput(`[data-testid="input-${key}"]`,next);};

try{
  await page.goto(`${app.origin}/${investmentRoute(property.ref,property.evidenceFingerprint??evidence.fingerprint,null,'Underwriting')}`,{waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="input-purchasePrice"]');
  await setUnderwriting({purchasePrice:180000,exitValue:315000,rehabCost:40000,renovationDays:90,marketingDays:30});await button('Risk');
  await page.waitForFunction(()=>document.querySelector('[aria-label="exitValue mode"]')?.value==='315000');
  check('Most Likely exit inherits resale',await value('[aria-label="exitValue mode"]')==='315000');check('Most Likely rehab inherits rehabilitation',await value('[aria-label="rehabCost mode"]')==='40000');check('Most Likely renovation inherits duration',await value('[aria-label="renovationDays mode"]')==='90');check('Most Likely marketing inherits duration',await value('[aria-label="marketingDays mode"]')==='30');
  check('inherited provenance is visible',await origin('[aria-label="exitValue mode"]')==='INHERITED');check('minimum and maximum remain unset',await value('[aria-label="exitValue min"]')===''&&await value('[aria-label="exitValue max"]')==='');check('default seed is reproducible',await value('[aria-label="Simulation seed"]')==='12345');check('opening Risk does not run Monte Carlo',await page.$('[data-testid="risk-result"]')===null);await shot('01-inherited-most-likely');

  await setInput('[aria-label="exitValue mode"]',325000);check('manual edit is labeled',await origin('[aria-label="exitValue mode"]')==='MANUAL');
  await setUnderwriting({exitValue:350000,rehabCost:45000,renovationDays:100,marketingDays:40});await button('Risk');await page.waitForFunction(()=>document.querySelector('[aria-label="rehabCost mode"]')?.value==='45000');
  check('manual Most Likely survives underwriting change',await value('[aria-label="exitValue mode"]')==='325000');check('inherited values follow underwriting change',await value('[aria-label="rehabCost mode"]')==='45000'&&await value('[aria-label="renovationDays mode"]')==='100'&&await value('[aria-label="marketingDays mode"]')==='40');

  await button('Populate illustrative risk assumptions');await page.waitForSelector('[data-testid="notification-dialog"]');await button('Replace ranges');await page.waitForFunction(()=>document.querySelector('[aria-label="exitValue min"]')?.value!=='');
  check('illustrative bounds are populated but not run',await origin('[aria-label="exitValue min"]')==='ILLUSTRATIVE'&&await origin('[aria-label="exitValue mode"]')==='ILLUSTRATIVE'&&await page.$('[data-testid="risk-result"]')===null);check('illustrative label is visible',await page.$eval('.iw-risk-table',table=>table.textContent.includes('Illustrative preset')));await shot('02-illustrative-editable-ranges');

  await setInput('[aria-label="Iterations"]',500);await setInput('[aria-label="Uncertainty rationale"]','Illustrative analyst-selected triangular assumptions for focused QA; not calibrated forecasts.');
  await page.focus('[aria-label="About the reproducible seed"]');await page.waitForSelector('.pi-tooltip');check('seed tooltip works from keyboard focus',await page.$eval('.pi-tooltip',node=>node.textContent.includes('same saved seed')));await page.keyboard.press('Escape');
  await page.focus('[data-testid="run-risk"]');await page.waitForSelector('.pi-tooltip');check('Run Monte Carlo tooltip explains validation and save boundary',await page.$eval('.pi-tooltip',node=>node.textContent.includes('Validate')&&node.textContent.includes('does not save')));await page.keyboard.press('Escape');

  await button('Run Monte Carlo');await page.waitForSelector('[data-testid="risk-result"]');const firstResult=await page.$eval('[data-testid="risk-result"]',node=>node.innerText);await button('Run Monte Carlo');await page.waitForFunction(previous=>document.querySelector('[data-testid="risk-result"]')?.innerText===previous,{},firstResult);const secondResult=await page.$eval('[data-testid="risk-result"]',node=>node.innerText);check('same seed and assumptions reproduce the displayed result',secondResult===firstResult);await shot('03-deterministic-risk-result','[data-testid="risk-result"]');

  const validMin=await value('[aria-label="exitValue min"]');await setInput('[aria-label="exitValue min"]',999999);await button('Run Monte Carlo');await page.waitForFunction(()=>[...document.querySelectorAll('.iw-error')].some(node=>node.textContent.includes('ordered minimum')));const orderedError=await page.$$eval('.iw-error',nodes=>nodes.some(node=>node.textContent.includes('ordered minimum')));check('invalid bounds are rejected and stale simulation output is cleared',orderedError&&await page.$('[data-testid="risk-result"]')===null);await setInput('[aria-label="exitValue min"]',validMin);await button('Run Monte Carlo');await page.waitForFunction(()=>document.querySelector('[data-testid="risk-result"]'));

  const firstScenario=await value('[aria-label="Scenario"]');await button('Save locally');await page.waitForFunction(()=>document.body.textContent.includes('Saved locally as revision 1'));await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('[aria-label="exitValue mode"]');check('saved revision restores seed and simulation assumptions',await value('[aria-label="Simulation seed"]')==='12345'&&await value('[aria-label="exitValue mode"]')==='350000');check('saved simulation output restores without rerun',await page.$('[data-testid="risk-result"]')!==null);

  await button('New blank');await setUnderwriting({purchasePrice:140000,exitValue:220000,rehabCost:25000,renovationDays:60,marketingDays:20});await button('Risk');await page.waitForFunction(()=>document.querySelector('[aria-label="exitValue mode"]')?.value==='220000');const secondScenario=await value('[aria-label="Scenario"]');check('new scenario has independent inherited risk values',secondScenario!==firstScenario&&await value('[aria-label="rehabCost mode"]')==='25000');await setInput('[aria-label="exitValue mode"]',225000);
  await setInput('[aria-label="Scenario"]',firstScenario);await page.waitForFunction(()=>document.querySelector('[aria-label="exitValue mode"]')?.value==='350000');check('switching restores first scenario risk and seed',await value('[aria-label="Simulation seed"]')==='12345'&&await origin('[aria-label="exitValue mode"]')==='ILLUSTRATIVE');await setInput('[aria-label="Scenario"]',secondScenario);await page.waitForFunction(()=>document.querySelector('[aria-label="exitValue mode"]')?.value==='225000');check('switching back preserves second scenario manual override',await origin('[aria-label="exitValue mode"]')==='MANUAL');

  check('zero external/provider calls',blocked.length===0);check('zero browser errors',errors.length===0);
  const result={status:'PASS',at:new Date().toISOString(),checks,screenshots,providerCalls:0,databaseConnections:0,databaseWrites:0,deployments:0,blocked,errors};await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'PASS',output,checks:checks.length,screenshots}));
}finally{await browser.close();await app.close();}

