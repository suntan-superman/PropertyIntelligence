import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {browser} from '../src/reports/pdf.js';
import {writeJson} from '../src/io/files.js';
const base=process.argv[2],production=/^https:\/\/worksidepropertyintelligence\.netlify\.app$/.test(base??''),preview=/^https:\/\/[a-f0-9]+--worksidepropertyintelligence\.netlify\.app$/.test(base??'');
if(!production&&!preview)throw new Error('DEPLOYMENT_URL_REQUIRED');
const qa=JSON.parse(await readFile(`data/validation/sprint6_1_1-${production?'production':'preview'}-qa.json`,'utf8'));
const instance=await browser();let providerRequests=0,capturedSave=false,errors=0;
try{
  const page=await instance.newPage({viewport:{width:1366,height:950}});page.on('pageerror',()=>errors++);
  await page.route('**/*',route=>{
    const req=route.request(),url=req.url();
    if(!url.startsWith(base)){if(/rentcast/i.test(url))providerRequests++;return route.abort();}
    if(req.method()==='POST'&&/\/api\/properties\/[^/]+\/acquisition-decisions$/.test(url)){
      const body=req.postDataJSON();assert.equal(body.dealId,qa.dealId);assert.equal(body.analysisSnapshotId,qa.analysisIds[1]);assert.equal(body.evidenceSnapshotId,qa.evidenceSnapshotId);assert.equal(body.decision.analysisLink.analysisSnapshotId,qa.analysisIds[1]);capturedSave=true;
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({decisionId:'UI-NO-WRITE',analysisSnapshotId:qa.analysisIds[1]})});
    }
    return route.continue();
  });
  await page.goto(base);
  await page.locator('#saved-deals li').filter({hasText:qa.qaTag}).getByRole('button',{name:'Open Deal',exact:true}).click();
  const panel=page.locator('#acquisition-decision');await panel.getByText(`Deal economics snapshot: ${qa.analysisIds[1]}`).waitFor();
  assert.equal(await panel.getByRole('button',{name:'Save Decision',exact:true}).isDisabled(),true);
  await panel.getByRole('button',{name:'Calculate MAO',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#acquisition-decision .button-row button:last-child').disabled);
  await panel.getByRole('button',{name:'Save Decision',exact:true}).click();await panel.getByText(/Saved decision UI-NO-WRITE/).waitFor();assert.equal(capturedSave,true);
  await panel.getByRole('spinbutton',{name:'Hurdle %'}).fill('23');assert.equal(await panel.getByRole('button',{name:'Save Decision',exact:true}).isDisabled(),true);
  for(const width of [1366,390]){await page.setViewportSize({width,height:950});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`data/validation/sprint6_1_1-linkage-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}
  assert.equal(providerRequests,0);assert.equal(errors,0);
  const result={at:new Date().toISOString(),status:'PASS',mode:production?'production':'preview',url:base,exactDisplayedAnalysisContext:true,saveBodyBoundToCalculation:true,staleAssumptionsDisableSave:true,desktopAndNarrow:true,saveWasIntercepted:true,additionalPersistenceWrites:0,providerCalls:0,browserErrors:0};await writeJson(`data/validation/sprint6_1_1-${production?'production':'preview'}-ui.json`,result);console.log(JSON.stringify(result));
}catch{console.log(JSON.stringify({status:'STOP',error:'SANITIZED_BROWSER_QA_FAILURE',providerRequests,errors}));process.exitCode=1;}finally{await instance.close();}
