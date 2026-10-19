# PI RC-P2 — Current Identity Evidence Readiness V1

Date: 2026-10-09 (America/Los_Angeles). Timestamps below are UTC.

Final classification: **CURRENT COUNTY VERIFICATION REQUIRED**

Human-review readiness: **READY FOR LIMITED EVIDENCE REVIEW**

## Executive determination

RC-P2's historical crosswalk passes: the retained RentCast assessor identifier exactly matches the county's stored eight-digit APN; that unique parcel row supplies the original stored APN9; the APN9 reaches exactly one relevant land-roll row containing the original ATN. Independent read-only scans reproduced the retained source rows and the unchanged Rule C result.

Current authoritative parcel evidence is **not available in the inspected local evidence**. Present-day activity, post-delivery split/merge status and current identity freshness remain unverified. The original `APN_CONFLICT` packet stays unchanged; the later historical Rule C interpretation does not retroactively approve it.

All four address components are available from existing county/RentCast evidence and pass the existing consistency/format checks. They are **not analyst-confirmed or postal-validated**, and address agreement is not parcel proof. Licensed RentCast retention/use is documented in the retained vendor confirmation; it does not establish current county status.

A reviewer may inspect the historical relationship and outstanding evidence requirements. RC-P2 remains in exception quarantine for final identity approval, durable persistence and Round 1 selection. No operational approval route was created.

## 1. Scope, integrity and certified systems

This assessment reads existing local evidence only. No credentials were loaded, database connection opened, provider called or raw evidence regenerated. Existing V3 synthetic persistence, Rule C and versioned protected-baseline components were not modified.

The older Rule C reports preserve their original baseline-failure chronology. The later versioned reconciliation certified 532/532 regression executions, as recorded in [its report](PI_VERSIONED_BASELINE_RECONCILIATION.md). This task verified the current v3 manifests, all 351 nested pins and the retained 26 generated-artifact checks; it did not reopen or rewrite either historical certificate.

Before interpreting records, checks verified the original archive, 28 fingerprinted crosswalk source inputs, candidate mapping/input bindings, original HTTP/minimum-response/evidence/packet hashes and seals, and the saved Rule C source/result fingerprints. There was no missing or corrupt required evidence.

The original acquisition retained a minimal response rather than the full provider payload. Its preserved file hash, projected-record fingerprint, response-fingerprint reference, receipt and evidence seal agree with the original certificate. This assessment does not claim to reconstruct the unretained full response.

### County source identities

| Retained source | Verified SHA-256 |
| --- | --- |
| `KernCountyAssessor_GisParcels_2026final.zip` | `7954771690266e4f54402b4889ef5a9ae69dfdb04f9e34a6d822f115550c92ae` |
| `parcels_land_2026final.dbf` | `d27d17ea42946debd31b165893d042ea11fb39c608c81620724dc03f3527bd5e` |
| `TaxRoll_Land_2026final.dbf` | `3f96888125baad5525b1791d2e2ab56b5403b14d10f489378059341c0d17fbd5` |
| `TaxRoll_ParcelHistory_2026final.dbf` | `ad866d3dc10122aecf8442da0210e0d25d1cf2287b786ca7fd9769f0c2fd7d11` |
| `TaxRoll_ParcelHistory_EventTypes_2026final.dbf` | `de0a4de73c4d336b51b190165ec8f7592fb3228875b20578f25c76869c24dadf` |
| `parcels_land_2026final_shp.xml` | `1b74e844badc0bba857f86f5a1668df971eb8c8010aa0a889f234d839536955b` |

Exact property identifiers, physical source-row ordinals/offsets and row-projection fingerprints remain in the new private assessment and existing private artifacts, not this shareable report. The saved Rule C reconciliation fingerprint is:

`25ca38bd34688a51ac67ca8ec8bc2907dd9a846cdc575b9416ccccda3361a104`

## 2. Existing evidence inventory and independent corroboration

All listed paths were discovered locally. Paths are repository-relative.

| Evidence / location | Classification for current-identity question | Finding and limitation |
| --- | --- | --- |
| `data/raw/kern-assessor/KernCountyAssessor_GisParcels_2026final.zip` | HISTORICAL AUTHORITATIVE | Only county edition found in the retained county archive directory; 2026 Final, not a current status service |
| `data/runtime/sprint6_2-kern-assessor/extracted/` parcel, filtered land, history, event-domain DBFs and parcel XML | HISTORICAL AUTHORITATIVE | Exact APN/APN9/assessment relationship and snapshot history; one underlying county delivery, not independent corroborating sources |
| County package `_readme.txt`; existing source-audit/crosswalk artifacts | HISTORICAL AUTHORITATIVE definitions; derived copies are not independent | Defines intended filtered-table joins, event domain and edition; Access raw tables are explicitly unsuitable for direct GIS joins |
| `data/raw/kern_power_to_sell_2026-09-15.csv` | HISTORICAL AUTHORITATIVE for its stated extract | Original source ATN/row provenance; no APN/APN9/address column and no present-day active-parcel conclusion |
| `data/runtime/rentcast-controlled-pilot/candidate-mapping.json` | HISTORICAL NONAUTHORITATIVE derived PI packet | Sealed RC-P2 county binding and exact historical source references |
| `requests/attempt-2.json`, `http-2.json`, `response-2.json` under that pilot directory | CURRENT NONAUTHORITATIVE — recent retrieval only | One original HTTP 200 result; no underlying record-wide as-of date |
| `evidence/RC-P2.json`, `review-packets/RC-P2-review.json` under that pilot directory | CURRENT NONAUTHORITATIVE provider evidence plus historical county references | Original conflict, complete provider address, separate identities, rights reference and closed approval/persistence controls preserved |
| `private-crosswalk-investigation.json`, `private-crosswalk-integrity.json` under that pilot directory | HISTORICAL NONAUTHORITATIVE derived analysis | Sealed interpretation of the same authoritative county rows; not a second county verification |
| `data/runtime/rentcast-reconciliation-v1-1/replay-2026-10-09T22-29-15.713Z/` | HISTORICAL NONAUTHORITATIVE derived Rule C result | Manifest, source projection and RC-P2 result pass exact fingerprints and deterministic reassessment |
| `data/runtime/mls-round1/private-candidate-eligibility.json`, `private-canonical-identity-audit.json` | HISTORICAL NONAUTHORITATIVE PI workflow snapshot | Exact candidate located once; no canonical resolution, active link or durable Property in that retained snapshot; not a new database check |
| `data/runtime/rentcast/` | UNVERIFIED for RC-P2 / no matching retained record | Four existing cache JSON files inspected by exact provider ID/assessor ID only; zero matches; no address-string linking |
| `data/runtime/identity-resolution-pilot/` | Not RC-P2 evidence | Three IP-pilot decision files exist; none is an RC-P2 decision. IP-P2 is a different pilot and its historical approval is not transferable |
| Unqueried Access/FileGDB members in the same 2026 package | UNVERIFIED for a current-status conclusion | Same delivery; no database access/import and no basis to call them an independent newer source |
| Current official county parcel/status confirmation | CURRENT AUTHORITATIVE: **none found** | Minimum remaining evidence gap |

No locally retained analyst confirmation of RC-P2's current county activity was found in the inspected pilot/cohort materials. No other-property provider evidence, Google content or synthetic V3 authorization was repurposed.

## 3. Historical crosswalk and actual-row verification

Used the existing bounded-memory DBF reader without writes or extraction. Identifiers remain original strings; only DBF storage padding is removed by that existing reader. No check digit, padding, truncation, numeric identifier conversion, ATN equivalence, fuzzy matching or suffix-rule change was used.

| Table | Actual records scanned | DBF-deleted records | RC-P2 relevant matches |
| --- | ---: | ---: | ---: |
| Parcel table | 424,125 | 0 | 1 |
| Filtered land roll | 426,054 | 0 | 1 |
| Parcel history | 532,878 | 0 | 1 |
| Event-code domain | 10 | 0 in retained source schema/census | One documented meaning for the observed creation-event code |

The actual projected rows, source SHA, ordinal and byte offset match the retained Rule C and crosswalk evidence. The relevant assessment's situs, source row and use code agree with the original candidate. County Single Family research classification and RentCast Single Family type agree.

Uniqueness was checked against complete source-table scans, not merely against one requested record. Within the three original technical candidates, candidate bindings and RentCast IDs are also unique. The source-wide 1,095 repeated APN9 groups documented previously do not authorize guessing an assessment; RC-P2 itself has one relevant land row. Existing negative tests still reject duplicate parcels, multiple assessments, wrong candidates, jurisdiction conflicts and changed source fingerprints.

Re-evaluating the unchanged Rule C function twice reproduces the exact saved RC-P2 reconciliation, without input mutation or state advancement.

## 4. Source dates — separate meanings

| Date / timestamp | What it establishes | What it does not establish |
| --- | --- | --- |
| 2026 Final; README/extract/publication label 2026-06-26 | Edition/provenance of retained county delivery | Current activity on the review date |
| Parcel XML metadata modification 2026-08-12 | Metadata maintenance timestamp | Per-property re-verification or complete event coverage through that day |
| History date-shaped values observed through 2026-07-24 | Maximum populated date in this retained history table | A certified universal coverage cutoff |
| Power-to-Sell extract 2026-09-15 | Historical candidate source date | Current APN activity, unchanged assessment linkage or current distress |
| Local identity snapshot 2026-10-09T01:55:12.326Z | Time of the earlier read-only PI database snapshot | A county verification performed on that date |
| RentCast retrieval 2026-10-09T20:59:34.375Z | Time the original API result was obtained | Time RentCast last verified the underlying parcel/property record |
| RentCast record-wide as-of | **NOT RETURNED** | Must not be substituted with retrieval time |

The history date range observed again is 1971-03-01 through 2026-07-24, while the README describes history since September 1994. These differing scopes are retained as a source limitation, not silently reconciled. File modification times, metadata creation dates and dates for unrelated metadata sources were not used as property freshness evidence. Original county acquisition time is not newly established here.

## 5. Actual RC-P2 parcel history

Exactly one matching history row exists.

- Creation event code is **CV**. The county's own event domain defines this as conversion from the old computer system to KIPS on **1994-09-01**.
- The row's `DT_CREATE` contains that date. It is a system-conversion history date, not proof the property was created then or verified active today.
- Inactivation type/date fields are blank; the inactivation event-number text is zero-valued. The supported conclusion is **NO_INACTIVATION_RECORDED_IN_SNAPSHOT**.
- The observed row contains no documented cut/combine/transfer event. That means no such event was recorded in this retained row—not that all intervening changes are ruled out.
- No explicit predecessor/successor parcel identifiers are supplied in this row. Event numbers are not transformed into parcel IDs or used to infer a chain.
- The available history predates RentCast retrieval. Neither blank inactivation nor a nondeleted DBF row proves present-day activity.

**Parcel activity: UNVERIFIED. Split/merge status: UNVERIFIED.** No positive current conflict was discovered, but the absence of a recorded conflict is not a current clearance.

## 6. Current identity requirements and freshness policy

Inspection covered the unchanged Rule C strategy, human-review model/assessment, canonical validator, V3 trusted-review/policy gates, Round 1 configuration and relevant identity/readiness documentation.

| Requirement | Available now | Remaining gate |
| --- | --- | --- |
| Exact county parcel identifier and APN/APN9 relationship | Historical source-supported PASS | Current official county confirmation |
| Relevant assessment/ATN linkage | Unique historical land relationship | Confirm it remains the intended current assessment; do not generalize ATN equivalence |
| Active parcel; no known inactivation | No inactivation recorded in snapshot | Explicit current-status evidence with documented semantics |
| No unresolved split/merge/successor | No event observed in the retained row | County confirmation covering intervening changes; resolve any actual successor from county records |
| County/state | Consistent Kern/California evidence | Retain jurisdiction binding |
| Situs/property type | Consistent county/RentCast evidence | Review against the current county record; do not infer identity from address alone |
| Address components | Complete provider-supported candidate | Human component confirmation and contradiction review; no postal-validation claim |
| Provenance | Exact source/packet/row/result fingerprints PASS | Bind any later evidence to these identities and its own effective date |
| Evidence freshness | UNVERIFIED | Approved case-specific current-evidence policy and suitable county proof |
| Permitted use/retention | Existing RentCast written permission and county disclaimer documented | Preserve source-specific conditions; verify any future source's terms |
| Analyst authority | No RC-P2 decision | Genuine, current, packet-bound human review; no inherited or synthetic approval |
| Persistence | Not authorized | Separate authorization; V3's synthetic mechanics are not a real-property permission |

**CURRENT_IDENTITY_FRESHNESS_POLICY NOT ESTABLISHED**

No approved general county-identity age threshold was found in these policies. Synthetic fixture deadlines, temporary Google retention deadlines and browser-session expiry are not real county-identity freshness rules. Rule C explicitly leaves current freshness unverified.

**Proposal for later approval, not implemented:** for this one RC-P2 review, obtain a current official county verification in the review session. Record retrieval time separately from the county's effective/coverage date and documented update lag. Have the reviewer explicitly assess whether the covered interval supports the current-identity decision. An unknown effective date, unexplained lag or unresolved intervening event gap blocks final approval. Recheck if the evidence is superseded or a contrary event emerges. Do not introduce an arbitrary universal number of days.

## 7. Address evidence and licensed use

**Address evidence: COMPLETE as a reviewable candidate, not an approved canonical address.**

The original county packet has street/city and lacks explicit state/ZIP. California is supported by county jurisdiction, not independently postal-validated by it. The original RentCast result supplies all four address components, including ZIP. Existing street number/name/suffix, city, state, ZIP format, unit, formatted-address and canonical-format checks pass. No component was invented, no ZIP was inferred, and no suffix mapping changed.

Proposed component attribution: street/city — original county situs plus RentCast; state — county jurisdiction plus RentCast; ZIP — RentCast only. No Google-derived data is needed or reused. Human verification flags remain false.

**Licensed retention: DOCUMENTED for retained evidence.** The private `vendor-confirmation-2026-10-09.json` records the user-supplied RentCast support confirmation permitting retention of address/identifier/provenance, county-data combination, SaaS display and investor reports under the applicable standard terms. The original correspondence has no independently retained incoming message timestamp/ID; its documented date basis is preserved. This is existing written evidence, not a new legal opinion, live terms check or blanket license for other providers.

County extracts retain the [county source disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md), including attribution/disclaimer requirements and no warranty of completeness/currency. Source-use permission does not confer identity accuracy, analyst approval or persistence authorization.

## 8. Minimum additional verification — proposal only

Request **one current official Kern County Assessor parcel/assessment record or equivalent written county confirmation** for the exact RC-P2 identifiers already retained privately.

A historical official GIS-data landing-page URL is retained in the county metadata:

`https://www.kerncounty.com/government/departments/assessor-recorder/property/mapping-gis/gis-data`

It was **not opened**. It documents the known source lineage, not a verified working single-parcel/current-status lookup contract. No currently verified portal endpoint, accepted search format, refresh cadence, fee or real-time status capability was established locally.

| Future step | Specific requirement |
| --- | --- |
| Official method discovery | With separate authorization, ask the county Assessor/Mapping function which official lookup or written confirmation establishes active parcel status, exact APN/APN9 and current assessment linkage. Do not invent an endpoint or infer portal capabilities |
| Search identity | Use the exact stored eight-digit county APN; provide the existing APN9 and ATN as distinct corroborating references if the official method supports them. Follow documented formatting only |
| Required returned fields | Current parcel identifier, explicit APN/APN9 relationship, relevant assessment/ATN, situs, use/type, active/inactive status, effective/source date and provenance |
| History coverage | Confirm whether any split, combine, renumbering, transfer or inactivation affects this identity since the retained delivery; if so, obtain explicit county predecessor/successor references and dates |
| Comparison | Exact source-field comparisons to the preserved original references; no computed check digit, numeric coercion, address similarity or ATN-equivalence rule |
| Date/freshness | Capture both retrieval and official effective/coverage dates; obtain explanation of update lag and status-field meanings |
| Human review | Review current evidence, component support, contradictions, source rights and remaining uncertainty; bind the reviewed version/fingerprints; no preselected approval |
| Storage | Minimum necessary private evidence plus source/date/hash and county disclaimer; exclude owner/contact data; verify any portal-specific retention terms before retention |
| Access/cost | **UNKNOWN from retained evidence for this specific verification.** Do not presume a free API or that a prior bulk-data purchase covers a current record |
| Execution | **Not performed and not authorized by this assessment** |

A suitable single county confirmation may satisfy all missing identity/status facts; multiple broad reports are not inherently required. Do not buy title, ownership, loan or lien reports just to resolve APN representation. No repeat RentCast lookup is necessary to reproduce the already established historical crosswalk.

## 9. Human review readiness and packet proposal

**READY FOR LIMITED EVIDENCE REVIEW**, using restricted local evidence references. Current-status gaps do not make the intact historical evidence unsafe to inspect. They do prevent **READY FOR FINAL IDENTITY REVIEW**.

The existing UI accepts IP-P1/IP-P2/IP-P3, not RC-P2. This assessment does not add RC-P2 to that registry or generate a submission accepted by the approval system. A future interface change is not required to read this assessment, and is not authorized here.

The new private assessment includes a proposal-only packet outline:

- Original candidate/county/Assessor binding and immutable identifiers.
- Original HTTP receipt, minimal response, sealed evidence and exception-packet references.
- Exact historical crosswalk and source-row references; independent original and Rule C fingerprints.
- Separate publication, metadata, retrieval and effective-date fields, with unknowns explicit.
- Parcel-history conversion/inactivation findings and current freshness/activity/split-merge status.
- Component-level county/RentCast attribution, not analyst-verified values.
- Original strict `APN_CONFLICT` alongside the later historical explanation; no retroactive rewrite.
- Current authoritative evidence slot left empty.
- Existing source-rights references and county disclaimer.
- Decision null; final approval, persistence and Round 1 selection disabled; separate authorizations required.

This proposal is not an operational approval packet, new identity subsystem or durable Property. No actual decision artifact was added, changed or replaced. IP-P2's authentic historical analyst decision remains unrelated and untouched.

## 10. Offline QA, privacy and preservation

**70/70 evidence/Rule C checks PASS**: 30 named read-only real-evidence assertions plus all 40 unchanged focused Rule C tests, with zero skips, failures or cancellations. These include actual source binding/fingerprints, edition/date handling, history meaning, cardinality, current-versus-historical separation and closed approval/persistence/Round 1 gates. Synthetic tests cover collision, wrong identity, inactivation, split/merge, unknown freshness and attempted unauthorized state advancement.

No broad report-regeneration suite, original acquisition/verification writer, Rule C replay writer, database-certification command or review-store save route was run. Existing readers and pure validators were invoked from an ephemeral offline Node command; no source file was created or changed.

Two final checks separately verify post-write protected-file preservation and shareable-output privacy, for **72/72 total checks**. The private QA and preservation receipts retain the machine results. Source/real-evidence observations are distinct from the focused synthetic negative controls.

The before/after census covers **3,881 pre-existing files**, including Git-listed tracked/untracked files, protected source/model/report/V3 artifacts, original county archives/extracts, all retained pilot/Rule C artifacts, analyst decisions and Round 1 configuration. It is not a claim to scan every unrelated ignored file on the computer.

- Path-set SHA-256: `d53c3a6c4c193f34761c046480b78172e6fda27f371687e38b74ad0e3cbb8e92`
- SHA-256 over sorted `[path, file SHA-256]` pairs: `211d34d7c355aa5c037ee072078d6f80c3fa17738e82d48982cd4b0cdc653bb2`
- Post-assessment preservation: **PASS; 0 protected files changed**.
- The new report is scanned against the actual private RC-P2 address components and identity values; none is published.
- New private files are gitignored and untracked. No owner/contact data is copied.

New artifacts only:

1. `docs/PI_RC_P2_CURRENT_IDENTITY_READINESS.md` — this sanitized report.
2. `data/runtime/rc-p2-current-identity-readiness/assessment.json` — minimal private bindings, verified evidence references, findings and nonoperational packet proposal.
3. `data/runtime/rc-p2-current-identity-readiness/offline-qa.json` — named evidence checks and unchanged focused-suite output.
4. `data/runtime/rc-p2-current-identity-readiness/preservation.json` — final preservation/privacy receipt.

| Operation | Count |
| --- | ---: |
| Provider calls / outbound network attempts | 0 / 0 |
| Database connections / writes | 0 / 0 |
| Analyst approvals | 0 |
| Durable Properties created | 0 |
| Round 1 selections / authorization changes | 0 / 0 |
| MLS access / deployment / dependency installation | 0 / 0 / 0 |
| Protected source or historical artifact modifications | 0 |

## 11. Decision and next action

**CURRENT COUNTY VERIFICATION REQUIRED**

The next evidence action, if separately authorized, is the narrow official county verification described above. First, Stan/ChatGPT may review the intact historical crosswalk, source-rights evidence and proposed case-specific freshness policy. RC-P2 may undergo limited evidence review now but must remain blocked from final identity approval/persistence until the missing current county evidence and genuine human decision exist.

No property selection, provider acquisition or persistence follows automatically.

**STOP FOR STAN/CHATGPT REVIEW.**

