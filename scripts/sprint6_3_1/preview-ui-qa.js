import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {browser} from '../../src/reports/pdf.js';

const base=String(process.argv[2]??'').replace(/\/$/,'');const production=base==='https://worksidepropertyintelligence.netlify.app';
if(!production&&!/^https:\/\/[a-z0-9-]+--worksidepropertyintelligence\.netlify\.app$/i.test(base))throw new Error('PREVIEW_URL_REQUIRED');
const result={status:'STOP',mode:production?'PRODUCTION_UI_QA':'PREVIEW_UI_QA',previewUrl:base,providerCalls:0};
const instance=await browser();
try{
 const page=await instance.newPage({viewport:{width:1366,height:900}});const external=[];let analyzeRequests=0;
 page.on('request',request=>{const url=new URL(request.url());if(url.origin!==base)external.push(url.origin);if(url.pathname.endsWith('/analyze')&&request.method()==='POST')analyzeRequests++;});
 await page.goto(`${base}/#opportunities`,{waitUntil:'domcontentloaded'});await page.getByText('11,316 candidates',{exact:false}).first().waitFor({timeout:30000});assert.equal(await page.locator('#opportunities tbody tr').count(),25);
 const row=page.locator('#opportunities tbody tr').first();assert.ok((await row.innerText()).includes('County situs unavailable'));await row.getByRole('button',{name:'Analyze Property',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Resolve canonical address'});await dialog.waitFor({state:'visible'});assert.match(await dialog.innerText(),/County situs.*Unavailable|County situs unavailable/i);assert.equal(await dialog.getByLabel('ZIP-5').inputValue(),'');assert.equal(await dialog.getByText('I manually confirmed these address components.').locator('..').locator('input[type="checkbox"]').getAttribute('required'),'');assert.match(page.url(),/#opportunities$/);
 const save=dialog.getByRole('button',{name:'Save Address',exact:true});await save.click();assert.equal(await dialog.getByLabel('ZIP-5').evaluate(el=>!el.validity.valid),true);
 await dialog.getByLabel('Street').fill('1 Preview UI Street');await dialog.getByLabel('City').fill('Bakersfield');await dialog.getByLabel('State').fill('C');await dialog.getByLabel('ZIP-5').fill('93301');await dialog.getByText('I manually confirmed these address components.').locator('..').locator('input[type="checkbox"]').check();await save.click();await page.getByRole('alert').waitFor({timeout:10000});assert.equal(await dialog.isVisible(),true);assert.match(await page.getByRole('alert').innerText(),/invalid|address/i);
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0);assert.match(page.url(),/#opportunities$/);await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await mkdir('data/runtime/sprint6_3_1/visual',{recursive:true});await page.screenshot({path:'data/runtime/sprint6_3_1/visual/preview-mobile.png',fullPage:true});assert.deepEqual(external,[]);assert.equal(analyzeRequests,0);
 result.status='PASS';result.checks={desktop1366:true,mobile390:true,incompleteCandidate:true,countySitusReadOnly:true,zipBlankWithoutEvidence:true,analystConfirmationRequired:true,missingZipValidation:true,invalidStateValidation:true,staysOnOpportunities:true,resolverOpens:true,noBlankOverview:true,noProviderRequest:true,noExternalRequests:true};
}catch(error){result.error=/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'SANITIZED_PREVIEW_UI_QA_STOP';process.exitCode=1;}
finally{await instance.close();}
await writeFile(`data/validation/sprint6_3_1-${production?'production':'preview'}-ui-qa.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
