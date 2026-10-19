export const MATERIALITY_POLICY = Object.freeze({
  version: 'monitoring-materiality-v1.0.0', status: 'PROTOTYPE_POLICY_NOT_INVESTMENT_RULES',
  syntheticDemoAssumptions: { minimumLoanModelDeltaPercent: 5, urgentRecencyDays: 30, label: 'Synthetic demonstration thresholds only; not established PI investment rules.' },
  rules: [
    'Identity or semantics unresolved => UNRESOLVED; route to review and suppress investor alerts.',
    'Publication-date-only refresh => LOW; never an investment alert.',
    'Confirmed, strongly identified recent new NTS / scheduled sale => HIGH candidate for human verification.',
    'Recorded transaction, correction, mortgage lifecycle evidence => MEDIUM review candidate.',
    'Previously known facts are not treated as new events; prior distress/opportunity context affects interpretation.',
    'Provider model changes are estimates, never recorded payoffs or verified lien changes.'
  ]
});
const urgent = new Set(['NEW_NOTICE_OF_TRUSTEE_SALE', 'AUCTION_DATE_ADDED', 'AUCTION_DATE_CHANGED']);
const review = new Set(['NEW_NOD', 'NEW_FORECLOSURE_TRANSACTION', 'NEW_RECORDED_MORTGAGE', 'NEW_RECORDED_TRANSACTION', 'MORTGAGE_ASSIGNMENT', 'MORTGAGE_RELEASE', 'LOAN_MODEL_CHANGE', 'RECORDED_TRANSACTION_CORRECTED', 'RECORDED_TRANSACTION_INVALIDATED', 'PROPERTY_IDENTITY_CHANGED', 'FORECLOSURE_STATUS_CHANGED']);

export function classifyMateriality(event, policy = MATERIALITY_POLICY) {
  if (!event || !policy?.version) throw new TypeError('An event and versioned policy are required.');
  if (event.identity_reconciliation_status !== 'CONFIRMED' || event.geographic_scope_status !== 'IN_SCOPE' || event.source_code_status !== 'CONFIRMED' || event.evidence_classification === 'UNRESOLVED / REQUIRES REVIEW') return { level: 'UNRESOLVED', rationale: 'Identity, geography, source semantics, or evidence classification needs review.' };
  if (event.publication_only) return { level: 'LOW', rationale: 'Only publication metadata changed; no business-field change was detected.' };
  if (event.previously_known) return { level: 'LOW', rationale: 'The event repeats a previously known fact; it is not classified as a newly detected change.' };
  if (event.opportunity_status === 'CLOSED' || event.opportunity_status === 'DISMISSED') return { level: 'LOW', rationale: 'The associated opportunity is not active; no automatic reopening or investment alert is implied.' };
  if (urgent.has(event.event_type) && event.existing_distress_stage === 'SCHEDULED_SALE') return { level: 'MEDIUM', rationale: 'A sale-stage fact is already known; verify whether the date/status itself changed.' };
  if (urgent.has(event.event_type) && event.confidence === 'HIGH') {
    const eventDate = new Date(`${String(event.event_date || event.recorded_date || '').slice(0, 10)}T00:00:00Z`);
    const detectedDate = new Date(`${String(event.detected_at || '').slice(0, 10)}T00:00:00Z`);
    const ageDays = Number.isFinite(eventDate.getTime()) && Number.isFinite(detectedDate.getTime()) ? Math.floor((detectedDate - eventDate) / 86400000) : null;
    if (ageDays != null && ageDays < 0) return { level: 'UNRESOLVED', rationale: 'Source event date is later than its detection date; verify source chronology.' };
    if (ageDays != null && ageDays <= policy.syntheticDemoAssumptions.urgentRecencyDays) return { level: 'HIGH', rationale: `Confirmed time-sensitive event dated within the synthetic ${policy.syntheticDemoAssumptions.urgentRecencyDays}-day demo window; verify current status and dates.` };
    if (ageDays != null) return { level: 'MEDIUM', rationale: 'Time-sensitive event is outside the synthetic recency window; verify whether it remains active.' };
  }
  if (event.event_type === 'LOAN_MODEL_CHANGE') {
    const before = Number(event.previous_value), after = Number(event.current_value);
    if (Number.isFinite(before) && before !== 0 && Number.isFinite(after) && Math.abs((after - before) / before * 100) >= policy.syntheticDemoAssumptions.minimumLoanModelDeltaPercent) return { level: 'MEDIUM', rationale: `Provider estimate changed by at least the explicitly synthetic ${policy.syntheticDemoAssumptions.minimumLoanModelDeltaPercent}% demo threshold; it is not a recorded payoff.` };
    return { level: 'LOW', rationale: 'Provider model change is informational under this prototype policy; not evidence of a payoff.' };
  }
  if (review.has(event.event_type)) return { level: 'MEDIUM', rationale: 'Relevant evidence change merits human review; investment significance is not assumed.' };
  return { level: 'LOW', rationale: 'Informational event without an established material investment consequence.' };
}
