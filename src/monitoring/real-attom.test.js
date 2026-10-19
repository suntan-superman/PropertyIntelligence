import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { adaptCertifiedReplayRows } from './contract.js';
import { classifyMateriality } from './materiality.js';
import { processMonitoringBatch } from './processor.js';

const fixtureUrl = new URL('../../data/validation/monitoring-v1-1/real-attom-events.json', import.meta.url);
const manifest = JSON.parse(readFileSync(fileURLToPath(fixtureUrl), 'utf8'));
const expectedClasses = new Map([
  ['new_foreclosure_transaction', 'NEW_FORECLOSURE_TRANSACTION'],
  ['new_recorder_transaction', 'NEW_RECORDED_TRANSACTION'],
  ['corrected_recorder_transaction', 'RECORDED_TRANSACTION_CORRECTED'],
  ['recorder_attomid_mapping_correction', 'PROPERTY_IDENTITY_CHANGED'],
  ['loan_model_change', 'LOAN_MODEL_CHANGE'],
  ['unmatched_recorder_deletes_tombstone', 'RECORDED_TRANSACTION_INVALIDATED'],
  ['combined_foreclosure_publication_only', 'COMBINED_FORECLOSURE_REFRESH']
]);

function toPipelineInput(row) {
  const { selection, source_fips, previous_record_fingerprint, current_record_fingerprint, ...source } = row;
  const loanSecondPosition = row.source_dataset === 'LoanModel';
  return {
    ...source,
    previous_value: loanSecondPosition ? row.previous_value.second_position_amount : row.previous_value,
    current_value: loanSecondPosition ? row.current_value.second_position_amount : row.current_value,
    source_record_fingerprint: current_record_fingerprint,
    previous_record_version: previous_record_fingerprint,
    current_record_version: current_record_fingerprint,
    detected_at: manifest.selectedAtUtc,
    source_code_status: row.source_code_status,
    confidence: 'UNKNOWN',
    recommended_action: row.event_type === 'RECORDED_TRANSACTION_INVALIDATED'
      ? 'Retain the Recorder tombstone; do not delete history without a matching source record.'
      : 'Review source evidence and resolve PI property identity before investor notification.'
  };
}

test('sanitized fixture contains exactly the requested real source event classes and delivery fingerprints', () => {
  assert.equal(manifest.status, 'SANITIZED_REAL_VENDOR_ROW_FIXTURES');
  assert.equal(manifest.events.length, 7);
  assert.deepEqual(new Set(manifest.events.map(({ selection }) => selection)), new Set(expectedClasses.keys()));
  for (const row of manifest.events) {
    assert.equal(row.source_system, 'ATTOM');
    assert.equal(row.synthetic, undefined);
    assert.equal(row.event_type, expectedClasses.get(row.selection));
    assert.equal(row.canonical_property_id, null, 'ATTOM IDs are not PI canonical identities');
    assert.match(row.current_record_fingerprint, /^[a-f0-9]{64}$/);
    assert.match(manifest.sourceDeliveries[row.source_dataset].baselineFileSha256, /^[a-f0-9]{64}$/);
    assert.match(manifest.sourceDeliveries[row.source_dataset].updateFileSha256, /^[a-f0-9]{64}$/);
  }
  const json = JSON.stringify(manifest).toLowerCase();
  for (const forbidden of ['propertyaddress', 'borrowername', 'ownername', 'contactowner', 'phone', 'latitude', 'longitude']) assert.equal(json.includes(forbidden), false, forbidden);
  assert.equal(manifest.privacy.actualAddressesIncluded, false);
  assert.equal(manifest.privacy.ownerOrContactFieldsIncluded, false);
});

test('source comparisons preserve correction, mapping, loan, tombstone and publication-only meaning', () => {
  const correction = manifest.events.find(({ selection }) => selection === 'corrected_recorder_transaction');
  assert.notEqual(correction.previous_record_fingerprint, correction.current_record_fingerprint);
  assert.equal(correction.full_record_change_verified, true);
  assert.equal(correction.changed_field_names_withheld_for_privacy, true);

  const mapping = manifest.events.find(({ selection }) => selection === 'recorder_attomid_mapping_correction');
  assert.notEqual(mapping.previous_attom_id, mapping.current_attom_id);
  assert.equal(mapping.current_mapping_authoritative_per_vendor_guidance, true);
  assert.equal(mapping.prior_mapping_retained_in_history, true);
  assert.equal(mapping.identity_reconciliation_status, 'CONFLICT');

  const loan = manifest.events.find(({ selection }) => selection === 'loan_model_change');
  assert.notEqual(loan.previous_value.second_position_amount, loan.current_value.second_position_amount);
  assert.equal(loan.recorded_payoff_inferred, false);

  const tombstone = manifest.events.find(({ selection }) => selection === 'unmatched_recorder_deletes_tombstone');
  assert.equal(tombstone.tombstone_semantics_vendor_confirmed, true);
  assert.equal(tombstone.current_value.matched_recorder_history, false);
  assert.equal(tombstone.current_value.physical_delete, false);

  const refresh = manifest.events.find(({ selection }) => selection === 'combined_foreclosure_publication_only');
  assert.equal(refresh.publication_only, true);
  assert.equal(refresh.business_fields_unchanged, true);
  assert.notEqual(refresh.previous_value.publication_date, refresh.current_value.publication_date);
  assert.equal(manifest.vendorClarifications.fips55017Excluded, true);
  assert.ok(manifest.events.every(({ source_fips }) => source_fips !== '55017'));
});

test('real source events flow through normalization and classification, quarantine without PI identity, and replay idempotently', () => {
  const inputs = manifest.events.map(toPipelineInput);
  const normalized = inputs.map((input) => adaptCertifiedReplayRows({
    deliveryId: input.source_delivery_id,
    sourceDataset: input.source_dataset,
    rows: [input]
  })[0]);
  assert.equal(normalized.length, 7);
  for (const event of normalized) {
    assert.equal(event.synthetic, false);
    assert.equal(event.canonical_property_id, null);
    assert.equal(event.geographic_scope_status, event.source_dataset === 'RecorderDeletes' ? 'UNKNOWN' : 'IN_SCOPE');
    assert.equal(classifyMateriality(event).level, 'UNRESOLVED');
  }
  const loanEvent = normalized.find(({ event_type }) => event_type === 'LOAN_MODEL_CHANGE');
  assert.equal(loanEvent.previous_value, 0);
  assert.equal(loanEvent.current_value, 71535);

  const first = processMonitoringBatch({ inputEvents: normalized });
  assert.equal(first.events.length, 7);
  assert.equal(first.events.filter(({ processing_status }) => processing_status === 'QUARANTINED').length, 7);
  assert.equal(first.events.every(({ materiality }) => materiality === 'UNRESOLVED'), true);
  assert.equal(first.quarantined.length, 7);
  assert.equal(first.alerts.length, 0, 'No unverified ATTOM identity may become an investor-facing alert.');

  const replay = processMonitoringBatch({ existingEvents: first.events, acknowledgedAlerts: first.alerts, inputEvents: normalized });
  assert.equal(replay.events.length, first.events.length);
  assert.equal(replay.insertedEventIds.length, 0);
  assert.equal(replay.duplicateEventIds.length, 7);
  assert.equal(replay.alerts.length, 0);
  assert.equal(replay.quarantined.length, 7, 'Replay must retain quarantine, not promote the source events.');
});
