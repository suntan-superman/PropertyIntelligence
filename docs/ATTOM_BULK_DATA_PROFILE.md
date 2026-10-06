# ATTOM Bulk Baseline Data Profile

Local, read-only profile of the one ATTOM Outgoing sample delivery. See [machine-readable profile](../data/validation/attom-bulk-poc/profile.json), [sanitized lifecycle fixtures](../data/validation/attom-bulk-poc/sanitized-analysis.json), [file/hash manifest](../data/validation/attom-bulk-poc/file-manifest.json), and [schema inventory](ATTOM_BULK_SCHEMA_INVENTORY.md). No source row values containing owner/borrower/contact information, street addresses, parcel values, or legal descriptions are reproduced here.

## Dataset and geography profile

All `.rpt` totals reconcile to the downloaded Parquet row counts. The five expected counties are Duval FL (12031), Ventura CA (06111), Mecklenburg NC (37119), Ramsey MN (27123), and Douglas CO (08035). Combined Foreclosure has one additional reported Chippewa County, WI record (55017), outside ATTOM's stated sample geography; it is retained in the local raw sample, flagged as an anomaly, and excluded from the five-county comparisons.

| Dataset | Rows | Unique ATTOM IDs | County row counts: Ventura / Douglas / Duval / Ramsey / Mecklenburg |
|---|---:|---:|---|
| Recorder | 1,230,016 | 709,363 | 223,975 / 161,149 / 341,030 / 135,774 / 368,088 |
| RecorderDeletes | 166,532 | n/a (no ATTOM ID field) | 13,074 / 11,722 / 49,872 / 54,785 / 37,079 |
| AssignmentRelease | 3,865,063 | 969,667 | 783,124 / 594,556 / 957,404 / 317,182 / 1,212,797 |
| LoanModel | 1,187,700 | 1,187,700 | 225,116 / 126,565 / 334,909 / 140,887 / 360,223 |
| Preforeclosure | 32,574 | 18,642 | 5,667 / 1,851 / 13,436 / 3,416 / 8,204 |
| CombinedForeclosure | 6,109 | 6,109 | 326 / 174 / 4,860 / 211 / 537, plus one FIPS 55017 row |

The five-county FIPS and core field structure are consistent across these files. County row volumes and field populations are not uniform; Duval dominates both foreclosure files, while the California Ventura sample is materially smaller. The single extra Wisconsin row demonstrates that delivery geography should be validated rather than assumed.

## Identity, event keys, and joins

Property joins below use only ATTOM's `AttomID`/`ATTOMID`; no parcel/address-string joins were used. Match percentages are directional: common distinct IDs divided by the distinct IDs on each side.

| Pair | Distinct IDs left / right | Matched IDs | Left coverage | Right coverage |
|---|---:|---:|---:|---:|
| Recorder ↔ LoanModel | 709,363 / 1,187,700 | 667,557 | 94.11% | 56.21% |
| Recorder ↔ AssignmentRelease | 709,363 / 969,667 | 547,726 | 77.21% | 56.49% |
| Recorder ↔ Preforeclosure | 709,363 / 18,642 | 13,633 | 1.92% | 73.13% |
| Preforeclosure ↔ CombinedForeclosure | 18,642 / 6,109 | 6,020 | 32.29% | 98.54% |
| LoanModel ↔ Preforeclosure | 1,187,700 / 18,642 | 18,162 | 1.53% | 97.43% |

All declared `TransactionID` primary keys in Recorder, RecorderDeletes, AssignmentRelease, and Preforeclosure are unique within this delivery. CombinedForeclosure's layout does not declare a primary key; its sample has 6,109 unique ATTOM IDs and TransactionIDs. LoanModel is one row per ATTOM ID in this sample. Document numbers, case numbers, trustee reference numbers, and mortgage transaction identifiers are not uniformly unique and should not be treated as universal keys without a documented compound-key rule.

AssignmentRelease supplies `MortgageTransactionID` on 2,542,473 rows (65.78%); 2,216,743 distinct non-null values occur. Of those, 128,620 distinct IDs match Recorder `TransactionID` (140,022 rows). This low cross-file event-key overlap is observed, not a failed property join: Recorder has a much narrower recording-date window than the assignment/release file, and the sample does not explain every unmatched relationship. ATTOM should define identifier scope, history windows, and compound event identity before integration.

## Field populations and date coverage

Percentages are non-null rates; for numeric measures, the profile also records non-zero rates so a populated zero is not mistaken for usable financial evidence.

| Dataset / field | Overall population | Notes |
|---|---:|---|
| Recorder `ATTOMID`, county FIPS, document numbers/type | ~100% | `RecordingDate` 66.73%; full property address 99.94%; ZIP 95.36%; `APNOriginal` only 6.89%. `APNFormatted` exists but ATTOM has deprecated it for new integration work. |
| AssignmentRelease ATTOM ID, `ParcelNumberRaw`, FIPS, address, ZIP, document number, recording date, original document number/amount | 100% | `DocumentType` 99.98%; `MortgageTransactionID` 65.78%. The layout describes this as an ATTOM RTCode; no code dictionary was included. |
| LoanModel ATTOM ID | 100% and unique | First/second/third position amount fields are physically non-null on all rows, but non-zero on 76.60% / 23.93% / 2.47%. LTV and available/lendable equity are non-null on 93.17%; non-zero LTV 72.91%, equity 85.02%. Treat amount values as ATTOM modeled fields, not verified outstanding balances, until definitions/as-of semantics are confirmed. |
| Preforeclosure `RecordType`, FIPS, address, original amount, default amount | 100% | Foreclosure recording date 99.94%; auction date 49.37%. Default amount is non-null on all rows but non-zero on only 25.78%; opening bid non-zero 20.85%. |
| CombinedForeclosure `RecordType`, FIPS, parcel/address, original amount/default amount | 100% for listed fields | Foreclosure recording date 98.28%; auction date 11.79%. Default amount is non-zero on 6.20%; recorded opening bid non-zero on 3.31%. |
| RecorderDeletes `TransactionID` | 100% | Sole field in both layout and Parquet. |

Foreclosure auction-date population is county-sensitive. Preforeclosure / CombinedForeclosure auction-date rates are Ventura 46.80% / 23.01%, Douglas 100% / 97.13%, Duval 29.37% / 2.70%, Ramsey 100% / 81.99%, Mecklenburg 51.39% / 32.03%. The combined file's sparse Duval auction-date coverage is an important California/target-county qualification rather than proof that an auction did not occur.

Recorder's `RecordingDate` spans 2021-01-02 to 2026-09-10; AssignmentRelease spans 1991-01-11 to 2026-09-11; Preforeclosure spans 2020-09-01 to 2026-09-18; CombinedForeclosure spans 2018-01-02 to 2026-09-21. Publication dates are 2026-09-21/22. Several other date columns contain highly implausible values (including year 0005 and 9999 in AssignmentRelease, 1900 sentinels, and future/outlier term dates). They are preserved as observed and flagged for vendor semantics; no date cleanup or coercion was applied.

Preforeclosure record-type counts are NTS 11,892; LIS 9,490; NOD 7,003; NOS 4,189. CombinedForeclosure counts are LIS 4,699; NTS 588; NOD 585; NFS 132; REO 105. The supplied layouts do not define these code values, nor do they define whether CombinedForeclosure is a single current-state row per property; that needs ATTOM confirmation.

## Schema comparison

All layout fields have same-named Parquet fields and there are no Parquet-only or JSON-only columns. Physical type mismatches remain and are itemized field-by-field in the schema inventory: Recorder 23, CombinedForeclosure 12, LoanModel 3, Preforeclosure 10; RecorderDeletes and AssignmentRelease 0. Most are JSON `float` versus physical `DECIMAL`; Recorder also has JSON `integer` flags represented as Parquet `BOOLEAN`. These are not silently coerced.

The original `CombinedForeclosure.json` has one trailing comma and is not strict JSON. For inspection only, a trailing-comma-only in-memory normalization was used; the source bytes and hash were left untouched, and the parse issue is documented in the schema inventory. ATTOM's expected `CombineForeclosure.json` filename was not present; the supplied `CombinedForeclosure.json` was matched by its declared `table_name`. `Foreclosure.json` describes the supplied Preforeclosure Parquet table.

## Sanitized lifecycle review

Ten anonymized mortgage fixture aliases (M01–M10) have matching Recorder, AssignmentRelease, and LoanModel rows by ATTOM ID. Timelines show dated Recorder mortgage facts, AssignmentRelease document type/date codes and whether the explicit mortgage-transaction link is present, plus current-position field availability. They do not prove a complete lifecycle: ATTOM's document-code definitions are absent; the observed `MortgageTransactionID` → Recorder `TransactionID` relation is sparse; a one-time snapshot cannot distinguish missing history from active debt. No release, satisfaction, refinance, or currently-active status is inferred solely from an absent record.

Ten anonymized foreclosure fixtures (F01–F10) show multiple event records, stage codes, recording/auction/update dates, and source-event-ID presence. The data includes NOD, NOS, NTS, LIS, NFS and REO codes, and examples with differing stages and auction dates. It does not prove that a date change is a reschedule, that omission means cancellation, or that a later CombinedForeclosure code is legally authoritative. Rescission/cancellation semantics and event-ID stability require ATTOM's data dictionary and a second delivery.

## RecorderDeletes

The file contains 166,532 unique TransactionIDs and no reason, status, ATTOM ID, or deletion timestamp. Thirty-one IDs also occur in this Recorder sample; 166,501 do not. This does not establish the vendor's exact delete lifecycle, and a one-snapshot sample cannot establish whether absent IDs were already outside Recorder's five-year window. A future consumer should preserve immutable source history and represent a delete as a dated inactive/superseded observation, pending ATTOM's required semantics; it should never physically erase prior evidence.

## Delta, discovery, and portability

The schema supports a design for idempotent event/property ingestion using ATTOM ID plus source event keys, delivery identity/hash, and explicit supersession/deactivation. It does **not** prove weekly delta behavior, replay guarantees, correction behavior, stable event identifiers across deliveries, or complete delete semantics. A second dated delivery must demonstrate additions, unchanged rows, corrections, changed auction dates, rescissions/cancellations, completed foreclosure/REO transitions, delete replay, and stable transaction identifiers.

Within the five requested counties, the field names and basic schema are shared and .rpt row totals reconcile. The data still contains county-specific sparsity/type codes and one out-of-sample FIPS row. This supports technical portability testing, not a nationwide normalization claim; terminology, missingness, code dictionaries, and event timeliness need more geographies and multiple drops.
