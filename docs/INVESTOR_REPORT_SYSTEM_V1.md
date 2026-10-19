# Investor Report System v1

## Rendering architecture

The report data contract is in `src/reports/investor-v1/model.js`; it does not import a browser, template, or PDF package. The flow is:

`normalized report JSON → HTML/CSS → Puppeteer/Chromium → PDF`

`src/reports/investor-v1/html.js` renders the Investor Opportunity Brief and Full Due-Diligence Report. `src/reports/investor-v1/pdf.js` owns PDF-only concerns. This boundary allows the normalized contract to later support a web report, portal, or mobile presentation without changing its data model.

### Home Advisor inspection (read-only)

The Home Advisor implementation uses Puppeteer `24.40.0` (package range `^24.40.0`; lock resolves `24.40.0`) and `pdf-lib` for page-count inspection. It launches headless Chromium with an optional `PUPPETEER_EXECUTABLE_PATH`, `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, and font-render hinting; it uses a 1280×1660 viewport and Letter PDFs. Its HTML/CSS is assembled from server-side templates, with `@page` Letter sizing, content-level headers/footers, explicit page breaks, and `break-inside: avoid` for cards/tables. Fonts are system stacks (Segoe UI/Aptos/Helvetica/Arial, Georgia/Times); images are embedded or supplied as URLs. No chart implementation or dedicated renderer test suite was found; the renderer checks PDF page count.

PI adopts the Puppeteer version, headless Chromium configuration, Letter page format, system-font strategy, explicit print CSS, HTML-to-PDF pipeline, and browser cleanup pattern. PI uses Puppeteer's generated header/footer templates, local SVG charts, strict request blocking, no remote images/fonts, PDF.js-based text/page/layout QA, and synthetic fixtures. Home Advisor was not modified. Playwright remains a development dependency only because the separate PI browser/UI regression scripts use its routing and browser-context APIs; PI PDF generation now uses Puppeteer.

Runtime note: following the separate authorized migration certification, the current candidate declares Node `>=22.12.0`, Puppeteer `25.12.0`, and `source-map-js` `1.2.2`. This report-presentation sprint did not change those dependencies or deploy application code.

## Normalized model

The v1 model includes report metadata/versioning, property identity/attributes, selection rationale, PI disposition, distress events, valuation, comparables, recorded mortgages, separately modeled mortgages, equity, encumbrances/title-review status, transactions, assumptions, deterministic economics/MAO, Monte Carlo outputs, risks, diligence, evidence, and disclaimer. `INVESTIGATE`, `WATCH`, and `PASS` are the only PI dispositions. No `BUY` disposition exists.

Each evidence datum retains `value`, `source`, `classification`, `asOf`, `retrievedAt`, `status`, `confidence`, and `notes`. Classifications are `RECORDED / VERIFIED`, `PROVIDER ESTIMATE`, `PI CALCULATION`, `INVESTOR ASSUMPTION`, and `UNKNOWN / REQUIRES VERIFICATION`. Source-result statuses distinguish returned, not returned, not checked, unavailable, and requiring verification. An explicit numeric zero is retained. Missing evidence is never rendered as proof that no record exists; an unchecked title is not described as clear. The normalizer picks allowlisted fields, rejects sensitive keys/values, freezes the result, and adds a stable model fingerprint.

## Reports

- **Investor Opportunity Brief V1.1:** exactly three pages: investment snapshot with value, modeled debt, apparent equity, distress and MAO; identity/distress/valuation/comparables/recorded and modeled mortgage evidence; economics, assumptions, Monte Carlo distribution and percentiles, sensitivity ranking, diligence, and deal-kill factors.
- **Full Due-Diligence Report V1.1:** eight composed pages: executive opportunity; identity/distress; transaction/mortgage/encumbrances; valuation/comparables; economics; Monte Carlo risk; decision/diligence with a dynamically classified Known/Estimated/Unknown matrix; and sources/methodology. Empty evidence is labeled honestly where absence/status is decision-relevant. Normalized provenance remains complete; inline investor-facing provenance is concise.

Both use a restrained navy/slate/teal visual system, Letter print dimensions, approximately 10 pt body copy, print-aware tables/cards, an SVG Monte Carlo histogram with loss/profit regions, zero reference and supplied P10/P50/P90 markers, relative sensitivity bars labeled with their unspecified source units, Property Intelligence/Workside footer, page numbering, report/model versions, evidence cutoff, assumption/scoring/simulation versions, and a screening-not-advice disclaimer. All displayed headline financial amounts use currency formatting. The stress QA fixture remains a valid `PASS` disposition; no `STRESS` disposition was added.

## Synthetic fixture and QA commands

Four clearly synthetic development fixtures cover `INVESTIGATE`, `WATCH`, `PASS`, and a deliberately difficult stress case represented with the existing `PASS` disposition; they are not real opportunities or provider records. No production/database loading, evidence refresh, or provider call is part of this subsystem.

```powershell
npm run report:investor-v1:test
npm run report:investor-v1:qa
```

QA creates eight PDFs (brief and full for all four synthetic cases), renders every page to PNG, and builds visual contact sheets in `data/validation/investor-report-v1/v1.1/`. It checks page counts (brief exactly 3; full 7–10), extracted text and forbidden tokens, nonblank/sparse pages, text bounds, DOM page/table overflow, orphan headings, histogram presence and clipping, headline currency, and provider/network calls. The certified V1.1 samples are `PI_INVESTOR_OPPORTUNITY_BRIEF_V1_1.pdf` and `PI_FULL_DUE_DILIGENCE_REPORT_V1_1.pdf`. The existing `npm run report:investment:test` and `npm run report:investment:qa` suites continue to protect legacy investment-report behavior.

PDF generation is exposed as `renderInvestorPdf(normalizedModel, {kind, outputPath})`; callers must supply a normalized report model. This v1 change does not add a production report API, load production opportunity/property data, change report persistence, or deploy application code.
