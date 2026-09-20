# Sprint 6 completion report

**Scope:** Kern Power-to-Sell Opportunity Discovery, deterministic screening and controlled/manual enrichment only. Production application certification is complete; no follow-on Sprint 7 work has started.

**Status:** **PRODUCTION CERTIFIED — KERN OPPORTUNITY DISCOVERY OPERATIONAL**

## Source reconciliation

- File: `data/raw/kern_power_to_sell_2026-09-15.csv`
- SHA-256: `89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3`
- Actual records: 11,321 (the prior 11,316 figure is the unique normalized ATN count, not the row count).
- Columns: `owner_name`, `atn`, `parcel_amount_owed`, `owner_total_owed`, `source_date`, `source`, `source_page`.
- Valid/rejected: 11,321 / 0; exact duplicate rows: 0; duplicate ATN values: 5; unique candidate estimate: 11,316.
- Address/APN/property characteristics: not supplied. Owner name is retained as source provenance only and is never an identity merge key or score input.

Full audit: `docs/SPRINT6_KERN_SOURCE_AUDIT.md` and `data/validation/sprint6-kern-source-audit.json`.

## Implementation

- Additive migration `003_opportunity_discovery.sql`; migrations 001 and 002 remain unchanged.
- Existing Sprint 4 `discovery_signals` was audited and retained for canonical Property evidence; the new `opportunity_signals` table is candidate/source-record scoped and does not replace or duplicate that property-scoped contract.
- Immutable source editions/rows, conservative candidates, record links, append-only signals/reviews, source hash and batched transactional importer.
- `kern-screen-v1` Investigation Priority Score with explainable identifier/amount/resolution/link signals and explicit operational bands.
- Server-paginated/filterable Opportunities API, candidate detail, safe CSV export, review/defer/reject/archive/restore, analyst address resolution and explicit enrichment confirmation boundary.
- Conservative identity handling keeps ATN/APN pairs distinct unless a source-supported crosswalk exists; explicitly conflicting stable identifiers are `AMBIGUOUS`/STOP. Import regression coverage verifies quoted CSV/raw preservation, malformed critical-field rejection, identifier normalization and duplicate fingerprints.
- Opportunities navigation and queue UI. No automatic RentCast calls, owner outreach, skip tracing, title/GIS, mortgage/equity/condition inference or underwriting changes.

## Migration/import certification

- Migration 003 applied exactly once through the repository migration runner; 001/002 were not rerun.
- Schema QA: PASS — 25 application tables, 24 expected indexes, 36 restrictive foreign keys, checksums for 001/002/003.
- Dry-run: PASS — 11,321 valid, 0 rejected, 0 exact duplicates, 11,316 candidate estimate, provider calls 0.
- Supabase import: PASS — source `23e3f9d3-3605-48ab-b379-c508341829ca`, 11,321 immutable records, 11,316 candidates, 33,963 signals, 0 provider calls.
- Import replay: PASS — source hash returned existing edition without additional records/candidates.
- Queue metrics: 11,316 candidates; 11,316 need address; 0 resolved/enriched/deal-created; 0 ambiguous; 0 unknown amount rows; 5 duplicate ATN values.
- Priority distribution: 312 high, 701 medium, 10,303 low; no absent-field or owner-name points.
- Measured local command performance: actual-file dry-run ~746 ms; remote status/count query ~1,460 ms (server pagination remains capped at 100 rows/request).

## Persistence and regression QA

- Non-destructive persistence QA: PASS, tag `SPRINT6_OPPORTUNITY_QA_1789836608679`; source rows remained byte-for-byte unchanged across separate connections; review replay was idempotent; archive/restore and transaction rollback passed; source import replay returned the existing edition; provider calls 0.
- Full `npm run sprint6:qa`: PASS — source audit/dry-run, importer checks, screening checks, 93 unit tests, MAO/regression suite, web build/UI, UX, maps, PDF/report, Netlify runtime, runtime UI and credential scans; provider calls 0; `npm audit --omit=dev` remains 0 vulnerabilities.

## Preview gate

- Fresh preview deploy: [6aaec00e4eab6fa6e83bd0e3--worksidepropertyintelligence.netlify.app](https://6aaec00e4eab6fa6e83bd0e3--worksidepropertyintelligence.netlify.app), deploy ID `6aaec00e4eab6fa6e83bd0e3`.
- Preview health: PASS — `runtime: netlify`, PostgreSQL configured and persistence available.
- Preview Opportunities QA tag `SPRINT6_PREVIEW_QA_20260919_4`: 25-row server page of 11,316 candidates; 11,321 imported records; candidate detail retained source provenance/signals; safe CSV export returned 100 filtered rows without raw payloads or credentials.
- Candidate `6e1898c0-c897-4c5d-aa35-90be3d46877b` review replay was idempotent (`ebf45fc9-594b-42b1-9378-f9f872018d6d`), restored to `NEEDS_ADDRESS`, and explicit enrichment confirmation correctly stopped before any provider call.
- Preview browser scan: PASS; Function artifact scan: PASS; sanitized Function-log scan: PASS (4 lines, no credential-like or provider-like entries); RentCast calls: 0.

## Production certification

- Production deploy: [worksidepropertyintelligence.netlify.app](https://worksidepropertyintelligence.netlify.app), deploy ID `6aaec51d6991406deda80902`.
- The production browser served the same `/assets/index-DWfYzvJh.js` path and byte-equivalent asset as certified preview `6aaec00e4eab6fa6e83bd0e3`.
- Health: PASS — `runtime: netlify`, `databaseConfigured: true`, `databaseProvider: postgresql`, `persistenceAvailable: true`.
- No migrations 001/002/003 were rerun and no new Kern source edition was imported. Production source edition remained hash `89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3`, with 11,321 records and 11,316 candidates.
- Production QA tag `SPRINT6_PRODUCTION_QA_20260919_1`: candidate `6e1898c0-c897-4c5d-aa35-90be3d46877b`; review `3a455f63-bc68-431d-91ba-bdfb2bb3f788`; replay was idempotent and candidate was restored to `NEEDS_ADDRESS`.
- Machine-readable production certification: `data/validation/sprint6-netlify-production-qa.json`.
- Priority distribution: **312 High / 701 Medium / 10,303 Low**. All 11,316 candidates remain `NEEDS_ADDRESS`; no enrichment/deal-created candidates were introduced.
- Separate detail request retained one source record and three source-backed signals. Owner name was not a signal or identity key; no equity, mortgage, lien, condition or seller-motivation inference appeared.
- Pagination: 25-row requested page, 25-row default page, and 100-row hard cap; no endpoint returned the full dataset by default. Safe CSV export returned 100 rows with the approved field header and no raw payloads/secrets.
- Controlled enrichment returned `ENRICHMENT_CONFIRMATION_REQUIRED` before any provider action; RentCast/provider calls: **0**.
- No production-code `createSiteDatabase`/`@netlify/database` references and no provisioning log entries were found. Historical Sprint 4 documentation retains prior provider terminology only.
- Production browser scan: PASS; Function artifact scan: PASS (20 files, 272,880-byte bundle); sanitized Function-log scan: PASS (37 lines, zero credential-like/provider-like/provisioning matches).
- Final `npm run sprint6:qa`: PASS, including 93 unit tests, UI/build, UX, maps, PDF/report, runtime and credential/security checks; provider calls 0.

**PRODUCTION CERTIFIED — KERN OPPORTUNITY DISCOVERY OPERATIONAL**

## Boundaries and next step

The source contains no address, APN, assessor characteristics, geometry, lien/payoff, mortgage, equity, condition or seller-motivation evidence. Candidates remain `NEEDS_ADDRESS` until an analyst resolves identity. Controlled enrichment requires an explicit action and confirmation; automated QA must remain at zero RentCast calls.

**STOP after production certification. Do not begin address-resolution automation, Assessor/GIS integration, RentCast batch enrichment, NOD/NOTS, title data, outreach, or Sprint 7.**
