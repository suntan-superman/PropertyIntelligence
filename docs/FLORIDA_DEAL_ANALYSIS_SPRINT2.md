# Florida deal analysis — Foundation Sprint 2

## 1. Scope and limitations

Offline deterministic analysis of unchanged Sprint 1 inputs and cached RentCast evidence. No new provider calls, simulations, inferred tenure, UI or investment recommendation.

Result excludes material unknown costs and is not a fully burdened profit estimate.

## 2. Sponsor portfolio summary

Sponsor-defined modeled profit: $151,978; cash invested: $215,522; cash-on-cash: 70.5%. Inputs remain sponsor claims. Three-month rent and the separate 120-day timeline are preserved.

## 3. Fantasia evidence inventory

| Field | Status | Support level |
| --- | --- | --- |
| address | SUPPORTED | SPONSOR_AND_INDEPENDENT_ALIGNED |
| propertyType | SUPPORTED | INDEPENDENT_ONLY |
| bedrooms | SUPPORTED | INDEPENDENT_ONLY |
| bathrooms | SUPPORTED | INDEPENDENT_ONLY |
| squareFeet | SUPPORTED | INDEPENDENT_ONLY |
| yearBuilt | SUPPORTED | INDEPENDENT_ONLY |
| manufacturedIdentity | PARTIAL | INDEPENDENT_ONLY |
| acquisitionCost | PARTIAL | SPONSOR_ONLY |
| estimatedRepairs | PARTIAL | SPONSOR_ONLY |
| projectedResalePrice | CONFLICTING | SPONSOR_AND_INDEPENDENT_CONFLICT |
| avm | PARTIAL | INDEPENDENT_ONLY |
| avmRange | PARTIAL | INDEPENDENT_ONLY |
| comparables | PARTIAL | INDEPENDENT_ONLY |
| compClosedSaleStatus | PARTIAL | INDEPENDENT_ONLY |
| daysOnMarket | PARTIAL | INDEPENDENT_ONLY |
| spaceRentThreeMonths | PARTIAL | SPONSOR_ONLY |
| holdingDuration | PARTIAL | SPONSOR_ONLY |
| taxes | PARTIAL | INDEPENDENT_ONLY |
| salesCommission | PARTIAL | SPONSOR_ONLY |
| escrowClosingCosts | PARTIAL | SPONSOR_ONLY |
| liens | PARTIAL | SPONSOR_ONLY |
| landTenure | MISSING | NO_EVIDENCE |
| parkCommunity | MISSING | NO_EVIDENCE |
| ownershipResidencyTransferRestrictions | MISSING | NO_EVIDENCE |
| acquisitionPriceSupport | MISSING | NO_EVIDENCE |
| acquisitionClosingCosts | MISSING | NO_EVIDENCE |
| repairScope | MISSING | NO_EVIDENCE |
| contractorEstimate | MISSING | NO_EVIDENCE |
| repairContingency | MISSING | NO_EVIDENCE |
| conditionEvidence | MISSING | NO_EVIDENCE |
| compLandTenure | MISSING | NO_EVIDENCE |
| insurance | MISSING | NO_EVIDENCE |
| utilities | MISSING | NO_EVIDENCE |
| financing | MISSING | NO_EVIDENCE |
| additionalParkFees | MISSING | NO_EVIDENCE |
| extraHoldingCosts | MISSING | NO_EVIDENCE |
| transferApplicationFees | MISSING | NO_EVIDENCE |
| priceReductions | MISSING | NO_EVIDENCE |
| otherDispositionCosts | MISSING | NO_EVIDENCE |
| titleEncumbrances | MISSING | NO_EVIDENCE |
| proposedLienPriority | MISSING | NO_EVIDENCE |

Confirmed address: 8426 Fantasia Park Way, Riverview, FL 33578. Provider reports Manufactured, 3 bedrooms, 2 bathrooms, 1,242 square feet, built 2006. These independent attributes are not automatically VERIFIED.

## 4. Sponsor versus independent valuation

Sponsor $279,000 versus provider AVM $122,000 and range $40,000–$204,000: CONFLICTING. The projection is $157,000 above the AVM and $75,000 above its upper bound. The provider is not verified resale value; land tenure and comp comparability remain unresolved. All 15 comps are preserved. Listing status, DOM or removal is not proof of a closed sale.

## 5. Known versus unknown costs

- acquisition: KNOWN_SUPPLIED; $160,000.
- repairs: KNOWN_SUPPLIED; $10,000.
- spaceRent: KNOWN_SUPPLIED; $3,000.
- commission: KNOWN_SUPPLIED; $5,000.
- escrow: KNOWN_SUPPLIED; $2,000.
- acquisitionClosingCosts: UNKNOWN; unknown (null).
- taxes: UNKNOWN; unknown (null).
- insurance: UNKNOWN; unknown (null).
- utilities: UNKNOWN; unknown (null).
- financing: UNKNOWN; unknown (null).
- repairContingency: UNKNOWN; unknown (null).
- extraHoldingCosts: UNKNOWN; unknown (null).
- additionalParkCommunityFees: UNKNOWN; unknown (null).
- transferApplicationFees: UNKNOWN; unknown (null).
- priceReductions: UNKNOWN; unknown (null).
- otherDispositionCosts: UNKNOWN; unknown (null).

Historical tax evidence is not allocated to the hold without supported assumptions. Price-reduction scenarios change sale price explicitly; missing reductions/fees are not silently entered as zero.

## 6. Modeled break-even

MODELED_BREAK_EVEN_SALE_PRICE: **$180,000** using the five supplied costs only. Result excludes material unknown costs and is not a fully burdened profit estimate.

| Sale assumption | Sale | Maximum repairs | Maximum acquisition | Holding capacity days |
| --- | ---: | ---: | ---: | ---: |
| SPONSOR_SALE | $279,000 | $109,000 | $259,000 | 3060 |
| AVM_POINT | $122,000 | $-48,000 | $102,000 | -1650 |
| AVM_HIGH | $204,000 | $34,000 | $184,000 | 810 |
| AVM_LOW | $40,000 | $-130,000 | $20,000 | -4110 |

Negative capacities remain visible and are not feasible nonnegative budgets/durations. The holding threshold is mathematical capacity with fixed sale/other costs and space rent alone, not a recommended or expected holding period.

## 7. Deterministic scenarios

| Scenario | Gross sale | Modeled profit/loss | Cash invested | Cash-on-cash | Change from sponsor |
| --- | ---: | ---: | ---: | ---: | ---: |
| SPONSOR_CASE | $279,000 | $99,000 | $173,000 | 57.2% | $0 |
| INDEPENDENT_AVM_POINT | $122,000 | $-58,000 | $173,000 | -33.5% | $-157,000 |
| INDEPENDENT_AVM_LOW | $40,000 | $-140,000 | $173,000 | -80.9% | $-239,000 |
| INDEPENDENT_AVM_HIGH | $204,000 | $24,000 | $173,000 | 13.9% | $-75,000 |
| SALE_MINUS_5 | $265,050 | $85,050 | $173,000 | 49.2% | $-13,950 |
| SALE_MINUS_10 | $251,100 | $71,100 | $173,000 | 41.1% | $-27,900 |
| SALE_MINUS_15 | $237,150 | $57,150 | $173,000 | 33.0% | $-41,850 |
| SALE_MINUS_20 | $223,200 | $43,200 | $173,000 | 25.0% | $-55,800 |
| REPAIR_PLUS_20 | $279,000 | $97,000 | $175,000 | 55.4% | $-2,000 |
| REPAIR_PLUS_50 | $279,000 | $94,000 | $178,000 | 52.8% | $-5,000 |
| REPAIR_PLUS_100 | $279,000 | $89,000 | $183,000 | 48.6% | $-10,000 |
| AVM_HIGH_REPAIR_PLUS_0 | $204,000 | $24,000 | $173,000 | 13.9% | $-75,000 |
| AVM_HIGH_REPAIR_PLUS_20 | $204,000 | $22,000 | $175,000 | 12.6% | $-77,000 |
| AVM_HIGH_REPAIR_PLUS_50 | $204,000 | $19,000 | $178,000 | 10.7% | $-80,000 |
| COMBINED_10_20 | $251,100 | $69,100 | $175,000 | 39.5% | $-29,900 |
| COMBINED_15_50 | $237,150 | $52,150 | $178,000 | 29.3% | $-46,850 |
| COMBINED_20_100 | $223,200 | $33,200 | $183,000 | 18.1% | $-65,800 |
| HOLD_120 | $279,000 | $98,000 | $174,000 | 56.3% | $-1,000 |
| HOLD_150 | $279,000 | $97,000 | $175,000 | 55.4% | $-2,000 |
| HOLD_180 | $279,000 | $96,000 | $176,000 | 54.5% | $-3,000 |
| HOLD_240 | $279,000 | $94,000 | $178,000 | 52.8% | $-5,000 |

All results are INCOMPLETE. Rent derives as $3,000 / 3 = $1,000/month (DERIVED_FROM_SPONSOR_AGGREGATE). Using explicit 30-day model months, 120 days requires $4,000 rent; the original sponsor case retains $3,000. Only rent extends; no taxes/insurance/utilities/financing are invented. Percentage-point deltas use unrounded sponsor ratios.

## 8. Deterministic sensitivity

| Rank | Perturbation | Modeled profit change |
| ---: | --- | ---: |
| 1 | Sale -10% | $-27,900 |
| 2 | Repairs +20% | $-2,000 |
| 3 | Commission +20% | $-1,000 |
| 3 | Holding +30 days | $-1,000 |
| 5 | Escrow +20% | $-400 |

This is a Deterministic Sensitivity Ranking of specified unequal perturbations, not probability or variance contribution. Commission +20% and holding +30 days tie at $1,000 impact. Holding starts from the sponsor rent coverage of 90 modeled days. The CSV matrix contains all five sale assumptions × four repair budgets, including losses.

## 9. Bass STOP

MANUFACTURED_REPRESENTATION_STOP is preserved. Its provider record lacks manufactured-home type and structural/parcel evidence. No independent valuation is fabricated. Sponsor-only arithmetic remains available.

## 10. Joyce ambiguity

ADDRESS_AMBIGUOUS is preserved. No city, state, ZIP or independent value is inferred. Sponsor-only arithmetic is separate from identity resolution.

## 11. Portfolio limitations

Independent Portfolio Case: INCOMPLETE. No independently underwritten portfolio profit/return is produced.

| Partial portfolio stress | Modeled profit | Cash-on-cash |
| --- | ---: | ---: |
| PARTIAL_PORTFOLIO_STRESS_INDEPENDENT_AVM_POINT | $-5,022 | -2.3% |
| PARTIAL_PORTFOLIO_STRESS_INDEPENDENT_AVM_LOW | $-87,022 | -40.4% |
| PARTIAL_PORTFOLIO_STRESS_INDEPENDENT_AVM_HIGH | $76,978 | 35.7% |

PARTIAL_PORTFOLIO_STRESS changes only Fantasia. Bass/Joyce stay on sponsor assumptions and all unknown costs remain excluded.

## 12. Questions and evidence required

- fantasia: Supply the evidence/comps supporting $279,000; identify closed sales versus listings and home/land tenure.
- fantasia: Does Fantasia include owned land, a leasehold, or home-only/chattel rights? Supply supporting documents.
- fantasia: Identify the park/community and provide governing documents.
- fantasia: Confirm monthly space rent, billing terms, rent increases and all additional fees.
- fantasia: Provide investor/resale, buyer approval, age, occupancy and transfer restrictions.
- fantasia: Supply itemized repair scope, contractor estimates and contingency support.
- fantasia: Supply current photos and inspection/condition evidence.
- fantasia: Supply taxes applicable during holding and at transfer, including allocation rules.
- fantasia: Supply insurance quote, coverage period and premiums.
- fantasia: Supply utilities, maintenance and other recurring holding costs.
- fantasia: Supply acquisition closing costs and purchase agreement support.
- fantasia: Supply financing terms, fees, interest and payment timing.
- fantasia: Supply title/encumbrance information, proposed lien instruments and priority.
- fantasia: Explain the 120-day schedule and milestones for renovation, listing and closing; reconcile three months of rent.
- fantasia: Support commission/escrow and supply transfer/application fees and other disposition costs.
- bass: Supply manufactured-home type, unit/lot, parcel/home identifiers and structural details for 95 Bass Circle; provider record is insufficient.
- joyce: Confirm complete street/city/state/ZIP and any unit/lot for 131 Joyce Place.

These are draft information requests, not sent messages. Collateral remains sponsor-only/out of scope.

## 13. Inputs needed before Monte Carlo

- resalePrice: distributionReady=false; missing Reconcile sponsor and provider valuation evidence; Establish land tenure and comp comparability; Support sale-price variability.
- repairCost: distributionReady=false; missing Itemized scope; Contractor estimates; Condition evidence; Observed uncertainty.
- renovationDuration: distributionReady=false; missing Renovation schedule and milestones; Duration evidence.
- saleDuration: distributionReady=false; missing Subject sale-duration evidence; Separate listing and closing time.
- spaceRent: distributionReady=false; missing Lease/park rent terms; Increases and additional fees.
- taxes: distributionReady=false; missing Applicable holding tax basis and allocation.
- insurance: distributionReady=false; missing Premium quote and coverage period.
- utilities: distributionReady=false; missing Monthly bills or supported estimates.
- financing: distributionReady=false; missing Loan amount, fees, rate and payment timing.
- sellingCosts: distributionReady=false; missing Contracts and transfer/disposition charges.
- unexpectedRepairs: distributionReady=false; missing Inspection evidence; Contingency support and relevant cost history.

Readiness schema only. No distributions, probability assignments or simulation have been created.

## 14. Recommended next engineering step

Stan/ChatGPT should review these outputs and the draft sponsor questions. Obtain evidence resolving Fantasia tenure/comparability, documented costs and schedule, Bass identity/representation, and Joyce full address. A later explicitly authorized engineering step can ingest that evidence and rerun this deterministic model. Do not start UI, Monte Carlo, investor packages or Sprint 3 now.
