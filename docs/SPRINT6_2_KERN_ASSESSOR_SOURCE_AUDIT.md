# Sprint 6.2 — source audit

Certified offline on 2026-09-23.

## Hash gates

- ZIP: `7954771690266e4f54402b4889ef5a9ae69dfdb04f9e34a6d822f115550c92ae`, 332584937 bytes; expected hash matched before extraction and again after processing.
- PTS: `89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3`; expected hash matched; 11321 rows, 11316 distinct normalized ATNs, 5 duplicate ATN values, no APN/address column.
- Edition: 2026 Final; README/extract date 2026-06-26; land metadata updated 2026-08-12. The September PTS and June roll are different source dates; temporal mismatch may explain cases but is not itself a resolution.

## Actual package inventory

| Package/file | Uncompressed outer-member bytes | Nested entries | Treatment |
| --- | --- | --- | --- |
| _readme.txt | 6419 | 0 | Ignored-cache extraction; CRC32 verified |
| FileGeodatabase_2026final.zip | 180297229 | 117 | Inventory only; no table processing |
| KIPS_Situs_2026-06-26.zip | 1802195 | 2 | Ignored-cache extraction; CRC32 verified |
| Shapefile_AssrMapBooks_2026final.zip | 801803 | 8 | Inventory only; outside crosswalk |
| Shapefile_Parcels_Land_2026final.zip | 82455733 | 8 | Ignored-cache extraction; CRC32 verified |
| Shapefile_Parcels_Mineral_2026final.zip | 821104 | 8 | Inventory only; outside crosswalk |
| Shapefile_TaxRateAreas_2026final.zip | 2253286 | 8 | Inventory only; outside crosswalk |
| TaxRoll_Land_2026final.zip | 25364795 | 1 | Ignored-cache extraction; CRC32 verified |
| TaxRoll_Mineral_2026final.zip | 146255 | 1 | Ignored-cache extraction; CRC32 verified |
| TaxRoll_ParcelHistory_2026final.zip | 2461078 | 1 | Ignored-cache extraction; CRC32 verified |
| TaxRoll_ParcelHistory_EventTypes_2026final.zip | 699 | 1 | Ignored-cache extraction; CRC32 verified |
| TaxRoll_RawData_2026final_MSACC10.zip | 36163998 | 1 | Inventory only; no table processing |
| TaxRoll_RollTypes_2026final.zip | 624 | 1 | Ignored-cache extraction; CRC32 verified |
| TaxRoll_UseCodes_2026final.zip | 6397 | 1 | Ignored-cache extraction; CRC32 verified |

Complete member inventory, lengths, CRC32, nested ZIP SHA-256, DBF SHA-256, schema and distributions are in the source-audit JSON. ZIP extraction rejects traversal/encryption/unsupported ZIP64/compression and byte/CRC mismatches. Source ZIP was never altered, renamed, repacked or removed. All extraction resides under ignored data/runtime/sprint6_2-kern-assessor. Original ZIP is locally untracked; do not add this purchased evidence to a public repository.

## Documentation authority

README makes filtered TaxRoll_Land / TaxRoll_Mineral the intended GIS join tables and explicitly warns the unfiltered Access roll will not join/link properly. Access and FileGDB were inventoried but never queried. Land XML idAbs and APN9 attrdef document APN9 geometry linkage. KIPS schema, use-code, roll-type and history-event domains were read locally. No linked web pages were fetched.

## Audited DBF counts

| DBF | Records | Fields | Deleted |
| --- | --- | --- | --- |
| Shapefile_Parcels_Land_2026final | 424125 | 5 | 0 |
| TaxRoll_Land_2026final | 426054 | 29 | 0 |
| TaxRoll_Mineral_2026final | 4722 | 22 | 0 |
| TaxRoll_ParcelHistory_2026final | 532878 | 7 | 0 |
| TaxRoll_ParcelHistory_EventTypes_2026final | 10 | 3 | 0 |
| TaxRoll_RollTypes_2026final | 6 | 3 | 0 |
| TaxRoll_UseCodes_2026final | 640 | 2 | 0 |

## Land schema

| Field | Type | Width | Decimals |
| --- | --- | --- | --- |
| TE_NO | N | 19 | 5 |
| APN9 | C | 9 | 0 |
| ATN | C | 11 | 0 |
| ROLL | C | 1 | 0 |
| USE_CODE | C | 4 | 0 |
| TRA | C | 6 | 0 |
| SUP_DIST | C | 1 | 0 |
| ASSE_NAME | C | 44 | 0 |
| IN_CARE_OF | C | 40 | 0 |
| DBA | C | 50 | 0 |
| LAND_VAL | N | 19 | 5 |
| MIN_VAL | N | 19 | 5 |
| IMP_VAL | N | 19 | 5 |
| OIFIX_VAL | N | 19 | 5 |
| PP_VAL | N | 19 | 5 |
| EX_TYPE | C | 2 | 0 |
| EX_VAL | N | 19 | 5 |
| NET_VAL | N | 19 | 5 |
| PROP8 | C | 2 | 0 |
| BASEYR_VAL | N | 19 | 5 |
| ADDR_SITUS | C | 60 | 0 |
| ADDR_BILL1 | C | 40 | 0 |
| ADDR_BILL2 | C | 40 | 0 |
| ADDR_BILL3 | C | 30 | 0 |
| LEGAL_TYPE | C | 2 | 0 |
| LEGAL_DESC | C | 60 | 0 |
| ACRES | N | 19 | 5 |
| AG_PRES | C | 15 | 0 |
| CITRUS_AC | N | 19 | 5 |

Schema names for private fields are documented above; their values are not decoded/exported by the crosswalk. Active records: 426,054; fields: 29. ATN: 426,054 non-null/distinct, zero malformed/duplicates. APN9: 426,054 non-null, 424,125 distinct, 1,095 duplicate values (1,929 excess), zero malformed. Roll types: 408,809 secured / 17,245 exempt; do not infer exemption solely from a land-use label.

Situs: 281,388 present / 144,608 missing / 58 malformed; 281,446 nonblank. Use code: 426,051 nonblank / 3 missing. Legal description: 426,007 nonblank / 47 missing. Assessment fields below are county tax assessments, not valuations for investment. ACRES is 426,054 numeric including 197,150 explicit zeroes.

| County field | Numeric present | Missing/invalid | Explicit zero | Negative |
| --- | --- | --- | --- | --- |
| LAND_VAL | 426054 | 0 | 19828 | 0 |
| IMP_VAL | 426054 | 0 | 156162 | 0 |
| NET_VAL | 426054 | 0 | 23237 | 0 |
| BASEYR_VAL | 42090 | 383964 | 0 | 0 |
| MIN_VAL | 426054 | 0 | 425983 | 0 |
| OIFIX_VAL | 426054 | 0 | 424730 | 0 |
| PP_VAL | 426054 | 0 | 424417 | 0 |
| EX_VAL | 426054 | 0 | 329899 | 0 |
| ACRES | 426054 | 0 | 197150 | 0 |
| CITRUS_AC | 426054 | 0 | 425009 | 0 |

## Identifier contract

ATN accepts only an 11-digit ASCII string or the observed PTS pattern DDD-DDD-DD-DD-D; trims outer DBF/CSV whitespace and removes only those four documented-position separators. APN9 accepts only nine ASCII digits. No number conversion, padding, arbitrary punctuation removal, prefix slicing, check-digit calculation, fuzzy search or owner-name matching. Raw PTS IDs and matched Assessor IDs are retained separately. All 11,321 PTS IDs agree with the existing source normalizer. Example: 001-020-01-01-5 → 00102001015; this is not APN9 001020015.

All county ATNs are length 11; all APN9s length 9; all PTS raw ATNs length 15. Identifiers validate as ASCII. DBF language-driver byte is 0 (unspecified); the POC uses CP1252 for text diagnostics, not a claim of documented encoding. All inspected land situs is ASCII. Original bytes remain preserved.

## KIPS documentation gate

KIPS SITS.TXT contains 304,569 fixed-width 80-character records, with 304,569 distinct TE_NO values, no duplicate TE_NO and no malformed numeric-text TE_NO. Its supplied sits_schema.txt documents columns 1–10 TE_NO, 11–16 STR_NO, 17 STR_NO_FRACTION, 18–37 STR_NAME, 38–39 STR_DIR, 40–41 STR_TYPE_CD, 42–56 CITY, 57–59 AD_UNIT_TYPE, 60–63 AD_UNIT_ID, 64–80 filler.

Land also exposes TE_NO as N(19,5). This is a promising future key, **not proof that TE_NO equals ATN/APN**, and the supplied docs do not explicitly define a cross-file TE_NO equivalence/conversion contract. This POC does not promote identical column names or empirical overlap into a certified relationship. Status: KIPS_JOIN_UNPROVEN for 9990 exact matches with missing situs (51 High); incremental recovery **0**. Exact matches with malformed rather than missing situs are not eligible for fallback. A county-supplied key definition and conversion rules are a future documentation gate, not a network task in this POC.

## History documentation gate

History contains 532,878 active rows / distinct APN9s, zero duplicate or malformed APN9s. Fields: APN9, EVT_NUM_CR, EVT_TYP_CR, DT_CREATE, EVT_NUM_IN, EVT_TYP_IN, DT_INACT. README describes changes since September 1994. The supplied event domain explicitly distinguishes Parcel Cut (CT, split), Parcel Combine (CB, merge), Direct Transfer (DT), conversions, creation and deletion.

PTS contains ATNs but no APN. The 53 unmatched ATNs cannot be converted to historical APN9 by a documented relationship in this package. All 53 are HISTORY_UNPROVEN (3 High), none HISTORY_RESOLVABLE or HISTORY_AMBIGUOUS. The 11,263 direct exact matches are HISTORY_NOT_APPLICABLE; no current match is replaced by a historical guess. No production chain is applied or collapsed. Synthetic tests preserve branch/merge/cycle ambiguity and input chains. These are boundary tests, not claims of real-world recoveries. Date proximity, digit truncation, legal descriptions and owner identity are not bridges.

## Read-only protection

All 567 pre-existing tracked files retain their pre-POC bytes, including 16 already-modified PDF/QA artifacts. No Supabase connection or write; no migration (including 004); no source import; no production opportunity/status/address changes; no scoring, runtime, UI, PDF or analytical changes; no deployment; no RentCast, Google, county, GIS, title or other network calls. No inferred equity, mortgage, liens, physical condition, seller motivation or investment suitability. No geocoding. Provider calls = **0**.

County data: Kern County Assessor, 2026 Final. Internal research only. Retain the accompanying [county disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md) with any copy or extract. No warranty of legal boundaries, ownership, completeness or postal deliverability.
