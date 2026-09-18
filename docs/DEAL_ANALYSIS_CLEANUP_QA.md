# Deal Analysis Cleanup Patch QA

Date: 2026-09-18  
Scope: surgical Deal Mode correctness and presentation cleanup. No provider calls were made.

## Focused compatibility checks

- New/manual deals accept separate `acquisitionClosingCosts` and `dispositionClosingCosts` with explicit timing.
- Blank closing inputs remain `UNKNOWN`/`null`; explicit zero remains known zero.
- Acquisition closing costs increase upfront cash invested; disposition closing costs reduce exit proceeds; commission remains separate.
- Legacy Fantasia `escrowClosingCosts` remains the original sale-closing claim and preserves $99,000 modeled profit, 57.2% CoC and $180,000 break-even.
- Deterministic questions are generated from relevant claims/evidence only, with manufactured/community questions conditional on manufactured evidence.
- Unsupported holding sensitivity returns `UNAVAILABLE`, `profitImpact: null`, and `RECURRING_HOLDING_COSTS_UNKNOWN`; it is excluded from numeric ranking. Partial holding is labeled and lists excluded recurring categories.
- Deal Mode defaults to Evidence Summary plus Additional Due Diligence; exact field/source/status evidence remains under View detailed evidence.

## Visual QA

`npm run deal:cleanup:qa` passed at desktop and 390px. It covered Fantasia questions, evidence summary, detailed evidence expansion, blank closing/holding unknowns, explicit closing timing, partial holding, responsive layout, Bass STOP and Joyce ambiguity. Output is recorded in `data/validation/deal-cleanup-visual-qa.json` with screenshots under `data/validation/deal-cleanup-visual/`.

## Regression suite

`npm run sprint3.2:qa` passed:

- 81/81 unit and compatibility tests, zero provider calls.
- Production web build and browser UI QA.
- UX viewport QA at 1366/1024/768/390px.
- Google/offline map QA and all retained comps.
- Fantasia/Bass/Joyce and synthetic PDF QA.
- Netlify/runtime tests and local Netlify fixture smoke.
- Runtime UI and secret/security scans.
- 42 protected Sprint 3.2 files unchanged byte-for-byte.

The Sprint 3.2 analytical engine files remain protected; explicit deal behavior is isolated in new adapter modules.
