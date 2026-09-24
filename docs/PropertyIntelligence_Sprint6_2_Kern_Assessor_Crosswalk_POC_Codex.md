# Property Intelligence — Sprint 6.2
## Kern Assessor Crosswalk & Opportunity Resolution POC

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**County source:** original `KernCountyAssessor_GisParcels_2026final.zip`
**Existing distress source:** `data/raw/kern_power_to_sell_2026-09-15.csv`
**Scope:** READ-ONLY certification POC. No migration, Supabase import, scoring/UI change or provider call.

## Mission
Prove exactly how many existing 11,316 Power-to-Sell candidates can be resolved through the purchased Kern Assessor package into Assessor land records, APN9, situs address and parcel/property characteristics.

Required outputs:
- exact/multiple/unmatched/invalid ATN counts;
- situs-address resolution rate;
- separate results for current 312 High Priority candidates;
- KIPS situs fallback only if a documented exact join exists;
- parcel-history explanation for unmatched cases only where deterministic;
- parcel-geometry match rate;
- official use-code distribution;
- assessed-value/acreage/property-field availability;
- recommendation for a later minimal production import.

## Hard boundaries
DO NOT modify original ZIP or Power-to-Sell CSV; run migration 004; modify/rerun migrations 001–003; import Assessor data into Supabase; update production candidates/addresses; change `kern-screen-v1`; call RentCast/Google/county web/GIS/title services; bypass ArcGIS; infer mortgage/equity/liens/condition/motivation; owner-contact enrich; add UI; deploy production.

Provider calls: **0**. Outputs are local docs/validation artifacts only.

## Source-evidence gate
Recompute original ZIP SHA-256, byte size and inventory. Expected from prior read-only inspection:
`7954771690266e4f54402b4889ef5a9ae69dfdb04f9e34a6d822f115550c92ae`

Expectation is not authority. If recomputed hash differs, STOP.

Extract only to dedicated ignored cache/work directory; never repack/alter original.

Create `docs/SPRINT6_2_KERN_ASSESSOR_SOURCE_AUDIT.md` and `data/validation/sprint6_2-kern-assessor-source-audit.json`.

## Package audit
Identify actual documentation and files: filtered land/mineral tax rolls, land/mineral parcel shapefiles, parcel history, use/roll-type domains, KIPS situs package, README/data dictionary, raw Access roll, File Geodatabase.

The filtered **TaxRoll_Land** table is authoritative first crosswalk source. Do not use raw Access tax roll for direct GIS joining unless county documentation explicitly supports the filtering performed.

## TaxRoll_Land profile
Locate actual 2026 Final land DBF and recompute schema/counts.

Prior inspection suggested ~426,054 rows and fields including `ATN`, `APN9`, `ADDR_SITUS`, `USE_CODE`, assessment values, legal description and acreage. Verify, don't assume.

Profile:
- record/field counts/types;
- ATN/APN9 non-null/distinct/duplicates;
- malformed identifiers;
- situs populated;
- use-code populated;
- LAND_VAL/IMP_VAL/NET_VAL/BASEYR_VAL availability;
- acreage/legal-description availability.

Do not emit assessee names in narrative/test fixtures.

## Identifier normalization
Observe actual raw formats first. Implement pure string normalization preserving raw IDs and leading zeros. Never numeric-parse identifiers if it can alter them. Reject unexpected widths/characters instead of guessing. Document and test normalization.

ATN and APN are distinct identifiers; never assume interchangeability.

## Power-to-Sell baseline
Reverify checked-in source. Expected:
- SHA-256 `89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3`
- 11,321 rows
- 11,316 unique normalized ATNs
- 5 duplicate ATN values
- no address/APN.

Unexpected hash/count => STOP. Do not re-import.


## Exact ATN crosswalk
Local read-only join:
`Power-to-Sell normalized ATN -> TaxRoll_Land normalized ATN`

Classify every unique candidate:
- `MATCHED_EXACT`: exactly one compatible land-roll row
- `MATCHED_MULTIPLE`: >1 land-roll row
- `UNMATCHED`: none
- `SOURCE_INVALID`: cannot safely normalize

No owner-name resolution, fuzzy matching, nearest string match or silent tie-breaking.

Produce counts/percentages.

## Row-level artifact
Create `data/validation/sprint6_2-kern-atn-crosswalk.csv` with safe reproducibility fields:
candidate/local ref, raw/normalized PTS ATN, match status, matched Assessor ATN, APN9, situs-present boolean, use code, roll type if applicable, land/improvement/net values, acreage, legal-description-present boolean, parcel-history status, KIPS-situs status, reason/notes.

Do not include owner/assessee names, billing addresses, phones/emails or contact lists.

## Situs analysis
For each exact match:
- `SITUS_PRESENT`
- `SITUS_MISSING`
- `SITUS_MALFORMED`

Report TaxRoll_Land-only address resolution count/rate. Preserve raw county situs. No geocoding/canonical postal inference.

## KIPS fallback
Audit actual KIPS schema/documentation. Prior inspection suggested `TE_NO, STR_NO, STR_NO_FRACTION, STR_NAME, STR_DIR, STR_TYPE_CD, CITY, AD_UNIT_TYPE, AD_UNIT_ID`.

Determine documented join key. Do NOT assume TE_NO equals ATN/APN.

Only for exact land matches missing ADDR_SITUS:
- exact documented join -> resolve;
- no proven join -> `KIPS_JOIN_UNPROVEN`.

Never owner-name/fuzzy join. Report incremental address gain.

## Parcel history
Audit actual history schema/documentation. Use only for direct unmatched/ambiguous cases and only via documented identifiers.

Classify:
- `HISTORY_RESOLVABLE`
- `HISTORY_AMBIGUOUS`
- `HISTORY_NOT_APPLICABLE`
- `HISTORY_UNPROVEN`

Do not collapse parcel splits/merges into one property. Preserve chains.

## Parcel geometry
For exact matches with APN9, exact join to land shapefile DBF using documented APN/APN9 relationship.

Report exact/multiple/no geometry match. Do not import polygons or generate maps. Record only geometry-present, shapefile ID and shape area metrics for POC QA. Compare roll acreage vs shape acreage diagnostically only.

## Use codes
Load official Kern use-code domain; never invent meaning from number.

Create read-only proposed categories only where descriptions support:
`RESIDENTIAL_SINGLE_FAMILY, RESIDENTIAL_MULTI_FAMILY, MANUFACTURED_MOBILE, VACANT_RESIDENTIAL, VACANT_OTHER, COMMERCIAL, INDUSTRIAL, AGRICULTURAL, GOVERNMENT_EXEMPT, MINERAL, OTHER, UNKNOWN`.

This is research, not a score change.

Report category counts for all exact matches and High Priority 312, situs rate and assessed-value availability. No investment-suitability conclusion.

## Assessment fields
Profile documented LAND_VAL, IMP_VAL, NET_VAL, BASEYR_VAL and related fields. Never call assessed value market value.

Measure useful future signals such as improvement-value present/zero, land-only assessment, use category, acreage and geometry presence. Do not score yet.


## High Priority 312 — mandatory separate analysis
Use exact current `kern-screen-v1` High population without changing scores.

Report:
- exact/multiple/unmatched/invalid;
- situs present;
- KIPS incremental gain if proven;
- geometry exact match;
- official use-category distribution;
- assessment-field availability;
- obvious data-quality anomalies;
- count classified residential by official mapping;
- count requiring manual review.

Do not call these good deals.

## Full-candidate funnel
For all unique candidates report:
`Power-to-Sell -> Exact Assessor ATN -> APN9 -> Situs -> Geometry -> Use Category`

Counts and percentages.

## Five duplicate PTS ATNs
Audit separately: source-row relationship, parcel/owner-total amount differences, Assessor resolution and whether existing Sprint 6 candidate grouping remains logically correct. No production change.

## Ambiguity rules
Never resolve identity from owner/assessee name, mailing address, similar street address, approximate acreage, assessed value or legal-description similarity alone. These are diagnostic only. Stable identifiers/documented county crosswalk/history relationships control.

## Privacy
Assessee/billing fields may be inspected for schema quality but not emitted into POC artifacts unless a specific diagnostic absolutely requires it. No outreach/skip tracing/contact export.

## Performance
Measure ZIP audit, DBF load, ATN join, history fallback, KIPS fallback if used, geometry join and peak memory if practical. Use results to recommend streaming/batching for future production; do not prematurely optimize.

## Required docs
Create:
1. `docs/SPRINT6_2_KERN_ASSESSOR_SOURCE_AUDIT.md`
2. `docs/SPRINT6_2_ATN_CROSSWALK_RESULTS.md`
3. `docs/SPRINT6_2_USE_CODE_ANALYSIS.md`
4. `docs/SPRINT6_2_HIGH_PRIORITY_312.md`
5. `docs/SPRINT6_2_PRODUCTION_IMPORT_RECOMMENDATION.md`
6. `docs/SPRINT6_2_COMPLETION_REPORT.md`

Machine artifacts:
- `data/validation/sprint6_2-kern-assessor-source-audit.json`
- `data/validation/sprint6_2-kern-atn-crosswalk.csv`
- `data/validation/sprint6_2-crosswalk-summary.json`
- `data/validation/sprint6_2-high-priority-312.json`
- `data/validation/sprint6_2-use-code-summary.json`
- `data/validation/sprint6_2-performance.json`

## Required result table
For all candidates:

| Metric | Count | % |
|---|---:|---:|
| Unique PTS candidates | audited denominator | 100% |
| MATCHED_EXACT | X | X% |
| MATCHED_MULTIPLE | X | X% |
| UNMATCHED | X | X% |
| SOURCE_INVALID | X | X% |
| Exact match with TaxRoll situs | X | X% |
| Additional KIPS-resolved situs | X | X% |
| Exact parcel geometry match | X | X% |
| History-resolvable unmatched | X | X% |
| Still unresolved | X | X% |

Produce same table for High Priority population.

## Sanitized examples
Provide 10–20 resolution-path examples covering exact+situs, exact+no-situs, geometry, duplicate PTS ATN, history, unmatched/ambiguous, residential and nonresidential use. No owner names.

## Future production-field recommendation
Do NOT implement. Classify proposed fields as REQUIRED / USEFUL / OPTIONAL / DO_NOT_IMPORT.

Consider only after evidence:
ATN, APN9, raw situs, use code/category, land/improvement/net/base-year values, acreage, legal description, geometry link/status, source edition/date, source-row fingerprint, address-resolution status.

Avoid importing every county column just because it exists.

## Future `kern-screen-v2` research only
Do not change v1. Propose county-backed signals only if defensible, such as residential use category, improvement-value presence, vacant category, situs resolved, geometry present. Explicitly reject assessed-value-as-market-value and inferred equity.

## POC tests
- ZIP/source hash gate
- DBF schema/profile
- string normalization/leading zeros
- exact/multiple/unmatched classifications
- no owner-name/fuzzy resolution
- duplicate PTS ATNs
- KIPS proven/unproven boundary
- parcel-history branch ambiguity
- geometry exact join
- use-code official mapping
- assessed value not labeled market
- High-312 population unchanged
- zero provider/network calls
- no production DB writes/migrations
- no private owner/contact output

Run existing Sprint 1–6.1.2 regression only to the extent this POC code touches shared utilities; do not deploy.


## Execution order
1. Protect/hash repository baseline.
2. Verify original ZIP hash/inventory.
3. Audit documentation/package.
4. Audit TaxRoll_Land schema/counts.
5. Reverify PTS hash/count.
6. Implement/test identifier normalization.
7. Run exact ATN crosswalk.
8. Produce situs metrics.
9. Audit/use KIPS only if exact join proven.
10. Audit parcel history; evaluate unmatched only.
11. Join APN9 to parcel geometry DBF.
12. Load/map official use codes.
13. Analyze High Priority 312 separately.
14. Audit five duplicate PTS ATNs.
15. Produce full funnel/data-quality metrics.
16. Performance measurements.
17. Write production-field and screen-v2 recommendations.
18. Run POC tests/security/network tripwire.
19. Generate completion report.
20. STOP.

No Supabase import. No migration. No preview deploy required unless Codex changes application/runtime code—which it should avoid.

## Acceptance
POC is GO only if:
- original county source hash verified;
- PTS source baseline verified;
- normalization documented/tested;
- every unique candidate receives deterministic match status;
- exact match rate and situs rate measured;
- High 312 measured separately;
- no owner/fuzzy identity shortcuts;
- KIPS/history only used through proven relationships;
- geometry match measured;
- use codes mapped from official descriptions;
- assessed value never represented as market value;
- no production data/schema/UI changes;
- zero provider/network calls;
- source artifacts unchanged;
- import recommendation is evidence-based.

## Completion report
Must include:
- source ZIP hash/edition/inventory;
- TaxRoll_Land audited counts/schema summary;
- PTS baseline;
- full crosswalk table;
- High-312 table;
- situs/KIPS results;
- history results;
- geometry results;
- use-category distribution;
- duplicate-ATN findings;
- performance;
- proposed minimal production fields;
- proposed future screening signals;
- explicit non-signals/rejected inferences;
- exact provider-call count (0);
- files changed;
- production import GO/NO-GO recommendation;
- next-step recommendation;
- STOP.

## Final principle
Do not turn a successful join into an import prematurely.

Sprint 6.2 exists to prove:

> whether the purchased Kern County Assessor package can reliably transform our anonymous public distress candidates into identifiable parcel/property records, how often it succeeds, and exactly which county-backed facts are trustworthy enough to use in the next production design.

**STOP after the read-only certification POC.**
