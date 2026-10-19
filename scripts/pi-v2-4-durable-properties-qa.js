import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {createDurablePropertyService} from '../src/investment-workspace/durable-properties.js';
import {createMemoryDurablePropertyRepository} from '../src/investment-workspace/memory-durable-properties.js';

const root=process.cwd(),output=path.join(root,'data/validation/pi-v2-4-durable-properties');
await mkdir(path.join(root,'.tmp'),{recursive:true});
const temporary=await mkdtemp(path.join(root,'.tmp','pi-v2-4-properties-'));
await mkdir(output,{recursive:true});

const user={uid:'qa-admin',role:'Administrator',organizationId:'property-intelligence-qa',emailVerified:true,providerResearchAllowed:true,authenticatedAt:new Date().toISOString(),sessionExpiresAt:new Date(Date.now()+3_600_000).toISOString()};
const authentication={
  enabled:true,
  expectedProjectId:'property-intelligence-8238b',
  issueCsrf(response){response.setHeader('Set-Cookie','pi_csrf=mock-v2-4; Path=/; SameSite=Strict');return 'mock-v2-4';},
  async authenticate(){return user;},
  requireCsrf(request){if(request.headers['x-pi-csrf']!=='mock-v2-4')throw Object.assign(new Error('CSRF_VALIDATION_FAILED'),{status:403});},
  clearSession(response){response.setHeader('Set-Cookie','pi_session=; Path=/; Max-Age=0');}
};
const decatur={
  ref:'RESEARCH-DECATUR-QA',
  address:'400 Decatur St, Bakersfield, CA 93308',
  addressComponents:{street:'400 Decatur St',city:'Bakersfield',state:'CA',zip:'93308'},
  subjectKind:'PRELIMINARY_RESEARCH',
  evidenceFingerprint:'mock-decatur-evidence-snapshot-v1',
  providerId:'mock-rentcast-decatur',
  identityStatus:'Provider-reported address match; legal parcel identity not verified',
  attributes:{propertyType:'Single Family',bedrooms:3,bathrooms:1,squareFootage:824},
  findings:['Parcel identifier is unknown.'],sales:[],listings:[],avm:null
};
const propertyResearch={
  setEvidenceProvider(){},
  setEvidenceHandler(handler){handler({property:decatur,detail:null});},
  async capability(){return {enabled:false,liveProviderEnabled:false,cacheRestoreEnabled:false,workflow:'MOCK_NO_PROVIDER',provider:'RentCast',blockers:['PROVIDER_ACCESS_NOT_CONFIGURED']};},
  async localEvidence(){return {entries:[]};}
};
const repository=createMemoryDurablePropertyRepository(),durableProperties=createDurablePropertyService({repository});
const app=await startInvestmentWorkspace({port:0,root,propertyDetail:true,authentication,durableProperties,propertyResearch,storeDirectory:path.join(temporary,'scenarios'),discoveryStoreDirectory:path.join(temporary,'discovery'),leadStoreDirectory:path.join(temporary,'leads')});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage();
await page.setViewport({width:1440,height:960});
const checks=[],screenshots=[],external=[],browserErrors=[],check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const shot=async name=>{const file=path.join(output,`${name}.png`);await page.screenshot({path:file,fullPage:true});screenshots.push(file);};
await page.setRequestInterception(true);
page.on('pageerror',error=>browserErrors.push(error.message));
page.on('request',request=>{if(request.url().startsWith(app.origin)||/^(data:|blob:|about:blank)/.test(request.url()))request.continue().catch(()=>{});else{external.push(request.url().split('?')[0]);request.abort().catch(()=>{});}});
const clickText=(selector,text)=>page.evaluate(({selector,text})=>{const node=[...document.querySelectorAll(selector)].find(item=>item.textContent.replace(/\s+/g,' ').trim().includes(text)&&!item.disabled);if(!node)throw new Error(`Missing control: ${text}`);node.click();},{selector,text});
try{
  await page.goto(`${app.origin}/#analyze-property`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.address-analysis input');
  await page.type('.address-analysis label:nth-of-type(1) input','400 Decatur Street');
  await page.type('.address-analysis label:nth-of-type(2) input','Bakersfield');
  await page.type('.address-analysis label:nth-of-type(4) input','93308');
  await clickText('button','Research retained evidence');
  await page.waitForFunction(()=>document.body.innerText.includes('Retained subject found')&&document.body.innerText.includes('400 Decatur St'));
  check('Decatur opens as retained preliminary research without a provider call',await page.evaluate(()=>document.body.innerText.includes('One retained preliminary research subject matches')&&document.body.innerText.includes('no durable Property created')));
  await clickText('button','Save as Property');
  await page.waitForFunction(()=>document.querySelector('[data-testid="notification-dialog"]')?.innerText.includes('Save as Property?'));
  check('promotion dialog identifies the reviewed address',await page.$eval('[data-testid="notification-dialog"]',node=>node.innerText.includes('400 Decatur St, Bakersfield, CA 93308')));
  check('promotion dialog preserves unknown APN uncertainty',await page.$eval('[data-testid="notification-dialog"]',node=>/parcel identifier/i.test(node.innerText)&&/unknown/i.test(node.innerText)));
  check('promotion dialog shows the immutable evidence snapshot',await page.$eval('[data-testid="notification-dialog"]',node=>node.innerText.includes('mock-decatur-evidence-snapshot-v1')));
  await shot('01-save-as-property-confirmation');
  await clickText('[data-testid="notification-dialog"] button','Save as Property');
  await page.waitForFunction(()=>document.querySelector('[data-testid="notification-dialog"]')?.innerText.includes('Property saved'));
  check('successful promotion is explicitly acknowledged',await page.$eval('[data-testid="notification-dialog"]',node=>node.innerText.includes('Saved Property')&&node.innerText.includes('identity and verification labels remain unchanged')));
  await clickText('[data-testid="notification-dialog"] button','Continue');

  await page.goto(`${app.origin}/#my-workspace`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.workspace-table')?.innerText.includes('400 Decatur St'));
  check('My Workspace restores Decatur as a Saved Property',await page.$eval('.workspace-table',node=>node.innerText.includes('400 Decatur St, Bakersfield, CA 93308')&&node.innerText.includes('Saved Property')));
  check('Saved Properties shows lifecycle metadata and a stable ID',await page.$eval('.workspace-table',node=>node.innerText.includes('Stable ID')&&node.innerText.includes('PROVIDER REPORTED ADDRESS MATCH')));
  check('workspace desktop has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  await shot('02-saved-property-workspace');

  const secondPage=await browser.newPage();await secondPage.setViewport({width:1280,height:800});
  await secondPage.setRequestInterception(true);secondPage.on('request',request=>{if(request.url().startsWith(app.origin)||/^(data:|blob:|about:blank)/.test(request.url()))request.continue().catch(()=>{});else request.abort().catch(()=>{});});
  await secondPage.goto(`${app.origin}/#my-workspace`,{waitUntil:'domcontentloaded'});
  await secondPage.waitForFunction(()=>document.body.innerText.includes('400 Decatur St, Bakersfield, CA 93308'));
  check('a separate browser page restores the same organization property',await secondPage.$eval('.workspace-table',node=>node.innerText.includes('400 Decatur St, Bakersfield, CA 93308')));
  await secondPage.close();

  await clickText('.workspace-table button','Archive');
  await page.waitForFunction(()=>document.querySelector('[data-testid="notification-dialog"]')?.innerText.includes('Archive this property?'));
  check('archive confirmation explains history preservation',await page.$eval('[data-testid="notification-dialog"]',node=>node.innerText.includes('evidence links, scenarios and report history remain preserved')));
  await clickText('[data-testid="notification-dialog"] button','Archive Property');
  await page.waitForFunction(()=>!document.querySelector('.workspace-table')?.innerText.includes('400 Decatur St'));
  await clickText('.workspace-property-tools button','Show Archived');
  await page.waitForFunction(()=>document.querySelector('.workspace-table')?.innerText.includes('Archived Property'));
  check('archived property remains recoverable',await page.$eval('.workspace-table',node=>node.innerText.includes('400 Decatur St')&&node.innerText.includes('Archived Property')&&node.innerText.includes('Restore')));
  await shot('03-archived-property-recoverable');
  await clickText('.workspace-table button','Restore');
  await page.waitForFunction(()=>document.querySelector('[data-testid="notification-dialog"]')?.innerText.includes('Restore this property?'));
  await clickText('[data-testid="notification-dialog"] button','Restore Property');
  await page.waitForFunction(()=>document.querySelector('.workspace-table')?.innerText.includes('Saved Property'));
  check('restore returns the property to active lifecycle',await page.$eval('.workspace-table',node=>node.innerText.includes('Saved Property')&&!node.innerText.includes('Archived Property')));

  const API=async(pathname,options={})=>fetch(`${app.origin}${pathname}`,{...options,headers:{Host:new URL(app.origin).host,...options.headers}});
  const duplicate=await API('/api/durable-properties/save',{method:'POST',headers:{'Content-Type':'application/json','Origin':app.origin,'X-PI-Workspace':'local-v1','X-PI-CSRF':'mock-v2-4'},body:JSON.stringify({subjectRef:decatur.ref})});
  check('duplicate save is rejected instead of silently merged',duplicate.status===409&&(await duplicate.json()).error==='DUPLICATE_PROPERTY');
  check('browser runtime has no errors',browserErrors.length===0);
  check('no provider or other external requests were completed',external.length===0);
  const result={status:'PASS',at:new Date().toISOString(),backend:'in-memory Firestore substitute',liveFirestoreWrites:0,providerCalls:0,checks,screenshots,externalRequests:external,browserErrors};
  await writeFile(path.join(output,'qa-results.json'),`${JSON.stringify(result,null,2)}\n`);
  console.log(JSON.stringify({status:'PASS',checks:checks.length,screenshots,liveFirestoreWrites:0,providerCalls:0},null,2));
}finally{
  await browser.close();await app.close();await rm(temporary,{recursive:true,force:true});
}
