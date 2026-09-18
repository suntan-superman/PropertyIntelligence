# Property Intelligence Engine — Kern County POC-1

## Codex Implementation Specification

**Project root:** `C:\Users\sjroy\Source\PropertyIntelligence`  
**Language:** JavaScript / Node.js only  
**Purpose:** Prove reliable Kern County Power-to-Sell ATN → Assessor parcel resolution before building the application.

## 1. Scope

Build only this pipeline:

```text
Power-to-Sell CSV
  -> normalize/validate ATN
  -> inspect live Kern ArcGIS metadata
  -> query Assessor parcel layer
  -> verify exact ATN identity
  -> normalize attributes
  -> preserve provenance
  -> enriched CSV/JSONL
  -> QA/validation report
```

Do **not** build React, Firebase, Cloud Run, mobile, AI, scoring, ARV, comps, repair estimates, NOD/NOTS ingestion, Daily Report integration, zoning, geographic classification, skip tracing, Home Advisor integration, or investor reports.

Record useful out-of-scope discoveries in `docs/FUTURE_WORK.md`.

## 2. Input

Place the extracted September 15, 2026 dataset at:

`data/raw/kern_power_to_sell_2026-09-15.csv`

Expected columns include:

- `owner_name`
- `atn`
- `parcel_amount_owed`
- `owner_total_owed`
- `source_date`
- `source`
- `source_page`

Do not assume column order. Treat the raw CSV as immutable.

## 3. Kern County source

Preferred official service:

`https://maps.kerncounty.com/arcgis/rest/services/Assessor/Assessor_Public/MapServer`

Expected parcel layer: **Layer 2 — Parcels Land**.

Expected layer endpoint:

`https://maps.kerncounty.com/arcgis/rest/services/Assessor/Assessor_Public/MapServer/2`

Expected query endpoint:

`https://maps.kerncounty.com/arcgis/rest/services/Assessor/Assessor_Public/MapServer/2/query`

These are expected locations, not permission to hard-code assumptions about fields. Retrieve MapServer and Layer 2 metadata with `f=json` before querying records. Determine actual field names and capabilities at runtime.

The likely ATN field resembles `Assessor_Tax_No`; verify it from metadata.

## 4. Structure

Create:

```text
data/raw/
data/samples/
data/enriched/
data/cache/parcels/
data/validation/
docs/
scripts/
src/config/
src/sources/kern/
src/io/
src/provenance/
src/validation/
src/utils/
tests/fixtures/
```

Recommended files:

```text
scripts/inspect-kern-layer.js
scripts/build-poc1-sample.js
scripts/enrich-kern-atns.js
scripts/validate-poc1.js
scripts/summarize-poc1.js

src/config/kern.js
src/sources/kern/arcgisClient.js
src/sources/kern/metadata.js
src/sources/kern/atnNormalizer.js
src/sources/kern/parcelResolver.js
src/sources/kern/responseNormalizer.js
src/io/csv.js
src/io/jsonl.js
src/io/cache.js
src/provenance/provenance.js
src/validation/validators.js
src/validation/metrics.js
src/utils/logger.js
src/utils/retry.js
src/utils/sleep.js
```

Also create `README.md`, `.env.example`, `.gitignore`, `docs/ARCHITECTURE.md`, `docs/DATA_DICTIONARY.md`, `docs/FUTURE_WORK.md`, and `docs/POC1_RUNBOOK.md`.

Use JavaScript only. No TypeScript.

## 5. Dependencies

Prefer native Node APIs. Native `fetch` is preferred. Lightweight CSV packages are acceptable (`csv-parse`, `csv-stringify`). Use `dotenv` if needed. Prefer Node's built-in `node:test` unless there is a compelling reason otherwise.

## 6. Metadata discovery

Implement:

`npm run kern:inspect`

Fetch service and Layer 2 metadata and save:

```text
data/cache/kern-mapserver-metadata.json
data/cache/kern-parcel-layer-metadata.json
```

Report:

- layer ID/name
- Object ID field
- geometry type
- spatial reference
- maximum record count
- supported query formats/capabilities
- pagination/order-by/statistics support
- every field name, alias, and type

Identify candidate fields for ATN, APN, situs address, use code, acreage, legal type, land value, improvement value, tax-rate area, and roll type.

Do not silently choose ambiguous fields. Fail clearly if required identifiers cannot be mapped unambiguously.

Generate/update `docs/DATA_DICTIONARY.md` from observed metadata. Do not invent field meanings.

## 7. ATN normalization

Always preserve `atn_raw` and derive `atn_normalized`.

Normalization must:

1. trim whitespace;
2. normalize Unicode whitespace;
3. normalize Unicode dash variants;
4. remove accidental surrounding punctuation only;
5. preserve leading zeros;
6. never convert an ATN to a number;
7. reject malformed/uncertain ATNs rather than guessing.

Determine the canonical ArcGIS representation by inspecting actual records. Do not assume hyphens should be removed.

Tests must cover leading-zero ATNs, whitespace, Unicode dashes, blanks, malformed strings, unexpected characters, and already-normalized values.

## 8. Query discovery

Before bulk work, programmatically test a handful of known ATNs and determine the exact query representation accepted by Kern.

Conceptually:

`<verified ATN field> = '<ATN>'`

Test formatted ATNs, leading-zero ATNs, and an ATN belonging to a multi-ATN owner.

URL-encode all parameters. Use `returnGeometry=false` for POC-1. Request only necessary attributes.

Document the verified query strategy in `docs/POC1_RUNBOOK.md`.

## 9. Resolver statuses

Every input row must end with exactly one status:

- `MATCHED_EXACT`
- `NOT_FOUND`
- `MULTIPLE_MATCHES`
- `INVALID_ATN`
- `REQUEST_FAILED`
- `SCHEMA_ERROR`

`MATCHED_EXACT` requires:

1. exactly one feature returned;
2. returned ATN normalizes to the same canonical ATN as input;
3. required parcel identifiers are present.

Never guess among multiple features. Save candidate responses and return `MULTIPLE_MATCHES`.

A false exact match is worse than a `NOT_FOUND`.

## 10. Output schema

Preserve source fields and append available GIS fields. Target fields, where actually supported:

```text
owner_name
atn_raw
atn_normalized
parcel_amount_owed
owner_total_owed
power_to_sell_source_date
power_to_sell_source_page

kern_object_id
kern_atn
apn
situs_address
use_code
legal_type
acreage
land_value
improvement_value
other_improvement_value
personal_property_value
exemption_value
tax_rate_area
roll_type

match_status
match_confidence
retrieved_at
gis_source_url
```

If the live service does not expose a target field, leave it unavailable and document that fact. Never fabricate it.

For POC-1, `MATCHED_EXACT` may use `match_confidence=1.0`; do not invent confidence values for unresolved statuses.

## 11. Provenance

Keep Power-to-Sell and GIS evidence distinct.

The JSONL representation should include provenance similar to:

```json
{
  "power_to_sell": {
    "source": "kern_power_to_sell",
    "source_date": "2026-09-15",
    "source_page": 123
  },
  "kern_assessor_gis": {
    "service_url": "...",
    "layer_id": 2,
    "retrieved_at": "ISO-8601"
  }
}
```

Never replace the Power-to-Sell owner name with another source's value.

## 12. Caching and reproducibility

Cache raw/diagnostic ArcGIS responses under `data/cache/parcels/`, keyed by a safe hash of the canonical ATN.

Cache:

- query parameters
- timestamp
- HTTP status
- ArcGIS response
- normalized result/status

Reuse valid cache entries unless `--refresh` is supplied. The run must be resumable and deterministic.

## 13. Networking

Be conservative with the public service initially:

```text
concurrency: 1
delay: 150 ms
timeout: 15 seconds
max retries: 4
```

Retry transient timeout/network failures and HTTP 429/500/502/503/504 only. Use exponential backoff with jitter. Do not retry deterministic `NOT_FOUND`, malformed queries, or schema errors.

If 429 occurs, increase delay automatically. Never bypass throttling/access controls.

## 14. Deterministic 100-record sample

Implement:

`npm run kern:sample`

Do not take the first 100 rows.

Build a reproducible stratified sample of approximately:

```text
20 < $1,000
20 $1,000-$4,999.99
20 $5,000-$9,999.99
20 $10,000-$24,999.99
20 $25,000+
```

Ensure the sample includes individual-looking owners, trusts, LLC/corporations, multi-ATN owners, leading-zero ATNs, and high balances.

Use deterministic hashing or a fixed seed.

Write:

```text
data/samples/kern_poc1_sample_100.csv
data/samples/kern_poc1_sample_manifest.json
```

The manifest should explain sample strata/selection.

## 15. POC run

Implement:

`npm run kern:enrich:poc`

Input:

`data/samples/kern_poc1_sample_100.csv`

Outputs:

```text
data/enriched/kern_poc1_enriched_100.csv
data/enriched/kern_poc1_enriched_100.jsonl
```

Show progress such as:

`[63/100] 294-021-06-00-4 MATCHED_EXACT`

Avoid printing owner names unnecessarily in logs.

## 16. Automated validation

Implement:

`npm run kern:validate:poc`

Generate:

```text
data/validation/kern_poc1_validation.json
data/validation/kern_poc1_validation.csv
docs/POC1_VALIDATION_REPORT.md
```

Metrics:

```text
input_records
valid_atns
invalid_atns
matched_exact
not_found
multiple_matches
request_failed
schema_error
exact_match_rate
resolution_rate
failure_rate
duplicate_input_atns
duplicate_output_atns
```

Assert:

- output row count equals input row count;
- no input rows disappeared;
- no new ATNs appeared;
- owner names and tax amounts are unchanged;
- leading zeros survive;
- every `MATCHED_EXACT` returned ATN canonically equals its input ATN.

## 17. Manual validation

After enrichment, deterministically select 20 varied `MATCHED_EXACT` records and create:

`data/validation/kern_poc1_manual_validation_20.csv`

Columns:

```text
atn
apn
situs_address
use_code
parcel_amount_owed
manual_verified
manual_result
manual_notes
verified_at
```

The human tester must verify these against an official Kern County property/Assessor display. Codex must leave the manual fields unverified.

## 18. GO / CONDITIONAL GO / NO-GO

### GO

Proceed only if all are true:

1. metadata discovery succeeds;
2. exact query strategy is documented;
3. 100-record run completes without systemic schema failure;
4. valid-ATN exact resolution rate is **>=95%**;
5. all `MATCHED_EXACT` records pass canonical ATN equality;
6. source values are not silently altered;
7. manual validation is **20/20 correct parcel identity**;
8. no unacceptable throttling/access restriction is observed;
9. cached reruns are deterministic;
10. validation report is complete.

### CONDITIONAL GO

If exact resolution is **90%-94.99%**, stop before a full run. Analyze every failure class (format differences, stale records, mineral parcels, duplicate GIS features, service gaps, parser issues) and produce a recommendation.

### NO-GO

Stop if:

- exact resolution <90%;
- ATNs cannot be reconciled reliably;
- access becomes blocked;
- success would require bypassing controls;
- data semantics cannot establish parcel identity;
- **any manually checked `MATCHED_EXACT` is actually the wrong parcel**.

Do not weaken acceptance criteria to make the POC pass.

## 19. Full run is gated

Implement support for the full input, but do not execute it automatically.

Require an explicit confirmation flag, e.g.:

`npm run kern:enrich:full -- --confirm-full-run`

Without it, exit safely with:

`FULL RUN BLOCKED: POC approval and --confirm-full-run are required.`

When later approved, write:

```text
data/enriched/kern_power_to_sell_enriched.csv
data/enriched/kern_power_to_sell_enriched.jsonl
```

and a full validation report.

## 20. npm scripts

Create convenient commands similar to:

```json
{
  "kern:inspect": "node scripts/inspect-kern-layer.js",
  "kern:sample": "node scripts/build-poc1-sample.js",
  "kern:enrich:poc": "node scripts/enrich-kern-atns.js --sample",
  "kern:validate:poc": "node scripts/validate-poc1.js --sample",
  "kern:summarize:poc": "node scripts/summarize-poc1.js --sample",
  "test": "node --test"
}
```

Add the gated full-run command as appropriate.

## 21. Required test coverage

At minimum test:

- ATN normalization
- leading zeros
- malformed ATNs
- canonical equality
- ArcGIS `features=[]`
- exactly one feature
- multiple features
- ArcGIS error response
- transient network failure/retry
- response field normalization
- preservation of source fields
- cache reuse
- output row-count integrity

Use fixtures. Unit tests must not require live Kern service access.

A small opt-in integration test may use the live endpoint, but it must not run as part of normal unit tests.

## 22. Completion report

When implementation is complete, **do not run the 11,316-record full enrichment**.

Run:

1. tests;
2. metadata inspection;
3. sample generation;
4. 100-record POC enrichment;
5. automated validation.

Then stop and report:

```text
Files created/changed
Tests run + results
Live metadata findings
100-record status counts
Exact match rate
Failure/anomaly categories
Any throttling/network issues
Location of manual-validation CSV
GO / CONDITIONAL GO / NO-GO recommendation
Exact commands Stan should run next
```

Do not claim manual validation passed until Stan has actually completed it.

## 23. Engineering principles

- Favor correctness over match rate.
- Preserve raw evidence.
- Never guess parcel identity.
- Never silently mutate source values.
- Keep source adapters independent from normalized records.
- Keep POC-1 narrowly scoped.
- Make every run reproducible.
- Design the Kern source adapter so another county adapter can eventually be added without rewriting the normalization layer.
- Treat public REST endpoints respectfully.
- Do not optimize prematurely.

## 24. First action for Codex

Before writing the resolver, Codex should:

1. initialize the minimal Node project;
2. create the directory structure;
3. inspect the live MapServer/Layer 2 metadata;
4. document the actual schema;
5. verify one exact ATN query manually through code;
6. only then implement the general resolver.

**Do not start with UI or database design. Prove ATN → parcel identity first.**
