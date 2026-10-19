const priorityRank = { HIGH: 0, MEDIUM: 1, LOW: 2, UNRESOLVED: 3 };
const eventDate = (event) => String(event.event_date || event.recorded_date || event.publication_date || event.detected_at || '');

export function buildPropertyPriorityRows(events, properties = []) {
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const latest = new Map();
  for (const event of events) {
    if (event.processing_status !== 'PROCESSED' || !event.canonical_property_id || !['HIGH', 'MEDIUM'].includes(event.materiality)) continue;
    const current = latest.get(event.canonical_property_id);
    if (!current || priorityRank[event.materiality] < priorityRank[current.materiality] || (event.materiality === current.materiality && eventDate(event) > eventDate(current))) latest.set(event.canonical_property_id, event);
  }
  return [...latest.values()].filter((event) => propertyById.has(event.canonical_property_id))
    .map((event) => ({ property: propertyById.get(event.canonical_property_id), event }))
    .sort((a, b) => priorityRank[a.event.materiality] - priorityRank[b.event.materiality] || eventDate(b.event).localeCompare(eventDate(a.event)));
}

export function monitoringDashboardSummary(events, properties = [], { asOf = new Date() } = {}) {
  const safe = events.filter((event) => event.processing_status === 'PROCESSED' && event.canonical_property_id);
  const actionable = safe.filter((event) => ['HIGH', 'MEDIUM'].includes(event.materiality) && !event.publication_only);
  const rows = buildPropertyPriorityRows(safe, properties);
  const deadlines = safe.filter((event) => ['AUCTION_DATE_ADDED', 'AUCTION_DATE_CHANGED', 'TAX_SALE_SCHEDULED'].includes(event.event_type)
    && event.event_date && new Date(`${event.event_date}T00:00:00Z`) > asOf
    && event.identity_reconciliation_status === 'CONFIRMED' && event.geographic_scope_status === 'IN_SCOPE' && event.source_code_status === 'CONFIRMED');
  return {
    propertiesMonitored: new Set(safe.map((event) => event.canonical_property_id)).size,
    propertiesRequiringAttention: rows.length,
    newMaterialChanges: actionable.filter((event) => !event.previously_known).length,
    upcomingCriticalDates: deadlines.length ? deadlines.length : 'None verified'
  };
}
