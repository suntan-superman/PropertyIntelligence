# Sprint 6.2 — completion report

Certified offline on 2026-09-23.

## Outcome

**READ-ONLY POC: GO / CERTIFIED. Production import/execution: NO-GO — not authorized; stop for review.**

Original ZIP SHA-256 `7954771690266e4f54402b4889ef5a9ae69dfdb04f9e34a6d822f115550c92ae` (332584937 bytes), 2026 Final. PTS SHA-256 `89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3`; 11,321 source records / 11,316 ATNs / five duplicate ATN values, no source APN/address. Recomputed from files, not prior narrative.

Package inventory: filtered land/mineral roll; land/mineral/map-book/tax-area shapefiles; parcel history and event domain; roll/use domains; KIPS situs/schema; README and land metadata; raw Access roll and FileGDB (inventory only). The source-audit report/JSON contains full member sizes, CRC32 and hashes.

TaxRoll_Land: 426,054 active rows, 29 fields, zero deleted/malformed IDs. ATN unique; 424,125 unique APN9 with 1,095 duplicate APN9 values / 1,929 excess rows. Site text present 281,388, missing 144,608, malformed 58; official use code nonblank 426,051; legal-description present 426,007. Core assessed values are present in every row; BASEYR_VAL only 42,090. No assessment is presented as market value.

## All candidates

| Metric | Count | % of 11,316 |
| --- | --- | --- |
| Unique PTS candidates | 11316 | 100% |
| MATCHED_EXACT | 11263 | 99.5316% |
| MATCHED_MULTIPLE | 0 | 0% |
| UNMATCHED | 53 | 0.4684% |
| SOURCE_INVALID | 0 | 0% |
| Exact match with TaxRoll situs | 1270 | 11.223% |
| Additional KIPS-resolved situs | 0 | 0% |
| Exact parcel geometry match | 11263 | 99.5316% |
| History-resolvable unmatched | 0 | 0% |
| Still unresolved | 53 | 0.4684% |

## High 312

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

Source-edition v1 distribution remains 312 / 701 / 10,303. High membership hash: `3d1d7be5c8d84cd0c63834d45f278efbbeb174bec0f59e383831c61416cc8dd3`. There are 118 explicitly mapped residential-building candidates and 204 requiring POC diagnostic/manual review; neither statistic is a deal-quality conclusion.

## Situs, KIPS and history

Exact land situs: 1,270 present / 9,990 missing / 3 malformed; 11.223% of all candidates and 11.2759% of exact matches. High: 258 present / 51 missing / 3 unmatched. Raw situs retained without postal inference.

KIPS SITS.TXT contains 304,569 fixed-width 80-character records, with 304,569 distinct TE_NO values, no duplicate TE_NO and no malformed numeric-text TE_NO. Its supplied sits_schema.txt documents columns 1–10 TE_NO, 11–16 STR_NO, 17 STR_NO_FRACTION, 18–37 STR_NAME, 38–39 STR_DIR, 40–41 STR_TYPE_CD, 42–56 CITY, 57–59 AD_UNIT_TYPE, 60–63 AD_UNIT_ID, 64–80 filler.

Land also exposes TE_NO as N(19,5). This is a promising future key, **not proof that TE_NO equals ATN/APN**, and the supplied docs do not explicitly define a cross-file TE_NO equivalence/conversion contract. This POC does not promote identical column names or empirical overlap into a certified relationship. Status: KIPS_JOIN_UNPROVEN for 9990 exact matches with missing situs (51 High); incremental recovery **0**. Exact matches with malformed rather than missing situs are not eligible for fallback. A county-supplied key definition and conversion rules are a future documentation gate, not a network task in this POC.

History contains 532,878 active rows / distinct APN9s, zero duplicate or malformed APN9s. Fields: APN9, EVT_NUM_CR, EVT_TYP_CR, DT_CREATE, EVT_NUM_IN, EVT_TYP_IN, DT_INACT. README describes changes since September 1994. The supplied event domain explicitly distinguishes Parcel Cut (CT, split), Parcel Combine (CB, merge), Direct Transfer (DT), conversions, creation and deletion.

PTS contains ATNs but no APN. The 53 unmatched ATNs cannot be converted to historical APN9 by a documented relationship in this package. All 53 are HISTORY_UNPROVEN (3 High), none HISTORY_RESOLVABLE or HISTORY_AMBIGUOUS. The 11,263 direct exact matches are HISTORY_NOT_APPLICABLE; no current match is replaced by a historical guess. No production chain is applied or collapsed. Synthetic tests preserve branch/merge/cycle ambiguity and input chains. These are boundary tests, not claims of real-world recoveries. Date proximity, digit truncation, legal descriptions and owner identity are not bridges.

## Geometry

County land metadata idAbs and APN9 attrdef explicitly document APN9 as the SQL key joining filtered tax-roll tables to parcel polygons. APN is eight digits; APN9 adds the county check digit. This does not define an ATN-to-APN transform.

The DBF, SHX and SHP independently reconcile to 424,125 records, all polygon type 5 and zero null shapes. Every record number, index offset, byte length and APN/APN9 prefix relationship was checked. APN9 is unique in the shape DBF. All 11,263 exact candidate land records join one geometry (309 High); zero multiple/no-geometry cases among exact land matches. FID is the zero-based record ordinal, not a durable cross-edition identity. Only geometry presence, FID, county SHAPE_SQFT and SHAPE_ACRE are emitted; no vertices, coordinates, maps or spatial matching. CRS is the supplied NAD83 California StatePlane V, US feet (EPSG:2229); no transformation performed.

Land APN9 is **not unique** across the entire roll: 424,125 distinct APN9, 1,095 repeated APN9 values and 1,929 excess rows. ATN is unique across all 426,054 rows. A future APN join must preserve this assessment-to-parcel cardinality.

Acreage delta = county shape acres minus county roll acres, diagnostic only. Absolute difference >0.01 acres flags 4397 candidates (123 High); this is an explicit POC review threshold, not a county accuracy standard. Source roll acreage is explicit zero in 6860 exact candidates (186 High). Neither zero nor a difference proves an actual lot size, boundary defect or correct replacement acreage. No value was repaired.

## Use categories

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

## Five duplicate ATNs

| ATN | CSV rows / pages | Parcel amounts | Owner totals (diagnostic only) | Assessor match | v1 score |
| --- | --- | --- | --- | --- | --- |
| 03924026008 | 2022 / 115; 3548 / 194 | 70; 70 | 70; 70 | UNMATCHED | 35 |
| 26319314005 | 3175 / 174; 10870 / 570 | 2966.45; 2966.45 | 2966.45; 2966.45 | UNMATCHED | 35 |
| 36301161003 | 4769 / 260; 8670 / 470 | 13980.64; 13980.64 | 13980.64; 36813.06 | UNMATCHED | 45 |
| 26143122009 | 5685 / 307; 5686 / 307 | 406.21; 2794.2 | 3200.41; 3200.41 | UNMATCHED | 35 |
| 22540119017 | 5855 / 317; 9545 / 502 | 129.4; 129.4 | 129.4; 540023.17 | UNMATCHED | 35 |

CSV row numbers include the header as row 1. All five duplicate ATNs have two source rows; all remain unmatched in land. One ATN has differing parcel amounts (26143122009: 406.21 vs 2794.20); two have differing owner totals (36301161003 and 22540119017). The other two repeat the same reported amounts on different pages. No owner names are emitted or used. Repeated ATN supports one unresolved candidate with every source row retained; it does not establish that amounts are additive or identify a parcel. Existing v1 selects the largest parcel amount and does not sum source rows or use owner totals. Grouping remains defensible as a source-identifier grouping, with unresolved identity and amount conflicts requiring review. No production change.

## Performance

| Measurement | Observed |
| --- | --- |
| zipAuditExtractMs | 5757.90 ms |
| dbfLoadProfileMs | 2707.05 ms |
| atnJoinMs | 16.39 ms |
| kipsAuditMs | 175.55 ms |
| kipsFallbackMs | 0.00 ms |
| historyAuditFallbackMs | 801.51 ms |
| geometryLoadJoinMs | 669.86 ms |
| totalRunMs | 5979.88 ms |
| processPeakRssBytes | 511156224 bytes (487.5 MiB) |

These are measured local timings. Peak RSS covers the analysis process, not total machine memory. ZIP extraction precedes the analysis-process total.

## Minimal future fields and v2 research

| Priority | Proposed fields | Evidence / constraint |
| --- | --- | --- |
| REQUIRED | source edition/date, ZIP/member SHA, raw source row locator/fingerprint | Immutable provenance and replay identity; retain full source privately. |
| REQUIRED | raw/normalized ATN, APN9, crosswalk status and reason | ATN 426,054 unique; APN9 repeated in land. Never merge assessment entities silently. |
| REQUIRED | raw county situs plus presence/malformed/unproven status | Preserve unknown; only 1,270 current candidates have usable land situs. Not geocoded/postally certified. |
| REQUIRED | official use code + description + domain edition | County classification, not inferred physical condition or current occupancy. |
| USEFUL | research use category + mapping version/reason | Conservative mappings must remain distinct from official codes and unknowns. |
| USEFUL | LAND_VAL, IMP_VAL, NET_VAL, BASEYR_VAL + source/null/zero states | Assessment-only namespace; BASEYR_VAL absent for 8,130 exact candidates. Never market value. |
| USEFUL | raw ACRES + explicit-zero/availability state | 6,860 exact candidate rows carry zero; not evidence of zero-sized land. |
| USEFUL | geometry presence + source-edition APN9 link/status | 11,263 exact geometry matches; no production geometry import authorized. |
| OPTIONAL | county shape-area diagnostic metrics | Retain separate from roll acreage; no overwrites or derived boundary authority. |
| OPTIONAL | legal-description presence; full legal description only with later justified need | County-wide populated 426,007; not an identity match key or title proof. |
| OPTIONAL | documented history chain and KIPS fallback provenance | Only after explicit key/relationship evidence; retain branches and STOP ambiguity. |
| DO_NOT_IMPORT | assessee/owner names, billing/care-of/DBA/contact fields | Unneeded for this parcel-resolution use case; no identity, scoring or outreach use. |
| DO_NOT_IMPORT | full raw Access roll, entire FileGDB, polygons, every county column | README explicitly warns raw Access will not join properly; minimal scope first. |
| DO_NOT_IMPORT | market-value/equity/mortgage/lien/condition/motivation guesses | Not established by this source or POC. |

Future kern-screen-v2 **research only**: evaluate official residential-use support, improvement-assessment positive/zero/missing, explicit vacant-use support, source situs presence and exact geometry availability. Separate confidence/completeness from review priority; preserve v1 scores and historical editions. Zero IMP_VAL with positive LAND_VAL occurs in 10433 exact candidates (114 High), but is only a land-only **assessment** pattern, not proof of vacant land or no building. Never treat assessed value as market value or combine it with tax amounts to infer equity, mortgages, other liens, condition or seller motivation. No new score/weights implemented.

## Verification and security

25 POC tests pass: immutable source hashes; protected 567-file baseline; DBF schema/bounds/projection; strict string IDs; exact/multiple/unmatched/invalid; no owner/fuzzy shortcuts; duplicate amounts; situs; KIPS gate; history branches/merges/cycles; APN9 geometry; official descriptions; unknown vs zero; independent High312 membership/score; safe-output allowlist; credential patterns; network tripwire; no database/runtime imports; CRC32. Final QA: 25/25 tests pass, 11 scripts syntax-checked, 5 analytical artifacts byte-identical on replay (performance intentionally excluded), 25 POC files scanned with 0 credential-pattern findings and 0 private-value field findings. All 567 protected files and both sources unchanged. Detailed result: data/validation/sprint6_2-qa.json.

No shared utility, application, analytical engine or runtime code was changed. Existing CSV normalizer and kern-screen-v1 scorer receive focused regression assertions within the POC suite. Broad existing QA commands were deliberately not run because some regenerate protected PDFs/reports or enter persistence/import workflows; those files are proven byte-identical instead. The 16 dirty PDF/QA files observed at entry were preserved. No new dependencies, package edits, environment reads or credential reads.

The POC run recorded zero network attempts, provider calls, database connections and database writes. Tests intentionally invoke network interceptors on invalid/local destinations and verify they throw before I/O; those are not transmitted requests. Owner/billing fields occur only as schema column names, never output values. Safe CSV includes identifiers, source row references, county assessments/statuses and geometry-area metrics, not addresses/contact lists. Raw county sources and exact situs cache remain local/ignored. County disclaimer accompanies the sanitized outputs.

## Reproduction

From project root: initially run node scripts/sprint6_2/verify-source.js once (baseline uses exclusive create; rerunning cannot overwrite it), then package-audit.js, profile.js, run.js, node --test scripts/sprint6_2/poc.test.js, and report.js under scripts/sprint6_2. Do not delete the captured baseline. Existing ignored extraction can be replay-verified; cache collisions STOP. Never substitute production scripts, db commands or provider calls.

## Files added

- `scripts/sprint6_2/core.js`
- `scripts/sprint6_2/dbf.js`
- `scripts/sprint6_2/io.js`
- `scripts/sprint6_2/offline.js`
- `scripts/sprint6_2/package-audit.js`
- `scripts/sprint6_2/poc.test.js`
- `scripts/sprint6_2/profile.js`
- `scripts/sprint6_2/qa.js`
- `scripts/sprint6_2/report.js`
- `scripts/sprint6_2/run.js`
- `scripts/sprint6_2/verify-source.js`
- `docs/SPRINT6_2_KERN_ASSESSOR_SOURCE_AUDIT.md`
- `docs/SPRINT6_2_ATN_CROSSWALK_RESULTS.md`
- `docs/SPRINT6_2_USE_CODE_ANALYSIS.md`
- `docs/SPRINT6_2_HIGH_PRIORITY_312.md`
- `docs/SPRINT6_2_PRODUCTION_IMPORT_RECOMMENDATION.md`
- `docs/SPRINT6_2_COMPLETION_REPORT.md`
- `docs/SPRINT6_2_SOURCE_DISCLAIMER.md`
- `data/validation/sprint6_2-crosswalk-summary.json`
- `data/validation/sprint6_2-high-priority-312.json`
- `data/validation/sprint6_2-kern-assessor-source-audit.json`
- `data/validation/sprint6_2-kern-atn-crosswalk.csv`
- `data/validation/sprint6_2-performance.json`
- `data/validation/sprint6_2-qa.json`
- `data/validation/sprint6_2-use-code-summary.json`

Only standalone POC scripts, new docs and new validation artifacts were added. Ignored cache contains extracted sources, provenance baseline/profiles and synthetic DBF test files. Source ZIP and user-provided specification remain unmodified/untracked inputs. No existing tracked file was changed by this task.

## Recommendation and STOP

**GO for review of a minimal future importer design; NO-GO for production import or automated address resolution now.** Preserve separate assessment/parcel identities; quarantine unmatched records; obtain explicit KIPS/history relationships and review conservative use mappings before authorizing any further integration. Full funnel and 18 sanitized path examples are in the crosswalk report.

No Supabase connection or write; no migration (including 004); no source import; no production opportunity/status/address changes; no scoring, runtime, UI, PDF or analytical changes; no deployment; no RentCast, Google, county, GIS, title or other network calls. No inferred equity, mortgage, liens, physical condition, seller motivation or investment suitability. No geocoding. Provider calls = **0**.

**STOP. No migration, import, application deployment, opportunity update, provider enrichment or next sprint begun.**

County data: Kern County Assessor, 2026 Final. Internal research only. Retain the accompanying [county disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md) with any copy or extract. No warranty of legal boundaries, ownership, completeness or postal deliverability.
