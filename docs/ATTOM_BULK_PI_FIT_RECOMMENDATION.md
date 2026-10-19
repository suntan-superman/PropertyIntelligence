# ATTOM Bulk PI Fit Recommendation — Sequential Delivery Gate

## Recommendation

**`MORE EVIDENCE REQUIRED` for daily monitoring readiness, product/purchase fit, and integration design.** One `_0002` set was replayed; this is not a purchase recommendation and does not authorize bulk integration.

## What the current evidence establishes

The certified six-file `_0001` baseline passed complete decoding and profiling. A fresh pinned SFTP inventory found all six `_0002` Parquet files plus `DONE_0002`; no `_0003` or `DONE_0003` was present. `_0002` files passed ordered transfer, size/boundary, schema, and all-column decoding. Baseline publication dates were October 7 and nonempty update publication dates October 8, supporting the replay order despite a vendor replacement timestamp on AssignmentRelease. The isolated replay observed 37 new Foreclosure transaction keys (including 2 NOD and 7 NTS raw types), 464 new Recorder transactions and 50 corrections, 394 changed plus 34 new LoanModel properties, 0 AssignmentRelease rows, and a CombinedForeclosure snapshot with 0 business-field changes. Thirty unique RecorderDeletes IDs did not match tested transaction history; they were quarantined, not applied destructively. Repeated application of `_0002` produced no new changes/history. Full details are in `ATTOM_DELTA_REPLAY_RESULTS.md` and `sequential-replay-metrics.json`.

## Licensing comparison

The supplied quotes are:

- Preforeclosure + Combined Foreclosure: **$3,000/year**.
- All five substantive datasets: **$7,620/year**.
- Incremental quoted cost for the broader package: **$4,620/year**.

One update provides evidence that Recorder and LoanModel may add monitoring depth, but it does not establish sustained daily value or whether Kern PI needs the entire broader package. No Preforeclosure file was delivered; AssignmentRelease was empty; and the 30 unmatched RecorderDeletes IDs and 25 Recorder ATTOMID corrections need vendor/identity review. Replay/idempotency and synthetic rollback/gap checks passed for one delivery, but multi-day chronology, recurring event quality, and production recovery remain unverified.

Targeted API/DataTree enrichment might reduce broad-feed licensing needs for a small number of high-priority candidates, but no current pricing comparison is established here: ATTOM endpoint billing, DataTree document/report costs, usage limits, data rights, and combined coverage would need written confirmation and a valid sequential feed test. No provider or package is recommended for purchase.

## Decision gates before integration design

1. Obtain a second consecutive complete update set and validate sequence/marker semantics across multiple dates; `_0003` was not present in this inventory.
2. Obtain/confirm the Preforeclosure feed and its entitlement; it was not in the six-file baseline or `_0002`.
3. Ask ATTOM to confirm the RecorderDeletes target dataset, resolve the 30 unmatched IDs, review the 25 ATTOMID changes, and confirm whether FIPS 55017 is within licensed geography.
4. Continue observed replay across multiple updates, including auction/status changes, assignment/release activity, deletion matches, and recovery from a genuinely missed delivery.
5. Confirm retention, display, derived-data, and update/deletion licensing terms before integration design or purchase.

No production data, application, schema, scoring, MAO, Monte Carlo, or deployment changes were made.

## Business questions — current evidence only

1. **Daily distress discovery?** Partially demonstrated: 37 new Foreclosure keys (including NOD/NTS raw codes), but Preforeclosure was not delivered.
2. **Meaningful updates?** Demonstrated in one delivery: Recorder and LoanModel changed/added records; AssignmentRelease had no rows.
3. **Reliable current foreclosure state?** One snapshot replay was stable, but no substantive CombinedForeclosure changes or disappearances occurred; multi-day reliability remains unknown.
4. **Mortgage lifecycle changes?** LoanModel activity observed; no AssignmentRelease activity. RecorderDeletes target/matches remain unresolved.
5. **Corrections and invalidations?** Fifty Recorder corrections observed; 30 deletion IDs unmatched and quarantined.
6. **Recovery from missed/repeated delivery?** Repeated `_0002` was idempotent; synthetic sequence-gap and rollback tests passed. No real missed-delivery recovery or second day was available.
7. **What remains uncertain?** Preforeclosure coverage, multi-day recurrence, 55017 geography, ATTOMID corrections, deletion targeting, alert value, and licensing/retention rights.
8. **Is the $3,000 package sufficient?** Unknown: the tested set supplied no Preforeclosure rows, and CombinedForeclosure had no business-field changes that day.
9. **What incremental value justifies $7,620/year?** Recorder/LoanModel demonstrated potentially useful activity; more consecutive deliveries and clear deletion/identity behavior are needed before recommending the $4,620 incremental cost.
