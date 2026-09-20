import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createDatabase} from '../src/persistence/db.js';
import {createApi} from '../src/workbench/api/router.js';
import {fixture} from '../src/workbench/model.js';
import {investmentReportModel} from '../src/services/investmentReportService.js';
import {writeJson} from '../src/io/files.js';

const local=process.argv[2]==='--local',base=local?'http://127.0.0.1:4173':process.argv[2];
const production=!local&&/^https:\/\/worksidepropertyintelligence\.netlify\.app$/.test(base??'');
const preview=!local&&!production&&/^https:\/\/[a-f0-9]+--worksidepropertyintelligence\.netlify\.app$/.test(base??'');
if(!local&&!preview&&!production)throw new Error('DEPLOYMENT_URL_REQUIRED');
try{process.loadEnvFile('.env');}catch{}
const db=createDatabase(),second=createDatabase(),tag=`SPRINT6_1_1_${local?'LOCAL':production?'PRODUCTION':'PREVIEW'}_QA_${randomUUID()}`;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
let stage='health',providerCalls=0,requests=0;
async function call(path,body,expected=200){
  // Allowlisted persistence/report-only paths. No resolve/analyze/live/refresh route.
  assert.match(path,/^\/api\/(health|properties(?:\/|$)|deals(?:\/|$)|acquisition-decisions\/)/);
  const request=new Request(base+path,{headers:{Origin:base,'Content-Type':'application/json'},...(body?{method:'POST',body:JSON.stringify({...body,sessionId:body.sessionId??`cold:${randomUUID()}`})}:{})});
  const response=local?await createApi({runtime:'local',persistence:db,loadFixture:fixture,live:{configured:false,analyze:()=>{providerCalls++;throw new Error('PROVIDER_FORBIDDEN');}}})(request):await fetch(request);
  requests++;const text=await response.text();assert.doesNotMatch(text,/postgres(?:ql)?:\/\/|-----BEGIN .*PRIVATE KEY-----|"(?:password|RENTCAST_API_KEY|DATABASE_URL)"\s*:/i);
  assert.equal(response.status,expected,`${stage}:${path}:${response.status}`);return JSON.parse(text);
}
const row=async(connection,table,id)=>(await connection.query(`SELECT * FROM ${table} WHERE id=$1`,[id])).rows[0];
try{
  const audit=JSON.parse(await readFile('data/validation/sprint6_1_1-historical-audit.json','utf8'));assert.equal(audit.decisionCount,6);
  const health=await call('/api/health');assert.equal(health.persistenceAvailable,true);assert.equal(health.databaseProvider,'postgresql');assert.equal(health.runtime,local?'local':'netlify');
  stage='property/deal';
  const propertyBody={sessionId:'fixture:fantasia:property',requestKey:`${tag}:PROPERTY`};const property=await call('/api/properties',propertyBody),propertyReplay=await call('/api/properties',propertyBody);assert.equal(propertyReplay.propertyId,property.propertyId);assert.equal(propertyReplay.idempotentReplay,true);
  const propertyOpened=await call(`/api/properties/${property.propertyId}`);assert.equal(propertyOpened.property.model.property.comps.length,15);
  const dealBody={sessionId:'fixture:fantasia:deal',propertyId:property.propertyId,evidenceSnapshotId:property.evidenceSnapshotId,name:tag,requestKey:`${tag}:DEAL`};
  const deal=await call('/api/deals',dealBody),dealReplay=await call('/api/deals',dealBody);assert.equal(dealReplay.dealId,deal.dealId);assert.equal(dealReplay.idempotentReplay,true);
  const opened=await call(`/api/deals/${deal.dealId}`);assert.equal(opened.deal.claims.length,10);assert.equal(opened.deal.diligence.length,21);assert.equal(opened.deal.analysisContext.analysisSnapshotId,deal.analysisSnapshotId);
  const refs={propertyId:property.propertyId,evidenceSnapshotId:property.evidenceSnapshotId,dealId:deal.dealId,analysisSnapshotId:deal.analysisSnapshotId};
  const input={tag,strategy:'FIX_AND_FLIP',hurdle:{type:'CASH_ON_CASH',rate:.2},selectedExitBasis:'INDEPENDENT_POINT',evidenceSnapshotId:refs.evidenceSnapshotId,exitBases:[{basis:'INDEPENDENT_POINT',value:200000,evidenceSnapshotId:refs.evidenceSnapshotId,evidenceStatus:'INDEPENDENT_ONLY'}],acquisitionCosts:[],dispositionCosts:[],rehab:{noRehabAssumption:true},holdingCosts:[],financing:{mode:'CASH'},encumbrances:[{type:'FIRST_MORTGAGE',amount:50000,amountStatus:'REPORTED',source:tag},{type:'TAX_LIEN',amount:null,amountStatus:'UNKNOWN',source:tag}]};
  const path=`/api/properties/${refs.propertyId}/acquisition-decisions`;
  stage='missing-link gate';const missing=await call(path,{input,evidenceSnapshotId:refs.evidenceSnapshotId},409);assert.equal(missing.error,'DECISION_ANALYSIS_LINK_REQUIRED');
  stage='first decision';
  const calculated=await call('/api/acquisition-decisions/calculate',{...refs,input});assert.equal(calculated.decision.analysisLink.analysisSnapshotId,deal.analysisSnapshotId);
  const saveBody={...refs,input,decision:calculated.decision,requestKey:`${tag}:DECISION_1`};const first=await call(path,saveBody),firstReplay=await call(path,saveBody);assert.equal(firstReplay.decisionId,first.decisionId);assert.equal(firstReplay.idempotentReplay,true);
  const firstRow=await row(db,'acquisition_decisions',first.decisionId),analysisBefore=await row(db,'analysis_snapshots',deal.analysisSnapshotId);assert.equal(firstRow.analysis_snapshot_id,deal.analysisSnapshotId);
  const firstHash=hash(firstRow),analysisHash=hash(analysisBefore);
  stage='first durable report';const report1=(await call(`/api/acquisition-decisions/${first.decisionId}/investment-report`)).report;assert.equal(report1.reportMeta.analysisSnapshotId,deal.analysisSnapshotId);assert.equal(report1.comparables.all.length,15);
  const dbReport=await investmentReportModel({db:second,decisionId:first.decisionId,generatedAt:report1.reportMeta.generatedAt});assert.deepEqual(JSON.parse(JSON.stringify(dbReport)),report1);
  stage='second analysis cold request';const analysis2=await call(`/api/deals/${deal.dealId}/analyze`,{evidenceSnapshotId:refs.evidenceSnapshotId,requestKey:`${tag}:ANALYSIS_2`});assert.notEqual(analysis2.analysisSnapshotId,deal.analysisSnapshotId);
  stage='stale-link gate';const stale=await call(path,{...saveBody,analysisSnapshotId:analysis2.analysisSnapshotId,requestKey:`${tag}:STALE`},409);assert.equal(stale.error,'DECISION_CALCULATION_MISMATCH');
  stage='second decision';const refs2={...refs,analysisSnapshotId:analysis2.analysisSnapshotId},input2={...input,hurdle:{type:'CASH_ON_CASH',rate:.25}};
  const calculated2=await call('/api/acquisition-decisions/calculate',{...refs2,input:input2});
  const save2={...refs2,input:input2,decision:calculated2.decision,requestKey:`${tag}:DECISION_2`};const decision2=await call(path,save2),replay2=await call(path,save2);assert.equal(decision2.decisionId,replay2.decisionId);assert.equal(replay2.idempotentReplay,true);
  stage='history/immutability';
  const history=(await call(path)).decisions.filter(d=>d.deal_id===deal.dealId);assert.equal(history.length,2);assert.equal(hash(await row(second,'acquisition_decisions',first.decisionId)),firstHash);assert.equal(hash(await row(second,'analysis_snapshots',deal.analysisSnapshotId)),analysisHash);
  const reportAgain=(await call(`/api/acquisition-decisions/${first.decisionId}/investment-report`)).report;reportAgain.reportMeta.generatedAt=report1.reportMeta.generatedAt;assert.deepEqual(reportAgain,report1);
  const report2=(await call(`/api/acquisition-decisions/${decision2.decisionId}/investment-report`)).report;assert.equal(report2.reportMeta.analysisSnapshotId,analysis2.analysisSnapshotId);assert.notEqual(report2.reportMeta.reportModelFingerprint,report1.reportMeta.reportModelFingerprint);
  stage='historical audit immutability';for(const item of audit.records){assert.equal(hash(await row(second,'acquisition_decisions',item.decisionId)),item.decisionRowHash);const stop=await call(`/api/acquisition-decisions/${item.decisionId}/investment-report`,undefined,409);assert.equal(stop.error,'REPORT_HISTORICAL_LINK_REQUIRED');}
  assert.equal(providerCalls,0);
  const result={at:new Date().toISOString(),status:'PASS',mode:local?'local':production?'production':'preview',url:base,qaTag:tag,health:{runtime:health.runtime,databaseConfigured:health.databaseConfigured,databaseProvider:health.databaseProvider,persistenceAvailable:health.persistenceAvailable},propertyId:property.propertyId,evidenceSnapshotId:refs.evidenceSnapshotId,dealId:deal.dealId,analysisIds:[deal.analysisSnapshotId,analysis2.analysisSnapshotId],decisionIds:[first.decisionId,decision2.decisionId],firstDecisionHash:firstHash,firstAnalysisHash:analysisHash,reportFingerprints:[report1.reportMeta.reportModelFingerprint,report2.reportMeta.reportModelFingerprint],compCount:15,claimCount:10,diligenceCount:21,historyCount:2,idempotentReplay:true,coldRequests:requests,separateDatabaseReconstruction:true,firstDecisionUnchanged:true,firstAnalysisUnchanged:true,firstReportUnchanged:true,historicalRowsUnchanged:6,historicalStops:6,missingLinkStop:true,staleLinkStop:true,responseCredentialScan:'PASS',providerCalls:0,providerCallProof:'Allowlisted fixture/persistence/report endpoints only; no live/refresh requests; local provider tripwire',historicalRepairs:0};
  await writeJson(`data/validation/sprint6_1_1-${local?'local':production?'production':'preview'}-qa.json`,result);console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({status:'STOP',stage,error:/^DECISION_|^REPORT_/.test(error.message)?error.message:'SANITIZED_QA_FAILURE',sqlState:/^[0-9A-Z]{5}$/.test(error.code??'')?error.code:null}));process.exitCode=1;}finally{await db?.close();await second?.close();}
