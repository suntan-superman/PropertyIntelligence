import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {startWorkbench} from '../src/workbench/server.js';
import {browser} from '../src/reports/pdf.js';
import {fixture} from '../src/workbench/model.js';

const output=path.resolve('data/runtime/saved-property-scroll-qa');
await mkdir(output,{recursive:true});
const model=await fixture('fantasia');
const app=await startWorkbench({env:{},port:0,mapConfig:{configured:false,reason:'Offline saved-property scroll QA'}});
const instance=await browser(),page=await instance.newPage({viewport:{width:1440,height:900}});
page.setDefaultTimeout(10000);
const errors=[],external=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(!request.url().startsWith(app.url)){external.push(request.url());return route.abort();}
  if(url.pathname==='/api/health')return route.fulfill({contentType:'application/json',body:JSON.stringify({rentcastConfigured:false,pdfAvailable:false})});
  if(url.pathname==='/api/properties'&&request.method()==='GET')return route.fulfill({contentType:'application/json',body:JSON.stringify({properties:[{id:'saved-scroll-property',address_line1:'8426 Fantasia Park Way',city:'Riverview',state:'FL',postal_code:'33578',latest_avm:122000,latest_evidence_at:'2026-09-18T00:00:00.000Z'}]})});
  if(url.pathname==='/api/deals'&&request.method()==='GET')return route.fulfill({contentType:'application/json',body:JSON.stringify({deals:[]})});
  if(url.pathname==='/api/properties/saved-scroll-property')return route.fulfill({contentType:'application/json',body:JSON.stringify({sessionId:'saved-scroll-session',property:{id:'saved-scroll-property',model:{...model,mode:'property',state:'READY_PROPERTY'}}})});
  return route.continue();
});
try{
  await page.goto(app.url,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Open Property',exact:true}).waitFor();
  await page.locator('#saved-properties').scrollIntoViewIfNeeded();
  assert.ok((await page.locator('#saved-properties').boundingBox()).y>0);checks.push('Saved Properties list is reachable before selection');
  await page.getByRole('button',{name:'Open Property',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid=state]')?.dataset.state==='READY_PROPERTY');
  try{await page.waitForFunction(()=>Math.abs(document.querySelector('#overview').getBoundingClientRect().top-18)<35);}catch(error){
    console.error(JSON.stringify(await page.evaluate(()=>({active:document.activeElement?.id,hash:location.hash,innerHeight:window.innerHeight,scrollHeight:document.documentElement.scrollHeight,scrollY:window.scrollY,overviewTop:document.querySelector('#overview')?.getBoundingClientRect().top,overviewOffsetTop:document.querySelector('#overview')?.offsetTop,overviewTabIndex:document.querySelector('#overview')?.tabIndex}))));
    throw error;
  }
  assert.equal(await page.locator('#overview h2').innerText(),model.address);checks.push('Selected saved property renders the requested subject');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'overview');checks.push('Loaded Property overview receives focus');
  const top=await page.locator('#overview').evaluate(element=>element.getBoundingClientRect().top);assert.ok(top>=-1&&top<60);checks.push('Viewport scrolls to loaded Property overview');
  assert.equal(await page.evaluate(()=>location.hash),'#overview');checks.push('Existing overview deep link remains intact');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);checks.push('No browser errors or external requests');
  await page.screenshot({path:path.join(output,'saved-property-auto-scroll.png')});
  const result={status:'PASS',checks,errors,externalRequests:external.length,providerCalls:0,databaseConnections:0,databaseWrites:0};
  await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await instance.close();await app.close();}
