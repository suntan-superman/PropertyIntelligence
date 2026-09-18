# Workbench UX refinement QA

Date: 2026-09-18. Scope: presentation and information hierarchy only. Provider calls: 0.

## Visual review

`npm run ux:qa` completed PASS at 1366, 1024, 768 and 390px. Screenshots are in `data/validation/sprint3_2-ux-visual/`:

- `fantasia-property-1366.png`, `fantasia-property-1024.png`, `fantasia-property-768.png`, `fantasia-property-390.png`
- `fantasia-deal-1366.png`

Property Mode was checked for overview → valuation → comps/map → Property Details → evidence → sources ordering, no deal-only sections, live anchor targets, 15 retained comps, expanded dated records, grouped evidence and no page-level horizontal overflow. Deal Mode retains economics, scenarios, sensitivity and sponsor questions when analytical output exists.

The repository does not contain a persisted Mainsail fixture. The QA therefore uses the preserved Fantasia cached model as the available evidence regression and exercises the same generic live-property component path through the existing UI/runtime tests. No Mainsail values were added or hard-coded. A deployed Mainsail result should be reviewed once available using the same four viewport sizes.

## Regression coverage

- Fantasia: Property Mode, Deal Mode, conflicting valuation, 15 comps, manufactured-home caution, evidence details and source details.
- Bass: `SOURCE_STOP` preserved; display reads “Property representation needs verification.”
- Joyce: `AMBIGUOUS` preserved; display reads “Address needs confirmation.”
- Synthetic missing-heavy and 70-comp cases remain covered by existing browser/PDF QA.
- Map implementation, map/table selection, overlap controls, coordinates and offline fallback were not modified; existing map QA remains PASS.
- PDF analytical model/layout was not modified; all five existing PDF cases remain PASS.

## Presentation assertions

The new presentation adapter is covered by `tests/presentation.test.js`: centralized key/status mappings, contextual missing labels, zero/false preservation, evidence grouping, comparable aggregation and view-model property facts. Raw machine keys and provenance remain available under “View source details”; `comps[n]` is not rendered as a primary evidence row.

Known limitation: features, legal description and zoning are shown when present in the supplied view model/evidence. Existing Fantasia cached evidence has no independent value for those fields, so the panel correctly says “Not available from current evidence.”
