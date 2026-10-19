# PI Monitoring V1.1 — Real ATTOM Data Certification

**Classification:** `REAL ATTOM SOURCE EVENTS CERTIFIED`  
**Investor-ready alert certification:** `NOT ACHIEVED` — no selected source event has a verified PI canonical property identity.  
**Scope:** Reuse the certified local `_0001 → _0002` delivery only. No new SFTP/API calls, installs, production reads/writes, migrations, provider calls, or deployment.

## Result

The remaining source-row-to-monitoring-event gap is closed for the seven required event classes. Each selection is an actual row-level comparison from the existing certified Parquet deliveries, exported as a sanitized fixture, normalized by the existing monitoring contract, classified by the existing materiality policy, processed by the existing pipeline, and replayed a second time.

All seven source events correctly remain quarantined and generate **zero investor-facing alerts**. ATTOMID is retained as a vendor identity only; it is not treated as a PI canonical property ID. No architecture, scoring, MAO, Monte Carlo, or dashboard layout was changed. The certified-evidence panel copy/counts were updated to distinguish source-event certification from investor-ready alerts; the event rows themselves are not loaded into the property dashboard.

## Existing tooling reused

- The prior replay used DuckDB **1.5.6** through the Python 3.13 runtime, not a Node dependency or standalone DuckDB CLI. The already-staged package is at `C:\Users\sjroy\AppData\Local\Temp\attom-duckdb-tools-f6aec7acf5994b62851ec8b5931a2136`.
- The package was invoked with a process-local `PYTHONPATH` and an in-memory DuckDB connection. No dependency was installed. The certified Parquet files were read in place and not modified.
- The workspace retains the certified replay metrics and delivery manifest, but not the original row-level replay program. The existing aggregate metrics were not treated as event rows. Row selections used the same previously certified keys: `TransactionID` for Foreclosure, Recorder, RecorderDeletes, and CombinedForeclosure; `ATTOMID` for LoanModel. No separate ingestion engine or persisted replay database was created.
- Source-file hashes below come from the certified delivery manifest. Individual row fingerprints are SHA-256 over deterministic serialization of the full source row, computed in memory; full rows were not exported. There is no vendor row checksum, so these are local comparison fingerprints, not vendor-signed checksums.

## Actual source selections and outcomes

| Selection | Stable source reference | Comparison | Identity / geography | Pipeline result |
|---|---|---|---|---|
| New Foreclosure transaction | `TransactionID 122142240` | New `_0002` row; recorded `2026-10-07`, published `2026-10-08` | ATTOMID retained verbatim but unverified; FIPS `37119` in sample scope | `NEW_FORECLOSURE_TRANSACTION`; `UNRESOLVED`; quarantined; no alert |
| New Recorder transaction | `TransactionID 1450695769` | New `_0002` row; recorded `2026-09-28`, published `2026-10-08` | ATTOMID unverified; FIPS `06111` in sample scope | `NEW_RECORDED_TRANSACTION`; `UNRESOLVED`; quarantined; no alert |
| Corrected Recorder transaction | `TransactionID 1435693130` | Same key and ATTOMID; prior/current full-row fingerprints differ. Changed field names withheld from the shareable fixture to avoid exposing possible personal or unnecessary property details. | ATTOMID unverified; FIPS `12031` in sample scope | `RECORDED_TRANSACTION_CORRECTED`; `UNRESOLVED`; quarantined; no alert |
| Recorder ATTOMID mapping correction | `TransactionID 1437310359` | Prior ATTOMID `1003533044` → current ATTOMID `999999999`; non-mapping business fields were equal in the selected source-row comparison. | Mapping conflict remains unresolved against PI canonical identity; FIPS `06111` in sample scope | `PROPERTY_IDENTITY_CHANGED`; prior mapping retained, current vendor mapping recorded; quarantined; no alert |
| LoanModel change | `ATTOMID 121133` | Second-position modeled amount `0` → `71,535`; first position `241,544` unchanged; LTV and equity outputs unchanged | ATTOMID unverified; FIPS `12031` in sample scope | `LOAN_MODEL_CHANGE`; model estimate only, no payoff inferred; `UNRESOLVED`; quarantined; no alert |
| Unmatched RecorderDeletes tombstone | `TransactionID 1422806320` | Present in `_0002` RecorderDeletes and absent from supplied `_0001` Recorder history | No property identity or geography available | `RECORDED_TRANSACTION_INVALIDATED`; retained as unmatched tombstone; no physical delete; quarantined; no alert |
| CombinedForeclosure publication-only refresh | `TransactionID 63154921` | Publication date `2026-10-07` → `2026-10-08`; all other compared fields unchanged | ATTOMID unverified; FIPS `12031` in sample scope | `COMBINED_FORECLOSURE_REFRESH`; source-level publication-only; quarantined pending identity; no alert |

The value `999999999` is preserved exactly where observed as an ATTOMID, but no judgment that it is a valid property identity is made. That uncertainty is reflected in quarantine rather than silently corrected.

The certified `_0002` profile also records one CombinedForeclosure row in FIPS `55017`. That geography remains excluded from the selected fixture and from in-scope monitoring; it is not dropped or relabeled as a PI property. RecorderDeletes is limited to Recorder; unmatched keys remain tombstones. No undocumented Recorder/Foreclosure event-code meanings were inferred. The written clarification that physical `FORECLOSURE` is the Preforeclosure product is applied only to the dataset family.

## Delivery provenance

| Dataset | `_0001` file SHA-256 | `_0002` file SHA-256 |
|---|---|---|
| Foreclosure | `48b67330715362139e1c34e8551d1611a32d9afac4ac38b50de7492d4dfafb37` | `6ce5891c608619afc8afca4ae0bbd162dfb48e034d5370cfbf5336c55cc5d8b7` |
| Recorder | `83caf29cf23147925f3ea1300c1bdf1fbf20cdbe258c75121ad46e5d88c81659` | `a9b459ec7f78b8353277b093285e75a52cbfec9189600770c6b9666672c7a558` |
| LoanModel | `e9699fdf2c893b2ab3aa20fb8eab2822bd9550b17a077004ca4c540b4dcb8097` | `6db431db886adf8482e86ce8147c3b1b6221a77c8e2a1b4149c84ee47e180126` |
| RecorderDeletes | `4dc42ae3617021dcc591bbc2f5d4605c3999ee9a3a72cfe0c9fa8a47ec9ee068` | `b23b2ffd155195b647957241937090cac5d5d180ee85c4ed5a22593b742a0a05` |
| CombinedForeclosure | `46e1e30a333ed5469092a7f1c755b9177b4ea20f51a14c73cb0d1c004e043f16` | `1eeab2685915c3a8337abbc64cadf1e3c0af26b20e4639ce173e2b395b083e34` |

The machine-readable sanitized source fixture is [real-attom-events.json](../data/validation/monitoring-v1-1/real-attom-events.json). Actual pipeline outcomes, materiality, quarantine, alert eligibility, and replay results are recorded in [real-attom-certification-results.json](../data/validation/monitoring-v1-1/real-attom-certification-results.json). These fixtures preserve the source transaction identifiers/ATTOMIDs needed for internal certification, but contain no actual property address, owner/contact fields, raw row, raw payload, or absolute source-file path. The raw Parquet files remain in their existing gitignored directories.

## Regression and controls

- Monitoring unit and real-data adapter/pipeline tests: **23/23 passed**, 0 skipped.
- Actual source classes, source provenance, previous/current comparison, ATTOMID handling, materiality, quarantine, and idempotent replay: **passed**.
- Real selected events: **7 quarantined**, **0 local alerts**, replay **7 duplicate events suppressed**, **0 insertions**.
- Investor-ready alert certification: **not achieved**, correctly. No selected row is joined to a verified PI canonical property.
- UI status-only copy and count correction: existing monitoring Playwright QA rerun; no event rows or property identities loaded into the UI.
- Provider/API calls: **0**. Production database writes: **0**. Migrations: **0**. ATTOM SFTP downloads: **0**. Deployment: **0**.

## Limits and next gate

This certifies source-event normalization and safe local handling for one already-certified daily delivery only. It does not establish that any sampled ATTOMID maps to a real PI `Property`, does not authorize alerts to investors, and does not validate consecutive-day ordering beyond the previously certified `_0001 → _0002` replay. The next product gate would require a separately authorized, exact identity-resolution design and additional consecutive vendor deliveries; no production integration work is started here.
