# Kern County ATN/APN Crosswalk Investigation V1

Property Intelligence / Workside Software LLC — 2026-10-09.

**CROSSWALK EVIDENCE SUFFICIENT FOR RULE PROPOSAL** — limited to a documented **Rule C, exact source APN lookup**. No rule was enabled. ATN equivalence and RC-P1's suffix remain review questions.

## 1. Executive findings

The existing county package distinguishes an **eight-digit APN** from a **nine-digit APN9**, which adds a final county-generated check digit. Its metadata explicitly defines both fields and APN9's role in joining parcel polygons to filtered tax-roll tables. This is a documented relationship, not a missing-leading-zero hypothesis.

- **RC-P2:** the original eight-digit RentCast `assessorID` exactly equals the county parcel table's actual `APN` value. That same unique row supplies the candidate's existing APN9; the exact APN9 join reaches its unique land-roll/ATN row. No padding, truncation or calculated check digit was used. The historical county identity relationship is established.
- **RC-P1 and RC-P3:** RentCast identifiers equal their county ATNs **after removal of spaces/hyphens**, not as raw strings. Each ATN and its existing APN9 co-occur in one unique original land-roll row, independently checked for each pilot. The inspected local documentation does not define ATN semantics or authorize ATN/APN interchangeability. These remain observed relationships only.
- The full land roll is **not globally one-to-one**: 1,095 APN9s have multiple ATNs. This may reflect assessment-to-parcel cardinality rather than corrupt data, but it defeats a blanket one-to-one identity rule.
- RC-P1's `AV` / `Ave` difference is still **REVIEW REQUIRED**. No inspected county suffix domain or existing PI mapping establishes that particular equivalence.

All three original `APN_CONFLICT` classifications, sealed packets, response/HTTP evidence, request ledger and analyst decisions remain unchanged. These investigation classifications describe **historical source relationships**, not current parcel verification, analyst approval or durable-persistence authorization.

## 2. Source inventory and integrity

The following paths were found and read locally; no replacement data was downloaded. Paths are repository-relative.

| Source | Actual location | Role |
| --- | --- | --- |
| Original county package | `data/raw/kern-assessor/KernCountyAssessor_GisParcels_2026final.zip` | Original fingerprinted archive |
| Original PTS extract | `data/raw/kern_power_to_sell_2026-09-15.csv` | Source ATNs, edition and row/page references |
| County README | `data/runtime/sprint6_2-kern-assessor/package/KernCountyAssessor_GisParcels_2026final/_readme.txt` | Package structure, filtered join tables, history and raw-data limitations |
| Parcel metadata | `data/runtime/sprint6_2-kern-assessor/extracted/Shapefile_Parcels_Land_2026final/parcels_land_2026final_shp.xml` | Explicit APN/APN9/APN_LABEL definitions and APN9 join contract |
| Land roll | `data/runtime/sprint6_2-kern-assessor/extracted/TaxRoll_Land_2026final/TaxRoll_Land_2026final.dbf` | Actual ATN/APN9 co-occurrence and assessment attributes |
| Parcel table | `data/runtime/sprint6_2-kern-assessor/extracted/Shapefile_Parcels_Land_2026final/parcels_land_2026final.dbf` | Actual APN/APN9/APN_LABEL rows |
| Parcel history | `data/runtime/sprint6_2-kern-assessor/extracted/TaxRoll_ParcelHistory_2026final/TaxRoll_ParcelHistory_2026final.dbf` | Parcel creation/inactivation field values |
| Mineral roll | `data/runtime/sprint6_2-kern-assessor/extracted/TaxRoll_Mineral_2026final/TaxRoll_Mineral_2026final.dbf` | Cross-dataset identifier check; no pilot matches |
| County code domains | `data/runtime/sprint6_2-kern-assessor/extracted/TaxRoll_RollTypes_2026final/TaxRoll_RollTypes_2026final.dbf`, corresponding `TaxRoll_UseCodes_2026final` and `TaxRoll_ParcelHistory_EventTypes_2026final` paths | Roll, use-code and event-code meanings |
| KIPS layout/data | `data/runtime/sprint6_2-kern-assessor/extracted/KIPS_Situs_2026-06-26/sits_schema.txt` and `SITS.TXT` | Fixed-width situs layout and exact TE_NO search; not an authorized parcel join |
| Existing crosswalk/audit | `data/validation/sprint6_2-kern-atn-crosswalk.csv`, `data/validation/sprint6_2-kern-assessor-source-audit.json` | Historical certification/source fingerprints; not substitutes for source-row inspection |
| Existing candidate manifests | `data/runtime/mls-round1/private-candidate-eligibility.json`, `private-canonical-identity-audit.json` in that directory | Existing cohort and historical identity snapshot |
| Original RentCast pilot | `data/runtime/rentcast-controlled-pilot/` | Candidate mapping, HTTP receipts, minimum responses, sealed evidence/review packets, ledger and rights reference |

**Integrity PASS:** the original archive, nested archives, all seven certified DBFs and all mapped candidate inputs matched existing SHA-256 pins. README, land XML and KIPS layout matched their original archive members, including archive integrity checks. KIPS data bytes also matched the member in the verified archive. Land/mineral HTML/XML metadata were read directly from existing nested archives; no extraction replaced a source file.

The three original HTTP receipts, responses, evidence files and review packets matched the prior acquisition certificate's hashes. Packet seals passed; candidate mapping matched its execution-lock fingerprint; the ledger exactly matched the copy in the prior certificate. A new preservation inventory covers **3,124 existing files**, including all prior reports, pilot artifacts, source/identity code, actual decisions and protected model/report files. Its hashes were unchanged after profiling and testing. No historical baseline was rewritten.

The raw Access and FileGDB archives were inventoried and fingerprint-checked, not queried or imported. The README warns that unfiltered Access tables do not directly join to GIS parcels. An Access ODBC driver exists locally, but no database connection was opened; the existing Node DBF/ZIP readers were sufficient for the documented filtered-table investigation. No new dependencies were installed. Absence of a definition below means absence in the **inspected documentation**, not a claim about every possible county system.

## 3. County field definitions

`C(n)` denotes fixed-width DBF character storage; `N(n,d)` denotes a numeric-layout field. Identifier comparisons use original text, never numeric values. DBF padding is trimmed by the existing reader; original source bytes remain preserved. Source-row locators bind file hash + one-based record ordinal + byte offset; they are not persistent cross-edition IDs.

| Field / table | Type / width | Observed blanks / behavior | Definition and authority |
| --- | --- | --- | --- |
| `ATN`, land/mineral | C(11) | Land: 0 blank/invalid; all 11 digits; 71,674 rows begin with zero | **FIELD SEMANTICS NOT DOCUMENTED** in inspected county definitions. Directly observed assessment-table identifier; acronym expansion, permanence and digit layout not established here |
| `APN9`, land/mineral/parcels/history | C(9) | Land/parcels: 0 blank/invalid; leading zeros retained | **AUTHORITATIVE DOCUMENTED:** APN plus final county-generated check digit; intended key from GIS to accompanying tax-roll tables |
| `APN`, land parcel table | C(8) | 0 blanks; all 8 digits; 70,649 values begin with zero | **AUTHORITATIVE DOCUMENTED:** basic Assessor's Parcel Number for property-tax/map identification |
| `APN_LABEL`, land parcel table | C(10) | 0 blanks; all width 10 | **AUTHORITATIVE DOCUMENTED:** APN delimited with hyphens for readability |
| `TE_NO`, land/mineral | N(19,5) | No blanks; retained as numeric-layout text, not coerced | **FIELD SEMANTICS NOT DOCUMENTED** as a cross-file/parcel key; no presumed equality to ATN, APN or KIPS TE_NO |
| `ROLL`, land/mineral | C(1) | No blanks | **AUTHORITATIVE DOCUMENTED:** accompanying roll-type domain identifies secured, mineral, utility, unsecured, exempt and mobilehome categories; not an active/inactive flag |
| `USE_CODE`, land/mineral | C(4) | Land: 3 blanks; remaining 426,051 width 4 | **AUTHORITATIVE DOCUMENTED:** linked code-description domain. Current PI research categorization is separate from county code meaning |
| `ADDR_SITUS`, land | C(60) | 144,608 blank of 426,054; nonblank length 2–47 | Situs purpose directly observed/used in existing ingestion; **FIELD SEMANTICS NOT DOCUMENTED** for component grammar or postal validation; no dedicated ZIP/state column in this DBF |
| `APN9`, history | C(9) | 532,878 nonblank valid-width identifiers, unique | Same named parcel identifier in county-provided history table; no ATN or eight-digit APN column |
| `EVT_NUM_CR`, `EVT_NUM_IN`, history | N(19,5) | No blank text values; numeric-layout strings retained | Event-number purpose inferred from naming/context; **FIELD SEMANTICS NOT DOCUMENTED** for chaining/cardinality; no chains collapsed |
| `EVT_TYP_CR`, `EVT_TYP_IN`, history | C(2) | Creation: 0 blanks; inactivation: 460,746 blanks | Supplied domain documents code meanings, including cuts, combines, transfers and deletion; column roles read in history context |
| `DT_CREATE`, `DT_INACT`, history | C(8) | Creation: 0 blanks; inactivation: 460,746 blanks | Observed eight-digit date-shaped text; **FIELD SEMANTICS NOT DOCUMENTED** for a universal current-active test or date cutoff |
| `TE_NO`, KIPS | Fixed text, columns 1–10 | 304,569 rows; 0 blank TE_NO; fixed row width 80 | **AUTHORITATIVE DOCUMENTED layout**, but **FIELD SEMANTICS NOT DOCUMENTED** for a join to tax-roll TE_NO or parcel IDs |
| KIPS `STR_NO`, `STR_NO_FRACTION`, `STR_NAME`, `STR_DIR`, `STR_TYPE_CD`, `CITY`, `AD_UNIT_TYPE`, `AD_UNIT_ID` | Fixed text widths 6 / 1 / 20 / 2 / 2 / 15 / 3 / 4 | Layout inspected; no automatic component inference | Documented field names/positions. No street-type value domain supplied in inspected layout |
| PTS `atn` | CSV string, observed width 15 | 11,321 nonblank valid records in existing normalizer | Source ATN column with the existing separator pattern; no APN/APN9 field. It does not define an ATN-to-APN formula |
| Source-row / DBF deletion marker | Physical ordinal / 1 byte | 0 DBF-deleted records in scanned tables | Reader/format identity only; a nondeleted DBF record is **not** proof of an active/current parcel |
| GIS FID | Metadata OID, width 4 | Not a stored DBF identity column | Metadata defines an internal sequential feature number, not a cross-edition parcel key |

Leading zeros are significant to string identity and must be preserved; they are actually present in tens of thousands of source identifiers. No operation removed leading zeros. Private examples and exact field values are retained only in the new gitignored investigation artifact.

No explicit active boolean, predecessor/successor APN pair, or alternate ATN field exists in the inspected land DBF. History provides event/date fields, not an automatically safe current-parcel equivalence chain. An inactivation blank is not independently certified as present-day active status.

## 4. ATN/APN9 relationship profile

Every row in the existing filtered land DBF was examined. This primary profile is not restricted to the three pilots.

| Measure | Full land roll | PTS-matched land subset |
| --- | ---: | ---: |
| Rows examined | 426,054 | 11,263 |
| Distinct ATNs | 426,054 | 11,263 |
| Distinct APN9s | 424,125 | 11,200 |
| Distinct exact ATN/APN9 pairs | 426,054 | 11,263 |
| Duplicate ATN values | 0 | 0 |
| Duplicate APN9 values | 1,095 | 50 |
| Duplicate exact-pair excess rows | 0 | 0 |
| One ATN → multiple APN9s | 0 | 0 |
| One APN9 → multiple ATNs | 1,095 | 50 |
| Strict one-row/one-to-one pairs | 423,030 | 11,150 |
| Blank / invalid ATN-APN9 rows | 0 / 0 | 0 / 0 |

The land roll's 1,095 many-to-one APN9 groups account for 1,929 excess assessment rows. These are **non-one-to-one relationships**, not confirmed erroneous records. They must be rejected by a proposed rule requiring unique assessment/property identity; do not silently select one ATN. All three pilot APN9s have exactly one ATN across the full land roll, not merely within the candidate subset.

Additional directly observed profiles:

- **PTS:** 11,321 source rows, 11,316 distinct ATNs, five duplicate ATN values; 53 distinct ATNs have no exact land match. No amount/owner data was used. Source duplicate grouping was not changed.
- **Land parcels:** 424,125 rows, 424,125 distinct APNs and APN9s; no duplicates/blanks. All observed APN/APN9 row pairs conform to the documented eight-digit APN plus final digit relationship. This checks source structure; it does not calculate the check digit or transform a provider identifier.
- **History:** 532,878 rows/distinct APN9s; 0 duplicate APN9s; 72,132 populated inactivation date fields and 460,746 blanks. The event domain documents split (`CT`), merge (`CB`), direct transfer (`DT`) and deletion (`DL`), among other events. No history chain was inferred.
- **Mineral:** 4,722 rows/distinct ATNs, 4,715 APN9s; three APN9s have multiple ATNs; no pilot ATN/APN9 matches in this table. Land and mineral rights are not treated as interchangeable.
- **KIPS:** 304,569 fixed-width rows, no malformed row widths or blank TE_NO. RC-P2's exact diagnostic identifier was not found in TE_NO; a numeric conversion was not attempted.

### Source dates and limits

Only the existing **2026 Final** county delivery was compared, not a longitudinal series of roll snapshots. The README/extract label is 2026-06-26; metadata includes a 2026-08-12 update. History's populated date-shaped values span 1971-03-01 through 2026-07-24, despite the README describing history since September 1994. These are distinct dates/observations, not one certified universal cutoff. Legacy/conversion records may explain the older range, but that explanation is **INFERRED**, not established.

The PTS extract is labeled 2026-09-15; RentCast retrieval was 2026-10-09. No record-wide RentCast as-of timestamp was retained. Identifier permanence, current activity, post-delivery splits/merges and present-day relationship freshness are **not verified** by this investigation.

## 5. RC-P1 investigation

Classification: **OBSERVED_RELATIONSHIP_ONLY**.

Its provider parcel string, with spaces/hyphens removed only, matches the original land-row ATN. That ATN occurs once and links to one APN9; that APN9 has one land-row ATN and one parcel-table row. The source-row ordinal, exact identifier values, source bytes' SHA-256 and original pilot mapping agree. A history row exists without populated inactivation fields; no mineral match was found. This is not proof of current active status.

County and provider street number/city/state/type agree; the only street-text difference is terminal `AV` versus `Ave`. This supports the same **apparent** address, not independent parcel equivalence. The county metadata documents the APN9 join but does not define the ATN field or RentCast's choice to report it. There is no confirmed contradictory county mapping for this candidate, and no identity approval.

## 6. RC-P2 investigation

Classification: **AUTHORITATIVE_IDENTITY_RELATIONSHIP_ESTABLISHED**, restricted to the historical county source crosswalk.

The eight-digit RentCast value equals the **actual APN field byte-for-byte after DBF storage-padding removal**; it also equals APN_LABEL after hyphens/spaces only. Those are the only exact identifier hits in the searched fields. That unique parcel-table row contains the candidate's exact APN9. The metadata explicitly defines APN and APN9 and their join purpose. The APN9 reaches exactly one land-roll row with the original ATN, matching the independently preserved candidate evidence.

The lookup used the stored source APN/APN9 pair; it did not generate APN9, append a guessed check digit, add a leading zero, or remove a digit from the provider value. No matching alternative was found in inspected land/mineral ATN/APN9/TE_NO, history APN9 or KIPS TE_NO. Address components and SFR classification agree; the history row has no populated inactivation fields, subject to the snapshot limitations above.

This explains why the original strict APN9 comparison failed without showing that RentCast returned a different property. The original pilot report was correct under that strict gate and was **not rewritten**. The new finding supports a future Rule C proposal, not present-day persistence or a retroactive analyst approval.

## 7. RC-P3 investigation

Classification: **OBSERVED_RELATIONSHIP_ONLY**.

Independent source-row inspection, not inference from RC-P1, shows a formatting-only exact provider-to-ATN match, one ATN row, one APN9 target, one reverse land relationship and one parcel-table row. Original source/mapping fingerprints agree. A history row exists with blank inactivation fields; no mineral match was found. Provider street/city/state/type comparisons agree under existing PI rules.

As for RC-P1, the observed assessment-to-parcel pairing is reproducible but the local county documentation does not establish ATN semantics or a general ATN substitute for APN9. Current activity/freshness is not verified. No contradictory mapping was found for this pilot; it remains unapproved.

## 8. Address-suffix review

**REVIEW REQUIRED.** The unchanged `src/sources/rentcast/propertyLookup.js` maps `AVENUE` to `AVE`, but not `AV` to `AVE`. The KIPS layout identifies a two-character `STR_TYPE_CD` field but supplies no inspected code-domain definition establishing the requested equivalence. Familiarity with an abbreviation is not a source citation.

No mapping was added. A future documented/analyst-reviewed address equivalence must not substitute for the separate parcel-identity gate. No geocoding or other provider was called.

## 9. Evidence authority

| Finding | Authority | Limitation |
| --- | --- | --- |
| APN is eight digits; APN9 adds the county check digit; APN9 joins filtered roll to parcels | AUTHORITATIVE DOCUMENTED | Metadata in the verified local county archive; not a current-property guarantee |
| RC-P2 exact source APN → stored APN9 → unique land row | AUTHORITATIVE DOCUMENTED + DIRECTLY OBSERVED row verification | Historical county identity relationship only |
| RC-P1/RC-P3 exact formatted ATN and unique row pairing | DIRECTLY OBSERVED | ATN field semantics/substitution convention not documented in inspected sources |
| RentCast `assessorID` is county APN with minor formatting cleanup; provider ID is stable within RentCast | VENDOR ASSERTED | Supplied Cindy Bellford correspondence; mixed 8-/11-digit behavior still needs explanation |
| ATN might identify an assessment separate from the parcel; old history dates may reflect legacy conversion | INFERRED | Do not promote these interpretations into definitions or rules |
| ATN permanence, current active state, raw-table alternate relationships, RC-P1 suffix equivalence | UNRESOLVED | No broader acquisition or guessed transformation used to fill gaps |

## 10. Candidate reconciliation rules — proposal only

Common prerequisites for any later implementation: exact source fingerprints and source edition; explicit Kern/California context; string-preserved provider/county identifiers; documented source relationship; current authorized freshness assessment; no duplicate/conflicting relevant mappings; no unresolved historical inactivation/split/merge chain; and required human review. Unknown freshness must stop persistence, not silently pass.

| Rule | Evidence / uniqueness | Risk and review | Disposition |
| --- | --- | --- | --- |
| A — exact APN9 | Provider value equals stored county APN9 under approved formatting-only comparison; require unique relevant candidate/assessment relationship and matching county | Cross-county collisions, multiple assessments and stale parcels still require checks/human approval | Existing concept remains reasonable; none of the three qualifies under current strict gate |
| B — exact ATN crosswalk | Provider equals stored ATN, plus an explicitly defined county ATN relationship and unique forward/reverse source mapping | 1,095 full-roll APN9 groups are non-one-to-one. Two pilot row matches alone do not establish a general semantic contract | **Not ready to enable/propose as authoritative equivalence.** Obtain county definition and RentCast explanation; keep RC-P1/RC-P3 exception review |
| C — documented alternate APN field | Exact provider value lookup in actual parcel-table `APN`; unique APN/APN9 row; exact stored APN9 join to the intended, unique land assessment; authoritative metadata retained | Do not derive APN9, conflate assessment with parcel, ignore source age, or accept ambiguity. Human approval and fresh identity checks remain required | **Narrow safe rule proposal supported** for the documented APN field. RC-P2 supplies empirical evidence; no operational authorization or code path enabled |
| D — human exception | No authoritative equivalence; retain original records, conflicts and missing evidence | Address agreement and reviewer preference cannot override an unresolved identity/source-rights conflict | Keep unresolved; request authoritative evidence. Not a persistence bypass |

No transformation is proposed from ATN digits to APN9. No directory-wide exemption, relaxed normalizer, automatic approval or durable-property code change was made.

### Negative controls and preservation

**19/19 offline tests PASS; 0 skipped.** Test-only hypothetical gates reject duplicate ATNs, an ATN with multiple APN9s, an APN9 with multiple ATNs, wrong county/state, stale/inactive history, missing documented relationship, ambiguous alternate ID, leading-zero differences, numeric coercion, unsupported transformations, address-only evidence and source-fingerprint failure. Additional assertions verify the unchanged suffix rule, original seals/classifications/ledger/decisions, actual exact source relationships and zero networking.

The hypothetical gate exists only inside the investigation test file; it is not exported, wired into the app, or used to approve any pilot. Freshness/authority booleans in synthetic controls are not runtime evidence. No test grants current freshness to the real historical sources.

## 11. Remaining authoritative questions

1. **County:** What precisely does `ATN` identify in this filtered roll, how stable is it, and when can several ATNs legitimately share APN9? Supply the intended assessment/parcel relationship contract, including changes over time.
2. **RentCast:** Why does `assessorID` contain an eleven-digit ATN representation for two pilots but the documented eight-digit APN for the third? Can the representation/type be identified reliably, and are provider mapping changes/history available?
3. **County/vendor:** What authoritative evidence establishes currency or inactivation beyond this single delivery? Clarify edition/extract/metadata/history date distinctions and any safe historical joins.
4. **County/analyst:** Supply a documented suffix convention or explicit supporting review evidence for the RC-P1 `AV` / `Ave` difference. Do not infer the answer from the KIPS field width.

These questions were prepared, not transmitted. No provider contact or new acquisition occurred.

## 12. Artifacts, next step and stop

Private, gitignored outputs (new files only):

- `data/runtime/rentcast-controlled-pilot/private-crosswalk-integrity.json`
- `data/runtime/rentcast-controlled-pilot/private-crosswalk-investigation.json`
- `data/runtime/rentcast-controlled-pilot/private-crosswalk-qa.json`

They retain the exact three identifier relationships, provider IDs, source locators/fingerprints, preserved source values, profile counts, historical fields, discrepancies and unresolved questions. No owner/contact information is included. Existing sealed packets and historical reports were not edited.

Investigation-only scripts are under `scripts/rentcast-crosswalk-investigation/`. They use existing ZIP/DBF/CSV readers with networking disabled and no environment/credential loading. Large raw rows are scanned in approximately 4 MiB batches; identifier maps support exact cardinality counts. Observed end-of-run RSS was approximately 663 MiB, not a measured peak. No source data was modified.

Recommended next step: Stan/ChatGPT review of the **Rule C proposal** and the prepared questions. A separately authorized implementation could test exact source APN lookup without changing raw identifiers, but not until source-freshness, identity approval and persistence gates are specified. Rule B and the suffix discrepancy need additional authoritative evidence first. No additional calls or real-property persistence are recommended as an automatic continuation.

Provider calls **0**; database connections/writes **0**; analyst approvals **0**; durable Properties **0**; Round 1 selections **0**; MLS access **0**; deployments **0**. Round 1 remains `PRE_EXECUTION`. All three original pilot conflicts remain in place.

County evidence retains the existing [county source disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md); supply that disclaimer with any permitted county extract. The parcel model is for assessment purposes, not proof of legal ownership/boundaries or postal deliverability.

**STOP FOR STAN/CHATGPT REVIEW.**
