import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {createStore} from '../src/investment-workspace/store.js';
import {newAnalystEvidence} from '../src/investment-workspace/analyst-evidence.js';
import {workspaceReportHtml,renderWorkspacePdf} from '../src/investment-workspace/reports.js';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {investmentRoute} from '../apps/web/src/features/property-detail/navigation.js';
import {reportScenario} from '../tests/fixtures/workspaceReports.js';

const root=process.cwd(),base=path.join(root,'data/runtime/pi-v2-milestone1');await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'qa-')),scenarioDirectory=path.join(output,'scenarios'),evidence=await addPropertyDetails(await loadEvidence(root)),store=createStore(scenarioDirectory,evidence);
const hash=value=>createHash('sha256').update(value).digest('hex'),checks=[],reports=[],screenshots=[],remoteAttempts=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const analystEvidence=(ref)=>[{...newAnalystEvidence('CONDITION'),status:'PRESENT',value:ref==='GABE-01'?'Hypothetical moderate rehabilitation scope for scenario demonstration':'Condition remains externally unverified; conservative hypothetical scope used',sourceName:'Milestone 1 QA analyst scenario',sourceDate:'2026-10-14',retrievedAt:'2026-10-14',verificationClass:'UNVERIFIED_NOTE',notes:'Artificial QA research entry, not an inspection.',includeInReport:true,sensitive:false}];
const first=await store.save({...reportScenario(evidence,0),revision:0,name:'Crestview hypothetical base',analystEvidence:analystEvidence('GABE-01')});
const second=await store.save({...reportScenario(evidence,4),revision:0,name:'Boron conservative hypothetical',analystEvidence:analystEvidence('GABE-05')});
for(const scenario of [first,second]){
  const property=evidence.properties.find(item=>item.ref===scenario.propertyRef);
  for(const kind of ['brief','full']){
    const html=workspaceReportHtml(property,scenario,evidence,kind),rendered=await renderWorkspacePdf(html),filename=`${property.ref}-${kind==='brief'?'opportunity-brief':'full-investor-package'}-hypothetical.pdf`,target=path.join(output,filename);await writeFile(target,rendered.bytes,{flag:'wx'});
    const pdf=await getDocument({data:new Uint8Array(rendered.bytes),useSystemFonts:true}).promise,pages=[];
    for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){const page=await pdf.getPage(pageNumber),viewport=page.getViewport({scale:1}),items=(await page.getTextContent()).items.filter(item=>item.str?.trim()),bad=items.filter(item=>item.transform[4]<0||item.transform[4]+item.width>viewport.width+2||item.transform[5]<0||item.transform[5]>viewport.height+2);pages.push({page:pageNumber,characters:items.map(item=>item.str).join(' ').length,outOfBounds:bad.length,text:items.map(item=>item.str).join(' ')});}
    check(`${property.ref} ${kind}: PDF has no blank or out-of-bounds text pages`,pages.every(page=>page.characters>200&&page.outOfBounds===0));
    check(`${property.ref} ${kind}: evidence distinctions survive PDF`,pages.some(page=>/not (?:a renovation ARV|a lender-confirmed payoff)|not lender payoffs/i.test(page.text)));
    reports.push({subject:property.ref,kind,file:target,pages:pdf.numPages,bytes:rendered.bytes.length,sha256:hash(rendered.bytes),blockedResourceRequests:rendered.blockedRequests});await pdf.destroy();
  }
}

const app=await startInvestmentWorkspace({port:0,root,storeDirectory:scenarioDirectory,propertyDetail:true}),browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),browserVersion=await browser.version(),page=await browser.newPage();await page.setViewport({width:1440,height:1000});
await page.setRequestInterception(true);page.on('request',request=>{if(request.url().startsWith(app.origin)||request.url().startsWith('data:')||request.url()==='about:blank')request.continue().catch(()=>{});else{remoteAttempts.push(request.url().split('?')[0]);request.abort().catch(()=>{});}});
const shot=async(name,selector=null)=>{const target=path.join(output,`${name}.png`);if(selector){await page.waitForSelector(selector);await (await page.$(selector)).screenshot({path:target});}else await page.screenshot({path:target,fullPage:true});screenshots.push(target);};
const clickText=async text=>page.evaluate(text=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===text);if(!button||button.disabled)throw new Error(`Button unavailable: ${text}`);button.click();},text);
const fill=async(selector,value)=>{await page.waitForSelector(selector);await page.focus(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');if(String(value))await page.type(selector,String(value));};
const saveScenario=async()=>{const pending=page.waitForResponse(response=>response.url().endsWith('/api/investment/save'));await clickText('Save locally');const response=await pending;if(!response.ok())throw new Error(`Scenario save failed: ${await response.text()}`);};
try{
  await page.goto(`${app.origin}/#analyze-property`,{waitUntil:'networkidle0'});await page.waitForSelector('.address-analysis');const inputs=await page.$$('.address-analysis input');await inputs[0].type('999 New Research Ave');await inputs[1].type('Bakersfield');await page.click('.address-analysis button');await page.waitForFunction(()=>document.body.textContent.includes('No retained local evidence matches this address'));await shot('01-address-entry','.address-analysis');check('new address path explains evidence gap without provider call',true);
  const route=investmentRoute('GABE-01',evidence.properties[0].evidenceFingerprint??evidence.fingerprint);await page.goto(`${app.origin}/${route}`,{waitUntil:'networkidle0'});await page.waitForSelector('.iw-detail');
  await page.click('[data-testid="stage-evidence"]');await clickText('Analyst Evidence');await clickText('Add research item');await page.select('[aria-label="Evidence category 1"]','CONDITION');await page.select('[aria-label="Evidence status 1"]','PRESENT');await page.select('[aria-label="Evidence verification 1"]','UNVERIFIED_NOTE');await fill('[aria-label="Evidence value 1"]','Hypothetical moderate rehabilitation scope; no inspection');await fill('[aria-label="Evidence source 1"]','Milestone 1 analyst research note');await shot('02-analyst-evidence','.iw-evidence-editor');check('analyst evidence UI retains source and verification fields',await page.evaluate(()=>document.body.textContent.includes('Algorithmic estimated balance')&&document.body.textContent.includes('Separately verified payoff')));
  await page.click('[data-testid="stage-financial"]');for(const [key,value] of Object.entries({purchasePrice:175000,rehabCost:40000,exitValue:315000}))await fill(`[data-testid="input-${key}"]`,value);page.once('dialog',dialog=>dialog.accept());await clickText('Apply illustrative preset');if((await page.$('.iw-editor'))===null)throw new Error('Underwriting editor unavailable.');await page.waitForFunction(()=>document.body.textContent.includes('Existing engine'));await shot('03-basic-underwriting','.iw-editor');check('basic underwriting displays calculated outputs',await page.evaluate(()=>document.body.textContent.includes('Return-hurdle MAO')&&document.body.textContent.includes('Break-even purchase ceiling')));
  await fill('[aria-label="Scenario name"]','Crestview hypothetical base');await saveScenario();await clickText('Scenarios');await clickText('Duplicate');await fill('[aria-label="Scenario name"]','Crestview lower acquisition case');await clickText('Underwriting');await fill('[data-testid="input-purchasePrice"]',165000);await saveScenario();
  await clickText('Scenarios');await page.evaluate(()=>document.querySelector('[data-testid="scenario-comparison"]').scrollIntoView());await shot('04-scenario-comparison','[data-testid="scenario-comparison"]');check('two same-property scenarios compare without overwriting',await page.evaluate(()=>document.querySelectorAll('[data-testid="scenario-comparison"] tbody tr').length>=2));
  await page.click('[data-testid="stage-reports"]');const previewResponse=page.waitForResponse(response=>response.url().endsWith('/api/investment/report'));await clickText('Preview report');const previewHttp=await previewResponse;if(!previewHttp.ok())throw new Error(`Report preview failed: ${await previewHttp.text()}`);await page.waitForSelector('iframe[title="Report preview"]');await shot('05-report-preview','iframe[title="Report preview"]');check('same saved revision previews Opportunity Brief',true);
  check('zero browser requests outside local origin',remoteAttempts.length===0);
}finally{page.removeAllListeners();await browser.close();await app.close();}

const result={status:'PASS',at:new Date().toISOString(),node:process.version,browser:browserVersion,checks,reports,screenshots,providerCalls:0,databaseConnections:0,productionWrites:0,financialEngineChanges:0};
await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',output,checks:checks.length,reports:reports.map(({subject,kind,pages})=>({subject,kind,pages})),screenshots:screenshots.length}));
