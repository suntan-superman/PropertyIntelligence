# Property Intelligence — Sprint 6.3
## Kern Assessor Minimal Production Enrichment

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**Production:** Netlify + Supabase PostgreSQL
**Input:** certified Sprint 6.2 Kern Assessor POC
**Goal:** enrich only the existing 11,316 Power-to-Sell candidates with the smallest useful county-backed fact set.

## Mission
Move the certified 6.2 crosswalk into production without importing the 426,054-row county roll.

Certified baseline to reverify before writes:
- 11,316 candidates
- 11,263 MATCHED_EXACT / 53 UNMATCHED / 0 multiple
- 11,263 exact geometry links
- 1,270 usable TaxRoll situs
- High: 309/312 exact; 258 situs
- High conservative residential-building lower bound: 118
- High explicit SFR: 81; all 81 have usable county situs

Unexpected certified hash/count => STOP.

## Source gates
County ZIP SHA-256:
`7954771690266e4f54402b4889ef5a9ae69dfdb04f9e34a6d822f115550c92ae`

PTS SHA-256:
`89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3`

High population hash:
`3d1d7be5c8d84cd0c63834d45f278efbbeb174bec0f59e383831c61416cc8dd3`

Use certified artifacts/exact tested crosswalk logic, never an ad-hoc spreadsheet.

## County-data handling
Retain `docs/SPRINT6_2_SOURCE_DISCLAIMER.md`. County-derived copies/extracts require appropriate source/disclaimer handling. Sprint 6.3 remains internal acquisition/research use. No public bulk county export, raw county download, owner/contact exposure, or commercial redistribution design. Create `docs/SPRINT6_3_COUNTY_DATA_HANDLING.md`. If CSV redistribution handling is uncertain, omit Assessor-derived fields from CSV this sprint.

## Hard boundaries
Allowed: migration 004; minimal enrichment/provenance; official use code/description; conservative PI research category; raw county situs/status; APN9; assessment fields; acreage states; geometry availability/area diagnostics (not vertices); Opportunity UI/filter/detail; analyst-triggered Analyze Property; idempotent importer.

Forbidden: full 426K import; owner/assessee/billing/care-of/DBA/contact fields; raw Access/FileGDB; polygon vertices; inferred KIPS TE_NO relationship; history guessing; resolving the 53 unmatched; changing kern-screen-v1; automatic priority changes; assessment-as-market-value; equity/mortgage/lien/occupancy/condition/motivation inference; automatic/bulk RentCast; outreach; Monte Carlo; title; rental/BRRRR/Wholesale; MAO changes.

Automated QA: zero provider/network calls.

## Identity model
Preserve distinct identities:
`PTS ATN -> exact TaxRoll_Land Assessor ATN -> APN9 -> county-documented parcel geometry link`.

ATN is unique in land; APN9 is not unique in land; parcel-shapefile APN9 is unique. Never collapse ATN/APN9 into a generic ID.

## Migration 004
Create additive `004_kern_assessor_opportunity_enrichment.sql`. Never modify 001–003.

Prefer normalized historical table `opportunity_assessor_enrichments`:
`id, candidate_id FK, source reference, assessor_source_edition/date, county_zip_sha256, county_member_sha256, source_row_locator/fingerprint, pts_atn_raw/normalized, assessor_atn_raw/normalized nullable, crosswalk_status/reason, apn9 nullable, situs_raw nullable, situs_status, use_code/description nullable, research_use_category/mapping_version/mapping_reason nullable, land/improvement/net/base_year assessed values nullable, base_year status, county_acres nullable/status, geometry_status/source_apn9 nullable, shape_sqft/shape_acres nullable, acreage_delta nullable, review_flags jsonb, imported_at, superseded_at nullable, import_batch_id`.

Use exact numeric/decimal types for money.

Add/reuse import-batch ledger with source hashes/counts/importer version/status/summary. Same edition/hash replay creates no duplicates.

## Crosswalk/status semantics
Persist `MATCHED_EXACT` and `UNMATCHED`; reserve multiple/invalid. The 53 unmatched are valid unresolved candidates, not import errors.

## Situs
Persist raw `ADDR_SITUS` and:
`SITUS_PRESENT, SITUS_MISSING, SITUS_MALFORMED, NOT_APPLICABLE`.

UI: **County Situs Address** with note:
`County-reported situs; not independently verified as a postal or deliverable address.`

No geocoding, ZIP/city inference, USPS normalization, or automatic canonical Property creation.

## Use
Persist official county `use_code` + `use_description` separately from PI interpretation:
`research_use_category`, mapping version `kern-use-map-v1`, mapping reason.

Categories:
SINGLE_FAMILY, MULTI_FAMILY, MANUFACTURED_MOBILE, VACANT_RESIDENTIAL, VACANT_OTHER, COMMERCIAL, INDUSTRIAL, AGRICULTURAL, GOVERNMENT_EXEMPT, MINERAL, OTHER, UNKNOWN (use existing certified exact enum names where code already defines them).

UI clearly labels County Use vs PI Category. Preserve conservative 6.2 description-only mapping; zoning-only descriptions do not establish a dwelling.

## Assessments
Persist LAND_VAL, IMP_VAL, NET_VAL, BASEYR_VAL with null vs explicit-zero preserved.

UI labels:
County Land Assessment
County Improvement Assessment
County Net Assessment
County Base-Year Value

Always state: `County assessment data is tax-roll evidence and is not an independent market valuation.`

Never derive market value/equity.

## Acreage / geometry
Persist raw county ACRES + status. Optionally persist shape area diagnostics separately; never overwrite roll acreage. >0.01-acre delta remains a PI diagnostic threshold, not county accuracy standard.

Do not import vertices. Geometry status only:
`GEOMETRY_EXACT, GEOMETRY_MISSING, GEOMETRY_MULTIPLE, NOT_APPLICABLE`.

## Review flags
Deterministic data-quality flags only:
`ASSESSOR_UNMATCHED, SITUS_MISSING, SITUS_MALFORMED, USE_CATEGORY_REVIEW, ACREAGE_DELTA_GT_0_01, BASE_YEAR_VALUE_MISSING, ROLL_ACRES_EXPLICIT_ZERO`.

Never convert flags into investment judgment or v1 score.

## Import scope
Exactly the existing candidate population: expected 11,316 enrichment observations/current rows; 11,263 exact, 53 unmatched. Do not import unrelated Assessor rows.

Commands:
`npm run assessor:enrichment:dry-run`
`npm run assessor:enrichment:status`
`npm run assessor:enrichment:apply`
`npm run assessor:enrichment:qa`

Dry-run mandatory and reports hashes, counts, situs, categories, High-312 reconciliation, inserts/supersessions/rejections, provider calls=0. Any unexpected baseline => STOP.

County evidence is editioned. Future editions create new observations; never overwrite 2026 history.

## Opportunities UI
Enhance list with: Priority, County Situs/ATN, PI Category, Tax Delinquency, County Net Assessment, Assessor Status, Candidate Status, Property/Deal linkage, Actions.

No situs => show ATN + `County situs unavailable`. Do not show owner name by default.

Server-side filters:
High/Medium/Low; Assessor Exact/Unmatched; Has County Situs; Single Family; Multi-Family; Manufactured/Mobile; Vacant Residential; Vacant Other; Commercial; Industrial; Agricultural; Other/Unknown; Geometry Available; Review Required.

Preserve server pagination; no 11K browser payload.

Add presets:
**High Priority — Residential Buildings** = existing High + exact + SFR/MF/manufactured. Expected 118.
**High Priority — Single Family** = expected 81.
These are filters, not scores.

## Candidate detail
Assessor Evidence sections:
- County Identity: PTS ATN, Assessor ATN, APN9, crosswalk, edition
- County Situs: raw situs/status/disclaimer
- County Use: official code/description + PI category/version
- County Assessments: land/improvement/net/base-year + not-market-value note
- Parcel: geometry status, roll/shape acreage and diagnostic flags
- Provenance: edition/date, batch, fingerprint/reference, county disclaimer reference

No owner/billing/contact.

## Analyze Property
For SITUS_PRESENT enable explicit `Analyze Property` confirmation:
`This will use the county-reported situs as the starting address and may consume RentCast quota. Continue?`

No provider calls on page load/filter/detail/import/QA/preview. After explicit confirmation, route through existing live Property workflow and retain all address/provider ambiguity gates.

## CSV
Review current export. Add Assessor-derived fields only if county source/disclaimer handling is explicitly implemented. Otherwise omit them and document deferral. Do not block UI.

## No scoring change
`kern-screen-v1` remains byte/value compatible. Create `docs/SPRINT6_3_KERN_SCREEN_V2_RESEARCH.md` only.

Research future signals: official residential support, explicit vacant support, situs availability, geometry availability, improvement-assessment positive/zero/missing. Explicitly reject assessment=market value, assessment-tax debt=equity, zero IMP_VAL=vacant, situs=postal verification, use=occupancy/condition, distress=seller willingness. No weights.

## Migration/schema QA
004 additive; restrictive FKs; source/batch uniqueness; idempotency; decimal money; filter indexes; no owner/contact columns; no polygons/blobs; safe historical retention.

Local isolated rebuild 001+002+003+004. Never rerun production 001–003.

## Import QA
Synthetic/local:
- exact/unmatched
- duplicate replay
- transaction rollback
- null vs zero assessments
- APN9 repeated-land semantics
- situs states
- use category/version
- review flags
- future edition supersession
- 53 unmatched preserved
- 11,263 exact expected
- High hashes/counts
- zero provider calls
- no owner/contact fields
- no raw polygon
- county disclaimer handling
- no scoring changes

## Production persistence QA
After authorized migration/import:
- exactly one active 2026 enrichment per candidate or documented model equivalent
- 11,316 candidates represented
- 11,263 exact / 53 unmatched
- 1,270 situs present overall
- High 309 exact / 258 situs / 3 unmatched
- High residential lower bound 118
- High SFR 81
- all 81 High SFR situs present
- source hashes exact
- replay no duplicates
- no candidate score/status changed merely by import
- zero provider calls

## UI QA
Desktop/mobile widths; pagination; filters; presets; candidate detail; assessment labels; situs disclaimer; unmatched; review flags; Analyze Property confirmation gate; no provider call before confirmation; no owner/contact exposure.

## Performance
11,316 enriched candidates must query comfortably with indexed server-side filters. Measure common list/filter/detail latency. Do not add Redis/search service.

## Deployment gates
1 protect/hash baseline
2 review migration 004
3 isolated rebuild 001–004
4 importer dry-run from certified 6.2 source/artifacts
5 reconcile all baseline counts/hashes
6 local import/idempotency/rollback QA
7 UI/API tests
8 full Sprint 1–6.2 regressions/security
9 Supabase preflight/status
10 apply 004 exactly once
11 schema certification
12 tagged non-destructive persistence QA
13 STOP and report remote import plan/counts if production data import requires separate authority
14 after explicit import authority, apply certified 11,316-candidate enrichment batch
15 reconcile production counts/hashes/idempotency
16 deploy preview
17 preview list/filter/presets/detail
18 cold-function reopen
19 verify zero provider calls
20 credential/log/bundle scans
21 STOP for production application deployment authorization
22 production app deploy only after explicit approval
23 controlled production smoke with no provider call
24 final certification
25 STOP

Do not reset/truncate Supabase. Migration and data import are distinct gates.

## Regression protection
All existing behavior remains green: Opportunity Discovery v1 scores/distribution, Property analysis, persistence, MAO, report linkage/PDF fixtures, maps, runtime, Supabase TLS, credential scans. No changes to 6.2 raw/certified artifacts.

## Documentation
Create:
- `docs/SPRINT6_3_SCHEMA.md`
- `docs/SPRINT6_3_IMPORT_RUNBOOK.md`
- `docs/SPRINT6_3_COUNTY_DATA_HANDLING.md`
- `docs/SPRINT6_3_KERN_SCREEN_V2_RESEARCH.md`
- `docs/SPRINT6_3_QA.md`
- `docs/SPRINT6_3_COMPLETION_REPORT.md`

## Acceptance
GO only if minimal 11,316-candidate enrichment is idempotent/provenance-safe; 53 unmatched preserved; ATN/APN9 identities separate; assessment never presented as market value; official use vs PI category separate; county situs clearly unverified; no owner/contact import; no raw polygons/full roll; kern-screen-v1 unchanged; presets return certified populations; provider calls zero; migration/import separately gated; county handling documented; full regressions pass; preview certified; production separately authorized.

## Completion report
Include files, migration 004, source hashes, import batch ID, exact/unmatched/situs/geometry/category counts, High-312/118/81 reconciliation, schema/indexes, idempotency, UI/filter/preset results, county-data handling, CSV decision, provider calls, security scans, performance, regression results, limitations, production recommendation and STOP.

## Final principle
Import the intelligence we need, not the county database we happen to own.

Sprint 6.3 should turn the certified Assessor crosswalk into useful candidate context while preserving source truth, uncertainty, licensing/disclaimer boundaries and explicit human control over expensive enrichment.

**STOP at each production authority gate exactly as specified.**
