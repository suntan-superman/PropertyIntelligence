# ATTOM Delta Replay Results

## Status

**One ordered baseline → `_0002` replay completed in an isolated in-memory DuckDB harness.** The set passed transfer, schema, and full-content validation. `_0003` and `DONE_0003` were not present, so a second delivery day could not be replayed. Results below are empirical for this single delivery only; they do not establish continuous daily reliability or production readiness.

## Delivery order and inventory

Fresh pinned-host-key inventory at `2026-10-08T21:20:26Z` found six `_0002` Parquet datasets and `WORKSIDE_SOFTWARE_DONE_0002.dat` (2 bytes, modified `08:44:24Z`). Each expected `_0002` dataset had a Parquet file; all six files and their report sidecars were timestamped before the completion marker. No `_0003` dataset or `DONE_0003` marker was present.

The certified baseline data-bearing `PublicationDate` range is `2026-10-07` for all five date-bearing `_0001` feeds. Nonempty `_0002` feeds report `PublicationDate=2026-10-08`; AssignmentRelease has zero rows. This supports baseline → `_0002` chronology by content date, not suffix alone. AssignmentRelease `_0001` had a later SFTP modification timestamp because the vendor replaced/re-uploaded the corrupted source during recovery; its content date remains October 7. RecorderDeletes has no publication-date field; it is associated with the completed `_0002` set by its file, timestamp, and marker. No `_0003` chronology was inferred.

All six `_0002` files were transferred one at a time using one ordered SFTP stream per file, with no fastGet, parallel payload transfer, or restart. Size, remote/local `PAR1` boundaries, SHA-256, schema, and all-column/all-row-group decode checks passed. The six file-level hashes, sizes, timestamps, and row counts are in the [sequential delivery manifest](../data/validation/attom-bulk-poc/sequential-delivery-manifest.json). All delta schemas match their corresponding baseline schemas. No row-level PII is included in reports.

## Observed `_0002` changes

| Dataset | Key / operation | Observed result |
|---|---|---|
| AssignmentRelease | `TransactionID` UPSERT | 0 rows; no assignments/releases observed in this delivery. |
| Foreclosure | `TransactionID` UPSERT | 37 new transaction keys, 19 new ATTOM property IDs within this feed. Raw `RecordType` counts: LIS 20, NOD 2, NOS 8, NTS 7. No existing transaction key was updated. Codes are reported as returned, not expanded into vendor meanings. |
| LoanModel | `ATTOMID` UPSERT | 428 rows: 394 existing property keys changed; 34 new keys. Loan-position, amount, instrument/date/type/lender/rate fields changed among existing rows. LTV, AvailableEquity, and LendableEquity fields did not change in this batch. |
| Recorder | `TransactionID` UPSERT | 514 rows: 50 existing transaction keys corrected; 464 new transactions; 206 ATTOM property IDs new relative to this feed's baseline. 25 corrected rows changed ATTOMID and are identity/join-review candidates; party/lender fields were compared but their values are not disclosed. |
| CombinedForeclosure | Full replacement keyed by `TransactionID` | 6,115 rows before and after; 0 new keys, 0 disappearing keys. All 6,115 `PublicationDate` values changed, but 0 business fields changed; 0 auction-date changes and 0 status-field changes. The single FIPS `55017` row persists. Publication-only refresh is not counted as a substantive foreclosure update. |
| RecorderDeletes | Append invalidation history keyed by `TransactionID` | 30 unique invalidation IDs. None matched tested baseline or `_0002` AssignmentRelease/Recorder/Foreclosure transaction history. All 30 remain quarantined as unmatched; no source record was physically deleted. Target-dataset semantics need vendor confirmation. |

Across the updated property-bearing feeds, 46 distinct ATTOM property IDs were new relative to the union of baseline property IDs. This is a cross-feed count, not the sum of per-feed additions. No duplicate update keys were present. The CombinedForeclosure FIPS `55017` row is outside the five expected sample counties and remains quarantined; it was also present once in the baseline and earlier sample, so it was not dropped or allowed to become a PI opportunity.

## Replay and reliability checks

- Dataset-specific keys were used; no common key was assumed. Current-key state was replayed as baseline → `_0002`. Full prior rows were preserved in the isolated version history for 394 changed LoanModel records and 50 corrected Recorder records; unchanged/new rows did not create prior versions. The immutable source Parquet files remain available for reconstruction.
- Reapplying each UPSERT produced 0 changed rows, 0 inserts, and 0 additional history versions. All update keys were unique. Reapplying the same CombinedForeclosure SHA-256 added no snapshot; both baseline and `_0002` source snapshots remain preserved.
- Replaying the same 30 RecorderDeletes IDs appended no duplicate invalidation records. Unmatched IDs remain in quarantine; the harness did not infer that absence meant a record should be removed.
- A synthetic sequence-gap check blocked a delivery numbered 4 when sequence 3 was expected. A synthetic in-memory transaction interruption rolled back without partial rows; retry after rollback succeeded. These are harness tests, not vendor-observed events.
- Deterministic final compact-state fingerprints and row counts were identical after the repeated UPSERT application. No persistent database was used.

## Event metrics and interpretation

For `_0002`, new foreclosure transactions = **37** (including 2 NOD and 7 NTS raw type codes); updated existing NOD/NTS transaction keys = **0**; AssignmentRelease rows = **0**; new Recorder transactions = **464**; Recorder corrections = **50**; invalidation IDs = **30**, with **0** matched to tested history; LoanModel changes = **394** existing and **34** new properties; CombinedForeclosure business changes = **0**, auction-date changes = **0**, status changes = **0**, disappearing keys = **0**. Duplicate-key rows prevented = **0** (none existed); repeated-delivery replay introduced **0** duplicate mutations or history versions.

Preforeclosure could not be measured: no Preforeclosure file exists in this certified six-file baseline or this `_0002` inventory. Missing `_0003` is reported as **NOT PRESENT IN THIS INVENTORY**, not as a failed delivery or proof no events occurred. A single delivery cannot establish alert timeliness, repeatability, recovery from a truly missed vendor delivery, or longer-term snapshot semantics.

The machine-readable counts and validation are in `data/validation/attom-bulk-poc/sequential-replay-metrics.json`; baseline profile and schemas remain in the linked sequential artifacts. No provider API, production database, application, or scoring operation occurred.
