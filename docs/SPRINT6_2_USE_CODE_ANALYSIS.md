# Sprint 6.2 — official use codes and assessment availability

Certified offline on 2026-09-23.

The 640-row official TaxRoll_UseCodes domain is the only source of meaning. All 123 observed exact-candidate codes appear in it. These research categories are **not** county-issued category names and do not change kern-screen-v1. Description-only conservative rules reside in scripts/sprint6_2/core.js; code prefixes are never used. Official descriptions are retained alongside each result.

Zoning-only descriptions (for example 0010: R1 ZONE ONE ACRE OR LESS) do not establish a dwelling or vacancy and remain OTHER. SAME AS references/ranges and indeterminate descriptions remain UNKNOWN pending documented expansion; no numeric family inheritance. MH parks are not individual manufactured homes. Residential mixed SFR/MH descriptions describe county use, not tenure. Explicit vacant descriptions map as vacant research categories, not a current-condition conclusion. OTHER includes clearly named uses outside these categories and descriptions too abbreviated to classify safely. UNKNOWN/OTHER are excluded from the final supported-category funnel stage.

The residential-building lower bound is 458 all / 118 High: SINGLE_FAMILY + MULTI_FAMILY + MANUFACTURED_MOBILE only. Vacant residential (14 all / 1 High) is reported separately. Zoning-only land and unexpanded MH references are not counted as established residential buildings. These counts are not a suitability, tenure, occupancy, title or deal-quality judgment.

## Category distribution

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

Category counts sum to 11,263 exact matches / 309 High exact matches. Per-category situs and each assessment-field availability are retained in the JSON; denominators exclude unmatched candidates.

## Every observed code

| Code | Official county description | Research category | All | High | All situs |
| --- | --- | --- | --- | --- | --- |
| 0010 | R1 ZONE ONE ACRE OR LESS | OTHER | 4115 | 15 | 224 |
| 0060 | VAC>1AC <3 NO R2 3 4 COMM IND | VACANT_OTHER | 2202 | 9 | 72 |
| 5000 | UNDEVELOPED LAND >20AC MT/DES | VACANT_OTHER | 1036 | 11 | 6 |
| 0040 | R4 ZONE | OTHER | 529 | 1 | 4 |
| 0020 | R2 ZONE | OTHER | 492 | 15 | 46 |
| 0070 | VAC=3 AC <7 NO R2 3 4 COMM IND | VACANT_OTHER | 376 | 4 | 26 |
| 0090 | VAC ALL T ZONE INCL T RST R1T | VACANT_OTHER | 355 | 1 | 15 |
| 0080 | VAC 7-20 AC NO R2 3 4 COMM IND | VACANT_OTHER | 297 | 8 | 9 |
| 0001 | VAC <1 AC NO R1/2/3/4/E/C/I | VACANT_OTHER | 276 | 2 | 14 |
| 0101 | SGL FAM RES ON R1 ZONED LAND | RESIDENTIAL_SINGLE_FAMILY | 185 | 41 | 184 |
| 0050 | E ZONED LAND ONE ACRE OR LESS | OTHER | 139 | 4 | 36 |
| 4400 | GRAZING OR DRY FARM LAND | AGRICULTURAL | 108 | 2 | 1 |
| 0181 | SAME AS 0180 NO T RST R1T ZONE | UNKNOWN | 88 | 19 | 85 |
| 0097 | MS & T ZONING W/LIC MH | MANUFACTURED_MOBILE | 66 | 7 | 57 |
| 0030 | R3 ZONE | OTHER | 58 | 5 | 16 |
| 0106 | SFR NOT ON RS 1 2 3 4 | RESIDENTIAL_SINGLE_FAMILY | 58 | 19 | 51 |
| 6300 | NO VAL-SUMP ETC | OTHER | 54 | 1 | 24 |
| 6301 | SAME AS 6300 EXCEPT <$1000 | UNKNOWN | 53 | 0 | 0 |
| 1010 | VAC C-1 ZONE | VACANT_OTHER | 52 | 1 | 7 |
| 0102 | SGL FAM RES ON R2 ZONED LAND | RESIDENTIAL_SINGLE_FAMILY | 46 | 11 | 46 |
| 3010 | VACANT M-1 | VACANT_OTHER | 45 | 1 | 4 |
| 1020 | VAC C-2 ZONE | VACANT_OTHER | 42 | 11 | 14 |
| 4000 | UNDEVELOPED LAND >20AC | VACANT_OTHER | 39 | 2 | 7 |
| 0081 | 20-40 AC NO R2 3 4 COMM IND | OTHER | 34 | 2 | 2 |
| 0099 | VAC T W/MISC IMP NO LIC MH | VACANT_OTHER | 33 | 5 | 20 |
| 0183 | 0180 ALL Z NO MS T RST R1T A Z | OTHER | 26 | 3 | 26 |
| 1000 | COMMERCIAL LAND | COMMERCIAL | 25 | 2 | 16 |
| 0191 | SAME AS 0190 NO T RST R1T ZONE | UNKNOWN | 23 | 8 | 22 |
| 0180 | MH NO PERM FOUNDATION MS ZONE | MANUFACTURED_MOBILE | 22 | 5 | 20 |
| 8305 | CANALS | OTHER | 20 | 0 | 0 |
| 0019 | R1 ZONE W/MISC IMP | OTHER | 19 | 4 | 11 |
| 0201 | 2 SEPARATE RES ON 1 PARCEL | RESIDENTIAL_MULTI_FAMILY | 19 | 12 | 18 |
| 4300 | IRRIGATED LAND | AGRICULTURAL | 18 | 3 | 0 |
| 0103 | SGL FAM RES ON R3 ZONED LAND | RESIDENTIAL_SINGLE_FAMILY | 17 | 3 | 17 |
| 0091 | VAC W/MANUFTD HOME SUBDIVISION | VACANT_RESIDENTIAL | 14 | 1 | 9 |
| 0193 | 0190 ALL Z NO MS T RST R1T Z | OTHER | 12 | 3 | 12 |
| 6302 | SAME AS 6300 EXCEPT >$1000 | UNKNOWN | 12 | 1 | 2 |
| 0069 | SAME AS 0060 W/MISC IMP | UNKNOWN | 10 | 1 | 1 |
| 0105 | SGL FAM RES ON COMM/IND ZONE | RESIDENTIAL_SINGLE_FAMILY | 9 | 4 | 9 |
| 0192 | SAME AS 0190 A SERIES ZONING | UNKNOWN | 9 | 1 | 9 |
| 0200 | DUPLEX OR 2 LIV UN 1 PARCEL | RESIDENTIAL_MULTI_FAMILY | 9 | 4 | 9 |
| 1706 | CHURCH | OTHER | 9 | 3 | 7 |
| 3020 | VACANT M-2 | VACANT_OTHER | 9 | 0 | 5 |
| 8302 | MUTUAL WATER COMPANY | OTHER | 9 | 0 | 1 |
| 0079 | SAME AS 0070 W/MISC IMPS | UNKNOWN | 8 | 0 | 1 |
| 3086 | VAC IND LAND-CANNABIS CULT | VACANT_OTHER | 8 | 4 | 0 |
| 0082 | 40-100 AC NO R2 3 4 COMM IND | OTHER | 7 | 0 | 0 |
| 0190 | MH PERM FOUND MS ZONING | MANUFACTURED_MOBILE | 7 | 3 | 7 |
| 3030 | VACANT M-3 | VACANT_OTHER | 7 | 0 | 3 |
| 0601 | CONDO/PUD COMMON AREA | OTHER | 6 | 0 | 1 |
| 0088 | VACANT LAND - RENEWABLE ENERGY | VACANT_OTHER | 5 | 1 | 0 |
| 0182 | SAME AS 0180 NO A SERIES ZONE | UNKNOWN | 5 | 0 | 4 |
| 3961 | WIND PARK | INDUSTRIAL | 5 | 0 | 1 |
| 4121 | PISTACHIO | AGRICULTURAL | 5 | 2 | 0 |
| 0009 | SAME AS 0001 W/MINOR MISC IMP | UNKNOWN | 4 | 0 | 0 |
| 0029 | R2 ZONE W/MISC IMP | OTHER | 4 | 0 | 1 |
| 0039 | R3 ZONE W/MISC IMPS | OTHER | 4 | 1 | 1 |
| 0059 | SAME AS 0050 W/MISC IMP | UNKNOWN | 4 | 0 | 2 |
| 0600 | TOWNHOUSE OR PUD | OTHER | 4 | 0 | 4 |
| 1100 | SMALL STREET RETAIL < 5000 SF | COMMERCIAL | 4 | 1 | 4 |
| 3000 | VACANT LAND INDUSTRIAL | VACANT_OTHER | 4 | 0 | 1 |
| 8400 | MINING CLAIMS | MINERAL | 4 | 0 | 0 |
| 0100 | SGL FAM RES ON RS ZONED LAND | RESIDENTIAL_SINGLE_FAMILY | 3 | 1 | 3 |
| 0500 | 1 PARCEL W/5-9 UNIT COMPLEX | RESIDENTIAL_MULTI_FAMILY | 3 | 2 | 3 |
| 0700 | SFR ON R2/3/4 LAND, LOT<6000SF | RESIDENTIAL_SINGLE_FAMILY | 3 | 1 | 3 |
| 1190 | MULTIPLE USE STORE | OTHER | 3 | 1 | 3 |
| 1203 | COMBO RES & RETAIL | COMMERCIAL | 3 | 2 | 3 |
| 1600 | OFFICE BLDGS | COMMERCIAL | 3 | 2 | 3 |
| 2501 | PARKING LOT | OTHER | 3 | 0 | 1 |
| 5080 | >20AC W/OIL | OTHER | 3 | 0 | 0 |
| 0017 | SAME AS 0010 W/LICENSED MH | UNKNOWN | 2 | 0 | 2 |
| 0089 | 7-20AC W/MISC | OTHER | 2 | 2 | 2 |
| 0104 | SGL FAM RES ON R4 ZONED LAND | RESIDENTIAL_SINGLE_FAMILY | 2 | 1 | 2 |
| 0189 | MLTP MHS ANY ZN NO PERM FOUND | MANUFACTURED_MOBILE | 2 | 1 | 1 |
| 0302 | PARCEL W/3 SEPARATE RES | RESIDENTIAL_MULTI_FAMILY | 2 | 0 | 2 |
| 1029 | SAME AS 1000-1020 W/ MULT. MH | UNKNOWN | 2 | 0 | 2 |
| 1300 | LARGE STREET RETAIL > 5000 SF | COMMERCIAL | 2 | 2 | 2 |
| 2204 | AUTO REPAIR/GARAGE | COMMERCIAL | 2 | 1 | 2 |
| 2490 | MULTI USE AUTOMOTIVE RELATED | OTHER | 2 | 2 | 1 |
| 2990 | MANUFTD HOME PARK W/MISC IMPS | COMMERCIAL | 2 | 0 | 1 |
| 3029 | M2  W/MISC IMPS | OTHER | 2 | 1 | 1 |
| 3039 | M3  W/MISC IMPS | OTHER | 2 | 1 | 1 |
| 3100 | LIGHT MFG | INDUSTRIAL | 2 | 2 | 2 |
| 3186 | CANNABIS PRODUCTION | OTHER | 2 | 1 | 1 |
| 3700 | STORAGE (FENCED W/ SMALL OFF) | INDUSTRIAL | 2 | 2 | 2 |
| 3790 | MULTI USE | OTHER | 2 | 1 | 2 |
| 4144 | CHERRY | AGRICULTURAL | 2 | 2 | 1 |
| 4200 | GRAPE VINES | AGRICULTURAL | 2 | 0 | 1 |
| 5009 | SAME AS 5000 W/MISC IMP | UNKNOWN | 2 | 0 | 0 |
| 6030 | INCORPORATED CITY | GOVERNMENT_EXEMPT | 2 | 0 | 2 |
| 8303 | PRIVATE WATER COMPANY | OTHER | 2 | 0 | 0 |
| 8306 | COMMUNITY WATER SYSTEM | OTHER | 2 | 0 | 0 |
| 0049 | R4 ZONE W/MISC IMPS | OTHER | 1 | 0 | 1 |
| 0067 | SAME AS 0060 W/LIC MH | UNKNOWN | 1 | 0 | 1 |
| 0107 | SGL FAM RES + 1 LICENSED MH | RESIDENTIAL_SINGLE_FAMILY | 1 | 0 | 1 |
| 0198 | SAME AS 0190 W/LIC MHS | UNKNOWN | 1 | 0 | 1 |
| 0300 | TRIPLEX OR 3 LIV UN ON 1 PARC | RESIDENTIAL_MULTI_FAMILY | 1 | 1 | 1 |
| 0402 | TRIPLEX + 1 RES ON 1 PARCEL | RESIDENTIAL_MULTI_FAMILY | 1 | 1 | 1 |
| 0503 | 1 PARCEL W/(31+) UNIT COMPLEX | RESIDENTIAL_MULTI_FAMILY | 1 | 1 | 0 |
| 0504 | 1 PARCEL W/(5+) RES COMBO = 5 | RESIDENTIAL_MULTI_FAMILY | 1 | 0 | 1 |
| 0603 | CONDOMINIUM | OTHER | 1 | 0 | 1 |
| 1027 | SAME AS 1020 W/LIC MH | UNKNOWN | 1 | 0 | 1 |
| 1090 | SAME AS 1000 W/MISC IMP | UNKNOWN | 1 | 0 | 1 |
| 1601 | MEDIA | OTHER | 1 | 0 | 1 |
| 1605 | MEDICAL | OTHER | 1 | 1 | 1 |
| 1606 | DENTAL | OTHER | 1 | 1 | 1 |
| 1714 | HALF-WAY HOUSE | OTHER | 1 | 0 | 1 |
| 1802 | CAFES | COMMERCIAL | 1 | 0 | 1 |
| 1807 | DRIVE-IN | OTHER | 1 | 1 | 1 |
| 1900 | RECREATIONAL | OTHER | 1 | 1 | 1 |
| 1908 | FRATERNAL ORG | OTHER | 1 | 0 | 1 |
| 2201 | CAR WASH | COMMERCIAL | 1 | 1 | 1 |
| 2301 | SERVICE STATION | OTHER | 1 | 1 | 1 |
| 2390 | MULTI USE PETROLEUM RELATED | OTHER | 1 | 1 | 1 |
| 2800 | MOTEL | COMMERCIAL | 1 | 1 | 1 |
| 2901 | RV/TRAILER PARK | COMMERCIAL | 1 | 1 | 1 |
| 3601 | WAREHOUSE | INDUSTRIAL | 1 | 0 | 1 |
| 3703 | METAL SALVAGE | OTHER | 1 | 1 | 1 |
| 3705 | TRUCKING COMPANY | OTHER | 1 | 0 | 0 |
| 3962 | SOLAR PARK | INDUSTRIAL | 1 | 0 | 1 |
| 6020 | COUNTY OF KERN | GOVERNMENT_EXEMPT | 1 | 0 | 1 |
| 7000 | TOXIC HAZARD PRESENT ON SITE | OTHER | 1 | 1 | 0 |
| 8301 | PUBLIC UTILITY | OTHER | 1 | 0 | 0 |

Legal description is present in 11260 / 11263 exact candidate records, including 309 / 309 High. Only presence is exported.

## Candidate assessment-field availability

| County field | Numeric present | Missing/invalid | Explicit zero | Negative |
| --- | --- | --- | --- | --- |
| LAND_VAL | 11263 | 0 | 75 | 0 |
| IMP_VAL | 11263 | 0 | 10508 | 0 |
| NET_VAL | 11263 | 0 | 79 | 0 |
| BASEYR_VAL | 3133 | 8130 | 0 | 0 |
| MIN_VAL | 11263 | 0 | 11263 | 0 |
| OIFIX_VAL | 11263 | 0 | 11260 | 0 |
| PP_VAL | 11263 | 0 | 11261 | 0 |
| EX_VAL | 11263 | 0 | 11080 | 0 |
| ACRES | 11263 | 0 | 6860 | 0 |
| CITRUS_AC | 11263 | 0 | 11262 | 0 |

High-priority assessment detail is in SPRINT6_2_HIGH_PRIORITY_312.md. Presence includes explicit zero and never turns missing into zero. LAND_VAL, IMP_VAL and NET_VAL are numeric in all exact matches; BASEYR_VAL is present in 3133 and missing in 8130. Availability does not validate current market economics.

Future kern-screen-v2 **research only**: evaluate official residential-use support, improvement-assessment positive/zero/missing, explicit vacant-use support, source situs presence and exact geometry availability. Separate confidence/completeness from review priority; preserve v1 scores and historical editions. Zero IMP_VAL with positive LAND_VAL occurs in 10433 exact candidates (114 High), but is only a land-only **assessment** pattern, not proof of vacant land or no building. Never treat assessed value as market value or combine it with tax amounts to infer equity, mortgages, other liens, condition or seller motivation. No new score/weights implemented.

No Supabase connection or write; no migration (including 004); no source import; no production opportunity/status/address changes; no scoring, runtime, UI, PDF or analytical changes; no deployment; no RentCast, Google, county, GIS, title or other network calls. No inferred equity, mortgage, liens, physical condition, seller motivation or investment suitability. No geocoding. Provider calls = **0**.

County data: Kern County Assessor, 2026 Final. Internal research only. Retain the accompanying [county disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md) with any copy or extract. No warranty of legal boundaries, ownership, completeness or postal deliverability.
