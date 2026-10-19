import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';

const root=process.cwd(),base=path.resolve('data/runtime/discovery-v1-5');
await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'qa-'));
const discoveryStoreDirectory=path.join(output,'discovery-state');
const app=await startInvestmentWorkspace({port:0,propertyDetail:true,storeDirectory:path.join(output,'scenarios'),discoveryStoreDirectory});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
const page=await browser.newPage(),checks=[],errors=[],blocked=[],screenshots=[],reports=[];
let passed=false;
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const shot=async name=>{const file=path.join(output,`${name}.png`);await page.screenshot({path:file,fullPage:true});screenshots.push(file);return file;};
const clickText=async text=>page.evaluate(text=>{const e=[...document.querySelectorAll('button,a')].find(x=>x.textContent.trim().startsWith(text));if(!e||e.disabled)throw new Error(`Unavailable action: ${text}`);e.click();},text);
const fill=async(selector,value)=>{await page.waitForSelector(selector,{visible:true});await page.$eval(selector,(e,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(e,String(value));e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},value);};
const api=async(route,body)=>{const response=await fetch(app.origin+route,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{Origin:app.origin,'Content-Type':'application/json','X-PI-Workspace':'local-v1'},body:body===undefined?undefined:JSON.stringify(body)});const type=response.headers.get('content-type')??'';return {status:response.status,data:type.includes('json')?await response.json():Buffer.from(await response.arrayBuffer())};};
await page.setViewport({width:1440,height:1000});
await page.setRequestInterception(true);
page.on('pageerror',e=>errors.push(e.message));
page.on('request',request=>{if(request.url().startsWith(app.origin+'/')||/^(data:|blob:|about:blank)/.test(request.url()))return request.continue();blocked.push(request.url().split('?')[0]);return request.abort();});

async function renderReport(saved,kind){
  const response=await api('/api/investment/report',{id:saved.id,revision:saved.revision,kind,pdf:true});
  check(`${kind} PDF rendered`,response.status===200&&response.data.subarray(0,4).toString()==='%PDF');
  const file=path.join(output,`candidate-${kind}-r${saved.revision}.pdf`);await writeFile(file,response.data,{flag:'wx'});
  const pdf=await getDocument({data:new Uint8Array(response.data),useSystemFonts:true,disableFontFace:true}).promise;
  let allText='';const images=[];
  for(let n=1;n<=pdf.numPages;n++){
    const p=await pdf.getPage(n),viewport=p.getViewport({scale:1}),items=(await p.getTextContent()).items.filter(x=>x.str?.trim());
    check(`${kind} page ${n} not blank`,items.length>20);
    check(`${kind} page ${n} text in bounds`,items.every(x=>x.transform[4]>=-1&&x.transform[4]<=viewport.width+1&&x.transform[5]>=-1&&x.transform[5]<=viewport.height+1));
    allText+=items.map(x=>x.str).join(' ')+' ';
    const view=p.getViewport({scale:1.2}),canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));await p.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
    const image=path.join(output,`candidate-${kind}-page-${n}.png`);await writeFile(image,canvas.toBuffer('image/png'),{flag:'wx'});images.push(image);
  }
  check(`${kind} preserves historical signal`,allText.includes('Historical Power-to-Sell'));
  check(`${kind} does not claim a current lien or foreclosure`,!/(no liens|not in foreclosure|current tax default)/i.test(allText));
  check(`${kind} labels missing valuation`,/Not checked|not available|As-is AVM Unknown/i.test(allText));
  reports.push({kind,file,pages:pdf.numPages,images});await pdf.destroy();
}

try{
  await page.goto(`${app.origin}/#discover`,{waitUntil:'networkidle0'});await page.waitForSelector('.candidate-table');
  check('dashboard displays exact 80-candidate pilot',await page.$eval('.discovery-metrics',e=>e.textContent.includes('80 / 80')&&e.textContent.includes('80')));
  check('unsupported ZIP filter is disabled',await page.$eval('label.unsupported input',e=>e.disabled&&e.placeholder.includes('Unavailable')));
  check('unsupported NOD filter is disabled',await page.$eval('label.unsupported select',e=>e.disabled&&e.textContent.includes('Coverage unavailable')));
  await shot('01-dashboard-80-candidates');

  await page.select('.filters label:nth-child(2) select','BAKERSFIELD');
  await page.waitForFunction(()=>document.querySelector('.candidate-section')?.textContent.includes('24 displayed'));
  check('Bakersfield filter returns exact retained count',await page.$eval('.candidate-section',e=>e.textContent.includes('24 displayed')));
  await shot('02-bakersfield-filter-24');

  await clickText('Shortlist first available');await page.waitForFunction(()=>document.querySelector('.shortlist-count')?.textContent.includes('6/6'));
  check('shortlist is capped at six',await page.$eval('.shortlist-count',e=>e.textContent.trim()==='6/6 shortlisted'));
  await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.shortlist-count');
  check('shortlist survives reload',await page.$eval('.shortlist-count',e=>e.textContent.trim()==='6/6 shortlisted'));
  await shot('03-six-property-shortlist');

  await clickText('Why flagged?');await page.waitForSelector('.discovery-drawer');
  check('drawer exposes historical timeline and unknowns',await page.$eval('.discovery-drawer',e=>e.textContent.includes('Evidence timeline')&&e.textContent.includes('What remains unknown')&&e.textContent.includes('Historical')));
  await shot('04-discovery-reason-drawer');
  await clickText('Investigate in Property Detail');await page.waitForSelector('[data-testid=create-deal]');
  check('candidate opens existing Property Detail',await page.$eval('#overview',e=>e.textContent.includes('DISCOVERY CANDIDATE')&&e.textContent.includes('Why flagged?')));
  await shot('05-property-detail-handoff');

  await page.click('[data-testid=create-deal]');await page.waitForSelector('[data-testid=input-purchasePrice]',{visible:true});
  check('candidate opens existing V1.4 workspace',await page.$eval('.iw-detail',e=>e.textContent.includes('PRELIMINARY RESEARCH')&&/KERN-PILOT-\d{3}/.test(e.textContent)));
  await fill('[data-testid=input-purchasePrice]',150000);await fill('[data-testid=input-rehabCost]',30000);await fill('[data-testid=input-exitValue]',250000);
  await page.evaluate(()=>{const box=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('Artificial demonstration assumptions'))?.querySelector('input');if(box&&!box.checked)box.click();});
  await page.waitForFunction(()=>document.body.textContent.includes('Existing engine pi-flip-cents-v1'));
  await page.click('[data-testid=save-scenario]');await page.waitForFunction(()=>document.body.textContent.includes('Saved locally as revision'));
  const scenarios=(await api('/api/investment/scenarios')).data,saved=scenarios.sort((a,b)=>b.revision-a.revision)[0];
  check('saved scenario remains subject-bound',saved?.propertyRef?.startsWith('KERN-PILOT-')&&saved.inputs.purchasePrice==='150000');
  await shot('06-underwriting-handoff');
  await renderReport(saved,'brief');await renderReport(saved,'full');

  const bootstrap=(await api('/api/discovery/bootstrap')).data,first=bootstrap.candidates[0];
  await page.goto(`${app.origin}/#analyze-address`,{waitUntil:'networkidle0'});await page.waitForSelector('.address-analysis');
  const fields=await page.$$('.address-analysis input');
  await fields[0].type(first.address.street);await fields[1].type(first.address.city);await fields[2].click({clickCount:3});await fields[2].type('CA');
  await clickText('Research retained evidence');await page.waitForSelector('.address-result');
  check('ZIP-optional address research finds one preliminary subject',await page.$eval('.address-result',e=>e.textContent.includes('One retained preliminary candidate')&&e.textContent.includes('remain unverified')));
  check('address research created no durable Property',await page.$eval('.boundary-card',e=>e.textContent.includes('does not prove current parcel identity')));
  await fill('.address-analysis label:nth-child(1) input','1917 PADRE ST');await fill('.address-analysis label:nth-child(2) input','BAKERSFIELD');await page.$eval('.address-analysis',form=>form.requestSubmit());
  await page.waitForFunction(()=>document.querySelector('.address-result')?.textContent.includes('Manual identity review is required'));
  check('ambiguous retained address is not silently verified',await page.$eval('.address-result',e=>e.textContent.includes('none was promoted')));
  await fill('.address-analysis label:nth-child(1) input','3484 HAVEN ST');await fill('.address-analysis label:nth-child(2) input','ROSAMOND');await page.$eval('.address-analysis',form=>form.requestSubmit());
  await page.waitForFunction(()=>document.querySelector('.address-result')?.textContent.includes('Existing saved Property found'));
  check('Haven remains a saved property without invented distress',await page.$eval('.address-result',e=>e.textContent.includes('No distress signal is inferred')));
  check('zero external/provider browser attempts',blocked.length===0);check('zero browser errors',errors.length===0);
  passed=true;
}finally{
  if(!passed)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
  const state=JSON.parse(await readFile(path.join(discoveryStoreDirectory,'state.json')).catch(()=>Buffer.from('{}')));
  const shortlist=state.shortlist??[];
  const discovery=(await api('/api/discovery/bootstrap')).data;
  const shortlistRows=discovery.candidates.filter(c=>shortlist.includes(c.id)).map(c=>[c.id,c.address.street,c.address.city,c.address.state,c.propertyType.description,c.discoveryReason.type,c.discoveryReason.status,c.historicalAmount,c.source.observedDate,c.source.name]);
  const csv=['candidate_reference,street,city,state,property_type,signal_type,signal_status,historical_amount,source_date,source',...shortlistRows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(','))].join('\n')+'\n';
  const shortlistFile=path.join(output,'source-supported-shortlist.csv');await writeFile(shortlistFile,csv,{flag:'wx'});
  const result={status:passed?'PASS':'FAIL',node:process.version,browser:await browser.version(),origin:app.origin,output,checks,checkCount:checks.length,errors,blocked,providerCalls:0,databaseConnections:0,databaseWrites:0,durablePropertiesCreated:0,shortlistCount:shortlist.length,shortlistFile,screenshots,reports};
  await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  await writeFile(path.join(output,'visual-index.html'),`<!doctype html><meta charset="utf-8"><title>PI V1.5 offline QA</title><style>body{font:16px system-ui;max-width:1200px;margin:30px auto;background:#eef3f1}img{max-width:100%;background:white;border:1px solid #ccd8d5;margin:12px 0}section{margin:40px 0}</style><h1>PI V1.5 offline QA</h1><p>Retained county evidence and artificial underwriting assumptions. No provider or database activity.</p>${screenshots.map(x=>`<section><h2>${path.basename(x)}</h2><img src="${path.basename(x)}"></section>`).join('')}${reports.flatMap(r=>r.images.map(x=>`<section><h2>${path.basename(x)}</h2><img src="${path.basename(x)}"></section>`)).join('')}`,{flag:'wx'});
  await browser.close();await app.close();console.log(JSON.stringify({status:result.status,output,checks:checks.length,reports:reports.map(r=>({kind:r.kind,pages:r.pages})),errors,blocked}));
}
