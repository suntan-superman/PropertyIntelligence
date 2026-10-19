# PI Real Financial Evidence Readiness V1

2026-10-12. Local evidence assessment and acquisition proposal only.

**COST/RIGHTS CLARIFICATION REQUIRED.** The technical shortlist is ready for review, but acquisition is not authorized or operationally ready. Real financial inputs remain **INSUFFICIENT**. Supported ARV also remains unavailable. No real economics, Monte Carlo, MAO, investor report, approval or persistence was executed.

## Decision and scope

| Question | Finding |
| --- | --- |
| Existing ATTOM valuation / sold-comparable capability for these Kern candidates | **INSUFFICIENT / INSUFFICIENT**. Samples contain useful fields, but no certified Kern subject/comparable coverage or join |
| RentCast valuation / sold-comparable capability | **PARTIAL / PARTIAL**. Documented products and retained unrelated AVM examples exist; no new-subject result, sold-comps quality or current account entitlement verified |
| Subject-binding method | **PARTIAL**: supported existing rules, but the three new subjects lack provider evidence and a tested crosswalk |
| ARV methodology | **PROPOSED**; actual case result must remain `ARV_NOT_SUPPORTED` until condition, sale quality and adjustment support exist |
| Technical shortlist | **SELECTED: 3**, not approved, provider-ready or MLS-selected |
| Financial evidence readiness | **INSUFFICIENT**; 34/34 required entries remain unsupported per new subject |
| Provider rights | **CONDITIONAL** overall. RentCast written permissions retained; ATTOM broader commercial rights not established |
| Proposed requests | **Up to 9**, staged, no retries: three subject records, three AVMs, three bounded sold-record searches |
| Proposed cost | $1.80 request-fee estimate assuming nine successful overage calls at the user-confirmed $0.20 rate; proposed $2.00 all-in cap. **Enforceable maximum UNKNOWN** until account/charges/cap controls are confirmed |

No claim of overall Round 1 readiness. Its configuration remains `PRE_EXECUTION`, execution unauthorized and cohort unlocked/unselected.

The [provider matrix](PI_REAL_FINANCIAL_EVIDENCE_PROVIDER_MATRIX.md), [acquisition plan](PI_REAL_FINANCIAL_EVIDENCE_ACQUISITION_PLAN.md) and [QA report](PI_REAL_FINANCIAL_EVIDENCE_QA.md) supply the evidence, request gates and preservation receipt. New code is a small offline assessment/QA utility, not an ingestion, identity, valuation or reporting subsystem.

Targeted certification: **108/108 PASS**, zero skips; all 4,207 pre-existing protected file hashes unchanged. Existing generated artifacts were validated structurally/content-wise, never regenerated.

## Evidence reviewed and precedence

Reused Preliminary Analysis V1's exact `REQUIRED` list, unchanged financial gate and existing certified results; Rule C's historical source rules; retained acquisition/county manifests; Gate 1/Gate 1B and IP/RC exclusions; ATTOM schemas, profiles, dictionaries and delivery/replay certificates; existing RentCast adapter/cache; Monte Carlo specification/contract; MAO V2; Investor V1.1 certification; V3 and versioned protected manifests.

The baseline capture covers **4,207 existing files**. Twelve ATTOM `_0001`/`_0002` payloads were individually rehashed against certified manifests and checked for byte size and `PAR1` boundaries. Earlier all-column decode/profile results are reused, not claimed newly rerun; no DuckDB/database connection occurred. This task does not repeat replay or create a bulk comparable extract.

Historical reports remain untouched. Specifically:

- Later ATTOM written guidance, recorded in Monitoring V1.1, establishes physical `FORECLOSURE` as Preforeclosure, RecorderDeletes as Recorder-only, latest Recorder ATTOMID as vendor mapping, prior mappings retained, unmatched deletes as tombstones, and FIPS 55017 excluded. Earlier reports saying these points were unresolved are historical, not the current rule.
- The later RentCast correspondence of 2026-10-09 supersedes the earlier assessment's uncertainty about the described retention/SaaS/PDF permissions. It does not prove today's account activation or valuation quality.
- Rule C's historical failing-test narrative is preserved; the later versioned-baseline certificate and current targeted protection QA establish the reconciled state.

## Exact 34-entry financial/support inventory

These are the unchanged Preliminary V1 field paths, not 34 newly invented model inputs. Each row states purpose, units and acceptable prospective source/classification. The following explicit metadata applies to **every row**:

- **Existing usable evidence/classification:** `MISSING`; value null, no substituted zero. RC-P2's certified real-readiness result also had all 34 missing. New shortlist subjects have historical county identity/screening context only, not a bound licensed financial package.
- **Source/effective date:** unknown/not supplied for the required financial value. County 2026 Final, situs 2026-06-26 and distress 2026-09-15 are provenance context, not a financial valuation date. Provider retrieval time must never fill an unknown source as-of.
- **Subject binding:** not established for a usable value; any future item must reference its exact private opaque subject, county lineage, provider identity where applicable, source/hash, rights version, date and rationale.
- **Blocking:** YES for each entry. An explicitly supported zero/non-applicability can satisfy applicable cost fields; missing data cannot. The condition/comps/date support entries do not disappear just because the economics engine accepts numbers.
- **Rights codes below:** **R** = retained RentCast permission, subject to applicable API/third-party terms and current product access; **C** = original county delivery with its attached disclaimer, not new portal rights; **H** = analyst/investor/contractor/lender material with permission, attribution and dated basis to be supplied. **A** = ATTOM terms/coverage not established for new Kern financial use. These are source-specific conditions, not legal certification.

| # | Exact field | Purpose / units | Potential source and rights | Permissible future class / assumption limits |
| ---: | --- | --- | --- | --- |
| 1 | `economics.purchasePrice` | Acquisition consideration; USD | Proposed agreement or investor price scenario; H | INVESTOR_ASSUMPTION with attribution; never assessed value, arrears, mortgage or historical sale |
| 2 | `economics.exitValue` | Gross resale value after stated scope; USD | Supported sold-comps/condition analysis; R + H (A not available) | ANALYST_ESTIMATE; AVM provider evidence is an input, not automatic ARV |
| 3 | `economics.rehabCost` | Scoped work excluding separate contingency; USD | Condition evidence and itemized contractor/analyst estimate; H | ANALYST_ESTIMATE; no generic unapproved per-SF default |
| 4 | `economics.rehabContingencyRate` | Additional spent rehab contingency; fraction | Scope-risk assessment; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION; avoid double-counting modeled overruns |
| 5 | `economics.acquisitionFixed` | Fixed buyer closing costs; USD | Closing quote/budget; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION; no silent zero |
| 6 | `economics.acquisitionRate` | Purchase-proportional closing cost; fraction of purchase | Closing quote/budget; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION; scope separate from fixed component |
| 7 | `economics.sellingCommissionRate` | Sales commission; fraction of exit value | Negotiated quote/authorized assumption; H | INVESTOR_ASSUMPTION or ANALYST_ESTIMATE; not a universal market rate |
| 8 | `economics.sellerClosingFixed` | Fixed seller closing cost; USD | Closing quote/budget; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION |
| 9 | `economics.sellerClosingRate` | Proportional seller closing cost; fraction of exit | Closing quote/budget; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION; no overlap with commission |
| 10 | `economics.transferCost` | Transfer cost at exit; USD | Applicable documented fee and scenario; H | ANALYST_ESTIMATE; taxes/fees require applicable basis, not inferred jurisdiction rate |
| 11 | `economics.otherUpfront` | Other defined upfront costs; USD | Explicit itemized budget; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION, including justified zero |
| 12 | `economics.otherAtExit` | Other defined disposition costs; USD | Explicit itemized budget; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION, including justified zero |
| 13 | `economics.renovationDays` | Purchase-to-renovation duration; days | Scope/schedule; H | ANALYST_ESTIMATE; not property age |
| 14 | `economics.marketingDays` | Post-renovation marketing and closing duration; days | Local sale/closing evidence plus plan; R + H | ANALYST_ESTIMATE; listing days-on-market alone omits closing |
| 15 | `economics.holdingDaily.propertyTaxes` | Future holding-period tax expense; USD/day | Subject annual tax-year record plus reassessment/supplemental review; R/C + H | COUNTY_EVIDENCE or PROVIDER_EVIDENCE for source; derived daily budget ANALYST_ESTIMATE; arrears are not daily tax |
| 16 | `economics.holdingDaily.insurance` | Coverage while held/renovated; USD/day | Appropriate insurance quote; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION |
| 17 | `economics.holdingDaily.utilities` | Holding utilities; USD/day | Bills/turn-on and work plan; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION |
| 18 | `economics.holdingDaily.maintenance` | Recurring upkeep; USD/day | Scoped budget; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION; separate from rehab |
| 19 | `economics.holdingDaily.other` | Other recurring scope, e.g. supported HOA; USD/day | Verified obligations and budget; R + H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION; unknown obligations not zero |
| 20 | `economics.financing.mode` | CASH or ACQUISITION_INTEREST_ONLY; enum | Investor funding plan/lender terms; H | INVESTOR_ASSUMPTION; no unsupported financing mode |
| 21 | `economics.financing.ltv` | Acquisition principal / purchase; fraction | Proposed lender terms; H | INVESTOR_ASSUMPTION; existing owner's loan model not investor financing |
| 22 | `economics.financing.annualRate` | Simple acquisition debt interest; annual fraction | Dated quote; H | INVESTOR_ASSUMPTION; no historical mortgage-rate substitution |
| 23 | `economics.financing.points` | Origination charge / loan principal; fraction | Dated lender quote; H | INVESTOR_ASSUMPTION; document zero under CASH |
| 24 | `economics.financing.fees` | Additional lender fees; USD | Dated lender quote; H | INVESTOR_ASSUMPTION; no fee double-counting |
| 25 | `target.type` | Investor return measure; enum | Investor policy; H | INVESTOR_ASSUMPTION: CASH_ON_CASH, RETURN_ON_TOTAL_PROJECT_COST or PROFIT_MARGIN_ON_SALE |
| 26 | `target.rate` | Target return on chosen measure; fraction | Attributed investor hurdle; H | INVESTOR_ASSUMPTION, not guaranteed return |
| 27 | `uncertainty.variables.exitValue` | Exit uncertainty; distribution in USD | Sale/condition support plus explicit uncertainty elicitation; R + H | ANALYST_ESTIMATE; no automatic distribution from AVM range |
| 28 | `uncertainty.variables.rehabCost` | Rehab uncertainty; distribution in USD | Scoped contractor risk/estimates; H | ANALYST_ESTIMATE; no synthetic fixture substituted |
| 29 | `uncertainty.variables.renovationDays` | Work-duration uncertainty; distribution in days | Schedule-risk estimates; H | ANALYST_ESTIMATE; finite justified bounds |
| 30 | `uncertainty.variables.marketingDays` | Marketing/closing uncertainty; distribution in days | Market and closing evidence plus estimates; R + H | ANALYST_ESTIMATE; stale listing dates insufficient alone |
| 31 | `uncertainty.dependence` | Joint regimes, weights, four factors, rationale; structured object | Attributed market/scope scenarios; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION; explicit conditional-independence rationale |
| 32 | `condition` | Existing and target condition/scope; documented description | Licensed inspection/photos/scoped review; H | ANALYST_ESTIMATE tied to observations; unknown cannot become renovated |
| 33 | `comparableSales` | Relevant sale references, positive prices and dates; record list | Licensed Property Records sale evidence + transaction-quality review; R + H | PROVIDER_EVIDENCE with analyst suitability annotations; no fabricated or listing-only sales |
| 34 | `valuationDate` | Intended analysis valuation date; ISO date | Explicit analyst scenario/date; H | ANALYST_ESTIMATE or INVESTOR_ASSUMPTION; distinct from retrieval/publication dates |

Allowed classes remain `PROVIDER_EVIDENCE`, `COUNTY_EVIDENCE`, `ANALYST_ESTIMATE`, `INVESTOR_ASSUMPTION`, `SYNTHETIC_TEST`, `MISSING`. Synthetic evidence is allowed only in separately labeled QA, never a real financial slot. The existing MC contract calls that synthetic class `SYNTHETIC_TEST_FIXTURE`; no enum is changed here.

## Materiality and financial readiness

1. First establish a purchase scenario, as-is context, relevant closed-sale evidence, condition, target scope, defensible ARV and rehab budget. Large numbers of transaction/characteristic fields do not substitute for these.
2. Then obtain financing, holding duration/costs, acquisition/exit costs and investor hurdle.
3. Retain property description, historical tax/distress, transaction and neighborhood context without promoting it to valuation or current title evidence.

`FINANCIAL_INPUTS_INSUFFICIENT` means no usable required inputs; `FINANCIAL_INPUTS_PARTIAL` means some supported entries but outstanding required evidence; `FINANCIAL_INPUTS_SUFFICIENT` requires the unchanged contract's complete, coherent, licensed and subject-bound package. A provider's complete response is not proof of financial sufficiency. Even passing the numerical contract is not an appraisal, current identity verification or transaction authorization.

## Subject binding: discovery is not approval

Keep county candidate/ATN/APN9, Assessor reference, original source row/hash/date, canonical identity status and provider ID distinct. County strings are retained verbatim. Initial street/city plus jurisdiction-supported CA may be proposed for discovery without invented ZIP, using the previously documented vendor method; the result cannot authorize valuation by address agreement alone.

Before any downstream financial request, require a unique returned RentCast ID; complete consistent address; Kern/California jurisdiction; exact/format-only APN9 agreement **or** unchanged Rule C against the stored county APN, stored APN9 and unique original ATN; source history/cardinality checks; no exclusion or material contradiction; permission and source fingerprints. No calculated APN9, stripped zero, ATN equivalence or fuzzy link. RentCast `assessorID` remains a provider assertion, not an authoritative county key.

An AVM subject must carry the **same nonempty RentCast ID** and compatible complete address/type as the accepted records evidence. The current adapter's optional-ID comparison is not strong enough by itself; a later controlled runner must reject a missing ID. This is a requirement, not an adapter edit.

ATTOM uses the authoritative vendor AttomID, with exact ParcelNumberRaw where supplied; deprecated ParcelNumberFormatted is not a new key. The existing excluded fixture's unique ExaStr resolution and failed APN+FIPS history remain separate and unchanged. Neither is reusable identity evidence for this shortlist.

The preliminary contract currently authorizes **RC-P2 only**. Selecting three new candidates does not extend that contract. A later explicit, narrowly tested authorization is needed for their preliminary admission; V3 human approval/persistence remains separate. No manual county call is imposed as a blanket preliminary-stage prerequisite, but current parcel/activity uncertainty must remain disclosed.

## Comparable-sales and preliminary ARV method — proposed, not executed

Freeze the intended valuation date, subject attributes, current condition and explicit target renovation scope before evaluating value. Keep AVM, listing context and closed-sale evidence in distinct collections.

| Dimension | Proposed analyst-approved rule | Rejection / sensitivity requirement |
| --- | --- | --- |
| Location | Same relevant neighborhood/market and jurisdiction; distance is a screening aid | Exclude materially different markets/barriers; urban and rural radii require separate rationale |
| Recency | Sale date on/before valuation date, locally justified lookback | Reject missing/future/implausible dates; shorter-window sensitivity, no unsupported time adjustment |
| Type | Same genuine SFR use and ownership interest | Exclude land, manufactured, multifamily or mixed use from SFR set unless separately justified |
| Area, rooms, lot, age | Reliable living-area definition; similarities documented by field | Reject unknown essential attributes; bands and outlier effects reviewed, not universal tolerances |
| Transaction quality | Supported closed sale, price, date, interest and property identity | Exclude confirmed non-arm's-length, nominal, related-party, partial-interest and unresolved multi-parcel allocations; unknown quality stays unqualified |
| Distress | Separate sale mechanism and condition from subject's intended exit | No automatic market equivalence for foreclosure/auction transfers |
| Condition and renovation | Evidence of sale-time comp condition and target subject condition | If condition comparison or adjustment support is missing: `ARV_NOT_SUPPORTED` |
| Adjustments | Empirical matched evidence or expressly attributed supported analyst method | No arbitrary $/SF adjustments, AVM multiplier, sum-of-rehab uplift or forced point estimate |
| Sufficiency | Proposed minimum three independent qualified sales, subject to analyst approval | More records do not fix poor comparability; no borrowing another subject's retained comp set |

Any numeric radius/lookback/attribute bands in the acquisition plan are **draft search bounds**, not approved valuation standards. Review sensitivity offline by tightening age, location and attribute similarity and leaving one sale out; record excluded sales and reasons, range movement and any loss of sufficiency. Do not silently broaden provider searches when no suitable evidence appears.

Proposed sequence: subject attributes → bound valuation context → licensed sold candidates → unsuitable-sale exclusions → condition/renovation comparison → supported adjustments only → transparent preliminary range → analyst review → immutable source/date/rights lineage. An unadjusted median or price-per-SF statistic can be descriptive; it does not automatically become ARV. No real subject values were computed in this assessment.

## Deterministic shortlist

Private output: `data/runtime/real-financial-evidence-v1/private-candidate-shortlist.json` (gitignored).

| Reconciliation | Count |
| --- | ---: |
| Original High SFR source manifest | 81 |
| Historical fixture excluded | 1 |
| Existing IP pilot identities excluded | 3 |
| Existing non-IP pool specified in request | 77 |
| RC-P1/P2/P3 additionally excluded from that pool | 3 |
| Remaining nonpilot candidates | 74 |
| Rejected by exact county uniqueness / quality-review rule | 23 |
| Integrity-eligible technical candidates | 51 |
| Selected for technical preparation only | 3 |
| Complete licensed/provider-ready identities | 0 |
| Round 1 selections | 0 |

Rule `RFE_TECHNICAL_SHORTLIST_V1_SOURCE_ORDER_NO_ECONOMICS`: retain the original manifest order, apply IP/RC/historical exclusions, exact county/candidate/Assessor uniqueness, SFR/exact-match flags, no known conflict/archive/QA/durable link, no county manual-review flag, and literal county street/city. Take the first three passing rows without replacement. No economic metric or manual preference affects selection. Original priorities/scores/statuses/order remain unmodified.

All three lack literal state and ZIP in the existing situs. CA is jurisdiction-supported evidence only; ZIP is unknown. All lack RentCast/ATTOM identity, canonical resolution and durable Property in the **historical saved snapshot**, not a newly queried production assertion. Snapshot freshness/current parcel status remains unverified. Private records include source dates/hashes, original ordinals, opaque references, exact private county relationships, missing evidence and all downstream authorities false. No owner/contact fields are included.

## Minimum future evidence package and unchanged model mapping

Use a private, versioned file package, not a new database schema: source/county relationship; complete licensed address; RentCast ID; characteristics; history; subject AVM; separate listing and sold candidates; inclusion/exclusion reasons and quality; current/target condition and supported adjustments; scoped rehab/schedule; explicit acquisition, funding, holding and disposition assumptions; hurdle; rights/retention versions; dates; contradictions and missing fields; request reservations and receipts; every content hash and subject binding.

The 24 economic entries map directly to the certified cents ledger; target type/rate retain their current definitions. Four uncertainty objects may use the unchanged CONSTANT, TRIANGULAR or DISCRETE families only with justified units/support/weights. Shared-scenario mixture, four factors and conditional-independence rationale remain explicit. No invented historical calibration or correlation matrix. Valuation date, condition and comps are supporting gate evidence, not extra engine variables. Real sources need provenance and attribution; assumption dates are not provider dates.

The financing model is acquisition-only interest-only (or documented CASH); unsupported draws/amortization/rehab funding cannot be hidden in zero fields. Deterministic MC price ceiling and MAO V2 remain distinct certified paths. Real report trust is not expanded beyond the existing synthetic approval set. No model version, distribution, policy, report template or protected pin changed.

**STOP FOR STAN/CHATGPT REVIEW.** The exact next authorization and its preconditions are in the acquisition plan. No request, calculation, approval, database operation or MLS execution follows automatically.
