# PI Investor Report — Monte Carlo Integration V1

2026-10-09. **SYNTHETIC INVESTOR PDF CERTIFIED**.

Local synthetic certification only. This demonstrates calculated analysis → normalized report → existing HTML/CSS/Puppeteer renderer → verified frozen package. It is not real-property reporting readiness, predictive calibration or production integration. Round 1 remains **PRE_EXECUTION — NOT AUTHORIZED**.

## Certified deliverables

Final run: `data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/` (already gitignored by the existing investor-report output rule).

| Calculated report | PDF | Frozen manifest | Visual preview |
| --- | --- | --- | --- |
| A — strong margin, 6 pages | [Open PDF](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/packages/SYNTHETIC-F499A98B-2CCE-477C-B50D-1596A2C2168C/report.pdf) | [Manifest](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/packages/SYNTHETIC-F499A98B-2CCE-477C-B50D-1596A2C2168C/manifest.json) | [All pages](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/visual/A_STRONG_MARGIN/contact-sheet.png) |
| B — marginal, 6 pages | [Open PDF](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/packages/SYNTHETIC-46FB0287-5896-4BD8-8F87-FFC1723C63A6/report.pdf) | [Manifest](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/packages/SYNTHETIC-46FB0287-5896-4BD8-8F87-FFC1723C63A6/manifest.json) | [All pages](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/visual/B_MARGINAL/contact-sheet.png) |
| C — renovation overrun, 6 pages | [Open PDF](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/packages/SYNTHETIC-1204E7BD-C87B-4FFC-A52C-23C92B1E2556/report.pdf) | [Manifest](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/packages/SYNTHETIC-1204E7BD-C87B-4FFC-A52C-23C92B1E2556/manifest.json) | [All pages](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/visual/C_RENOVATION_OVERRUN/contact-sheet.png) |

All three use actual fresh executions of the unchanged certified engine and match the previously certified complete result fingerprints exactly. Each page carries **SYNTHETIC DEMONSTRATION — NOT A REAL PROPERTY OR INVESTMENT OFFER**. No real address, parcel, photo or live provider financial value is used.

## Architecture audit and reuse

| Existing component | Actual entry point / convention | Integration |
| --- | --- | --- |
| Report contract | `src/reports/investor-v1/model.js`, `normalizeInvestorReport`, `datum`; version `investor-report-model-v1` | Reused existing fields and deep-freeze/fingerprint conventions. Added optional strictly validated `certifiedAnalysis` extension |
| HTML / CSS | `src/reports/investor-v1/html.js`, `investorReportHtml`, inline `baseCss`; Brief 3 pages, Full 8 pages | Existing branches remain intact. A calculated full-report branch uses the same base typography, colors, cards, tables and print CSS |
| PDF | `src/reports/investor-v1/pdf.js`, `renderInvestorPdf` | Same Puppeteer pipeline, Letter page size, margins, header/footer, disabled page JavaScript, request interception and size limit |
| Installed renderer | Puppeteer **25.12.0**, existing cached **Chrome/154.0.8037.57**, Node **v22.12.0** | No installation, upgrade or runtime/config change. Browser actually launched and generated PDFs |
| Local assets | Arial/Helvetica/system fonts; inline SVG; no remote images/fonts | Reused. No chart library or external chart service |
| Existing QA | `tests/investor-report-v1.test.js`; `scripts/qa-investor-reports-v1.js`; PDF.js + existing canvas package | Existing tests run unchanged. Text/page-bound/layout/chart/PNG conventions reused with outputs redirected to unique run folders |
| Snapshot conventions | Canonical JSON hashes, frozen report models; Round 1 harness `createFreezeManifest` / `verifyFrozenReport` / immutable-write guard | Same separation of content fingerprint and freeze identity, but a separate synthetic package contract. Six-property Round 1 freeze/selection functions are not invoked |

New entry points: [monteCarloAdapter.js](../src/reports/investor-v1/monteCarloAdapter.js), [analysisTrust.js](../src/reports/investor-v1/analysisTrust.js), [monteCarloHtml.js](../src/reports/investor-v1/monteCarloHtml.js), [frozenPackage.js](../src/reports/investor-v1/frozenPackage.js).

The existing model remains renderer-independent. `certifiedAnalysis` contains the approved execution and exact validated calculation snapshot; it is an additive local synthetic extension, not a new public response. `NOT_ASSESSED` is accepted only with this validated extension so no WATCH/INVESTIGATE/PASS decision is invented. Existing report fixtures and their dispositions remain unchanged. The calculated layout does not display a screening badge.

The PDF change is narrowly scoped: browser control uses a **local pipe**, allowing the existing offline socket guard to stay enabled, and the renderer returns request/console/page-error diagnostics. Print settings and existing report content are unchanged. No second PDF engine was added.

## Strict adapter and identity boundary

`monteCarloReport(result, execution, metadata)` calls the certified result validator, checks strategy/model/economics versions, normalized input/result hashes, sample count, required metrics, numeric domains, percentile ordering and probability accounting. It then requires the exact previously certified synthetic result fingerprint and an exact execution-manifest match.

Only A/B/C certified synthetic identities are allowlisted. All input provenance and risk-policy provenance must be `SYNTHETIC_TEST_FIXTURE`. Rehashed extra/private content, provider-source substitutions, unknown real identities, changed seeds/iterations/assumptions or stale execution identities fail. This deliberately does not authorize a general-purpose real-property adapter.

The package boundary additionally verifies the pinned certificate bytes, all nine certified source hashes, the exact source-bundle identity and Node runtime. A caller's `certified:true` claim is not accepted. Checksums are integrity checks, not authentication; see the [package specification](PI_INVESTOR_REPORT_MC_PACKAGE_SPEC.md).

## Mapping without recalculation

| Report field / presentation | Certified source | Semantics |
| --- | --- | --- |
| `reportMeta.monteCarloVersion` / assumption version | `modelVersion` / `inputs.assumptionsVersion` | Exact versions |
| `monteCarlo.iterations` | `simulation.iterations` | 10,000 accepted draws |
| Positive / loss / meets hurdle | `results.probabilityOfProfit`, `probabilityOfLoss`, `probabilityMeetingTarget` | Ratios retained; percentage formatting only |
| P10 / P50 / P90 | `results.profit` | Exact USD quantiles; no confidence-guarantee language |
| Histogram | `results.profitDistribution` | Exact min/max/count for every bin |
| Paired stress display | `sensitivity.stresses` | Signed mean-profit dollars, loss-frequency percentage points, cash dollars and hold days |
| Deterministic MAO | `mao.deterministic.purchasePrice` | Existing base-case hurdle, never replaced by risk MAO |
| Optional risk ceiling | `riskAdjustedMao` in validated extension | Separately labeled, full attributed minimum-profit/probability rule |
| Base cost/profit/cash/ROI | `deterministic` | Complete certified ledger, not independently recomputed |
| Capital / holding distributions | `results.cashRequired`, `results.holdingDays` in extension | Full distributions retained; selected mean/P90 metrics displayed |
| Conditional loss | `results.expectedLossConditionalOnLoss` in extension | Positive magnitude among loss draws; null means no sampled losses, not zero severity |
| Provenance | `inputs.provenance`, result hashes and approved execution | Synthetic status never upgraded to recorded/provider facts |

The adapter does not derive unsupplied aggregate closing/holding values to fill old cards: those optional legacy fields remain unavailable, and the calculated page displays exact component costs from the engine ledger. It does not rerun financial formulas, select an investor disposition, estimate title payoff or manufacture property facts.

ROI is profit / total project cost; cash-on-cash is profit / peak modeled cash. Both are nonannualized. Deterministic MAO uses the synthetic 25% cash-on-cash hurdle; the optional risk ceiling uses at least $20,000 profit in at least 80% of draws, bounded at $500,000. Different questions can produce a risk ceiling above or below deterministic MAO; the report explains that explicitly.

## Financial design and charts

Six pages preserve legibility: overview; complete investment economics; modeled risk; sensitivity/pricing; assumptions/limitations; reproducibility/frozen evidence. Base typography is 10.25 pt, tables 9 pt, with smaller metadata/footer text. Currency is USD with two decimal places, loss values retain minus signs, and percentages display two decimal places. Exact unrounded values remain in JSON.

Histograms are deterministic inline SVG using real numeric bin boundaries and counts, labeled USD and scenario count. Negative bins are distinct; bins straddling zero are hatched rather than assigning invented loss/profit sub-counts. The supplied median is marked. No normal curve, smoothing or invented frequency is used.

Sensitivity SVG uses the certified signed paired-stress profit changes. A supporting table shows other effects with units. Model order is preserved and `UNRESOLVED_OR_TIED` is displayed; no causal variance shares or uniquely ranked chart is claimed.

| Synthetic case | Deterministic profit | Mean simulated profit | Loss frequency | P10 profit |
| --- | ---: | ---: | ---: | ---: |
| A | $88,798.01 | $88,888.97 | 0.00% | $80,851.21 |
| B | $438.01 | $595.24 | 47.02% | −$12,656.07 |
| C | $43,298.01 | $32,803.68 | 10.19% | −$8,781.86 |

These differences are computed, not manually supplied report summaries. A's zero observed loss frequency is explicitly qualified; B's positive mean is paired with material downside; C retains the separate overrun tail and holding/capital exposure.

## Certification and limits

**136/136 tests PASS**, zero skipped/cancelled. Three calculated PDFs passed package, automated PDF and page-by-page visual checks. Eight existing fixture PDFs passed regression checks. See [QA](PI_INVESTOR_REPORT_MC_QA.md).

Only three existing source files changed: investor report `model.js`, `html.js`, `pdf.js`. Certified Monte Carlo/PRNG/statistics/MAO V2, identity, providers, monitoring, configuration, dependencies and historical baselines remain unchanged. Provider calls, database connections/writes, real-property analyses, MLS access, Round 1 selections and deployments: **0**.

No production API/UI route was added. The calculated report branch currently supports **Full** only; the existing Brief remains unchanged. Real reporting still requires separately authorized identity/licensing/current evidence, analyst assumptions, investor policy, property execution, privacy review, empirical calibration and freeze/integration gates. A six-page synthetic PDF is not evidence that these gates have passed.

**STOP FOR STAN/CHATGPT REVIEW.**
