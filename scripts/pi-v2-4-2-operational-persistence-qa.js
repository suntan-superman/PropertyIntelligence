import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {applicationDefault,getApps,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

const ROOT=path.resolve(import.meta.dirname,'..');
process.chdir(ROOT);
process.loadEnvFile(path.join(ROOT,'.env'));

const EXPECTED={
  origin:process.env.PI_OPERATIONAL_QA_ORIGIN??'http://127.0.0.1:4173',
  projectId:'property-intelligence-8238b',
  organizationId:'property-intelligence-local',
  propertyId:'52638a00-8167-4cff-85c0-f56a0445a5a9',
  address:'400 Decatur St, Bakersfield, CA 93308',
  scenarioId:'2908abf4-03a2-4d3c-931f-f61b5e9900c2',
  evidenceSnapshotId:'3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71'
};
const COLLECTIONS=['properties','propertyKeys','evidenceSnapshots','scenarioRevisions','reportRevisions','supportingDocuments','documentHashes','documentAudits','versions'];
const OUTPUT=path.join(ROOT,'data/validation/pi-v2-4-2-operational-persistence');
const canonical=value=>{
  if(value===null||typeof value!=='object')return value;
  if(typeof value.toDate==='function')return value.toDate().toISOString();
  if(Array.isArray(value))return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
};
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

async function firestoreState(db){
  const state={};
  for(const name of COLLECTIONS){
    const snapshot=await db.collectionGroup(name).get();
    state[name]=snapshot.docs.map(document=>({path:document.ref.path,createTime:document.createTime?.toDate().toISOString()??null,updateTime:document.updateTime?.toDate().toISOString()??null,digest:digest(document.data())})).sort((a,b)=>a.path.localeCompare(b.path));
  }
  return state;
}

async function signIn(page){
  await page.waitForSelector('.auth-card input[type=email]');
  await page.$eval('.auth-card input[type=email]',input=>{input.value='';});
  await page.type('.auth-card input[type=email]',process.env.ADMIN_EMAIL);
  await page.type('.auth-card input[type=password]',process.env.ADMIN_PW);
  await page.evaluate(()=>[...document.querySelectorAll('.auth-card button')].find(button=>button.textContent.trim()==='Sign in')?.click());
  await page.waitForSelector('.authenticated-user',{timeout:20_000});
}

async function main(){
  assert.equal(process.version,'v22.12.0','Operational QA must run on Node 22.12.0');
  for(const name of ['ADMIN_EMAIL','ADMIN_PW','GOOGLE_APPLICATION_CREDENTIALS'])assert.ok(process.env[name],`${name} is required`);
  await mkdir(OUTPUT,{recursive:true});
  const app=getApps().find(item=>item.name==='pi-v2-4-2-read-only')??initializeApp({credential:applicationDefault(),projectId:EXPECTED.projectId},'pi-v2-4-2-read-only'),db=getFirestore(app),before=await firestoreState(db);
  const browser=await puppeteer.launch({headless:true,pipe:true,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']}),page=await browser.newPage(),providerRequests=[];
  await page.setViewport({width:1440,height:1000});
  page.on('request',request=>{if(/api\.rentcast\.io/i.test(request.url()))providerRequests.push(request.url());});
  try{
    await page.goto(`${EXPECTED.origin}/#my-workspace`,{waitUntil:'networkidle0'});
    await signIn(page);
    await page.waitForFunction(()=>document.body.innerText.includes('My Workspace')&&!document.body.innerText.includes('Loading saved work'),{timeout:20_000});
    const workspaceText=await page.evaluate(()=>document.body.innerText);
    await page.screenshot({path:path.join(OUTPUT,'00-live-workspace-diagnostic.png'),fullPage:true});
    assert.match(workspaceText,new RegExp(EXPECTED.address.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    assert.match(workspaceText,new RegExp(EXPECTED.propertyId));
    assert.match(workspaceText,/Saved Property/);
    await page.screenshot({path:path.join(OUTPUT,'01-live-authenticated-saved-property.png'),fullPage:true});

    await page.evaluate(()=>[...document.querySelectorAll('.workspace-controls button')].find(button=>button.textContent.trim()==='Analyses / Deals')?.click());
    await page.waitForFunction((address,scenarioId)=>document.body.innerText.includes(address)&&document.querySelector(`a[href*="${scenarioId}"]`),{timeout:10_000},EXPECTED.address,EXPECTED.scenarioId);
    const analysisText=await page.evaluate(()=>document.body.innerText);
    assert.match(analysisText,/Scenario 1 · revision 1/);
    assert.match(analysisText,/Saved/);
    await page.screenshot({path:path.join(OUTPUT,'02-live-linked-analysis.png'),fullPage:true});

    await page.click('.authenticated-user button');
    await page.waitForSelector('.auth-card');
    await signIn(page);
    await page.waitForFunction(()=>document.body.innerText.includes('My Workspace')&&!document.body.innerText.includes('Loading saved work'),{timeout:20_000});
    assert.match(await page.evaluate(()=>document.body.innerText),new RegExp(EXPECTED.address.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    await page.screenshot({path:path.join(OUTPUT,'03-live-cross-session-restoration.png'),fullPage:true});
  }finally{
    await browser.close();
  }
  const after=await firestoreState(db);
  assert.deepEqual(after,before,'Read-only operational QA changed Firestore state');
  assert.equal(providerRequests.length,0,'Operational persistence QA must not call a provider');
  const decatur=before.properties.find(item=>item.path===`organizations/${EXPECTED.organizationId}/properties/${EXPECTED.propertyId}`);
  const scenario=before.scenarioRevisions.find(item=>item.path===`organizations/${EXPECTED.organizationId}/properties/${EXPECTED.propertyId}/scenarioRevisions/${EXPECTED.scenarioId}--r1`);
  const evidence=before.evidenceSnapshots.find(item=>item.path.startsWith(`organizations/${EXPECTED.organizationId}/properties/${EXPECTED.propertyId}/evidenceSnapshots/`));
  assert.ok(decatur&&scenario&&evidence,'Certified Decatur property linkage is incomplete');
  const result={status:'PASS',node:process.version,projectId:EXPECTED.projectId,organizationId:EXPECTED.organizationId,propertyId:EXPECTED.propertyId,address:EXPECTED.address,scenarioId:EXPECTED.scenarioId,evidenceSnapshotId:EXPECTED.evidenceSnapshotId,firestoreWrites:0,providerRequests:0,crossSessionRestoration:true,firestoreStateUnchanged:true,screenshots:['01-live-authenticated-saved-property.png','02-live-linked-analysis.png','03-live-cross-session-restoration.png']};
  await writeFile(path.join(OUTPUT,'qa-results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}

await main();
