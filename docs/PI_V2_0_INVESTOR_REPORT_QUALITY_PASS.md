# PI V2.0 Investor Report Quality Pass

Date: 2026-10-15  
Status: **IMPLEMENTED — LOCAL REVIEW READY**  
Scope: Opportunity Brief and Full Investor Package presentation only

## Outcome

The report pipeline still uses the existing normalized scenario/evidence model and certified financial engines, followed by local HTML/CSS and Puppeteer PDF rendering. The presentation layer now leads with the investment hypothesis, financial dashboard, modeled cost composition, deterministic downside cases, resale-support status, and an actionable verification checklist.

No provider call, database connection, database write, production write, deployment, or financial-engine change occurred.

## Root causes corrected

| Prior issue | Root cause | Correction |
| --- | --- | --- |
| Executive page was data-dense but weak as a decision document | Raw tables led the page and unused space was not allocated to decision-critical outputs | Added a conditional hypothesis, eight-metric dashboard, cost-composition bar, downside comparison, resale-support panel, and five-item verification list |
| Sale examples could be mistaken for exit-value support | Available source-reported sales and analyst-selected comparables were not sufficiently separated | Added an explicit selected-comparable count and warning that zero selected comps leaves exit value unsupported |
| Seller balance labels could conflict with their source | Presentation trusted the evidence category more than source and verification provenance | Seller-supplied estimates and provider algorithmic estimates now receive distinct human-readable labels; neither becomes a lender payoff |
| Monte Carlo results appeared too conclusive | Positive-outcome frequency was visually prominent without equally prominent conditioning language | Headline now states observed losses under the entered ranges, followed by quantiles, omissions, and a no-forecast/no-guarantee warning |
| Internal taxonomy leaked into investor copy | Raw enum values were rendered directly | Added presentation-only human labels while retaining underlying evidence categories and revisions |
| Report identity was too generic | Footer did not carry enough immutable scenario context | Footer now includes property address, scenario name/revision, preliminary status, generation date, and page count |
| Dense or sparse fixtures could produce poor pagination | One page architecture attempted to hold variable evidence volumes | Added intentional page sections and a separate evidence appendix only when volume warrants it |

## Exact Crestview scenario preserved

The pass re-opened the saved Crestview revision at `data/runtime/investment-workspace-v1/scenarios/0f75719a-293b-4b29-bace-d3c5b71a4b20.r1.json` and compared it with fresh engine output.

| Assertion | Result |
| --- | ---: |
| Purchase assumption | $175,000 |
| Rehabilitation assumption | $15,000 |
| Exit assumption | $280,000 |
| Total modeled cost | $212,845 |
| Modeled profit | $67,155 |
| Project ROI | 31.5511287557% |
| Cash-on-cash | 34.2548904588% |
| Return-hurdle MAO | $199,783.25 |
| Break-even purchase | $241,162.56 |
| Monte Carlo | 1,000 iterations; 0 observed losses under the entered ranges |

The report does not turn the Monte Carlo observation into a success probability or investment recommendation.

## Evidence and inference boundaries

| Item | Report treatment |
| --- | --- |
| Property facts | RentCast provider-reported evidence; not independently verified |
| As-is valuation | Provider model estimate; not a renovation ARV |
| Sale research | Four source-reported Sale events; not independently verified escrow closings |
| Comparable selection | Zero selected for Crestview; exit remains an unsupported analyst assumption |
| Historical county amount | $28,025.21 historical Power-to-Sell amount; not current delinquency, payoff, foreclosure, availability, or motivation |
| Recorded mortgage | $135,000 original recorded principal; not current balance or payoff |
| Mortgage balance | $120,000 seller-reported estimate; not lender-confirmed payoff |
| Delinquent taxes | $1,200 entered evidence with its source/date |
| Other liens | Unknown; not converted to zero, so gross equity and seller proceeds remain incomplete |
| Distribution | Complete Kern County notice retained; provider evidence remains subject to applicable account terms and does not imply broader redistribution rights |

## Implementation

- `src/investment-workspace/report-model.js`: presentation model, provenance-aware seller labels, resale-support state, source-rights boundary.
- `src/investment-workspace/report-html.js`: investor hierarchy, dashboard, charts, seller page, simulation interpretation, diligence and provenance pages.
- `src/investment-workspace/report-styles.js`: print-safe report layout and page-break rules.
- `src/investment-workspace/reports.js`: scenario-bound PDF footer and safer intercepted-request shutdown.
- `tests/investment-workspace-report.test.js`: exact saved-Crestview assertions and report wording safeguards.
- `tests/pi-v2-milestone1.test.js`: provider-estimate wording aligned to provenance.
- `scripts/pi-v2-investor-report-quality-qa.js`: exact scenario, sparse, selected-comparable, no-Monte-Carlo, verified-payoff and layout-stress certification.
- `scripts/pi-v2-seller-financial-position-qa.js`: current seller-page heading detection.
- `scripts/pi-v2-milestone1-qa.js`: current workflow-stage labels and report-language assertions.
- `package.json`: focused report-quality test and QA commands.

No certified MAO, Monte Carlo, scenario, or investor-economics formula was changed.

## QA results

### Passing acceptance evidence

- Report-quality unit/regression selection: **149/149 PASS**, 0 skipped.
- Investor-report PDF certification: **43/43 PASS**.
- Exact saved-scenario engine comparison: PASS.
- MAO invariant QA: PASS, provider calls 0.
- Seller Financial Position browser/PDF QA: **18 checks PASS**.
- Monte Carlo synchronization browser QA: **24 checks PASS**.
- Production web build: PASS (`vite v6.4.3`, 66 modules).
- Visual inspection: all pages reviewed for the Crestview Brief, Crestview Full Package, sparse Boron package, and long/large/multi-lien stress package.
- Blank pages: 0.
- Out-of-bounds PDF text: 0.
- HTML/SVG overflow: 0.
- Remote renderer requests: 0.

The older all-in-one Milestone 1 browser runner was also updated for the current workflow labels, but its preview run ends during Windows Chromium process teardown with Puppeteer's `TargetCloseError`. The dedicated report renderer, seller/report browser QA, exact saved-scenario QA, and 43-check all-page certification all pass. This is recorded as a legacy QA-runner cleanup item, not concealed as a passing check.

## Review artifacts

Final artifact directory:

`data/runtime/pi-v2-investor-report-quality/qa-JV6hNL`

| Artifact | Pages | SHA-256 |
| --- | ---: | --- |
| `GABE-01-brief-quality.pdf` | 2 | `12b7b1b9d5db832b0fbb8ac27a4b0875db3eee5a5790d129acd6ec30ba67b01c` |
| `GABE-01-full-quality.pdf` | 8 | `1feea85ccb0f42f70f0132d3339e2963029f08975807c40264d646a4e9f1bd2d` |
| `GABE-05-sparse-full-quality.pdf` | 6 | `d7d362a02771492f77aec8f23227af93b94fa9c5d8d8c3b52fc498b8e94cbe65` |
| `QA-layout-stress-full-quality.pdf` | 8 | `304e44b1d1abd3ca072d1880b6ab7d9c9a985bfc519f9548a5dfb2fc1acbccd6` |

The directory also contains every page as PNG, all-page contact sheets, HTML renderings, layout diagnostics, four before/after comparisons, a visual index, and the machine-readable `qa-results.json`.

## Local review commands

Run the application:

```powershell
Set-Location C:\Users\sjroy\Source\PropertyIntelligence
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts\workbench-server.js --port 4175
```

Open the generated visual review index:

```powershell
Start-Process C:\Users\sjroy\Source\PropertyIntelligence\data\runtime\pi-v2-investor-report-quality\qa-JV6hNL\visual-qa-index.html
```

Re-run the focused checks:

```powershell
npm run pi:v2:report-quality:test
npm run pi:v2:report-quality:qa -- --baseline=data/runtime/pi-v2-investor-report-quality/baseline-6tIQQv
```

## Remaining diligence gaps

- Crestview's four reported sales still require closing/transfer and condition verification.
- No sale is selected as a comparable, so the $280,000 exit is not supported as an adjusted ARV.
- Current title, all lien priority/release evidence, and lender-confirmed payoff remain unresolved.
- True seller equity and seller proceeds remain unknown while material obligations are unknown.
- Property condition and contractor-backed rehabilitation scope remain unverified.
- The report remains preliminary underwriting, not appraisal, title verification, legal advice, or investment advice.

## Final classification

**INVESTOR REPORT QUALITY PASS IMPLEMENTED — LOCAL REVIEW READY**

Stop for Stan/ChatGPT review. No production deployment was performed.
