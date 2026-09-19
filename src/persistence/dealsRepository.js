import {audit} from './db.js';

export async function insertDeal(tx, value) {
  const {rows} = await tx.query(`INSERT INTO deals (property_id,name,deal_status,origin,sponsor_name)
    VALUES ($1,$2,$3,$4,$5) RETURNING *`, [value.propertyId,value.name,value.dealStatus ?? 'DRAFT',value.origin ?? 'ANALYST_ENTERED',value.sponsorName ?? null]);
  return rows[0];
}

export async function insertClaims(tx, dealId, claims = []) {
  const rows = [];
  for (const claim of claims) {
    const numeric = typeof claim.value === 'number' ? claim.value : claim.valueNumeric ?? null;
    const text = numeric == null && typeof claim.value === 'string' ? claim.value : claim.valueText ?? null;
    const valueJson = numeric == null && text == null && claim.value != null ? claim.value : claim.valueJson ?? null;
    const {rows: inserted} = await tx.query(`INSERT INTO deal_claims
      (deal_id,field_key,value_numeric,value_text,value_json,unit,origin,status,cash_timing,source_description)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10) RETURNING *`, [dealId,claim.field ?? claim.fieldKey,numeric,text,
      valueJson == null ? null : JSON.stringify(valueJson),claim.unit ?? null,claim.origin ?? claim.suppliedBy ?? 'ANALYST_ENTERED',
      claim.status ?? (claim.value === null ? 'UNKNOWN' : 'SUPPLIED'),claim.cashTiming ?? claim.timing ?? null,claim.sourceDescription ?? claim.sourceDocument ?? null]);
    rows.push(inserted[0]);
  }
  return rows;
}

export async function insertDiligence(tx, dealId, analysisId, items = []) {
  for (const item of items) await tx.query(`INSERT INTO diligence_items
    (deal_id,analysis_snapshot_id,category,question_key,question_text,materiality,status,related_fields,answer_text,resolved_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`, [dealId,analysisId,item.category ?? 'General',item.questionKey ?? item.id,
    item.questionText ?? item.question ?? '',item.materiality ?? null,item.status ?? 'UNANSWERED',JSON.stringify(item.relatedFields ?? item.fields ?? []),item.answerText ?? null,item.resolvedAt ?? null]);
}

export async function listDeals(tx, {includeArchived = false, search = '', limit = 100} = {}) {
  const {rows} = await tx.query(`SELECT d.*,p.address_line1,p.city,p.state,p.postal_code,
    (SELECT a.modeled_profit FROM analysis_snapshots a WHERE a.deal_id=d.id ORDER BY a.created_at DESC LIMIT 1) AS latest_modeled_profit,
    (SELECT a.cash_on_cash FROM analysis_snapshots a WHERE a.deal_id=d.id ORDER BY a.created_at DESC LIMIT 1) AS latest_cash_on_cash,
    (SELECT a.created_at FROM analysis_snapshots a WHERE a.deal_id=d.id ORDER BY a.created_at DESC LIMIT 1) AS latest_analysis_at
    FROM deals d JOIN properties p ON p.id=d.property_id WHERE ($1='' OR d.name ILIKE '%'||$1||'%' OR p.address_line1 ILIKE '%'||$1||'%')
      AND ($2 OR d.archived_at IS NULL) ORDER BY d.updated_at DESC LIMIT $3`, [search,includeArchived,Math.min(Math.max(Number(limit)||100,1),200)]);
  return rows;
}

export async function getDeal(tx, id) {
  const {rows} = await tx.query('SELECT * FROM deals WHERE id=$1', [id]);
  if (!rows[0]) return null;
  const claims = await tx.query('SELECT * FROM deal_claims WHERE deal_id=$1 AND superseded_at IS NULL ORDER BY created_at', [id]);
  return {...rows[0], claims: claims.rows};
}

export async function archiveDeal(tx, id, archived = true) {
  const {rows} = await tx.query("UPDATE deals SET archived_at=CASE WHEN $2 THEN COALESCE(archived_at,now()) ELSE NULL END, deal_status=CASE WHEN $2 THEN 'ARCHIVED' ELSE 'DRAFT' END, updated_at=now() WHERE id=$1 RETURNING *", [id,archived]);
  if (rows[0]) await audit(tx,{aggregateType:'deal',aggregateId:id,eventType:archived?'ARCHIVED':'UNARCHIVED'});
  return rows[0] ?? null;
}
