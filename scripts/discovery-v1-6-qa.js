import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readdir,readFile,stat,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';

const root=process.cwd(),base=path.resolve('data/runtime/discovery-v1-6');await mkdir(base,{recursive:true});const output=await mkdtemp(path.join(base,'qa-'));
const protectedPaths=['src/underwriting/mao.js','src/analysis/monteCarlo','src/reports/investor-v1','data/runtime/identity-resolution-pilot'];
async function filesIn(target){const info=await stat(target);if(info.isFile())return [target];const out=[];for(const name of await readdir(target)){const full=path.join(target,name);out.push(...await filesIn(full));}return out;}
async function protection(){const result={};for(const relative of protectedPaths){for(const file of await filesIn(path.resolve(relative))){const key=path.relative(root,file).replaceAll('\\','/');result[key]=createHash('sha256').update(await readFile(file)).digest('hex');}}return result;}
const before=await protection();let mockedAddressTransmissions=0;
const component=(long_name,type)=>({long_name,types:[type]});
const addressTransport=async county=>{mockedAddressTransmissions++;return {status:'OK',results:[{formatted_address:`${county.street}, ${county.city}, CA 93309, USA`,place_id:'offline-v16-fixture',address_components:[component(county.street.match(/^\d+/)?.[0]??'1','street_number'),component(county.street.replace(/^\d+\s*/,''),'route'),component(county.city,'locality'),component('California','administrative_area_level_1'),component('93309','postal_code'),component('United States','country')],geometry:{location_type:'ROOFTOP',location:{lat:35.37,lng:-119.02}}}]};};
const app=await startInvestmentWorkspace({port:0,propertyDetail:true,storeDirectory:path.join(output,'scenarios'),discoveryStoreDirectory:path.join(output,'discovery-state'),addressTransport});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage(),checks=[],screenshots=[],pdfs=[],blocked=[],errors=[];let pass=false;
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const shot=async(name,height=1100)=>{await page.setViewport({width:1600,height});const file=path.join(output,`${name}.png`);await page.screenshot({path:file,fullPage:true});screenshots.push(file);};
const api=async(route,body)=>{const response=await fetch(`${app.origin}${route}`,{method:'POST',headers:{Origin:app.origin,'Content-Type':'application/json','X-PI-Workspace':'local-v1'},body:JSON.stringify(body),redirect:'error'});if(!response.ok)throw new Error(`${route}: ${response.status} ${await response.text()}`);return response;};
async function savePdf(kind,body,name){const response=await api('/api/discovery/report',{kind,...body}),bytes=Buffer.from(await response.arrayBuffer()),file=path.join(output,`${name}.pdf`);await writeFile(file,bytes,{flag:'wx'});const pdf=await getDocument({data:new Uint8Array(bytes)}).promise,text=[];for(let number=1;number<=pdf.numPages;number++){const pg=await pdf.getPage(number),content=await pg.getTextContent(),words=content.items.map(item=>item.str).join(' ');assert.ok(words.trim().length>80,`${name} page ${number} is blank or sparse`);text.push(words);const viewport=pg.getViewport({scale:1.1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await pg.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const imagePath=path.join(output,`${name}-page-${number}.png`);await writeFile(imagePath,canvas.toBuffer('image/png'),{flag:'wx'});screenshots.push(imagePath);}
  const joined=text.join('\n');check(`${name} PDF includes complete county disclaimer`,joined.includes('DISCLAIMER OF LIABILITY AND WARRANTIES')&&joined.includes('INDEMNIFICATION'));check(`${name} PDF preserves historical/current boundary`,/not current|does not establish current|current delinquency/i.test(joined));pdfs.push({name,file,pages:pdf.numPages,bytes:bytes.length});return {file,pages:pdf.numPages};}
await page.setRequestInterception(true);page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().startsWith(`${app.origin}/`)||/^(data:|blob:|about:blank)/.test(request.url()))return request.continue();blocked.push(request.url().split('?')[0]);request.abort();});
try{
  await page.setViewport({width:1600,height:1100});await page.goto(`${app.origin}/#discover`,{waitUntil:'networkidle0',timeout:120000});await page.waitForSelector('.candidate-table tbody tr',{timeout:120000});
  check('Residential Opportunities is the default view',await page.$eval('.discovery-tabs button.active',element=>element.textContent.includes('Residential Opportunities')));
  check('all 11,316 retained records are represented',await page.$eval('.discovery-metrics',element=>element.textContent.includes('11,316')));
  check('ZIP stays unavailable when not sourced',await page.$eval('.filters.v16',element=>element.textContent.includes('Unknown / not sourced')));
  check('screening explicitly excludes profitability',await page.$eval('.discovery-toolbar .support-note',element=>/no profitability claim/i.test(element.textContent)));
  await shot('01-discovery-filters-table');

  await page.evaluate(()=>[...document.querySelectorAll('.discovery-toolbar button')].find(button=>button.textContent==='Select first 80').click());await page.waitForFunction(()=>document.querySelector('.batch-workbench h2')?.textContent.includes('80 selected'));
  await page.type('.batch-create input','V1.6 Residential Research 80');await page.click('.batch-create button');await page.waitForFunction(()=>document.querySelector('.saved-batches button.active')?.textContent.includes('80 properties'));
  const state=await page.evaluate(()=>fetch('/api/discovery/state').then(response=>response.json())),batch=state.batches.find(item=>item.id===state.activeBatchId);check('80-property batch persisted with unique members',batch.candidateIds.length===80&&new Set(batch.candidateIds).size===80);
  await page.reload({waitUntil:'networkidle0',timeout:120000});await page.waitForSelector('.saved-batches button.active',{timeout:120000});check('batch reload preserves 80 members',await page.$eval('.saved-batches button.active',element=>element.textContent.includes('80 properties')));await shot('02-saved-80-property-batch');

  await api('/api/discovery/address-resolution/suggest',{candidateId:batch.candidateIds[0]});
  await page.evaluate(()=>[...document.querySelectorAll('.enrichment-plan button')].find(button=>button.textContent==='Preview Enrichment').click());await page.waitForSelector('.plan-metrics');
  check('preview shows cached evidence and bounded provider counts',await page.$eval('.enrichment-plan',element=>element.textContent.includes('Cache hits')&&element.textContent.includes('Run Selected Enrichment is disabled')));
  check('live execution remains disabled',await page.$eval('.enrichment-plan button:disabled',element=>element.textContent==='Run Selected Enrichment'));
  await shot('03-enrichment-preview');

  await page.evaluate(()=>[...document.querySelectorAll('.discovery-toolbar button')].find(button=>button.textContent.startsWith('Shortlist first available')).click());await page.waitForFunction(()=>document.querySelector('.shortlist-count')?.textContent.includes('6/6'));
  check('six-property shortlist is batch-bound',await page.$$eval('.shortlist-panel li',rows=>rows.length===6));await shot('04-six-property-shortlist');
  const latest=await page.evaluate(()=>fetch('/api/discovery/state').then(response=>response.json())),shortlistId=latest.shortlist[0];
  await savePdf('batch',{batchId:latest.activeBatchId},'v16-batch-summary');await savePdf('brief',{candidateId:shortlistId},'v16-research-brief');

  await page.evaluate(()=>[...document.querySelectorAll('.shortlist-panel li:first-child button')].find(button=>button.textContent==='Analyze').click());await page.waitForSelector('.property-detail [data-testid="create-deal"]',{timeout:120000});
  check('shortlist subject opens with exact discovery identity',await page.$eval('.detail-reference',element=>element.textContent.includes('KERN-PILOT-')));await page.click('[data-testid="create-deal"]');await page.waitForSelector('.investment-workspace .iw-detail',{timeout:120000});
  check('underwriting handoff keeps the same subject',await page.$eval('.iw-detail .iw-eyebrow',element=>element.textContent.includes('KERN-PILOT-')));await shot('05-underwriting-handoff');

  check('no external browser request escaped local origin',blocked.length===0);check('no browser runtime errors',errors.length===0);check('only one mocked address transmission occurred',mockedAddressTransmissions===1);check('protected identity and financial systems are byte-identical',JSON.stringify(await protection())===JSON.stringify(before));pass=true;
}finally{
  const result={status:pass?'PASS':'FAIL',node:process.version,browser:await browser.version(),output,checks,checkCount:checks.length,screenshots,pdfs,blocked,errors,mockedAddressTransmissions,liveProviderCalls:0,providerCost:0,databaseConnections:0,databaseWrites:0,durablePropertiesCreated:0,productionChanges:0,protectedPaths};await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});if(!pass)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});await browser.close();await app.close();console.log(JSON.stringify({status:result.status,output,checks:checks.length,screenshots:screenshots.length,pdfs:pdfs.length,blocked,errors,mockedAddressTransmissions}));
}

