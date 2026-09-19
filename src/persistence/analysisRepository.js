export async function insertAnalysisSnapshot(tx, value) {
  const {rows} = await tx.query(`INSERT INTO analysis_snapshots
    (deal_id,property_id,evidence_snapshot_id,analysis_version,model_fingerprint,cost_completeness,modeled_proceeds,cash_invested,modeled_profit,cash_on_cash,break_even_sale_price,inputs_payload,outputs_payload,warnings_payload)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb) RETURNING *`, [value.dealId,value.propertyId,value.evidenceSnapshotId ?? null,
    value.analysisVersion ?? 'sprint4-deterministic-v1',value.modelFingerprint,value.costCompleteness ?? 'INCOMPLETE',value.modeledProceeds,
    value.cashInvested,value.modeledProfit,value.cashOnCash,value.breakEvenSalePrice,JSON.stringify(value.inputsPayload ?? {}),JSON.stringify(value.outputsPayload ?? {}),JSON.stringify(value.warningsPayload ?? [])]);
  return rows[0];
}

export async function analysisHistory(tx, dealId) {
  const {rows} = await tx.query('SELECT * FROM analysis_snapshots WHERE deal_id=$1 ORDER BY created_at DESC', [dealId]);
  return rows;
}

export async function getAnalysis(tx, id) {
  const {rows} = await tx.query('SELECT * FROM analysis_snapshots WHERE id=$1', [id]);
  return rows[0] ?? null;
}
