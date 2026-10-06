# ATTOM API + Bulk Architecture (Future Concept Only)

**Status: design notes only. No adapter, migration, provider automation, persistence, or deployment is authorized or implemented.** This combines findings from the local exact-address ATTOM API POC with the one-delivery Bulk SFTP POC.

## Responsibility split

| Need | Preferred source | Intended role | Constraint |
|---|---|---|---|
| Broad mortgage-distress discovery | Bulk Preforeclosure / CombinedForeclosure | Find and observe many county-scoped distress events | A second delivery must prove delta semantics, correction behavior, stage/cancellation rules, and coverage. |
| Recorder/document history | Bulk Recorder | Historical recorded event and document metadata | Sample's Recorder window is narrower than AssignmentRelease; no document images were delivered. |
| Assignment/release history | Bulk AssignmentRelease | Document-coded assignment/release observations and mortgage linkage when populated | RTCode dictionary absent; explicit MortgageTransactionID linkage to Recorder is sparse. |
| Historical/current modeled mortgage fields | Bulk LoanModel | Broad periodic snapshot of loan positions, ATTOM amounts, LTV/equity fields | Amounts are estimates/model fields until definitions and as-of semantics are verified. |
| Exact-property identity | ATTOM API exact-address lookup, once | Resolve to one ATTOM property and establish persistent AttomID | Require unique exact-address result; do not substitute Kern APN9/ATN with ATTOM parcel values. |
| Current high-priority property refresh | ATTOM API | Explicit user-authorized exact-property refresh for an already-resolved AttomID | No automatic page-load/provider calls; current endpoint/package entitlements and billing units must be confirmed. |
| Current mortgage/equity refresh | ATTOM API Home Equity / Detail Mortgage | Refresh supported current fields when explicitly needed | A null field is not absence of a lien or loan; retain source/as-of and estimate limitations. |
| Current foreclosure detail | ATTOM API Preforeclosure | Explicit refresh of current available stage details | The single-property API POC returned HTTP 200 with no fixture foreclosure rows; Bulk supplies broader sample counts but not delta proof. |

The existing API POC returned exact-property identity through a unique `ExaStr` match for 3484 Haven, and observed transfer, mortgage, home-equity and preforeclosure endpoints. Its historical failed Kern APN9+FIPS corroboration remains unresolved evidence; ATTOM's written guidance makes it non-blocking after unique exact-address resolution. Bulk POC usage added zero API requests and zero API Reports.

## Identity and provenance rules

Any separately authorized future design should carry the following distinct fields, not collapse them:

`source_system`, `source_atn`, `source_apn9`, `attom_id`, `attom_parcel_number_raw`, `canonical_address_id`.

Use the persistent `AttomID` as the ATTOM property join key. Preserve `ParcelNumberRaw` byte-for-byte as returned. Do not use deprecated `ParcelNumberFormatted` for new integration work; `ParcelNumberAlternate` is supplemental only. Kern ATN/APN9 remain immutable source identities. Canonical address remains its own analyst-confirmed/versioned identity, not a guessed crosswalk.

## Conceptual, not implemented, ingestion flow

1. Receive a delivery into a restricted local/vendor-controlled landing area. Record source delivery name, source extract/publication timestamp, retrieval timestamp, file size, and SHA-256 before parsing.
2. Validate an explicit file whitelist, geography, file counts, Parquet footer, schema/layout compatibility, duplicate keys, date sanity, row totals, and all expected source reports. Quarantine unexpected geography/schema/file content instead of auto-normalizing it.
3. Parse to an immutable staging representation. Preserve original source event IDs and raw parcel number values. Normalize only documented types and code dictionaries; record every transform and retain the source hash.
4. Deduplicate property scope by AttomID. Deduplicate event scope only by a vendor-confirmed stable event key (potentially source system + event ID + dataset); `TransactionID` uniqueness in one file does not prove stability across deliveries.
5. Compare against a prior delivery. Create source observations for new, changed, deleted/inactive, and unchanged records; do not physically erase previous source evidence. Supersession/inactivation requires ATTOM's confirmed delete/correction semantics.
6. Publish candidate/event observations for PI review under a separately approved workflow. Do not change PI screening scores/statuses, create Deals, or treat ATTOM values as verified facts by default.
7. Call the API only after an explicit user action or approved high-priority refresh job with known target AttomID, call budget, consent/licensing, and request ledger. Bulk import itself must never trigger API calls.

## Evidence gaps before implementation

- One delivery only; no weekly delta/replay/correction evidence.
- `RecorderDeletes` has only TransactionID, no reason/timestamp/state; only 31 IDs overlap this Recorder sample.
- AssignmentRelease → Recorder transaction linkage is sparse (128,620 distinct `MortgageTransactionID`s matched to Recorder transaction IDs from 2,216,743 distinct non-null values); vendor should explain windows/identity scope.
- Layout type differences and CombinedForeclosure's trailing-comma JSON defect require corrected/contractually stable layouts.
- ATTOM event code dictionaries and foreclosure transition/cancellation semantics are absent.
- One unexpected FIPS 55017 row appeared in CombinedForeclosure.
- Licensed retention/display/derived-data rights, product scope, SFTP delivery cadence, support SLA, usage billing, API/Bulk overlap, jurisdictional coverage, deletion obligations, and security requirements need written answers.

This architecture should not be translated into migrations or provider code until those questions and the POC STOP review are complete and implementation is separately authorized.
