# PI Monitoring Event Contract

Contract version: `monitoring-event-v1`

Each normalized event carries `event_id`, `source_system`, `source_dataset`, `source_transaction_id`, `attom_id`, `canonical_property_id`, `event_type`, `event_subtype`, `raw_event_code`, `event_date`, `recorded_date`, `publication_date`, `detected_at`, `previous_value`, `current_value`, `change_summary`, `evidence_classification`, `confidence`, `materiality`, `recommended_action`, `processing_status`, `source_delivery_id`, `source_record_fingerprint`, `source_evidence_reference`, `previous_record_version`, `current_record_version`, `supersedes_event_id`, `data_quality_warnings`, `identity_reconciliation_status`, `geographic_scope_status`, `source_code_status`, `opportunity_status`, `existing_distress_stage`, `previously_known`, `publication_only`, and `review_status`.

## Evidence classes

- `RECORDED_EVENT`: an actual source record supports the statement.
- `PROVIDER MODEL UPDATE`: provider-estimated/modelled value changed; not a recorded instrument/payoff.
- `PI DERIVED CHANGE`: reserved for deterministic calculations on existing evidence; no calculation is performed by the prototype.
- `UNRESOLVED / REQUIRES REVIEW`: source semantics/identity/evidence is insufficient.

## Identity and replay rules

ATTOM ID remains distinct from PI canonical property ID. A canonical identity is never manufactured from a missing or ambiguous match. The sanitized row adapter accepts explicit row evidence only. `aggregateOnlyReplayNotice()` explicitly returns `eventRowsCreated: 0`, preventing the 37/464/etc. aggregate observations from being misrepresented as row-level event examples.

The local event fingerprint is deterministic and scoped to UI prototype deduplication; it is not a cryptographic hash. Replays of an identical event are suppressed. A changed source fingerprint with the same event identity appends a superseding event and retains the prior version in the history rather than overwriting it.

## Event families

The event type namespace covers foreclosure (`NEW_NOD`, `NEW_NOTICE_OF_TRUSTEE_SALE`, `NEW_FORECLOSURE_TRANSACTION`, auction/status changes, snapshot disappearance/unresolved), recorder/mortgage (new recorded transaction/mortgage, assignment, release, loan-model change, correction, invalidation, identity change), and future tax events (delinquency, balance change, redemption, sale scheduled/postponed). Tax types are contracts only; no county data is collected or emitted.

Event-code interpretation carries `CONFIRMED`, `PROVISIONAL`, or `UNKNOWN`. Only confirmed semantics may participate in a high-priority rule; provisional/unknown meanings are unresolved and routed to review. Optional opportunity status and existing distress stage are context fields, never rewritten by this prototype. Tax event names are reserved contracts only; no county data is collected or emitted.

V1.1 recognizes vendor-confirmed source semantics supplied for this task: the physical `FORECLOSURE` file represents ATTOM Preforeclosure; RecorderDeletes applies to Recorder only and unmatched IDs are retained as tombstones; the latest ATTOMID for a Recorder TransactionID is ATTOM's current mapping while prior mappings remain historical; FIPS `55017` is out-of-scope and quarantined. An ATTOMID correction is a mapping-reconciliation event and must never silently update PI canonical identity.
