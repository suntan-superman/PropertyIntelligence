# PI V2.6 — Investor Report Quality Pass

## Result

**GO — locally certified for private-development review.**

The report presentation roadmap in `PI_V2_6_INVESTOR_REPORT_QUALITY_PASS_CODEX.md` is implemented. The work was report-only and offline: no provider requests, Firebase reads or writes, deployments, live-data changes, scenario saves, uploads, scans, or changes to the certified financial and Monte Carlo engines occurred.

Primary fixture: saved Decatur QA scenario `6f7b1d62-0e91-4da1-9e31-250101000101`, revision 1, bound to retained evidence snapshot `3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71`.

## Implemented presentation changes

- Headline economics now distinguish:
  - gross spread before acquisition, financing, holding, and exit costs;
  - illustrative modeled spread after entered costs; and
  - estimated net profit, which is shown only when every tracked material cost category has an entered amount.
- The first page lists material zero/unreviewed cost categories beside the financial outputs and labels returns and MAO as conditional.
- A decision-oriented status panel shows the current thesis, supported facts, assumptions/blockers, and the next five diligence actions.
- Linked supporting evidence is reconciled against scenario inputs only when the immutable document version supplies approved structured amount metadata. PI never infers amounts from PDF text or OCR.
- Structured document/input differences appear as material discrepancy alerts on the executive page and in a full reconciliation ledger.
- The exact Decatur QA fixture exposes three intended discrepancies:
  - original principal: scenario $100,000.00 vs structured document $150,000.00;
  - payoff: scenario $101,000.00 vs structured document $134,912.66; and
  - rehabilitation: scenario $35,000.00 vs structured document $30,000.00.
- Linked claims without structured amounts are explicitly labeled **Not reconciled**, not assumed to match.
- Comparable sales now support explicit `Primary`, `Secondary`, `Excluded`, and `Not classified` roles. Legacy include flags remain compatible but do not silently create a Primary set.
- Decatur's 11 included sales are candidly labeled **role not yet classified**; no comparable-derived value or supported ARV is claimed.
- The valuation hierarchy separately displays the provider as-is AVM, analyst exit assumption, and separately supported ARV status.
- Evidence tables use compact `Linked (n) · Appendix …`, `Pending`, and `None` semantics with a single legend.
- Simulation language explains that a $0 modeled delay loss reflects absent daily holding-cost inputs, not a cost-free delay.
- Full-report table widths, repeating headers, pagination, and dense sections were tightened. The package decreased from 25 to 22 pages while retaining the county notice, provenance, and all three appendices.
- The Opportunity Brief is three pages: one decision page, the required county notice, and a supporting-evidence register. Attachments remain excluded from the brief.

## Financial and evidence invariance

The saved scenario and certified calculations are unchanged:

| Measure | Certified value |
|---|---:|
| Purchase assumption | $150,000.00 |
| Rehabilitation assumption | $35,000.00 |
| Exit assumption | $240,000.00 |
| Total entered project cost | $185,000.00 |
| Illustrative modeled spread after entered costs | $55,000.00 |
| Conditional project ROI | 29.7297297297% |
| Conditional cash-on-cash | 29.7297297297% |
| Return-hurdle MAO | $169,000.00 |
| Break-even purchase | $205,000.00 |

The report model compares deterministic and Monte Carlo output before and after presentation generation. The canonical outputs are byte-for-byte equal as JSON in the automated quality harness.

## Local QA artifacts

Final QA directory:

`data/validation/pi-v2-6-investor-report-quality/run-2026-10-19T18-50-14-271Z/`

Key outputs:

- `Decatur-brief-after.pdf` — 3 pages
- `Decatur-full-after.pdf` — 22 pages, including exactly three approved synthetic appendices
- `qa-summary.json` — machine-readable certification and invariance evidence
- `visual-qa-index.html` — browser-viewable visual QA index
- `Decatur-brief-after-all-pages.png` and `Decatur-full-after-all-pages.png` — all-page montages
- `Decatur-full-before-after-first-six-pages.png` — before/after comparison
- `appendix-1-source-document-browser.png` through `appendix-3-source-document-browser.png` — legibility review of the exact synthetic source PDFs

The QA harness verifies:

- every generated page has text and no out-of-bounds text;
- no horizontal HTML overflow at the supported Letter/desktop width;
- no remote asset request;
- no private filesystem path in report HTML;
- QA warnings on the package;
- exactly three appendix covers and no fourth historical document;
- supporting-document index and investor disclaimer;
- source-document legibility; and
- deterministic and Monte Carlo invariance.

## Automated verification

- `npm run pi:v2.6:report-quality:test` — **121/121 passed**, zero skipped.
- `npm run pi:v2.6:report-quality:qa` — **PASS**.
- `npm run web:build` — **PASS** with 84 modules transformed.

The focused suite includes the V2.6 report contracts, report-model regression tests, inline-evidence and immutable-version behavior, Firestore eligibility fail-closed tests using mocks, supporting-document security, seller financial position, financial invariance, and certified Monte Carlo tests.

## Files changed

- `src/investment-workspace/report-model.js`
- `src/investment-workspace/report-html.js`
- `src/investment-workspace/report-styles.js`
- `tests/pi-v2-6-investor-report-quality.test.js`
- `scripts/pi-v2-6-investor-report-quality-qa.js`
- `package.json`

## Review boundary

This certification does not authorize public deployment or external distribution. The generated packages remain **QA / NOT FOR DISTRIBUTION**. Provider redistribution and county-notice requirements remain visible, and the synthetic attachments remain clearly identified as unauthentic test material.
