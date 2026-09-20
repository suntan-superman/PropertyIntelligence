import assert from 'node:assert/strict';
import {writeJson} from '../src/io/files.js';

const base=String(process.argv[2]??'https://worksidepropertyintelligence.netlify.app').replace(/\/$/,'');
const tag=String(process.argv[3]??`SPRINT6_PRODUCTION_QA_${Date.now()}`);
if(!/^https:\/\/(?:[a-z0-9-]+--)?worksidepropertyintelligence\.netlify\.app$/i.test(base))throw new Error('A production Netlify URL is required.');
async function json(path,options={}){const response=await fetch(`${base}${path}`,{cache:'no-store',...options,headers:{'Content-Type':'application/json',Origin:base,...(options.headers??{})}});const text=await response.text();let body;try{body=JSON.parse(text);}catch{throw new Error(`NON_JSON:${path}`);}return {response,body};}

const health=(await json('/api/health')).body;
assert.equal(health.runtime,'netlify');
assert.equal(health.databaseConfigured,true);
assert.equal(health.databaseProvider,'postgresql');
assert.equal(health.persistenceAvailable,true);

const listResult=await json('/api/opportunities?page=1&pageSize=25&sort=priority');
assert.equal(listResult.response.status,200);
assert.equal(listResult.body.total,11316);
assert.equal(listResult.body.opportunities.length,25);
assert.ok(listResult.body.metrics);
const metrics=listResult.body.metrics;
assert.equal(metrics.source_file_hash,'89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3');
assert.equal(Number(metrics.record_count),11321);
assert.equal(Number(metrics.counts.records),11321);
assert.equal(Number(metrics.counts.candidates),11316);
assert.equal(Number(metrics.counts.needs_address),11316);
assert.equal(Number(metrics.counts.ready_for_enrichment),0);
assert.equal(Number(metrics.counts.enriched),0);
assert.equal(Number(metrics.counts.deal_created),0);

async function filteredTotal(priorityBand){const result=await json(`/api/opportunities?page=1&pageSize=1&priorityBand=${priorityBand}`);assert.equal(result.response.status,200);assert.ok(result.body.opportunities.length<=1);return Number(result.body.total);}
const priorityDistribution={HIGH_REVIEW_PRIORITY:await filteredTotal('HIGH_REVIEW_PRIORITY'),MEDIUM_REVIEW_PRIORITY:await filteredTotal('MEDIUM_REVIEW_PRIORITY'),LOW_REVIEW_PRIORITY:await filteredTotal('LOW_REVIEW_PRIORITY')};
assert.deepEqual(priorityDistribution,{HIGH_REVIEW_PRIORITY:312,MEDIUM_REVIEW_PRIORITY:701,LOW_REVIEW_PRIORITY:10303});

const defaultPage=await json('/api/opportunities');
assert.ok(defaultPage.body.opportunities.length<11316);
const cappedPage=await json('/api/opportunities?page=1&pageSize=500');
assert.ok(cappedPage.body.opportunities.length<=100);
const candidate=listResult.body.opportunities[0];
assert.ok(candidate?.id);

// Separate HTTP invocation with cache-busting; the function must reconstruct durable detail state.
const detailResult=await json(`/api/opportunities/${candidate.id}?cold=${encodeURIComponent(tag)}`);
assert.equal(detailResult.response.status,200);
const detail=detailResult.body.opportunity;
assert.equal(detail.id,candidate.id);
assert.ok(detail.records.length>=1);
assert.ok(detail.signals.length>=2);
assert.ok(detail.records.every(row=>row.source_file_hash===metrics.source_file_hash));
assert.equal(detail.candidate_status,'NEEDS_ADDRESS');
assert.equal(detail.signals.some(signal=>signal.signal_type==='OWNER_NAME'),false);
assert.equal(detail.signals.some(signal=>/equity|mortgage|lien|condition|motivation/i.test(`${signal.signal_type} ${signal.text_value??''}`)),false);
const serialized=JSON.stringify(detail);
assert.doesNotMatch(serialized,/equity|mortgage|lien|condition|seller.?motivation/i);

const reviewBody={action:'REVIEW',notes:tag,requestKey:`${tag}:REVIEW`};
const reviewed=await json(`/api/opportunities/${candidate.id}/review`,{method:'POST',body:JSON.stringify(reviewBody)});
assert.equal(reviewed.response.status,200);
const replay=await json(`/api/opportunities/${candidate.id}/review`,{method:'POST',body:JSON.stringify(reviewBody)});
assert.equal(replay.response.status,200);
assert.equal(replay.body.idempotentReplay,true);
assert.equal(replay.body.review.id,reviewed.body.review.id);
const restored=await json(`/api/opportunities/${candidate.id}/review`,{method:'POST',body:JSON.stringify({action:'RESTORE',status:'NEEDS_ADDRESS',notes:tag,requestKey:`${tag}:RESTORE`})});
assert.equal(restored.response.status,200);
assert.equal(restored.body.candidate.candidate_status,'NEEDS_ADDRESS');

const exportResponse=await fetch(`${base}/api/opportunities/export?priorityBand=HIGH_REVIEW_PRIORITY`,{headers:{Origin:base},cache:'no-store'});
const csv=await exportResponse.text();
assert.equal(exportResponse.status,200);
const header=csv.split('\n')[0];
assert.equal(header,'id,candidate_key,atn,apn,address,priority_band,screening_score,identity_status,candidate_status,amount_owed,resolved_property_id,source_edition');
assert.doesNotMatch(csv,/raw_payload|normalized_payload|provider_payload|owner_name|DATABASE_URL|postgres(?:ql)?:\/\//i);
assert.ok(csv.split('\n').length-2<=100);

const enrichmentGate=await json(`/api/opportunities/${candidate.id}/enrich`,{method:'POST',body:JSON.stringify({address:'Not supplied by source',confirmProviderCall:false})});
assert.equal(enrichmentGate.response.status,409);
assert.equal(enrichmentGate.body.error,'ENRICHMENT_CONFIRMATION_REQUIRED');

const root=await fetch(base,{headers:{Origin:base},cache:'no-store'});const html=await root.text();
assert.doesNotMatch(html,/DATABASE_URL|NETLIFY_DB_URL|RENTCAST_API_KEY|postgres(?:ql)?:\/\//i);
const assets=[...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(match=>match[1]);
for(const asset of assets){const js=await (await fetch(new URL(asset,base),{cache:'no-store'})).text();assert.doesNotMatch(js,/DATABASE_URL|NETLIFY_DB_URL|RENTCAST_API_KEY|postgres(?:ql)?:\/\/|@netlify\/database/i);}

const report={at:new Date().toISOString(),status:'PASS',deploymentUrl:base,deployId:'6aaec51d6991406deda80902',qaTag:tag,health:{runtime:health.runtime,databaseConfigured:health.databaseConfigured,databaseProvider:health.databaseProvider,persistenceAvailable:health.persistenceAvailable},sourceFileHash:metrics.source_file_hash,recordCount:Number(metrics.record_count),candidateCount:Number(metrics.counts.candidates),priorityDistribution,needsAddress:Number(metrics.counts.needs_address),pageSize:listResult.body.opportunities.length,defaultPageSize:defaultPage.body.opportunities.length,cappedPageSize:cappedPage.body.opportunities.length,candidateId:candidate.id,sourceRecords:detail.records.length,signals:detail.signals.length,reviewId:reviewed.body.review.id,idempotentReplay:true,restoredStatus:restored.body.candidate.candidate_status,csvRows:csv.split('\n').length-2,enrichmentConfirmationGate:true,browserSecretScan:{assetsScanned:assets.length,status:'PASS'},rentcastCalls:0};
await writeJson('data/validation/sprint6-netlify-production-qa.json',report);
console.log(JSON.stringify(report,null,2));
