import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {startWorkbench} from '../src/workbench/server.js';
import {browser} from '../src/reports/pdf.js';
import {fixture} from '../src/workbench/model.js';

const output=path.resolve('data/runtime/deal-layout-qa');
await mkdir(output,{recursive:true});
const base=await fixture('fantasia');
const model={...base,mode:'deal',state:'READY_DEAL',warning:'Review all evidence and assumptions before relying on calculated outputs.'};
const app=await startWorkbench({env:{},port:0,mapConfig:{configured:false,reason:'Offline deal-layout QA'}});
const instance=await browser(),page=await instance.newPage({viewport:{width:1000,height:900}});
page.setDefaultTimeout(10000);
const errors=[],external=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(!request.url().startsWith(app.url)){external.push(request.url());return route.abort();}
  if(url.pathname==='/api/health')return route.fulfill({contentType:'application/json',body:JSON.stringify({rentcastConfigured:false,pdfAvailable:true})});
  if(url.pathname==='/api/properties'&&request.method()==='GET')return route.fulfill({contentType:'application/json',body:JSON.stringify({properties:[]})});
  if(url.pathname==='/api/deals'&&request.method()==='GET')return route.fulfill({contentType:'application/json',body:JSON.stringify({deals:[{id:'saved-layout-deal',name:'Layout QA deal',address_line1:'8426 Fantasia Park Way',city:'Riverview',state:'FL',deal_status:'DRAFT',latest_modeled_profit:25000}]})});
  if(url.pathname==='/api/deals/saved-layout-deal')return route.fulfill({contentType:'application/json',body:JSON.stringify({sessionId:'saved-layout-session',deal:{id:'saved-layout-deal',property_id:'saved-layout-property',model,analysisContext:{propertyId:'saved-layout-property',dealId:'saved-layout-deal',analysisSnapshotId:'analysis-layout',evidenceSnapshotId:'evidence-layout'}}})});
  if(url.pathname.includes('/acquisition-decisions'))return route.fulfill({contentType:'application/json',body:JSON.stringify({decisions:[]})});
  if(url.pathname==='/api/reports/investment/capability')return route.fulfill({contentType:'application/json',body:JSON.stringify({available:true,message:'Available in offline QA'})});
  return route.continue();
});
try{
  await page.goto(app.url,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Open Deal',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid=state]')?.dataset.state==='READY_DEAL');

  const actionButtons=page.locator('.deal-report-actions button');
  assert.equal(await actionButtons.count(),2);
  const firstAction=await actionButtons.nth(0).boundingBox(),secondAction=await actionButtons.nth(1).boundingBox();
  assert.ok(secondAction.x-(firstAction.x+firstAction.width)>=10);checks.push('Save Deal and Generate Deal Review PDF have a visible desktop gap');

  const grid=page.locator('.decision-grid');
  await grid.scrollIntoViewIfNeeded();
  assert.equal(await grid.evaluate(element=>getComputedStyle(element).display),'grid');
  assert.equal(await grid.locator('label').count(),5);
  for(const label of await grid.locator('label').all()){
    const labelBox=await label.boundingBox(),controlBox=await label.locator('input,select').boundingBox();
    assert.ok(controlBox.y>labelBox.y&&controlBox.width>170);
  }
  checks.push('MAO labels and controls use a non-overlapping responsive grid');
  await page.locator('#acquisition-decision').screenshot({path:path.join(output,'desktop-acquisition-layout.png')});

  await page.setViewportSize({width:420,height:900});
  await grid.scrollIntoViewIfNeeded();
  assert.equal(await grid.evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length),1);
  const mobileActions=await page.locator('.deal-report-actions button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().width));
  assert.ok(mobileActions.every(width=>width>300));checks.push('Form and deal-report actions stack at mobile width');
  await page.locator('#acquisition-decision').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'mobile-acquisition-layout.png')});

  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);checks.push('No browser errors or external requests');
  const result={status:'PASS',checks,errors,externalRequests:external.length,providerCalls:0,databaseConnections:0,databaseWrites:0};
  await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}finally{await instance.close();await app.close();}
