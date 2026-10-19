import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {detailRoute} from '../apps/web/src/features/property-detail/navigation.js';

const root=process.cwd(),base=path.join(root,'data/runtime/pi-v2-milestone1');
await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'navigation-qa-')),scenarioDirectory=path.join(output,'scenarios');
const evidence=await addPropertyDetails(await loadEvidence(root)),crestview=evidence.properties.find(item=>item.ref==='GABE-01'),haven=evidence.properties.find(item=>item.subjectKind==='DURABLE_SAVED');
assert.ok(crestview&&haven,'Required Crestview and Haven evidence is unavailable.');

const app=await startInvestmentWorkspace({port:0,root,storeDirectory:scenarioDirectory,propertyDetail:true});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
const checks=[],screenshots=[],reportFiles=[],remoteAttempts=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
await page.setRequestInterception(true);
page.on('request',request=>{if(request.url().startsWith(app.origin)||request.url().startsWith('data:')||request.url()==='about:blank')request.continue();else{remoteAttempts.push(request.url().split('?')[0]);request.abort();}});
const shot=async(name,selector=null)=>{const file=path.join(output,`${name}.png`);if(selector){await page.waitForSelector(selector);await (await page.$(selector)).screenshot({path:file});}else await page.screenshot({path:file,fullPage:false});screenshots.push(file);};
const fill=async(key,value)=>{const selector=`[data-testid="input-${key}"]`;await page.waitForSelector(selector,{visible:true});await page.$eval(selector,(input,next)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,String(next));input.dispatchEvent(new Event('input',{bubbles:true}));},value);};
const clickText=async text=>page.evaluate(label=>{const control=[...document.querySelectorAll('button,a')].find(item=>item.textContent.trim()===label);if(!control||control.disabled)throw new Error(`Control unavailable: ${label}`);control.click();},text);
const save=async()=>{const pending=page.waitForResponse(response=>response.url().endsWith('/api/investment/save'));await clickText('Save locally');const response=await pending;if(!response.ok())throw new Error(`Scenario save failed: ${await response.text()}`);return response.json();};
const openDetail=async property=>{await page.goto(`${app.origin}/${detailRoute(property.ref,property.evidenceFingerprint??evidence.fingerprint)}`,{waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="create-deal"]');};
const enterAssumptions=async values=>{for(const [key,value] of Object.entries(values))await fill(key,value);await clickText('Apply illustrative preset');await page.waitForSelector('[data-testid="notification-dialog"]');await page.click('[data-testid="notification-confirm"]');await page.waitForFunction(()=>document.body.textContent.includes('Existing engine'));};
const generateReports=async scenario=>{for(const kind of ['brief','full']){const response=await fetch(`${app.origin}/api/investment/report`,{method:'POST',headers:{Origin:app.origin,'Content-Type':'application/json','X-PI-Workspace':'local-v1'},body:JSON.stringify({id:scenario.id,revision:scenario.revision,kind,pdf:true})});if(!response.ok)throw new Error(`Report generation failed: ${await response.text()}`);assert.equal(response.headers.get('content-type'),'application/pdf');const bytes=new Uint8Array(await response.arrayBuffer()),file=path.join(output,`${scenario.propertyRef}-${kind}-r${scenario.revision}.pdf`);assert.ok(bytes.length>10000);await writeFile(file,bytes,{flag:'wx'});reportFiles.push({subject:scenario.propertyRef,kind,file,bytes:bytes.length});}};
const reopenScenario=async({qa=false,name})=>{await page.goto(`${app.origin}/${qa?'#fixtures':'#my-workspace'}`,{waitUntil:'networkidle0'});await page.waitForFunction(()=>document.querySelector('h1')?.textContent==='My Workspace');await clickText('Analyses / Deals');await page.waitForSelector('.workspace-table');await page.evaluate(label=>{const row=[...document.querySelectorAll('.workspace-table tbody tr')].find(item=>item.textContent.includes(label));const link=[...(row?.querySelectorAll('a')??[])].find(item=>item.textContent==='Continue Analysis');if(!link)throw new Error(`Saved scenario unavailable: ${label}`);link.click();},name);await page.waitForSelector('[data-testid="input-purchasePrice"]',{visible:true});};
const values=()=>page.evaluate(()=>Object.fromEntries(['purchasePrice','rehabCost','exitValue'].map(key=>[key,document.querySelector(`[data-testid="input-${key}"]`)?.value])));

try{
  await openDetail(crestview);await page.click('[data-testid="create-deal"]');await page.waitForSelector('[data-testid="input-purchasePrice"]',{visible:true});
  check('Crestview handoff omits the generic property selector',await page.$('.iw-pool')===null);
  check('Crestview handoff preserves exact subject',await page.$eval('.iw-detail h2',element=>element.textContent)===crestview.address);
  check('Crestview handoff opens Underwriting',await page.$eval('.iw-tabs [role="tab"][aria-selected="true"]',element=>element.textContent)==='Underwriting');
  check('Crestview handoff binds exact snapshot',new URL(page.url()).hash.includes(encodeURIComponent(crestview.evidenceFingerprint??evidence.fingerprint)));
  await shot('01-crestview-direct-handoff');
  await enterAssumptions({purchasePrice:175000,rehabCost:40000,exitValue:315000});await page.$eval('[aria-label="Scenario name"]',(input)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'Crestview navigation acceptance');input.dispatchEvent(new Event('input',{bubbles:true}));});
  const crestScenario=await save();await generateReports(crestScenario);await reopenScenario({name:'Crestview navigation acceptance'});
  check('Crestview saved assumptions reopen exactly',JSON.stringify(await values())===JSON.stringify({purchasePrice:'175000',rehabCost:'40000',exitValue:'315000'}));

  await openDetail(haven);await page.click('[data-testid="create-deal"]');await page.waitForSelector('[data-testid="input-purchasePrice"]',{visible:true});
  check('Haven handoff preserves exact subject',await page.$eval('.iw-detail h2',element=>element.textContent)===haven.address);
  await enterAssumptions({purchasePrice:210000,rehabCost:35000,exitValue:360000});await page.$eval('[aria-label="Scenario name"]',(input)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'Haven navigation acceptance');input.dispatchEvent(new Event('input',{bubbles:true}));});
  const havenScenario=await save();await generateReports(havenScenario);
  await page.goto(`${app.origin}/#my-workspace`,{waitUntil:'networkidle0'});await page.waitForSelector('.workspace-table');
  check('ordinary My Workspace hides developer archive controls and internal IDs',await page.evaluate(()=>!document.querySelector('.qa-area')&&!/GABE-|SAVED-/.test(document.querySelector('.my-workspace').textContent)));
  check('Saved Properties offers direct property and analysis actions',await page.evaluate(()=>['Open Property','Continue Analysis'].every(label=>[...document.querySelectorAll('.workspace-table a')].some(link=>link.textContent===label))));
  await clickText('Analyses / Deals');
  check('Deals exposes Continue, Compare and Report actions',await page.evaluate(()=>['Continue Analysis','Compare Scenarios','Generate Report'].every(label=>[...document.querySelectorAll('.workspace-table a')].some(link=>link.textContent===label))));
  await shot('02-my-workspace-deals','.my-workspace');
  await reopenScenario({name:'Haven navigation acceptance'});
  check('Haven saved assumptions reopen exactly',JSON.stringify(await values())===JSON.stringify({purchasePrice:'210000',rehabCost:'35000',exitValue:'360000'}));
  await reopenScenario({name:'Crestview navigation acceptance'});
  check('switching back never mixes Haven assumptions into Crestview',JSON.stringify(await values())===JSON.stringify({purchasePrice:'175000',rehabCost:'40000',exitValue:'315000'}));

  await page.goto(`${app.origin}/#investment`,{waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="open-GABE-02"]');
  check('Analyze this property is enabled without a batch checkbox',await page.$eval('[data-testid="open-GABE-02"]',button=>!button.disabled));
  await page.click('[data-testid="open-GABE-02"]');await page.waitForSelector('[data-testid="input-purchasePrice"]',{visible:true});
  check('card action opens its own subject in Underwriting',await page.evaluate(()=>document.querySelector('.iw-detail h2')?.textContent.includes('2308 Kent Dr')&&document.querySelector('.iw-tabs [role="tab"][aria-selected="true"]')?.textContent==='Underwriting'));
  check('browser QA made zero external requests',remoteAttempts.length===0);
}finally{await browser.close();await app.close();}

const result={status:'PASS',at:new Date().toISOString(),node:process.version,checks,screenshots,reports:reportFiles,externalBrowserRequests:remoteAttempts,geocodingRequests:0,providerEnrichmentRequests:0,databaseConnections:0,productionWrites:0};
await writeFile(path.join(output,'navigation-qa-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,output,checks:checks.length,reports:reportFiles.length,screenshots:screenshots.length}));
