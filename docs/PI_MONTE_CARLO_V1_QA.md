# PI Monte Carlo V1 — QA evidence

2026-10-09. Final result: **MONTE CARLO V1 CERTIFIED**, limited to computational correctness under explicit synthetic assumptions.

## Reproducible local command

Use the existing verified Node 22.12.0 runtime, without changing global Node settings:

```powershell
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' scripts/monte-carlo-v1-certify.js
```

The runner imports the existing offline network guard, never loads `.env`, and creates a unique local artifact directory without overwriting previous runs. It runs only synthetic analysis. No dependency installation, provider/database transport or production command is needed.

Final evidence directory: [2026-10-09T17-55-37-247Z](../data/validation/monte-carlo-v1/2026-10-09T17-55-37-247Z/summary.json).

| Artifact | Purpose |
| --- | --- |
| `summary.json` | Status, exact Node/model/source versions, 94 tests, MAO checks, scenarios, timing/memory, numerical stability, preservation and accounting |
| `tests.tap` / `tests.stderr.txt` | Complete test output; 94 pass, zero fail/skip/cancel |
| `legacy-mao.stdout.txt` / `legacy-mao.stderr.txt` | Existing unchanged MAO QA body; ten checks pass |
| `A_STRONG_MARGIN.json` through `D_MARKET_DOWNTURN.json` | Complete frozen-contract synthetic results with assumptions, costs, risk outputs, sensitivity, MAO and fingerprints |
| `protected-before.json` | Hash-only before snapshot of 193 protected paths, checked unchanged after execution |

These artifacts contain synthetic financial assumptions, not provider responses, credentials or real-property analyses. No new private property evidence was exported. Earlier runs are retained separately.

## Tests executed

| Suite | Tests / checks | Coverage |
| --- | ---: | --- |
| New `tests/monte-carlo-v1.test.js` | 56 tests | Financial ledger, legacy MAO regressions, distributions, dependencies, seeds, risk metrics, sensitivities, MAO, immutable output and invalid inputs |
| Existing `tests/acquisition-linkage.test.js`, `tests/investment-report.test.js`, `tests/investor-report-v1.test.js` | 38 tests | Existing synthetic acquisition/API/report behavior, security/allowlists and evidence-preserving mocked flows |
| Existing `scripts/qa-mao.js`, unchanged, isolated copy | 10 checks | Existing MAO input/hurdle/rehab/financing/decision behavior |

**94/94 tests PASS; 10/10 additional checks PASS; 0 skipped; 0 cancelled.** Test-file list and actual counts are recorded in the summary, not inferred from a package script name.

The existing MAO script writes a historical report as part of its normal operation. It was run in a retained temporary copy containing only its required source/package files, without `.env`, provider fixtures or `node_modules`, so the main historical QA artifact was not regenerated. Its old hard-coded output label `sprint5-mao-v1` is historical instrumentation, not evidence of the executed version. The source hash and focused test explicitly assert **sprint5-mao-v2**.

This is not a claim that the entire PI application/identity certification was rerun. Broad historical fixture/report-writing and real-property analysis commands were not run; they are outside the synthetic-only scope. No V3 certification or database suite ran. Existing report tests normalized/rendered synthetic HTML in-process; no PDF or report template was changed.

## Focused coverage and independent checks

| Requirement | Evidence / assertion |
| --- | --- |
| Deterministic arithmetic | Independent cents-ledger recomputation for A–D, separate from production helpers; each cost and financing/equity identity reconciles |
| No principal/contingency/holding duplication | Cash-versus-debt comparison, explicit one-contingency ledger, fixed/LTV equivalence, exit shortfall in peak cash |
| Existing arithmetic compatibility | Artificial sponsor, legacy and deal inputs retain incomplete-cost labels; cash/financed MAO cross-check includes fractional 1.5% cost precision |
| MAO safety | Negative/contradictory/excess fixed debt fails, infeasible ceiling unavailable; all three hurdles tested in cash and debt configurations |
| Zero uncertainty | Every profit quantile equals deterministic profit; deterministic cash/ROI agree; no invented conditional loss |
| Seed reproducibility | Full JSON equality and fingerprints for repeat/reordered-input runs; changed seed changes sample sequence; caller objects unchanged |
| PRNG stability | Golden five-value vector; no reliance on `Math.random`; uniform support and draw-prefix consistency |
| Distribution math | Triangular inverse-CDF support and analytical moments, finite discrete frequencies/support, explicit Type-7 quantile example |
| Dependence | Overrun rehab/holding Spearman >0.6; downturn price/holding Spearman <−0.6; durations drive positive recurring costs/interest |
| Risk metrics | Finite required values, ordered percentiles, histogram totals, probability bounds and profit/loss/break-even complement, target ≥ versus >, explicit null cases |
| Monotonic invariants | Higher purchase/rehab/time cannot improve relevant economics; lower sale cannot improve profit; 20 draws across each of four cases in cash and financed configurations |
| Sensitivity | Common-draw paired effects recalculate complete economics; equal timing effects remain ties; no forced total ranking |
| MAO and risk rule | Returned cent passes/next cent fails; tighter rule cannot increase ceiling; no feasible/bound-limited cases; constant profit-zero rule reconciles with break-even |
| Evidence provenance | Financial leaves/distributions/dependence and optional risk rule explicitly attributed; missing provenance rejected |
| Output integrity | JSON round-trip and deep freeze; model/input/result hash binding; wrong versions, probabilities, sample counts, ordering and hashes rejected |
| Invalid input/samples | Incomplete case E and 22 invalid mutations rejected; invalid stressed run aborts without resampling or silently discarding unfavorable results |
| Input isolation | Input and risk-policy objects not changed or frozen; policy changes affect run identity |

Strict assertions compare exact cent accounting and deterministic results. Floating-point analytical quantiles/moments use explicit numerical tolerances; no unfavorable outcomes are discarded to obtain passing tests. Structural hash validation does not substitute for trusted snapshot authorization or empirical model validation.

## Synthetic results and replay

All four valid cases completed at 10,000 draws, including sensitivities and the explicitly synthetic risk rule. Full-result replay was exactly equal for each.

| Case | P10 profit | Median profit | P90 profit | Loss frequency | Mean loss conditional on loss |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | $80,851.21 | $88,978.29 | $96,710.32 | 0.00% | null: no sampled losses |
| B | −$12,656.07 | $750.67 | $13,517.50 | 47.02% | $7,766.83 |
| C | −$8,781.86 | $40,048.28 | $49,869.62 | 10.19% | $22,247.20 |
| D | −$55,145.48 | $26,452.02 | $38,384.02 | 39.97% | $26,981.87 |
| E | Not computed | Not computed | Not computed | Not computed | Expected `MC_INVALID_rehabCost` |

Percentiles interpolate cent-valued outcomes; this table rounds for display only. Null is not zero loss severity. P10 is not a guaranteed lower bound. D's mean $8,691.80 and median $26,452.02 coexist with a substantial modeled loss tail.

Case C generated rehab/hold association approximately 0.803; D generated exit/hold association approximately −0.870. All four full sensitivity rankings remain honestly `UNRESOLVED_OR_TIED` because the two equal +30-day stresses have equal effects. This does not suppress the actual effect sizes or turn associations into causal claims.

| Case | Result SHA-256 |
| --- | --- |
| A | `b854e2c29320e50adda00c821763922bef9a22d51fb03253416176a99c82266f` |
| B | `c8c6fc92afdd229614e2a335735ae270cf928773e0340b4b314460d784cc89b1` |
| C | `4a88b988d5e22c54adb616e635ab7f95946f58921188d706750be34e8395d38f` |
| D | `a8e661e9922862be7541c23e5107b41b34de976fef0fcbfefd19db8ad5785886` |

## Performance and sampling stability

Representative marginal case B, same seed, increasing nested draw counts. These **core** benchmarks omit sensitivity and risk-MAO search; they include financial simulation, summaries, dependency diagnostics and fingerprints. Process memory is sampled after each call; garbage collection is not forced.

| Draws | Core runtime | RSS after call | Process-lifetime peak RSS | Mean profit | Loss frequency | Mean-profit estimator SE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 13.6 ms | 175.2 MiB | 176.6 MiB | $371.64 | 46.70% | $304.53 |
| 10,000 | 110.7 ms | 175.4 MiB | 176.6 MiB | $595.24 | 47.02% | $96.47 |
| 50,000 | 610.4 ms | 181.8 MiB | 189.0 MiB | $504.73 | 47.90% | $43.23 |
| 100,000 | 1,198.2 ms | 287.7 MiB | 299.0 MiB | $461.79 | 48.109% | $30.62 |

Heap-before/after bytes are retained in `summary.json`; the 100,000-draw call ended at 234,079,984 bytes of used heap. RSS and high-water marks include earlier work in the same process, not isolated per-call peak allocation. These are warm single-machine measurements, not guaranteed latency/memory limits. Full 10,000-draw cases with sensitivity and risk-MAO took A 2,453 ms; B 2,440 ms; C 2,531 ms; D 2,450 ms.

The analytically centered B mean is approximately its $438.01 deterministic profit, within bounded line rounding. All measured means were within four estimator SEs plus $0.03 rounding allowance. The 10,000/50,000 means and loss frequencies were within four combined SEs, a conservative diagnostic for nested samples. Error need not fall monotonically. P10/P90 values and per-count fingerprints are retained, not described as converged predictive confidence bounds.

The default 10,000-draw loss-frequency SE in B is approximately 0.00499 (0.499 percentage points). At 100,000 it is approximately 0.00158. This describes **sampling error**, not uncertainty in the selected distributions or historical forecast accuracy. Observed zero-loss plug-in SE is zero and does not prove absence of tail risk.

The measured implementation is suitable for bounded local synthetic work. Future server execution needs separate cold-start/concurrency/resource testing, runtime controls and an authorized integration; this sprint did not change Netlify or certify a production endpoint.

## Preserved failed/intermediate evidence

- The first focused test pass attempt exposed a strict floating-point quantile assertion (`3` versus `3.0000000000000004`). The independent analytical expectation now uses a 1e-12 tolerance; production quantile values were not rounded to hide the discrepancy.
- `2026-10-09T17-49-55-369Z`: 90/91 passed. Cross-model arithmetic exposed the actual legacy percentage precision defect (0.015 rounded to 0.02). The narrow V2 correction fixed the defect; the failing summary/TAP remain.
- `2026-10-09T17-50-26-122Z`: interim 91/91 pass before additional output-contract tests.
- `2026-10-09T17-53-45-542Z`: 92/93 passed. New rejection tests expected an overly generic error prefix; actual validation already rejected the value. Assertions now require each exact error code; the validator was not weakened.
- `2026-10-09T17-54-18-127Z`: interim 93/93 pass.
- `2026-10-09T17-55-37-247Z`: **final 94/94 pass**, including explicitly required optional risk-policy provenance and caller-object preservation.

No earlier artifact was replaced or relabeled as a successful run.

## Preservation and safety accounting

The task-level inventory compared 388 existing files, with only the authorized `src/underwriting/mao.js` difference. Eight new implementation/test/runner files were added; original package/runtime/configuration and unrelated code remain unchanged. The runner additionally compared the exact same 193 protected files before/after each final run and required source hashes to remain stable during certification. Protected baselines were read/fingerprinted, never updated. Local analyst decisions and retained identity artifacts were not altered.

The engine imports no provider, database, network, filesystem, report or credentials module. The runner/test processes preload the existing offline `fetch`/HTTP/socket guards. In-process API regression tests use mocked repositories and `Request` objects, not live transports. The runner records zero attempted network activity; no provider or database entry point was invoked. No secrets or environment values are included in artifacts.

| Operation | Count |
| --- | ---: |
| Provider calls / MLS accesses | 0 / 0 |
| Database connections / writes | 0 / 0 |
| Real-property analyses / real Property creation | 0 / 0 |
| Analyst-decision changes / Round 1 selections | 0 / 0 |
| PDF regeneration / deployments | 0 / 0 |
| Dependency installations / historical baseline rewrites | 0 / 0 |

See [certification](PI_MONTE_CARLO_V1_CERTIFICATION.md), [model specification](PI_MONTE_CARLO_V1_MODEL_SPEC.md), and [future report contract](PI_MONTE_CARLO_V1_REPORT_CONTRACT.md). **STOP for review; no downstream integration or real-property execution.**
