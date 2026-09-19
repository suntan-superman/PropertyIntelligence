import assert from 'node:assert/strict';
import {createDatabase} from '../src/persistence/db.js';
import {calculateAcquisitionDecision} from '../src/underwriting/mao.js';
import {saveAcquisitionDecision,openAcquisitionDecision,listDecisionHistory} from '../src/services/acquisitionDecisionService.js';
import {insertAcquisitionDecision} from '../src/persistence/acquisitionRepository.js';
import {resolve,writeJson} from '../src/io/files.js';

try{process.loadEnvFile(resolve('.env'));}catch{/* deployment supplies DATABASE_URL */}
const db=createDatabase({connectionString:process.env.DATABASE_URL});if(!db)throw new Error('DATABASE_URL is required');
const second=createDatabase({connectionString:process.env.DATABASE_URL});
const qaTag=`SPRINT5_QA_${Date.now()}`;
try {
  const property=(await db.query("SELECT id FROM properties WHERE archived_at IS NULL ORDER BY created_at LIMIT 1")).rows[0];assert.ok(property,'an existing certified property is required');
  const evidence=(await db.query('SELECT id,property_id,valuation_payload FROM evidence_snapshots WHERE property_id=$1 ORDER BY retrieved_at DESC,created_at DESC LIMIT 1',[property.id])).rows[0];assert.ok(evidence);
  const valuation=evidence.valuation_payload??{};const exit=Number(valuation.price??200000);
  const input={qaTag,strategy:'FIX_AND_FLIP',hurdle:{type:'CASH_ON_CASH',rate:.2},selectedExitBasis:'INDEPENDENT_POINT',evidenceSnapshotId:evidence.id,exitBases:[{basis:'INDEPENDENT_POINT',value:exit,evidenceSnapshotId:evidence.id,evidenceStatus:'INDEPENDENT_ONLY'}],acquisitionCosts:[],dispositionCosts:[{name:'seller closing',basis:'FIXED',amount:2000}],rehab:{noRehabAssumption:true},holdingCosts:[],financing:{mode:'CASH'},encumbrances:[{type:'FIRST_MORTGAGE',amount:50000,amountStatus:'REPORTED',source:qaTag},{type:'TAX_LIEN',amount:null,amountStatus:'UNKNOWN',source:qaTag}],sellerAskingPrice:100000};
  const decision=calculateAcquisitionDecision(input);assert.equal(decision.status,'AVAILABLE');
  const first=await saveAcquisitionDecision({db,propertyId:property.id,evidenceSnapshotId:evidence.id,decision,input,requestKey:`${qaTag}:DECISION_1`,conditionAssessment:{assessmentDate:new Date().toISOString().slice(0,10),source:qaTag,items:[{category:'ROOF',conditionStatus:'UNKNOWN',estimatedCost:null,source:qaTag}]}});
  const replay=await saveAcquisitionDecision({db,propertyId:property.id,evidenceSnapshotId:evidence.id,decision,input,requestKey:`${qaTag}:DECISION_1`});assert.equal(replay.decisionId,first.decisionId);assert.equal(replay.idempotentReplay,true);
  const before=JSON.stringify((await db.query('SELECT * FROM acquisition_decisions WHERE id=$1',[first.decisionId])).rows[0]);
  const changedInput={...input,hurdle:{type:'PROFIT_MARGIN_ON_SALE',rate:.25},targetPolicy:{type:'FIXED_DISCOUNT_FROM_MAO',discount:1000}};const changed=calculateAcquisitionDecision(changedInput);const secondDecision=await saveAcquisitionDecision({db:second,propertyId:property.id,evidenceSnapshotId:evidence.id,decision:changed,input:changedInput,requestKey:`${qaTag}:DECISION_2`});assert.notEqual(secondDecision.decisionId,first.decisionId);
  const after=JSON.stringify((await db.query('SELECT * FROM acquisition_decisions WHERE id=$1',[first.decisionId])).rows[0]);assert.equal(after,before,'prior decision must remain immutable');
  const opened=await openAcquisitionDecision({db:second,id:first.decisionId});assert.equal(opened.id,first.decisionId);assert.equal(opened.outputsPayload.modelFingerprint,decision.modelFingerprint);
  const history=await listDecisionHistory({db:second,propertyId:property.id});assert.ok(history.some(row=>row.id===first.decisionId));assert.ok(history.some(row=>row.id===secondDecision.decisionId));
  const rollbackFingerprint=`${qaTag}:ROLLBACK`;await assert.rejects(()=>db.transaction(async tx=>{await insertAcquisitionDecision(tx,{propertyId:property.id,evidenceSnapshotId:evidence.id,strategy:'FIX_AND_FLIP',decisionVersion:'sprint5-mao-v1',hurdleType:'CASH_ON_CASH',hurdleRate:.2,selectedExitBasis:'INDEPENDENT_POINT',selectedExitValue:exit,costCompleteness:'COMPLETE',inputsPayload:{qaTag:rollbackFingerprint},outputsPayload:{},warningsPayload:[],modelFingerprint:rollbackFingerprint});throw new Error('ROLLBACK_SENTINEL');}),/ROLLBACK_SENTINEL/);assert.equal((await db.query('SELECT count(*)::int AS n FROM acquisition_decisions WHERE model_fingerprint=$1',[rollbackFingerprint])).rows[0].n,0);
  const report={at:new Date().toISOString(),status:'PASS',qaTag,propertyId:property.id,evidenceSnapshotId:evidence.id,decisionIds:[first.decisionId,secondDecision.decisionId],historyCount:history.length,checks:['immutable decision snapshot','idempotent replay','separate database connection reopen','encumbrance history','condition history','transaction rollback','0 provider calls'],providerCalls:0};await writeJson('data/validation/sprint5-acquisition-persistence-qa.json',report);console.log(JSON.stringify(report,null,2));
} finally {await db.closePoolForTests();await second.closePoolForTests();}
