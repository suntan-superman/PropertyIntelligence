# Sprint 6.2 — unchanged High-priority population

Certified offline on 2026-09-23.

## Population reconciliation

Recomputed using existing src/opportunities/screening.js and the exact source grouping/maximum-parcel-amount selection in opportunityService. No database queried, so this certifies the unchanged source-edition v1 population, not mutable operator review states. Distribution: 312 High / 701 Medium / 10,303 Low. Sorted High ATN population SHA-256: `3d1d7be5c8d84cd0c63834d45f278efbbeb174bec0f59e383831c61416cc8dd3`. Every High ATN and score was independently recomputed in tests.

| Metric | Count | % of 312 |
| --- | --- | --- |
| Unique PTS candidates | 312 | 100% |
| MATCHED_EXACT | 309 | 99.0385% |
| MATCHED_MULTIPLE | 0 | 0% |
| UNMATCHED | 3 | 0.9615% |
| SOURCE_INVALID | 0 | 0% |
| Exact match with TaxRoll situs | 258 | 82.6923% |
| Additional KIPS-resolved situs | 0 | 0% |
| Exact parcel geometry match | 309 | 99.0385% |
| History-resolvable unmatched | 0 | 0% |
| Still unresolved | 3 | 0.9615% |

309 exact land matches; 258 usable situs (83.4951% of exact); 51 missing situs; 3 unmatched; no malformed High situs. KIPS additional addresses: 0 (51 unproven). All 309 exact matches have exact geometry. All 3 unmatched have HISTORY_UNPROVEN.

## Use / residential lower bound

| Research category | All exact | High exact | All situs / rate | High situs / rate |
| --- | --- | --- | --- | --- |
| RESIDENTIAL_SINGLE_FAMILY | 324 | 81 | 316 / 97.5309% | 81 / 100% |
| RESIDENTIAL_MULTI_FAMILY | 37 | 21 | 35 / 94.5946% | 20 / 95.2381% |
| MANUFACTURED_MOBILE | 97 | 16 | 85 / 87.6289% | 15 / 93.75% |
| VACANT_RESIDENTIAL | 14 | 1 | 9 / 64.2857% | 1 / 100% |
| VACANT_OTHER | 4786 | 60 | 203 / 4.2415% | 27 / 45% |
| COMMERCIAL | 45 | 13 | 35 / 77.7778% | 13 / 100% |
| INDUSTRIAL | 11 | 4 | 7 / 63.6364% | 4 / 100% |
| AGRICULTURAL | 135 | 9 | 3 / 2.2222% | 1 / 11.1111% |
| GOVERNMENT_EXEMPT | 3 | 0 | 3 / 100% | 0 / N/A |
| MINERAL | 4 | 0 | 0 / 0% | 0 / N/A |
| OTHER | 5581 | 74 | 440 / 7.8839% | 69 / 93.2432% |
| UNKNOWN | 226 | 30 | 134 / 59.292% | 27 / 90% |

The 640-row official TaxRoll_UseCodes domain is the only source of meaning. All 123 observed exact-candidate codes appear in it. These research categories are **not** county-issued category names and do not change kern-screen-v1. Description-only conservative rules reside in scripts/sprint6_2/core.js; code prefixes are never used. Official descriptions are retained alongside each result.

Zoning-only descriptions (for example 0010: R1 ZONE ONE ACRE OR LESS) do not establish a dwelling or vacancy and remain OTHER. SAME AS references/ranges and indeterminate descriptions remain UNKNOWN pending documented expansion; no numeric family inheritance. MH parks are not individual manufactured homes. Residential mixed SFR/MH descriptions describe county use, not tenure. Explicit vacant descriptions map as vacant research categories, not a current-condition conclusion. OTHER includes clearly named uses outside these categories and descriptions too abbreviated to classify safely. UNKNOWN/OTHER are excluded from the final supported-category funnel stage.

The residential-building lower bound is 458 all / 118 High: SINGLE_FAMILY + MULTI_FAMILY + MANUFACTURED_MOBILE only. Vacant residential (14 all / 1 High) is reported separately. Zoning-only land and unexpanded MH references are not counted as established residential buildings. These counts are not a suitability, tenure, occupancy, title or deal-quality judgment.

## Field availability (309 exact High matches)

| County field | Numeric present | Missing/invalid | Explicit zero | Negative |
| --- | --- | --- | --- | --- |
| LAND_VAL | 309 | 0 | 2 | 0 |
| IMP_VAL | 309 | 0 | 116 | 0 |
| NET_VAL | 309 | 0 | 3 | 0 |
| BASEYR_VAL | 12 | 297 | 0 | 0 |
| MIN_VAL | 309 | 0 | 309 | 0 |
| OIFIX_VAL | 309 | 0 | 307 | 0 |
| PP_VAL | 309 | 0 | 307 | 0 |
| EX_VAL | 309 | 0 | 248 | 0 |
| ACRES | 309 | 0 | 186 | 0 |
| CITRUS_AC | 309 | 0 | 308 | 0 |

Legal description is present in 309 / 309 exact High records (presence only; no legal text exported).

## Explicit manual-review rule

204 / 312 require POC data-quality review: union of unmatched land, missing/malformed situs, non-exact geometry, OTHER/UNKNOWN use mapping, or absolute roll-vs-shape acreage delta >0.01. This is a completeness/diagnostic rule only, not a new screening score or investment decision. Overlapping flags: ACREAGE_DELTA_GT_0_01=123; USE_CATEGORY_REVIEW=104; SITUS_MISSING=51; UNMATCHED=3. The 108 without these flags are not certified good deals. Review all evidence before any subsequent enrichment/underwriting.

No Supabase connection or write; no migration (including 004); no source import; no production opportunity/status/address changes; no scoring, runtime, UI, PDF or analytical changes; no deployment; no RentCast, Google, county, GIS, title or other network calls. No inferred equity, mortgage, liens, physical condition, seller motivation or investment suitability. No geocoding. Provider calls = **0**.

County data: Kern County Assessor, 2026 Final. Internal research only. Retain the accompanying [county disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md) with any copy or extract. No warranty of legal boundaries, ownership, completeness or postal deliverability.
