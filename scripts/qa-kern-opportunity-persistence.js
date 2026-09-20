import assert from 'node:assert/strict';
import {createDatabase} from '../src/persistence/db.js';
import {getCandidate,getSourceStatus} from '../src/persistence/opportunityRepository.js';
import {opportunity,opportunityStatus,reviewOpportunity,importSource} from '../src/services/opportunityService.js';
import {writeJson} from '../src/io/files.js';

try{process.loadEnvFile('.env');}catch{}
const db1=createDatabase();if(!db1)throw new Error('DATABASE_NOT_CONFIGURED');
const db2=createDatabase();const hash=process.argv[2]??'89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3';const tag=`SPRINT6_OPPORTUNITY_QA_${Date.now()}`;
try{
  const before=await opportunityStatus({db:db1,sourceFileHash:hash});assert.ok(before);assert.equal(before.counts.records,11321);assert.equal(before.counts.candidates,11316);assert.equal(before.quality.amount_null_count,0);assert.equal(before.quality.apn_count,0);
  const candidateId=(await db1.query('SELECT id FROM opportunity_candidates WHERE candidate_key LIKE \'ATN:%\' ORDER BY id LIMIT 1')).rows[0]?.id;assert.ok(candidateId);
  const beforeCandidate=await opportunity({db:db1,id:candidateId});const recordBytes=JSON.stringify(beforeCandidate.records.map(row=>({id:row.id,raw_payload:row.raw_payload,normalized_payload:row.normalized_payload,record_fingerprint:row.record_fingerprint})));
  const reviewKey=`${tag}:REVIEW`;const reviewed=await reviewOpportunity({db:db1,id:candidateId,action:'REVIEW',notes:tag,requestKey:reviewKey});const replay=await reviewOpportunity({db:db1,id:candidateId,action:'REVIEW',notes:tag,requestKey:reviewKey});assert.equal(replay.review.id,reviewed.review.id);assert.equal(replay.idempotentReplay,true);
  const openedSeparate=await opportunity({db:db2,id:candidateId});assert.equal(openedSeparate.candidate_status,'REVIEWING');assert.equal(JSON.stringify(openedSeparate.records.map(row=>({id:row.id,raw_payload:row.raw_payload,normalized_payload:row.normalized_payload,record_fingerprint:row.record_fingerprint}))),recordBytes);
  const archived=await reviewOpportunity({db:db1,id:candidateId,action:'ARCHIVE',notes:tag,requestKey:`${tag}:ARCHIVE`});assert.equal(archived.candidate.candidate_status,'ARCHIVED');const restored=await reviewOpportunity({db:db1,id:candidateId,action:'RESTORE',notes:tag,status:'NEEDS_ADDRESS',requestKey:`${tag}:RESTORE`});assert.equal(restored.candidate.candidate_status,'NEEDS_ADDRESS');assert.equal(restored.candidate.archived_at,null);
  const rollbackKey=`${tag}:ROLLBACK`;await assert.rejects(()=>db1.transaction(async tx=>{await tx.query('INSERT INTO opportunity_reviews (candidate_id,action,notes) VALUES ($1,$2,$3)',[candidateId,'QA_ROLLBACK',rollbackKey]);throw new Error('QA_ROLLBACK');}),/QA_ROLLBACK/);const rollbackCount=await db2.query('SELECT count(*)::int AS n FROM opportunity_reviews WHERE notes=$1',[rollbackKey]);assert.equal(rollbackCount.rows[0].n,0);
  const replayImport=await importSource({db:db1,source:{sourceType:'KERN_POWER_TO_SELL',jurisdiction:'KERN',sourceName:'Kern County Power to Sell Listing',edition:'2026-09-15',sourceDate:'2026-09-15',sourceFileHash:hash,recordCount:11321},records:[],requestKey:`${tag}:IMPORT_REPLAY`});assert.equal(replayImport.alreadyImported,true);assert.equal((await opportunityStatus({db:db2,sourceFileHash:hash})).counts.records,11321);
  const report={at:new Date().toISOString(),status:'PASS',qaTag:tag,sourceFileHash:hash,sourceRecords:before.counts.records,candidates:before.counts.candidates,candidateId,signals:beforeCandidate.signals.length,recordImmutability:true,idempotentReview:true,archiveRestore:true,transactionRollback:true,importReplay:true,providerCalls:0};await writeJson('data/validation/sprint6-opportunity-persistence-qa.json',report);console.log(JSON.stringify(report,null,2));
}finally{await db1.closePoolForTests();await db2.closePoolForTests();}
