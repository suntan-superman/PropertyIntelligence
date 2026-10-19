# PI Investment Workspace V1.1 report quality handoff

Implemented for local review on October 13, 2026. The Brief now presents the investment hypothesis, entered assumptions, modeled economics, complete retained sale research and immediate diligence questions on its first page. The six real-subject Full Reports are six pages instead of the prior eleven-page sample. Both formats retain the complete county disclaimer.

The local workspace is running at **http://127.0.0.1:4175/#investment** with the updated renderer. Reload the workspace and preview a saved scenario before exporting. Existing scenarios and revisions are unchanged. No provider calls, database connections, deployment or financial-engine changes were made.

## Review PDFs

These are real retained research subjects with **artificial demonstration financial assumptions**, not actual investment recommendations. Comparable selections in these QA scenarios do not change any analyst identity decisions.

| Subject and evidence case | Opportunity Brief | Full Investor Report |
| --- | --- | --- |
| GABE-01, four sales with one included | [2 pages](../data/runtime/investment-workspace-v1-1/qa-cKO4uj/GABE-01-brief.pdf) | [6 pages](../data/runtime/investment-workspace-v1-1/qa-cKO4uj/GABE-01-full.pdf) |
| GABE-04, low-price example excluded with rationale | [2 pages](../data/runtime/investment-workspace-v1-1/qa-cKO4uj/GABE-04-brief.pdf) | [6 pages](../data/runtime/investment-workspace-v1-1/qa-cKO4uj/GABE-04-full.pdf) |
| GABE-05, two older sales and no selected examples | [2 pages](../data/runtime/investment-workspace-v1-1/qa-cKO4uj/GABE-05-brief.pdf) | [6 pages](../data/runtime/investment-workspace-v1-1/qa-cKO4uj/GABE-05-full.pdf) |

[All six subjects, edge cases and page images](../data/runtime/investment-workspace-v1-1/qa-cKO4uj/visual-index.html). This private, gitignored index contains 18 PDFs and 70 page renders at 816 × 1056 pixels, plus two-page contact sheets. The `QA-*` files deliberately remove evidence or set explicit zero assumptions to test missing-data behavior; they are **not additional vendor observations and must not be distributed as property research**.

## Corrections

- Condition and seller motivation remain UNKNOWN. Preliminary address review is separate from legal parcel identity, ownership/title and liens.
- Property characteristics are provider-reported facts, not valuation estimates or independently verified facts. The AVM is a provider model estimate; the county amount is a historical county record. Missing values remain unknown, including in the source summary.
- All retained Sale examples appear with Included in analyst analysis, Not selected or Excluded status. Full reports retain addresses, price/date, type, size, distance, beds/baths, source comparability findings and analyst rationale. Inclusion does not feed an automatic ARV calculation.
- The single selected GABE-01 sale explicitly cannot independently validate the AVM. Low-price examples warn about unverified transfer terms and condition. Boron is labeled Thin/older evidence. Active/inactive listings never become closing-price evidence.
- Monte Carlo displays counts and conditional simulated frequencies, immediately qualified as not a forecast of actual investment risk. Numeric histogram boundaries/counts remain unchanged. Sensitivity labels have separate columns, with exact underlying paired outputs preserved; unequal stresses are not presented as comparable probabilities or causal rankings.
- The Brief uses a grouped cost summary and distinct purchase, resale, project ROI, hurdle-specific MAO and break-even labels. The Full Report retains every entered cost and detailed calculated line, sources, dates, scenario revision, seed, distributions and model versions. Empty mortgage/encumbrance tables are replaced with one not-checked statement.

## Financial preservation

All nine matrix scenarios match their pre-edit **complete financial and Monte Carlo outputs exactly**, not only rounded displayed values. The sample remains: $59,080 profit, $240,920 total project cost, 24.5% displayed ROI, $194,080 MAO under a 15% profit/gross-sale hurdle, and $239,080 break-even purchase ceiling. Neither ceiling is a recommended bid; neither is the $180,000 purchase assumption or the $291,000 AVM.

The original economics, MAO, Monte Carlo, identity and synthetic investor-report adapters were not edited. The existing Puppeteer renderer's launch/PDF settings are unchanged. The workspace's new normalized presentation model is independent of Puppeteer and retains full-precision analysis alongside its typed evidence.

## QA results

| Verification | Result |
| --- | --- |
| Complete current root regression selection | **313/313 PASS**, 17 files, zero skipped |
| Focused workspace and report tests, included above | **62/62 PASS** |
| Existing browser, save/reload, preview/download and access-security checks | **44 PASS** |
| Cross-property report, text, layout, chart, disclaimer and preservation checks | **180 PASS** |
| Production build | PASS; local workspace remains excluded |
| Pre-edit source and evidence comparison | 5,022 original files unchanged; only the existing workspace `reports.js` intentionally changed among the 5,023 captured files |
| New provider calls / database connections / deployment | **0 / 0 / 0** |

Evidence: [final regressions and build](../data/runtime/investment-workspace-v1/regressions-Zxsn9i/results.json), [browser QA](../data/runtime/investment-workspace-v1/qa-UCbJFs/qa-results.json), [report matrix QA](../data/runtime/investment-workspace-v1-1/qa-cKO4uj/qa-results.json), [pre-change financial outputs](../data/runtime/investment-workspace-v1-1/before-s49c2k/financial-outputs.json).

Every generated matrix page was visually reviewed at normal reading scale, including tables, chart labels and the legal attachment. In the final regeneration, 61 page PNGs were byte-identical to the already reviewed renders; the nine changed methodology pages were reviewed again. No clipping, overflowing text/SVGs, blank spill pages or orphan headings were observed. Sparse edge cases retain less content rather than padded comparable rows. Their risk section is omitted when no simulation is requested. Long analyst notes may naturally add pages; the renderer does not enforce a fixed page count or discard text.

Earlier failed layout runs remain in separate private directories. The first passes revealed spill pages and a PDF extraction whitespace issue at line-wrap hyphens. Spacing and repeated copy were corrected; complete disclaimer checks compare exact HTML text and all non-whitespace PDF characters. No historical baseline or old PDF was overwritten to obtain a pass.

Runtime used: Node 22.12.0, existing Puppeteer 25.12.0, Chrome 154.0.8037.57. No dependency or runtime installation/change.

## Exact implementation changes

| Path | Change |
| --- | --- |
| `src/investment-workspace/reports.js` | Existing export surface delegates to V1.1 presentation; existing Puppeteer renderer preserved |
| `src/investment-workspace/report-model.js` | New renderer-independent typed evidence and scenario presentation model |
| `src/investment-workspace/report-html.js` | New executive/full layouts, complete research selection visibility and qualified simulation wording |
| `src/investment-workspace/report-styles.js` | New local print stylesheet, compact tables, legible sensitivity layout and safe page breaks |
| `tests/investment-workspace.test.js` | Existing report assertions updated for truthful types and all-research visibility; other safeguards retained |
| `tests/investment-workspace-report.test.js` | New focused presentation/evidence regression tests |
| `tests/fixtures/workspaceReports.js` | New artificial scenario and missing-data matrix; real evidence still loaded privately |
| `scripts/investment-workspace-report-qa.js` | New ordinary PDF QA command using fresh private output directories and pre-edit drift comparison |
| `docs/PI_INVESTMENT_WORKSPACE_V1_1_REPORT_QUALITY.md` | This handoff |

No UI redesign, application routes, scenario-store changes, new approval framework, protected-baseline edits or provider/database integration were introduced. The local-only server was restarted to load the report changes; existing source packets, review decisions, frozen PDFs and saved scenarios were preserved. Private pre-edit capture tooling and generated QA outputs reside under the existing ignored runtime tree.

## What Gabe can and cannot infer

Gabe can inspect the deal hypothesis, historical county context, provider-reported characteristics and sales, analyst choices, and the economic consequences of explicit assumptions. He cannot infer verified parcel identity, ownership, clear title, current payoff, actual condition, seller willingness, a validated ARV, an appropriate bid, or a calibrated real-world probability of profit.

Remaining work is property diligence and human review, not additional data acquisition under this task. Keep every county-derived report together with its complete disclaimer. Stop for Stan/ChatGPT review.
