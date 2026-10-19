# ATTOM Daily Monitoring Readiness

## Classification

**`MORE EVIDENCE REQUIRED`**

One complete `_0002` delivery was replayed against the certified `_0001` baseline in an isolated in-memory harness. It demonstrates useful feed activity and repeat-application behavior for this single delivery, but not sustained daily operation, Preforeclosure coverage, or the full invalidation contract. This is not authorization for production integration.

## PI capability assessment

| Capability | Result | Evidence / limitation |
|---|---|---|
| Daily discovery of newly distressed properties | **PARTIALLY DEMONSTRATED** | 37 new Foreclosure transaction keys, including 2 NOD and 7 NTS raw type codes; no Preforeclosure dataset was delivered. |
| Monitoring existing foreclosure candidates | **PARTIALLY DEMONSTRATED** | CombinedForeclosure snapshot replayed; keys stable, but this snapshot had only publication-date refreshes and no business-field changes. One FIPS 55017 row remains quarantined. |
| Auction-date change alerts | **NOT DEMONSTRATED** | 0 auction-date changes in this delivery. |
| Mortgage lifecycle updates | **PARTIALLY DEMONSTRATED** | 394 existing LoanModel property records changed and 34 were new; AssignmentRelease had 0 rows. Thirty RecorderDeletes IDs did not match tested history, so invalidation semantics remain unresolved. |
| Loan/equity changes | **PARTIALLY DEMONSTRATED** | Loan position/instrument/amount/rate fields changed in LoanModel. LTV, AvailableEquity, and LendableEquity did not change in this batch. |
| Transaction correction handling | **PARTIALLY DEMONSTRATED** | 50 existing Recorder transactions changed and 464 new transactions arrived. Twenty-five corrections changed ATTOMID and require identity review. |
| Idempotent replay/recovery | **PARTIALLY DEMONSTRATED** | Repeating `_0002` produced no extra inserts, changes, or history versions; synthetic sequence-gap and rollback/retry checks passed. Only one vendor delivery was available; no `_0003` appeared. |

## Geography and identity guardrails

The expected sample geography is FIPS `06111`, `08035`, `12031`, `27123`, and `37119`. CombinedForeclosure contained one FIPS `55017` row in both baseline and update. Preserve and quarantine it; do not create a PI opportunity from it pending ATTOM scope confirmation. Thirty RecorderDeletes IDs were not found in the tested baseline or update transaction histories; retain them as unmatched invalidation history and do not physically delete evidence. Twenty-five Recorder records changed ATTOMID under an existing TransactionID; quarantine for identity/join review before any integration.

## Licensing view

At **$3,000/year**, Preforeclosure + Combined Foreclosure would not have supplied a Preforeclosure file in this tested set; CombinedForeclosure showed no business-field change on this one day. The **$7,620/year** broader package did demonstrate additional observed activity: Recorder added 464 transactions and corrected 50; LoanModel changed 394 existing records and added 34 properties. AssignmentRelease contributed no rows, and the loan/equity value to PI economics is not established by one update. Thus Recorder and LoanModel appear to provide potentially material monitoring depth, but the evidence does **not** justify purchasing the more expensive package yet. No purchase recommendation is made.

## Remaining evidence needed

1. Obtain multiple consecutive, vendor-confirmed delivery days (including `_0003` or a later complete set) and confirm sequence/marker semantics.
2. Obtain the expected Preforeclosure feed or written confirmation that it is excluded from this entitlement.
3. Confirm which dataset RecorderDeletes targets and resolve the 30 unmatched invalidation IDs.
4. Review the 25 Recorder ATTOMID changes and ask ATTOM to confirm the meaning of FIPS `55017` for licensed geography.
5. Validate update ordering, interruption recovery, correction/deletion behavior, and alert usefulness across more than one delivery interval.
6. Confirm retention, display, derived-data, and update/deletion rights before integration design or purchase.

No ATTOM API, RentCast, DataTree, county, Google, or MLS calls occurred. No production database, application, scoring, deployment, or licensing changes were made. See [delta replay results](ATTOM_DELTA_REPLAY_RESULTS.md), [sequential certification](ATTOM_SEQUENTIAL_DELIVERY_CERTIFICATION.md), and [PI fit recommendation](ATTOM_BULK_PI_FIT_RECOMMENDATION.md).
