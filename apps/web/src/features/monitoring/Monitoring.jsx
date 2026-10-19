import React, { useMemo, useState } from 'react';
import { demoDelivery, demoEvents, demoProperties } from '../../../../../src/monitoring/fixtures.js';
import { acknowledgeLocalAlert, processMonitoringBatch } from '../../../../../src/monitoring/processor.js';
import { buildPropertyPriorityRows, monitoringDashboardSummary } from '../../../../../src/monitoring/dashboard.js';

const initial = processMonitoringBatch({ inputEvents: demoEvents });
const priorityRank = { HIGH: 0, MEDIUM: 1, LOW: 2, UNRESOLVED: 3 };
const title = (value = '') => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value) => value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)) : 'Not provided';
const whenKey = (event) => event.event_date || event.recorded_date || event.publication_date || event.detected_at;
const evidenceLabel = (event) => event.evidence_classification === 'RECORDED_EVENT' ? 'Recorded event' : event.evidence_classification === 'PROVIDER MODEL UPDATE' ? 'Provider estimate' : event.evidence_classification === 'PI DERIVED CHANGE' ? 'PI calculation' : 'Unresolved';

export default function Monitoring() {
  const [mode, setMode] = useState('SYNTHETIC_DEMO');
  const [state, setState] = useState(initial);
  const [filters, setFilters] = useState({ priority: '', eventType: '', source: '', from: '', to: '', review: '' });
  const [includeInformational, setIncludeInformational] = useState(false);
  const [selectedId, setSelectedId] = useState(initial.events[0]?.event_id ?? null);
  const [replayNotice, setReplayNotice] = useState('');
  const allDemoEvents = state.events;
  const safeEvents = allDemoEvents.filter((event) => event.processing_status === 'PROCESSED' && event.canonical_property_id);
  const actionableEvents = safeEvents.filter((event) => ['HIGH', 'MEDIUM'].includes(event.materiality));
  const priorityRows = buildPropertyPriorityRows(safeEvents, demoProperties);
  const summary = monitoringDashboardSummary(state.events, demoProperties);
  const types = [...new Set(actionableEvents.concat(includeInformational ? safeEvents.filter((event) => event.materiality === 'LOW') : []).map((event) => event.event_type))];
  const sources = [...new Set(actionableEvents.concat(includeInformational ? safeEvents.filter((event) => event.materiality === 'LOW') : []).map((event) => event.source_system))];
  const eventAlert = new Map(state.alerts.map((alert) => [alert.event_id, alert]));
  const selected = allDemoEvents.find((event) => event.event_id === selectedId) ?? null;
  const selectedProperty = demoProperties.find((property) => property.id === selected?.canonical_property_id) ?? null;
  const filtered = useMemo(() => {
    const defaultRows = includeInformational ? safeEvents.filter((event) => ['HIGH', 'MEDIUM', 'LOW'].includes(event.materiality)) : actionableEvents;
    return defaultRows.filter((event) => {
      const date = String(whenKey(event) ?? '').slice(0, 10);
      const alert = eventAlert.get(event.event_id);
      return (!filters.priority || event.materiality === filters.priority)
        && (!filters.eventType || event.event_type === filters.eventType)
        && (!filters.source || event.source_system === filters.source)
        && (!filters.from || (date && date >= filters.from))
        && (!filters.to || (date && date <= filters.to))
        && (!filters.review || (filters.review === 'UNREAD' ? !alert?.acknowledged_at : Boolean(alert?.acknowledged_at)));
    }).sort((a, b) => priorityRank[a.materiality] - priorityRank[b.materiality] || whenKey(b).localeCompare(whenKey(a)));
  }, [safeEvents, actionableEvents, includeInformational, filters, state.alerts]);
  const alerts = [...state.alerts].sort((a, b) => priorityRank[a.severity] - priorityRank[b.severity] || String(b.created_at).localeCompare(String(a.created_at)));
  const timeline = selectedProperty ? safeEvents.filter((event) => event.canonical_property_id === selectedProperty.id).sort((a, b) => whenKey(a).localeCompare(whenKey(b))) : [];
  const selectedPropertyLatest = timeline.at(-1) ?? null;

  function replay() {
    const next = processMonitoringBatch({ existingEvents: state.events, acknowledgedAlerts: state.alerts, inputEvents: demoEvents });
    setState(next);
    setReplayNotice(`Synthetic replay complete · ${next.insertedEventIds.length} new events · ${next.duplicateEventIds.length} duplicates suppressed.`);
  }
  function acknowledge(alertId) { setState((current) => ({ ...current, alerts: acknowledgeLocalAlert(current.alerts, alertId) })); }
  function changeFilter(key, value) { setFilters((current) => ({ ...current, [key]: value })); }

  return <main className="monitoring-app v11" data-testid="monitoring-dashboard">
    <div className="monitoring-topline"><div><p className="eyebrow">LOCAL MONITORING · {mode === 'SYNTHETIC_DEMO' ? 'SYNTHETIC DEMONSTRATION' : 'CERTIFIED ATTOM EVIDENCE'}</p><h1>Property monitoring</h1><p>Investor intelligence for what changed, why it matters, and what to investigate next.</p><span className="monitoring-update">Last completed source update · {dateLabel(demoDelivery.updatePublicationDate)}</span></div><a className="monitoring-exit" href="#analyze">Return to Property Intelligence</a></div>

    <div className="monitoring-mode-tabs" role="tablist" aria-label="Monitoring data mode">
      <button type="button" role="tab" aria-selected={mode === 'SYNTHETIC_DEMO'} onClick={() => setMode('SYNTHETIC_DEMO')}>Synthetic Demo</button>
      <button type="button" role="tab" aria-selected={mode === 'CERTIFIED_ATTOM_EVIDENCE'} onClick={() => setMode('CERTIFIED_ATTOM_EVIDENCE')}>Certified ATTOM Evidence</button>
    </div>

    {mode === 'SYNTHETIC_DEMO' ? <>
      <div className="monitoring-synthetic-banner"><strong>Demonstration dataset</strong><span>Every property and event below is synthetic. Certified ATTOM delivery totals are shown separately under Source Processing Diagnostics.</span></div>
      <section aria-label="Monitoring summary" className="monitoring-kpis">
        <article><span>Properties Monitored</span><strong>{summary.propertiesMonitored}</strong><small>Distinct synthetic properties</small></article>
        <article><span>Properties Requiring Attention</span><strong>{summary.propertiesRequiringAttention}</strong><small>Distinct properties with actionable changes</small></article>
        <article><span>New Material Changes</span><strong>{summary.newMaterialChanges}</strong><small>Excludes informational refreshes and quarantine</small></article>
        <article><span>Upcoming Critical Dates</span><strong>{summary.upcomingCriticalDates}</strong><small>Only confirmed future dates qualify</small></article>
      </section>

      <section className="monitoring-priority-section">
        <div className="monitoring-heading"><div><p className="eyebrow">INVESTOR PRIORITY</p><h2>Properties Requiring Attention</h2></div><button type="button" onClick={replay}>Replay synthetic update</button></div>
        {replayNotice && <p role="status" className="monitoring-status">{replayNotice}</p>}
        <div className="monitoring-table-wrap"><table className="monitoring-priority-table"><thead><tr><th>Property</th><th>Latest change</th><th>Priority</th><th>Evidence</th><th>Next action</th></tr></thead><tbody>{priorityRows.map(({ property, event }) => {
          return <tr key={event.canonical_property_id} data-testid="priority-row"><td><button className="monitoring-link" type="button" onClick={() => setSelectedId(event.event_id)}>{property.reference}</button><small>Synthetic demo · no real address</small></td><td>{event.event_subtype}</td><td><span className={`monitoring-pill level-${event.materiality.toLowerCase()}`}>{event.materiality}</span></td><td>{evidenceLabel(event)}</td><td>{event.recommended_action}</td></tr>;
        })}</tbody></table></div>
      </section>

      <section className="monitoring-feed">
        <div className="monitoring-heading"><div><p className="eyebrow">EVENT INTELLIGENCE</p><h2>Recent Property Changes</h2></div><label className="monitoring-toggle"><input type="checkbox" checked={includeInformational} onChange={(event) => setIncludeInformational(event.target.checked)}/> Include informational changes</label></div>
        <div className="monitoring-filters" aria-label="Filter recent property changes">
          <label>Priority<select aria-label="Filter priority" value={filters.priority} onChange={(e) => changeFilter('priority', e.target.value)}><option value="">All actionable</option>{['HIGH', 'MEDIUM', ...(includeInformational ? ['LOW'] : [])].map((level) => <option key={level}>{level}</option>)}</select></label>
          <label>Event type<select aria-label="Filter event type" value={filters.eventType} onChange={(e) => changeFilter('eventType', e.target.value)}><option value="">All types</option>{types.map((type) => <option key={type} value={type}>{title(type)}</option>)}</select></label>
          <label>Source<select aria-label="Filter source" value={filters.source} onChange={(e) => changeFilter('source', e.target.value)}><option value="">All sources</option>{sources.map((source) => <option key={source}>{source}</option>)}</select></label>
          <label>From<input aria-label="Filter from date" type="date" value={filters.from} onChange={(e) => changeFilter('from', e.target.value)}/></label>
          <label>To<input aria-label="Filter to date" type="date" value={filters.to} onChange={(e) => changeFilter('to', e.target.value)}/></label>
          <label>Alert status<select aria-label="Filter alert status" value={filters.review} onChange={(e) => changeFilter('review', e.target.value)}><option value="">All</option><option value="UNREAD">Unread alert</option><option value="ACKNOWLEDGED">Acknowledged</option></select></label>
        </div>
        <div className="monitoring-layout">
          <div className="monitoring-event-list" aria-label="Recent actionable changes">{filtered.length ? filtered.map((event) => <button type="button" className={`monitoring-event ${selectedId === event.event_id ? 'selected' : ''}`} key={event.event_id} onClick={() => setSelectedId(event.event_id)} data-testid="monitoring-event">
            <span className={`monitoring-pill level-${event.materiality.toLowerCase()}`}>{event.materiality}</span><strong>{event.event_subtype}</strong><span>{demoProperties.find((property) => property.id === event.canonical_property_id)?.reference} · {dateLabel(whenKey(event))}</span><span>{evidenceLabel(event)} · {event.source_system}</span>{eventAlert.get(event.event_id)?.acknowledged_at && <small>Read · acknowledged locally</small>}
          </button>) : <p className="monitoring-empty">No actionable changes match these filters.</p>}</div>
          <div className="monitoring-detail" aria-live="polite">{selected && selected.processing_status === 'PROCESSED' && selected.canonical_property_id ? <>
            <p className="eyebrow">{selected.synthetic ? 'SYNTHETIC EVENT · NOT REAL PROPERTY EVIDENCE' : 'CERTIFIED SOURCE EVENT'}</p><h3>{selected.event_subtype || title(selected.event_type)}</h3>
            <div className="monitoring-fact"><span>What changed</span><strong>{selected.change_summary || 'No description supplied.'}</strong></div>
            <div className="monitoring-fact"><span>Why it matters</span><strong>{selected.materiality_rationale || 'Review the source evidence before interpreting impact.'}</strong></div>
            <div className="monitoring-fact"><span>Evidence</span><strong>{evidenceLabel(selected)}</strong></div>
            <div className="monitoring-fact"><span>When</span><strong>Source event {dateLabel(selected.event_date || selected.recorded_date)} · detected/publication {dateLabel(selected.publication_date || selected.detected_at)}</strong></div>
            <div className="monitoring-fact"><span>Recommended next step</span><strong>{selected.recommended_action}</strong></div>
            <div className="monitoring-fact"><span>Confidence / limitations</span><strong>{selected.confidence}; identity {title(selected.identity_reconciliation_status)}; source code {title(selected.source_code_status)}. Verify the current recorded status independently.</strong></div>
            <details className="monitoring-provenance"><summary>Technical evidence and provenance</summary><dl><dt>Raw event code</dt><dd>{selected.raw_event_code ?? 'Not supplied'}</dd><dt>Source dataset</dt><dd>{selected.source_dataset}</dd><dt>Source transaction</dt><dd>{selected.source_transaction_id ?? 'Not supplied'}</dd><dt>Source delivery</dt><dd>{selected.source_delivery_id ?? 'Not supplied'}</dd><dt>Source fingerprint</dt><dd>{selected.source_record_fingerprint ?? 'Not supplied'}</dd><dt>Identity status</dt><dd>{selected.identity_reconciliation_status}</dd><dt>Geographic status</dt><dd>{selected.geographic_scope_status}</dd><dt>Processing status</dt><dd>{selected.processing_status}</dd></dl></details>
          </> : <p>Select a synthetic property change to inspect its explanation.</p>}</div>
        </div>
      </section>

      <section className="monitoring-property-detail"><p className="eyebrow">PROPERTY MONITORING DETAIL · SYNTHETIC</p><div className="property-monitoring-heading"><div><h2>{selectedProperty?.reference ?? 'Select a property'}</h2><p>{selectedProperty?.address ?? 'Synthetic offline demonstration'}</p></div><span className="monitoring-pill level-medium">{selectedProperty?.status ?? 'Monitoring'}</span></div>
        {selectedProperty && <><div className="property-monitoring-summary"><div><small>Most recent material change</small><strong>{selectedPropertyLatest?.event_subtype ?? 'None recorded'}</strong></div><div><small>Latest known event</small><strong>{dateLabel(selectedPropertyLatest ? whenKey(selectedPropertyLatest) : null)}</strong></div><div><small>Economic reassessment</small><strong>{state.reassessmentQueue.some((item) => item.canonical_property_id === selectedProperty.id) ? 'Analysis update pending' : 'No reassessment queued'}</strong></div></div><h3>Open diligence items</h3><ul>{timeline.filter((event) => ['HIGH', 'MEDIUM'].includes(event.materiality)).map((event) => <li key={`diligence-${event.event_id}`}>{event.recommended_action}</li>)}</ul><h3>Chronological property history</h3><ol className="monitoring-timeline">{timeline.map((event) => <li key={event.event_id}><time>{dateLabel(whenKey(event))}</time><strong>{event.event_subtype}</strong><small>{evidenceLabel(event)} · {event.materiality} · {event.change_summary}</small></li>)}</ol></>}
      </section>

      <section className="monitoring-bottom-grid"><div><p className="eyebrow">LOCAL ALERTS · NO EXTERNAL NOTIFICATIONS</p><h2>Alert Inbox</h2>{alerts.length ? alerts.map((alert) => <article className="monitoring-alert" key={alert.alert_id}><div><span className={`monitoring-pill level-${alert.severity.toLowerCase()}`}>{alert.severity}</span><span className={`alert-read-state ${alert.acknowledged_at ? 'read' : 'unread'}`}>{alert.acknowledged_at ? 'Read' : 'Unread'}</span></div><h3>{alert.title}</h3><p>{alert.summary}</p><small>Next: {alert.recommended_action}</small>{!alert.acknowledged_at && <button type="button" onClick={() => acknowledge(alert.alert_id)}>Mark read / acknowledge locally</button>}</article>) : <p>No local alerts.</p>}</div>
        <div className="monitoring-quality"><p className="eyebrow">ANALYST / ADMINISTRATOR REVIEW</p><h2>Data Quality &amp; Review</h2><p className="muted">Exceptions stay outside investor priority counts, property cards, and alerts.</p>{state.quarantined.length ? state.quarantined.map((item) => { const event = state.events.find((row) => row.event_id === item.event_id); return <article className="monitoring-quarantine" key={item.event_id}><strong>{event?.event_subtype || title(event?.event_type)}</strong><span>Issue: {item.reasons.join(' ')}</span><span>Source record: {event?.source_dataset} · {event?.source_transaction_id ?? 'unmatched transaction key'}</span><span>Required resolution: Confirm matching transaction, identity, scope, and source semantics.</span><small>Status: Quarantined · expected unmatched tombstones are not provider failures.</small></article>; }) : <p>No review items.</p>}<p className="mapping-note">No actual ATTOMID correction row has been extracted in this local run; the vendor-confirmed correction rule is documented separately and no PI identity is reassigned.</p></div></section>
    </> : <section className="certified-mode-panel" data-testid="certified-attom-mode"><p className="eyebrow">CERTIFICATION LEVEL · SOURCE EVENTS PASSED</p><h2>Certified ATTOM Evidence</h2><p>Seven sanitized vendor source-event cases passed local normalization, classification, quarantine, and replay checks. No unverified ATTOM identity is presented as an investor-ready property alert; this panel does not load the cases into the property dashboard.</p><div className="certification-status-grid"><article><span>Source events certified</span><strong>7</strong></article><article><span>Monitoring events certified</span><strong>7</strong></article><article><span>Investor alerts certified</span><strong>0</strong></article><article><span>Quarantined real records</span><strong>7</strong></article></div><p>The sanitized certification fixture preserves source references and fingerprints while excluding addresses and owner/contact fields. Raw Parquet remains in the existing ignored data directory. No provider or database request is made.</p></section>}

    <details className="monitoring-diagnostics"><summary>Source Processing Diagnostics · certified aggregate statistics</summary><p>{demoDelivery.deliveryId} · baseline {dateLabel(demoDelivery.baselinePublicationDate)} · update {dateLabel(demoDelivery.updatePublicationDate)}. These are actual five-county POC aggregates, not Kern or production PI activity and not property-level synthetic metrics.</p><div className="monitoring-observed">{Object.entries(demoDelivery.observed).map(([key, value]) => <span key={key}><b>{value}</b> {title(key)}</span>)}</div><h3>Vendor-confirmed semantics recorded for this POC</h3><ul><li>The physical `FORECLOSURE` file is ATTOM's Preforeclosure product.</li><li>RecorderDeletes applies only to Recorder; unmatched IDs may be outside supplied history/geography and remain tombstones.</li><li>For the same Recorder TransactionID, ATTOM's latest ATTOMID is the current mapping; retain the previous mapping and emit a correction event. Do not merge PI canonical identities automatically.</li><li>FIPS 55017 is an acknowledged out-of-scope sample artifact and must be quarantined.</li><li>Replaying `_0002` produced zero additional changes/history; no `_0003` was available.</li></ul><p>Source normalization, identity linking, alerting, and production use are distinct certification levels.</p></details>
    <footer className="monitoring-footer">Offline prototype · provider calls 0 · database writes 0 · notifications 0 · deployments 0</footer>
  </main>;
}
