# PI Investor Report Monte Carlo Integration — QA

2026-10-09. **SYNTHETIC INVESTOR PDF CERTIFIED**.

Final run: `2026-10-09T18-30-14-472Z`.

- [Automated summary](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/summary.json)
- [Complete test output](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/tests.tap)
- [Final visual/preservation certification](../data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/final-certification.json)
- [PDFs, manifests and screenshot index](PI_INVESTOR_REPORT_MC_INTEGRATION.md)

The automated summary intentionally remains `ANALYSIS-TO-REPORT CONTRACT CERTIFIED`, pending image review. The final certification is a new run-level sidecar after actual inspection, not a rewritten summary or frozen manifest.

## Runtime and regression results

Node **v22.12.0**, installed Puppeteer **25.12.0**, actual launched browser **Chrome/154.0.8037.57**. Existing cached browser successfully launched; no install, download, upgrade, global Node setting or Netlify configuration was changed. Browser control uses a local pipe while Node's existing offline socket/HTTP/fetch guard remains active.

| Suite | Tests | Result |
| --- | ---: | --- |
| New `tests/investor-mc-integration.test.js` | 42 | PASS |
| Existing certified `tests/monte-carlo-v1.test.js` | 56 | PASS; source unchanged |
| Existing acquisition-linkage, investment-report and investor-report-v1 suites | 38 | PASS; tests unchanged |
| Total | **136** | **136 PASS / 0 failed / 0 skipped / 0 cancelled** |

Run through `scripts/certify-investor-mc.js`; see the [package specification](PI_INVESTOR_REPORT_MC_PACKAGE_SPEC.md) for exact commands. This is not a claim that unrelated production, identity/database or full application suites were rerun. Existing API regressions use in-process requests and mocked repositories, not live database/provider connections.

## Required mapping and protection coverage

| Required behavior | Evidence |
| --- | --- |
| Certified result accepted | A/B/C exact fingerprints and source/runtime certificate validated |
| Wrong model/economics/strategy rejected | Explicit mutations fail before report acceptance |
| Invalid input/result hash rejected | Modified hash and changed input tests |
| Missing/nonfinite metrics, bad percentiles/count/probabilities rejected | Targeted malformed-result tests, plus unchanged certified engine tests |
| Probability/percentile/bin mapping exact | Every mapped probability/P10/P50/P90/count/min/max matches engine values without rounding |
| Negative presentation | Explicit `-$` values present in HTML and extracted PDF text, visually inspected |
| Conditional-loss null semantics | A retains null and displays no sampled losses, not zero severity |
| Deterministic/risk MAO separate | Exact base MAO preserved, distinct risk ceiling and explicit rule shown |
| ROI/cash-on-cash denominators | Exact engine values; printed total-project-cost versus peak-cash definitions, neither annualized |
| Sensitivity ties retained | Exact signed effects in model order; `UNRESOLVED_OR_TIED`, no fabricated rank/variance attribution |
| Provenance and source restrictions | Missing provenance, substituted provider classification, rehashed extra private content rejected |
| Synthetic identity only | Unknown real identities/stale execution manifests/package IDs fail; exact disclaimer on all 18 calculated pages |
| No invented disposition | New calculated reports use `NOT_ASSESSED`; existing legacy dispositions unchanged |
| Model/input immutability | Normalization frozen, caller result unchanged, normalization round-trip equal |
| Exact repeatability | Fresh A result equals original entire certified result; fresh A/B/C generation matches approved fingerprints; new metadata changes report identity, not calculations |
| Tamper detection | Modified inputs, analysis, execution, report JSON, HTML, PDF, runtime, sources and manifest each fail |
| Missing/unexpected artifacts | Exact package file-set tests |
| No self-certified manifest | Missing receipt fails; rehashed manifest cannot bypass old trusted receipt |
| Semantic rebinding | Recomputed artifact/manifest checksums still cannot hide a report-to-analysis mismatch or wrong certified source identity |
| Append-only package creation | Existing package ID fails `EEXIST`; original manifest hash unchanged |
| Protected components | Engine, MAO and Round 1 assertions plus 311-path run preservation and 375-path task audit |

The tests deliberately create local tamper copies; they never modify the frozen deliverable package to perform tamper testing. A unit-test PDF and provisional runs are separate test artifacts, not certified deliverables.

## Automated PDF and layout QA

The existing Letter/print-background/header/footer configuration was reused. Actual PDF pages were parsed with existing PDF.js and rasterized using the installed canvas package. Print-media DOM checks ran in the existing Puppeteer environment with JavaScript disabled and all page requests intercepted.

Checks passed for:

- Expected six calculated pages; legacy Brief three pages and Full eight pages.
- No blank/trailing pages, suspiciously sparse pages under the established threshold, invalid glyphs, `undefined`, `null`, `NaN` or infinite values.
- Text origins/right edges inside the actual PDF page; no overflowing tables/cards/page containers or overlapping local footers.
- No orphaned headings or clipped SVG labels/bars.
- Exactly one histogram per report; exactly one paired-stress chart in each calculated report; exact histogram count list preserved.
- Required formatted profit/MAO/P10/P50/P90 and probability values present in extracted text.
- Every calculated page includes the exact synthetic disclaimer.
- Zero page resource requests, console errors and browser page errors.

Each `visual/<case>/automated-qa.json` retains full extracted page text, measured layout findings and image paths. Legacy checks live under `legacy/<fixture-kind>/`. These are new unique-run artifacts, not writes to historical V1.1 QA baselines.

## Actual visual inspection

**18/18 calculated report pages were opened individually as rasterized PDF images.** All eight legacy contact sheets were also inspected, covering **44/44 regression pages**. Total final-run pages inspected: **62**. This total excludes preliminary PDFs, duplicated unit-test packages and deliberately damaged tamper copies.

| Pages / case | Visual findings |
| --- | --- |
| A, pages 1–6 | Readable positive financial cards and full cost reconciliation; zero observed losses qualified; all-positive actual histogram; null loss-severity wording; distinct MAO policies; full provenance readable |
| B, pages 1–6 | $438.01 base profit and 47.02% modeled losses visibly distinguished; −$12,656.07 lower percentile and $7,766.83 conditional-loss magnitude readable; bin crossing zero hatched; explicit signed stress effects; no overlap/clipping |
| C, pages 1–6 | Actual overrun tail retained instead of a bell curve; −$8,781.86 P10 and $22,247.20 conditional-loss magnitude clear; P90 holding 232.5 days and P90 capital $145,772.40 visible; longer three-regime assumptions fit legibly |
| Legacy INVESTIGATE / WATCH / PASS / STRESS, Brief + Full | Existing pagination, headings/footers, tables and charts retained; no new clipping, blank pages or layout regression |

Currency remains aligned; explanatory text is left-aligned; loss signs do not rely on color; no external image/font assets are needed. Six pages avoid compressing assumptions and hash metadata into an arbitrary five-page limit. Headers/footers and synthetic notices remain consistent.

Legacy illustrative fixtures are **regression-only**, not recertified actual Monte Carlo calculations. Their historical layout, whitespace, labels and manually supplied demonstration values were intentionally preserved. The three new calculated packages are the investor-PDF integration deliverables.

## Frozen-package verification

All three packages were reopened and verified again through a separate Node process after rendering and visual inspection. The standalone read-only CLI was also exercised successfully. Every package verified eight artifact hashes and its externally anchored manifest.

| Package | Manifest SHA-256 |
| --- | --- |
| `SYNTHETIC-F499A98B-2CCE-477C-B50D-1596A2C2168C` | `93c5224b9bf8865b951dc7dab7ca999484d6ba2eabfe882bdf46a17e4afe4f03` |
| `SYNTHETIC-46FB0287-5896-4BD8-8F87-FFC1723C63A6` | `9ff5d011aa1df904bb333a76a5542bf9d8646fff6c999e35dfba4391b729a5a5` |
| `SYNTHETIC-1204E7BD-C87B-4FFC-A52C-23C92B1E2556` | `e2de176a1baa65b856b29b3c585a5c15c17e9e7775aa8ef8868cbe84341bd773` |

Report source bundle: `197d0c2f79d6b63c92b54dccfc1afbcaaeb703ffa0047ba30316e02384eaa223`. Analysis source bundle remains `94682d485c61b3027cd5c06216886c0954e9d6c08be9edc47be0ce8201c55661`.

Package verification establishes integrity relative to reviewed local code and separately trusted receipts, not cryptographic authorship or immutable storage. No signing authority exists. PDF byte identity across new generation timestamps is not promised; exact simulation identity is preserved.

## Preservation and retained iteration history

Task-level hashes cover **375 existing files**: 372 unchanged; only authorized investor report `model.js`, `html.js`, `pdf.js` changed. The calculated-report dispatch/import were removed in memory from current `html.js` and the remaining legacy source matched its original SHA-256 exactly:

`37015ca60c698883d241e8bfa8f6e30c19b1616debbe1d9825b75989335c6e7b`

The final runner independently captured and verified **311 files unchanged during certification**, including all report source, certified engine, MAO, provider/persistence/monitoring source, identity decisions/artifacts, Round 1 configuration/artifacts, migrations, dependencies, historical baseline manifests and historical V1.1 PDFs/screenshots. Certified source hashes were checked again after completion.

The provisional `2026-10-09T18-28-32-867Z` run passed 134 tests and automated PDF checks. It is retained, not overwritten. Final semantic cleanup replaced the non-operative legacy WATCH compatibility value with explicit NOT_ASSESSED, left-aligned explanatory table text, and added two package-presence/source-binding tests. The final run passed 136 tests and received new package identities/receipts. No calculation changed. The runner later received a parent-directory creation safeguard, and the read-only verification CLI was added/exercised; neither affects the frozen renderer/model source bundle or package content.

## Safety accounting and remaining gates

| Operation | Count |
| --- | ---: |
| Provider calls / page resource requests | 0 / 0 |
| Database connections / writes | 0 / 0 |
| Real-property analyses / durable Properties created | 0 / 0 |
| MLS access / Round 1 selections | 0 / 0 |
| Analyst-decision changes / authorization changes | 0 / 0 |
| Dependency installs / deployments | 0 / 0 |
| Historical baseline rewrites | 0 |

Offline Node guards and browser request interception remained enabled; no provider/database entry point was invoked. Browser background networking was disabled by the established launch flags; this is application-level accounting, not a claim of an independent OS packet-capture audit.

No real-property, licensing, investor-policy, empirical-validation, production integration or Round 1 execution gate is granted by these results. **STOP FOR STAN/CHATGPT REVIEW.**
