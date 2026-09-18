# Property Intelligence — Foundation Sprint 2
## Evidence Completeness, Scenario, Break-Even & Sensitivity Engine

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`  
**Language:** JavaScript / Node.js only  
**Primary fixture:** 8426 Fantasia Park Way, Riverview, FL 33578  
**Network:** Offline by default. Use existing Sprint 1 evidence/cache; make no new provider calls.

## Mission
Build a reusable deterministic analytical layer answering: what does the sponsor claim, what independent evidence exists, what is missing/conflicting, what are the modeled break-even thresholds, and how do outcomes change when assumptions change?

Do not build Monte Carlo or UI.

## Preserve Sprint 1
Never alter sponsor claims or cached evidence.

Fantasia sponsor inputs:
- acquisition $160,000
- repairs $10,000
- 3-month space rent $3,000
- projected sale/list $279,000
- commission $5,000
- escrow/closing $2,000
- projected profit $99,000
- sponsor-defined cash invested $173,000
- cash-on-cash 57.2%
- portfolio timeline assumption 120 days

Independent Fantasia evidence:
- confirmed address above
- Manufactured
- 3 bed / 2 bath / 1,242 sq ft / built 2006
- RentCast AVM $122,000
- range $40,000–$204,000
- 15 retained comps
- sponsor projection above independent range
- land tenure, park identity and true comp comparability unresolved

Preserve Bass as `MANUFACTURED_REPRESENTATION_STOP`.
Preserve Joyce as `ADDRESS_AMBIGUOUS`.

## Hard boundaries
Allowed: existing data ingestion, evidence assessment, deterministic break-even/scenarios/sensitivity, explicit unknown-cost handling, reports, machine-readable outputs, tests.

Forbidden: new RentCast calls, changing sponsor claims, treating AVM as verified truth, Monte Carlo/probability distributions, AI narrative, React/UI, investor solicitation/package, Kern/title/MLS/Daily Report/skip tracing, inferred land tenure, invented taxes/insurance/utilities/financing/fees, or investment recommendations.

## Architecture additions
Adapt to existing conventions:
```text
src/analysis/evidenceCompleteness.js
src/analysis/breakEven.js
src/analysis/scenarios.js
src/analysis/sensitivity.js
src/analysis/scenarioCatalog.js
src/underwriting/costModel.js
src/underwriting/metrics.js

scripts/analyze-evidence-completeness.js
scripts/analyze-scenarios.js
scripts/analyze-break-even.js
scripts/analyze-sensitivity.js
scripts/summarize-foundation-sprint2.js

data/analysis/evidence/
data/analysis/scenarios/
data/analysis/break-even/
data/analysis/sensitivity/

docs/SPRINT2_ANALYTICAL_MODEL.md
docs/SPRINT2_SCENARIO_CATALOG.md
docs/FLORIDA_DEAL_ANALYSIS_SPRINT2.md
docs/FOUNDATION_SPRINT2_COMPLETION_REPORT.md
```

## Evidence completeness model
Each material field supports:
`field, category, sponsorValue, independentValue, status, supportLevel, sources[], notes, materiality`.

Statuses:
`SUPPORTED`, `PARTIAL`, `MISSING`, `CONFLICTING`, `NOT_APPLICABLE`, `IDENTITY_UNRESOLVED`.

Support levels:
`SPONSOR_ONLY`, `INDEPENDENT_ONLY`, `SPONSOR_AND_INDEPENDENT_ALIGNED`, `SPONSOR_AND_INDEPENDENT_CONFLICT`, `NO_EVIDENCE`.

Do not create a numeric evidence score yet.

Assess Fantasia: address, type, beds/baths/sqft/year, manufactured identity, land tenure, park/community, ownership/residency/transfer restrictions; acquisition price/support/closing; repair budget/scope/contractor estimate/contingency/condition evidence; sponsor resale price, AVM/range/comps, comp tenure and closed-sale status, DOM; space rent/hold/taxes/insurance/utilities/financing/park fees; commission/closing/transfer fees/price reduction; title/liens/proposed lien priority.

Collateral claims remain sponsor-only/out of scope.

## Conflict rules
Do not call every difference a conflict. For valuation:
- no independent range => no range-conflict determination
- sponsor > independent high => `CONFLICTING`
- sponsor < independent low => `CONFLICTING`
- sponsor inside range => `PARTIAL` or `SUPPORTED` depending on evidence quality

Fantasia's $279K must currently conflict with the $40K–$204K independent range, while clearly stating the provider is not verified resale value and manufactured-home comparability remains unresolved.

## Known vs unknown costs
Represent costs as `KNOWN_SUPPLIED`, `KNOWN_INDEPENDENT`, `UNKNOWN`, or `NOT_APPLICABLE`.

Known sponsor-modeled Fantasia costs: purchase $160K, repairs $10K, space rent $3K, commission $5K, escrow/closing $2K.

Unknown: acquisition closing costs if separate, taxes, insurance, utilities, financing, repair contingency, extra holding costs, additional park/community fees, transfer/application fees, price reductions, other disposition costs.

Never convert unknown to zero. Any incomplete result carries `costCompleteness=INCOMPLETE` and warning: `Result excludes material unknown costs and is not a fully burdened profit estimate.` Use `modeledProfit`, not `netProfit`.

## Break-even engine
Calculate `MODELED_BREAK_EVEN_SALE_PRICE` where modeled profit=0 using explicitly included costs.

Also calculate:
- maximum repair budget at sponsor sale, AVM point, AVM high, AVM low
- maximum acquisition price at those four sale assumptions
- holding-duration break-even only if recurring monthly holding cost can be safely derived from explicit sponsor data

If monthly space rent is derived from the explicit 3-month aggregate, label `DERIVED_FROM_SPONSOR_AGGREGATE` and document it. Do not invent other monthly costs. Negative repair/acquisition capacity must remain visible.

## Scenario engine
Every scenario records ID, label, description, base case, overrides, excluded unknown costs, outputs, warnings, provenance.

Required Fantasia valuation scenarios:
- `SPONSOR_CASE`: $279K
- `INDEPENDENT_AVM_POINT`: $122K
- `INDEPENDENT_AVM_LOW`: $40K
- `INDEPENDENT_AVM_HIGH`: $204K
- sponsor sale -5%, -10%, -15%, -20%

Repair scenarios against sponsor sale: +20%, +50%, +100%.
Against independent high: base, +20%, +50%.

Combined downside:
- sale -10%, repairs +20%
- sale -15%, repairs +50%
- sale -20%, repairs +100%

Holding scenarios: 120, 150, 180, 240 days, but extend only costs safely derivable as recurring. Explicitly list excluded taxes/insurance/utilities/etc. Assign no probabilities.

For every scenario calculate gross sale, modeled proceeds, modeled project cost, modeled profit/loss, scenario cash invested, cash-on-cash, profit margin, dollar and percentage-point change vs sponsor, cost completeness, sale-assumption evidence status, warnings.

## Sensitivity engine
Sale-price sensitivity relative to sponsor: -30%, -25%, -20%, -15%, -10%, -5%, 0%, +5%.

Repair sensitivity: -20%, 0%, +20%, +50%, +100%, +150%.

Holding sensitivity, if supported: 90, 120, 150, 180, 240 days.

Two-variable sale × repair matrix:
Rows: sponsor sale, -10%, -20%, AVM high, AVM point.
Columns: base repairs, +20%, +50%, +100%.
Cell = modeled profit/loss.

## Deterministic sensitivity ranking
Quantify arithmetic impact of standardized perturbations: sale -10%, repairs +20%, commission +20%, escrow +20%, holding +30 days where supported.

Rank only as `Deterministic Sensitivity Ranking`; never imply probability or Monte Carlo variance contribution.

## Bass/Joyce
Include them in evidence/portfolio outputs but preserve STOP states. Sponsor-only deterministic arithmetic may remain. Do not fabricate independent values. Unresolved properties must never disappear.

## Portfolio behavior
Sponsor Portfolio Case remains available. Independent Portfolio Case must be `INCOMPLETE` because Bass lacks independent valuation and Joyce identity is unresolved.

You may show `PARTIAL_PORTFOLIO_STRESS` where Fantasia changes while Bass/Joyce remain sponsor assumptions, clearly labeled as such. Never call it independently underwritten portfolio return.

## Required outputs
```text
data/analysis/evidence/florida-evidence-completeness.json
data/analysis/evidence/florida-evidence-completeness.csv
data/analysis/evidence/sponsor-information-request.json
data/analysis/evidence/monte-carlo-readiness.json

data/analysis/break-even/fantasia-break-even.json
data/analysis/break-even/fantasia-break-even.csv

data/analysis/scenarios/fantasia-scenarios.json
data/analysis/scenarios/fantasia-scenarios.csv

data/analysis/sensitivity/fantasia-sale-sensitivity.csv
data/analysis/sensitivity/fantasia-repair-sensitivity.csv
data/analysis/sensitivity/fantasia-hold-sensitivity.csv
data/analysis/sensitivity/fantasia-sale-repair-matrix.csv
data/analysis/sensitivity/fantasia-deterministic-ranking.json
```

Unsupported outputs must still be valid artifacts explaining `UNAVAILABLE` and why.

## Analyst report
Generate `docs/FLORIDA_DEAL_ANALYSIS_SPRINT2.md`:
1. scope/limitations
2. sponsor portfolio summary
3. Fantasia evidence inventory
4. sponsor vs independent valuation
5. known vs unknown costs
6. break-even
7. scenarios
8. deterministic sensitivity
9. Bass STOP
10. Joyce ambiguity
11. portfolio limitations
12. questions/evidence required
13. inputs needed before Monte Carlo
14. recommended next engineering step

No investment recommendation.

## Sponsor information request
Generate structured missing-evidence questions. Fantasia must include:
- evidence/comps supporting $279K and whether comps are closed sales or listings
- land ownership/tenure
- park/community identity
- monthly space rent and additional fees
- investor/resale/buyer approval/age/occupancy/transfer restrictions
- repair scope and contractor estimates
- photos/inspection
- taxes
- insurance
- utilities/holding costs
- acquisition closing costs
- title/encumbrances
- basis and milestones for 120-day schedule

Preserve unresolved Bass/Joyce questions. Do not send anything automatically.

## Monte Carlo readiness — schema only
Do not simulate. For candidate variables record:
`variable, distributionReady, evidenceAvailable, unresolvedConflict, missingInputs, notes`.

At minimum: resale price, repair cost, renovation duration, DOM/sale duration, space rent, taxes, insurance, utilities, financing, selling costs, unexpected repairs.

Fantasia resale price should currently be `distributionReady=false` because sponsor and provider evidence conflict and tenure/comparability are unresolved.

## Tests
Offline only. No API quota.

Test:
- sponsor inputs remain unchanged
- AVM evidence remains independent/unverified
- unknown costs never become zero
- sponsor math still reconciles
- break-even formulas
- AVM point/high/low scenarios
- sale/repair/combined scenarios
- hold derivation and warnings
- two-variable matrix
- evidence conflict rules
- Bass/Joyce STOP preservation
- independent portfolio marked incomplete
- deterministic reproducibility
- no NaN/Infinity
- no investment recommendation fields

## npm commands
Add similar commands:
```text
npm run analysis:evidence
npm run analysis:break-even
npm run analysis:scenarios
npm run analysis:sensitivity
npm run sprint2:summarize
npm test
```

## Execution order
1. Inspect Sprint 1 artifacts/current architecture.
2. Add tests first for preservation and unknown-cost behavior.
3. Implement evidence completeness.
4. Implement/refactor cost model.
5. Implement break-even.
6. Implement scenarios.
7. Implement sensitivity.
8. Generate sponsor-information request.
9. Generate Monte Carlo readiness record only.
10. Generate machine-readable artifacts.
11. Generate analyst report.
12. Run all tests.
13. Run cache/offline reproducibility check.
14. Generate `docs/FOUNDATION_SPRINT2_COMPLETION_REPORT.md`.
15. **STOP.**

No API calls, UI, Monte Carlo, investor package, or Sprint 3 work.

## Completion report
Must state:
- files created/changed
- tests and results
- confirmation that no network/API calls occurred
- sponsor-input preservation result
- Fantasia break-even values
- scenario summary
- deterministic sensitivity ranking
- evidence completeness summary
- material unknown costs
- Bass/Joyce preserved statuses
- independent portfolio completeness status
- Monte Carlo readiness blockers
- exact recommended next step

## Engineering principles
- Evidence integrity over attractive output.
- Unknown is not zero.
- Sponsor claim is not fact.
- Independent estimate is not verified fact.
- Conflict must remain visible.
- Do not hide downside scenarios.
- No probability without a defensible distribution.
- Never silently resolve identity or tenure.
- Every derived number must be reproducible and traceable.

**Stop after Sprint 2 completion report for Stan/ChatGPT review.**
