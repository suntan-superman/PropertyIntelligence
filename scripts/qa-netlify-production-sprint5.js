import assert from 'node:assert/strict';
import {writeJson} from '../src/io/files.js';

const base=String(process.argv[2]??'').replace(/\/$/,'');
if(base!=='https://worksidepropertyintelligence.netlify.app')throw new Error('Production URL is required.');
const tag=String(process.argv[3]??`SPRINT5_PRODUCTION_QA_${Date.now()}`);

async function call(path,options={}) {
  const response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',Origin:base,...(options.headers??{})}});
  const text=await response.text();
  let body;
  try { body=JSON.parse(text); } catch { throw new Error(`NON_JSON_RESPONSE:${path}`); }
  assert.ok(response.ok,`${path} ${response.status}:${body.error??'unknown'}`);
  return body;
}

const health=await call('/api/health');
assert.equal(health.runtime,'netlify');
assert.equal(health.databaseConfigured,true);
assert.equal(health.databaseProvider,'postgresql');
assert.equal(health.persistenceAvailable,true);

const propertyRequest={sessionId:'fixture:fantasia:property',requestKey:`${tag}:PROPERTY`};
const property=await call('/api/properties',{method:'POST',body:JSON.stringify(propertyRequest)});
const propertyReplay=await call('/api/properties',{method:'POST',body:JSON.stringify(propertyRequest)});
assert.equal(propertyReplay.propertyId,property.propertyId);
assert.equal(propertyReplay.idempotentReplay,true);
const reopenedProperty=await call(`/api/properties/${property.propertyId}`);
assert.equal(reopenedProperty.property.model.property.comps.length,15);
const evidenceSnapshotId=property.evidenceSnapshotId;
const evidence=await call(`/api/properties/${property.propertyId}/evidence`);
assert.ok(evidence.evidence.some(row=>row.id===evidenceSnapshotId));

const dealBody={sessionId:'fixture:fantasia:deal',propertyId:property.propertyId,evidenceSnapshotId,name:`${tag} Deal`,requestKey:`${tag}:DEAL`};
const deal=await call('/api/deals',{method:'POST',body:JSON.stringify(dealBody)});
const dealReplay=await call('/api/deals',{method:'POST',body:JSON.stringify(dealBody)});
assert.equal(dealReplay.dealId,deal.dealId);
assert.equal(dealReplay.idempotentReplay,true);
const reopenedDeal=await call(`/api/deals/${deal.dealId}`);
assert.equal(reopenedDeal.deal.claims.length,10);
assert.equal(reopenedDeal.deal.diligence.length,21);

const encumbrances=[
  {type:'FIRST_MORTGAGE',amount:50000,amountStatus:'REPORTED',source:tag},
  {type:'TAX_LIEN',amount:null,amountStatus:'UNKNOWN',source:tag}
];
const decisionInput={
  tag,strategy:'FIX_AND_FLIP',hurdle:{type:'CASH_ON_CASH',rate:.2},selectedExitBasis:'INDEPENDENT_POINT',
  evidenceSnapshotId,
  exitBases:[
    {basis:'INDEPENDENT_LOW',value:180000,evidenceSnapshotId,evidenceStatus:'INDEPENDENT_ONLY'},
    {basis:'INDEPENDENT_POINT',value:200000,evidenceSnapshotId,evidenceStatus:'INDEPENDENT_ONLY'},
    {basis:'INDEPENDENT_HIGH',value:220000,evidenceSnapshotId,evidenceStatus:'INDEPENDENT_ONLY'}
  ],
  acquisitionCosts:[],dispositionCosts:[{name:'seller closing',basis:'FIXED',amount:2000}],
  rehab:{items:[{category:'ROOF',conditionStatus:'MODERATE',estimatedCost:12000,source:tag}],contingency:{basis:'FIXED',value:1000}},
  holdingCosts:[],financing:{mode:'CASH'},encumbrances,
  manualWalkAwayCap:145000,sellerAskingPrice:100000,
  targetPolicy:{type:'PERCENT_DISCOUNT_FROM_MAO',percentage:10}
};
const calculated=await call('/api/acquisition-decisions/calculate',{method:'POST',body:JSON.stringify({input:decisionInput})});
const decision1=calculated.decision;
assert.equal(decision1.hurdle.type,'CASH_ON_CASH');
assert.equal(decision1.hurdle.rate,.2);
assert.equal(decision1.selectedExitBasis,'INDEPENDENT_POINT');
assert.ok(decision1.calculatedMao>decision1.effectiveWalkawayPrice);
assert.ok(decision1.effectiveWalkawayPrice>decision1.targetOffer);
assert.equal(decision1.knownEncumbranceTotal,50000);
assert.equal(decision1.unknownEncumbranceCount,1);

const withoutEncumbrances={...decisionInput,encumbrances:[]};
const noEncumbranceCalculation=await call('/api/acquisition-decisions/calculate',{method:'POST',body:JSON.stringify({input:withoutEncumbrances})});
assert.equal(noEncumbranceCalculation.decision.calculatedMao,decision1.calculatedMao);
assert.equal(noEncumbranceCalculation.decision.knownEncumbranceTotal,0);

const conditionAssessment={assessmentDate:new Date().toISOString().slice(0,10),source:tag,items:[{category:'ROOF',conditionStatus:'MODERATE',estimatedCost:12000,source:tag,notes:'Controlled production QA'}]};
const save1Body={evidenceSnapshotId,dealId:deal.dealId,sessionId:`cold-production-decision:${tag}`,input:decisionInput,decision:decision1,conditionAssessment,requestKey:`${tag}:DECISION1`};
const saved1=await call(`/api/properties/${property.propertyId}/acquisition-decisions`,{method:'POST',body:JSON.stringify(save1Body)});
const saved1Replay=await call(`/api/properties/${property.propertyId}/acquisition-decisions`,{method:'POST',body:JSON.stringify(save1Body)});
assert.equal(saved1Replay.decisionId,saved1.decisionId);
assert.equal(saved1Replay.idempotentReplay,true);
const opened1Before=await call(`/api/acquisition-decisions/${saved1.decisionId}`);
assert.equal(opened1Before.decision.outputsPayload.modelFingerprint,decision1.modelFingerprint);
assert.equal(opened1Before.decision.outputsPayload.knownEncumbranceTotal,50000);
assert.equal(opened1Before.decision.outputsPayload.unknownEncumbranceCount,1);
assert.equal(opened1Before.decision.encumbrances.filter(row=>row.source===tag).length,2);
assert.ok(opened1Before.decision.conditionAssessments.some(row=>row.source===tag));
const firstInputsBytes=JSON.stringify(opened1Before.decision.inputsPayload);
const firstOutputsBytes=JSON.stringify(opened1Before.decision.outputsPayload);
const firstFingerprint=opened1Before.decision.outputsPayload.modelFingerprint;

const decision2Input={...decisionInput,selectedExitBasis:'INDEPENDENT_HIGH'};
const calculated2=await call('/api/acquisition-decisions/calculate',{method:'POST',body:JSON.stringify({input:decision2Input})});
const decision2=calculated2.decision;
assert.equal(decision2.selectedExitBasis,'INDEPENDENT_HIGH');
assert.notEqual(decision2.modelFingerprint,decision1.modelFingerprint);
assert.notEqual(decision2.calculatedMao,decision1.calculatedMao);
const save2Body={evidenceSnapshotId,dealId:deal.dealId,sessionId:`cold-production-decision:${tag}:second`,input:decision2Input,decision:decision2,requestKey:`${tag}:DECISION2`};
const saved2=await call(`/api/properties/${property.propertyId}/acquisition-decisions`,{method:'POST',body:JSON.stringify(save2Body)});
const historyAfter2=await call(`/api/properties/${property.propertyId}/acquisition-decisions`);
assert.ok(historyAfter2.decisions.some(row=>row.id===saved1.decisionId));
assert.ok(historyAfter2.decisions.some(row=>row.id===saved2.decisionId));
const opened1After=await call(`/api/acquisition-decisions/${saved1.decisionId}`);
assert.equal(JSON.stringify(opened1After.decision.inputsPayload),firstInputsBytes);
assert.equal(JSON.stringify(opened1After.decision.outputsPayload),firstOutputsBytes);
assert.equal(opened1After.decision.outputsPayload.modelFingerprint,firstFingerprint);
const historyCountBeforeReplay=historyAfter2.decisions.length;
const saved2Replay=await call(`/api/properties/${property.propertyId}/acquisition-decisions`,{method:'POST',body:JSON.stringify(save2Body)});
assert.equal(saved2Replay.decisionId,saved2.decisionId);
assert.equal(saved2Replay.idempotentReplay,true);
const historyAfterReplay=await call(`/api/properties/${property.propertyId}/acquisition-decisions`);
assert.equal(historyAfterReplay.decisions.length,historyCountBeforeReplay);

const encumbranceHistory=await call(`/api/properties/${property.propertyId}/encumbrances`);
const taggedEncumbrances=encumbranceHistory.encumbrances.filter(row=>row.source===tag);
assert.ok(taggedEncumbrances.some(row=>Number(row.amount)===50000));
assert.ok(taggedEncumbrances.some(row=>row.amount===null));
const conditionHistory=await call(`/api/properties/${property.propertyId}/condition-assessments`);
assert.ok(conditionHistory.assessments.some(row=>row.source===tag&&row.items.some(item=>item.category==='ROOF')));

const incompleteInput={...decisionInput,holdingCosts:[{name:'unknown holding cost',basis:'FIXED',amount:null,status:'UNKNOWN'}]};
const incomplete=await call('/api/acquisition-decisions/calculate',{method:'POST',body:JSON.stringify({input:incompleteInput})});
assert.equal(incomplete.decision.costCompleteness,'INCOMPLETE');
assert.ok(incomplete.decision.unknownCosts.includes('unknown holding cost'));
assert.ok(incomplete.decision.warnings.some(w=>/unknown costs/i.test(w)));

const root=await fetch(base);const html=await root.text();
assert.doesNotMatch(html,/DATABASE_URL|NETLIFY_DB_URL|RENTCAST_API_KEY|postgres(?:ql)?:\/\//i);
const assets=[...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(match=>match[1]);
for(const asset of assets){const js=await (await fetch(new URL(asset,base))).text();assert.doesNotMatch(js,/DATABASE_URL|NETLIFY_DB_URL|RENTCAST_API_KEY|postgres(?:ql)?:\/\/|@netlify\/database/i);}

const report={at:new Date().toISOString(),status:'PASS',deploymentUrl:base,qaTag:tag,health:{runtime:health.runtime,databaseConfigured:health.databaseConfigured,databaseProvider:health.databaseProvider,persistenceAvailable:health.persistenceAvailable},propertyId:property.propertyId,evidenceSnapshotId,retainedComps:reopenedProperty.property.model.property.comps.length,dealId:deal.dealId,claims:reopenedDeal.deal.claims.length,diligence:reopenedDeal.deal.diligence.length,decision1Id:saved1.decisionId,decision2Id:saved2.decisionId,decision1Fingerprint:firstFingerprint,decision2Fingerprint:decision2.modelFingerprint,hurdleType:decision1.hurdle.type,hurdleRate:decision1.hurdle.rate,selectedExitBasis:decision1.selectedExitBasis,selectedMao:decision1.calculatedMao,walkAway:decision1.effectiveWalkawayPrice,targetOffer:decision1.targetOffer,knownEncumbranceTotal:decision1.knownEncumbranceTotal,unknownEncumbranceCount:decision1.unknownEncumbranceCount,conditionItems:conditionHistory.assessments.find(row=>row.source===tag)?.items?.length??0,historyCount:historyAfterReplay.decisions.length,firstDecisionUnchanged:true,idempotentReplay:true,encumbranceSeparation:true,incompleteUnknownPreserved:true,browserSecretScan:{assetsScanned:assets.length,status:'PASS'},rentcastCalls:0};
await writeJson('data/validation/sprint5-production-qa.json',report);
console.log(JSON.stringify(report,null,2));
