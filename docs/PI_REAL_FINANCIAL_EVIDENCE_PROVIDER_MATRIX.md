# PI Real Financial Evidence — Provider Matrix

2026-10-12. Retained local evidence plus unauthenticated public RentCast documentation. **No provider data requests, account login, SFTP, database connection or new bulk extraction.** Public documentation reads are not counted as billable data calls.

## ATTOM: delivered products, not assumed subscriptions

Evidence: `data/validation/attom-bulk-poc/sequential-delivery-manifest.json`, `sequential-schema-change-summary.json`, `sequential-baseline-profile.json`, `sequential-replay-metrics.json`, [original layout inventory](ATTOM_BULK_SCHEMA_INVENTORY.md), [sample profile](ATTOM_BULK_DATA_PROFILE.md), and later [vendor clarification/certification](PI_MONITORING_V1_1_REAL_DATA_CERTIFICATION.md).

Baseline payload locations are explicitly recorded under `data/validation/attom-bulk-poc/raw/recovery-20261008/`; updates under `raw/delta-20261008-ordered/`. Original samples/layouts remain in the same ignored raw evidence tree. The new private `retained-attom-inventory.json` records each exact recovered filename/path, edition, bytes and verified SHA-256. Do not use the preserved corrupt/partial copies as sources.

| Delivered filename stem (`WORKSIDE_SOFTWARE_…`) | Product / edition | `_0001` rows × columns | `_0002` rows | Identity / relevant fields | Financial utility and missing evidence |
| --- | --- | ---: | ---: | --- | --- |
| `ASSIGNMENTRELEASE` | Assignments & Releases; upsert delivery | 665,575 × 35 | 0 | `TransactionID`, `AttomID`, `ParcelNumberRaw`, `MortgageTransactionID`, `MortgageLoanPosition`, `OriginalLoanAmount`, `RecordingDate`, `ContractDate`, original mortgage/document references, situs/type | Document/mortgage context, not sale value or complete open-loan ledger; transaction-code interpretation and complete chains still needed |
| `RECORDERDELETES` | Recorder invalidations | 167,564 × 1 | 30 | `TransactionID` only | No price, address, ATTOMID, FIPS, reason or independent business date; unmatched IDs stay tombstones, never generic deletions |
| `COMBINEDFORECLOSURE` | Combined Foreclosure; replacement snapshot | 6,115 × 111 | 6,115 | `TransactionID`, `ATTOMID`, `ParcelNumberRaw`, situs/coordinates/type/rooms/area/lot/year; `EstimatedValue`, `CreateDate`, `RecordLastUpdated`, foreclosure/loan/default/judgment/auction fields | Embedded model estimate and distress context; no sale-comparable package, condition-adjustment basis, AVM interval or method calibration |
| `FORECLOSURE` | **Preforeclosure**, per subsequent written clarification; upsert | 30,824 × 103 | 37 | `TransactionID`, `ATTOMID`, legacy `ParcelNumberFormatted`, situs/coordinates/attributes; `EstimatedValue`, `CreateDate`, original loan/recording/default/judgment/auction dates/amounts | Same valuation limitation; deprecated parcel field is historical evidence only, not a new integration key |
| `LOANMODEL` | Loan Model; property-keyed upsert | 1,188,929 × 42 | 428 | `ATTOMID`, FIPS; first/second/third position amount, transaction, date, type/rate fields; `LTV`, `AvailableEquity`, `LendableEquity`, `PublicationDate` | Modeled debt/equity context, not payoff, proposed investor debt or ARV. No standalone subject AVM/comps field in this delivered layout |
| `RECORDER` | Recorder; transaction upsert/corrections | 970,412 × 238 | 514 | `TransactionID`, `ATTOMID`, recording jurisdiction, `APNOriginal`/`APNFormatted`, situs/type, instrument/recording dates, `TransferAmount`, sale-quality flags, two mortgage summaries | Potential sale/transfer evidence, but needs quality definitions and property-attribute/geography joins; no standalone general property/AVM/comps product delivered |

All twelve certified payload hashes, sizes and Parquet boundaries pass. Schema field presence is not field population, correct semantics, usable rights or target-subject relevance. Prior complete decoding is certified evidence; no new row-level scan or sale dataset was generated here. Original sample and later baseline are different populations; do not combine their counts or null rates.

### Dates, coverage and source quality

- Original samples have September 2026 publication dates. Certified baseline publication is October 7; nonempty update publication is October 8. A replacement object's later remote modification time is not a later business edition. Transaction, model, publication, retrieval and intended valuation dates remain distinct.
- Five-county sample scope: FIPS 06111, 08035, 12031, 27123 and 37119. No Kern 06029 coverage is established for the target subjects. CombinedForeclosure also contains one excluded 55017 record. Recorder's profiled geography is **recording county**, not necessarily situs county; do not turn that into an unsupported universal situs assertion. RecorderDeletes has no geography at all.
- Baseline critical nulls: AssignmentRelease MortgageTransactionID 264,863/665,575; CombinedForeclosure foreclosure recording date 66/6,115; Recorder APNOriginal 876,816/970,412 and RecordingDate 281,034/970,412. Core transaction/property IDs in the reported key-bearing datasets are non-null; LoanModel ATTOMID is unique. These facts do not prove complete cross-dataset relationships.
- The old certification prose conflates distinct and non-null AssignmentRelease mortgage references in one sentence. The machine-readable baseline profile records **400,712 non-null rows**, **368,845 distinct references**, and **98,670** matching Recorder transaction IDs. This report uses those differentiated metrics and does not rewrite the original artifact.
- No current-profile population statistic for `EstimatedValue`, `TransferAmount` or sale-quality flags was established by this task. Original sample summaries are not substituted as current-baseline counts. Missing field-quality data remains a limitation.

### Exact field interpretation and sold-comp feasibility

| Need | Delivered evidence | What cannot be concluded |
| --- | --- | --- |
| Sale price | Recorder `TransferAmount`; layout labels it sale price | Every transfer is an arm's-length single-property sale; positive amount alone does not qualify it |
| Sale timing | `InstrumentDate`, `RecordingDate`, `LastUpdated`, `PublicationDate` | Recording/publication date is the closing date or a current valuation date |
| Sale quality | `ArmsLengthFlag`, `QuitclaimFlag`, `TransferInfoMultiParcelFlag`, `PartialInterest`, `ForeclosureAuctionSale`, `TransferInfoDistressCircumstanceCode`, `TransferAmountInfoAccuracy` | Unpublished integer codes can be guessed; missing flags mean a clean sale. `TransactionType` is described as a not-populated placeholder in the retained layout |
| Subject/property identity | Vendor ATTOMID; source parcel/address columns | ATTOMID is a PI canonical ID; formatted APN is safe for new joins; a same-address record resolves county identity |
| Geographic proximity | Coordinates/GeoQuality in foreclosure families; situs in Recorder | All sold Recorder rows have exact locations or can be joined by address strings |
| Residential type | `PropertyUseStandardized`, `PropertyUseGroup` | Undecoded property-use values qualify an SFR sale |
| GLA, rooms, lot, year | Foreclosure families: `AreaBuilding`, definition code, `BedroomsCount`, `BathCount`, lot fields, year fields | Foreclosure-only attributes form comprehensive attributes for ordinary sold Recorder properties; area definitions are interchangeable |
| Condition/renovation | No supported general condition/renovation comparison identified in these layouts | `YearBuiltEffective`, distress status or mortgage amount establishes renovated condition |
| Estimated market value | Foreclosure-family `EstimatedValue`; retained dictionary ties it to `CreateDate` | Publication refresh updates valuation, represents ARV, supplies accuracy bounds or makes the field a separately licensed general AVM product |
| Debt/equity | LoanModel position amounts, LTV/equity outputs; Recorder original mortgage amounts | Recorded principal equals current balance/payoff; modeled equity is confirmed true equity. Do not algebraically reverse LTV/equity into a purported new AVM |
| Cross-dataset relationships | Explicit ATTOMID and documented transaction keys; partial observed overlaps | Full sale-to-characteristic coverage, complete mortgage lifecycle or target-to-comparable identity |

Retain AttomID as the authoritative ATTOM join key, exact ParcelNumberRaw when actually returned, and original Kern APN9/ATN separately. Recorder's `APNOriginal` must not be relabeled ParcelNumberRaw without an authoritative mapping. Previous Recorder ATTOMID mappings remain history; latest vendor mapping does not itself resolve PI identity. No codebook integer is inferred.

**Conclusion for this Kern pilot:** existing ATTOM valuation and sold-comparable capability are **INSUFFICIENT**. As a cross-market schema capability, they are **PARTIAL**, not absent. No delivered general ATTOM AVM/comps entitlement, Kern feed or shared-commercial license is established.

### Retained ATTOM API evidence and rights

The prior one-fixture [API POC](ATTOM_API_CAPABILITY_POC.md) demonstrates exact-address ExaStr identity and historical transfer/mortgage/home-equity/preforeclosure responses. That excluded fixture's transfer amount, recorded mortgage and modeled balance are different facts, not new-candidate valuations. Its failed APN+FIPS experiment remains historical; it is not rewritten as PASS. No copied fixture economics, new endpoint inquiry or live ATTOM operation occurred.

Delivered sample access, identity guidance, quoted package prices and prior successful API reports do not establish new Kern coverage, current entitlement, commercial retention, shared SaaS or investor-PDF rights. Original bulk quotes ($3,000/year narrower package; $7,620/year broader package) are historical quote evidence, not a marginal cost for this plan. Existing evaluation artifacts may be inspected; broader rights remain **UNKNOWN**. No ATTOM purchase/acquisition is proposed in the nine-call plan.

## RentCast: documented capability versus observed evidence

Public documentation inspected without authentication on 2026-10-12. No private address, parcel identifier, key or account identifier was sent in documentation queries.

| Product | Documented output / lookup | Existing PI evidence | Readiness conclusion |
| --- | --- | --- | --- |
| Property Records `GET /v1/properties` | Address lookup or geographic search; attributes, sale history and tax fields; configurable sale lookback and bounded result count | Three prior pilot records retained only a minimal allowlist; original response fields not retained are not retroactively invented | Appropriate proposed discovery/history product; new subjects untested |
| Property Record by ID `GET /v1/properties/{id}` | Exact case-sensitive returned RentCast ID | No need for a redundant follow-up if first record contains required fields | Alternative for an already accepted ID, not an additional budgeted call |
| Value Estimate `GET /v1/avm/value` | Address or coordinates; estimate, low/high, subject and comparable listings | Two retained AVM bundles have 15 listing comparables each, but are unrelated/unbound to this new cohort; not 30 reusable sold comps | **PARTIAL**: capability documented/elsewhere observed, subject-specific suitability untested |
| Sold-record search `GET /v1/properties` | Address-centered radius and `saleDateRange`; property records of nearby sales | No existing certified sold-comp package for shortlisted subjects | **PARTIAL**: documented route, empirical sale quality/comparability untested |
| Rental AVM/listings/market statistics | Other products outside fix-and-flip evidence priority | Not needed to fill the stated top gaps | No requests proposed |

Property Records is paginated, supports up to 500 records, and fields vary by location; the proposed search is deliberately bounded to one page. See [endpoint contract](https://developers.rentcast.io/reference/property-records). Returned IDs must be preserved exactly; an ID-based record request is documented separately. [Property Record by ID](https://developers.rentcast.io/reference/property-record-by-id).

Record schema distinguishes `lastSaleDate`/`lastSalePrice`, dated `history` sale entries, yearly `propertyTaxes`, `taxAssessments` and structural attributes. No generic sale-quality/condition assertion is inferred from those fields. [Property Data Schema](https://developers.rentcast.io/reference/property-data-schema).

AVMs are based on comparable **listings**. Their comparable `price` is a listing price; inactive/removal does not establish a closed sale. Although vendor wording includes ARV, PI still requires the proposed scope and condition evidence. [Valuation methodology](https://developers.rentcast.io/reference/property-valuation). The value endpoint accepts address/coordinates, not a documented property-ID query parameter; require returned `subjectProperty.id` equality with records evidence. [Value Estimate](https://developers.rentcast.io/reference/value-estimate).

The valuation schema describes low/high bounds using an 85% confidence claim. PI has not independently validated that calibration for Kern or renovation exits; those bounds do not specify an engine distribution. A record-wide valuation as-of is not established by the retained bundles. [Valuation Schema](https://developers.rentcast.io/reference/property-valuation-schema).

A separate Property Records query is the documented sold-properties route; recorded updates can lag county processing by weeks/months. Sale candidates still need transaction-quality and condition review. [Property Data and sold-properties guidance](https://developers.rentcast.io/reference/property-data).

### Adapter/configuration inspection — not execution

Inspected `src/sources/rentcast/{config,client,propertyLookup,valuation,comps,normalizer}.js` and original controlled-pilot code. No `.env`, secret, live client or shared cache was loaded.

- Existing host restriction is official RentCast HTTPS. Default client limit is 6 calls with 2 retries; **not suitable unchanged** for the proposed nine-attempt, zero-retry reservation contract. The old three-call pilot's reservations must never be reset/reused.
- The client's parameter allowlist is only `address`, `compCount`, `maxRadius`, `daysOld`, and its endpoint allowlist is `/properties`, `/avm/value`. It currently rejects sold-search parameters (`radius`, `saleDateRange`, `propertyType`, `limit`, `offset`, `includeTotalCount`), explicit subject-lookup controls and `/properties/{id}`. The documented products therefore are **not executable unchanged through this client**. A separately authorized narrow controlled-client/allowlist certification is required; no bypass or edit occurred here.
- `fetchValuation` requests 15 comps, radius 2 miles, daysOld 180, and defaults to Manufactured. Those are existing implementation settings, not approved SFR pilot criteria; explicit SFR and approved search bounds are required later.
- Existing address comparison and optional ID mismatch check do not replace Rule C or strict nonempty provider-ID binding. Existing `normalizeComps` correctly labels price as listing price.
- `minimalRecord` intentionally excludes sale/tax/condition fields. A later explicit allowlist would be required to retain licensed financial evidence; do not claim it already exists. `providerAttributes` can retain raw comp attributes; a future controlled output must exclude owner/contact material rather than blindly serialize a full payload.
- Existing normalizer/domain Property creation and persistence are not needed for this acquisition plan and must remain uninvoked.

### Rights, entitlement and costs

The retained Cindy Bellford written confirmation (2026-10-09, user supplied; exact incoming timestamp unavailable) supports the described retention, county combination, commercial SaaS and investor-PDF uses; source correspondence remains fingerprinted and unchanged. Current API terms permit specified storage/derived/distribution uses, subject to legal/third-party obligations; no attribution is required. This is evidence review, not a legal opinion or blanket clearance. [API Terms](https://www.rentcast.io/terms-api).

Public billing documentation says plans share datasets/endpoints and successful HTTP 200 responses consume one request, regardless of result size. Developer's included requests apply across endpoints. No separate public AVM surcharge was found; the service does not supply a hard usage cap. **Actual Workside account activation/endpoint access is UNKNOWN today**, not inferred from documentation. [Billing and Pricing](https://developers.rentcast.io/reference/billing-and-pricing).

Public Developer pricing agrees with the last user confirmation: $0/month, 50 included, $0.20/additional request. This is not a live remaining-allowance reading. No authenticated dashboard was inspected. [API pricing](https://www.rentcast.io/api).

Original county use remains conditional on its [supplied disclaimer](SPRINT6_2_SOURCE_DISCLAIMER.md); future permitted extracts must carry required disclosure/disclaimer, not silently substitute a URL. New county portal data and Google retention are not used. ATTOM broader rights remain unknown; RentCast commercial written permission does not cover other providers.

**COST/RIGHTS CLARIFICATION REQUIRED** before acquisition: obtain current account/access/rate confirmation and an enforceable scoped cap. Do not spend calls merely to discover account entitlement. See the [request-by-request plan](PI_REAL_FINANCIAL_EVIDENCE_ACQUISITION_PLAN.md).
