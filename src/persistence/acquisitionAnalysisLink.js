import {createHash} from 'node:crypto';
import {isUuid} from './db.js';

const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
export const linkageFingerprint=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');

// Exact IDs only. This boundary deliberately has no history/latest query.
export async function acquisitionAnalysisLink(tx,{propertyId,dealId,evidenceSnapshotId,analysisSnapshotId}) {
  if(!dealId||!analysisSnapshotId)throw new Error('DECISION_ANALYSIS_LINK_REQUIRED');
  for(const [name,id] of Object.entries({property_id:propertyId,deal_id:dealId,evidence_snapshot_id:evidenceSnapshotId,analysis_snapshot_id:analysisSnapshotId})){
    if(!isUuid(id))throw new Error(`INVALID_${name.toUpperCase()}`);
  }
  const analysis=(await tx.query('SELECT * FROM analysis_snapshots WHERE id=$1',[analysisSnapshotId])).rows[0];
  if(!analysis)throw new Error('DECISION_ANALYSIS_LINK_REQUIRED');
  if(analysis.property_id!==propertyId)throw new Error('DECISION_ANALYSIS_PROPERTY_MISMATCH');
  if(analysis.deal_id!==dealId)throw new Error('DECISION_ANALYSIS_DEAL_MISMATCH');
  if(analysis.evidence_snapshot_id!==evidenceSnapshotId)throw new Error('DECISION_ANALYSIS_EVIDENCE_MISMATCH');
  const deal=(await tx.query('SELECT id FROM deals WHERE id=$1 AND property_id=$2',[dealId,propertyId])).rows[0];
  if(!deal)throw new Error('DEAL_NOT_LINKED');
  const evidence=(await tx.query('SELECT id FROM evidence_snapshots WHERE id=$1 AND property_id=$2',[evidenceSnapshotId,propertyId])).rows[0];
  if(!evidence)throw new Error('EVIDENCE_NOT_LINKED');
  if(!analysis.outputs_payload?.base)throw new Error('ANALYSIS_REQUIRED');
  return {propertyId,dealId,evidenceSnapshotId,analysisSnapshotId,analysisModelFingerprint:analysis.model_fingerprint,
    analysisContentFingerprint:linkageFingerprint({inputs:analysis.inputs_payload,outputs:analysis.outputs_payload}),version:'exact-analysis-link-v1'};
}
