# Deal Analysis Cleanup Patch Completion Report

Date: 2026-09-18  
Status: PASS — surgical cleanup patch complete.

## Scope and compatibility

The four requested changes are complete. Existing RentCast behavior, Netlify/runtime handlers, Google Maps/comps, coordinates, provider evidence, identity gates, PDFs, persistence boundaries, Monte Carlo readiness and Kern scope were not expanded. The protected Sprint 3.2 analytical engine files remain byte-for-byte unchanged.

Explicit deal behavior is isolated in `src/underwriting/dealCostModel.js`, `src/underwriting/dealMetrics.js`, `src/analysis/dealBreakEven.js` and `src/analysis/dealSensitivity.js`. Legacy fixtures continue through the original model paths.

## Closing-cost correction

New/manual deals now use `acquisitionClosingCosts` (`UPFRONT` / `CASH INVESTED`) and `dispositionClosingCosts` (`DISPOSITION` / `DEDUCTED AT EXIT`). Blank values remain unknown; explicit zero is known zero. Commission stays separate and no cost is counted twice. Economics groups known costs into upfront, holding and disposition categories and lists only truly unknown categories.

Fantasia retains its legacy `escrowClosingCosts` claim and historical arithmetic exactly: $99,000 modeled profit, 57.2% cash-on-cash and $180,000 break-even.

## Deterministic diligence questions

`src/analysis/diligenceQuestions.js` generates deal-aware questions with IDs, category, trigger, materiality, related fields and `UNANSWERED` status. Questions cover acquisition support/closing, repairs and condition, valuation and comp basis, holding costs/schedule, title/lien structure and other deal costs. Manufactured/community questions appear only for manufactured/mobile/park evidence. Conventional SFR deals do not receive park questions. Bass and Joyce remain STOP/ambiguous and do not receive resolved-deal diligence.

## Holding sensitivity

Unsupported recurring holding costs now produce an unavailable row with null impact and reason `RECURRING_HOLDING_COSTS_UNKNOWN`; unavailable rows are excluded from numeric ranking and shown separately under “Sensitivity not currently measurable.” Partial supplied recurring costs are calculated only from those inputs, labeled partial, and accompanied by excluded recurring categories. Fantasia’s legacy supported rent behavior and protected sensitivity output are unchanged.

## Evidence presentation

Deal Mode now defaults to deterministic Evidence Summary categories and a prominent Additional Due Diligence Required list. Detailed field values, machine statuses, dates and source/provenance references remain available under View detailed evidence. Property Mode remains free of deal questions and analytical sections.

## Files changed

- `apps/web/src/components/Panels.jsx`, `apps/web/src/features/property-search/DealForm.jsx`, `apps/web/src/presentation.js`, `apps/web/src/styles.css`
- `src/workbench/model.js`
- New `src/analysis/diligenceQuestions.js`, `src/analysis/dealBreakEven.js`, `src/analysis/dealSensitivity.js`, `src/underwriting/dealCostModel.js`, `src/underwriting/dealMetrics.js`
- New `tests/deal-cleanup.test.js`, `scripts/qa-deal-cleanup.js`
- QA selector compatibility updates in `scripts/qa-ui.js`, `scripts/qa-runtime-ui.js`, `scripts/qa-ux-refinement.js`; optional port parsing in `scripts/workbench-server.js`
- `src/workbench/fixtures.generated.js` regenerated for shared fixture parity; no source evidence values were changed.
- `docs/DEAL_ANALYSIS_CLEANUP_QA.md` and this report.

## QA and security

`npm run sprint3.2:qa` passed: 81/81 tests, build, browser/UI, responsive UX, maps, PDFs, runtime/Netlify and security scans. `npm run deal:cleanup:qa` passed focused visual QA. Netlify fixture smoke passed with zero fixture/provider calls. PDF QA passed for Fantasia (12 pages/15 comps), Bass, Joyce and synthetic report fixtures. Secret scan passed for browser bundle, function output/zip and encoded variants. Protected-file verification passed for all 42 Sprint 3.2 files.

## Limitations and next test

No new persistence, Monte Carlo simulation, provider/API integration or PDF redesign was introduced. The next recommended manual test is a deployed conventional SFR Deal Mode review with blank, zero and populated acquisition/disposition closing costs, followed by a manufactured-home review confirming conditional community questions.

**STOP — Deal Analysis Cleanup Patch complete.**
