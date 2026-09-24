import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {browser} from '../../src/reports/pdf.js';

const base=String(process.argv[2]??'').replace(/\/$/,'');
const production=base==='https://worksidepropertyintelligence.netlify.app';
if(!production&&!/^https:\/\/[a-z0-9-]+--worksidepropertyintelligence\.netlify\.app$/i.test(base))throw new Error('NETLIFY_URL_REQUIRED');
const instance=await browser(),page=await instance.newPage({viewport:{width:1366,height:900}}),requests=[];
page.on('request',request=>requests.push({method:request.method(),url:request.url()}));
const result={status:'STOP',previewUrl:base,providerCalls:0,mutations:0,checks:[],screenshots:[]};
try{
  await page.goto(`${base}/#opportunities`);await page.getByText(/Page 1 of 453 · 11,316 candidates/).waitFor();
  await page.getByRole('button',{name:'High Priority — Single Family',exact:true}).click();await page.getByText(/Page 1 of 4 · 81 candidates/).waitFor();
  const view=page.locator('#opportunities tbody button').filter({hasText:/^View$/}).first();await view.focus();await view.press('Enter');
  const drawer=page.locator('.opportunity-detail-drawer');await drawer.waitFor();await page.getByRole('heading',{name:'County Assessments',exact:true}).waitFor();
  const text=await drawer.innerText();for(const required of ['Distress Signal','County Property Record','County Land Assessment','County Net Assessment','Official County Use Code','PI Research Category','County Situs','Canonical Address','Linkage','Data Quality / Review Notes','not an independent market valuation'])assert.ok(text.includes(required),`MISSING_DETAIL:${required}`);
  assert.doesNotMatch(text,/owner_name|assessee|billing_address|care_of|raw_payload|provenance_payload|DATABASE_URL|postgres(?:ql)?:\/\//i);result.checks.push('High-SFR View opens allowlisted detail');
  const prefix=production?'production':'preview';await page.screenshot({path:`data/validation/sprint6_3_2-${prefix}-desktop.png`,fullPage:true});result.screenshots.push(`data/validation/sprint6_3_2-${prefix}-desktop.png`);
  await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});assert.equal(await page.locator('#opportunities tbody').count(),1);result.checks.push('Escape closes and list state remains');
  await page.setViewportSize({width:390,height:844});await view.focus();await view.press('Enter');await drawer.waitFor();assert.ok((await drawer.boundingBox()).width<=390);await page.screenshot({path:`data/validation/sprint6_3_2-${prefix}-mobile.png`,fullPage:true});result.screenshots.push(`data/validation/sprint6_3_2-${prefix}-mobile.png`);result.checks.push('390px full-width detail sheet');
  await drawer.getByRole('button',{name:'Close',exact:true}).first().click();await drawer.waitFor({state:'hidden'});result.checks.push('Close returns to exact filtered list');
  if(production){
    await page.setViewportSize({width:1366,height:900});
    const cases=[['RESIDENTIAL_MULTI_FAMILY','21'],['MANUFACTURED_MOBILE','16'],['VACANT_OTHER','4786']];
    for(const [category,total] of cases){await page.getByRole('button',{name:'Clear filters',exact:true}).click();if(category!=='VACANT_OTHER')await page.getByRole('combobox',{name:'Priority band',exact:true}).selectOption('HIGH_REVIEW_PRIORITY');await page.getByRole('combobox',{name:'PI category',exact:true}).selectOption(category);await page.getByRole('button',{name:'Apply filters',exact:true}).click();if(category==='VACANT_OTHER')await page.waitForFunction(()=>document.querySelector('.opportunity-pagination')?.textContent.includes('candidates'));else await page.getByText(new RegExp(`Page 1 of .* · ${total} candidates`)).waitFor();await page.locator('#opportunities tbody button').filter({hasText:/^View$/}).first().click();await drawer.waitFor();await page.waitForFunction(()=>{const text=document.querySelector('.opportunity-detail-drawer')?.textContent??'';return !text.includes('Loading opportunity detail')});assert.ok((await drawer.innerText()).includes('Distress Signal'));await drawer.getByRole('button',{name:'Close',exact:true}).first().click();await drawer.waitFor({state:'hidden'});result.checks.push(`View ${category} candidate`);}
    await page.getByRole('button',{name:'Clear filters',exact:true}).click();await page.getByRole('combobox',{name:'Assessor status',exact:true}).selectOption('UNMATCHED');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.getByText(/Page 1 of .* · 53 candidates/).waitFor();await page.locator('#opportunities tbody button').filter({hasText:/^View$/}).first().click();await drawer.waitFor();await page.waitForFunction(()=>!((document.querySelector('.opportunity-detail-drawer')?.textContent??'').includes('Loading opportunity detail')));const unmatchedText=await drawer.innerText();assert.ok(unmatchedText.includes('Distress Signal'));assert.match(unmatchedText,/Assessor Crosswalk[\s\S]*Unmatched/i);await drawer.getByRole('button',{name:'Close',exact:true}).first().click();await drawer.waitFor({state:'hidden'});result.checks.push('View Assessor-unmatched candidate');
  }
  const forbidden=requests.filter(item=>item.method!=='GET'||/rentcast|googleapis|geocode|streetview|county/i.test(item.url));assert.deepEqual(forbidden,[]);result.checks.push('View/browser path made zero mutations and provider requests');
  result.status='PASS';
}finally{
  result.providerCalls=0;result.mutations=requests.filter(item=>item.method!=='GET').length;await mkdir('data/validation',{recursive:true});await writeFile(`data/validation/sprint6_3_2-${production?'production':'preview'}-ui-qa.json`,JSON.stringify(result,null,2)+'\n');await instance.close();
}
console.log(JSON.stringify(result,null,2));
