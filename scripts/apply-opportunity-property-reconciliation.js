import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createDatabase, rowJson} from '../src/persistence/db.js';
import {createOpportunityPropertyLink} from '../src/persistence/opportunityPropertyLinkRepository.js';
import {listAssessorCandidates, safeOpportunityList} from '../src/persistence/assessorOpportunityRepository.js';
import {addressKey} from '../src/sources/rentcast/propertyLookup.js';
import {readJson,writeJson} from '../src/io/files.js';
import {certifiedChecksums, migrationNames} from './sprint6_3_3/certification.js';

// This is intentionally a one-pair production gate.  It is not a general
// reconciliation importer and cannot be used for any other candidate/property.
const AUTHORIZED={
  candidateId:'01a98c28-a14b-4c60-ab10-581684c99389',
  propertyId:'37cb8526-c1e7-4896-8525-a9cdb82f370b',
  addressResolutionId:'b6f69e57-071c-4029-8eef-c22435e4875e',
  assessorEnrichmentId:'943aa186-9598-4735-aa91-5763dbc1356a',
  apn9:'251091302'
};
const args=process.argv.slice(2);
const value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
const requested={candidateId:value('--candidate-id'),propertyId:value('--property-id')};
const report={status:'STOP_BEFORE_WRITE',mode:'AUTHORIZED_SINGLE_RECONCILIATION_APPLY',writes:{performed:false},providerCalls:{rentcast:0,google:0,county:0},authorizedPair:AUTHORIZED,requested};
const digest=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
const safeError=error=>({code:/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'SANITIZED_DATABASE_FAILURE',sqlState:/^[0-9A-Z]{5}$/.test(error?.code??'')?error.code:null});
const assert=(condition,code)=>{if(!condition)throw new Error(code);};

async function runDryRun(){
  execFileSync(process.execPath,['scripts/reconcile-opportunity-property.js','--candidate-id',AUTHORIZED.candidateId,'--property-id',AUTHORIZED.propertyId,'--dry-run'],{stdio:'ignore'});
  const packet=await readJson('data/validation/sprint6_3_3-reconciliation-dry-run.json');
  assert(packet.status==='STOP_DRY_RUN','DRY_RUN_STATUS_STOP');
  assert(packet.schemaLinkTablePresent===true,'DRY_RUN_SCHEMA_REQUIRED');
  assert(['INSERT_ACTIVE_EXPLICIT_WORKFLOW_LINK','ALREADY_LINKED_EXPLICIT_WORKFLOW'].includes(packet.plannedOperation),'DRY_RUN_WRITE_GATE_STOP');
  if(packet.plannedOperation==='INSERT_ACTIVE_EXPLICIT_WORKFLOW_LINK')assert(packet.linkState?.activeLinkCount===0,'DRY_RUN_ACTIVE_LINKS_NOT_ZERO');
  else assert(packet.linkState?.activeLinkCount===1,'DRY_RUN_EXISTING_LINK_COUNT_MISMATCH');
  assert(packet.candidate?.id===AUTHORIZED.candidateId&&packet.property?.id===AUTHORIZED.propertyId,'DRY_RUN_IDENTITY_MISMATCH');
  assert(packet.canonicalAddress?.id===AUTHORIZED.addressResolutionId&&packet.assessorContext?.id===AUTHORIZED.assessorEnrichmentId,'DRY_RUN_CONTEXT_MISMATCH');
  assert(packet.assessorContext?.apn9===AUTHORIZED.apn9,'DRY_RUN_APN9_MISMATCH');
  return packet;
}
function migrationGuard(rows){
  assert(rows.length===migrationNames.length,'MIGRATION_LEDGER_INCOMPLETE');
  for(const name of migrationNames){const row=rows.find(item=>item.filename===name);assert(row&&row.checksum===certifiedChecksums[name],`MIGRATION_CHECKSUM_${name.slice(0,3)}_STOP`);}
}

async function readState(db){
  const candidate=(await db.query(`SELECT id,candidate_key,atn,priority_band,screening_score,score_version,identity_status,candidate_status,resolved_property_id FROM opportunity_candidates WHERE id=$1`,[AUTHORIZED.candidateId])).rows[0];
  const property=(await db.query(`SELECT id,address_line1,city,state,postal_code,normalized_address,identity_status,archived_at FROM properties WHERE id=$1`,[AUTHORIZED.propertyId])).rows[0];
  const canonical=(await db.query(`SELECT id,candidate_id,street,city,state,postal_code,postal_code_extension,formatted_address,resolution_source,resolution_method,verification_status,analyst_confirmed,confirmed_at,version FROM candidate_address_resolutions WHERE id=$1`,[AUTHORIZED.addressResolutionId])).rows[0];
  const assessor=(await db.query(`SELECT id,candidate_id,assessor_atn_normalized,apn9,pts_atn_normalized,crosswalk_status,situs_status,situs_raw FROM opportunity_assessor_enrichments WHERE id=$1`,[AUTHORIZED.assessorEnrichmentId])).rows[0];
  const evidence=(await db.query(`SELECT id,source,source_record_id,retrieved_at,snapshot_type,status FROM evidence_snapshots WHERE property_id=$1 ORDER BY id`,[AUTHORIZED.propertyId])).rows;
  const links=(await db.query(`SELECT id,candidate_id,property_id,address_resolution_id,assessor_enrichment_id,origin,link_method,link_status,created_at,superseded_at,created_by_context,idempotency_key FROM opportunity_property_links ORDER BY created_at,id`)).rows;
  return {candidate:rowJson(candidate),property:rowJson(property),canonical:rowJson(canonical),assessor:rowJson(assessor),evidence:evidence.map(rowJson),links:links.map(rowJson)};
}
function preservation(state){
  return {
    candidate:digest(state.candidate),property:digest(state.property),canonical:digest(state.canonical),assessor:digest(state.assessor),
    evidence:{count:state.evidence.length,fingerprint:digest(state.evidence)}
  };
}
function verifyState(state,{allowExactActive=false}={}){
  assert(state.candidate&&state.property&&state.canonical&&state.assessor,'AUTHORIZED_RECORD_MISSING');
  assert(state.candidate.id===AUTHORIZED.candidateId&&state.property.id===AUTHORIZED.propertyId,'AUTHORIZED_ID_MISMATCH');
  assert(state.canonical.id===AUTHORIZED.addressResolutionId&&state.canonical.candidate_id===AUTHORIZED.candidateId,'CANONICAL_ID_MISMATCH');
  assert(state.assessor.id===AUTHORIZED.assessorEnrichmentId&&state.assessor.candidate_id===AUTHORIZED.candidateId,'ASSESSOR_ID_MISMATCH');
  assert(String(state.assessor.apn9)===AUTHORIZED.apn9,'APN9_MISMATCH');
  assert(state.canonical.verification_status==='ANALYST_CONFIRMED'&&state.canonical.analyst_confirmed===true,'CANONICAL_CONFIRMATION_REQUIRED');
  assert(state.canonical.version===1&&!state.canonical.superseded_at,'CANONICAL_VERSION_INVALID');
  assert(addressKey(state.canonical.formatted_address)===state.property.normalized_address,'NORMALIZED_ADDRESS_MISMATCH');
  assert(state.candidate.resolved_property_id===null,'CANDIDATE_PROPERTY_CONFLICT');
  const active=state.links.filter(row=>row.link_status==='ACTIVE'&&!row.superseded_at);
  if(active.length){
    assert(allowExactActive&&active.length===1&&active[0].candidate_id===AUTHORIZED.candidateId&&active[0].property_id===AUTHORIZED.propertyId&&active[0].address_resolution_id===AUTHORIZED.addressResolutionId&&active[0].assessor_enrichment_id===AUTHORIZED.assessorEnrichmentId,'ACTIVE_LINK_ALREADY_EXISTS');
  }
  assert(state.evidence.length===1,'PROPERTY_EVIDENCE_EXPECTED_ONE');
}

async function main(){
  assert(args.includes('--apply'),'APPLY_FLAG_REQUIRED');
  assert(requested.candidateId===AUTHORIZED.candidateId&&requested.propertyId===AUTHORIZED.propertyId,'AUTHORIZED_PAIR_REQUIRED');
  try{process.loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw new Error('ENV_LOAD_STOP');}
  await runDryRun();
  report.dryRunArtifact='data/validation/sprint6_3_3-reconciliation-dry-run.json';
  const db=createDatabase();assert(db,'DATABASE_NOT_CONFIGURED');
  let reopenDb;
  try{
    const ledger=(await db.query("SELECT filename,checksum,applied_at FROM property_intelligence_schema_migrations WHERE filename IN ('001_persistent_intelligence.sql','002_acquisition_decisions.sql','003_opportunity_discovery.sql','004_kern_assessor_opportunity_enrichment.sql','005_candidate_address_resolutions.sql','006_opportunity_property_links.sql') ORDER BY filename")).rows;
    migrationGuard(ledger);report.migrationLedger=ledger.map(row=>({filename:row.filename,checksum:row.checksum,appliedAt:row.applied_at}));
    const before=await readState(db);const existingActive=before.links.filter(row=>row.link_status==='ACTIVE'&&!row.superseded_at);verifyState(before,{allowExactActive:existingActive.length===1});const beforeFingerprint=preservation(before);report.before=beforeFingerprint;
    if(existingActive.length===0){
      await db.withTransaction(async tx=>{
        // Re-check every protected identity while holding the write transaction.
        const current=await readState(tx);verifyState(current);assert(digest(preservation(current))===digest(beforeFingerprint),'PREWRITE_BASELINE_CHANGED');
        const result=await createOpportunityPropertyLink(tx,{...AUTHORIZED,origin:'OPPORTUNITY_ANALYSIS_WORKFLOW',linkMethod:'EXPLICIT_WORKFLOW_CONTEXT',linkStatus:'ACTIVE',createdByContext:'OPPORTUNITY_ANALYSIS',idempotencyKey:`SPRINT6_3_3_LINK:${AUTHORIZED.candidateId}:${AUTHORIZED.propertyId}:${AUTHORIZED.addressResolutionId}:${AUTHORIZED.assessorEnrichmentId}`});
        assert(!result.idempotentReplay,'UNEXPECTED_PREWRITE_REPLAY');
        report.insertedLink=result.link;
      });
      report.writes={performed:true,transaction:'COMMITTED_ONE_ACTIVE_LINK'};
    }else report.writes={performed:true,transaction:'COMMITTED_ONE_ACTIVE_LINK',certificationInvocation:'ALREADY_COMMITTED_EXACT_LINK_CERTIFIED'};
    // Reopen through a newly constructed pool so this is an independent
    // database connection boundary, not merely another query on the writer.
    reopenDb=createDatabase();assert(reopenDb,'DATABASE_NOT_CONFIGURED');
    const after=await readState(reopenDb);const afterFingerprint=preservation(after);report.after=afterFingerprint;
    assert(after.links.length===1,'LINEAGE_TOTAL_COUNT_MISMATCH');
    const row=after.links[0];assert(row.candidate_id===AUTHORIZED.candidateId&&row.property_id===AUTHORIZED.propertyId&&row.address_resolution_id===AUTHORIZED.addressResolutionId&&row.assessor_enrichment_id===AUTHORIZED.assessorEnrichmentId,'LINEAGE_IDENTITY_MISMATCH');
    assert(row.origin==='OPPORTUNITY_ANALYSIS_WORKFLOW'&&row.link_method==='EXPLICIT_WORKFLOW_CONTEXT'&&row.link_status==='ACTIVE'&&!row.superseded_at,'LINEAGE_STATE_MISMATCH');
    assert(JSON.stringify(beforeFingerprint)===JSON.stringify(afterFingerprint),'PROTECTED_FINGERPRINT_CHANGED');
    report.postWrite={totalLineageRows:after.links.length,activeCandidateLinks:after.links.filter(x=>x.candidate_id===AUTHORIZED.candidateId&&x.link_status==='ACTIVE'&&!x.superseded_at).length,activePropertyLinks:after.links.filter(x=>x.property_id===AUTHORIZED.propertyId&&x.link_status==='ACTIVE'&&!x.superseded_at).length,lineageId:row.id,createdAt:row.created_at};
    const replay=await reopenDb.withTransaction(tx=>createOpportunityPropertyLink(tx,{...AUTHORIZED,origin:'OPPORTUNITY_ANALYSIS_WORKFLOW',linkMethod:'EXPLICIT_WORKFLOW_CONTEXT',linkStatus:'ACTIVE',createdByContext:'OPPORTUNITY_ANALYSIS',idempotencyKey:`SPRINT6_3_3_LINK:${AUTHORIZED.candidateId}:${AUTHORIZED.propertyId}:${AUTHORIZED.addressResolutionId}:${AUTHORIZED.assessorEnrichmentId}`}));
    assert(replay.idempotentReplay,'IDEMPOTENT_REPLAY_NOT_REPORTED');report.replay={idempotent:true,createdAdditionalRows:0,supersessions:0};
    const finalState=await readState(reopenDb);assert(finalState.links.length===1,'REPLAY_CREATED_DUPLICATE');assert(JSON.stringify(preservation(finalState))===JSON.stringify(beforeFingerprint),'REPLAY_CHANGED_PROTECTED_DATA');
    const listed=await reopenDb.withTransaction(tx=>listAssessorCandidates(tx,{search:'25109130001',limit:10}));
    const safe=safeOpportunityList(listed.rows.find(item=>item.id===AUTHORIZED.candidateId));
    assert(safe?.workflow_lifecycle==='PROPERTY_SAVED'&&safe.property_link_status==='PROPERTY_LINKED'&&safe.linked_property_summary?.id===AUTHORIZED.propertyId,'LIFECYCLE_DERIVATION_MISMATCH');
    report.lifecycle={workflowLifecycle:safe.workflow_lifecycle,propertyLinkStatus:safe.property_link_status,linkedPropertyId:safe.linked_property_summary.id};
    report.propertyEvidenceFingerprint=beforeFingerprint.evidence.fingerprint;report.status='PASS — SINGLE 3484 HAVEN LINK CERTIFIED';
  }finally{await reopenDb?.close();await db.close();}
}

try{await main();}catch(error){report.status='STOP_BEFORE_WRITE';report.error=safeError(error);process.exitCode=1;}
await writeJson('data/validation/sprint6_3_3-reconciliation-apply.json',report);
console.log(JSON.stringify(report,null,2));
