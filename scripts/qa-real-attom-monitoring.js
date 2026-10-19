import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptCertifiedReplayRows } from '../src/monitoring/contract.js';
import { processMonitoringBatch } from '../src/monitoring/processor.js';
import { writeJson } from '../src/io/files.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const fixturePath = resolve(projectRoot, 'data/validation/monitoring-v1-1/real-attom-events.json');
const outputPath = 'data/validation/monitoring-v1-1/real-attom-certification-results.json';
const manifest = JSON.parse(await readFile(fixturePath, 'utf8'));
const inputs = manifest.events.map((row) => ({
  ...row,
  previous_value: row.source_dataset === 'LoanModel' ? row.previous_value.second_position_amount : row.previous_value,
  current_value: row.source_dataset === 'LoanModel' ? row.current_value.second_position_amount : row.current_value,
  source_record_fingerprint: row.current_record_fingerprint,
  previous_record_version: row.previous_record_fingerprint,
  current_record_version: row.current_record_fingerprint,
  detected_at: manifest.selectedAtUtc,
  confidence: 'UNKNOWN',
  recommended_action: row.event_type === 'RECORDED_TRANSACTION_INVALIDATED'
    ? 'Retain the Recorder tombstone; do not delete history without a matching source record.'
    : 'Review source evidence and resolve PI property identity before investor notification.'
}));
const normalized = inputs.map((input) => adaptCertifiedReplayRows({
  deliveryId: input.source_delivery_id,
  sourceDataset: input.source_dataset,
  rows: [input]
})[0]);
const first = processMonitoringBatch({ inputEvents: normalized });
const replay = processMonitoringBatch({ existingEvents: first.events, acknowledgedAlerts: first.alerts, inputEvents: normalized });
const rows = manifest.events.map((source) => {
  const processed = first.events.find((event) => event.source_record_fingerprint === source.current_record_fingerprint);
  assert.ok(processed, `Processed event missing for ${source.selection}`);
  const expectedGeography = source.source_dataset === 'RecorderDeletes' ? 'UNKNOWN' : 'IN_SCOPE';
  assert.equal(processed.event_type, source.event_type);
  assert.equal(processed.identity_reconciliation_status, source.identity_reconciliation_status);
  assert.equal(processed.geographic_scope_status, expectedGeography);
  assert.equal(processed.materiality, source.expected_materiality);
  assert.equal(processed.processing_status, source.expected_processing_status);
  const localAlert = first.alerts.some((alert) => alert.event_id === processed.event_id);
  assert.equal(localAlert, source.expected_alert);
  const replayDuplicate = replay.duplicateEventIds.includes(processed.event_id);
  assert.equal(replayDuplicate, true);
  return {
    selection: source.selection,
    source_delivery_id: source.source_delivery_id,
    source_dataset: source.source_dataset,
    stable_source_reference: source.source_evidence_reference,
    baseline_file_sha256: manifest.sourceDeliveries[source.source_dataset].baselineFileSha256,
    update_file_sha256: manifest.sourceDeliveries[source.source_dataset].updateFileSha256,
    source_transaction_id: source.source_transaction_id,
    attom_id: source.attom_id,
    source_fips: source.source_fips,
    event_type: processed.event_type,
    previous_current_comparison: { previous: source.previous_value, current: source.current_value },
    identity_status: processed.identity_reconciliation_status,
    geographic_status: processed.geographic_scope_status,
    materiality: processed.materiality,
    processing_result: processed.processing_status,
    local_alert_eligible: localAlert,
    quarantine_reason_count: processed.quarantine_reasons.length,
    replay_result: replayDuplicate ? 'DUPLICATE_SUPPRESSED' : 'NOT_DEDUPLICATED',
    source_record_fingerprint: source.current_record_fingerprint
  };
});

assert.equal(first.events.length, manifest.events.length);
assert.equal(first.quarantined.length, manifest.events.length);
assert.equal(first.alerts.length, 0);
assert.equal(replay.insertedEventIds.length, 0);
assert.equal(replay.duplicateEventIds.length, manifest.events.length);
assert.equal(replay.alerts.length, 0);
const output = {
  manifestVersion: 1,
  status: 'PASS',
  source: manifest.source,
  generatedAtUtc: manifest.selectedAtUtc,
  providerCalls: 0,
  productionDatabaseWrites: 0,
  events: rows,
  totals: {
    actualVendorEvents: rows.length,
    quarantined: first.quarantined.length,
    investorAlerts: first.alerts.length,
    replayDuplicatesSuppressed: replay.duplicateEventIds.length,
    replayInsertions: replay.insertedEventIds.length
  },
  investorReadyAlertCertification: 'NOT ACHIEVED — no verified PI canonical property identities were present.'
};
await writeJson(outputPath, output);
console.log(JSON.stringify({ status: output.status, totals: output.totals, investorReadyAlertCertification: output.investorReadyAlertCertification }, null, 2));
