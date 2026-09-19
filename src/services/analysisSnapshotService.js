import {hash} from '../io/files.js';
import {insertAnalysisSnapshot,analysisHistory} from '../persistence/analysisRepository.js';

export function analysisInput(model, propertyId, dealId, evidenceSnapshotId = null) {
  const base = model.analysis?.base ?? {};
  const output = model.analysis ?? {};
  return {dealId,propertyId,evidenceSnapshotId,analysisVersion:'sprint4-deterministic-v1',modelFingerprint:hash(JSON.stringify({analysis:output,claims:model.claims})),
    costCompleteness:base.costCompleteness ?? 'INCOMPLETE',modeledProceeds:base.modeledProceeds ?? null,cashInvested:base.scenarioCashInvested ?? null,
    modeledProfit:base.modeledProfit ?? null,cashOnCash:base.cashOnCash ?? null,breakEvenSalePrice:output.breakEven?.salePrice ?? output.breakEven?.breakEvenSalePrice ?? null,
    inputsPayload:{claims:model.claims ?? [],property:model.property ?? {}},outputsPayload:output,warningsPayload:base.warnings ?? []};
}

export async function persistAnalysisSnapshot(tx, model, propertyId, dealId, evidenceSnapshotId, requestKey = null) {
  const input=analysisInput(model,propertyId,dealId,evidenceSnapshotId);
  return insertAnalysisSnapshot(tx,input);
}

export const readAnalysisHistory = ({db,dealId}) => { if (!db) throw new Error('DATABASE_NOT_CONFIGURED'); return db.transaction(tx => analysisHistory(tx,dealId)); };
