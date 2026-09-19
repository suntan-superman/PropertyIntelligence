export async function diligenceHistory(tx, dealId) {
  const {rows} = await tx.query('SELECT * FROM diligence_items WHERE deal_id=$1 ORDER BY created_at', [dealId]);
  return rows;
}
