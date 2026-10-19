import { classifyMateriality } from './materiality.js';
import { normalizeMonitoringEvent, stableFingerprint } from './contract.js';

function quarantineReasons(event) {
  const reasons = [];
  if (!event.attom_id && !event.canonical_property_id) reasons.push('No supported property identity is present.');
  if (event.identity_reconciliation_status !== 'CONFIRMED') reasons.push(`Identity status is ${event.identity_reconciliation_status}.`);
  if (event.geographic_scope_status !== 'IN_SCOPE') reasons.push(`Geographic scope is ${event.geographic_scope_status}.`);
  if (event.source_code_status === 'UNKNOWN') reasons.push('Source event-code semantics are unresolved.');
  if (event.event_type === 'RECORDED_TRANSACTION_INVALIDATED' && !event.source_transaction_id) reasons.push('Invalidation key is not matched to a source transaction.');
  return reasons;
}

export function processMonitoringBatch({ existingEvents = [], inputEvents = [], acknowledgedAlerts = [] } = {}) {
  const events = new Map(existingEvents.map((event) => [event.event_id, event]));
  const alerts = new Map(acknowledgedAlerts.map((alert) => [alert.alert_id, alert]));
  const quarantined = existingEvents.filter((event) => event.processing_status === 'QUARANTINED').map((event) => ({ event_id: event.event_id, reasons: event.quarantine_reasons ?? ['Review remains open; no safe identity/scope promotion is recorded.'] }));
  const reassessmentQueue = [], insertedEventIds = [], duplicateEventIds = [];
  for (const raw of inputEvents) {
    const event = normalizeMonitoringEvent(raw), previous = events.get(event.event_id);
    if (previous) {
      if (previous.source_record_fingerprint !== event.source_record_fingerprint && event.source_record_fingerprint) {
        const supersedingId = stableFingerprint({ prior_event_id: event.event_id, source_record_fingerprint: event.source_record_fingerprint });
        if (!events.has(supersedingId)) events.set(supersedingId, { ...event, event_id: supersedingId, supersedes_event_id: previous.event_id, processing_status: 'SUPERSEDES_PRIOR_INTERPRETATION', previous_record_version: previous.current_record_version ?? previous.previous_record_version ?? null });
        else duplicateEventIds.push(supersedingId);
      } else duplicateEventIds.push(event.event_id);
      continue;
    }
    const reasons = quarantineReasons(event), materiality = classifyMateriality(event);
    const processed = { ...event, materiality: materiality.level, materiality_rationale: materiality.rationale, processing_status: reasons.length ? 'QUARANTINED' : 'PROCESSED', quarantine_reasons: reasons };
    events.set(event.event_id, processed); insertedEventIds.push(event.event_id);
    if (reasons.length) { quarantined.push({ event_id: event.event_id, reasons }); continue; }
    if (event.publication_only) continue;
    if (['LOAN_MODEL_CHANGE', 'NEW_RECORDED_MORTGAGE', 'MORTGAGE_RELEASE', 'FORECLOSURE_STATUS_CHANGED', 'AUCTION_DATE_CHANGED'].includes(event.event_type)) reassessmentQueue.push({ trigger_id: stableFingerprint({ event_id: event.event_id, type: event.event_type }), event_id: event.event_id, canonical_property_id: event.canonical_property_id, status: 'QUEUED_NOT_EXECUTED', changed_fact: event.change_summary, calculations_that_may_be_affected: event.event_type === 'LOAN_MODEL_CHANGE' ? ['Estimated equity'] : ['Investment diligence assumptions'], evidence_sufficient: false, next_diligence: event.recommended_action });
    if (['HIGH', 'MEDIUM'].includes(materiality.level)) {
      const alert_id = stableFingerprint({ event_id: event.event_id, kind: 'LOCAL_MONITORING_ALERT' });
      if (!alerts.has(alert_id)) alerts.set(alert_id, { alert_id, property_id: event.canonical_property_id, event_id: event.event_id, severity: materiality.level, title: event.event_subtype || event.event_type.replaceAll('_', ' '), summary: event.change_summary, why_it_matters: materiality.rationale, recommended_action: event.recommended_action, source: event.source_system, evidence_as_of: event.publication_date || event.recorded_date || event.event_date, created_at: event.detected_at, acknowledged_at: null, status: 'LOCAL_NEW' });
    }
  }
  return { events: [...events.values()], alerts: [...alerts.values()], quarantined, reassessmentQueue, insertedEventIds, duplicateEventIds };
}
export function acknowledgeLocalAlert(alerts, alertId, acknowledgedAt = new Date().toISOString()) { return alerts.map((alert) => alert.alert_id === alertId ? { ...alert, acknowledged_at: acknowledgedAt, status: 'LOCAL_ACKNOWLEDGED' } : alert); }
