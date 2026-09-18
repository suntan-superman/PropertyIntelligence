# Foundation Sprint 3 completion report

Date: 2026-09-18. Project: `C:\Users\sjroy\Source\PropertyIntelligence`.

## Outcome and STOP decision

**GO for the local/internal, cache-backed Sprint 3 workbench and first-generation Independent Deal Review. STOP here for Stan/ChatGPT review.**

Implemented distinct Property and Deal modes, actual saved Florida fixtures, cached-address normalization/confirmation, all retained comps with a synchronized coordinate map/table, existing deterministic panels, evidence/provenance, sponsor questions, explicit manual claim scenarios, and server-generated PDFs from the same shared model.

No new RentCast calls were made. The workbench deliberately ships a cache-only address workflow: live retrieval/refresh is not enabled. This uses the specification's existing-cache path; it does not claim to resolve arbitrary new addresses. Uncached identities show an explicit no-evidence error and clear stale results.

No Monte Carlo simulation, Kern integration/enrichment, deployment, authentication, investor-package generation, customer-facing polish or Home Advisor modifications occurred. No commit was made. Pre-existing unrelated changes, including README content, were left untouched.

## Architecture and reference reuse

`React → loopback Node API → shared workbench model → preserved evidence / deterministic engine`.

The report renderer consumes that exact server-side model; the browser cannot submit arbitrary report calculations. A model fingerprint and exact `.model.json` companion accompany every PDF. React and PDF code format/display outputs, not financial calculations.

Home Advisor was inspected read-only. Reused concepts: distinct subject and numbered comp markers, fit-bounds, responsive map/table pairing, cleanup/error states, escaped HTML-to-PDF, print margins and page numbering. Did not port truncated comp subsets, generic closed-sale labels, first-result geocoding, displaced coordinates, price recommendations, marketing narrative or fixed-position report templates. See `HOME_ADVISOR_MAP_COMPS_AUDIT.md`.

Technology: React 19 + Vite 6 JavaScript; Leaflet 1.9.4 with an offline geographic graticule; lightweight native Node HTTP API; Playwright Core with installed local Chrome for PDF/browser QA; PDF.js and native canvas for page-image inspection. No Home Advisor runtime dependency exists. The initial Puppeteer candidate was removed after dependency-audit findings; final `npm audit --json` reported zero vulnerabilities.

Shared analysis context was separated from Sprint 2's import-time offline guard. Sprint 2 CLI/unit tests still enforce that guard. The existing cost engine was extended narrowly for explicit additional costs with required upfront/disposition cash timing; original fixture outputs remain unchanged. Undefined baseline ratios stay unavailable rather than becoming numeric zero comparisons.

## Files created / changed

New application files:

- `apps/web/index.html`, `apps/web/vite.config.js`
- `apps/web/src/main.jsx`, `styles.css`, `app/App.jsx`
- `apps/web/src/services/api.js`, `utils/display.js`
- `apps/web/src/features/comps-map/Comps.jsx`, `features/property-search/DealForm.jsx`
- `apps/web/src/components/Panels.jsx`

New shared/API/report files:

- `src/analysis/context.js`
- `src/workbench/model.js`, `search.js`, `server.js`, `synthetic.js`
- `src/reports/html.js`, `pdf.js`

New execution/QA files:

- `scripts/sprint3-preserve.js`, `workbench-server.js`, `report-fantasia.js`, `qa-ui.js`, `qa-reports.js`
- `tests/workbench.test.js`
- `package-lock.json`; pinned dependencies and scripts in `package.json`

Existing implementation files changed:

- `src/analysis/inputs.js`, `breakEven.js`, `scenarios.js`, `sensitivity.js`, `evidenceCompleteness.js`: reusable pure context, optional manual model context, accurate provenance and unavailable-ratio handling.
- `src/underwriting/metrics.js`: explicit additional known costs and cash timing through the existing calculation engine.
- `scripts/test-foundation.js`: writes the current test result to a new Sprint 3 path instead of overwriting the protected Sprint 2 validation artifact.
- `.gitignore`: generated web build/cache, reports and rendered QA images.

New documentation: this report, `HOME_ADVISOR_MAP_COMPS_AUDIT.md`, `SPRINT3_UI_QA_CHECKLIST.md`, `PDF_QA_CHECKLIST.md`.

Generated artifacts: `data/validation/sprint3-protected-inputs.json`, `sprint3-unit-tests.json`, `sprint3-ui-qa.json`, `sprint3-pdf-qa.json`, rendered images/contact sheets under `data/validation/sprint3-visual/`, and uniquely named reports/model snapshots under `data/reports/`.

## Security and preservation

- 36 pre-existing data artifacts hashed before implementation; all still match byte-for-byte. These include existing raw/normalized evidence, deal claims, analysis/comparisons and prior validation artifacts.
- No raw evidence, seed, Sprint 2 output or earlier validation result was regenerated/overwritten.
- Browser bundle scanned against the actual local API key and encoded form without printing either; no key or provider auth header found.
- `.env.example` is a blank template; the private value remains in ignored `.env`. Neither is loaded into browser configuration.
- API binds only `127.0.0.1`; exact Host/Origin checks, JSON-only actions, request-size limit, allowlisted routes and sanitized errors. Cross-origin actions and environment paths were rejected in QA.
- Development file serving permits only needed public vendor paths; server/evidence/environment files are not exposed as static files. HMR is disabled to avoid a separate WebSocket listener.
- Report HTML is escaped; report-browser network requests are blocked. PDFs/model snapshots use exclusive creation with unique filenames.

These controls are for an internal loopback tool, not a production authentication/deployment design.

## UI workflows and retained evidence

Single-page local route `/`, with `#analyze`, `#fixtures`, `#comps`, `#valuation`, `#economics`, `#scenarios`, `#sensitivity`, `#evidence`, `#questions`, `#sources` navigation.

1. Select Property Mode or Deal Mode, then analyze a cached address or choose a saved fixture.
2. Full confirmed Fantasia address loads directly; abbreviated/original cached identities require analyst confirmation. Confirmation does not clear a provider STOP or complete Joyce's identity.
3. Property Mode shows evidence without deal economics. Deal Mode loads saved claims and analytics; a separate manual scenario requires explicit values/origin and cannot overwrite originals.
4. Click a comp row or marker; selection is shared. Keyboard Enter/Space also activates markers. Fit-all and zoom preserve source coordinates.
5. Expand metric/evidence/provenance details; inspect deterministic scenarios and questions; Generate Deal Review PDF from Deal Mode.

Fantasia: **15 retained comps / 15 mappable comp markers**, plus a distinct subject marker. None default-filtered. Price labels are decluttered for legibility, not evidence-filtered. Close/coincident coordinates can overlap; keyboard/table selection or zoom exposes individual evidence without geographic displacement. Missing-coordinate comps remain table rows marked `Map location unavailable`; synthetic UI QA verifies 70 retained / 69 mappable rows.

Bass retains `MANUFACTURED_REPRESENTATION_STOP`; Joyce retains `ADDRESS_AMBIGUOUS`. Both provide honest unavailable-analysis reports rather than fabricated independent values. Unknown costs remain null/Unknown, never silently zero.

## Fantasia reconciliation

Confirmed address: **8426 Fantasia Park Way, Riverview, FL 33578**. Provider-reported Manufactured, 3 bedrooms / 2 bathrooms, 1,242 SF, built 2006. Original sponsor address claim remains intact.

| Figure | Displayed value / result |
| --- | --- |
| Sponsor acquisition / repairs | $160,000 / $10,000 |
| Three-month space rent / commission / escrow | $3,000 / $5,000 / $2,000 |
| Sponsor projected resale | $279,000 — supplied projection, CONFLICTING with provider range |
| Independent AVM / range | $122,000 / $40,000–$204,000 |
| Modeled break-even | $180,000 |
| Sponsor modeled proceeds / cash invested | $269,000 / $173,000 |
| Sponsor profit / CoC | $99,000 / 57.2% |
| AVM point profit / CoC | -$58,000 / -33.5% |
| AVM high profit / CoC | $24,000 / 13.9% |
| Sponsor resale minus AVM point / high | $157,000 / $75,000 |

All 21 cached deterministic scenarios match Sprint 2 exactly. Break-even and sensitivity ranking match preserved artifacts. Rent coverage remains 90 days versus the separate 120-day sponsor timeline. Tenure, park restrictions, title/condition and comp tenure remain unresolved. Every modeled return remains INCOMPLETE.

Persistent warning: **Excludes material unknown costs. This is not a fully burdened profit estimate.**

## Tests, build and visual QA

- `npm test`: **50 passed, 0 failed**; offline network guard active, zero provider calls.
- `npm run web:build`: PASS, 38 modules; production-like local JS bundle about 360 kB / 110 kB gzip.
- `npm run web:test`: PASS; built-server workflows, keyboard/table/map synchronization, laptop/narrow widths, synthetic fixtures, API security, secret scan, report-model identity and development-server smoke.
- `npm run report:test`: PASS for all five fixtures; model equality, page count, text bounds, nonblank pages, page footers, all comp addresses, repeated table headers, negative currency and neutral terminology.
- `npm run sprint3:qa`: PASS as the combined suite. Final report-only changes were followed by another passing unit/report run.
- `npm audit --json`: zero known vulnerabilities at execution time.
- Protected input preservation: PASS, 36/36.

Visual findings: no clipping, overlapping text, orphan section headings, split comp rows or unreadable tables observed in reviewed pages/contact sheets. UI top/header metrics and warnings remain readable at 1366×950 and 390×844; wide tables scroll locally. QA-driven fixes addressed keyboard marker activation, map cleanup during fixture changes, development vendor path serving, excessive raw-data duplication in PDF and sparse incomplete-report pagination.

Golden PDF: 11 pages, including a two-page complete comp table. Bass: 4 pages. Joyce: 4 pages. Synthetic long/unknowns: 5 pages. Synthetic 70 comps: 17 pages, including eight comparable-table pages. See both QA checklists and machine JSON results for image/report paths.

## Delivered Independent Deal Review

Final command-generated Fantasia PDF, **11 pages**:

`data/reports/fantasia/property-intelligence-deal-review-2026-09-18T20-17-01-090Z-b1ff0128.pdf`

Exact shared model companion:

`data/reports/fantasia/property-intelligence-deal-review-2026-09-18T20-17-01-090Z-b1ff0128.model.json`

Model fingerprint: `195e1a59d8ac7d7af22c35374ac712e8712c663416864d21e6a660f251cc1fe1`.

PDF SHA-256: `4c72c26ea2391b1e528eaee4063dacfbf06d0902bf127fb14d1d8258d6bd1783`.

The immediately preceding QA-rendered copy is `data/reports/fantasia/property-intelligence-deal-review-2026-09-18T20-16-52-349Z-2602b6ad.pdf`, from the identical model and renderer. Its page PNGs/contact sheet are in `data/validation/sprint3-visual/`. PDF binary metadata differs between generated copies; the model data is deterministic. Earlier development/QA reports were retained, not overwritten.

## Known limitations

- Cache-only address workflow; no new live provider retrieval/refresh interface. Arbitrary uncached addresses stop honestly.
- Coordinate map only, no street basemap or geocoding. No authorized static-map infrastructure was established; PDF explains its omitted map and retains coordinates/address tables. No invented imagery.
- Manual sessions are in-memory and lost at restart; generated PDF/model snapshots persist. Additional known cost is an explicit aggregate with cash timing; unresolved categories remain unknown.
- PDF summarizes evidence groups instead of duplicating raw comparable JSON; full field detail remains in the workbench and companion model.
- Local installed Chrome (or explicitly configured compatible Chromium) required for PDF/browser QA. No browser installation or deployment was performed.
- No authentication, production hardening claim, probability modeling or investment conclusion. No claim that manufactured-home comparability/tenure or actual resale proceeds are verified.

## Exact commands for Stan

From PowerShell:

```powershell
Set-Location 'C:\Users\sjroy\Source\PropertyIntelligence'
npm ci
npm run web:dev
```

Open `http://127.0.0.1:4173` (use this exact loopback host). Select **Deal Mode**, then **Florida Portfolio / Fantasia**. Use Ctrl+C to stop. Development edits require a browser reload.

For the built local app:

```powershell
npm run web:build
npm run web:start
```

For repeatable validation and a fresh uniquely named report:

```powershell
npm run sprint3:qa
npm run report:fantasia
```

Individual commands remain available: `npm test`, `npm run web:test`, `npm run report:test`. Use Node 20.19+ and installed Chrome. If Chrome is elsewhere, set `PI_CHROME_PATH` to that local executable. Do not rerun `sprint3-preserve.js`: it intentionally refuses to replace the original preservation baseline.

## Recommended next step

Stan/ChatGPT should review the workbench, the 11-page report and the unresolved sponsor questions before authorizing any further work. This is a handoff, not authorization to start another sprint. **STOP: Sprint 3 work ends here.**
