import {audit} from './db.js';

export async function findPropertyByAddress(tx, normalizedAddress) {
  const {rows} = await tx.query('SELECT * FROM properties WHERE normalized_address = $1 LIMIT 1', [normalizedAddress]);
  return rows[0] ?? null;
}

export async function insertOrReuseProperty(tx, value) {
  const {rows} = await tx.query(`
    INSERT INTO properties (normalized_address,address_line1,city,state,postal_code,county,latitude,longitude,property_type,apn,atn,provider_property_id,identity_status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (normalized_address) DO UPDATE SET updated_at = properties.updated_at
    RETURNING *`, [value.normalizedAddress, value.addressLine1, value.city, value.state,
    value.postalCode, value.county, value.latitude, value.longitude, value.propertyType,
    value.apn, value.atn, value.providerPropertyId, value.identityStatus ?? 'UNCONFIRMED']);
  return rows[0];
}

export async function insertAliases(tx, propertyId, aliases = []) {
  for (const alias of aliases) {
    await tx.query(`INSERT INTO property_aliases
      (property_id,alias_type,address_text,normalized_address,source)
      VALUES ($1,$2,$3,$4,$5)`, [propertyId, alias.aliasType, alias.addressText,
      alias.normalizedAddress, alias.source]);
  }
}

export async function listProperties(tx, {search = '', includeArchived = false, limit = 100} = {}) {
  const {rows} = await tx.query(`
    SELECT p.*, (SELECT count(*)::int FROM deals d WHERE d.property_id = p.id) AS deal_count,
      (SELECT e.retrieved_at FROM evidence_snapshots e WHERE e.property_id = p.id ORDER BY e.retrieved_at DESC LIMIT 1) AS latest_evidence_at,
      (SELECT v.estimated_value FROM valuations v WHERE v.property_id = p.id ORDER BY v.effective_at DESC NULLS LAST, v.created_at DESC LIMIT 1) AS latest_avm
    FROM properties p
    WHERE ($1 = '' OR p.normalized_address ILIKE '%' || lower($1) || '%' OR p.address_line1 ILIKE '%' || $1 || '%')
      AND ($2 OR p.archived_at IS NULL)
    ORDER BY p.updated_at DESC LIMIT $3`, [search.toLowerCase(), includeArchived, Math.min(Math.max(Number(limit) || 100, 1), 200)]);
  return rows;
}

export async function getProperty(tx, id) {
  const {rows} = await tx.query('SELECT * FROM properties WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function archiveProperty(tx, id, archived = true) {
  const {rows} = await tx.query('UPDATE properties SET archived_at = CASE WHEN $2 THEN COALESCE(archived_at, now()) ELSE NULL END, updated_at = now() WHERE id = $1 RETURNING *', [id, archived]);
  if (rows[0]) await audit(tx, {aggregateType: 'property', aggregateId: id, eventType: archived ? 'ARCHIVED' : 'UNARCHIVED'});
  return rows[0] ?? null;
}
