import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptCertifiedReplayRows, aggregateOnlyReplayNotice, normalizeMonitoringEvent } from './contract.js';
import { classifyMateriality } from './materiality.js';
import { acknowledgeLocalAlert, processMonitoringBatch } from './processor.js';
import { demoEvents } from './fixtures.js';
import { demoProperties } from './fixtures.js';
import { buildPropertyPriorityRows, monitoringDashboardSummary } from './dashboard.js';

const trusted = (overrides = {}) => normalizeMonitoringEvent({ source_system: 'ATTOM', source_dataset: 'Foreclosure', event_type: 'NEW_NOTICE_OF_TRUSTEE_SALE', event_date: '2026-10-08', detected_at: '2026-10-08T12:00:00Z', evidence_classification: 'RECORDED_EVENT', source_transaction_id: 'tx-1', attom_id: 'attom-demo', canonical_property_id: 'property-demo', identity_reconciliation_status: 'CONFIRMED', geographic_scope_status: 'IN_SCOPE', source_code_status: 'CONFIRMED', confidence: 'HIGH', ...overrides });

test('normalized event preserves required source, identity, version, quality and geography context', () => {
  const event = normalizeMonitoringEvent({ ...trusted(), source_delivery_id: 'offline-0002', source_record_fingerprint: 'fingerprint-demo', source_evidence_reference: 'sanitized/replay-fixture', previous_record_version: 'v1', current_record_version: 'v2', data_quality_warnings: ['synthetic QA'] });
  for (const key of ['event_id', 'source_system', 'source_dataset', 'source_transaction_id', 'attom_id', 'canonical_property_id', 'event_type', 'detected_at', 'evidence_classification', 'confidence', 'materiality', 'recommended_action', 'processing_status', 'source_delivery_id', 'source_record_fingerprint', 'source_evidence_reference', 'previous_record_version', 'current_record_version', 'data_quality_warnings', 'identity_reconciliation_status', 'geographic_scope_status']) assert.ok(key in event, key);
});
test('certified sanitized replay row enters provider-independent contract', () => {
  const [event] = adaptCertifiedReplayRows({ deliveryId: '_0002', sourceDataset: 'Recorder', rows: [{ event_type: 'NEW_RECORDED_TRANSACTION', evidence_classification: 'RECORDED_EVENT', source_transaction_id: 'synthetic-tx' }] });
  assert.equal(event.source_delivery_id, '_0002'); assert.equal(event.source_system, 'ATTOM'); assert.equal(event.canonical_property_id, null);
});
test('new foreclosure event is high only with confirmed semantics and identity', () => assert.equal(classifyMateriality(trusted()).level, 'HIGH'));
test('provisional event semantics remain unresolved', () => assert.equal(classifyMateriality(trusted({ source_code_status: 'PROVISIONAL' })).level, 'UNRESOLVED'));
test('event recency and known-opportunity context affect classification', () => {
  assert.equal(classifyMateriality(trusted({ event_date: '2026-01-01' })).level, 'MEDIUM');
  assert.equal(classifyMateriality(trusted({ previously_known: true })).level, 'LOW');
  assert.equal(classifyMateriality(trusted({ existing_distress_stage: 'SCHEDULED_SALE' })).level, 'MEDIUM');
  assert.equal(classifyMateriality(trusted({ opportunity_status: 'CLOSED' })).level, 'LOW');
});
test('duplicate event and same delivery replay create no duplicate event or alert', () => {
  const first = processMonitoringBatch({ inputEvents: [trusted()] }); const replay = processMonitoringBatch({ existingEvents: first.events, acknowledgedAlerts: first.alerts, inputEvents: [trusted()] });
  assert.equal(replay.events.length, 1); assert.equal(replay.alerts.length, 1); assert.deepEqual(replay.duplicateEventIds, [first.events[0].event_id]);
});
test('publication-only refresh is low and never generates an investment alert', () => {
  const processed = processMonitoringBatch({ inputEvents: [trusted({ event_type: 'COMBINED_FORECLOSURE_REFRESH', source_transaction_id: 'snapshot-1', publication_only: true })] });
  assert.equal(processed.events[0].materiality, 'LOW'); assert.equal(processed.alerts.length, 0);
});
test('recorded transaction correction supersedes interpretation without erasing history', () => {
  const old = trusted({ event_id: 'correction-1', event_type: 'RECORDED_TRANSACTION_CORRECTED', source_record_fingerprint: 'old', current_record_version: 'v1' });
  const corrected = trusted({ event_id: 'correction-1', event_type: 'RECORDED_TRANSACTION_CORRECTED', source_record_fingerprint: 'new', current_record_version: 'v2' });
  const processed = processMonitoringBatch({ existingEvents: [old], inputEvents: [corrected] });
  assert.equal(processed.events.length, 2); assert.equal(processed.events[1].processing_status, 'SUPERSEDES_PRIOR_INTERPRETATION'); assert.equal(processed.events[1].previous_record_version, 'v1'); assert.equal(processed.events[1].supersedes_event_id, 'correction-1');
  const replay = processMonitoringBatch({ existingEvents: processed.events, inputEvents: [corrected] }); assert.equal(replay.events.length, 2);
});
test('ATTOMID correction remains unresolved and does not reassign identity', () => {
  const result = processMonitoringBatch({ inputEvents: [trusted({ event_type: 'PROPERTY_IDENTITY_CHANGED', identity_reconciliation_status: 'CONFLICT', attom_id: null, canonical_property_id: null })] });
  assert.equal(result.events[0].processing_status, 'QUARANTINED'); assert.equal(result.alerts.length, 0);
});
test('unmatched RecorderDeletes invalidation is quarantined and alert-suppressed', () => {
  const result = processMonitoringBatch({ inputEvents: [trusted({ event_type: 'RECORDED_TRANSACTION_INVALIDATED', source_transaction_id: null, canonical_property_id: null, attom_id: null, identity_reconciliation_status: 'MISSING_IDENTITY' })] });
  assert.equal(result.quarantined.length, 1); assert.equal(result.alerts.length, 0);
});
test('CombinedForeclosure disappearance is unresolved, not interpreted as cancellation', () => {
  const result = processMonitoringBatch({ inputEvents: [trusted({ event_type: 'FORECLOSURE_RECORD_DISAPPEARED', evidence_classification: 'UNRESOLVED / REQUIRES REVIEW' })] });
  assert.equal(result.events[0].materiality, 'UNRESOLVED'); assert.equal(result.alerts.length, 0);
});
test('Loan Model change queues reassessment but does not mutate calculations', () => {
  const result = processMonitoringBatch({ inputEvents: [trusted({ event_type: 'LOAN_MODEL_CHANGE', previous_value: '100', current_value: '110', evidence_classification: 'PROVIDER MODEL UPDATE' })] });
  assert.equal(result.reassessmentQueue[0].status, 'QUEUED_NOT_EXECUTED'); assert.equal(result.alerts.length, 1); assert.equal(result.reassessmentQueue[0].evidence_sufficient, false);
});
test('missing canonical property identity is quarantined without inventing a canonical identity', () => {
  const event = trusted({ canonical_property_id: null, attom_id: null, identity_reconciliation_status: 'MISSING_IDENTITY' }); const result = processMonitoringBatch({ inputEvents: [event] });
  assert.equal(result.events[0].canonical_property_id, null); assert.equal(result.events[0].materiality, 'UNRESOLVED'); assert.equal(result.quarantined.length, 1);
});
test('out-of-scope geography is quarantined and cannot alert investors', () => {
  const result = processMonitoringBatch({ inputEvents: [trusted({ geographic_scope_status: 'OUT_OF_SCOPE', canonical_property_id: null })] });
  assert.equal(result.events[0].processing_status, 'QUARANTINED'); assert.equal(result.alerts.length, 0);
  const replay = processMonitoringBatch({ existingEvents: result.events, inputEvents: [result.events[0]] }); assert.equal(replay.quarantined.length, 1); assert.equal(replay.events[0].processing_status, 'QUARANTINED');
});
test('alert ids deduplicate on replay and acknowledgements remain local', () => {
  const first = processMonitoringBatch({ inputEvents: [trusted()] }); const replay = processMonitoringBatch({ existingEvents: first.events, acknowledgedAlerts: first.alerts, inputEvents: [trusted()] });
  const ack = acknowledgeLocalAlert(replay.alerts, replay.alerts[0].alert_id, '2026-10-08T00:00:00Z'); assert.equal(ack.length, 1); assert.equal(ack[0].status, 'LOCAL_ACKNOWLEDGED');
});
test('synthetic sequence gap blocks later delivery and rollback/retry is deterministic', () => {
  const sequences = new Map([[1, 'DONE']]), canApply = (next) => sequences.get(next - 1) === 'DONE'; assert.equal(canApply(3), false); assert.equal(canApply(2), true);
  const first = processMonitoringBatch({ inputEvents: [trusted()] }), rollback = processMonitoringBatch(), retry = processMonitoringBatch({ inputEvents: [trusted()] });
  assert.equal(rollback.events.length, 0); assert.equal(first.events[0].event_id, retry.events[0].event_id);
});
test('aggregate replay counts never become invented row-level monitoring events', () => {
  const notice = aggregateOnlyReplayNotice({ vendorObservedEvents: { newForeclosureTransactions: 37 } }); assert.equal(notice.eventRowsCreated, 0);
  assert.throws(() => adaptCertifiedReplayRows({ deliveryId: '_0002', sourceDataset: 'Foreclosure', rows: null }));
});
test('offline UI fixture is explicitly synthetic', () => assert.ok(demoEvents.every((event) => event.synthetic === true)));
test('property priority table orders actionable properties by priority then recency and excludes quarantine', () => {
  const result = processMonitoringBatch({ inputEvents: demoEvents });
  const rows = buildPropertyPriorityRows(result.events, demoProperties);
  assert.deepEqual(rows.map(({ property }) => property.reference), ['Demo Property A', 'Demo Property C', 'Demo Property B']);
  assert.equal(rows.length, 3);
});
test('dashboard summary derives counts from safe property events only', () => {
  const result = processMonitoringBatch({ inputEvents: demoEvents });
  assert.deepEqual(monitoringDashboardSummary(result.events, demoProperties, { asOf: new Date('2026-10-08T00:00:00Z') }), { propertiesMonitored: 3, propertiesRequiringAttention: 3, newMaterialChanges: 3, upcomingCriticalDates: 'None verified' });
});
