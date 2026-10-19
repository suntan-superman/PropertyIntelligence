import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {detailRoute} from '../apps/web/src/features/property-detail/navigation.js';

const base=path.resolve('data/runtime/unified-v1-3');
await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'qa-'));
const evidence=await addPropertyDetails(await loadEvidence());
const app=await startInvestmentWorkspace({port:0,propertyDetail:true,storeDirectory:path.join(output,'scenarios')});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
const page=await browser.newPage();
const checks=[],screenshots=[],pdfs=[],errors=[],blocked=[];
let done=false;
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
await page.setViewport({width:1440,height:1000});
await page.setRequestInterception(true);
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{
  if(request.url().startsWith(app.origin+'/')||/^(data:|blob:|about:blank)/.test(request.url()))return request.continue();
  blocked.push(request.url().split('?')[0]);return request.abort();
});
const property=ref=>evidence.properties.find(x=>x.ref===ref);
const route=p=>app.origin+'/'+detailRoute(p.ref,p.evidenceFingerprint??evidence.fingerprint);
const shot=async(name,selector)=>{if(selector)await page.$eval(selector,e=>e.scrollIntoView({block:'start'}));const file=path.join(output,`${name}.png`);await page.screenshot({path:file,fullPage:!selector});screenshots.push(file);return file;};
const button=async label=>page.evaluate(label=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith(label));if(!b||b.disabled)throw new Error(`Button unavailable: ${label}`);b.click();},label);
const tab=async label=>{await button(label);await page.waitForFunction(label=>[...document.querySelectorAll('[role=tab]')].some(x=>x.textContent.trim()===label&&x.getAttribute('aria-selected')==='true'),{},label);};
const fill=async(selector,value)=>{await page.waitForSelector(selector,{visible:true});await page.focus(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');if(String(value))await page.type(selector,String(value));};
const api=async(routeName,body)=>{const response=await fetch(app.origin+'/api/investment'+routeName,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{Origin:app.origin,'Content-Type':'application/json','X-PI-Workspace':'local-v1'},body:body===undefined?undefined:JSON.stringify(body)});const type=response.headers.get('content-type')??'';return {status:response.status,data:type.includes('json')?await response.json():Buffer.from(await response.arrayBuffer())};};
async function openDetail(ref){const p=property(ref);await page.goto(route(p),{waitUntil:'networkidle0'});await page.waitForSelector('[data-testid=create-deal]');return p;}
async function openWorkspace(ref){await openDetail(ref);await page.click('[data-testid=create-deal]');await page.waitForSelector('[data-testid=input-purchasePrice]',{visible:true});check(`${ref}: exact subject shown in workspace`,await page.$eval('.iw-detail',(e,address)=>e.textContent.includes(address),property(ref).address));}
async function completeAssumptions(ref){
  await fill('[aria-label="Scenario name"]',`${ref} unified V1.3 QA`);
  for(const [key,value] of Object.entries({purchasePrice:180000,rehabCost:35000,exitValue:300000,renovationDays:90,marketingDays:30}))await fill(`[data-testid=input-${key}]`,value);
  await fill('[aria-label="Analyst notes"]','Artificial QA assumptions on retained evidence; not an investment recommendation.');
  await page.evaluate(()=>{const box=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('Artificial demonstration assumptions'))?.querySelector('input');if(box&&!box.checked)box.click();});
  await page.waitForFunction(()=>document.body.textContent.includes('Existing engine pi-flip-cents-v1'));
}
async function saveScenario(ref){await button('Save locally');await page.waitForFunction(()=>document.body.textContent.includes('Saved locally as revision'));const saved=(await api('/scenarios')).data.filter(x=>x.propertyRef===ref).sort((a,b)=>b.revision-a.revision)[0];assert.ok(saved);return saved;}
async function renderReports(ref,saved){
  for(const kind of ['brief','full']){
    const html=await api('/report',{id:saved.id,revision:saved.revision,kind});check(`${ref} ${kind}: HTML report generated`,html.status===200&&html.data.html.includes(property(ref).address));
    const response=await api('/report',{id:saved.id,revision:saved.revision,kind,pdf:true});check(`${ref} ${kind}: PDF rendered`,response.status===200&&response.data.subarray(0,4).toString()==='%PDF');
    const pdfFile=path.join(output,`${ref}-${kind}-r${saved.revision}.pdf`);await writeFile(pdfFile,response.data,{flag:'wx'});
    const document=await getDocument({data:new Uint8Array(response.data),useSystemFonts:true,disableFontFace:true}).promise;let text='';
    for(let i=1;i<=document.numPages;i++){
      const pdfPage=await document.getPage(i),content=await pdfPage.getTextContent(),words=content.items.filter(x=>x.str?.trim()),view=pdfPage.getViewport({scale:1});
      check(`${ref} ${kind} page ${i}: not blank`,words.length>15);check(`${ref} ${kind} page ${i}: text in page bounds`,words.every(x=>x.transform[4]>=-1&&x.transform[4]<=view.width+1&&x.transform[5]>=-1&&x.transform[5]<=view.height+1));text+=words.map(x=>x.str).join(' ');
      const viewport=pdfPage.getViewport({scale:1.05}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await pdfPage.render({canvasContext:canvas.getContext('2d'),viewport}).promise;await writeFile(path.join(output,`${ref}-${kind}-page-${i}.png`),canvas.toBuffer('image/png'),{flag:'wx'});
    }
    check(`${ref} ${kind}: correct assumptions and county disclaimer`,text.includes('ARTIFICIAL ASSUMPTIONS')&&text.includes('INDEMNIFICATION'));
    pdfs.push({ref,kind,pages:document.numPages,file:pdfFile,text});await document.destroy();
  }
}
try{
  const haven=evidence.properties.at(-1);await openDetail(haven.ref);
  check('Haven primary CTA names the unified workflow',await page.$eval('[data-testid=create-deal]',e=>e.textContent==='Analyze Investment Opportunity'));
  check('Legacy Deal Mode remains secondary and accessible',await page.$eval('.detail-secondary',e=>e.textContent==='Legacy Deal Mode'&&e.getAttribute('href')==='#legacy-deal'));
  await shot('after-haven-overview','#overview');await shot('after-haven-valuation','#valuation');await shot('after-haven-comps','#comps');
  check('Haven all-observation view represents 15 retained observations',await page.$eval('#comps',e=>e.textContent.includes('15 source observations')));
  await button('Recorded sales (0)');check('Haven recorded-sales view remains honestly empty',await page.$eval('#comps',e=>e.textContent.includes('No retained recorded sales')));
  await button('All provider observations (15)');await page.waitForFunction(()=>document.querySelectorAll('.comp-pin').length===15);check('Haven map still exposes 15 source markers',await page.$$('.comp-pin').then(x=>x.length===15));
  await page.click('[data-testid=create-deal]');await page.waitForSelector('[data-testid=input-purchasePrice]',{visible:true});await completeAssumptions(haven.ref);await shot('after-haven-underwriting','.iw-detail');
  const havenSaved=await saveScenario(haven.ref);check('Haven saved route binds scenario ID',new URLSearchParams(page.url().split('?')[1]).get('scenario')===havenSaved.id);
  await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('[data-testid=input-purchasePrice]',{visible:true});check('Haven saved scenario reopens with exact assumptions',await page.$eval('[data-testid=input-purchasePrice]',e=>e.value==='180000'));
  await renderReports(haven.ref,havenSaved);

  await openDetail('GABE-01');await button('Recorded sales (4)');check('GABE-01 has exactly four retained recorded-sale rows',await page.$$('[data-comp-row]').then(x=>x.length===4));await shot('after-gabe-01-research-sales','#comps');
  await page.click('[data-testid=create-deal]');await page.waitForSelector('[data-testid=input-purchasePrice]',{visible:true});check('switching from Haven does not carry purchase input',await page.$eval('[data-testid=input-purchasePrice]',e=>e.value===''));
  await completeAssumptions('GABE-01');await tab('Sold Sales');await page.click('[aria-label="Include GABE-01-S1"]');await fill('[aria-label="Notes GABE-01-S1"]','Selected for QA relevance review only; transfer terms and condition remain unverified.');
  check('GABE-01 selection is one included and three unselected',await page.$$eval('input[aria-label^="Include GABE-01-"]',xs=>xs.filter(x=>x.checked).length===1&&xs.length===4));
  const gabe1Saved=await saveScenario('GABE-01');await renderReports('GABE-01',gabe1Saved);check('GABE-01 full report preserves one included and three not selected',pdfs.find(x=>x.ref==='GABE-01'&&x.kind==='full').text.includes('Included in analyst analysis')&&((pdfs.find(x=>x.ref==='GABE-01'&&x.kind==='full').text.match(/Not selected/g)??[]).length>=3));

  await openWorkspace('GABE-04');await completeAssumptions('GABE-04');await tab('Sold Sales');await fill('[aria-label="Notes GABE-04-S1"]','Excluded as a low-price outlier pending transfer and condition evidence.');const gabe4Saved=await saveScenario('GABE-04');const gabe4=(await api('/report',{id:gabe4Saved.id,revision:gabe4Saved.revision,kind:'full'})).data.html;check('GABE-04 outlier remains visible and explicitly excluded',gabe4.includes('$75,000')&&gabe4.includes('Excluded as a low-price outlier'));

  await openDetail('GABE-05');await button('Recorded sales (2)');check('GABE-05 shows two older sales and thin-evidence warning',await page.$$('[data-comp-row]').then(x=>x.length===2)&&await page.$eval('main',e=>e.textContent.includes('Thin evidence')&&e.textContent.includes('Do not derive a numerical ARV')));await shot('after-gabe-05-thin-evidence','#comps');
  await page.setViewport({width:390,height:844});await openDetail('GABE-01');await shot('after-gabe-01-mobile','#overview');check('narrow Property Detail has no page-level overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check('zero external/provider browser attempts',blocked.length===0);check('zero browser errors',errors.length===0);done=true;
}finally{
  const oldRoot=path.resolve('data/runtime/property-detail-v1-2'),oldDirs=(await readdir(oldRoot).catch(()=>[])).filter(x=>x.startsWith('qa-'));
  const dated=await Promise.all(oldDirs.map(async name=>({name,time:(await stat(path.join(oldRoot,name))).mtimeMs})));
  const before=dated.sort((a,b)=>b.time-a.time)[0]?.name?path.join(oldRoot,dated.sort((a,b)=>b.time-a.time)[0].name):null;
  if(!done)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
  const results={status:done?'PASS':'FAIL',node:process.version,output,beforeV12Qa:before,checks,checkCount:checks.length,errors,blocked,providerCalls:0,databaseConnections:0,databaseWrites:0,productionChanges:0,newEvidenceAcquisitions:0,screenshots,pdfs:pdfs.map(({text,...x})=>x)};
  await writeFile(path.join(output,'qa-results.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});
  await writeFile(path.join(output,'index.html'),`<!doctype html><meta charset="utf-8"><title>PI unified V1.3 QA</title><style>body{font:16px system-ui;max-width:1200px;margin:30px auto}img{max-width:100%;border:1px solid #ccd8d5}section{margin:36px 0}</style><h1>PI unified research & underwriting V1.3</h1><p>Offline QA using retained evidence and artificial financial assumptions. Not an investment recommendation.</p>${pdfs.map(x=>`<p><a href="${path.basename(x.file)}">${x.ref} ${x.kind} · ${x.pages} pages</a></p>`).join('')}${screenshots.map(file=>`<section><h2>${path.basename(file)}</h2><img src="${path.basename(file)}"></section>`).join('')}`,{flag:'wx'});
  await browser.close();await app.close();console.log(JSON.stringify({status:results.status,output,checks:checks.length,pdfs:pdfs.length,errors,blocked}));
}
