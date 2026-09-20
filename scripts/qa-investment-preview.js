import assert from 'node:assert/strict';
import {writeJson} from '../src/io/files.js';
import {createDatabase} from '../src/persistence/db.js';
import {browser} from '../src/reports/pdf.js';

const base=process.argv[2];if(!/^https:\/\/[a-f0-9]+--worksidepropertyintelligence\.netlify\.app$/.test(base??''))throw new Error('DEPLOY_PREVIEW_REQUIRED');
const call=async(path,body)=>{const r=await fetch(base+path,{headers:{Origin:base,'Content-Type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
const health=await call('/api/health');assert.equal(health.body.runtime,'netlify');assert.equal(health.body.persistenceAvailable,true);
const capability=await call('/api/reports/investment/capability');assert.equal(capability.body.available,false);assert.equal(capability.body.modelAvailable,true);
try{process.loadEnvFile('.env');}catch{}
const db=createDatabase();let decisionId;
try{decisionId=(await db.query('SELECT id FROM acquisition_decisions WHERE analysis_snapshot_id IS NULL ORDER BY created_at DESC LIMIT 1')).rows[0]?.id;}finally{await db.close();}
assert.ok(decisionId,'An existing historical-link STOP record is required');
const historical=await call(`/api/acquisition-decisions/${decisionId}/investment-report`);assert.equal(historical.status,409);assert.equal(historical.body.error,'REPORT_HISTORICAL_LINK_REQUIRED');
const binary=await call('/api/reports/investment',{decisionId});assert.equal(binary.status,409);assert.equal(binary.body.error,'REPORT_HISTORICAL_LINK_REQUIRED');
const payload=await call('/api/reports/investment',{decisionId,analysis:{profit:999}});assert.equal(payload.status,400);assert.equal(payload.body.error,'REPORT_IDS_ONLY');
const invalid=await call('/api/reports/investment',{decisionId:'invalid'});assert.equal(invalid.status,400);
const instance=await browser();let providerRequests=0;
try{const page=await instance.newPage();await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base))return route.continue();if(/rentcast/i.test(url))providerRequests++;return route.abort();});await page.goto(base);await page.getByRole('button',{name:'Load selected fixture'}).count().catch(()=>0);
  // Verify compiled UI includes the report control and explicit capability copy without invoking providers.
  const html=await (await fetch(base)).text(),scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);let reportControl=false;for(const path of scripts){const js=await(await fetch(new URL(path,base))).text();assert.doesNotMatch(js,/DATABASE_URL|RENTCAST_API_KEY|postgres(?:ql)?:\/\/|HomeAdvisor|BEGIN .*PRIVATE KEY/);reportControl ||= js.includes('Full Investment Analysis PDF');}assert.ok(reportControl);assert.equal(providerRequests,0);
  await page.screenshot({path:'data/validation/sprint6_1-preview.png',fullPage:true});
}finally{await instance.close();}
await writeJson('data/validation/sprint6_1-preview.json',{at:new Date().toISOString(),status:'PASS_WITH_DOCUMENTED_RUNTIME_AND_HISTORICAL_LIMITS',url:base,health:health.body,capability:capability.body,decisionId,historicalLinkGate:historical.body.error,idsOnlyGate:payload.body.error,invalidIdGate:invalid.status,browserScan:'PASS',providerCalls:0,remotePdfFixtures:'Not run: current Netlify runtime has no PDF browser; complete/sparse/long API PDFs certified locally.'});
console.log(JSON.stringify({status:'PASS',url:base,health:true,capability:false,historicalLinkStop:true,idsOnly:true,providerCalls:0}));
