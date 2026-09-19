export async function insertEvidenceSnapshot(tx, value) {
  const {rows} = await tx.query(`INSERT INTO evidence_snapshots
    (property_id,source,source_record_id,retrieved_at,snapshot_type,status,property_payload,valuation_payload,tax_payload,assessment_payload,sale_history_payload,features_payload,legal_payload,provenance_payload,raw_reference)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15) RETURNING *`,
    [value.propertyId,value.source,value.sourceRecordId,value.retrievedAt,value.snapshotType,value.status,
      JSON.stringify(value.propertyPayload ?? {}),JSON.stringify(value.valuationPayload ?? {}),JSON.stringify(value.taxPayload ?? {}),
      JSON.stringify(value.assessmentPayload ?? {}),JSON.stringify(value.saleHistoryPayload ?? {}),JSON.stringify(value.featuresPayload ?? {}),
      JSON.stringify(value.legalPayload ?? {}),JSON.stringify(value.provenancePayload ?? {}),value.rawReference]);
  return rows[0];
}

export async function insertValuation(tx, value) {
  const {rows} = await tx.query(`INSERT INTO valuations
    (property_id,evidence_snapshot_id,source,valuation_type,estimated_value,low_value,high_value,effective_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [value.propertyId,value.evidenceSnapshotId,value.source,
    value.valuationType,value.estimatedValue,value.lowValue,value.highValue,value.effectiveAt]);
  return rows[0];
}

export async function insertComparableSnapshot(tx, value) {
  const {rows} = await tx.query('INSERT INTO comparable_snapshots (property_id,evidence_snapshot_id,source) VALUES ($1,$2,$3) RETURNING *', [value.propertyId,value.evidenceSnapshotId,value.source]);
  const snapshot = rows[0];
  for (const comp of value.comparables ?? []) {
    await tx.query(`INSERT INTO comparables
      (comparable_snapshot_id,provider_comp_id,address,latitude,longitude,property_type,status,price,price_label,bedrooms,bathrooms,square_feet,lot_size,year_built,distance_miles,days_on_market,correlation,land_tenure_status,provider_payload)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb)`, [snapshot.id,
      comp.providerCompId ?? comp.id ?? null,comp.address ?? 'Unknown address',comp.latitude,comp.longitude,
      comp.propertyType,comp.status,comp.price,comp.priceLabel,comp.bedrooms,comp.bathrooms,comp.squareFeet,
      comp.lotSize,comp.yearBuilt,comp.distanceMiles,comp.daysOnMarket,comp.correlation,comp.landTenureStatus ?? comp.tenure ?? 'UNKNOWN',JSON.stringify(comp.providerPayload ?? comp)]);
  }
  return snapshot;
}

export async function evidenceHistory(tx, propertyId) {
  const {rows} = await tx.query(`SELECT e.id,e.source,e.retrieved_at,e.status,e.snapshot_type,
    v.estimated_value,v.low_value,v.high_value,
    (SELECT count(*)::int FROM comparables c JOIN comparable_snapshots cs ON cs.id=c.comparable_snapshot_id WHERE cs.evidence_snapshot_id=e.id) AS comp_count
    FROM evidence_snapshots e LEFT JOIN valuations v ON v.evidence_snapshot_id=e.id
    WHERE e.property_id=$1 ORDER BY e.retrieved_at DESC,e.created_at DESC`, [propertyId]);
  return rows;
}

export async function getEvidence(tx, id) {
  const {rows} = await tx.query('SELECT * FROM evidence_snapshots WHERE id = $1', [id]);
  return rows[0] ?? null;
}
