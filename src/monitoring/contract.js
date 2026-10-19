export const EVENT_EVIDENCE = Object.freeze({
  RECORDED_EVENT: 'RECORDED_EVENT', PROVIDER_MODEL_UPDATE: 'PROVIDER MODEL UPDATE',
  PI_DERIVED_CHANGE: 'PI DERIVED CHANGE', UNRESOLVED: 'UNRESOLVED / REQUIRES REVIEW'
});
export const MONITORING_EVENT_TYPES = Object.freeze([
  'NEW_NOD', 'NEW_NOTICE_OF_TRUSTEE_SALE', 'NEW_FORECLOSURE_TRANSACTION', 'AUCTION_DATE_ADDED', 'AUCTION_DATE_CHANGED',
  'FORECLOSURE_STATUS_CHANGED', 'FORECLOSURE_RECORD_DISAPPEARED', 'FORECLOSURE_STATE_UNRESOLVED',
  'NEW_RECORDED_MORTGAGE', 'NEW_RECORDED_TRANSACTION', 'MORTGAGE_ASSIGNMENT', 'MORTGAGE_RELEASE',
  'LOAN_MODEL_CHANGE', 'LOAN_POSITION_CHANGED', 'RECORDED_TRANSACTION_CORRECTED', 'RECORDED_TRANSACTION_INVALIDATED',
  'PROPERTY_IDENTITY_CHANGED', 'NEW_TAX_DELINQUENCY', 'TAX_BALANCE_CHANGED', 'TAX_REDEMPTION', 'TAX_SALE_SCHEDULED', 'TAX_SALE_POSTPONED'
]);

const required = ['source_system', 'source_dataset', 'event_type', 'evidence_classification'];
export function stableFingerprint(value) {
  // Stable local deduplication key; deliberately not a cryptographic identity or security control.
  const input = JSON.stringify(value); let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i++) { hash ^= BigInt(input.charCodeAt(i)); hash = BigInt.asUintN(64, hash * 0x100000001b3n); }
  return hash.toString(16).padStart(16, '0');
}

export function normalizeMonitoringEvent(input, { detectedAt = new Date().toISOString() } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Event must be an object.');
  for (const key of required) if (typeof input[key] !== 'string' || !input[key].trim()) throw new TypeError(`Missing ${key}.`);
  const hasIdentity = Boolean(input.attom_id || input.canonical_property_id);
  return Object.freeze({
    event_id: input.event_id || stableFingerprint({ source: input.source_system, dataset: input.source_dataset, key: input.source_transaction_id || input.source_record_fingerprint, type: input.event_type, current: input.current_value }),
    source_system: input.source_system, source_dataset: input.source_dataset,
    source_transaction_id: input.source_transaction_id ?? null, attom_id: input.attom_id ?? null,
    canonical_property_id: input.canonical_property_id ?? null, event_type: input.event_type,
    event_subtype: input.event_subtype ?? null, event_date: input.event_date ?? null,
    raw_event_code: input.raw_event_code ?? null,
    recorded_date: input.recorded_date ?? null, publication_date: input.publication_date ?? null,
    detected_at: input.detected_at || detectedAt, previous_value: input.previous_value ?? null,
    current_value: input.current_value ?? null, change_summary: input.change_summary ?? '',
    evidence_classification: input.evidence_classification, confidence: input.confidence ?? 'UNKNOWN',
    materiality: input.materiality ?? 'UNRESOLVED', recommended_action: input.recommended_action ?? 'Review source evidence before acting.',
    processing_status: input.processing_status ?? 'NEW', source_delivery_id: input.source_delivery_id ?? null,
    source_record_fingerprint: input.source_record_fingerprint ?? null, source_evidence_reference: input.source_evidence_reference ?? null,
    previous_record_version: input.previous_record_version ?? null, current_record_version: input.current_record_version ?? null,
    supersedes_event_id: input.supersedes_event_id ?? null,
    data_quality_warnings: Array.isArray(input.data_quality_warnings) ? [...input.data_quality_warnings] : [],
    identity_reconciliation_status: input.identity_reconciliation_status ?? (hasIdentity ? 'IDENTITY_PRESENT_NOT_VERIFIED' : 'MISSING_IDENTITY'),
    geographic_scope_status: input.geographic_scope_status ?? 'UNKNOWN', source_code_status: input.source_code_status ?? 'UNKNOWN',
    opportunity_status: input.opportunity_status ?? null, existing_distress_stage: input.existing_distress_stage ?? null,
    previously_known: input.previously_known === true,
    synthetic: input.synthetic === true, publication_only: input.publication_only === true,
    review_status: input.review_status ?? 'OPEN'
  });
}

// Aggregate certification metrics are not row-level evidence; do not infer fake events from counts.
export function adaptCertifiedReplayRows({ deliveryId, sourceDataset, rows, sourceSystem = 'ATTOM' }) {
  if (!deliveryId || !sourceDataset || !Array.isArray(rows)) throw new TypeError('A delivery, dataset and sanitized row array are required.');
  return rows.map((row) => normalizeMonitoringEvent({ ...row, source_system: sourceSystem, source_dataset: sourceDataset, source_delivery_id: deliveryId }));
}
export function aggregateOnlyReplayNotice(metrics) {
  if (!metrics || typeof metrics !== 'object') throw new TypeError('Replay metrics are required.');
  return { kind: 'AGGREGATE_ONLY', eventRowsCreated: 0, note: 'Certified replay metrics contain aggregate counts only; no row-level monitoring events were inferred.' };
}
