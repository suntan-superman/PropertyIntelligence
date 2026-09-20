import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {calculateLinkedDecision,saveAcquisitionDecision} from '../src/services/acquisitionDecisionService.js';
import {insertAcquisitionDecision} from '../src/persistence/acquisitionRepository.js';
import {investmentReportModel} from '../src/services/investmentReportService.js';
import {createApi} from '../src/workbench/api/router.js';
import {investmentFixture,ids} from './fixtures/investment.js';

export const acquisitionInput=()=>({strategy:'FIX_AND_FLIP',hurdle:{type:'CASH_ON_CASH',rate:.2},selectedExitBasis:'INDEPENDENT_POINT',evidenceSnapshotId:ids.evidence,exitBases:[{basis:'INDEPENDENT_POINT',value:200000,evidenceSnapshotId:ids.evidence}],acquisitionCosts:[],dispositionCosts:[],rehab:{noRehabAssumption:true},holdingCosts:[],financing:{mode:'CASH'}});
const refs={propertyId:ids.property,dealId:ids.deal,evidenceSnapshotId:ids.evidence,analysisSnapshotId:ids.analysis};
function database(){
  const f=investmentFixture();f.analysis.model_fingerprint='synthetic-analysis-fingerprint';
  const tables={properties:[f.property],deals:[f.deal],evidence_snapshots:[f.evidence],analysis_snapshots:[f.analysis],acquisition_decisions:[],idempotency_keys:[],audit_events:[],property_encumbrances:[]},queries=[];
  const query=async(sql,args=[])=>{
    queries.push(sql);
    if(sql.includes('pg_advisory'))return {rows:[]};
    if(sql.includes('SELECT c.*'))return {rows:structuredClone(f.comps)};
    const select=sql.match(/FROM (\w+)/i);
    if(/^SELECT/i.test(sql)&&select){let rows=tables[select[1]]??[];if(select[1]==='idempotency_keys')rows=rows.filter(r=>r.request_key===args[0]&&r.operation===args[1]);else if(sql.includes('WHERE id=$1'))rows=rows.filter(r=>r.id===args[0]&&(!sql.includes('AND property_id=$2')||r.property_id===args[1]));return {rows:structuredClone(rows)};}
    const insert=sql.match(/INSERT INTO (\w+)\s*\(([^)]+)\)/i);
    if(insert){const row={id:randomUUID(),created_at:'2026-01-01T00:00:00Z'};insert[2].split(',').map(s=>s.trim()).forEach((c,i)=>row[c]=c.endsWith('_payload')?JSON.parse(args[i]):args[i]);tables[insert[1]]??=[];tables[insert[1]].push(row);return {rows:[structuredClone(row)]};}
    throw new Error('UNEXPECTED_TEST_SQL');
  };
  return {query,transaction:work=>work({query}),tables,queries,f};
}
async function save(db,overrides={}){const input=acquisitionInput(),decision=await calculateLinkedDecision({db,input,...refs});return saveAcquisitionDecision({db,input,decision,...refs,...overrides});}

test('new decision stores exact Analysis ID and creation-time derivation hashes in output/audit',async()=>{
  const db=database(),s=await save(db);assert.equal(s.analysisSnapshotId,ids.analysis);
  const row=db.tables.acquisition_decisions[0];assert.equal(row.analysis_snapshot_id,ids.analysis);assert.equal(row.outputs_payload.analysisLink.analysisSnapshotId,ids.analysis);assert.match(row.outputs_payload.analysisLink.analysisContentFingerprint,/^[a-f0-9]{64}$/);assert.deepEqual(db.tables.audit_events[0].event_payload.analysisLink,row.outputs_payload.analysisLink);
});
for(const [field,error] of [['property_id','PROPERTY'],['deal_id','DEAL'],['evidence_snapshot_id','EVIDENCE']])test(`analysis ${error.toLowerCase()} mismatch rejected before any write`,async()=>{
  const db=database();db.tables.analysis_snapshots[0][field]=randomUUID();await assert.rejects(()=>save(db),new RegExp(`DECISION_ANALYSIS_${error}_MISMATCH`));assert.equal(db.tables.acquisition_decisions.length,0);assert.ok(db.queries.every(q=>!q.startsWith('INSERT')));
});
for(const field of ['analysisSnapshotId','dealId'])test(`missing ${field} STOPs even input-only save`,async()=>{
  const db=database();await assert.rejects(()=>saveAcquisitionDecision({db,input:acquisitionInput(),...refs,[field]:null}),/DECISION_ANALYSIS_LINK_REQUIRED/);assert.equal(db.tables.acquisition_decisions.length,0);
});
test('missing analysis record STOPs; no lookup by Deal or latest fallback',async()=>{
  const db=database();db.tables.analysis_snapshots=[];await assert.rejects(()=>save(db),/DECISION_ANALYSIS_LINK_REQUIRED/);assert.ok(db.queries.every(q=>!q.includes('ORDER BY')&&!q.includes('latest')));
});
test('repository boundary also rejects missing and cross-linked analysis',async()=>{
  const db=database();await assert.rejects(()=>insertAcquisitionDecision(db,{...refs,analysisSnapshotId:null}),/DECISION_ANALYSIS_LINK_REQUIRED/);db.tables.analysis_snapshots[0].deal_id=randomUUID();await assert.rejects(()=>insertAcquisitionDecision(db,refs),/DEAL_MISMATCH/);
});
test('changed calculation, stale binding and unlinked client calculation cannot be saved',async()=>{
  const db=database(),input=acquisitionInput(),decision=await calculateLinkedDecision({db,input,...refs});
  await assert.rejects(()=>saveAcquisitionDecision({db,...refs,input,decision:{...decision,calculatedMao:1}}),/DECISION_CALCULATION_MISMATCH/);
  const second={...db.tables.analysis_snapshots[0],id:randomUUID()};db.tables.analysis_snapshots.push(second);
  await assert.rejects(()=>saveAcquisitionDecision({db,...refs,analysisSnapshotId:second.id,input,decision}),/DECISION_CALCULATION_MISMATCH/);
  const {analysisLink,...unlinked}=decision;await assert.rejects(()=>saveAcquisitionDecision({db,...refs,input,decision:unlinked}),/DECISION_ANALYSIS_LINK_REQUIRED/);
});
test('input/exit Evidence mismatch STOPs even with otherwise valid linkage',async()=>{
  const db=database();for(const input of [{...acquisitionInput(),evidenceSnapshotId:randomUUID()},{...acquisitionInput(),exitBases:[{basis:'INDEPENDENT_POINT',value:200000,evidenceSnapshotId:randomUUID()}]}])await assert.rejects(()=>calculateLinkedDecision({db,...refs,input}),/DECISION_ANALYSIS_EVIDENCE_MISMATCH/);
});
test('reusing an idempotency key with different assumptions STOPs instead of returning a wrong linkage',async()=>{
  const db=database();await save(db,{requestKey:'same'});
  const input={...acquisitionInput(),hurdle:{type:'CASH_ON_CASH',rate:.25}},decision=await calculateLinkedDecision({db,...refs,input});
  await assert.rejects(()=>saveAcquisitionDecision({db,...refs,input,decision,requestKey:'same'}),/DECISION_CALCULATION_MISMATCH/);assert.equal(db.tables.acquisition_decisions.length,1);
});
test('Analysis #2 and Decision #2 never change Decision #1 or its durable report',async()=>{
  const db=database(),first=await save(db,{requestKey:'first'}),rowBefore=JSON.stringify(db.tables.acquisition_decisions[0]);
  const report1=await investmentReportModel({db,decisionId:first.decisionId,generatedAt:'2026-01-01'});
  const analysis2=structuredClone(db.tables.analysis_snapshots[0]);analysis2.id=randomUUID();analysis2.outputs_payload.base.modeledProfit=40000;analysis2.modeled_profit=40000;db.tables.analysis_snapshots.push(analysis2);
  const input={...acquisitionInput(),hurdle:{type:'CASH_ON_CASH',rate:.25}},newRefs={...refs,analysisSnapshotId:analysis2.id};
  const decision=await calculateLinkedDecision({db,input,...newRefs});const args={db,input,decision,...newRefs,requestKey:'second'};
  const second=await saveAcquisitionDecision(args),replay=await saveAcquisitionDecision(args);assert.equal(second.decisionId,replay.decisionId);assert.equal(replay.idempotentReplay,true);assert.equal(db.tables.acquisition_decisions.length,2);assert.equal(JSON.stringify(db.tables.acquisition_decisions[0]),rowBefore);
  assert.deepEqual(await investmentReportModel({db:{transaction:db.transaction},decisionId:first.decisionId,generatedAt:'2026-01-01'}),report1);
});
test('ambiguous historical Decision remains unavailable even with one compatible Analysis',async()=>{
  const db=database();db.tables.acquisition_decisions.push({...db.f.decision,analysis_snapshot_id:null});await assert.rejects(()=>investmentReportModel({db,decisionId:ids.decision}),/REPORT_HISTORICAL_LINK_REQUIRED/);assert.ok(db.queries.every(q=>!q.includes('ORDER BY')));
});
test('synthetic exact-reviewed repair mapping reopens identically in separate service/database wrappers',async()=>{
  // Fixture-only repair simulation. NOT authority to mutate a real historical row.
  const db=database();db.tables.acquisition_decisions.push({...db.f.decision,analysis_snapshot_id:null});
  const mapping={decisionId:ids.decision,analysisSnapshotId:ids.analysis,evidenceSnapshotId:ids.evidence,proof:'SYNTHETIC retained creation event explicitly names all three IDs'};
  assert.equal(mapping.decisionId,db.f.decision.id);db.tables.acquisition_decisions[0].analysis_snapshot_id=mapping.analysisSnapshotId;
  const first=await investmentReportModel({db,decisionId:ids.decision,generatedAt:'2026-01-01'});
  const second=await investmentReportModel({db:{transaction:work=>work({query:db.query})},decisionId:mapping.decisionId,generatedAt:'2026-01-01'});assert.deepEqual(second,first);
});
test('cold API calculation/save binds durable IDs without provider/session dependency',async()=>{
  const db=database();let providerCalls=0;const api=()=>createApi({runtime:'netlify',persistence:db,live:{analyze:()=>{providerCalls++;throw new Error('PROVIDER_FORBIDDEN');}}});
  const post=async(path,body)=>api()(new Request(`https://example.test/api/${path}`,{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify(body)}));
  const input=acquisitionInput(),calculated=await post('acquisition-decisions/calculate',{...refs,input});assert.equal(calculated.status,200);const {decision}=await calculated.json();
  const saved=await post(`properties/${ids.property}/acquisition-decisions`,{...refs,input,decision,sessionId:'unknown-cold'});assert.equal(saved.status,200);assert.equal((await saved.json()).analysisSnapshotId,ids.analysis);
  const missing=await post(`properties/${ids.property}/acquisition-decisions`,{input,evidenceSnapshotId:ids.evidence});assert.equal(missing.status,409);assert.equal((await missing.json()).error,'DECISION_ANALYSIS_LINK_REQUIRED');assert.equal(providerCalls,0);
});
test('UI carries exact displayed snapshot; invalidates calculations when assumptions/context change',async()=>{
  const app=await readFile('apps/web/src/app/App.jsx','utf8'),ui=await readFile('apps/web/src/features/acquisition/AcquisitionDecision.jsx','utf8');assert.match(app,/setAnalysisContext\(record.analysisContext/);assert.match(app,/analysisSnapshotId:result.analysisSnapshotId/);assert.match(ui,/\[input,analysisContext\]/);assert.match(ui,/decision\?\.analysisLink/);
});
