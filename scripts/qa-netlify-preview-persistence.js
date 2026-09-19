import assert from 'node:assert/strict';
import {writeJson} from '../src/io/files.js';

const base=String(process.argv[2]??'').replace(/\/$/,'');
if(!/^https:\/\/(?:[a-z0-9-]+--)?worksidepropertyintelligence\.netlify\.app$/i.test(base))throw new Error('A Netlify deployment URL is required.');
const tag=String(process.argv[3]??'SPRINT4_1_PREVIEW_QA');
async function call(path,options={}){
  const response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',Origin:base,...(options.headers??{})}});
  const text=await response.text();let body;try{body=JSON.parse(text);}catch{throw new Error(`NON_JSON_RESPONSE:${path}`);}
  assert.ok(response.ok,`${path} returned ${response.status}:${body.error??'unknown'}`);return body;
}
const health=await call('/api/health',{headers:{'Content-Type':'application/json'}});
assert.equal(health.runtime,'netlify');assert.equal(health.databaseConfigured,true);assert.equal(health.databaseProvider,'postgresql');assert.equal(health.persistenceAvailable,true);assert.equal(health.databaseError,undefined);
const propertyRequest={sessionId:'fixture:fantasia:property',requestKey:`${tag}:SAVE_PROPERTY`};
const saved=await call('/api/properties',{method:'POST',body:JSON.stringify(propertyRequest)});assert.ok(saved.propertyId);assert.ok(saved.evidenceSnapshotId);
const replay=await call('/api/properties',{method:'POST',body:JSON.stringify(propertyRequest)});assert.equal(replay.propertyId,saved.propertyId);assert.equal(replay.idempotentReplay,true);
const reopenedProperty=await call(`/api/properties/${saved.propertyId}`);assert.equal(reopenedProperty.property.id,saved.propertyId);assert.ok(reopenedProperty.property.model);assert.equal(reopenedProperty.property.model.property.comps.length,15);
const evidence=await call(`/api/properties/${saved.propertyId}/evidence`);assert.ok(evidence.evidence.length>=1);assert.ok(evidence.evidence.some(row=>Number(row.comp_count)===15));
const dealName=`${tag} Deal`;const dealRequest={sessionId:'fixture:fantasia:deal',propertyId:saved.propertyId,evidenceSnapshotId:saved.evidenceSnapshotId,name:dealName,requestKey:`${tag}:SAVE_DEAL`};
const savedDeal=await call('/api/deals',{method:'POST',body:JSON.stringify(dealRequest)});assert.ok(savedDeal.dealId);assert.ok(savedDeal.analysisSnapshotId);assert.ok(savedDeal.claimCount>0);
const dealReplay=await call('/api/deals',{method:'POST',body:JSON.stringify(dealRequest)});assert.equal(dealReplay.dealId,savedDeal.dealId);assert.equal(dealReplay.idempotentReplay,true);
const reopenedDeal=await call(`/api/deals/${savedDeal.dealId}`);assert.equal(reopenedDeal.deal.id,savedDeal.dealId);assert.ok(reopenedDeal.deal.claims.length>0);assert.ok(reopenedDeal.deal.diligence.length>0);assert.ok(reopenedDeal.deal.analysisHistory.length>=1);assert.ok(reopenedDeal.deal.model);
const analysesBefore=await call(`/api/deals/${savedDeal.dealId}/analyses`);assert.ok(analysesBefore.analyses.length>=1);const firstAnalysis=JSON.stringify(analysesBefore.analyses.find(row=>row.id===savedDeal.analysisSnapshotId));
// Deliberately use a session key that cannot be reconstructed by the fixture loader.
// This proves re-analysis rehydrates the saved Deal from durable Property + Evidence + Claims.
const analysisRequest={sessionId:`cold-reanalysis:${savedDeal.dealId}`,evidenceSnapshotId:saved.evidenceSnapshotId,requestKey:`${tag}:REANALYZE`};const secondAnalysis=await call(`/api/deals/${savedDeal.dealId}/analyze`,{method:'POST',body:JSON.stringify(analysisRequest)});assert.ok(secondAnalysis.analysisSnapshotId);assert.notEqual(secondAnalysis.analysisSnapshotId,savedDeal.analysisSnapshotId);const analysisReplay=await call(`/api/deals/${savedDeal.dealId}/analyze`,{method:'POST',body:JSON.stringify(analysisRequest)});assert.equal(analysisReplay.analysisSnapshotId,secondAnalysis.analysisSnapshotId);assert.equal(analysisReplay.idempotentReplay,true);
const analyses=await call(`/api/deals/${savedDeal.dealId}/analyses`);assert.equal(analyses.analyses.length,analysesBefore.analyses.length+(secondAnalysis.idempotentReplay?0:1));assert.ok(analyses.analyses.length>=2);assert.equal(JSON.stringify(analyses.analyses.find(row=>row.id===savedDeal.analysisSnapshotId)),firstAnalysis);
const listed=await call(`/api/deals?search=${encodeURIComponent(tag)}&includeArchived=true`);assert.equal(listed.deals.filter(row=>row.id===savedDeal.dealId).length,1);
const root=await fetch(base);const html=await root.text();assert.equal(root.ok,true);assert.doesNotMatch(html,/DATABASE_URL|NETLIFY_DB_URL|RENTCAST_API_KEY|postgres(?:ql)?:\/\//i);const assets=[...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(match=>match[1]);for(const asset of assets){const js=await (await fetch(new URL(asset,base))).text();assert.doesNotMatch(js,/DATABASE_URL|NETLIFY_DB_URL|RENTCAST_API_KEY|postgres(?:ql)?:\/\/|@netlify\/database/i);}
const report={at:new Date().toISOString(),status:'PASS',deploymentUrl:base,health:{runtime:health.runtime,databaseConfigured:health.databaseConfigured,databaseProvider:health.databaseProvider,persistenceAvailable:health.persistenceAvailable},qaTag:tag,property:{propertyId:saved.propertyId,reopened:true,evidenceSnapshotId:saved.evidenceSnapshotId,evidenceSnapshots:evidence.evidence.length,retainedComps:reopenedProperty.property.model.property.comps.length,idempotentReplay:replay.idempotentReplay},deal:{dealId:savedDeal.dealId,reopened:true,claims:reopenedDeal.deal.claims.length,diligence:reopenedDeal.deal.diligence.length,analysisSnapshotIds:analyses.analyses.map(row=>row.id),analysisSnapshots:analyses.analyses.length,firstAnalysisUnchanged:true,idempotentReplay:dealReplay.idempotentReplay,analysisReplay:analysisReplay.idempotentReplay,listedMatches:listed.deals.filter(row=>row.id===savedDeal.dealId).length},browserSecretScan:{assetsScanned:assets.length,status:'PASS'},rentcastCalls:0};
await writeJson('data/validation/sprint4-1-netlify-preview-persistence.json',report);console.log(JSON.stringify(report,null,2));
