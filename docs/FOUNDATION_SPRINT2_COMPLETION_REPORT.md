# Foundation Sprint 2 completion report

**Implementation complete; evidence gaps and prior identity STOP states preserved.**

## Validation and offline execution

- Tests: 38/38 passed; 0 failed. Full Sprint 1 + Sprint 2 suite run using npm test.
- Preservation and unknown-cost tests were written first; their initial missing-module failure was observed before implementation.
- No network/API calls occurred in Sprint 2. No provider configuration or .env was read. Analysis and tests run with a fetch/HTTP/TCP/TLS guard.
- Sponsor inputs and existing cached/normalized evidence: PASS; 16 SHA-256 hashes unchanged.
- Offline reproducibility: 15 artifacts byte-identical after rerunning all analysis commands in fresh processes. Network attempts: 0.
- Existing Sprint 1 source adapters, raw response snapshots, sponsor seed, claims and independent evidence remain unchanged.

## Fantasia break-even and scenario summary

MODELED_BREAK_EVEN_SALE_PRICE = $180,000. Result excludes material unknown costs and is not a fully burdened profit estimate.

| Sale assumption | Max repair budget | Max acquisition price | Holding capacity days |
| --- | ---: | ---: | ---: |
| SPONSOR_SALE | 109000 | 259000 | 3060 |
| AVM_POINT | -48000 | 102000 | -1650 |
| AVM_HIGH | 34000 | 184000 | 810 |
| AVM_LOW | -130000 | 20000 | -4110 |

Negative capacity is preserved. Holding capacity is a fixed-price arithmetic threshold using space rent alone, not an expected timeline. Monthly rent $1,000 is DERIVED_FROM_SPONSOR_AGGREGATE ($3,000 / 3), using explicit 30-day model months. Base sponsor rent remains $3,000 despite the separate 120-day timeline. A 120-day scenario uses $4,000 and produces $98,000 modeled profit.

21 required scenarios generated with all losses visible. Selected results:

| Scenario | Modeled profit/loss |
| --- | ---: |
| SPONSOR_CASE | $99,000 |
| INDEPENDENT_AVM_POINT | $-58,000 |
| INDEPENDENT_AVM_LOW | $-140,000 |
| INDEPENDENT_AVM_HIGH | $24,000 |
| COMBINED_10_20 | $69,100 |
| COMBINED_15_50 | $52,150 |
| COMBINED_20_100 | $33,200 |

## Deterministic Sensitivity Ranking

- Rank 1: Sale -10%; modeled-profit change $-27,900.
- Rank 2: Repairs +20%; modeled-profit change $-2,000.
- Rank 3: Commission +20%; modeled-profit change $-1,000.
- Rank 3: Holding +30 days; modeled-profit change $-1,000.
- Rank 5: Escrow +20%; modeled-profit change $-400.

These standardized perturbations are deterministic comparisons, not probabilities or Monte Carlo variance contributions. Equal dollar impacts share ranks. Sale/repair/hold grids and the 5×4 matrix are included.

## Evidence completeness and unknown costs

Field assessments across all three properties: SUPPORTED=6, PARTIAL=28, CONFLICTING=1, MISSING=54, IDENTITY_UNRESOLVED=34. No numeric evidence score.

Fantasia sponsor $279,000 conflicts with provider $40,000–$204,000 range. The AVM is not verified resale truth. All 15 comps are preserved; land tenure, park/community, restrictions, repair/condition support, title/lien priority and true comp comparability remain unresolved.

Unknown modeled costs (null, never zero): acquisitionClosingCosts, taxes, insurance, utilities, financing, repairContingency, extraHoldingCosts, additionalParkCommunityFees, transferApplicationFees, priceReductions, otherDispositionCosts. All current costCompleteness values are INCOMPLETE.

## Portfolio and STOP preservation

- Bass: MANUFACTURED_REPRESENTATION_STOP.
- Joyce: ADDRESS_AMBIGUOUS.
- Sponsor Portfolio Case: $151,978 modeled profit, $215,522 cash invested, 70.5% rounded cash-on-cash.
- Independent Portfolio Case: INCOMPLETE; profit/return null.
- PARTIAL_PORTFOLIO_STRESS is explicitly mixed evidence: Fantasia changes, Bass/Joyce remain sponsor assumptions. AVM-point stress yields a $5,022 modeled portfolio loss, excluding unknown costs.
- Collateral remains sponsor-only/out of scope. Sponsor questions were drafted but not sent.

## Monte Carlo readiness

- resalePrice: distributionReady=false; Reconcile sponsor and provider valuation evidence; Establish land tenure and comp comparability; Support sale-price variability.
- repairCost: distributionReady=false; Itemized scope; Contractor estimates; Condition evidence; Observed uncertainty.
- renovationDuration: distributionReady=false; Renovation schedule and milestones; Duration evidence.
- saleDuration: distributionReady=false; Subject sale-duration evidence; Separate listing and closing time.
- spaceRent: distributionReady=false; Lease/park rent terms; Increases and additional fees.
- taxes: distributionReady=false; Applicable holding tax basis and allocation.
- insurance: distributionReady=false; Premium quote and coverage period.
- utilities: distributionReady=false; Monthly bills or supported estimates.
- financing: distributionReady=false; Loan amount, fees, rate and payment timing.
- sellingCosts: distributionReady=false; Contracts and transfer/disposition charges.
- unexpectedRepairs: distributionReady=false; Inspection evidence; Contingency support and relevant cost history.

No distribution, probability assignment or simulation was implemented. No UI or investor-package work was started.

## Exact recommended next step

Stan and ChatGPT should review docs/FLORIDA_DEAL_ANALYSIS_SPRINT2.md and data/analysis/evidence/sponsor-information-request.json. Obtain the requested valuation/tenure, cost, schedule and identity evidence; then explicitly authorize any follow-on engineering. Do not start Sprint 3, UI, Monte Carlo or investor-package generation from these incomplete inputs.

Reproduction commands (offline):

```powershell
npm run analysis:evidence
npm run analysis:break-even
npm run analysis:scenarios
npm run analysis:sensitivity
npm run sprint2:summarize -- --analysis-only
npm test
npm run sprint2:reproduce
npm run sprint2:summarize
```

## Files created/changed

- data/analysis/break-even/fantasia-break-even.csv
- data/analysis/break-even/fantasia-break-even.json
- data/analysis/evidence/florida-evidence-completeness.csv
- data/analysis/evidence/florida-evidence-completeness.json
- data/analysis/evidence/monte-carlo-readiness.json
- data/analysis/evidence/sponsor-information-request.json
- data/analysis/scenarios/fantasia-scenarios.csv
- data/analysis/scenarios/fantasia-scenarios.json
- data/analysis/sensitivity/fantasia-deterministic-ranking.json
- data/analysis/sensitivity/fantasia-hold-sensitivity.csv
- data/analysis/sensitivity/fantasia-repair-sensitivity.csv
- data/analysis/sensitivity/fantasia-sale-repair-matrix.csv
- data/analysis/sensitivity/fantasia-sale-sensitivity.csv
- data/analysis/sprint2-input-manifest.json
- data/validation/foundation-sprint2-reproducibility.json
- data/validation/foundation-sprint2-tests.json
- docs/FLORIDA_DEAL_ANALYSIS_SPRINT2.md
- docs/FOUNDATION_SPRINT2_COMPLETION_REPORT.md
- docs/SPRINT2_ANALYTICAL_MODEL.md
- docs/SPRINT2_SCENARIO_CATALOG.md
- package.json
- scripts/analyze-break-even.js
- scripts/analyze-evidence-completeness.js
- scripts/analyze-scenarios.js
- scripts/analyze-sensitivity.js
- scripts/reproduce-foundation-sprint2.js
- scripts/summarize-foundation-sprint2.js
- scripts/test-foundation.js
- src/analysis/artifacts.js
- src/analysis/breakEven.js
- src/analysis/evidenceCompleteness.js
- src/analysis/inputs.js
- src/analysis/offline.js
- src/analysis/reports.js
- src/analysis/scenarioCatalog.js
- src/analysis/scenarios.js
- src/analysis/sensitivity.js
- src/underwriting/costModel.js
- src/underwriting/metrics.js
- tests/sprint2.test.js
