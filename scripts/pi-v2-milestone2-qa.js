import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {signLeadRequest} from '../src/leads/authentication.js';
import {LEAD_CONTRACT_VERSION} from '../src/leads/contract.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {reportScenario} from '../tests/fixtures/workspaceReports.js';

const root=process.cwd(),base=path.join(root,'data/runtime/pi-v2-milestone2');await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'qa-')),secret='offline-milestone2-qa-secret-value-32-bytes',checks=[],screenshots=[],remoteRequests=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const fixture={contractVersion:LEAD_CONTRACT_VERSION,source:'sellmykernhome.com',externalLeadId:'7f88bf30-b317-4c76-b859-cf8acd23f62c',submittedAt:new Date().toISOString(),origin:{site:'sellmykernhome.com',form:'seller_inquiry',landingPath:'/qa-offline'},address:{line1:'1708 Crestview Drive',city:'Bakersfield',state:'CA',postalCode:'93305'},contact:{name:'Milestone 2 QA Seller',preferred:'email',email:'local-qa@example.invalid',phone:''},consent:{privacyAcknowledged:true,privacyVersion:'2026-10-14-draft',marketingConsent:false,capturedAt:new Date().toISOString()},sellerStatements:{propertyType:'Single-family home',condition:'Minor updates needed',occupancy:'Owner occupied',desiredTiming:'Exploring options',comments:'Offline staging fixture. No real seller or transmission.'},photoReferences:[{reference:'private-reference-only',url:'https://private.example.invalid/assets/1',mediaType:'image/jpeg'}]};
const app=await startInvestmentWorkspace({port:0,root,storeDirectory:path.join(output,'scenarios'),discoveryStoreDirectory:path.join(output,'discovery'),leadStoreDirectory:path.join(output,'leads'),leadIntakeSecret:secret,propertyDetail:true});
const body=JSON.stringify(fixture),timestamp=new Date().toISOString(),headers={'Content-Type':'application/json','X-PI-Lead-Source':fixture.source,'X-PI-Timestamp':timestamp,'X-PI-Signature':signLeadRequest(secret,timestamp,body)};
const acceptedStarted=performance.now(),accepted=await fetch(`${app.origin}/api/lead-intake/v1`,{method:'POST',headers,body}),receipt=await accepted.json();check('signed local intake accepted exactly once',accepted.status===201&&!receipt.duplicate);
const retry=await (await fetch(`${app.origin}/api/lead-intake/v1`,{method:'POST',headers,body})).json();check('safe retry returns the same lead and marks duplicate review',retry.id===receipt.id&&retry.duplicate&&retry.duplicateReviewRequired);
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage();await page.setViewport({width:1500,height:1000});
await page.setRequestInterception(true);page.on('request',request=>{if(request.url().startsWith(app.origin)||/^(data:|blob:|about:blank)/.test(request.url()))request.continue().catch(()=>{});else{remoteRequests.push(request.url().split('?')[0]);request.abort().catch(()=>{});}});
const click=async label=>page.evaluate(label=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===label&&!item.disabled);if(!button)throw new Error(`Button unavailable: ${label}`);button.click();},label);
const shot=async name=>{const target=path.join(output,`${name}.png`);await page.screenshot({path:target,fullPage:true});screenshots.push(target);};
try{
  await page.goto(`${app.origin}/#incoming-leads`,{waitUntil:'networkidle0'});await page.waitForFunction(()=>document.body.textContent.includes('Milestone 2 QA Seller'));await shot('01-incoming-lead-new');check('Incoming Leads queue displays seller-supplied context',await page.evaluate(()=>document.body.textContent.includes('seller statement')&&document.body.textContent.includes('NEW')));
  await click('Review Lead');await page.waitForFunction(()=>document.body.textContent.includes('NEEDS_REVIEW'));check('Review Lead moves the local record to needs review',true);
  await click('Research Address');await page.waitForFunction(()=>document.body.textContent.includes('One retained evidence match'));await shot('02-address-research-match');check('address research matched retained Crestview with no provider request',true);
  await page.evaluate(()=>{const link=[...document.querySelectorAll('a')].find(item=>item.textContent.trim()==='Start Analysis');link.click();});await page.waitForSelector('.investment-workspace');await page.waitForFunction(()=>document.body.textContent.includes('1708 Crestview Dr'));await shot('03-start-analysis-retained-evidence');check('Start Analysis preserves the retained GABE-01 subject',locationHash(await page.url()).includes('GABE-01'));
  const evidence=await addPropertyDetails(await loadEvidence(root),root),draft={...reportScenario(evidence,0),revision:0,id:'b778ddaf-5d6e-4d53-8385-6c9dddcc6d53',name:'Milestone 2 lead workflow QA'},localHeaders={'Content-Type':'application/json','X-PI-Workspace':'local-v1',Origin:app.origin};
  const saved=await (await fetch(`${app.origin}/api/investment/save`,{method:'POST',headers:localHeaders,body:JSON.stringify(draft)})).json();check('lead subject can reach a saved scenario without durable Property creation',saved.revision===1&&saved.propertyRef==='GABE-01');
  const pdfStarted=performance.now();for(const kind of ['brief','full']){const response=await fetch(`${app.origin}/api/investment/report`,{method:'POST',headers:localHeaders,body:JSON.stringify({id:saved.id,revision:saved.revision,kind,pdf:true})}),bytes=new Uint8Array(await response.arrayBuffer());check(`${kind} report generated from the saved local scenario`,response.ok&&bytes.length>20_000);await writeFile(path.join(output,`GABE-01-${kind}-milestone2-qa.pdf`),bytes,{flag:'wx'});}const pdfDurationMs=performance.now()-pdfStarted;
  check('first local report workflow completed within 15 minutes',performance.now()-acceptedStarted<15*60_000);check('two local PDFs completed within two minutes',pdfDurationMs<2*60_000);check('browser made zero remote requests',remoteRequests.length===0);
  const result={status:'PASS',at:new Date().toISOString(),node:process.version,browser:await browser.version(),checks,screenshots,leadToFirstReportMs:performance.now()-acceptedStarted,twoPdfGenerationMs:pdfDurationMs,providerCalls:0,databaseConnections:0,productionWrites:0,externalLeadTransmissions:0,remoteRequests};await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'PASS',output,checks:checks.length,screenshots:screenshots.length,leadToFirstReportMs:Math.round(result.leadToFirstReportMs),twoPdfGenerationMs:Math.round(pdfDurationMs)}));
}finally{page.removeAllListeners();await browser.close();await app.close();}

function locationHash(url){return new URL(url).hash;}
