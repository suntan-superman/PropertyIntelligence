# PI Monte Carlo V1 — Model specification

2026-10-09. Model: pi-monte-carlo-v1. Economics: pi-flip-cents-v1. **Computational certification under explicit synthetic assumptions, not historical predictive calibration.** Only the existing FIX_AND_FLIP strategy is modeled. No rental, development, refinance, portfolio, IRR or annualized-return model is introduced.

## Implementation and boundaries

- [contract.js](../src/analysis/monteCarlo/contract.js): strict input domains, provenance, canonical serialization, hashes, versioned result validation and freezing.
- [economics.js](../src/analysis/monteCarlo/economics.js): complete per-scenario ledger, financing/cash timing, deterministic MAO and break-even purchase ceiling.
- [sampling.js](../src/analysis/monteCarlo/sampling.js): seeded uniforms, distributions and common-regime draws.
- [statistics.js](../src/analysis/monteCarlo/statistics.js): means, percentiles, estimator error and sample association.
- [index.js](../src/analysis/monteCarlo/index.js): simulation, sensitivities, risk-rule ceiling and immutable result.

These modules do not load credentials, contact providers/databases, access real properties, assign opportunity scores or import any renderer. The existing sponsor-only incomplete arithmetic remains separately labeled and unchanged. The acquisition MAO accounting correction is versioned sprint5-mao-v2; see the [certification audit](PI_MONTE_CARLO_V1_CERTIFICATION.md). The new engine does not silently replace the existing UI/API MAO or report pipeline.

## Complete financial ledger

All monetary amounts are USD, time is days and every rate is a **fraction** (0.015 means 1.5%, not 0.015 dollars or 1.5). Dollar line items are rounded once to integer cents using nonnegative half-up rounding with a small binary-representation epsilon. Profit is integer sale cents minus integer cost cents. Statistics and ratio outputs retain full precision; interpolated percentiles/means can contain fractions of a cent. Presentation rounding must not feed back into calculations.

Every category below is required, including an explicit zero when genuinely assumed not applicable. Null, omitted, negative, nonfinite and unrecognized fields fail. Costs are complete **within this declared model scope**, not proof that real-world costs are fully known.

| Category | Input / calculation |
| --- | --- |
| Purchase | purchasePrice, P |
| Buyer closing | acquisitionFixed + P × acquisitionRate, as separately rounded lines |
| Scoped renovation | rehabCost, R; sampled value excludes the separate contingency |
| Renovation contingency | R × rehabContingencyRate, one additional spent-cost line |
| Other upfront expenses | otherUpfront; any real use would require scope/source documentation |
| Holding period | T = renovationDays + marketingDays; marketingDays includes post-renovation marketing/closing interval |
| Property taxes | holdingDaily.propertyTaxes × T |
| Insurance | holdingDaily.insurance × T |
| Utilities | holdingDaily.utilities × T |
| Maintenance | holdingDaily.maintenance × T |
| Other recurring expenses | holdingDaily.other × T |
| Acquisition loan | L = rounded(P × ltv), or zero for CASH |
| Loan origination | rounded(L × points) |
| Financing fees | financing.fees |
| Interest | rounded(L × annualRate × T / 365); simple interest, actual model days/365 |
| Selling commission | rounded(exitValue × sellingCommissionRate) |
| Seller closing | sellerClosingFixed + rounded(exitValue × sellerClosingRate) |
| Transfer costs | transferCost, at exit |
| Other documented disposition expenses | otherAtExit |

AcquisitionOnly interest-only financing has a single purchase draw at time zero and principal repayment at sale. Renovation and contingency are paid upfront with equity; other pre-sale costs accumulate before exit. All intervening modeled flows are expenses, so cumulative equity exposure cannot decrease before sale. No construction draws, reimbursement delays, amortization, income receipts, compounding/default interest, cash-out, tax benefits or reserve-release mechanics are modeled. These are limitations, not zero-valued claims about a real investment. CASH requires all loan fields to be zero; acquisition ltv is bounded to 0–0.95. Rates are bounded, sale-related percentage expenses must sum to less than one, and total time support must be positive and at most 3,650 days.

Let Cpre be purchase plus all acquisition, renovation, financing and holding costs; Cexit be all selling/transfer/exit costs; S be gross sale proceeds. Loan principal is not an expense:

```text
Total project cost = Cpre + Cexit
Net sale proceeds = S - Cexit                       (before debt repayment)
Net profit = S - Cpre - Cexit
Pre-sale equity = Cpre - L
Exit equity cash flow = S - Cexit - L
Net profit = Exit equity cash flow - Pre-sale equity
Peak cash required = max(0, Pre-sale equity,
                            Pre-sale equity - Exit equity cash flow)
ROI = Net profit / Total project cost
Cash-on-cash = Net profit / Peak cash required
Profit margin = Net profit / Gross sale proceeds
```

If sale proceeds cannot discharge selling costs and loan principal, peak cash includes the additional exit shortfall. Property equity/AVM is never treated as spendable cash. Borrowing does not create profit; interest and fees reduce profit, while loan proceeds reduce required equity. Undefined zero-denominator returns are null and counted explicitly, never infinite or zero. Cash-on-cash is a nonannualized whole-project ratio under this cash schedule, not an operating-rental yield.

Contingency is conservatively modeled as **spent**, not both a reserve and an expense. If a renovation estimate already includes contingency, set the separate contingent-spend assumption to zero with supporting provenance. The renovation-tail fixture does this to avoid layering a duplicate overrun reserve.

## Uncertainty model

The four supported random variables are exitValue (USD gross sale), rehabCost (USD scoped cost excluding contingency), renovationDays (days), and marketingDays (days). Financing terms, expense rates and hurdle policy are explicit fixed assumptions in V1. Market weakening acts on exitValue; no separate appreciation variable compounds the same price risk again. ARV is not manufactured from an AVM, and a provider low/high range is not assumed to be a confidence interval or distribution.

| Family | Parameters and rationale | Sampling / bounds |
| --- | --- | --- |
| CONSTANT | value; deterministic control or explicit fixed assumption | Returns exactly value while still consuming one uniform |
| TRIANGULAR | min ≤ mode ≤ max, min < max; bounded expert-estimate shape | Inverse CDF; explicit finite nonnegative support. End-point modes supported |
| DISCRETE | value/probability outcomes; explicitly hypothesized finite event risks | Inverse cumulative probabilities; positive weights sum to one within 1e-12 |

No normal distribution, unbounded lognormal, hidden clipping, rejection resampling or fitted statistical parameters are used. A finite mixture of ordinary and severe renovation states produces the required right-skewed cost risk. This is preferable here to claiming an empirically fitted lognormal without observations. Extreme events outside the stated finite support are not covered. Invalid draws abort the entire simulation; unfavorable outcomes are retained. One invalid sensitivity stress also aborts rather than returning a partial apparently certified result.

### Dependence

Each iteration first samples an explicit joint scenario. Its factors multiply the four residual draws. Residual independence **conditional on the regime** must have its own rationale; it is not a claim of unconditional independence. There is no estimated correlation matrix. Unknown correlation/matrix fields are rejected rather than ignored.

The artificial [fixtures](../tests/fixtures/monteCarlo.js) use:

| Case | Residual exit / rehab distributions | Joint scenario assumptions |
| --- | --- | --- |
| A, strong margin | Triangular 285k / 300k / 315k; rehab 27k / 30k / 33k | One stable regime; residual price and scope-cost independence expressly assumed |
| B, marginal | Triangular 181k / 206k / 231k; same rehab | One regime; base profit near zero, not a provider forecast |
| C, renovation overrun | Triangular 235k / 250k / 265k; same rehab; contingency zero | 70% normal; 20% rehab ×1.6 and renovation duration ×1.5; 10% rehab ×3 and duration ×2.5 |
| D, market downturn | Triangular 225k / 240k / 255k; same rehab | 60% normal; 30% exit ×0.8 and marketing duration ×2; 10% exit ×0.6 and marketing duration ×3 |
| E, invalid/incomplete | Missing required rehab cost | Reject before sampling; no fabricated result |

All base durations are 75 renovation + 45 marketing days before scenario factors. The nominal purchase is an artificial $145,000 with 70% acquisition LTV, 10% simple annual interest and 2% origination points. Base target is a synthetic 25% cash-on-cash hurdle. None is a real property value, observed event frequency, market estimate or recommended investor policy.

Common overrun severity induces positive renovation/holding association; weak-market severity induces negative exit-price/holding association. Holding duration also mechanically increases recurring costs and positive interest. Previous/current draws are not involved: this is an investment model, not the monitoring event engine. Spearman diagnostics describe generated associations, not causal coefficients or calibrated correlations. Real condition-to-scope evidence is a prerequisite for future assumptions; no condition finding is invented here.

## Reproducibility

Generator sha256-mulberry32-v1 hashes the UTF-8 seed, takes the first four digest bytes as a little-endian unsigned 32-bit state and applies the documented in-source Mulberry32 integer operations. Uniforms are in [0,1). Each iteration consumes exactly five uniforms in fixed order: regime, exitValue, rehabCost, renovationDays, marketingDays, including constant distributions. The generator is deterministic, not cryptographic; different seed strings can theoretically share the 32-bit initial state.

Canonical JSON sorts object keys while preserving array order. Same normalized inputs, seed, iterations, model definition/implementation and options reproduce identical results and fingerprints in the certified Node 22.12.0 runtime. No wall-clock timestamp or performance measurement enters the analysis result. Cross-engine/platform floating-point identity is not certified; preserve runtime and source bundle with frozen results. Increasing iterations preserves the draw prefix but changes statistics and the run identity.

Default 10,000 iterations, allowed integer range 100–100,000. At loss probability near 0.5, 10,000 independent draws have approximately 0.005 standard error (half a percentage point); this motivates the default as a local diagnostic compromise, not a guarantee of percentile accuracy or predictive calibration. Rarer events may require more iterations or a better-supported model. More draws cannot repair unsupported assumptions or omitted risks.

## Metrics and sensitivity

Profit mean/median, P5/P10/P50/P90/P95 and sample minimum/maximum use Type-7 linear-interpolated empirical percentiles, indexed by (N−1)p. P10 is the lower 10th percentile of simulated profit, **not** a 90% confidence guarantee. Worst outcome means sample minimum, not worst possible outcome.

Profit > 0, loss < 0 and break-even = 0 use cent-rounded scenario profit and exhaust the sample. Conditional expected loss is the positive mean loss magnitude among negative-profit scenarios, null when none occur. Unconditional expected loss magnitude weights that by loss frequency; neither is automatically a downside quantile/expected-shortfall measure. Mean/median ROI and cash-on-cash, peak cash and holding distributions are supplied. Meeting target uses ≥; exceeding target uses >. Undefined return values do not qualify.

Estimator standard errors are sample standard deviation / sqrt(N) for mean profit and sqrt(p(1−p)/N) for loss frequency. At observed p=0 or 1, the plug-in SE is zero; that does not establish no tail risk. These are simulation sampling diagnostics, not empirical predictive confidence intervals.

Sensitivity reuses complete joint samples and applies explicit one-at-a-time diagnostic stresses: exit −10%, scoped rehab +20%, renovation +30 days and marketing +30 days. These extend the existing deterministic sensitivity conventions; they are not additional stochastic probabilities. Each stress recalculates costs, interest and cash flows. Report paired mean change and standard error for profit, loss probability, peak cash and duration. Changing a cost alone in this diagnostic is not an assertion that cost causally changes time; joint-regime dependence remains in the reference draws.

The optional total ranking requires all adjacent absolute mean impacts to be separated by more than three summed paired standard errors, plus identical first-/second-half ordering. Exact ties or inconclusive separation return UNRESOLVED_OR_TIED with ranking null. Effect magnitudes remain visible. Equal +30-day timing stresses have equal financing/holding effects, so these fixtures intentionally do not claim a uniquely stable full ranking. Unequal stress sizes and sample associations are never described as causal attribution or variance shares.

## MAO

The existing three hurdle meanings are retained: cash-on-cash, return on total project cost, and profit margin on sale. The certified cents-ledger deterministic MAO is the maximum cent purchase price meeting the base-case hurdle. Break-even purchase is the maximum cent with nonnegative modeled profit; when strict equality is skipped by rounded cost increments, report the cent boundary and next-cent loss rather than inventing an exact zero. Monotone integer-cent bisection avoids silently mixing a continuous solver with per-line rounded accounting.

Risk-adjusted MAO is a separate **optional**, explicitly attributed policy: minimum profit, minimum modeled probability and maximum search price. The same sampled exogenous scenarios are held fixed across price trials; acquisition debt, points, buyer costs and interest are recalculated at every price. Required successes are ceil(probability × N), with a small representation tolerance. AVAILABLE means the returned cent passes and the next cent fails; BOUND_LIMITED means the configured maximum passes, not that a global ceiling was discovered. No feasible price returns null.

The certification uses a purely synthetic rule of at least $20,000 profit in at least 80% of samples, bounded at $500,000. The rule carries SYNTHETIC_TEST_FIXTURE provenance. This is not the same objective as the deterministic 25% cash-on-cash hurdle, so risk MAO need not always be below deterministic MAO. Neither automatically updates offers, walkaway caps, dispositions or screening scores. No uncalibrated sample threshold is called safe or guaranteed.

## Remaining evidence requirements

Future real use needs licensed, current property identity/evidence; contractor/condition/schedule support; explicit financing terms/cash timing; seller/buyer cost scope; data-supported or honestly elicited distributions/scenario weights; authentic investor hurdle/risk policy; empirical outcome validation and out-of-sample backtesting. Sources must distinguish provider evidence, county evidence, analyst estimates, investor assumptions and synthetic fixtures. Historical predictive validation, production execution, more complex draw schedules and report integration are outside this certificate.
