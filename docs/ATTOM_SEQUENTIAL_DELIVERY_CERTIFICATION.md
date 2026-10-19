# ATTOM Sequential Delivery Certification

## Result

**Baseline certified; one `_0002` delivery was validated and replayed. Overall daily monitoring remains `MORE EVIDENCE REQUIRED`.** The six `_0001` files passed full content profiling, the six `_0002` files passed serial transfer and all-column decode, and baseline → `_0002` replay/idempotency checks completed offline. No `_0003` or `DONE_0003` was present, so multi-day reliability is not certified.

## Scope and vendor delivery semantics

All work remained local/read-only apart from the authorized `_0001` recovery and six `_0002` Parquet downloads. SFTP used the pinned host key and credentials from `.env` without displaying them. No ATTOM API, RentCast, DataTree, county, Google, MLS, production database, production, or deployment activity occurred.

ATTOM-confirmed delivery semantics:

| Dataset | Vendor-confirmed behavior |
|---|---|
| Preforeclosure | UPSERT delta |
| Assignments & Releases | UPSERT delta |
| Loan Model | UPSERT delta |
| Recorder | UPSERT delta |
| Combined Foreclosure | Full replacement snapshot; disappearance is not proof of cancellation/completion |
| Deletes | Separate dataset-specific transaction deletion files |

These remain vendor-observed semantics. `_0002` empirically exercised AssignmentRelease (empty), Foreclosure, LoanModel, Recorder, CombinedForeclosure, and RecorderDeletes. No Preforeclosure file was present, and no common UPSERT key was assumed.

## Ordered recovery results

Full-file transfers were serial, one ordered stream at a time, with no `fastGet`, concurrent payload ranges, or whole-file automatic restart. Each remote file's size and `PAR1` header/footer were checked before its stream. The two small preflight boundary streams (first four bytes and last four bytes) were started together for each file using `Promise.all`; if the no-concurrent-range rule is interpreted to include those boundary probes, that is a procedural deviation. The full payload itself used a single stream. Unique output files were created under the ignored recovery directory; prior files were not overwritten.

| Order | Dataset | Bytes | SHA-256 | DuckDB rows / columns / metadata rows | Duration | Result |
|---:|---|---:|---|---:|---:|---|
| 1 | CombinedForeclosure | 1,534,071 | `46e1e30a333ed5469092a7f1c755b9177b4ea20f51a14c73cb0d1c004e043f16` | 6,115 / 111 / 111 | 14.9 s | PASS |
| 2 | Foreclosure | 5,598,111 | `48b67330715362139e1c34e8551d1611a32d9afac4ac38b50de7492d4dfafb37` | 30,824 / 103 / 103 | 47.8 s | PASS |
| 3 | LoanModel | 68,873,532 | `e9699fdf2c893b2ab3aa20fb8eab2822bd9550b17a077004ca4c540b4dcb8097` | 1,188,929 / 42 / 42 | 507.5 s | PASS |
| 4 | Recorder | 302,872,324 | `83caf29cf23147925f3ea1300c1bdf1fbf20cdbe258c75121ad46e5d88c81659` | 970,412 / 238 / 714 | 2,233.9 s | PASS |

DuckDB version: **1.5.6**. All four recovered files have matching remote/local size and `PAR1` boundaries. Per-file paths, timestamps, transfer details, SHA-256 values, and complete schemas are in the [delivery manifest](../data/validation/attom-bulk-poc/sequential-delivery-manifest.json) and [schema/change summary](../data/validation/attom-bulk-poc/sequential-schema-change-summary.json). These hashes are locally computed; ATTOM did not provide authoritative checksums, so byte identity to a vendor digest is not claimed.

The earlier recovered AssignmentRelease remains valid: 69,855,618 bytes, SHA-256 `ce686020e695987e242756169f6d149951bca6358fab49a94d3977e8cf95e5c0`, 665,575 rows, 35 columns, and 35 metadata rows. The original corrupt AssignmentRelease copy remains preserved. The previous RecorderDeletes copy (860,496 bytes; SHA-256 `ae6b403ce7402e831883beacf6f0d2fc69af8d57c4646356edb94e68d57f0ed0`) was retained with its Snappy failure evidence; the new unique retry is 860,496 bytes, SHA-256 `4dc42ae3617021dcc591bbc2f5d4605c3999ee9a3a72cfe0c9fa8a47ec9ee068`, with remote/local `PAR1` boundaries and 167,564 decoded `TransactionID` values, all distinct and non-null. No raw evidence was overwritten.

## Complete six-file baseline gate

| Dataset | Structural/schema result | Content-read result | Baseline status |
|---|---|---|---|
| AssignmentRelease | PASS | 665,575 rows × 35 columns fully decoded across all row groups | PASS |
| RecorderDeletes | Retry: 167,564 rows × 1 column; `TransactionID` all decoded, non-null, distinct count 167,564 | PASS; old failing copy preserved separately | PASS |
| CombinedForeclosure | PASS | 6,115 rows × 111 columns fully decoded across all row groups | PASS |
| Foreclosure | PASS | 30,824 rows × 103 columns fully decoded across all row groups | PASS |
| LoanModel | PASS | 1,188,929 rows × 42 columns fully decoded across all row groups | PASS |
| Recorder | PASS | 970,412 rows × 238 columns fully decoded across all row groups | PASS |

The re-download authorization was used exactly once for RecorderDeletes. The Snappy failure was not reproduced in the new ordered copy. DuckDB 1.5.6 decoded actual transaction values and completed `COUNT(DISTINCT TransactionID)` and a full-column scan. The old copy remains untouched.

## Profiling and replay gates

Full row and column scans completed using DuckDB with a 1 GiB memory limit and two worker threads. The five feeds with geography fields contain FIPS `06111`, `08035`, `12031`, `27123`, and `37119`; CombinedForeclosure additionally contains one `55017` record, also present once in the earlier CombinedForeclosure sample. Thus the out-of-area row is confirmed in both delivered and sample data, not a newly introduced geography discrepancy. Critical ID fields were non-null; TransactionID is unique in each transaction/deletion feed. AssignmentRelease has 368,845 non-null `MortgageTransactionID` references, of which 98,670 match Recorder `TransactionID`; AssignmentRelease and Recorder share 284,521 ATTOM property IDs. RecorderDeletes shares 23 TransactionIDs with AssignmentRelease and none with Recorder. LoanModel ATTOMID is unique (1,188,929 rows); ATTOMID joins show 284,521 shared IDs for AssignmentRelease↔Recorder and 559,216 for LoanModel↔Recorder. These are structural overlaps only, not proof of complete referential integrity or temporal business semantics. No unexpected duplicate transaction keys were found.

The five datasets with earlier sample files retain the same column names and types; CombinedForeclosure’s six-file baseline schema matches its earlier sample (111 columns), with 6,115 vs. 6,109 rows and the same single FIPS 55017 occurrence. Other sample/current row counts differ, as expected for differently scoped/delivered extracts. `sequential-schema-change-summary.json` contains the complete schemas; `sequential-baseline-profile.json` contains row counts, critical-field null counts, FIPS distribution, candidate-key checks, sample comparisons, and identity-overlap results. No row-level owner or contact information was copied into those shareable profile artifacts.

Fresh `_0002` inventory found all six baseline dataset names, six Parquet payloads, and `DONE_0002`; `_0003` and `DONE_0003` were absent. Baseline publication dates were October 7; every nonempty `_0002` feed with a publication date was October 8. The recovered AssignmentRelease `_0001` object has a later remote replacement timestamp, but its content date remains October 7. This supports baseline → `_0002` chronology from content dates and the marker, not suffix alone.

Observed `_0002` results: Foreclosure 37 new transaction keys (2 NOD, 7 NTS raw type codes); LoanModel 394 changed existing rows and 34 new IDs; Recorder 464 new transactions and 50 corrections (25 with ATTOMID changes); AssignmentRelease 0 rows; CombinedForeclosure 6,115 keys retained, 0 substantive field changes/disappearances/auction-date changes; RecorderDeletes 30 unique IDs, none matched to tested history and therefore quarantined. Reapplication created 0 changes/inserts/history versions. Synthetic gap and rollback/retry tests passed. See [delta replay results](ATTOM_DELTA_REPLAY_RESULTS.md) and [monitoring readiness](ATTOM_DAILY_MONITORING_READINESS.md). `_0003` absence and one-day evidence prevent a daily-readiness PASS.

## Accounting and next action

- SFTP authenticated sessions: **16** total after this continuation (one inventory session and one sequential download session).
- Baseline re-transfers: **6** authorized `_0001` recoveries. This continuation downloaded exactly six `_0002` Parquet files; no `_0003` file was available.
- `_0002` processed: **6** Parquet files; `_0003` processed: **0**.
- ATTOM API, RentCast, DataTree, county, Google, MLS calls: **0**.
- Database writes, migrations, production changes, deployments: **0**.

Next action: stop for Stan/ChatGPT review. No further update delivery, provider access, production integration, or purchase is authorized by this report.

## Prior evidence

The original failed AssignmentRelease copy, interrupted partials, historical manifests, prior POC reports, and earlier boundary findings remain preserved. A prior low-level `sftp.read` EOF probe was superseded by validated bounded `createReadStream` ranges; it is retained as history and is not used for current boundary conclusions. See [ATTOM Bulk Five-Dataset POC](ATTOM_BULK_FIVE_DATASET_POC.md) for the earlier sample certification.
