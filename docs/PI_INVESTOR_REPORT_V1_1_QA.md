# PI Investor Report V1.1 — QA

2026-10-09. Final classification: **INVESTOR REPORT V1.1 SYNTHETIC CERTIFIED**.

## Execution evidence

Final run: `2026-10-09T18-53-05-024Z`.

- Node: v22.12.0; installed Puppeteer: 25.12.0; launched browser: Chrome/154.0.8037.57.
- Existing renderer uses local pipe transport; JavaScript disabled; browser requests intercepted and blocked. All final document browser request/error counters are zero.
- Node offline guard blocks fetch, HTTP, sockets and TLS. Network attempts: 0.
- Tests: **158/158 PASS**, failures 0, skipped 0, cancelled 0.
- Three investor PDFs: 5 pages each. Three appendices: 1 page each.
- Eight legacy PDFs: four 3-page briefs and four 8-page full reports, 44 pages.
- New pages individually inspected: **18**. Legacy pages reviewed through contact sheets: **44**. Total visual coverage: **62 pages**.

[Test log](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/tests.tap), [stderr](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/tests.stderr.txt), [automatic summary](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/summary.json), [final visual/certification record](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/final-certification.json).

## Suites

| Test file | Coverage |
| --- | --- |
| investor-presentation.test.js | 22 new presentation, archive-preservation, two-document package and tamper tests |
| investor-mc-integration.test.js | 42 existing adapter/trust/immutable-package tests, unchanged |
| monte-carlo-v1.test.js | 56 existing computational certification tests, unchanged |
| acquisition-linkage.test.js | Existing linkage/runtime protections |
| investment-report.test.js | Existing economic/report regressions |
| investor-report-v1.test.js | Existing renderer-independent model and investor report regressions |

The last three contain 38 tests collectively. No existing assertion was removed or relaxed.

## Acceptance coverage

| Requirement | Result and evidence |
| --- | --- |
| Exact certified result and input/model/result identities | PASS; pinned source certificate plus exact allowlisted A/B/C result identities; full result deep equality |
| Deterministic and risk-adjusted MAO preserved | PASS; exact result fields retained, separate definitions and labels |
| Price comparison negative / zero / positive | PASS; independent helper assertions, certified A/B/C snapshot rendering and explicit equal branch |
| No assigned investment disposition | PASS; normalized status stays NOT_ASSESSED; visible text says not yet assessed |
| Investor terminology | PASS; no UNRESOLVED_OR_TIED, AVAILABLE, NOT_ASSESSED, SYNTHETIC_TEST_FIXTURE or “pp” in investor prose; codes retained in JSON |
| Loss and downside | PASS; adjacent uncalibrated-risk qualification; zero-loss sample caveat; signed P10 and conditional-loss null behavior |
| Hurdle and return semantics | PASS; stated 25% cash-on-cash target, no annualization or conflation with profit probability; ROI denominator unchanged |
| Histogram and sensitivity | PASS; exact existing SVG strings, same bins/counts/median/zero treatment and signed paired effects; no smoothing/reordering |
| Shared investor/appendix identity | PASS; one report object, execution, package ID and fingerprints |
| Appendix evidence | PASS; PDF text contains exact versions/seed/runtime and full fingerprints; command and trust limitations present |
| Manifest and trusted receipt | PASS; ten artifact hashes, exact file set, independent external receipt, source/runtime binding, dual HTML reconstruction |
| Tampering | PASS; investor PDF, appendix PDF/HTML and manifest mutations rejected in disposable copies; rehashed wrong-analysis appendix fails mapping |
| Freeze behavior | PASS; missing receipt and overwrite attempts rejected |
| Historical preservation | PASS; original manifests and every artifact checked against their existing receipts; original HTML reconstruction remains byte-identical |
| Legacy report regression | PASS; all eight PDFs pass existing text/layout/chart QA |
| No calls or data operations | PASS; offline guard, zero browser requests, no database modules/config or provider inputs used |

## Visual inspection

All 18 final new pages were opened individually, not merely text-extracted. Checked hierarchy, normal-size readability, boundaries and page breaks, currency alignment, negative profit values, zero-loss wording, actual histogram shapes, sensitivity effects, technical fingerprint wrapping, synthetic banners and consistent footers. No clipping, blank pages, overlaps, missing charts or stray technical codes found.

Strong Margin shows the purchase below MAO but explicitly does not recommend the investment. Marginal Investment shows $19,089.62 above MAO, 47.02% observed loss frequency and negative P10. Renovation Overrun preserves the separate downside cluster, 10.19% observed losses and enlarged P90 cash requirement. All three show the actual target rather than a generic “probability of success.”

Appendix identifiers/hashes remain legible and complete. The renovation-overrun assumptions page is the densest; verification reference remains on page 5 above its footer. No fonts were reduced to fit it.

Legacy review is regression/layout coverage, not a new certification of those fixtures' illustrative investment probabilities or dispositions. Their existing fictional property labels are not real-property input.

All page rasterizations and their SHA-256 values are retained in the final certification sidecar. Links are indexed in the [presentation report](PI_INVESTOR_REPORT_V1_1_PRESENTATION.md).

## Preserved failed-attempt evidence

Initial new-test inspection found a single extra whitespace character in legacy HTML output; it was removed, retaining the strict byte-equality assertion.

Provisional runs remain under the same presentation directory and are **not** deliverables:

- 18-50-18-104Z and 18-50-48-126Z: appendix spillover.
- 18-51-20-175Z and 18-52-24-741Z: renovation-overrun verification section spillover.
- 18-52-04-785Z: pricing-page spillover after expanding the percentage-points explanation.

Corrections shortened duplicated prose and reduced local verification-block spacing. Financial content, risk limitations, fonts and immutable packages were not edited to obtain a pass. The final 18-53-05-024Z run passed all checks.

## Preservation and accounting

The pre-edit snapshot covers **1,353 existing paths**. Exactly four authorized existing files differ:

- src/reports/investor-v1/monteCarloAdapter.js
- src/reports/investor-v1/monteCarloHtml.js
- src/reports/investor-v1/frozenPackage.js
- scripts/investor-mc-pdf-qa.js

No unexpected changes. Original investor PDFs/receipts/manifests/QA, certified Monte Carlo artifacts/source, MAO, identity artifacts/decisions, Round 1 configuration and historical baselines retain their hashes. New test and provisional output directories are append-only and gitignored; no original output is overwritten.

Provider calls **0**; database connections **0**; database writes **0**; real-property analyses **0**; Round 1 selections **0**; deployments **0**. No dependencies installed.

## Reproduction

From the repository root:

```powershell
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' scripts/certify-investor-presentation.js
```

This creates new IDs/directories, runs all six suites and both new/legacy PDF QA, then stops at automated certification pending actual image inspection. It does not silently claim visual approval. Do not use it to regenerate a frozen package in place.

**STOP FOR STAN/CHATGPT REVIEW.**
