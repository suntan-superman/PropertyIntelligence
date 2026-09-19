export async function listDiscoverySignals(tx, propertyId) {
  const {rows} = await tx.query('SELECT * FROM discovery_signals WHERE property_id=$1 ORDER BY source_date DESC NULLS LAST,created_at DESC', [propertyId]);
  return rows;
}
