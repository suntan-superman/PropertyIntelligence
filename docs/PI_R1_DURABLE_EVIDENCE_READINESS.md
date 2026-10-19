# PI Round 1 — Durable evidence readiness

Assessment: 2026-10-09. **VENDOR RIGHTS CLARIFICATION REQUIRED.** Documentation-only assessment of existing local evidence; no new property acquisition or database census. Round 1 remains PRE_EXECUTION — NOT AUTHORIZED.

## Decision

Recommend **RentCast property records** as the single primary provider for a future three-candidate technical acquisition. Existing code and historical responses make this the shortest implementation path. Historical no-ZIP responses support feasibility, but neither the 77-candidate coverage nor Workside's shared-canonical/investor-display rights and actual cost is established. Obtain the four narrow confirmations in the [controlled plan](PI_R1_CONTROLLED_ACQUISITION_PLAN.md#minimum-vendor-and-account-confirmations), then request acquisition authorization. Do not buy another package, start another general POC, or substitute Google-derived ZIPs.

This recommendation is conditional, not a finding that any provider has already established complete, durable, commercially usable evidence for this cohort. See the [rights matrix](PI_R1_PROVIDER_RIGHTS_MATRIX.md).

## Existing evidence: 77 potential candidates, not 77 eligible Properties

Recomputed locally from the existing Gate 1 manifest, its exact-bound Gate 1B snapshot, the permanent pilot exclusion registry, the certified ATN crosswalk, exact-situs cache and Power-to-Sell CSV. Joins used existing exact county identities; no address discovery join, cohort recreation, technical-pilot selection or investment ranking occurred.

| Measure | Local finding |
| --- | ---: |
| Historical High SFR population | 81 |
| Historical fixture already excluded | 1 |
| Gate 1B county-resolved cohort | 80 |
| Permanently excluded identity pilots | 3 |
| Remaining potential nonpilot candidates | **77** |
| Valid county ATN / APN9 | 77 / 77 |
| Unique candidate / ATN / APN9 identities | 77 / 77 / 77 |
| Exact Assessor relationship, independently consistent in crosswalk and snapshot | 77 |
| Original county situs present | 77 |
| Literal street / city prefill present | 77 / 77 |
| State / ZIP explicitly present in inspected situs prefill | **0 / 0** |
| California jurisdiction evidence applicable to county dataset | 77; dataset-level, not postal verification |
| SFR source classification | 77 |
| Historical Power-to-Sell source relationship | 77 |
| Acreage discrepancy/manual-review flag | **23** |
| No additional acreage-review flag | 54 |
| Canonical resolutions / active Property links / durable Property references at snapshot | **0 / 0 / 0** |
| Provider-ready canonical addresses / strict-harness eligible at snapshot | **0 / 0** |
| Duplicate/conflicting scoped identities in prior snapshot | 0 |

All 77 have dated Power-to-Sell source records as of 2026-09-15, Assessor edition 2026 Final and situs/county evidence as of 2026-06-26. The snapshot represents the latter date as 2026-06-26T07:00:00.000Z. Original county acquisition timestamps are not established by these artifacts; do not substitute this assessment's date. Historical distress is a screening lead, not current delinquency, foreclosure, sale availability or investability verification.

The 23 flags are ACREAGE_DELTA_GT_0_01. The other 54 retain the warning that exact county identifiers and county facts are not market value. A flag requires human acknowledgment and investigation; it is neither automatic rejection nor permission to waive identity checks.

County parcel metadata explicitly identifies Kern County, California. Its local XML SHA-256 is 1b74e844badc0bba857f86f5a1668df971eb8c8010aa0a889f234d839536955b. State is therefore jurisdiction-supported evidence available for a reviewer to cite, not a silently filled postal component. The inspected source cache contains no usable subject ZIP for these 77. Owner billing/mailing ZIPs are not substitutes. Unprocessed county formats were not newly decoded; this is not a claim that no ZIP could exist anywhere in county material. [Prior source assessment](PI_ASSISTED_ADDRESS_VERIFICATION_ASSESSMENT.md), [county source restrictions](SPRINT6_2_SOURCE_DISCLAIMER.md).

The database snapshot is **2026-10-09T01:55:12.326Z**, not current database state. Its report found all original 80 county-resolved but not persisted. Filtering the three exact exclusions leaves the same classification for all 77. No database was opened now; unrelated address-only Properties cannot be ruled out by these county-ID relationships. [Gate 1](PI_MLS_R1_GATE1_ELIGIBILITY.md), [Gate 1B](PI_MLS_R1_GATE1B_IDENTITY_READINESS.md).

### Reproducible local inputs

Private paths are references only; no candidate rows are published.

| Input | SHA-256 |
| --- | --- |
| data/runtime/mls-round1/private-candidate-eligibility.json | a514e775d52188da12569e4c2c6ed137f8da60bda09ebbe4d4eb1cc50e971f02 |
| data/runtime/mls-round1/private-canonical-identity-audit.json | 2c2dd4d0a921183824c4238c5590f53e9852e713be061f48fc3c798283232c59 |
| data/runtime/identity-resolution-pilot/pilot-exclusions.json | caebf338ec65da4a30da37011ed8e3f9af935065178d0a10fc7d73f254c8f71e |

The audit's recorded input-manifest hash matches the current Gate 1 bytes. Additional inputs: data/validation/sprint6_2-kern-atn-crosswalk.csv; data/runtime/sprint6_2-kern-assessor/exact-situs.json; data/raw/kern_power_to_sell_2026-09-15.csv. Existing normalization and reviewAddress/prefill helpers were used read-only; designate, prepare and database audit runners were not executed. Aggregate processing ran with the existing offline network blocker: zero attempted connections.

## Exact canonical requirements and distinct identities

Current [validateCanonicalAddress and providerReadyAddress](../src/persistence/addressResolutionRepository.js) require:

- Nonempty string street and city, trimmed/whitespace-normalized, at most 180 characters each; the cleaner rejects invalid/URL-like values and remaining control characters.
- A two-letter state, uppercased; the implementation checks two ASCII letters, **not membership in a US-state whitelist**.
- ZIP-5 through postalCode or postal_code, matching five digits. Optional postalCodeExtension/postal_code_extension must contain four digits. ZIP+4 input is split when an explicit extension is absent; this is formatting logic, not postal verification.
- providerReadyAddress returns the validated object or null. It does not verify ownership, parcel equivalence, licensing, currentness or analyst authorization.

No validator was weakened. Completeness is necessary but insufficient: existing persistence additionally requires coherent county/candidate context and genuine current review/authorization. V3's isolated synthetic certificate is not authority to persist real records.

| Identity layer | Required meaning |
| --- | --- |
| County | Immutable source ATN/APN9 and exact Assessor relationship; retain source/as-of history |
| Address | Independently supported street, city, state and ZIP; address agreement does not prove parcel equivalence or deliverability |
| Provider | ATTOMID, RentCast id/assessorID, or DataTree PropertyId/raw parcel, separately namespaced; Google place_id is not a parcel key |
| Durable PI | Supported, analyst-confirmed canonical resolution, durable Property and explicit Opportunity-to-Property lineage, under separate persistence authority |

## Existing provider comparison

### RentCast — primary, conditional

The [lookup adapter](../src/sources/rentcast/propertyLookup.js) accepts street/city/state and omits ZIP if absent. It calls only GET /properties; it rejects zero/multiple results, nonmatching supplied components and unit-bearing results. The existing deterministic comparison is not fuzzy parcel matching. No caller should interpret MATCHED_ADDRESS as APN verification.

Direct inspection found three property-response snapshots under data/raw/rentcast and one under data/runtime/rentcast, all with valid stored body hashes and one record each. The three older snapshots represent two non-Kern subjects, not three independent properties. Two requests omitted ZIP: one passed the existing street/city/state comparison; the other returned a different street and fails that comparison. All four returned complete address components. The runtime snapshot is an excluded historical Kern fixture with ZIP supplied. The older responses date to 2026-09-18; the runtime response to 2026-09-20. The [foundation completion evidence](FOUNDATION_SPRINT1_COMPLETION_REPORT.md) records the historical live lookup activity; none was repeated here.

Thus **historical technical address-completion capability is VERIFIED, including one matching no-ZIP non-Kern response**. General supported no-ZIP input contract, current access, freshness and coverage of the 77 remain unverified. This refines the earlier assessment's contract uncertainty without converting old cache success into new-candidate coverage. No inspected cache has an authoritative binding to these 77 county candidates; no address-string cache join was created.

Observed fields include id, addressLine1, city, state, zipCode, county/state FIPS and sometimes assessorID. One sparse response lacks assessorID and propertyType. The assessorID namespace, persistence and Kern APN9 crosswalk are not established. Returned subject ZIP must remain separate from owner/mailing fields. Raw responses contain owner data: do not copy them into shared evidence packets.

Configuration names are RENTCAST_API_KEY, fallback MARKET_DATA_API_KEY, and optional official-host-only RENTCAST_BASE_URL. No .env or credential value was read. Current defaults are 15-second timeout, two retries and six calls per client instance. The [cache](../src/sources/rentcast/cache.js) verifies request/body hashes and timestamps but imposes no retention expiry. Neither per-client limits nor a cache hit establish global budget or data-use rights. A future authorized worker must disable retries and enforce durable aggregate reservations; no changes made now.

Public internal-use/storage terms were previously reviewed; current account-specific amendments, quota and commercial rights were not located. **ACCOUNT TERMS NOT VERIFIED; COST NOT VERIFIED.** See the rights matrix for the limited public-term basis.

### ATTOM — capable historical identity evidence, not a Kern bulk solution

[API POC](ATTOM_API_CAPABILITY_POC.md), [gap analysis](ATTOM_API_GAP_ANALYSIS.md) and data/validation/attom-poc/endpoint-inventory.json establish a unique exact-address ExaStr result on the excluded Kern fixture. Its existing basicprofile response has identifier.attomId/fips/apn and address.line1/locality/countrySubd/postal1/postal2/matchCode. Complete address output is observed; an input without ZIP is not established by this POC. One successful Kern lookup supports historical entitlement to that subject, not current access or coverage of the 77.

APN+FIPS is a documented lookup form, but the historical Kern APN9 attempt did not reproduce the property. Preserve that failure. Written identity guidance makes AttomID the authoritative persistent provider key after unique ExaStr resolution; supported downstream requests should prefer it. ParcelNumberRaw remains verbatim, ParcelNumberFormatted is deprecated for new integration and ParcelNumberAlternate is supplemental. Keep source_system, source_atn, source_apn9, attom_id, attom_parcel_number_raw and canonical_address_id distinct. Neither API field spelling apn nor removing the historical blocking gate proves an APN9 crosswalk. No new APN-format experiment is proposed.

The [certified bulk baseline](ATTOM_SEQUENTIAL_DELIVERY_CERTIFICATION.md) covers five counties **outside Kern**. Its additional out-of-scope FIPS 55017 record remains excluded; feeds without a geography field cannot independently prove Kern coverage. The existing baseline/delta certification is not a source of Kern ZIPs. No Parquet download or replay was performed.

The current local POC ledger records **20 historical HTTP requests / 10 estimated API Reports**, hard ceiling 25. Estimated reports are not provider-confirmed billing, and the unused numerical ceiling is not authorization for different subjects. Existing bulk quotes of $3,000/year and $7,620/year concern different packages, not per-property API costs or licensed Kern coverage. Retention, shared records, commercial display and API price remain unverified. [Bulk fit](ATTOM_BULK_PI_FIT_RECOMMENDATION.md), [commercial questions](ATTOM_CALL_WITH_MIKE_QUESTIONS.md).

### First American DataTree — useful search, UAT rights not production rights

[Endpoint inventory](DATATREE_UAT_ENDPOINT_INVENTORY.md) preserves vendor-supplied SearchStandard FullAddress/is request semantics, the inspected Swagger inventory and provisioned products. The retained SearchStandard response has one PropertyId, raw Apn/Fips and complete Address/City/State/Zip, with subject address separate from owner mailing fields. TotalView subsequently confirmed the same excluded fixture. No new API/authentication/documentation request was made.

No-ZIP/partial-address SearchStandard input and exact APN filter contract are **UNKNOWN**. Generic GetReport documentation lists APN and Property ID search types, but does not establish SearchStandard's APN filter or authorize guessed enums. PropertyId is First American's internal unique identity; returned parcel formatting is not a documented Kern APN9 conversion. No match-confidence score was established. SearchStandard already returned ZIP: **neither TotalView nor a document order is needed merely for that observed output**. AddressStandardization is inventoried, not certified.

The canonical local usage ledger records **one property search, one TotalView report, five property-API authentications, four Swagger reads and two separately classified historical unrelated authentications**. Use the ledger's four Swagger reads rather than the older capability report's three. Last Finance Document remains unrequested. Historical target 10/hard 20 data/report requests do not authorize new candidates. UAT product provisioning permits specified testing, not a general production/SaaS license; proposed new-subject UAT scope, retention, pricing and commercial use require confirmation. No executed account agreement or raw saved Swagger definition was located in the reviewed repository materials; the vendor-contract inventory is the retained reference. [Commercial questions](DATATREE_COMMERCIAL_QUESTIONS.md).

### County and Google — preserve their separate roles

County evidence already establishes the exact source relationship and jurisdiction; it does not complete subject ZIP. It carries no warranty of accuracy/currentness and copy/distribution conditions. Do not reinterpret a tax-roll parcel as postal validation. Existing local reads require zero remote requests.

The [three Google results](PI_GOOGLE_GEOCODING_THREE_PROPERTY_RESULTS.md) establish one rooftop-level candidate with state and ZIP for each excluded pilot. Two passed exact-candidate comparison; one retains the street-suffix discrepancy. They do not establish parcel identity, nonpilot coverage or durable shared-use permission. Google remains a temporary address-discovery/reviewer aid, not the recommended durable source. Preserve the original response-specific deadlines and review restrictions; do not copy pilot content or treat historical APPROVED as new evidence rights. [Retention design](PI_ADDRESS_EVIDENCE_RETENTION_DESIGN.md).

## Coverage and human-review risks

| Risk | Required handling; no automatic resolution |
| --- | --- |
| Missing street/city | Present locally for all 77; future absent/changed input stops the affected acquisition |
| Missing ZIP | Missing for all 77 in inspected situs; require actual subject ZIP, never a city/neighbor/billing ZIP |
| Multiple matches, pagination or different street | Stop; no first-result choice, geographic broadening, fuzzy match or extra lookup |
| Different parcel namespace/APN formatting | Preserve both originals; require documented county-aware reconciliation, not stripping characters to manufacture a match |
| Historical/current identity, splits or merges | Human/source-history review; old exact relationship does not settle present parcel configuration |
| Non-SFR/unit/manufactured/multi-parcel response | Hold for review; county SFR status does not override contradictory provider representation |
| Sparse provider coverage or missing ID | Unusable identity evidence may still consume budget; no fallback/automatic retry |
| Acreage discrepancy | Preserve the 23 flags; require acknowledgment and explanatory evidence/notes |
| Rights, expiry or unclear provenance | Do not promote to durable/shared evidence; analyst acceptance cannot cure missing permission |

## Preservation and assessment QA

V3 remains **V3 ISOLATED INTEGRATION CERTIFIED**, 167/167 offline and 41/41 PostgreSQL tests, from its existing certificate; these tests were **not rerun**. No V3 code, prior manifests, actual decisions, retained schemas, Round 1 controls, analysis/report baseline or Google deadline was intentionally changed. Documentation QA verifies aggregate/source binding, relative links, privacy and before/after fingerprints; it is not application or live-provider certification.

Assessment QA: **PASS**. All **375** snapshotted existing source/configuration, decision, private audit, historical baseline, V3 artifact and related-document paths retained their exact SHA-256 values. Git status added only the three requested documents relative to the existing dirty worktree; unrelated prior work was preserved. All **39** local document links/anchors resolve; scoped candidate/Assessor IDs, ATNs/APNs and situs/street strings have zero matches in these reports; whitespace/conflict-marker checks pass. Seven read-only synthetic validator assertions confirm the documented component behavior, including missing-component rejection and the two-letter state limitation. Network attempts: zero. These small assertions are not a V3 certification rerun. Retained database schemas were not opened or independently recertified in this assessment.

The existing configuration remains PRE_EXECUTION, executionAuthorized=false, null selectionSeed/cohortFingerprint, all selection/evidence/assumption/Monte Carlo locks false, mlsAllowedBeforeFreeze=false. The original three pilot exclusions remain permanent. No assumption that all historical decisions are null was made.

Accounting: provider/documentation/network calls **0**; database reads/connections/writes **0/0/0**; real Properties/canonical resolutions/analyst approvals **0/0/0**; technical candidates selected **0**; Round 1 properties selected **0**; MLS access **0**. No dependencies, credentials, environment, application/UI, migrations, scoring, MAO, Monte Carlo, report implementation or deployment changed.

## Final readiness

| Required result | Finding |
| --- | --- |
| Existing Kern candidate evidence | PARTIAL |
| Nonpilot potential candidates | 77 |
| Minimum canonical components | Street, city, two-letter state, ZIP-5; optional ZIP+4 |
| Primary recommended provider | RentCast property records, conditional |
| Technical address capability | VERIFIED historically; no current-cohort success claimed |
| Kern candidate coverage | UNKNOWN |
| Internal retention rights | CONDITIONAL; prior public-term review, account-specific rights not verified |
| Shared canonical retention | UNKNOWN |
| Investor-report rights | UNKNOWN |
| Account-specific terms | NOT VERIFIED |
| Pilot request estimate | 3 maximum property requests; 0 authorized now |
| Pilot cost exposure | COST NOT VERIFIED |
| Controlled acquisition ready | NO |
| Remaining clarification | Supported no-ZIP/identity contract; durable/shared/display rights; applicable account agreement; entitlement/quota/rates and hard budget — exact questions in controlled plan |
| Final recommendation | **VENDOR RIGHTS CLARIFICATION REQUIRED** |

**STOP FOR STAN/CHATGPT REVIEW.** Do not initiate acquisition, real persistence or Round 1 execution.
