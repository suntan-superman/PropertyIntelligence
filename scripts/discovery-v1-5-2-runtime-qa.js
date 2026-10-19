import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';

const origin=process.env.PI_WORKBENCH_ORIGIN??'http://127.0.0.1:4177';
const output=path.resolve('data/runtime/discovery-v1-5-2/google-runtime');
await mkdir(output,{recursive:true});
const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
const page=await browser.newPage();
await page.setViewport({width:1500,height:1000,deviceScaleFactor:1});
const consoleMessages=[],requestFailures=[],checks=[];
page.on('console',message=>consoleMessages.push({type:message.type(),text:message.text()}));
page.on('requestfailed',request=>requestFailures.push({url:request.url().replace(/\?.*/,''),error:request.failure()?.errorText??'unknown'}));
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
try{
  await page.goto(`${origin}/#analyze-address`,{waitUntil:'networkidle0'});
  await page.waitForSelector('.address-analysis');
  const inputs=await page.$$('.address-analysis input');
  await inputs[0].type('130 KERN ST');
  await inputs[1].type('TAFT');
  check('Kern County workflow defaults State to CA',await inputs[2].evaluate(element=>element.value==='CA'));
  await page.evaluate(()=>[...document.querySelectorAll('.address-analysis button')].find(button=>button.textContent==='Resolve with Google').click());
  await page.waitForSelector('.address-resolver');
  check('entered source is preserved separately',await page.$eval('.address-resolver',element=>element.textContent.includes('Entered address · preserved')&&element.textContent.includes('130 KERN ST, TAFT')));
  await page.evaluate(()=>[...document.querySelectorAll('.address-resolver button')].find(button=>button.textContent==='Find Address with Google').click());
  await page.waitForFunction(()=>document.querySelector('.evidence-columns')?.textContent.includes('93268'));
  const view=await page.$eval('.address-resolver',element=>({text:element.innerText,buttons:[...element.querySelectorAll('button')].map(button=>({text:button.textContent.trim(),disabled:button.disabled})),inputs:[...element.querySelectorAll('input')].map(input=>input.value)}));
  check('Google formatted suggestion and ZIP are visible',view.text.includes('130 Kern St, Taft, CA 93268, USA')&&view.text.includes('93268'));
  check('rooftop precision is visible',view.text.includes('ROOFTOP'));
  check('exact match comparison is visible',view.text.includes('Exact Address Candidate')&&view.text.includes('Street/city agreement: Yes'));
  check('Accept Correct Reject actions are visible',view.buttons.some(button=>button.text==='Accept exact suggestion'&&!button.disabled)&&view.buttons.some(button=>button.text==='Save analyst correction')&&view.buttons.some(button=>button.text==='Reject suggestion'));
  check('legal parcel identity boundary remains visible',view.text.includes('does not prove parcel identity'));
  check('Google populated standardized CA and ZIP',view.inputs[2]==='CA'&&view.inputs[3]==='93268');
  const usage=await page.evaluate(()=>fetch('/api/discovery/address-resolution/usage').then(response=>response.json()));
  check('Chrome workflow made exactly one live request with no duplicate call',usage.providerCalls===1&&usage.cacheHits===0&&usage.cacheEntries===1&&usage.decisions===0);
  const screenshot=path.join(output,'address-resolution-130-kern-st.png');
  await page.screenshot({path:screenshot,fullPage:true});
  const cspMessages=consoleMessages.filter(message=>/content security policy|websocket|ws:\/\//i.test(message.text));
  const result={status:'PASS',capturedAt:new Date().toISOString(),origin,node:process.version,browser:await browser.version(),checks,checkCount:checks.length,usage,screenshot,consoleMessages,cspMessages,requestFailures,liveRequestsThisRun:1,automaticRetries:0,decisionRecorded:false};
  await writeFile(path.join(output,'chrome-runtime-qa.json'),JSON.stringify(result,null,2)+'\n',{flag:'w',mode:0o600});
  console.log(JSON.stringify({status:result.status,checks:checks.length,usage,screenshot,cspMessages,requestFailures},null,2));
}finally{
  await browser.close();
}
