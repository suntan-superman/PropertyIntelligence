import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createDatabase} from '../src/persistence/db.js';
import {writeJson} from '../src/io/files.js';

// Read-only certification. Never updates historical rows or prints business payloads.
try { process.loadEnvFile('.env'); } catch {}
const db=createDatabase();
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const historicalIds=['1fd6b398-6cae-4e76-aa0f-45e781bc9c95','4aff0c24-ff7c-40bb-9287-c5e98cf2fbeb','322e58d6-a664-4dfd-ba3b-15ed38b54885','2cd6bfc1-8b8c-4d07-8e5d-f73b599ac5b6','87c8c229-579a-4c8b-ad6e-4e3fe77b2c67','0b7a3d79-b9db-436a-b9ae-8647227d891d'];
try {
  const result=await db.transaction(async tx=>{
    await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const decisions=(await tx.query('SELECT * FROM acquisition_decisions WHERE id=ANY($1::uuid[]) ORDER BY created_at,id',[historicalIds])).rows;
    const records=[];
    for(const d of decisions){
      const analyses=d.deal_id?(await tx.query('SELECT * FROM analysis_snapshots WHERE deal_id=$1 ORDER BY created_at,id',[d.deal_id])).rows:[];
      const audit=(await tx.query('SELECT event_type,event_payload,request_key,created_at FROM audit_events WHERE aggregate_id=$1 ORDER BY created_at',[d.id])).rows;
      const compatible=analyses.filter(a=>a.property_id===d.property_id&&a.evidence_snapshot_id===d.evidence_snapshot_id);
      const references=[d.analysis_snapshot_id,d.inputs_payload?.analysisSnapshotId,d.inputs_payload?.analysisLink?.analysisSnapshotId,d.outputs_payload?.analysisLink?.analysisSnapshotId,...audit.map(a=>a.event_payload?.analysisSnapshotId)].filter(Boolean);
      // Matching ownership, timestamps, or a lone candidate are not derivation proof.
      // No generic automatic exact-repair heuristic: explicit historical proof needs review.
      const classification=references.length?'AMBIGUOUS':compatible.length?'AMBIGUOUS':'UNRECOVERABLE';
      records.push({decisionId:d.id,propertyId:d.property_id,dealId:d.deal_id,evidenceSnapshotId:d.evidence_snapshot_id,analysisSnapshotId:d.analysis_snapshot_id,createdAt:d.created_at,classification,
        decisionRowHash:digest(d),decisionFingerprint:d.model_fingerprint,inputHash:digest(d.inputs_payload),outputHash:digest(d.outputs_payload),auditHash:digest(audit),auditEventCount:audit.length,
        explicitAnalysisReferences:[...new Set(references)],inputKeys:Object.keys(d.inputs_payload??{}),outputKeys:Object.keys(d.outputs_payload??{}),
        candidates:analyses.map(a=>({analysisSnapshotId:a.id,propertyId:a.property_id,evidenceSnapshotId:a.evidence_snapshot_id,createdAt:a.created_at,modelFingerprint:a.model_fingerprint,inputHash:digest(a.inputs_payload),outputHash:digest(a.outputs_payload),sameEvidence:a.evidence_snapshot_id===d.evidence_snapshot_id,createdBeforeDecision:new Date(a.created_at)<=new Date(d.created_at)})),
        reason:references.length?'Explicit reference found; independent proof review required before any mapping.':compatible.length?'No persisted analysis ID or derivation fingerprint in decision inputs, outputs, or decision audit. Ownership/evidence compatibility and timestamps cannot establish exact derivation.':'No linked Deal/compatible Analysis and no persisted derivation reference; exact linkage cannot be recovered from the retained records.'});
    }
    return {at:new Date().toISOString(),readOnly:true,decisionCount:records.length,records,repairMapping:[],historicalWrites:0,providerCalls:0};
  });
  await writeJson('data/validation/sprint6_1_1-historical-audit.json',result);
  const lines=['# Sprint 6.1.1 historical linkage audit','',`Read-only audit: ${result.at}. ${result.decisionCount} decisions examined before any patch certification writes. No historical records changed.`, '',
    '| Decision | Classification | Deal | Compatible analyses |','| --- | --- | --- | --- |',...result.records.map(r=>`| ${r.decisionId} | ${r.classification} | ${r.dealId??'Missing'} | ${r.candidates.filter(a=>a.sameEvidence&&a.propertyId===r.propertyId).length} |`),'',
    ...result.records.flatMap(r=>[`## ${r.decisionId}`,'',r.reason,'',`Evidence: ${r.evidenceSnapshotId}. Row SHA-256: ${r.decisionRowHash}. Audit events: ${r.auditEventCount}. Explicit Analysis references: ${r.explicitAnalysisReferences.length}.`,'']),
    '## Repair mapping / implementation review gate','',
    'The explicit one-time repair mapping is empty. No LINKABLE_EXACT decision is established by this audit. No historical repair is authorized or applied. All six remain unchanged and REPORT_HISTORICAL_LINK_REQUIRED remains the required report response. Same-Deal, compatible Evidence, a lone Analysis, and nearest timestamps are deliberately insufficient.', '',
    'Machine evidence contains candidate IDs, fingerprints, payload hashes, timestamps and original row hashes in data/validation/sprint6_1_1-historical-audit.json. It contains no raw claims, connection strings or provider credentials. Inputs/outputs were inspected in memory; candidate matches do not prove which Analysis was used. Any future exact mapping must be independently proven and reviewed before a one-time audited repair.',''];
  await writeFile('docs/SPRINT6_1_1_HISTORICAL_LINK_AUDIT.md',lines.join('\n'));
  console.log(JSON.stringify({status:'AUDIT_COMPLETE',decisions:result.decisionCount,classifications:result.records.map(r=>({decisionId:r.decisionId,classification:r.classification,candidates:r.candidates.length,references:r.explicitAnalysisReferences.length})),repairMappings:0,historicalWrites:0,providerCalls:0}));
} catch {console.log(JSON.stringify({status:'STOP',error:'SANITIZED_AUDIT_FAILURE'}));process.exitCode=1;} finally {await db?.close();}
