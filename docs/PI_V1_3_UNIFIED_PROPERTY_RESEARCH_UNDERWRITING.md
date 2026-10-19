# PI V1.3 Unified Property Research and Underwriting

**Local implementation status:** Complete and offline-certified on October 13, 2026 (America/Los_Angeles). No deployment, provider call, database connection, database write, durable Property creation or MLS action occurred.

V1.3 connects the retained V1.2 Property Detail and V1.1 Investment Workspace into one subject-bound workflow: property evidence, analyst assumptions, calculated economics and risk, and report export. It preserves the existing evidence snapshots and financial engines.

## Local launch

URL: `http://127.0.0.1:4176/#property-detail`

PowerShell command from the repository root:

```powershell
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' scripts/workbench-server.js --investment --property-detail --port 4176
```

The current local server responds on loopback with seven retained subjects and zero new requests.

## Implemented workflow

- Property Detail now leads with **Analyze Investment Opportunity** and binds the exact selected subject and evidence fingerprint to the existing workspace. Legacy Deal Mode remains a secondary link and its existing route is unchanged.
- Workspace routes can include a scenario ID. Scenario selection, save/reopen, browser back navigation and batch comparison retain the original subject and evidence cutoff. Cross-property scenario IDs fail closed.
- Haven and the six reviewed Gabe research subjects use the same local workflow while preserving their different identity classifications. The durable Haven adapter remains read-only.
- Comparable evidence is separated into **Recorded sales**, **Active listings**, **Inactive listings** and **All provider observations**. All-observations counts overlap the other tabs and are not presented as additional unique properties.
- Identity-compatible duplicate observations are grouped for display while every provider record, original reference and observation history remains available. Conflicting identifiers, units or ambiguous addresses remain separate.
- Table rows and map markers share one selection state. Overlapping markers retain the existing selectable cluster roster, keyboard interaction and source-coordinate/Haversine behavior.
- Property and workspace screens use a compact caveat with expandable evidence limitations. Missing values use **Not available** or **Not verified** instead of implying zero.
- Underwriting visibly separates observed/provider-reported evidence, analyst assumptions and calculated outputs. Core inputs remain prominent; existing advanced fields remain available in an optional disclosure.
- The existing economics, MAO, Monte Carlo, report model and Puppeteer renderer remain the calculation and export path. No calculation formula changed.

## Acceptance results

- **Haven:** 15 retained provider observations remain mapped; recorded sales remain zero. The selected durable Property and snapshot persist through edit, save, reload, brief/full export and back navigation.
- **GABE-01:** Four subject-bound reported Sale examples remain visible. The QA scenario selected one and left three not selected; those statuses and rationale appear in the Full Report.
- **GABE-04:** The retained $75,000 record remains visible and was explicitly excluded in the QA scenario with an outlier rationale. It does not set the analyst resale assumption.
- **GABE-05:** Two older sales and the thin-evidence finding remain visible. No additional comp or numerical ARV was inferred.
- **Isolation:** Moving from Haven to GABE-01 starts a subject-specific scenario with no carried purchase, rehab, resale, result or comparable selection.
- **Privacy and operations:** Browser request interception recorded zero external attempts. Provider calls, database connections and database writes were all zero.

## QA results

| Check | Result |
| --- | --- |
| Complete repository test selection | 349/349 PASS, 0 skipped |
| Production build | PASS; local workspace excluded from production bundles |
| V1.3 browser and PDF acceptance | 57/57 PASS; 4 PDFs |
| Existing Property Detail browser/PDF QA | 111/111 PASS; 6 PDFs |
| Existing Investment Workspace browser QA | 44/44 PASS; 3 exports |
| PDF text, page bounds and blank-page checks | PASS for all V1.3 Haven and GABE-01 Brief/Full pages |
| Source evidence hashes | PASS for retained Haven snapshot and Gabe review decisions |

The old V1.1 report comparison completed its financial-equality and layout checks across all fixtures, but its final preservation assertion still expects a pre-V1.2 source set. It reports the already-existing V1.2 `server.js` and `store.js` changes alongside `reports.js`. That historical baseline was not rewritten or weakened for V1.3.

## Review artifacts

Final V1.3 QA directory:

`data/runtime/unified-v1-3/qa-1BdOar/`

Key screenshots:

- `after-haven-overview.png`
- `after-haven-valuation.png`
- `after-haven-comps.png`
- `after-haven-underwriting.png`
- `after-gabe-01-research-sales.png`
- `after-gabe-05-thin-evidence.png`
- `after-gabe-01-mobile.png`

Before-reference V1.2 QA directory:

`data/runtime/property-detail-v1-2/qa-olQONh/`

Generated reports:

- `PROPERTY-37cb8526-c1e7-4896-8525-a9cdb82f370b-brief-r1.pdf`
- `PROPERTY-37cb8526-c1e7-4896-8525-a9cdb82f370b-full-r1.pdf`
- `GABE-01-brief-r1.pdf`
- `GABE-01-full-r1.pdf`

Additional QA evidence:

- Complete regression: `data/runtime/investment-workspace-v1/regressions-KXMigE/`
- Existing workspace QA: `data/runtime/investment-workspace-v1/qa-4zymwF/`
- Existing Property Detail QA: `data/runtime/property-detail-v1-2/qa-svJYxV/`
- Historical V1.1 comparison output: `data/runtime/investment-workspace-v1-1/qa-QgmblN/`

## Changed implementation files

- `apps/web/src/features/property-detail/PropertyDetail.jsx`
- `apps/web/src/features/property-detail/navigation.js`
- `apps/web/src/features/property-detail/detail.css`
- `apps/web/src/features/comps-map/Comps.jsx`
- `apps/web/src/features/comps-map/evidence.js`
- `apps/web/src/features/investment-workspace/Workspace.jsx`
- `apps/web/src/features/investment-workspace/unified.css`
- `tests/property-detail.test.js`
- `tests/unified-v1-3.test.js`
- `scripts/property-detail-qa.js`
- `scripts/unified-v1-3-qa.js`

## Remaining limitations

- Haven has no retained subject-bound recorded-sale research in this evidence package; the UI correctly shows zero.
- Provider-reported Sale events are research evidence, not independently verified escrow closings, arm's-length transactions, condition matches or appraisals.
- GABE-04 transfer terms and condition remain unresolved. GABE-05 remains a thin, older sample.
- Title, legal parcel identity, ownership, liens, payoff, condition, seller motivation and current availability remain outside this local evidence scope.
- The local offline map preserves provider coordinates but has no street basemap. Missing coordinates stay in the evidence table without invented locations.

**STOP:** Ready for Stan/ChatGPT review. Not deployed.
