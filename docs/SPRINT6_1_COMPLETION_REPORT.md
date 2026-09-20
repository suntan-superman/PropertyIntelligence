# Sprint 6.1 completion report — 2026-09-20

**Status: LOCAL PDF AND PREVIEW BOUNDARIES CERTIFIED — STOP FOR STAN/CHATGPT REVIEW.**

The Full Investment Analysis report is implemented as a presentation of exact linked snapshots. Production was not deployed. Existing saved decisions have a documented historical-link limitation; see the production recommendation below.

## Reference audit and renderer

Home Advisor was inspected first, starting in apps/web and following its export URLs to the API renderer. It uses server Puppeteer HTML, explicit continuation sections and pdf-lib page counts; the web app itself has no PDF renderer. Findings are in HOME_ADVISOR_PDF_AUDIT.md. Useful patterns were adapted; Home Advisor was not modified and no cross-project runtime imports exist. PI retains installed Playwright/Chromium and PDF.js/canvas QA. No dependencies or schema migrations were introduced.

## Implementation

- `src/reports/investment/model.js`: immutable, normalized model; exact Property/Deal/Evidence/Analysis/Decision reference validation; reconciliation STOPs; provenance/security filtering; generation-time-independent SHA-256 fingerprint.
- `src/reports/investment/html.js` and `pdf.js`: separate investment template, all twelve requested sections and appendices, bounded Letter pagination, repeated section/table headings, page X/Y, long-cell continuation, valuation and negotiation graphics with text equivalents.
- `src/services/investmentReportService.js`: exact-ID SQL loading; optional existing reports metadata and audit_events payload in one transaction after rendering.
- Shared API GET `/api/acquisition-decisions/:id/investment-report`, GET `/api/reports/investment/capability`, and POST `/api/reports/investment` accepting decisionId only plus optional metadata flag. Client analytical payloads are rejected.
- Local server wires the existing browser renderer. Saved-decision control loads historical choices and downloads locally where capability/linkage permit. Existing Deal Review remains separate.
- `tests/fixtures/investment.js`, `tests/investment-report.test.js`, `scripts/qa-investment-report.js`, `qa-investment-postgres.js`, `qa-investment-preview.js` and `inspect-investment-links.js` provide fixture, reconciliation, historical, SQL and runtime certification.
- Added report:investment:test, report:investment:qa and sprint6.1:qa commands. Architecture, model and visual findings are documented separately.

## Data and reconciliation

MAO, Walk-Away, Target, hurdle type/rate, known encumbrances and unknown count equal Decision outputs and are checked against persisted scalar columns. Profit, cash invested, cash-on-cash, proceeds and break-even equal Analysis outputs and scalar columns. Valuation comes only from linked Evidence; all retained comps are queried by that Evidence ID and remain in the model/appendix. The nearest eight supplied distances select the primary table with a deterministic tie-break; no inferred comparability ranking.

No report-specific economics, new scenarios, provider calls or missing-value inference. Explicit zero and unknown remain distinct. Condition, encumbrances and decision diligence come from embedded historical decision content; current property-history helpers are not used. Later unlinked condition/diligence is explicitly excluded rather than silently attached. No online images/maps are fetched.

## QA results

- Fifteen synthetic fixtures passed rendering and reconciliation. Complete: **8 pages, 101,937 bytes, 692 ms**. Sparse/minimal: 6 pages; long legal: 14; 95 diligence questions: 14; long sources: 10; 65-item rehab: 34. Full metrics in `data/validation/sprint6_1-pdf-qa.json`.
- Complete, sparse and long-content binary reports passed the shared local API with synthetic ID-indexed data. PDF.js verified page counts, text bounds, footer numbers, all 15 comps, final long-content markers and credential patterns. All pages rasterized; complete/sparse contact sheets and full-size MAO/legal pages visually inspected.
- 19 report unit cases passed; full suite **112/112** passed. MAO, workbench, responsive UX, Google-map/offline fallback, Netlify runtime and all existing PDF regressions passed. Existing PDFs: Fantasia 12 pages/15 comps, Bass/Joyce 4 pages, synthetic long 6 pages, 70 comps 18 pages.
- Final pagination refinements reran all 15 PDF fixtures plus three local API reports successfully. Existing 351-file protection baseline remains byte-for-byte unchanged, including old PDFs, analysis/underwriting and migrations.
- Repository-double historical test generated #1, added #2/new evidence and regenerated identical #1 model/fingerprint through a separate service wrapper.
- Actual PostgreSQL rollback-only certification passed with a unique synthetic tag: `SPRINT6_1_REPORT_QA_2b2ea454-99bf-4bdd-8536-698580fa4d44`. Real SQL loader retained 15 comps, rendered eight pages, validated metadata/audit persistence and unchanged #1 after #2. Deliberate rollback and subsequent absence check passed. No committed QA data or existing records changed. This is transaction-level SQL certification, not a claim of committed separate-connection history testing.
- Automated RentCast/provider calls: **0**. Browser runtime reporting network requests are aborted; report rendering blocks all external requests. Protected prior test provider doubles remain synthetic.

## Preview and security

Deploy ID: **6ab061f7588dbc7d7fb59f6b**.

URL: https://6ab061f7588dbc7d7fb59f6b--worksidepropertyintelligence.netlify.app

- Health: runtime netlify, PostgreSQL configured and persistence available.
- Investment capability: model available, PDF browser unavailable. Cloud binary generation remains explicitly local-only; no Chromium packaging workaround added. Deployed complete/sparse/long binary PDFs were not run because this runtime does not support them, as allowed by the specification.
- Preview certified historical-link rejection against an existing saved decision, ID-only request validation, invalid IDs, visible report-control bundle and provider-free browser loading.
- Browser credential scan PASS; actual-key/encoded-key runtime scan PASS; built Function ZIP scan PASS (276,974 bytes); sanitized Function-log scan PASS (exit 0, nine lines, no credential/provider-request patterns). No raw logs or credentials included in reports. No Home Advisor runtime references in source/build.
- Machine results: `data/validation/sprint6_1-preview.json`, `sprint6_1-durable-links.json`, `sprint6_1-postgres-qa.json`, and existing runtime/security QA artifacts.

## Limitations and recommendation

Read-only inspection found **six existing Acquisition Decisions; none has analysis_snapshot_id**. Requests for these correctly STOP with REPORT_HISTORICAL_LINK_REQUIRED. The report never chooses a latest Analysis or backfills a historical relationship. Separate condition assessments also lack an immutable Decision reference; only embedded decision rehab/condition is eligible. Existing acquisition save behavior was not changed.

**GO for review of the local reporting foundation and preview API/UI boundaries. NO-GO for claiming the current saved decisions or hosted runtime can produce a complete production Investment Analysis PDF.** Historical linkage must be explicitly established through a separately reviewed persistence workflow; hosted PDF rendering remains a documented capability limitation. Production application deployment requires separate authorization after review of these limits.

Short Acquisition Summary remains future groundwork. No analytical/provider/Kern/Monte Carlo, address automation, title, outreach or additional sprint work was performed.

**STOP for Stan/ChatGPT review before production.**
