# ATTOM Bulk Five-Dataset Capability POC

**Status: LOCAL READ-ONLY POC COMPLETE — `MORE EVIDENCE REQUIRED`.**

This is a technical assessment of one ATTOM Outgoing sample delivery, not a purchase recommendation or production integration authorization. The POC stayed local. It did not call the ATTOM API, RentCast, Google, First American/DataTree, Kern County, Supabase/PostgreSQL, or Netlify; it made no Property Intelligence data changes.

## Receipt and handling

After Stan corrected `ATTOM_SFTP_USERNAME` and independently tested the account, the read-only SFTP login succeeded using credentials from local `.env` in memory. The exact pre-approved SFTP host was `data.attomdata.com:22`; the authenticated server key matched the pinned observed RSA fingerprint `SHA256:0Ly+dS5QtT4U9uxNc5Yq6fB40xStuHvP+4aPlzm79cU`. That fingerprint was obtained by an unauthenticated SSH scan and was not independently confirmed through an ATTOM-published out-of-band fingerprint; retain this as a transport trust limitation.

The `Outgoing` inventory was reviewed before data transfer. Only the six sample Parquet files, their six `.rpt` files, and six expected layouts were downloaded (18 files, **940,303,297 bytes** per complete verified transfer). The separate `Documentation` directory was not downloaded. No other remote folders were opened. The original `CombineForeclosure.json` name was absent; ATTOM supplied `CombinedForeclosure.json`, whose `table_name` matches the CombinedForeclosure Parquet. `Foreclosure.json` maps to the supplied Preforeclosure Parquet. All exact filenames, remote mtimes, local download times, byte counts, and local SHA-256 hashes are recorded in [file-manifest.json](../data/validation/attom-bulk-poc/file-manifest.json). The entire [raw directory](../data/validation/attom-bulk-poc/raw/) is Git-ignored.

Downloaded files were checked by exact size, ordered SFTP range reassembly was byte-compared with ATTOM's sequential read on a bounded sample, all six Parquet files opened successfully in DuckDB, and the `.rpt` county/total counts matched each Parquet profile. An earlier experimental concurrent reader was rejected after footer/byte-integrity checks; its local copies were overwritten from the verified ordered-stream path before analysis. No report relies on the rejected copies.

ATTOM's `.rpt` headers date the underlying extract files from **2026-09-21 through 2026-09-22**. The provisioned SFTP files were modified **2026-10-05**. This is one snapshot, not a chronological delivery pair.

## Dataset counts and geography

| Dataset | Rows | Unique ATTOM IDs | Layout |
|---|---:|---:|---|
| Recorder | 1,230,016 | 709,363 | Recorder.json |
| RecorderDeletes | 166,532 | not supplied | RecorderDeletes.json |
| AssignmentRelease | 3,865,063 | 969,667 | AssignmentRelease.json |
| CombinedForeclosure | 6,109 | 6,109 | CombinedForeclosure.json |
| LoanModel | 1,187,700 | 1,187,700 | LoanModel.json |
| Preforeclosure | 32,574 | 18,642 | Foreclosure.json |

The five expected FIPS are 06111 Ventura CA, 08035 Douglas CO, 12031 Duval FL, 27123 Ramsey MN, and 37119 Mecklenburg NC. All `.rpt` totals reconcile. CombinedForeclosure contains one additional FIPS **55017, Chippewa County, WI** row not in the stated sample geography; it is explicitly retained and flagged, not silently discarded.

## Schema and identity

The JSON/Parquet comparison found no JSON-only or Parquet-only fields. Type differences remain: Recorder 23, CombinedForeclosure 12, LoanModel 3, Preforeclosure 10; none for RecorderDeletes or AssignmentRelease. Most mismatches are JSON float declarations against Parquet DECIMAL; Recorder also has integer-declared flags represented as BOOLEAN. Every field, description, nullable declaration, inferred physical nullability, candidate key family, and `MATCH` / `PARQUET_ONLY` / `JSON_ONLY` / `TYPE_MISMATCH` result is in the [schema inventory](ATTOM_BULK_SCHEMA_INVENTORY.md). The CombinedForeclosure layout has a trailing-comma syntax error; a transparent in-memory parse normalization was used only for inspection, and its original source/hash was not changed.

ATTOM's written API identity guidance remains the identity rule for any future design: join property datasets by persistent `AttomID`; retain `ParcelNumberRaw` exactly; do not use deprecated `ParcelNumberFormatted` as a new key; do not overwrite Kern `ATN` or `APN9`. No parcel or address-string joins were used.

| Pair by ATTOM ID | Unique-ID intersection | Left coverage | Right coverage |
|---|---:|---:|---:|
| Recorder ↔ LoanModel | 667,557 | 94.11% | 56.21% |
| Recorder ↔ AssignmentRelease | 547,726 | 77.21% | 56.49% |
| Recorder ↔ Preforeclosure | 13,633 | 1.92% | 73.13% |
| Preforeclosure ↔ CombinedForeclosure | 6,020 | 32.29% | 98.54% |
| LoanModel ↔ Preforeclosure | 18,162 | 1.53% | 97.43% |

AssignmentRelease's explicit `MortgageTransactionID` → Recorder `TransactionID` event join matches 128,620 of 2,216,743 distinct non-null mortgage transaction IDs (140,022 rows). The property-level ATTOM-ID join is substantially higher; the event-key discrepancy requires vendor explanation and delivery-window context.

## Capability findings

- **Continuous distress discovery:** technically plausible. Preforeclosure has 32,574 rows and NOD/NOS/NTS/LIS record-type codes; CombinedForeclosure has 6,109 rows and adds NFS/REO codes. This one snapshot shows relevant candidate/event populations and cross-file joins. It cannot prove that records are new since a prior delivery, how an auction date change is expressed, or whether a missing row is a cancellation.
- **Mortgage lifecycle:** Recorder and AssignmentRelease supply transaction/document identifiers, recording dates and mortgage facts; AssignmentRelease also supplies an explicit MortgageTransactionID for 65.78% of rows. Ten sanitized fixture aliases have Recorder, AssignmentRelease and LoanModel coverage. However document-code definitions are absent, date fields include implausible/sentinel years, and explicit event links are sparse. The sample cannot safely establish that a loan remains active or that an absent release is proof of no release.
- **Current loan position/equity:** LoanModel provides first/second/third position fields, ATTOM-ID property joins, LTV and available/lendable equity. Amount fields are often physically non-null but zero-filled; non-zero rates are 76.60%, 23.93%, and 2.47% by position. The sample does not establish amortized balance methodology, valuation/as-of meaning for every field, or replacement of PI's estimator without ATTOM definitions and validation.
- **Underlying recorder provenance:** Recorder exposes document/transaction numbers, document type, recording dates, property and mortgage fields, and transfer parties. It is a potentially useful event/provenance feed, but codes, correction history, cross-delivery identifiers, and retention/display rights need confirmation.
- **Foreclosure lifecycle:** event rows expose type code, recording/update/create dates, auction date/time and bid/default/loan fields. Type codes include LIS/NOD/NOS/NTS/NFS/REO, but no definitions or explicit cancellation/rescission semantics were supplied. CombinedForeclosure substantially overlaps Preforeclosure by ATTOM ID (98.54% of its IDs) and contains some later/different stage codes in the fixture review; it is not proven to be authoritative current state.
- **RecorderDeletes:** 166,532 unique TransactionIDs, no reason/status/timestamp/ATTOM ID. Only 31 occur in the Recorder sample, 166,501 do not. This is insufficient to infer the reason or timing of inactive status. Preserve prior history and represent future deletes as explicit inactivation/supersession observations, pending ATTOM's contract.
- **Portability:** the same field names/layout patterns occur across the five requested counties and reports reconcile, but field population and event-code distributions vary significantly. CombinedForeclosure has one out-of-sample FIPS. The sample supports a normalized-schema design; it does not prove nationwide completeness or eliminate jurisdiction-specific validation.

Full field-population and date distributions are in the [baseline data profile](ATTOM_BULK_DATA_PROFILE.md) and [profile.json](../data/validation/attom-bulk-poc/profile.json). Sanitized, alias-only lifecycle observations are in [sanitized-analysis.json](../data/validation/attom-bulk-poc/sanitized-analysis.json).

## API/bulk division and PI fit

The existing local ATTOM API POC evaluated exact-property refresh on the 3484 Haven fixture; this bulk run added no API calls or ATTOM API Reports. A future design concept is documented in [ATTOM API + Bulk Architecture](ATTOM_API_BULK_ARCHITECTURE.md): bulk for broad discovery and longitudinal recorder/foreclosure/assignment feeds, API for explicit exact-property refresh and current high-priority detail. This is not an adapter, purchase recommendation, or permission to persist ATTOM data.

The [PI fit analysis](ATTOM_BULK_PI_FIT_ANALYSIS.md) concludes that the sample is useful for architecture evaluation but does not yet justify a production importer or purchase. The first weekly delta must demonstrate stable event identity, add/update/delete/replay semantics, corrections and auction changes, completed/cancelled transitions, geographic scope, effective/observed timestamps, and relevant product retention/display rights.

## Usage, security, and final conclusion

- ATTOM SFTP: authenticated read-only SFTP inventory and approved file downloads only; exactly 18 approved files in the verified final set. The complete sample set was transferred twice during integrity-method validation; partial probes/aborted attempts also occurred, so exact total SFTP bytes are not asserted. SFTP traffic is distinct from ATTOM API report usage.
- ATTOM API calls / API Reports consumed by this bulk POC: **0 / 0**. Prior API POC accounting is unchanged.
- RentCast / Google / county / First American calls: **0 / 0 / 0 / 0**.
- Supabase/PostgreSQL/Netlify traffic or writes: **0**.
- Raw data remains ignored locally. Credential/artifact scans were run; no SFTP/API/DataTree/database secrets were placed in reports or committed artifacts. Owner, borrower, contact, address, parcel and legal-description values are excluded from shareable profiles/timelines.

### Technical conclusion

**MORE EVIDENCE REQUIRED.** This single snapshot is technically promising for broad discovery, property-level identity joins, historical recorder events, modeled loan fields, and foreclosure stage observations. It does not prove weekly delta/replay/delete behavior, stable event corrections, complete mortgage lifecycle, authoritative foreclosure status, nationwide coverage, or the legal/package semantics required for PI. Do not build the importer, purchase ATTOM, or test against production PI data from this POC alone.

**STOP FOR STAN/CHATGPT REVIEW.** No additional feature work or provider calls are authorized by this POC.
