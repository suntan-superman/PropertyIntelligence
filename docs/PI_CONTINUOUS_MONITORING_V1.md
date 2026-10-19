# PI Continuous Monitoring V1 — Offline Prototype

Status: `MORE DEVELOPMENT REQUIRED` (V1.1 investor UX is implemented; actual certified row-level ATTOM extraction remains unverified)

## Scope and evidence boundary

The monitoring experience is available at the isolated local route `/#monitoring`. It is rendered by a separate React surface; it does not mount the Property Intelligence workbench/API client. The UI offers separated Synthetic Demo and Certified ATTOM Evidence modes. Synthetic property counts/events are not combined with the certified `_0001 → _0002` aggregate replay summary. No source row was extracted during V1.1 because the local offline reader is unavailable; the real-evidence mode therefore reports zero certified rows instead of inferring records from counts. No addresses, owner details, or production candidate data are displayed.

The app demonstrates `DISCOVER → ANALYZE → MONITOR → DETECT CHANGE → REASSESS → ALERT` as a local presentation flow. It does not ingest a delivery, contact a provider, access a database, send notifications, or change scoring, MAO, Monte Carlo, Opportunity, Property, or Deal state.

## Components

- `src/monitoring/contract.js`: provider-independent event normalizer, evidence/status fields and row adapter. Aggregate-only metrics intentionally create zero row-level events.
- `src/monitoring/materiality.js`: versioned deterministic materiality policy. Its 5% LoanModel comparison is labeled synthetic-only, not a PI investment rule.
- `src/monitoring/processor.js`: event idempotency, correction history/supersession, quarantine, local alert generation/deduplication, and a non-executing reassessment queue.
- `src/monitoring/fixtures.js`: synthetic UI events and aggregate-only replay context.
- `src/monitoring/dashboard.js`: deterministic property priority ordering and summary calculations.
- `apps/web/src/features/monitoring/Monitoring.jsx`: separated data modes, investor priority table, actionable change feed, property history, quarantine, alert inbox, diagnostics, and filters.

The local event fingerprint is deterministic deduplication support, not a cryptographic security or identity proof. `attom_id` and PI `canonical_property_id` are separate fields; no canonical identity is inferred from ATTOM ID, transaction text, or addresses.

## Event interpretation and controls

Confirmed high-confidence NTS / auction-date events may become HIGH candidates for human verification. Unconfirmed identity, geographic scope, event-code semantics, or evidence enters UNRESOLVED/quarantine and cannot create an investor-facing alert. Provider estimates are always distinguished from recorded events. Publication-only snapshot changes are LOW and do not alert. CombinedForeclosure disappearance is not treated as foreclosure cancellation. Unmatched RecorderDeletes do not delete or reassign evidence. Out-of-scope records do not change PI investment state.

Alerts and acknowledgments are local in-memory prototype records only; no email, SMS, push, scheduler, or external notification service exists. Economic reassessment is queued as `QUEUED_NOT_EXECUTED`; no investment calculation is run.

## Run locally

From the PI repository root:

```powershell
npm run monitoring:prototype -- --port 5173
```

Open `http://127.0.0.1:5173/#monitoring`. This starts the Vite UI only. The monitoring view itself makes no calls to the PI API. Existing `npm run web:dev` is not needed for this prototype.

## Validation commands

```powershell
npm run monitoring:test
npm run web:build
npm run monitoring:qa
```

See [PI_MONITORING_QA_RESULTS.md](PI_MONITORING_QA_RESULTS.md) and [PI_MONITORING_V1_1_VISUAL_QA.md](PI_MONITORING_V1_1_VISUAL_QA.md) for results. The real ATTOM row extraction gate remains outstanding; stop here pending review. Production ingestion/integration is not part of V1.
