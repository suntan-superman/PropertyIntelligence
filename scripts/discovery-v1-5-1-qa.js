import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';

const base=path.resolve('data/runtime/discovery-v1-5-1');await mkdir(base,{recursive:true});const output=await mkdtemp(path.join(base,'qa-'));
const app=await startInvestmentWorkspace({port:0,propertyDetail:true,storeDirectory:path.join(output,'scenarios'),discoveryStoreDirectory:path.join(output,'discovery-state')});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
const page=await browser.newPage(),checks=[],screenshots=[],blocked=[],errors=[];let pass=false;
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};const shot=async(name,width)=>{await page.setViewport({width,height:1000});const file=path.join(output,`${name}-${width}.png`);await page.screenshot({path:file,fullPage:true});screenshots.push(file);};
await page.setRequestInterception(true);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().startsWith(app.origin+'/')||/^(data:|blob:|about:blank)/.test(r.url()))return r.continue();blocked.push(r.url().split('?')[0]);r.abort();});
try{
 await page.setViewport({width:1600,height:1000});await page.goto(`${app.origin}/#home`,{waitUntil:'networkidle0'});
 check('home has exactly three primary navigation destinations',await page.$$eval('.pi-shell-header nav a',xs=>xs.map(x=>x.textContent).join('|')==='Analyze Property|Discover Opportunities|My Workspace'));
 check('home has two large entry actions',await page.$$eval('.pi-entry-grid>a',xs=>xs.length===2&&xs[0].textContent.includes('Analyze a Property')&&xs[1].textContent.includes('Discover Opportunities')));
 check('ordinary navigation hides Monitoring and Saved Fixtures',!await page.$eval('.pi-shell-header',e=>/Monitoring|Saved Fixtures/.test(e.textContent)));
 await shot('01-home',1600);

 await page.goto(`${app.origin}/#analyze-property`,{waitUntil:'networkidle0'});await page.waitForSelector('.address-analysis');
 check('Analyze Property accepts optional ZIP',await page.$eval('.address-analysis',e=>e.textContent.includes('ZIP optional')&&!e.querySelector('label:nth-child(4) input').required));
 await shot('02-analyze-property',1280);

 await page.goto(`${app.origin}/#discover`,{waitUntil:'networkidle0'});await page.waitForSelector('.candidate-table');
 check('discovery presents exact corrected address-state counts',await page.$eval('.triage-states',e=>e.textContent.includes('1,270 county situs present')&&e.textContent.includes('9,990 missing')&&e.textContent.includes('53 Assessor-unmatched')));
 check('residential preset is default with 80 candidates',await page.$eval('.strategy-preset',e=>e.textContent.includes('Residential Fix & Flip')&&e.textContent.includes('80')));
 await shot('03-discovery-residential',1600);
 await page.evaluate(()=>[...document.querySelectorAll('.strategy-preset button')].find(x=>x.textContent==='All property types').click());await page.waitForSelector('.counterexample');
 check('cannabis parcel is excluded from residential strategy',await page.$eval('.counterexample',e=>e.textContent.includes('CANNABIS PRODUCTION')&&e.textContent.includes('address not fabricated')));
 check('geometry-only evidence is labeled without a street',await page.$eval('.counterexample',e=>e.textContent.includes('parcel geometry available')));
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(x=>x.textContent.startsWith('Shortlist first available')).click());await page.waitForFunction(()=>document.querySelector('.shortlist-count')?.textContent.includes('6/6'));
 check('80-to-six shortlist handoff persists locally',await page.$eval('.shortlist-count',e=>e.textContent.includes('6/6')));
 await shot('04-discovery-all-types-shortlist',1600);

 await page.goto(`${app.origin}/#my-workspace`,{waitUntil:'networkidle0'});await page.waitForSelector('.workspace-controls');
 check('workspace separates four saved-work views',await page.$$eval('[role=tab]',xs=>xs.map(x=>x.textContent).join('|')==='Saved Properties|Analyses / Deals|Research|Reports'));
 check('Haven durable Property is in ordinary saved list',await page.$eval('.workspace-table',e=>e.textContent.includes('3484 Haven St')&&e.textContent.includes('Durable saved Property')));
 check('preliminary research is not promoted into Saved Properties',!await page.$eval('.workspace-table',e=>e.textContent.includes('1708 Crestview Dr')));
 await shot('05-my-workspace-properties',1280);
 await page.evaluate(()=>[...document.querySelectorAll('[role=tab]')].find(x=>x.textContent==='Research').click());await page.waitForFunction(()=>document.querySelector('.workspace-table')?.textContent.includes('1708 Crestview Dr'));
 check('retained preliminary research is visible without durable promotion',await page.$eval('.workspace-table',e=>e.textContent.includes('1708 Crestview Dr')&&e.textContent.includes('Retained preliminary research')));
 check('workspace Research retains six saved preliminary subjects and six shortlisted county subjects',await page.$$eval('.workspace-table tbody tr',xs=>xs.length===12));
 await shot('06-my-workspace-shortlist',1600);

 for(const [route,text] of [['#analyze-address','Analyze a Property'],['#opportunities','Discover Opportunities'],['#saved-deals','My Workspace']]){await page.goto(`${app.origin}/${route}`,{waitUntil:'networkidle0'});await page.waitForSelector('h1');check(`legacy ${route} reaches ${text}`,(await page.$eval('h1',e=>e.textContent.replace(/\s+/g,' ').trim()))===text);}
 check('legacy saved-deals selects Analyses / Deals',await page.$eval('[role="tab"][aria-selected="true"]',e=>e.textContent.trim())==='Analyses / Deals');
 check('legacy monitoring deep link code remains reachable',await page.goto(`${app.origin}/#monitoring`,{waitUntil:'networkidle0'}).then(()=>page.$('main, .monitoring-shell, .monitoring-app')).then(Boolean));
 check('zero external/provider attempts',blocked.length===0);check('zero browser errors',errors.length===0);pass=true;
}finally{
 if(!pass)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
 const result={status:pass?'PASS':'FAIL',node:process.version,browser:await browser.version(),output,checks,checkCount:checks.length,screenshots,blocked,errors,providerCalls:0,databaseConnections:0,databaseWrites:0,productionChanges:0};await writeFile(path.join(output,'qa-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 await browser.close();await app.close();console.log(JSON.stringify({status:result.status,output,checks:checks.length,blocked,errors}));
}
