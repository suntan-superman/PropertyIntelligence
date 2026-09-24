# Sprint 6.2 — exact ATN crosswalk

Certified offline on 2026-09-23.

## Full candidate result

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

Denominator is unique PTS candidates, not source rows or land records. “Still unresolved” means no exact land-identity recovery (53); it does **not** mean all remaining candidates have addresses. Situs is missing for 9,990 exact matches and malformed for 3; 53 have no land match. TaxRoll-only usable situs rate among exact land matches is 11.2759%. SITUS_PRESENT means nonblank alphabetic county text without a placeholder/control-character pattern; it does not certify a complete street address, postal validity, geocodability or real-world location. Raw county situs is unchanged in ignored cache; published rows expose only status/presence.

ATN accepts only an 11-digit ASCII string or the observed PTS pattern DDD-DDD-DD-DD-D; trims outer DBF/CSV whitespace and removes only those four documented-position separators. APN9 accepts only nine ASCII digits. No number conversion, padding, arbitrary punctuation removal, prefix slicing, check-digit calculation, fuzzy search or owner-name matching. Raw PTS IDs and matched Assessor IDs are retained separately. All 11,321 PTS IDs agree with the existing source normalizer. Example: 001-020-01-01-5 → 00102001015; this is not APN9 001020015.

All county ATNs are length 11; all APN9s length 9; all PTS raw ATNs length 15. Identifiers validate as ASCII. DBF language-driver byte is 0 (unspecified); the POC uses CP1252 for text diagnostics, not a claim of documented encoding. All inspected land situs is ASCII. Original bytes remain preserved.

## Strict sequential funnel

| Stage | Count | % original candidates | % previous stage |
| --- | --- | --- | --- |
| Power-to-Sell | 11316 | 100% | 100% |
| Exact Assessor ATN | 11263 | 99.5316% | 99.5316% |
| APN9 | 11263 | 99.5316% | 100% |
| Situs | 1270 | 11.223% | 11.2759% |
| Geometry | 1270 | 11.223% | 100% |
| Use Category | 696 | 6.1506% | 54.8031% |

The sequential geometry stage is the situs-bearing intersection (1,270); the independent geometry match total is 11,263. The final category stage excludes OTHER/UNKNOWN, not the underlying official use-code availability. All 11,263 exact candidates have an official use code.

## KIPS

KIPS SITS.TXT contains 304,569 fixed-width 80-character records, with 304,569 distinct TE_NO values, no duplicate TE_NO and no malformed numeric-text TE_NO. Its supplied sits_schema.txt documents columns 1–10 TE_NO, 11–16 STR_NO, 17 STR_NO_FRACTION, 18–37 STR_NAME, 38–39 STR_DIR, 40–41 STR_TYPE_CD, 42–56 CITY, 57–59 AD_UNIT_TYPE, 60–63 AD_UNIT_ID, 64–80 filler.

Land also exposes TE_NO as N(19,5). This is a promising future key, **not proof that TE_NO equals ATN/APN**, and the supplied docs do not explicitly define a cross-file TE_NO equivalence/conversion contract. This POC does not promote identical column names or empirical overlap into a certified relationship. Status: KIPS_JOIN_UNPROVEN for 9990 exact matches with missing situs (51 High); incremental recovery **0**. Exact matches with malformed rather than missing situs are not eligible for fallback. A county-supplied key definition and conversion rules are a future documentation gate, not a network task in this POC.

## History

History contains 532,878 active rows / distinct APN9s, zero duplicate or malformed APN9s. Fields: APN9, EVT_NUM_CR, EVT_TYP_CR, DT_CREATE, EVT_NUM_IN, EVT_TYP_IN, DT_INACT. README describes changes since September 1994. The supplied event domain explicitly distinguishes Parcel Cut (CT, split), Parcel Combine (CB, merge), Direct Transfer (DT), conversions, creation and deletion.

PTS contains ATNs but no APN. The 53 unmatched ATNs cannot be converted to historical APN9 by a documented relationship in this package. All 53 are HISTORY_UNPROVEN (3 High), none HISTORY_RESOLVABLE or HISTORY_AMBIGUOUS. The 11,263 direct exact matches are HISTORY_NOT_APPLICABLE; no current match is replaced by a historical guess. No production chain is applied or collapsed. Synthetic tests preserve branch/merge/cycle ambiguity and input chains. These are boundary tests, not claims of real-world recoveries. Date proximity, digit truncation, legal descriptions and owner identity are not bridges.

## Geometry / acreage

County land metadata idAbs and APN9 attrdef explicitly document APN9 as the SQL key joining filtered tax-roll tables to parcel polygons. APN is eight digits; APN9 adds the county check digit. This does not define an ATN-to-APN transform.

The DBF, SHX and SHP independently reconcile to 424,125 records, all polygon type 5 and zero null shapes. Every record number, index offset, byte length and APN/APN9 prefix relationship was checked. APN9 is unique in the shape DBF. All 11,263 exact candidate land records join one geometry (309 High); zero multiple/no-geometry cases among exact land matches. FID is the zero-based record ordinal, not a durable cross-edition identity. Only geometry presence, FID, county SHAPE_SQFT and SHAPE_ACRE are emitted; no vertices, coordinates, maps or spatial matching. CRS is the supplied NAD83 California StatePlane V, US feet (EPSG:2229); no transformation performed.

Land APN9 is **not unique** across the entire roll: 424,125 distinct APN9, 1,095 repeated APN9 values and 1,929 excess rows. ATN is unique across all 426,054 rows. A future APN join must preserve this assessment-to-parcel cardinality.

Acreage delta = county shape acres minus county roll acres, diagnostic only. Absolute difference >0.01 acres flags 4397 candidates (123 High); this is an explicit POC review threshold, not a county accuracy standard. Source roll acreage is explicit zero in 6860 exact candidates (186 High). Neither zero nor a difference proves an actual lot size, boundary defect or correct replacement acreage. No value was repaired.

## Duplicate source ATNs

| ATN | CSV rows / pages | Parcel amounts | Owner totals (diagnostic only) | Assessor match | v1 score |
| --- | --- | --- | --- | --- | --- |
| 03924026008 | 2022 / 115; 3548 / 194 | 70; 70 | 70; 70 | UNMATCHED | 35 |
| 26319314005 | 3175 / 174; 10870 / 570 | 2966.45; 2966.45 | 2966.45; 2966.45 | UNMATCHED | 35 |
| 36301161003 | 4769 / 260; 8670 / 470 | 13980.64; 13980.64 | 13980.64; 36813.06 | UNMATCHED | 45 |
| 26143122009 | 5685 / 307; 5686 / 307 | 406.21; 2794.2 | 3200.41; 3200.41 | UNMATCHED | 35 |
| 22540119017 | 5855 / 317; 9545 / 502 | 129.4; 129.4 | 129.4; 540023.17 | UNMATCHED | 35 |

CSV row numbers include the header as row 1. All five duplicate ATNs have two source rows; all remain unmatched in land. One ATN has differing parcel amounts (26143122009: 406.21 vs 2794.20); two have differing owner totals (36301161003 and 22540119017). The other two repeat the same reported amounts on different pages. No owner names are emitted or used. Repeated ATN supports one unresolved candidate with every source row retained; it does not establish that amounts are additive or identify a parcel. Existing v1 selects the largest parcel amount and does not sum source rows or use owner totals. Grouping remains defensible as a source-identifier grouping, with unresolved identity and amount conflicts requiring review. No production change.

## Sanitized resolution-path examples (18)

| Path | ATN | Status | APN9 | Situs | Use | History |
| --- | --- | --- | --- | --- | --- | --- |
| exact+situs | 34422106006 | MATCHED_EXACT | 344221064 | SITUS_PRESENT | 0060 | HISTORY_NOT_APPLICABLE |
| exact+missing situs | 29402106004 | MATCHED_EXACT | 294021068 | SITUS_MISSING | 0010 | HISTORY_NOT_APPLICABLE |
| malformed situs | 05630203007 | MATCHED_EXACT | 056302037 | SITUS_MALFORMED | 0090 | HISTORY_NOT_APPLICABLE |
| exact geometry | 29402106004 | MATCHED_EXACT | 294021068 | SITUS_MISSING | 0010 | HISTORY_NOT_APPLICABLE |
| duplicate PTS | 03924026008 | UNMATCHED | — | NOT_APPLICABLE | — | HISTORY_UNPROVEN |
| unmatched/history unproven | 22816070000 | UNMATCHED | — | NOT_APPLICABLE | — | HISTORY_UNPROVEN |
| RESIDENTIAL_SINGLE_FAMILY | 51421204003 | MATCHED_EXACT | 514212042 | SITUS_PRESENT | 0102 | HISTORY_NOT_APPLICABLE |
| RESIDENTIAL_MULTI_FAMILY | 06710806000 | MATCHED_EXACT | 067108068 | SITUS_PRESENT | 0500 | HISTORY_NOT_APPLICABLE |
| MANUFACTURED_MOBILE | 21247309000 | MATCHED_EXACT | 212473094 | SITUS_PRESENT | 0180 | HISTORY_NOT_APPLICABLE |
| VACANT_RESIDENTIAL | 48625123009 | MATCHED_EXACT | 486251234 | SITUS_MISSING | 0091 | HISTORY_NOT_APPLICABLE |
| VACANT_OTHER | 23531014003 | MATCHED_EXACT | 235310141 | SITUS_MISSING | 0060 | HISTORY_NOT_APPLICABLE |
| COMMERCIAL | 17720218004 | MATCHED_EXACT | 177202181 | SITUS_PRESENT | 1203 | HISTORY_NOT_APPLICABLE |
| INDUSTRIAL | 01004418006 | MATCHED_EXACT | 010044188 | SITUS_PRESENT | 3601 | HISTORY_NOT_APPLICABLE |
| AGRICULTURAL | 06919118007 | MATCHED_EXACT | 069191187 | SITUS_MISSING | 4400 | HISTORY_NOT_APPLICABLE |
| GOVERNMENT_EXEMPT | 51584201004 | MATCHED_EXACT | 515842011 | SITUS_PRESENT | 6030 | HISTORY_NOT_APPLICABLE |
| MINERAL | 23914014002 | MATCHED_EXACT | 239140148 | SITUS_MISSING | 8400 | HISTORY_NOT_APPLICABLE |
| OTHER | 29402106004 | MATCHED_EXACT | 294021068 | SITUS_MISSING | 0010 | HISTORY_NOT_APPLICABLE |
| UNKNOWN | 18602012006 | MATCHED_EXACT | 186020129 | SITUS_MISSING | 6302 | HISTORY_NOT_APPLICABLE |

Not observed and not fabricated: no geometry, multiple geometry, ambiguous land. The history example is unproven, not a recovered chain. Synthetic multiple-match/branch cases are covered only in tests. Owner/contact/billing/complete legal text never appears in these examples. Every result and source-row locator is reproducible in the CSV.

No Supabase connection or write; no migration (including 004); no source import; no production opportunity/status/address changes; no scoring, runtime, UI, PDF or analytical changes; no deployment; no RentCast, Google, county, GIS, title or other network calls. No inferred equity, mortgage, liens, physical condition, seller motivation or investment suitability. No geocoding. Provider calls = **0**.

County data: Kern County Assessor, 2026 Final. Internal research only. Retain the accompanying [county disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md) with any copy or extract. No warranty of legal boundaries, ownership, completeness or postal deliverability.
