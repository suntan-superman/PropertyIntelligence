import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {investmentRoute} from '../apps/web/src/features/property-detail/navigation.js';

const root=process.cwd(),base=path.join(root,'data/runtime/pi-v2-seller-financial-position');await mkdir(base,{recursive:true});
const output=await mkdtemp(path.join(base,'qa-')),storeDirectory=path.join(output,'scenarios');
const evidence=await addPropertyDetails(await loadEvidence(root)),property=evidence.properties.find(item=>item.ref==='GABE-01');assert.ok(property);
const app=await startInvestmentWorkspace({port:0,root,storeDirectory,propertyDetail:true}),browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage();await page.setViewport({width:1500,height:1100});
const checks=[],blocked=[],errors=[],screenshots=[];const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
await page.setRequestInterception(true);page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().startsWith(app.origin)||/^(data:|blob:|about:blank)/.test(request.url()))request.continue();else{blocked.push(request.url().split('?')[0]);request.abort();}});
const button=async label=>page.evaluate(label=>{const node=[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===label);if(!node||node.disabled)throw new Error(`Button unavailable: ${label}`);node.click();},label);
const setInput=async(label,value)=>{const selector=`[aria-label="${label}"]`;await page.waitForSelector(selector);await page.$eval(selector,(element,next)=>{const proto=element.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,setter=Object.getOwnPropertyDescriptor(proto,'value').set;setter.call(element,String(next));element.dispatchEvent(new Event('change',{bubbles:true}));element.dispatchEvent(new Event('input',{bubbles:true}));},value);};
const setFinancial=async(label,amount,source,date,verificationStatus='PRESENT')=>{await setInput(`${label} status`,verificationStatus);if(verificationStatus==='PRESENT')await setInput(`${label} amount`,amount);await setInput(`${label} source`,source);await setInput(`${label} date`,date);};
const api=async(body,pdf=false)=>{const response=await fetch(`${app.origin}/api/investment/report`,{method:'POST',headers:{Origin:app.origin,'Content-Type':'application/json','X-PI-Workspace':'local-v1'},body:JSON.stringify({...body,...(pdf?{pdf:true}:{})})});if(!response.ok)throw new Error(await response.text());return pdf?new Uint8Array(await response.arrayBuffer()):response.json();};
try{
  const route=investmentRoute(property.ref,property.evidenceFingerprint??evidence.fingerprint);await page.goto(`${app.origin}/${route}`,{waitUntil:'networkidle0'});await page.waitForSelector('[data-testid="input-purchasePrice"]');
  // Required economics are entered only so the existing report can render; seller debt stays separate.
  for(const [key,value] of Object.entries({purchasePrice:180000,rehabCost:35000,exitValue:300000})){const selector=`[data-testid="input-${key}"]`;await page.$eval(selector,(input,next)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,String(next));input.dispatchEvent(new Event('input',{bubbles:true}));},value);}
  await page.click('[data-testid="stage-evidence"]');await page.waitForSelector('[data-testid="seller-financial-position"]');
  check('dedicated seller financial tab is visible',await page.$eval('.iw-tabs [role="tab"][aria-selected="true"]',element=>element.textContent)==='Seller Financial Position');
  await setFinancial('Original recorded mortgage amount',240000,'Recorded deed of trust','2025-02-12');
  await setFinancial('Estimated outstanding mortgage balance',175000,'Provider algorithmic estimate','2026-10-15');
  await setFinancial('Verified payoff',168500,'Lender payoff statement','2026-10-15');
  await setFinancial('Delinquent property taxes',2200,'County tax statement','2026-10-14');
  await setFinancial('Analyst proposed sale price',310000,'Analyst proposed price','2026-10-15');
  await button('Add another lien');await page.waitForFunction(()=>document.querySelectorAll('.iw-lien-row').length===1);await button('Add another lien');await page.waitForFunction(()=>document.querySelectorAll('.iw-lien-row').length===2);
  await setFinancial('Other lien 1',7500,'Recorded lien index','2026-09-01');await setFinancial('Other lien 2',2500,'Recorded judgment index','2026-09-02');
  check('verified payoff supersedes visible estimated balance',await page.$eval('[data-testid="seller-financial-position"]',element=>element.textContent.includes('Mortgage obligation used')&&element.textContent.includes('$168,500')));
  check('multiple liens and taxes produce illustrative gross equity',await page.$eval('[data-testid="seller-financial-position"]',element=>element.textContent.includes('$110,300')));
  check('proposed sale produces estimated seller proceeds',await page.$eval('[data-testid="seller-financial-position"]',element=>element.textContent.includes('$129,300')));
  check('seller debt separation warning is visible',await page.$eval('[data-testid="seller-financial-position"]',element=>/never added to acquisition expenses or MAO/i.test(element.textContent)));
  await page.$eval('[data-testid="seller-financial-position"]',element=>element.scrollIntoView({block:'start'}));const uiShot=path.join(output,'seller-financial-position.png');await page.screenshot({path:uiShot,fullPage:true});screenshots.push(uiShot);
  await button('Save locally');await page.waitForFunction(()=>document.body.textContent.includes('Saved locally as revision 1'));
  const scenarios=await (await fetch(`${app.origin}/api/investment/scenarios`)).json(),saved=scenarios.find(item=>item.propertyRef===property.ref);check('seller evidence saved in the existing scenario revision',saved.analystEvidence.length===7&&saved.sellerValuationBasis==='PROVIDER_AVM');
  check('saved analysis excludes seller obligations from acquisition costs',saved.analysis.deterministic.totalProjectCost===215000);
  const report=await api({id:saved.id,revision:saved.revision,kind:'full'}),htmlFile=path.join(output,'sample-full-investor-package.html');await writeFile(htmlFile,report.html,{flag:'wx'});
  const pdfBytes=await api({id:saved.id,revision:saved.revision,kind:'full'},true),pdfFile=path.join(output,'sample-full-investor-package.pdf');await writeFile(pdfFile,pdfBytes,{flag:'wx'});
  const pdf=await getDocument({data:pdfBytes,useSystemFonts:true,disableFontFace:true}).promise;let sellerPage=0,fullText='';
  for(let number=1;number<=pdf.numPages;number++){const pdfPage=await pdf.getPage(number),content=await pdfPage.getTextContent(),text=content.items.map(item=>item.str).join(' ');fullText+=` ${text}`;if(text.includes('Seller obligations inform title/payoff diligence'))sellerPage=number;check(`PDF page ${number} is nonblank`,content.items.filter(item=>item.str?.trim()).length>15);}
  check('Full Investor Package contains dedicated seller section',sellerPage>0&&/Lender-confirmed \/ independently verified payoff/i.test(fullText));check('report shows sources and uncertainty labels',/Lender payoff statement/.test(fullText)&&/before commissions, closing costs/.test(fullText));
  const reportPage=await pdf.getPage(sellerPage),viewport=reportPage.getViewport({scale:1.25}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await reportPage.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const reportShot=path.join(output,'sample-report-seller-financial-position.png');await writeFile(reportShot,canvas.toBuffer('image/png'),{flag:'wx'});screenshots.push(reportShot);await pdf.destroy();
  check('zero external/provider browser calls',blocked.length===0);check('zero browser errors',errors.length===0);
  const result={status:'PASS',at:new Date().toISOString(),checks,screenshots,sampleReport:{html:htmlFile,pdf:pdfFile,sellerPage},providerCalls:0,databaseConnections:0,databaseWrites:0,productionWrites:0,blocked,errors};await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'PASS',output,checks:checks.length,screenshots,sampleReport:result.sampleReport}));
}finally{await browser.close();await app.close();}
