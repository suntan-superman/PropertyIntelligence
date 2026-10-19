# PI Monte Carlo V1 — Versioned result and future report contract

2026-10-09. **Interface definition only; no PDF/template/renderer integration performed.** The existing normalized investor-report model and Puppeteer implementation are unchanged. This contract can later supply web, PDF, portal or mobile consumers without importing any rendering technology into the model.

## Entry points

In [index.js](../src/analysis/monteCarlo/index.js), runMonteCarlo(input, {includeSensitivity, riskRule}) returns a deeply frozen JSON-compatible result or throws on invalid inputs/samples. No partial result is returned as certified. includeSensitivity defaults true; riskRule defaults null (no implicit investor risk threshold). No real property loading, API route, persistence or provider adapter is part of this interface.

[normalizeInput / validateResult](../src/analysis/monteCarlo/contract.js) enforce the declared model versions, complete financial inputs, provenance, probability accounting, percentile ordering, histogram counts and fingerprints. Structural/integrity validation does not prove that assumptions are true or that a recomputed, maliciously altered payload is authentic; a future trusted snapshot/authorization layer remains separate.

### Input

Required sections: scenarioId, strategy=FIX_AND_FLIP, assumptionsVersion, economics, target, uncertainty, simulation and provenance. The [model specification](PI_MONTE_CARLO_V1_MODEL_SPEC.md) defines units, cost fields, bounds, distributions and joint scenarios. Unknown fields, missing/null amounts, unclassified provenance, unsupported strategy and invalid domains fail. Only iteration count has a numerical default; seed is explicit and financial costs do not default to zero.

Every economics leaf, target type/rate, each variable's distribution parameters and the joint dependency specification has a corresponding provenance entry with classification, reference, asOf and rationale. Classifications are PROVIDER_EVIDENCE, COUNTY_EVIDENCE, ANALYST_ESTIMATE, INVESTOR_ASSUMPTION or SYNTHETIC_TEST_FIXTURE. asOf may be null; no retrieval/effective date is manufactured. A future provider-backed point does not automatically authorize treating its range as a distribution. All inputs executed in this certificate are synthetic.

An optional risk rule additionally requires its own provenance covering minimumProfit, minimumProbability and maximumPurchasePrice. A risk-policy change affects runFingerprint even when underlying financial/sample inputs are unchanged. Caller inputs and policy objects are not mutated or frozen by the engine.

### Result shape

| Field | Meaning |
| --- | --- |
| modelVersion | pi-monte-carlo-v1 |
| economicsVersion | pi-flip-cents-v1 |
| strategy | FIX_AND_FLIP |
| simulation | Seed, explicit normalized iterations, generatorVersion, zero discarded samples and invalid-sample policy |
| inputs | Complete normalized input/provenance snapshot; no current database object or hidden provider lookup |
| deterministic | Base-case profit, costs, ROI/cash-on-cash, principal, pre-sale/exit cash flows, peak cash and timing |
| mao | Deterministic hurdle, cents-solver result, break-even purchase boundary and economics at MAO |
| results.profit | mean, median, p5, p10, p50, p90, p95, sampleMinimum, sampleMaximum, all USD |
| results.probabilityOfProfit / Loss / BreakEven | Ratios 0–1; >0 / <0 / =0 net profit |
| results.expectedLossConditionalOnLoss | Positive USD loss magnitude, or null if no losses |
| results.expectedLossMagnitude | Unconditional expected negative-profit magnitude, USD |
| results.roi / cashOnCash | Distribution summaries of explicitly defined, nonannualized ratios; undefined counts separate |
| results.cashRequired / holdingDays | Distribution summaries in USD / days |
| results.probabilityMeetingTarget / ExceedingTarget | ≥ / > explicit input hurdle; not interchangeable |
| results.profitDistribution | Histogram bins with numeric min, max and count; counts sum to iterations |
| results.samplingError | Mean-profit and loss-frequency estimator SEs with limitations |
| sensitivity | Paired stress effects/units, estimator errors, split-sample stability; optional null |
| riskAdjustedMao | Optional attributed risk rule, sample-based cent ceiling, next-cent check and boundary status |
| dependenceDiagnostics | Scenario counts and generated Spearman associations; undefined constant-variable association is null |
| materialAssumptions | Explicit uncertainty distributions and their source classifications; fixed costs/terms remain fully attributed in inputs |
| interpretations / limitations | Conditional-language conclusions and modeled/excluded risks |
| provenance | Input, definition, sampled-sequence, execution-option and result fingerprints |

Histogram bins are left-closed/right-open except the final bin includes its maximum. A constant outcome has one zero-width bin. Quantiles may interpolate between scenario cents; only formatting should round them. Explicit nulls are not zero values. No IRR, causal-sensitivity percentage, calibrated confidence interval, investor disposition or probability of title clearance is fabricated.

## Fingerprints and immutable packages

- inputFingerprint: SHA-256 of canonical normalized inputs, including provenance, seed, iterations and dependency assumptions.
- modelFingerprint: SHA-256 of the versioned MODEL_DEFINITION. This is a **definition fingerprint, not a claim to hash executable source bytes**.
- sampleFingerprint: SHA-256 of the ordered exogenous scenario draws and regime references.
- runFingerprint: SHA-256 of normalized inputs, model definition fingerprint, sensitivity option and optional fully attributed risk rule.
- resultFingerprint: SHA-256 of canonical full result before adding this fingerprint itself.

The certification summary separately records exact per-file source SHA-256 values, sourceBundleFingerprint and Node runtime. Freeze those together with the result and input evidence when building an eventual immutable analysis package. Do not substitute the definition hash for the implementation bundle hash. No runtime, wall-clock timestamp, elapsed-time or process-memory measurement is embedded in the deterministic result; those belong in an envelope/manifest. Preserve historical model/results alongside future versions instead of recalculating archived snapshots in place.

## Future mapping to the existing investor-report model

[normalizeInvestorReport](../src/reports/investor-v1/model.js) already accepts the following fields, but currently only renders supplied values; it does not call this engine. A future explicitly authorized adapter must apply the mapping and validate evidence permissions/analysis identity. No adapter was added in this sprint.

| Future report field | Certified source | Required interpretation |
| --- | --- | --- |
| reportMeta.monteCarloVersion | modelVersion + definition/implementation refs | Preserve exact version/runtime in frozen manifest |
| reportMeta.assumptionSetVersion | inputs.assumptionsVersion | Do not substitute a current mutable assumption set |
| monteCarlo.iterations | simulation.iterations | Actual accepted draws, not a decorative label |
| monteCarlo.probabilityPositive | results.probabilityOfProfit | Ratio, displayed as percentage |
| monteCarlo.probabilityLoss | results.probabilityOfLoss | Conditional on assumptions; zero simulated losses is not no risk |
| monteCarlo.probabilityTarget | results.probabilityMeetingTarget | Explicitly label “meets [type/rate]”; > is a different metric |
| monteCarlo.percentiles.p10 / p50 / p90 | results.profit.p10 / p50 / p90 | USD lower/median/upper simulated profit, not confidence bounds |
| monteCarlo.profitDistribution | results.profitDistribution | Preserve bin count/bounds; create display labels without changing data |
| monteCarlo.sensitivities | sensitivity.stresses, selected metric | Factor/stress and signed effect; current renderer needs a future semantic/units review before reuse |
| economics.mao | mao.deterministic.purchasePrice | Never silently substitute riskAdjustedMao |
| economics.profit / return | Chosen deterministic or distribution statistic | Explicitly identify which; ROI and cash-on-cash have different denominators |
| monteCarlo.status / risks / assumptions | evidenceStatus, limitations, interpretations and attributed inputs | PI CALCULATION for computed outputs; assumptions retain honest source classification |

Current report datum classifications are RECORDED / VERIFIED, PROVIDER ESTIMATE, PI CALCULATION, INVESTOR ASSUMPTION and UNKNOWN / REQUIRES VERIFICATION. The engine's source taxonomy is not a one-to-one permission upgrade. Synthetic numbers must remain conspicuously synthetic; a report's PI CALCULATION label must not erase that fact. County/provider facts and analyst estimates must not be recategorized as verified simply because a model consumes them. Do not pass private raw inputs/provenance paths straight to a public report/API.

The report's existing “relative sensitivity” presentation is not automatically suitable for paired dollar/probability/day stresses. No variance-share or causal-impact bar should be inferred from these effects. Equal timing effects produce ties; do not force a ranked chart from a null stable ranking. Additional P5/P95, conditional-loss, cash and timing summaries require separately approved report integration, not a template edit in this task.

## Investor-language controls

Permitted: “Under the stated assumptions, X% of simulated outcomes have negative net profit”; “P10 is the lower tenth percentile of simulated net profit”; “positive mean profit can coexist with substantial modeled downside”; “a longer hold increases modeled interest”; “sample-based price ceiling for the stated risk rule.”

Not supported: “guaranteed profitable,” “safe investment,” “90% confidence the investment will earn at least P10,” “worst possible loss,” “market-calibrated probability,” “verified property equity is available cash,” or treating modeled original acquisition debt as a title payoff finding.

## Integration gate remains closed

No PDFs were regenerated and no investor templates, reporting baselines or authorization flags were changed. Real evidence licensing, canonical identity, genuine analyst approval, current financing/cost support, investor policy, real-property persistence authority, empirical validation and Round 1 execution/freeze controls remain independent gates. **STOP after this synthetic certificate; report integration and real analyses require separate authorization.**
