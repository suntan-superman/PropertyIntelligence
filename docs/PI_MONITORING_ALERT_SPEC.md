# PI Monitoring Alert Spec — V1 Local Prototype

Each local alert contains `alert_id`, `property_id`, `event_id`, `severity`, `title`, `summary`, `why_it_matters`, `recommended_action`, `source`, `evidence_as_of`, `created_at`, `acknowledged_at`, and `status`.

Alerts are created only for processed, non-quarantined HIGH/MEDIUM events. Stable deterministic event keys suppress duplicate alerts on replay; unrelated recorded events are not collapsed merely because they concern the same property. Publication-only changes and unresolved identity/semantics do not alert. Corrected records are retained as superseding history, not destructively rewritten. The UI sorts alerts by priority then recency and uses local acknowledgement as read/unread state. Prototype alert acknowledgments exist only in local React state.

No messages are sent. In-app, email, SMS, and push are future channels only. No scheduler or notification provider is implemented.
