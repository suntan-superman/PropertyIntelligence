# PI Monitoring V1 QA Results

Status: `MORE DEVELOPMENT REQUIRED` (Synthetic UX certified; actual ATTOM row-level source certification not demonstrated)

## Automated results

- Monitoring unit tests: **20/20 PASS**, 0 skipped.
- Playwright browser QA: **PASS**.
- PI production UI build: **PASS** (`npm run web:build`).
- Browser errors: **0**.
- External browser requests: **0**.
- Provider calls: **0**.
- Persistent database writes: **0**.
- Notifications sent: **0**.
- Deployments: **0**.

Playwright covered separate data modes, the synthetic priority table and reconciled summary counts, quarantine separation, event detail/provenance, priority/type/source/date/alert-status filters, local acknowledgment/read state, chronological property history, duplicate replay suppression, expandable diagnostics, and 1366px/768px/390px screenshots with no overflow. Machine output is in `data/validation/monitoring-v1-1/qa-results.json`.

Unit cases cover normalized event/provenance fields, sanitized offline replay adaptation, foreclosure materiality, provisional code uncertainty, recency/prior-fact/opportunity/distress context, duplicate/replay idempotency, publication-only suppression, correction history, ATTOMID correction quarantine, unmatched invalidation quarantine, snapshot disappearance semantics, LoanModel reassessment queueing, missing canonical identity, out-of-scope geography, alert deduplication/acknowledgment, synthetic sequence-gap/recovery, aggregate-only no-fabrication, explicit synthetic fixture status, property priority ordering, and derived summary counts.

## Data boundary and limitations

The certified `_0002` artifacts available to this sprint provide replay aggregate counts only. No row-level event was derived from an aggregate count. The UI demonstrates with synthetic events and makes that distinction visible. The saved Playwright result/screenshots are local QA output; no raw Parquet or vendor record was added to browser assets.

The sanitized adapter contract accepts source rows and its contract-level test passes, but no actual certified Parquet row was extracted and sent through the adapter in this sprint. The prior replay artifact explicitly notes that no row-level records were exported; this environment did not expose DuckDB on `PATH`, as an installed Python module, or as a project Node dependency during inspection. V1.1 was authorized for offline-only work, so no network install was attempted. Therefore the acceptance criterion “a certified offline event can enter the monitoring model” remains unverified. This is the remaining development gate before calling V1.1 ready for visual review.

Written clarifications supplied for V1.1 resolve: physical `FORECLOSURE` is ATTOM Preforeclosure; RecorderDeletes applies only to Recorder and unmatched IDs remain tombstones; latest Recorder ATTOMID is authoritative while previous mapping is retained; FIPS `55017` is out-of-scope and must be quarantined. Multi-day/daily-delivery reliability remains unestablished because `_0003` was unavailable. The five-county POC counts are not Kern County or production PI activity.

No provider integration, ingestion, production database behavior, durable alert persistence, or delivery scheduler was tested or implemented. Stop for Stan/ChatGPT review; do not proceed to production integration or MLS validation under this authorization.
