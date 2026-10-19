import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {startInvestmentWorkspace} from '../src/investment-workspace/server.js';
import {signLeadRequest,createLeadRateLimiter,verifyLeadRequest} from '../src/leads/authentication.js';
import {LEAD_CONTRACT_VERSION,validateLeadEnvelope} from '../src/leads/contract.js';
import {loadEvidence} from '../src/investment-workspace/evidence.js';
import {addPropertyDetails} from '../src/investment-workspace/property-detail.js';
import {workspaceReportHtml} from '../src/investment-workspace/reports.js';
import {reportScenario} from './fixtures/workspaceReports.js';

const root=process.cwd(),secret='offline-milestone2-test-secret-value-32-bytes';
const envelope=()=>({contractVersion:LEAD_CONTRACT_VERSION,source:'sellmykernhome.com',externalLeadId:'3a46f58d-2b45-45d6-bf32-5f6e34614117',submittedAt:new Date().toISOString(),origin:{site:'sellmykernhome.com',form:'seller_inquiry',landingPath:'/'},address:{line1:'1708 Crestview Drive',city:'Bakersfield',state:'CA',postalCode:'93305'},contact:{name:'Private QA Seller',preferred:'email',email:'qa@example.invalid',phone:''},consent:{privacyAcknowledged:true,privacyVersion:'2026-10-14-draft',marketingConsent:false,capturedAt:new Date().toISOString()},sellerStatements:{propertyType:'Single-family home',condition:'Minor updates needed',occupancy:'Owner occupied',desiredTiming:'Exploring options',comments:'Offline fixture only.'},photoReferences:[{reference:'private-photo-ref-1',url:'https://private.example.invalid/photo/1',mediaType:'image/jpeg'}]});

test('lead contract rejects malformed content and binary/photo ambiguity',()=>{
  const valid=validateLeadEnvelope(envelope());assert.equal(valid.valid,true);
  const bad=envelope();bad.address.state='NV';bad.photoReferences=[{reference:'x',url:'data:image/png;base64,AAAA'}];const result=validateLeadEnvelope(bad);
  assert.equal(result.valid,false);assert.ok(result.errors.address);assert.ok(result.errors.photoReferences);
});

test('request authentication is exact, expiring and tamper-evident',()=>{
  const body=JSON.stringify(envelope()),timestamp=new Date().toISOString(),signature=signLeadRequest(secret,timestamp,body);
  assert.equal(verifyLeadRequest({secret,timestamp,signature,body}).ok,true);
  assert.equal(verifyLeadRequest({secret,timestamp,signature,body:`${body} `}).ok,false);
  assert.equal(verifyLeadRequest({secret,timestamp:new Date(Date.now()-10*60_000).toISOString(),signature,body}).reason,'STALE_TIMESTAMP');
});

test('rate limiter defaults deny after its bounded allowance',()=>{const limit=createLeadRateLimiter({limit:2,windowMs:60_000});assert.equal(limit('site').allowed,true);assert.equal(limit('site').allowed,true);assert.equal(limit('site').allowed,false);});

test('mocked website lead flows through authenticated intake, idempotency, address research, scenario and PDF',async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'pi-m2-')),leadDirectory=path.join(base,'leads'),scenarioDirectory=path.join(base,'scenarios'),discoveryDirectory=path.join(base,'discovery');
  const app=await startInvestmentWorkspace({port:0,root,leadStoreDirectory:leadDirectory,storeDirectory:scenarioDirectory,discoveryStoreDirectory:discoveryDirectory,leadIntakeSecret:secret,propertyDetail:true,viteEnabled:false});
  const body=JSON.stringify(envelope()),timestamp=new Date().toISOString(),signedHeaders={'Content-Type':'application/json','X-PI-Lead-Source':'sellmykernhome.com','X-PI-Timestamp':timestamp,'X-PI-Signature':signLeadRequest(secret,timestamp,body)};
  try{
    const unauthorized=await fetch(`${app.origin}/api/lead-intake/v1`,{method:'POST',headers:{'Content-Type':'application/json','X-PI-Lead-Source':'sellmykernhome.com','X-PI-Timestamp':timestamp},body});assert.equal(unauthorized.status,403);
    const started=performance.now(),accepted=await fetch(`${app.origin}/api/lead-intake/v1`,{method:'POST',headers:signedHeaders,body}),created=await accepted.json();assert.equal(accepted.status,201);assert.equal(created.duplicate,false);
    const retry=await fetch(`${app.origin}/api/lead-intake/v1`,{method:'POST',headers:signedHeaders,body}),retried=await retry.json();assert.equal(retry.status,200);assert.equal(retried.id,created.id);assert.equal(retried.duplicate,true);assert.equal(retried.duplicateReviewRequired,true);
    const queue=await (await fetch(`${app.origin}/api/incoming-leads`)).json();assert.equal(queue.records.length,1);assert.equal(queue.records[0].state,'NEW');
    const localHeaders={'Content-Type':'application/json','X-PI-Workspace':'local-v1',Origin:app.origin};
    const reviewed=await (await fetch(`${app.origin}/api/incoming-leads/action`,{method:'POST',headers:localHeaders,body:JSON.stringify({id:created.id,action:'REVIEW'})})).json();assert.equal(reviewed.state,'NEEDS_REVIEW');
    const researched=await (await fetch(`${app.origin}/api/incoming-leads/action`,{method:'POST',headers:localHeaders,body:JSON.stringify({id:created.id,action:'RESEARCH_ADDRESS'})})).json();assert.equal(researched.state,'IN_RESEARCH');assert.equal(researched.research.status,'MATCH');assert.equal(researched.research.matches[0].ref,'GABE-01');assert.equal(researched.research.providerCalls,0);
    const evidence=await addPropertyDetails(await loadEvidence(root),root),draft={...reportScenario(evidence,0),revision:0,id:'7b875f61-edc2-4f2b-8224-47037cdf1b44',name:'Incoming lead offline demonstration'};
    const savedResponse=await fetch(`${app.origin}/api/investment/save`,{method:'POST',headers:localHeaders,body:JSON.stringify(draft)}),saved=await savedResponse.json();assert.equal(savedResponse.status,200);assert.ok(saved.analysis);
    const reportResponse=await fetch(`${app.origin}/api/investment/report`,{method:'POST',headers:localHeaders,body:JSON.stringify({id:saved.id,revision:saved.revision,kind:'brief',pdf:true})}),pdf=await reportResponse.arrayBuffer();assert.equal(reportResponse.status,200);assert.ok(pdf.byteLength>20_000);
    assert.ok(performance.now()-started<2*60_000,'Offline fixture workflow should complete within two minutes.');
    assert.doesNotMatch(JSON.stringify(created),/Private QA Seller|qa@example/);assert.equal((await readFile(path.join(leadDirectory,'idempotency-index.json'),'utf8')).includes('qa@example'),false);
  }finally{await app.close();}
});

test('Crestview report fixes preserve values while correcting labels and adding explanation',async()=>{
  const evidence=await addPropertyDetails(await loadEvidence(root),root),property=evidence.properties.find(item=>item.ref==='GABE-01'),scenario=JSON.parse(await readFile(path.join(root,'data/runtime/investment-workspace-v1/scenarios/0f75719a-293b-4b29-bace-d3c5b71a4b20.r1.json'),'utf8')),html=workspaceReportHtml(property,scenario,evidence,'full');
  assert.doesNotMatch(html,/Scenario Scenario 1/);assert.match(html,/>Scenario 1 · r1</);assert.match(html,/Understanding the Monte Carlo Analysis/);assert.match(html,/not the probability of actual investment performance/);
  assert.match(html,/Entered original mortgage amount/);assert.match(html,/recorded-document status is not established/);assert.doesNotMatch(html,/Recorded original principal/);
  assert.match(html,/Seller-reported estimated balance/);assert.match(html,/not a lender-confirmed payoff/i);assert.match(html,/Executive investment synthesis/);assert.match(html,/no comparable sales selected/i);
});
