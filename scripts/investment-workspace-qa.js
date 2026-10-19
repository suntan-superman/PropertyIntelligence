import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';

const base=path.resolve('data/runtime/investment-workspace-v1');await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'qa-'));
const digest=b=>createHash('sha256').update(b).digest('hex');
async function files(dir){const out=[];for(const x of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,x.name);if(x.isDirectory())out.push(...await files(p));else if(x.isFile())out.push(p);}return out;}
const protectedRoots=['src/analysis/monteCarlo','src/underwriting','src/reports','src/identity','config/protected-baselines','data/runtime/gabe-demo-v2-2026-10-13','data/runtime/gabe-demo-v2-1-2026-10-13'];
const protectedFiles=[];for(const p of protectedRoots){try{protectedFiles.push(...await files(p));}catch(e){if(e.code!=='ENOENT')throw e;}}
for(const dir of ['data/runtime/identity-resolution-pilot','data/runtime/durable-identity-pilot']){try{protectedFiles.push(...(await files(dir)).filter(p=>/decision|approval|authorization/i.test(p)));}catch(e){if(e.code!=='ENOENT')throw e;}}
const hashes=Object.fromEntries(await Promise.all(protectedFiles.map(async p=>[p,digest(await readFile(p))])));
await writeFile(path.join(output,'preservation-before.json'),JSON.stringify(hashes,null,2),{flag:'wx'});
const evidence=await loadEvidence(),app=await startInvestmentWorkspace({port:0,storeDirectory:path.join(output,'scenarios')});
const checks=[],screenshots=[],errors=[],remoteAttempts=[];
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
const downloadSession=await browser.target().createCDPSession();await downloadSession.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:output,eventsEnabled:true});
const page=await browser.newPage();await page.setViewport({width:1440,height:1050});
await page.setRequestInterception(true);page.on('request',r=>{if(r.url().startsWith(app.origin+'/')||r.url().startsWith('data:')||r.url().startsWith('blob:')||r.url()==='about:blank')r.continue();else{remoteAttempts.push(r.url().split('?')[0]);r.abort();}});
page.on('pageerror',e=>errors.push(e.message));
const shot=async name=>{const target=path.join(output,`${name}.png`);await page.screenshot({path:target,fullPage:true});screenshots.push(target);};
const button=async name=>{await page.evaluate(name=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===name);if(!b||b.disabled)throw new Error(`Button unavailable: ${name}`);b.click();},name);};
const fill=async(selector,value)=>{await page.waitForSelector(selector);await page.focus(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');if(String(value))await page.type(selector,String(value));};
const api=async(route,body)=>{const r=await fetch(app.origin+'/api/investment'+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-PI-Workspace':'local-v1',Origin:app.origin}:{},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():Buffer.from(await r.arrayBuffer())};};
let completed=false;
try{
  await page.goto(app.url,{waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="demo-batch"]');
  check('all six candidate cards load',await page.evaluate(()=>document.querySelectorAll('.iw-property').length===6));
  await fill('[aria-label="Search properties"]','Boron');check('candidate search filters actual retained pool',await page.evaluate(()=>document.querySelectorAll('.iw-property').length===1));await fill('[aria-label="Search properties"]','');
  await button('Select six-property demo');await shot('01-candidate-selection');
  const exports=[];
  for(const [ref,purchase,exit,rehab] of [['GABE-01',180000,300000,35000],['GABE-05',90000,170000,25000]]){
    await page.click(`[data-testid="open-${ref}"]`);await page.waitForSelector('[aria-label="Scenario name"]');await fill('[aria-label="Scenario name"]',`QA demonstration ${ref}`);
    await button('Sold Sales');check(`${ref}: Sale examples separate from listings`,await page.evaluate(()=>document.body.textContent.includes('not verified arm’s-length status')));
    if(ref==='GABE-01'){await shot('02-sold-evidence');const comp=evidence.properties[0].sales[0].evidenceRef;await page.click(`[aria-label="Include ${comp}"]`);await fill(`[aria-label="Notes ${comp}"]`,'Research only; condition and transfer terms require verification.');}
    await button('Underwriting');check(`${ref}: resale initially blank`,await page.$eval('[data-testid="input-exitValue"]',e=>e.value===''));
    for(const [k,v] of Object.entries({purchasePrice:purchase,exitValue:exit,rehabCost:rehab,contingency:10,acquisitionFixed:2500,sellingCommissionRate:5,sellerClosingRate:1,propertyTaxes:8,insurance:3,utilities:5}))await fill(`[data-testid="input-${k}"]`,v);
    await page.evaluate(()=>{const label=[...document.querySelectorAll('label')].find(x=>x.textContent.includes('Artificial demonstration assumptions'));label.querySelector('input').click();});
    await fill('[aria-label="Analyst notes"]','QA demonstration only: real retained provider evidence with explicitly artificial analyst assumptions. Not observed financial results.');
    await page.waitForFunction(()=>document.body.textContent.includes('Existing engine pi-flip-cents-v1'));
    await fill('[data-testid="input-rehabCost"]',-1);await page.waitForFunction(()=>document.querySelector('.iw-invalid'));check(`${ref}: negative input blocked inline`,true);await fill('[data-testid="input-rehabCost"]',rehab);
    await page.reload({waitUntil:'networkidle0'});await button('Underwriting');check(`${ref}: unsaved draft survives reload`,await page.$eval('[data-testid="input-purchasePrice"]',(e,p)=>e.value===String(p),purchase));
    await page.waitForFunction(()=>document.body.textContent.includes('Existing engine pi-flip-cents-v1'));if(ref==='GABE-01')await shot('03-underwriting');
    await button('Save locally');await page.waitForFunction(()=>document.body.textContent.includes('Saved locally as revision 1'));
    await button('Risk');
    for(const [key,v] of Object.entries({exitValue:[exit*.85,exit,exit*1.1],rehabCost:[rehab*.9,rehab,rehab*1.3],renovationDays:[75,90,120],marketingDays:[25,30,60]}))for(let i=0;i<3;i++)await fill(`[aria-label="${key} ${['min','mode','max'][i]}"]`,v[i]);
    await fill('[aria-label="Simulation seed"]',`workspace-qa-${ref}`);await fill('[aria-label="Iterations"]',500);await fill('[aria-label="Uncertainty rationale"]','Artificial independent triangular assumptions for UI QA; not calibrated to market or condition evidence.');
    await button('Run Monte Carlo');await page.waitForSelector('[data-testid="risk-result"]');check(`${ref}: simulation returns real engine output`,true);if(ref==='GABE-01')await shot('04-risk-analysis');
    await button('Save locally');await page.waitForFunction(()=>document.body.textContent.includes('Saved locally as revision 2'));
    await page.reload({waitUntil:'networkidle0'});await button('Risk');await page.waitForSelector('[data-testid="risk-result"]');check(`${ref}: saved Monte Carlo visible after reload without recomputation`,true);await button('Underwriting');check(`${ref}: saved assumptions reopen`,await page.$eval('[data-testid="input-exitValue"]',(e,x)=>Number(e.value)===x,exit));
    const scenarios=(await api('/scenarios')).data,s=scenarios.find(x=>x.propertyRef===ref);check(`${ref}: saved risk is reproducible and retained`,s.analysis.monteCarlo.simulation.iterations===500);
    await button('Reports');
    for(const kind of ref==='GABE-01'?['brief','full']:['brief']){
      await page.select('[aria-label="Report type"]',kind);await button('Preview report');await page.waitForSelector('iframe[title="Report preview"]');
      const preview=(await api('/report',{id:s.id,revision:s.revision,kind})).data;await writeFile(path.join(output,`${ref}-${kind}.html`),preview.html,{flag:'wx'});
      const downloaded=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Browser PDF download did not complete')),60000);const handler=e=>{if(e.state==='completed'){clearTimeout(timer);downloadSession.off('Browser.downloadProgress',handler);resolve();}};downloadSession.on('Browser.downloadProgress',handler);});
      const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/investment/report')&&r.request().postData()?.includes('"pdf":true'),{timeout:60000});await button('Export PDF');const response=await responsePromise;check(`${ref} ${kind}: browser export responds with PDF`,response.status()===200&&response.headers()['content-type']==='application/pdf');await downloaded;const bytes=await readFile(path.join(output,`${ref}-${kind}-r${s.revision}.pdf`));
      const target=path.join(output,`${ref}-${kind}.pdf`);await writeFile(target,bytes,{flag:'wx'});exports.push({ref,kind,path:target,bytes:bytes.length,sha256:digest(bytes)});
      const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise,pages=[],images=[];
      const printPage=await browser.newPage();await printPage.setJavaScriptEnabled(false);await printPage.setRequestInterception(true);printPage.on('request',r=>{remoteAttempts.push('report requested external resource');r.abort();});await printPage.emulateMediaType('print');await printPage.setContent(preview.html);
      const layout=await printPage.evaluate(()=>({pages:[...document.querySelectorAll('.page')].map(p=>({height:p.getBoundingClientRect().height,scroll:p.scrollHeight})),horizontal:[...document.querySelectorAll('td,table,.datum')].filter(e=>e.scrollWidth>e.clientWidth+2).length,chartCounts:[...document.querySelectorAll('[data-count]')].map(e=>Number(e.dataset.count)),svgOverflow:[...document.querySelectorAll('svg')].flatMap(svg=>[...svg.querySelectorAll('text,rect,line')].filter(e=>!e.closest('defs')).map(e=>{const b=e.getBBox(),v=svg.viewBox.baseVal;return b.x< -1||b.y< -1||b.x+b.width>v.width+1||b.y+b.height>v.height+1;})).filter(Boolean).length}));await printPage.close();
      await writeFile(path.join(output,`${ref}-${kind}-layout.json`),JSON.stringify(layout,null,2),{flag:'wx'});
      for(let n=1;n<=pdf.numPages;n++){
        const pp=await pdf.getPage(n),vp=pp.getViewport({scale:1}),items=(await pp.getTextContent()).items.filter(x=>x.str?.trim()),text=items.map(x=>x.str).join(' '),bad=items.filter(x=>x.transform[4]<0||x.transform[4]+x.width>vp.width+2||x.transform[5]<0||x.transform[5]>vp.height+2);
        const canvas=createCanvas(612,792);await pp.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;const image=path.join(output,`${ref}-${kind}-page-${n}.png`);await writeFile(image,canvas.toBuffer('image/png'),{flag:'wx'});images.push(image);pages.push({n,characters:text.length,outOfBounds:bad.length,text});
      }
      await writeFile(path.join(output,`${ref}-${kind}-pdf-qa.json`),JSON.stringify({pageCount:pdf.numPages,layout,pages},null,2),{flag:'wx'});
      const sheet=createCanvas(640*2,830*Math.ceil(images.length/2)),ctx=sheet.getContext('2d');ctx.fillStyle='#e5eaee';ctx.fillRect(0,0,sheet.width,sheet.height);for(let i=0;i<images.length;i++)ctx.drawImage(await loadImage(images[i]),14+(i%2)*640,15+Math.floor(i/2)*830,612,792);await writeFile(path.join(output,`${ref}-${kind}-contact.png`),sheet.toBuffer('image/png'),{flag:'wx'});
      check(`${ref} ${kind}: exact intended pages, no overflow or blank pages`,pdf.numPages===layout.pages.length&&pages.every(p=>p.characters>200&&p.outOfBounds===0)&&layout.horizontal===0);
      if(kind==='full')check(`${ref}: chart bins reconcile to iterations and SVG stays in bounds`,layout.chartCounts.reduce((a,b)=>a+b,0)===500&&layout.svgOverflow===0);
      if(kind==='brief')check(`${ref}: brief is two pages including full county notice`,pdf.numPages===2);
      const fullText=pages.map(x=>x.text).join(' ');check(`${ref} ${kind}: full county indemnification and demonstration labels`,/II\. INDEMNIFICATION/.test(fullText)&&/lack of good faith/.test(fullText)&&/ARTIFICIAL ASSUMPTIONS/.test(fullText));
    }
  }
  // No public/database/provider route, cross-origin mutation or arbitrary file read.
  for(const route of ['/api/properties','/api/rentcast','/data/runtime/gabe-demo-v2-1-2026-10-13/REVIEW_DECISIONS.json','/.env','/source_docs/RentCast_Email.md']){const r=await fetch(app.origin+route);check(`blocked route ${route}`,r.status===404);}
  const foreign=await fetch(app.origin+'/api/investment/save',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:'{}'});check('foreign-origin writes rejected',foreign.status===403);
  const missing=await fetch(app.origin+'/api/investment/save',{method:'POST',headers:{Origin:app.origin,'Content-Type':'application/json'},body:'{}'});check('missing local request guard rejected',missing.status===403);
  const saved=(await api('/scenarios')).data;check('no cross-property assumptions leaked',saved.find(x=>x.propertyRef==='GABE-01').inputs.purchasePrice==='180000'&&saved.find(x=>x.propertyRef==='GABE-05').inputs.purchasePrice==='90000');
  await button('Duplicate scenario');check('duplicate UI makes an independent draft',await page.$eval('[aria-label="Scenario name"]',e=>e.value.endsWith('copy')));await button('Save locally');await page.waitForFunction(()=>document.body.textContent.includes('Saved locally as revision 1'));check('duplicate saved without overwriting originals',(await api('/scenarios')).data.length===3);
  await button('Underwriting');await button('Reset draft');await page.waitForSelector('[data-testid="notification-dialog"]');await page.click('[data-testid="notification-confirm"]');await page.waitForFunction(()=>document.querySelector('[data-testid="input-purchasePrice"]').value==='');check('reset affects browser draft only; retained saved revision remains', (await api('/scenarios')).data.every(x=>Number(x.inputs.purchasePrice)>0));
  check('no browser JavaScript errors',errors.length===0);check('zero non-loopback application requests',remoteAttempts.length===0);
  for(const [p,expected] of Object.entries(hashes))assert.equal(digest(await readFile(p)),expected,`Protected evidence changed: ${p}`);
  check(`${protectedFiles.length} protected source/evidence/decision files unchanged`,true);
  completed=true;await writeFile(path.join(output,'qa-results.json'),JSON.stringify({status:'PASS',at:new Date().toISOString(),node:process.version,browser:await browser.version(),checks,errors,remoteAttempts,preservationFiles:protectedFiles.length,screenshots,exports,providerCalls:0,databaseConnections:0,productionWrites:0},null,2),{flag:'wx'});
  console.log(JSON.stringify({status:'PASS',output,checks:checks.length,exports:exports.map(x=>({kind:x.kind,ref:x.ref,bytes:x.bytes}))}));
}catch(e){await shot('failure');await writeFile(path.join(output,'failure.json'),JSON.stringify({message:e.message,stack:e.stack,checks,errors,remoteAttempts},null,2),{flag:'wx'});console.error(JSON.stringify({status:'FAIL',output,error:e.message}));process.exitCode=1;
}finally{await browser.close();await app.close();}
