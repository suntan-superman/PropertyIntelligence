# PI V2.6.2 Evidence Reconciliation Acceptance and Milestone Closure

Date: 2026-10-19  
Classification: **PI V2.6.2 ACCEPTED FOR PRIVATE DEVELOPMENT**  
Scope: isolated local certification only; no deployment or live Firebase/provider activity

## Acceptance result

The existing synthetic QA state for **400 Decatur St, Bakersfield, CA 93308** was cloned into the local report harness. The original saved Decatur scenario and immutable document fixtures were read without mutation. Analyst-confirmed transcriptions were associated with their exact evidence claims and immutable version 1 source documents.

| Evidence claim | Scenario amount | Document amount | Signed difference | Source | Result |
| --- | ---: | ---: | ---: | --- | --- |
| Original recorded mortgage amount | $100,000.00 | $150,000.00 | +$50,000.00 | Appendix 1, page 1 | Difference — review |
| Verified payoff | $101,000.00 | $134,912.66 | +$33,912.66 | Appendix 2, page 1 | Difference — review |
| Estimated rehabilitation cost | $35,000.00 | $30,000.00 | -$5,000.00 | Appendix 3, page 1 | Difference — review |

Each amount was confirmed against text on the recorded source page. The original-principal and payoff documents were also linked to the estimated mortgage-balance claim, but no structured amount was assigned to that semantically different claim; both rows correctly remain **Not reconciled — no structured document amount**. No scenario or underwriting amount was automatically updated.

## Corrections made during acceptance

1. The rehabilitation fixture mapping was corrected from source page 2 to source page 1, where the synthetic $30,000 total actually appears. The QA harness now verifies each amount string against the selected PDF page before report generation.
2. Missing-page validation was corrected in `report-model.js`. A null page previously became numeric zero through JavaScript coercion and could be treated as an integer locator. Reconciliation now accepts only positive integer page numbers, or an explicit source note, and otherwise fails closed as not reconciled.

No certified underwriting, MAO, financial, or Monte Carlo engine was changed.

## Behavior and security coverage

Focused regression coverage passed for:

- Difference — review with signed arithmetic.
- Amounts match — authenticity unverified.
- Not reconciled when no structured document amount exists.
- Rejection of an incorrect semantic claim type.
- Missing source-page/source-note handling.
- Superseded immutable-version exclusion.
- Confidential-document exclusion.
- No automatic elevation of document authenticity or evidence verification.

The focused suite passed **9/9**. The complete relevant Node test run passed **125/125**, and the production build completed under Node **22.12.0** (84 transformed modules).

## Generated reports

- Opportunity Brief: `Decatur-brief-after.pdf`, 3 pages, SHA-256 `f60a17f6d4f43512eda1119e2fa95ddc51b6cc65fabdaa2cbad34f5c727eda35`
- Full Investor Package: `Decatur-full-after.pdf`, 21 pages, including 9 appendix pages, SHA-256 `b963a16760a30838e941ec42966a22dd8e64a6f6fe2dadded4848adf78e18e0d`
- Evidence reconciliation screenshot: `Decatur-evidence-reconciliation-table.png`
- Machine-readable result: `qa-summary.json`
- Focused test transcript: `focused-test-results.txt`

The report run is stored at:

`data/validation/pi-v2-6-2-report-rendering-evidence/run-2026-10-19T20-02-43-905Z`

An earlier passing run produced by the PowerShell/npm Node 20 shim is preserved at `run-2026-10-19T20-00-30-965Z` but is superseded for certification. The final run was executed explicitly with Node 22.12.0.

## Visual inspection

Every generated page was inspected:

- Opportunity Brief pages 1–3: complete, readable, correctly labeled QA / NOT FOR DISTRIBUTION.
- Full Investor Package pages 1–12: no horizontal overflow, broken currency, broken filename wrapping, blank page, or nearly empty generated-analysis page.
- Full Investor Package page 8: all three differences, signed deltas, and source page 1 references are legible.
- Pages 13–21: three provenance covers and six original synthetic source pages appear in the correct order; page numbers and warnings are legible; no duplicate or fourth appendix appears.

PDF.js correctly rendered the generated report pages but did not paint the embedded source-document pages in its PNG raster helper. Those appended pages were therefore independently inspected in Chromium's PDF viewer. This was a QA renderer limitation, not a defect in the assembled PDF.

## Financial and Monte Carlo invariance

Canonical before/after projections are equal. Preserved headline values include:

- Acquisition assumption: $150,000.00
- Rehabilitation assumption: $35,000.00
- Resale assumption: $240,000.00
- Total entered project cost: $185,000.00
- Illustrative modeled spread: $55,000.00
- Project ROI and cash-on-cash return: 29.7297297%
- Return-hurdle MAO: $169,000.00
- Break-even ceiling: $205,000.00
- Monte Carlo seed/outcomes: seed 12345; 1,000 accepted; 0 discarded
- Monte Carlo mean / median profit: $56,565.61 / $56,753.88
- P10 / P90 profit: $47,362.32 / $65,336.81
- Observed loss frequency within the entered bounded model: 0/1,000

The source QA scenario SHA-256 remained `8e35a824cca371e35c6d5d914415a6c8084df9aceaeebedf2073a1a7ac6ea831`.

## Operation accounting

| Operation | Count |
| --- | ---: |
| Provider requests | 0 |
| Firebase reads | 0 |
| Firebase writes | 0 |
| Cloud Storage reads | 0 |
| Cloud Storage writes | 0 |
| Deployments | 0 |
| Live-data changes | 0 |

All analyst transcriptions existed only in isolated mock QA state. Original Decatur property evidence, saved revisions, report history, and live Firestore records were not changed.

## Closure

The acceptance criterion is satisfied: PI identifies the three material, analyst-confirmed document/input differences, presents them clearly with accurate source-page references, preserves document associations, and leaves all financial and Monte Carlo calculations unchanged.

**PI V2.6.2 is ACCEPTED FOR PRIVATE DEVELOPMENT.** No V2.6.3 or infrastructure milestone was initiated.
