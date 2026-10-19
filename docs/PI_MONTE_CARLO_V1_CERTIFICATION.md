# PI Monte Carlo V1 — Certification

Date: 2026-10-09. Scope: local development, offline synthetic analysis only.

**MONTE CARLO V1 CERTIFIED**

This certifies computational correctness under the documented bounded fix-and-flip assumptions. It does **not** certify predictive calibration, any real property's investment merits, production execution, or Round 1 readiness. Round 1 remains PRE_EXECUTION — NOT AUTHORIZED.

## Initial implementation audit

Existing simulation engine: **MISSING**. Existing deterministic analysis was implemented, but the Monte Carlo readiness schema and investor-report fields were not an executable probability model.

| Source / functions | Initial functionality and limits | Treatment / coverage |
| --- | --- | --- |
| `src/underwriting/deterministic.js`: `calculateDeal`, `calculatePortfolio` | Implemented sponsor-supplied sale minus purchase, repairs, space rent and selling costs; expressly `SPONSOR_DEFINED_NOT_FULLY_BURDENED`. Portfolio totals are aggregates, not another investment strategy. No financing or IRR model | Unchanged; independent artificial arithmetic test preserves sponsor semantics |
| `src/underwriting/costModel.js`: `costModel`; `metrics.js`: `evaluate` | Implemented supplied costs, cash denominator and incomplete-cost warnings. Partially supported holding/space-rent assumptions, not complete acquisition/financing economics | Unchanged; synthetic arithmetic regression; unknown costs remain unknown |
| `src/underwriting/dealCostModel.js`: `dealCostModel`; `dealMetrics.js`: `dealEvaluate` | Implemented explicit deal costs, provenance and incomplete-cost metrics; no distributions | Unchanged; synthetic arithmetic and existing investment/report tests |
| `src/underwriting/mao.js`: `evaluateMao`, `solveMao`, `calculateAcquisitionDecision` | Implemented FIX_AND_FLIP MAO, three return hurdles, cost bases, 1/1.2/1.5 rehab stresses and lender terms. Initial version `sprint5-mao-v1`. Audit found debt-principal accounting and percentage precision defects | Corrected locally and versioned `sprint5-mao-v2`; focused arithmetic/bounds tests, existing acquisition tests and unchanged 10-check MAO QA |
| `src/analysis/breakEven.js`, `dealBreakEven.js` | Implemented deterministic break-even scenarios against supplied models; not probabilistic thresholds | Unchanged; not substituted for the new strict cents-ledger ceiling |
| `src/analysis/scenarios.js`: `buildScenarios`; `scenarioCatalog.js`: `scenarioCatalog` | Implemented deterministic alternatives/perturbations, not likelihoods | Unchanged; no conversion of cases into empirical frequencies |
| `src/analysis/sensitivity.js`: `sensitivity`; `dealSensitivity.js`: `dealSensitivity` | Implemented deterministic stresses, not stochastic attribution or calibrated causal effects | Unchanged; new paired stress method separately versioned/documented |
| `src/sources/rentcast/valuation.js`: `normalizeValuation` | Provider valuation normalization, not an independently estimated ARV or probability distribution. Existing sponsor projected resale and MAO exit inputs are point assumptions | Adapter unchanged and not invoked. No live valuations used |
| `src/analysis/evidenceCompleteness.js`: `monteCarloReadiness` | Placeholder/readiness inventory: `NOT_READY`, every `distributionReady:false`, explicitly no simulation assigned | Unchanged; property-specific readiness is not promoted by this synthetic certificate |
| `src/opportunities/screening.js`: `scoreSignals`, `screenCandidate` | Implemented `kern-screen-v1` screening/ranking heuristic; not investment profitability or modeled probability | Unchanged; no candidate scores calculated or altered |
| `src/reports/investor-v1/model.js`: `normalizeInvestorReport` | Implemented `investor-report-model-v1` normalization of supplied Monte Carlo fields; does not generate their values | Unchanged; existing synthetic report tests pass. Future mapping documented, no adapter/renderer work |
| IRR, rental income strategies, construction draw/amortization schedules, calibrated probability model | Missing from the audited investment implementation | Not invented or implied by V1 certification |

The new engine supports the **existing FIX_AND_FLIP strategy only**, with a strict, complete-under-scope cents ledger. Existing permissive/incomplete sponsor/deal models retain their separate meaning; they are not all reclassified as fully burdened or empirically verified.

## Necessary corrections to existing MAO

Only one pre-existing source file changed: `src/underwriting/mao.js`.

1. Borrowed acquisition principal was included as project cost, duplicating purchase cost, while cash invested did not deduct loan proceeds. V2 includes interest/points/fees once as expenses and deducts principal from required equity. It does not treat borrowing as income or profit.
2. Percentage cost bases were rounded as currency. A fractional rate of 0.015 became 0.02. V2 retains fractional rate precision; monetary outputs retain currency rounding.
3. Associated safeguards reject contradictory fixed-loan/LTV bases, negative fees/debt, excess leverage and a fixed loan above purchase. Infeasible fixed-debt MAO is unavailable, not a fabricated zero-price result. The solver reevaluates its returned price so economics match that price; undefined return denominators remain null.

Independent regression example: artificial purchase $100,000, exit $160,000, loan $70,000, one year at 10%, 2% points and $500 fees gives total project cost $108,900, profit $51,100 and cash invested $38,900. Fixed-principal and LTV forms agree.

MAO source SHA-256 before this task:
`91cc141c5eef94a4310339800ec6bd8f523b17e0d46f92c24a11f4f510e7ec2e`

After authorized correction:
`ce80b905f08a74105b6ebd04358c5958d95f1b8ec4ec5337fc581ee31bddcee1`

The version change must remain visible in any future deployment/snapshot integration. No historical result was recalculated, no persisted decision changed, and no historical protected hash was rewritten. The new stochastic result does not silently replace the application's existing MAO contract.

## Certified implementation

Five new renderer-independent JavaScript modules under `src/analysis/monteCarlo/` implement strict provenance-aware inputs, complete scenario economics, explicit distributions/dependence, seeded sampling, statistics, sensitivities, deterministic/risk-rule MAO and frozen versioned JSON output. No dependencies were installed.

- Model: `pi-monte-carlo-v1`; economics: `pi-flip-cents-v1`.
- PRNG: `sha256-mulberry32-v1`; exact replay verified on Node **v22.12.0**.
- Default: 10,000 draws; configurable 100–100,000.
- Constant, triangular and finite discrete distributions; shared scenario regimes, with explicitly justified conditional residual independence.
- Every financial leaf, hurdle, distribution/dependence specification and optional risk policy requires attributed evidence/assumption metadata.
- Complete ledger recalculated for every draw; invalid input/draw aborts, with no discarded unfavorable outcomes.
- Profit/return/capital/holding summaries, conditional losses, target probabilities, estimator errors and paired stress diagnostics.
- Optional probabilistic MAO has its own explicit policy; there is no default investor risk threshold.

See [financial and probability specification](PI_MONTE_CARLO_V1_MODEL_SPEC.md) and [versioned JSON / future report contract](PI_MONTE_CARLO_V1_REPORT_CONTRACT.md).

## Final synthetic certification

Machine-readable evidence: [final summary](../data/validation/monte-carlo-v1/2026-10-09T17-55-37-247Z/summary.json).

Run: `2026-10-09T17-55-37-247Z`, completed `2026-10-09T17:56:01.152Z`.

| Gate | Result |
| --- | --- |
| Independent deterministic arithmetic and corrected legacy MAO | PASS |
| Distribution support/moments, dependency direction and timing costs | PASS |
| Same-seed complete output/fingerprint replay | PASS, all four valid scenarios |
| Risk statistics, percentiles, probability accounting | PASS |
| Sensitivity and honest unresolved/tied rankings | PASS |
| Deterministic/optional risk-rule MAO boundaries | PASS |
| Immutable JSON output / provenance / fingerprints | PASS |
| Automated focused + existing synthetic regression tests | **94/94 PASS**, 0 skipped, 0 cancelled |
| Unchanged existing MAO QA in isolated temporary copy | **10/10 PASS** |
| Protected workflow/artifact preservation during certification | **193 paths unchanged** |

All scenarios use artificial identifiers and assumptions, not actual properties or provider-derived financial values.

| Synthetic case | Deterministic profit | Mean simulated profit | Simulated loss frequency | Deterministic MAO | Optional risk-rule ceiling |
| --- | ---: | ---: | ---: | ---: | ---: |
| A — strong margin | $88,798.01 | $88,888.97 | 0.00% | $203,418.00 | $205,508.23 |
| B — marginal | $438.01 | $595.24 | 47.02% | $125,910.38 | $118,337.40 |
| C — renovation overrun | $43,298.01 | $32,803.68 | 10.19% | $163,835.25 | $148,273.63 |
| D — market downturn | $32,398.01 | $8,691.80 | 39.97% | $153,945.04 | $110,083.36 |
| E — incomplete evidence | Rejected | Not calculated | Not calculated | Not calculated | Not calculated |

Each valid case uses 10,000 draws. E fails with `MC_INVALID_rehabCost`; this is the required safe rejection, not a failed certification or a fifth fabricated analysis. Zero observed losses in A is not a guarantee of no risk.

The deterministic hurdle is synthetic 25% cash-on-cash. The optional risk policy is synthetic minimum $20,000 profit in 80% of samples, bounded at $500,000. These are **different objectives**: A's risk ceiling being above deterministic MAO is not a contradiction. Neither policy is prescribed to investors.

Case D illustrates positive mean profit with substantial downside. C's overrun regimes generate positive rehab/holding association; D's downturn regimes generate negative price/holding association. These are declared scenario assumptions, not calibrated empirical correlations. Equal timing stresses leave all four complete sensitivity rankings `UNRESOLVED_OR_TIED`; signed effects are available without inventing a unique ranking.

## Performance and preservation

The 10,000-draw core benchmark completed in approximately **111 ms**; full per-case runs with sensitivities and optional risk-ceiling search took **2.44–2.53 seconds**. The 100,000-draw core took **1.20 seconds**, with approximately **287.7 MiB** sampled process RSS and **299.0 MiB** process-lifetime peak RSS. These warm, single-process local measurements are not production/concurrency guarantees. Full benchmark methodology and estimator stability appear in [QA](PI_MONTE_CARLO_V1_QA.md).

The task-level before/after inventory covered 388 existing source/configuration/test/protected-artifact paths: 387 unchanged, only the authorized MAO correction changed. Eight new implementation/test/runner files and the four requested documents were added, plus separate synthetic certification output. Existing dirty-worktree changes were preserved. The runner independently verified 193 protected paths before/after execution, including V3/identity artifacts, analyst decisions, Round 1 artifacts, providers, persistence, migrations, monitoring, reports, package/configuration and historical baselines.

No credentials were loaded; offline network guards were active. Provider calls **0**; database connections/writes **0**; MLS access **0**; real-property analyses/records **0**; Round 1 selections **0**; deployments **0**; PDF generations **0**. Existing API tests used in-process requests and mocked repositories only.

## Certificate identity and limits

Model-definition fingerprint:
`01b34b027b7dee10c0dd0848a2764fa6be82fdfda3208b2a38dad4a31c66cd54`

Implementation/test source-bundle fingerprint:
`94682d485c61b3027cd5c06216886c0954e9d6c08be9edc47be0ce8201c55661`

The final summary lists all nine exact source hashes. Definition and source hashes are different attestations; neither validates assumption truth. Frozen outcomes must retain the actual source/runtime identity, input provenance, sample/run/result hashes and stated limitations.

Remaining requirements before real investment use: supported licensed/current evidence, genuine scope/timing/financing/cost assumptions, explicit investor policy, empirical outcome/backtesting work, property identity and approvals, separately authorized reporting/snapshot integration and production runtime assessment. Acquisition-only interest-only debt and upfront renovation spending do not represent construction draws, refinancing, rentals, amortization, taxes or every real cash-flow arrangement. No IRR is provided. No new live route or application/report adapter was created.

**STOP FOR STAN/CHATGPT REVIEW.** No investor-report integration, real-property analysis or Round 1 execution is authorized by this certificate.
