import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {detailRoute,investmentRoute} from '../apps/web/src/features/property-detail/navigation.js';
const base='data/runtime/property-detail-v1-2';await mkdir(base,{recursive:true});const output=await mkdtemp(base+'/qa-');
const evidence=await addPropertyDetails(await loadEvidence()),app=await startInvestmentWorkspace({port:0,propertyDetail:true,storeDirectory:path.resolve(output,'scenarios')});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage();
const checks=[],screenshots=[],errors=[],blocked=[],pdfs=[];let variant=null,done=false;
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const cdp=await browser.target().createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:path.resolve(output),eventsEnabled:true});
await page.setViewport({width:1440,height:1000});await page.setRequestInterception(true);
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{
 if(r.url().startsWith(app.origin+'/')){if(variant&&r.url().endsWith('/api/investment/bootstrap')){const {fingerprint,...safe}=variant;return r.respond({contentType:'application/json',body:JSON.stringify({...safe,evidenceFingerprint:fingerprint})});}return r.continue();}
 if(/^(data:|blob:|about:blank)/.test(r.url()))return r.continue();blocked.push(r.url().split('?')[0]);return r.abort();
});
const shot=async(name,selector)=>{if(selector)await page.$eval(selector,e=>e.scrollIntoView({block:'start'}));const p=output+'/'+name+'.png';await page.screenshot({path:p});screenshots.push(p);};
const button=async name=>page.evaluate(name=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(name));if(!b||b.disabled)throw new Error('Button unavailable: '+name);b.click();},name);
const fill=async(selector,value)=>{await page.waitForSelector(selector);await page.focus(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');if(String(value))await page.type(selector,String(value));};
const api=async(route,body)=>{const r=await fetch(app.origin+'/api/investment'+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-PI-Workspace':'local-v1',Origin:app.origin}:{},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():Buffer.from(await r.arrayBuffer())};};
const route=p=>app.origin+'/'+detailRoute(p.ref,p.evidenceFingerprint??evidence.fingerprint);
try{
 const saved=evidence.properties.at(-1);await page.goto(route(saved),{waitUntil:'networkidle0'});await page.waitForSelector('[data-map-engine="OFFLINE_FALLBACK"] .comp-pin');
 check('Haven: all 15 retained source coordinates restored',await page.$$('.comp-pin').then(x=>x.length===15));
 check('Haven: only actual subject and comp markers exist',await page.$$('.subject-pin').then(x=>x.length===1));
 check('saved durable reference remains separate from Gabe subjects',await page.$eval('#overview',e=>e.textContent.includes('EXISTING DURABLE PROPERTY')));
 for(const [name,sel] of [['haven-overview','#overview'],['haven-valuation','#valuation'],['haven-map','#comps'],['haven-table','#comps .table-scroll']])await shot(name,sel);
 await page.click('#comps .row-select');check('row selection opens matching evidence popup',await page.$eval('[data-testid="selected-comp"]',e=>e.textContent.includes('2424 Grandview')));
 await page.focus('.comp-pin[title^="Comp 2:"]');await page.keyboard.press('Enter');await page.waitForSelector('.selected-row');check('keyboard marker selection highlights corresponding source row',await page.$eval('.selected-row',e=>e.textContent.includes('3472 Roxbury')));
 await shot('haven-selected-marker','#comps');await button('Fit all locations');
 check('fit-all bounds contain every actual comparable point',await page.evaluate(()=>{const b=document.querySelector('.comp-map').getBoundingClientRect();return [...document.querySelectorAll('.comp-pin')].every(e=>{const r=e.getBoundingClientRect();return r.left>=b.left-30&&r.right<=b.right+30&&r.top>=b.top-30&&r.bottom<=b.bottom+30;});}));
 await button('Recorded sales (0)');check('Haven never inherits Gabe sales',await page.$eval('#comps',e=>e.textContent.includes('No retained recorded sales')));await shot('haven-no-sale-fallback','#comps');
 for(const ref of [saved.ref,'GABE-01','GABE-05']){
  const p=evidence.properties.find(p=>p.ref===ref),label=ref.startsWith('PROPERTY-')?'HAVEN':ref;
  await page.goto(route(p),{waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="create-deal"]');
  if(ref==='GABE-01'||ref==='GABE-05'){check(`${label}: actual sale research count shown`,await page.$eval('#comps',(e,n)=>e.textContent.includes(`Recorded sales (${n})`),p.sales.length));await shot(label+'-evidence','#comps');}
  await page.click('[data-testid="create-deal"]');await page.waitForSelector('[data-testid="input-purchasePrice"]');
  check(`${label}: route binds same subject and exact snapshot`,await page.evaluate(({ref,fp})=>{const params=new URLSearchParams(location.hash.split('?')[1]);return params.get('subject')===ref&&params.get('snapshot')===fp;},{ref,fp:p.evidenceFingerprint??evidence.fingerprint}));
  check(`${label}: no invented purchase, rehab or resale`,await page.$eval('[data-testid="input-exitValue"]',e=>e.value===''));
  await fill('[aria-label="Scenario name"]',label+' V1.2 demo');
  await page.click('.iw-advanced>summary');for(const [k,v] of Object.entries({purchasePrice:180000,rehabCost:35000,exitValue:300000,contingency:10,acquisitionFixed:2500,sellingCommissionRate:5,sellerClosingRate:1,propertyTaxes:8,insurance:3,utilities:5}))await fill(`[data-testid="input-${k}"]`,v);
  await page.evaluate(()=>[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Artificial demonstration assumptions')).querySelector('input').click());
  await fill('[aria-label="Analyst notes"]','Artificial QA demonstration assumptions on retained real evidence. Not an investment recommendation.');
  await page.waitForFunction(()=>document.body.textContent.includes('Existing engine pi-flip-cents-v1'));await shot(label+'-handoff','.iw-detail');
  await button('Save locally');await page.waitForFunction(()=>document.body.textContent.includes('Saved locally as revision 1'));
  if(ref==='GABE-01'){
   await button('Risk');for(const [key,values] of Object.entries({exitValue:[255000,300000,330000],rehabCost:[31500,35000,45500],renovationDays:[75,90,120],marketingDays:[25,30,60]}))for(let i=0;i<3;i++)await fill(`[aria-label="${key} ${['min','mode','max'][i]}"]`,values[i]);
   await fill('[aria-label="Simulation seed"]','property-detail-v12-demo');await fill('[aria-label="Iterations"]',500);await fill('[aria-label="Uncertainty rationale"]','Artificial independent bounds for UI demonstration; not a calibrated market model.');await button('Run Monte Carlo');await page.waitForSelector('[data-testid="risk-result"]');await button('Save locally');await page.waitForFunction(()=>document.body.textContent.includes('Saved locally as revision 2'));
  }
  await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="input-purchasePrice"]');check(`${label}: revision reopens with same assumptions`,await page.$eval('[data-testid="input-purchasePrice"]',e=>e.value==='180000'));
  await page.click('[data-testid="back-to-property"]');await page.waitForSelector('#overview');check(`${label}: explicit back navigation retains subject`,await page.$eval('#overview',(e,address)=>e.textContent.includes(address),p.address));
  await page.goBack({waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="input-purchasePrice"]');check(`${label}: browser back retains scenario subject`,await page.$eval('.iw-detail',(e,address)=>e.textContent.includes(address),p.address));
  const scenarios=(await api('/scenarios')).data,s=scenarios.find(s=>s.propertyRef===ref);check(`${label}: snapshot binding persisted locally`,s.evidenceFingerprint===(p.evidenceFingerprint??evidence.fingerprint));
  await button('Reports');
  for(const kind of ['brief','full']){
   await page.select('[aria-label="Report type"]',kind);await button('Preview report');await page.waitForSelector('iframe[title="Report preview"]');
   const r=(await api('/report',{id:s.id,revision:s.revision,kind})).data;check(`${label} ${kind}: preview subject correct`,r.html.includes(p.address));
   const response=page.waitForResponse(r=>r.url().endsWith('/report')&&r.request().postData()?.includes('"pdf":true'),{timeout:60000});
   const completed=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Download timeout')),60000),handler=e=>{if(e.state==='completed'){clearTimeout(timer);cdp.off('Browser.downloadProgress',handler);resolve();}};cdp.on('Browser.downloadProgress',handler);});await button('Export PDF');check(`${label} ${kind}: browser export succeeds`,(await response).status()===200);await completed;
   const originalFile=path.join(output,`${ref}-${kind}-r${s.revision}.pdf`),bytes=await readFile(originalFile);await writeFile(path.join(output,`${label}-${kind}.pdf`),bytes,{flag:'wx'});
   const doc=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true}).promise;let text='';
   for(let n=1;n<=doc.numPages;n++){const pg=await doc.getPage(n),content=await pg.getTextContent(),words=content.items.filter(x=>x.str?.trim());check(`${label} ${kind} page ${n}: no blank page`,words.length>15);const view=pg.getViewport({scale:1});check(`${label} ${kind} page ${n}: text within bounds`,words.every(x=>x.transform[4]>=-1&&x.transform[4]<=view.width+1&&x.transform[5]>=-1&&x.transform[5]<=view.height+1));text+=words.map(x=>x.str).join(' ');const viewport=pg.getViewport({scale:1.15}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await pg.render({canvasContext:canvas.getContext('2d'),viewport}).promise;await writeFile(path.join(output,`${label}-${kind}-page-${n}.png`),canvas.toBuffer('image/png'),{flag:'wx'});}
   check(`${label} ${kind}: assumption labels and full disclaimer`,text.includes('ARTIFICIAL ASSUMPTIONS')&&text.includes('INDEMNIFICATION'));pdfs.push({subject:label,kind,pages:doc.numPages,path:`${label}-${kind}.pdf`});await doc.destroy();
  }
 }
 // Browser-only variants: never modify the real saved snapshot.
 for(const [name,count] of [['zero',0],['one',1],['malformed',0],['no-comps',0],['duplicates',3],['large',125]]){
  variant=structuredClone(evidence);const m=variant.propertyDetails[0],sample=m.comps[0];m.digest+='-'+name;
  if(name==='no-comps')m.comps=[];
  else if(name==='duplicates')m.comps=[{...sample,id:'same-a',address:'100 Test St',providerId:'same'},{...sample,id:'same-b',address:'100 Test St',providerId:'same'},{...sample,id:'unit-a',address:'100 Test St Unit 2',unit:'2'}];
  else if(name==='large')m.comps=Array.from({length:125},(_,i)=>({...sample,id:'large-'+i,address:`${i} Test St`,providerId:String(i)}));
  else m.comps=m.comps.map((c,i)=>({...c,latitude:i<count?c.latitude:name==='malformed'?'bad':null,longitude:i<count?c.longitude:null}));
  await page.goto(route(saved),{waitUntil:'networkidle0'});await page.reload({waitUntil:'networkidle0'});
  if(count<2){await page.waitForSelector('[data-testid="compact-map"]');check(`${name}: compact fallback with no fabricated pins`,await page.$$('.comp-pin').then(x=>x.length===0));check(`${name}: exact actual mapped count`,await page.$eval('[data-testid="compact-map"]',(e,n)=>e.textContent.startsWith(`${n} of `),count));await shot('edge-'+name,'#comps');}
  if(name==='duplicates'){check('duplicates expand; distinct unit remains separate',await page.$$('[data-comp-row]').then(x=>x.length===2));await page.click('#comps .row-select');check('grouped observations individually selectable',await page.$$('.observation-detail').then(x=>x.length===3));await shot('edge-duplicates','#comps .table-scroll');}
  if(name==='large'){check('large evidence list starts bounded',await page.$$('[data-comp-row]').then(x=>x.length===40));await button('Show more observations (85 groups remaining)');check('large evidence list accessible without losing records',await page.$$('[data-comp-row]').then(x=>x.length===80));}
 }
 variant=null;await page.setViewport({width:390,height:844});await page.goto(route(evidence.properties.find(p=>p.ref==='GABE-05')),{waitUntil:'networkidle0'});await page.waitForSelector('#comps');await shot('mobile-overview','#overview');await shot('mobile-table','#comps .table-scroll');check('mobile no page-level horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.focus('#comps .row-select');await page.keyboard.press('Enter');check('keyboard row opens same source detail',await page.$eval('[data-testid="selected-comp"]',e=>e.textContent.includes('Comp 1:')));
 const bad=await api('/save',{...((await api('/scenarios')).data[0]),evidenceFingerprint:'tampered'});check('changed snapshot save blocked',bad.status===400);
 await page.goto(app.origin+'/'+investmentRoute('GABE-01','wrong'),{waitUntil:'networkidle0'});await page.waitForSelector('[role="alert"]');check('wrong route fingerprint blocked without subject leakage',await page.$eval('[role="alert"]',e=>e.textContent.includes('does not match'))&&await page.$('.iw-detail')===null);
 for(const endpoint of ['/api/geocode','/api/properties','/api/properties/analyze','/api/investment/refresh']){const r=await fetch(app.origin+endpoint,{method:'POST',headers:{Origin:app.origin,'Content-Type':'application/json'},body:'{}'});check(endpoint+' denied',r.status===404);}
 check('no unexpected browser errors',errors.length===0);check('zero remote browser/provider attempts',blocked.length===0);done=true;
}finally{
 if(!done)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});
 await writeFile(output+'/qa-results.json',JSON.stringify({status:done?'PASS':'FAIL',checks,errors,blocked,providerCalls:0,databaseWrites:0,additionalExposureCents:0,screenshots,pdfs},null,2),{flag:'wx'});
 await writeFile(output+'/index.html',`<!doctype html><meta charset="utf-8"><title>Property Detail V1.2 private QA</title><style>body{font:16px system-ui;max-width:1200px;margin:30px auto}img{max-width:100%;border:1px solid #ddd}section{margin-bottom:40px}</style><h1>Property Detail V1.2 · private local QA</h1><p>Retained evidence; financial inputs are artificial QA assumptions. Not investment recommendations.</p>${pdfs.map(p=>`<p><a href="${p.path}">${p.subject} ${p.kind} · ${p.pages} pages</a></p>`).join('')}${screenshots.map(p=>`<section><h2>${path.basename(p)}</h2><img src="${path.basename(p)}"></section>`).join('')}`,{flag:'wx'});
 await browser.close();await app.close();console.log(JSON.stringify({output,status:done?'PASS':'FAIL',checks:checks.length,pdfs:pdfs.length,errors}));
}
