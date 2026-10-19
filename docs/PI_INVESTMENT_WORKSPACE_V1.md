# PI Investment Workspace V1 local handoff

Implemented and ready for Stan/ChatGPT local review, 2026-10-13. All three requested milestones are available: the six-property evidence workspace, local underwriting and risk scenarios, and previewable PDF reports. This is a preliminary research tool, not production integration or certified real-property investment advice.

## Launch and use

Open **http://127.0.0.1:4175/#investment** while the local server is running.

The machine's default Node is currently 20.19.4. Use the existing, verified Node 22.12.0 executable without changing global Node configuration:

```powershell
Set-Location C:\Users\sjroy\Source\PropertyIntelligence
$piNode = 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe'
& $piNode scripts/workbench-server.js --investment --port 4175
```

With Node 22.12 or newer already selected in a terminal, the normal dev command is:

```powershell
npm run web:dev -- --investment --port 4175
```

The `--investment` mode uses the existing React/Vite application and a separate loopback-only local API. It does not start PI's production runtime or load provider configuration. `--built` is rejected for this mode. Stop the server with Ctrl+C.

1. Click **Select six-property demo**, or use the search/city filter and individual checkboxes. Open one selected property.
2. Inspect **Overview**, **County / Distress**, **Property Facts**, **Sold Sales** and **Listings**. Each source retains its date/reference. Include or exclude research sales and add notes; inclusion does not certify transfer terms or set resale value.
3. Open **Underwriting**. Enter purchase, rehab and resale assumptions, then review all remaining costs. Disclosed defaults are 90 renovation days, 30 marketing days, a 15% profit-margin hurdle, and zero other costs. Zero is an editable assumption, not proof that a cost is absent.
4. The what-if summary recalculates through the existing engine. Review the full cost waterfall, return-hurdle MAO and break-even purchase ceiling. **Use AVM as starting assumption** is an explicit action, recorded in notes; the AVM never silently becomes ARV.
5. **Save locally** creates a new scenario revision. Duplicate a scenario for comparison, or start a blank scenario. The batch comparison shows saved results and withholds stale results for unsaved edits.
6. In **Risk**, enter explicit uncertainty bounds, seed, iterations and rationale. Run Monte Carlo, then save to include its results in a report.
7. In **Reports**, choose the Brief or Full Investor Report, preview the saved revision, then export its PDF. Reports distinguish retained evidence, analyst assumptions and modeled results. Mark artificial examples with the demonstration checkbox.

## Persistence and privacy

Browser drafts use the `pi-investment-workspace-v1-drafts` localStorage key, scoped to the local origin. Reloading preserves entered assumptions. Changing the port/browser changes that draft scope. Browser storage failure displays a warning to save locally before closing.

Explicit saves create append-only `<scenario-id>.r<revision>.json` files in `data/runtime/investment-workspace-v1/scenarios/`. This directory is gitignored. Original revisions remain intact. Saves reject stale revisions, changed evidence bindings, cross-property scenario moves and another property's comparable references. Reset changes the browser draft only; it does not delete saved revisions.

This is single-machine access control, not a multi-user authentication system. Anyone with access to the same OS account or local browser storage can access local research. Do not expose the port through a tunnel or reverse proxy. Raw provider payloads, source correspondence, parcel identifiers and owner/contact fields are not served to the browser. Original raw files remain in their existing private directories.

## Evidence and calculations

The original V2/V2.1 files and review decisions are read, never rewritten. The loader verifies the retained model, decisions, ledger, call log and original source bindings. It exposes six allowlisted subjects and 22 provider-reported Sale examples. Listings remain separate from completed-Sale-event evidence. The Boron subject retains its thin/older-sales limitation.

The existing `pi-flip-cents-v1` economics and `pi-monte-carlo-v1` engines calculate outputs. No MAO, Monte Carlo, identity or investor-report calculation file was edited. Acquisition debt remains acquisition-only and interest-only; MAO trials retain the scenario's LTV ratio. Dollar minimum-profit and percentage-return ceilings are shown separately. Returns are not annualized.

The V1 uncertainty editor supports triangular distributions or constants, one regime with conditionally independent residuals, and 100–20,000 iterations. It does not expose the engine's more advanced correlated-regime or risk-adjusted-MAO policy editor. Bounds and independence are analyst assumptions, not empirically calibrated probabilities. A zero observed loss frequency in a bounded simulation does not establish zero investment risk.

Reports use the existing renderer-independent report model, HTML/CSS vocabulary, detailed report pages, numeric histogram/sensitivity helpers and Puppeteer 25.12.0. The synthetic-only certified-analysis adapter remains unchanged and is not used to certify these real-property scenarios. The Brief is a compact derivative with one analytical page and one complete Kern County disclaimer page. The demonstrated Full report is 11 pages, including input/cost and research-decision appendices and the complete county notice. Every page identifies its property/scenario. No automated investment disposition is issued.

## Implementation map

| File | Responsibility |
| --- | --- |
| `apps/web/src/features/investment-workspace/Workspace.jsx` | Candidate selection, evidence sections, draft editor, scenarios, risk and report preview/export |
| `apps/web/src/features/investment-workspace/workspace.css` | Scoped navy/teal workspace styling |
| `apps/web/src/main.jsx` | Preserved existing routes; lazy application surfaces and local workspace branch |
| `apps/web/vite.config.js` | Build-time workspace flag defaults to false; no credentials or environment values exposed |
| `scripts/workbench-server.js` | Existing launcher gains isolated `--investment` mode |
| `src/investment-workspace/evidence.js` | Read-only retained-evidence verification and browser allowlist |
| `src/investment-workspace/analysis.js` | Validation and delegation to unchanged economics/MAO/Monte Carlo engines |
| `src/investment-workspace/store.js` | Private append-only scenario revisions and property/evidence binding |
| `src/investment-workspace/server.js` | Loopback API, origin/Host checks, body cap and static-file restrictions |
| `src/investment-workspace/reports.js` | Normalized report adaptation, existing template/chart reuse and network-blocked Puppeteer rendering |
| `tests/investment-workspace.test.js` | 39 focused evidence, calculation, persistence, privacy and report tests |
| `scripts/investment-workspace-qa.js` | Browser, API security, PDF layout/text/chart and preservation checks |
| `scripts/investment-workspace-regressions.js` | Complete current root test selection and isolated production build, without replacing historical QA artifacts |

Only three existing files were changed for this implementation: `main.jsx`, `vite.config.js` and `workbench-server.js`. Earlier working-tree changes were preserved. No package, lockfile, global Node, Netlify, historical protection manifest or analyst-decision change was made.

Local API surface:

| Method and path | Behavior |
| --- | --- |
| `GET /api/investment/bootstrap` | Allowlisted cached evidence, source notice and retained budget |
| `GET /api/investment/scenarios` | Latest saved local scenario revisions |
| `POST /api/investment/save` | Validate and append a local scenario revision; incomplete drafts cannot generate reports |
| `POST /api/investment/analyze` | Run unchanged engines on explicit scenario inputs; no evidence acquisition or persistence |
| `POST /api/investment/report` | Preview or render a saved valid revision by ID/version; one concurrent PDF job |

Mutation requests require the exact local Origin, JSON content type and workspace request header. Unknown production/provider APIs, raw runtime data, source documents and environment files are denied. The production build removes the workspace branch and its bundle; no public investment-workspace route or demo-data bundle was created.

## QA and sample artifacts

Node 22.12.0, Puppeteer 25.12.0, Chrome 154.0.8037.57.

- Complete current `tests/` selection: **290/290 passed**, 16 test files, **0 skipped**. Includes foundation, runtime, persistence, API, investment, Monte Carlo and existing investor-report/presentation tests. Network transports were disabled for this run.
- Focused workspace suite: **39/39 passed**, included in the 290 total.
- End-to-end/browser/API/PDF checks: **44 passed**. GABE-01 and GABE-05 each completed evidence inspection, explicit artificial assumptions, invalid-input handling, draft reload, saved reload, Monte Carlo, preview and actual browser PDF download. Duplication/reset and cross-property isolation passed.
- PDFs: two 2-page Briefs and one 11-page Full report. Text bounds, blank pages, horizontal overflow, SVG bounds and histogram count reconciliation passed. Contact sheets and full-size evidence, economics, risk, source and disclaimer pages were visually reviewed; no clipping was found.
- Preservation: **284 scoped source/evidence/decision files unchanged** across browser/PDF QA. Existing certified financial-source checks passed. Historical baseline hashes were not changed.
- Isolated production build: PASS, exit 0; workspace code/API strings and real demo addresses excluded from emitted JavaScript. Output was written to a new QA directory, not the existing application build directory.

Final machine-readable QA: [browser and PDF results](../data/runtime/investment-workspace-v1/qa-otH1Ih/qa-results.json), [complete regressions and build](../data/runtime/investment-workspace-v1/regressions-MrB9Ny/results.json). The corresponding directories retain screenshots, page renders, text/layout diagnostics, test TAP and build logs.

Private demonstration artifacts, using real retained evidence and explicitly artificial assumptions:

- [Opportunity Brief](../data/runtime/investment-workspace-v1/qa-otH1Ih/GABE-01-brief.pdf)
- [Full Investor Report](../data/runtime/investment-workspace-v1/qa-otH1Ih/GABE-01-full.pdf)
- [Alternate-subject Brief](../data/runtime/investment-workspace-v1/qa-otH1Ih/GABE-05-brief.pdf)
- [Candidate selection screenshot](../data/runtime/investment-workspace-v1/qa-otH1Ih/01-candidate-selection.png)
- [Sold evidence screenshot](../data/runtime/investment-workspace-v1/qa-otH1Ih/02-sold-evidence.png)
- [Underwriting screenshot](../data/runtime/investment-workspace-v1/qa-otH1Ih/03-underwriting.png)
- [Risk analysis screenshot](../data/runtime/investment-workspace-v1/qa-otH1Ih/04-risk-analysis.png)

Reproduce QA with the `$piNode` executable above:

```powershell
& $piNode scripts/investment-workspace-regressions.js
& $piNode scripts/investment-workspace-qa.js
```

Both commands use fresh test-owned output directories. The browser harness starts/stops its own isolated loopback server and scenario store; it does not alter an analyst's live workspace drafts. Earlier failed QA attempts remain preserved. Issues corrected during implementation included eager unrelated module loading, a dev-environment reference rejected by the existing client-security test, test-driver field clearing/download capture, and the general template's heuristic histogram. Original security tests and certified templates were not weakened or edited.

## Cost and remaining boundaries

New RentCast requests: **0**. Other provider requests: **0**. Incremental provider exposure: **$0.00**. Retained demo accounting remains **18 requests / $3.60 conservative exposure / $20.00 combined ceiling / $16.40 remaining reserve**. Actual invoiced charges remain unverified; unused quota is not assumed.

Refresh is disabled because there is no activated general workspace acquisition executor; the retained demo's one-shot reservations are already consumed. The UI shows an indicative two-request records/AVM refresh exposure of $0.40, but no request can be sent from this implementation. Sold-search refresh would need its own deliberate cap. No existing live-execution guard was bypassed.

The available candidate pool is the six retained demo subjects, not a database-wide feed. Current parcel identity, title, liens, payoff, condition, sale terms and availability remain diligence gaps. Scenarios are local analyst assumptions; comparable inclusion does not produce a verified ARV. No production database connections/writes, durable Property creation, identity approval, MLS selection, deployment or investor sharing occurred.

Next action: Stan reviews the local workflow and clearly labeled sample reports. No production integration or further acquisition is started.
