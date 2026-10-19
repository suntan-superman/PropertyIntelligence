# PI V2.0 — Milestone 1.1 Workflow and Scenario UX

Date: 2026-10-15  
Status: PASS — LOCAL IMPLEMENTATION AND OFFLINE CERTIFICATION

## Outcome

The local investment workspace now presents one five-stage workflow:

1. Property Research
2. Comparable Sales
3. Seller & Property Evidence
4. Financial Analysis
5. Investor Reports

All prior views remain available as secondary tabs. Subject, evidence snapshot, scenario and unsaved browser draft remain bound while navigating. Historical tab links continue through normalized aliases, including `Compare` to `Scenarios`, `Comps` to `Sold Sales`, `MonteCarlo` to `Risk` and `Report` to `Reports`.

## Root causes corrected

- Ten unrelated flat tabs exposed PI's internal organization instead of an investor workflow.
- The scenario table intentionally suppressed every dirty result even after the existing analysis endpoint returned a valid calculation.
- Reporting disabled Preview for dirty scenarios without offering an atomic save-and-preview path.
- The risk editor required every triangular bound to be entered manually and provided no safe opt-in starting values.
- The local store exposed only each scenario's latest revision, preventing the comparison UI from showing immutable historical revisions.

## Implementation

### Navigation and scenario state

- Added five primary stages and stage-specific secondary tabs.
- Consolidated scenario selection, naming, Save, Duplicate, New blank and Reset into one toolbar.
- Added a clear next action at the bottom of each stage.
- Retained deep-link subject/snapshot/scenario validation and added legacy tab aliases.
- Replaced ordinary-screen fixture and internal-reference labels with property addresses and plain-language terms.
- Moved the repeated workspace disclaimer into an expandable scope notice without changing report disclosures.

### Scenario comparison

- A valid current draft now appears as **Unsaved draft — calculated preview**.
- The preview is held in browser state only and never written into historical revisions.
- Invalid drafts show the specific validation reason instead of zero or a generic withheld-result label.
- Simulated loss displays only after Monte Carlo has actually run.
- Saved revisions are loaded append-only and retain their original revision number and saved analysis.
- Snapshot and assumption differences produce visible comparison warnings.

### Save & Preview

- A valid dirty scenario receives one prominent **Save & Preview** action.
- The action first saves an immutable local revision and previews that exact revision only after the save succeeds.
- Incomplete scenarios list actionable missing inputs and cannot preview.
- Any later scenario edit clears the prior preview; another save is required before reporting changed assumptions.
- Opportunity Brief, Full Investor Package and PDF export continue through the existing renderer and private-evidence filters.

### Illustrative risk assumptions

The new opt-in action derives editable triangular bounds from the current scenario:

- resale: 90% / 100% / 105%;
- rehabilitation: 100% / 120% / 160%;
- renovation duration: 0.83x / 1.0x / 1.33x, rounded;
- marketing duration: 0.67x / 1.0x / 2.0x, rounded.

Missing or zero source assumptions block population. Existing custom bounds require confirmation before replacement. Population does not run Monte Carlo. Results are labeled conditional simulations under analyst-selected distributions.

## Acceptance results

### Crestview

- Exact Crestview subject and snapshot retained across every stage.
- Four retained recorded-sale examples remained available.
- Purchase $175,000, rehabilitation $15,000 and resale $280,000 used the unchanged analysis adapter.
- Draft calculated values appeared immediately in comparison.
- Duplicate input changes did not alter the original draft preview.
- Risk bounds populated, one bound was edited and Monte Carlo ran only after explicit action.
- Save & Preview created revision 1 and rendered both report types.
- Subsequent draft changes cleared the stale preview.

### Haven Street

- Exact durable Haven subject and snapshot remained isolated from Crestview.
- No completed-sale examples were invented.
- Unknown seller obligations continued to block illustrative seller equity.
- A complete valid scenario generated an isolated Full Investor Package.

### Invalid and compatibility cases

- Blank purchase/resale values produced actionable validation and no zero-valued profit.
- Missing/zero risk bases did not generate distributions.
- A legacy `tab=Compare` link opened Financial Analysis → Scenarios.
- Historical revisions remained append-only and independently available to comparison.

## QA summary

- Focused financial, evidence, report, property-detail and workflow tests: 127/127 PASS, 0 skipped.
- Milestone 1.1 browser acceptance: 44/44 PASS.
- Contextual-help browser accessibility checks: 20/20 PASS.
- Seller Financial Position browser/report checks: 18/18 PASS.
- Prior Milestone 1 navigation regression: 14/14 PASS plus 4 PDFs.
- Certified MAO QA: 10/10 PASS.
- Production web build: PASS, 64 modules transformed.
- New PDF acceptance: 16/16 pages nonblank across three reports.
- Browser runtime errors: 0.
- External/provider calls: 0.
- Database connections/writes: 0/0.
- Deployments: 0.

The prior flat-tab browser assertions were replaced with equivalent secondary-tab assertions; no test was skipped or weakened.

## Local launch

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --property-detail --port 4175
```

Open:

`http://127.0.0.1:4175/#investment`

## Deliverable artifacts

QA directory:

`data/runtime/pi-v2-milestone1-1/qa-kcsIDG/`

- `five-stage-navigation.png`
- `draft-scenario-comparison.png`
- `seeded-risk-editor.png`
- `save-and-preview.png`
- `crestview-opportunity-brief.pdf` — 2 pages
- `crestview-full-investor-package.pdf` — 8 pages
- `haven-full-investor-package.pdf` — 6 pages
- `qa-results.json`

## Preserved boundaries

- No MAO, deterministic economics, Monte Carlo, source-evidence or report mathematics changed.
- No provider integration, live request, database operation, migration, credential access, authentication, deployment or Milestone 2 work occurred.

Final classification: **MILESTONE 1.1 READY FOR OPERATOR REVIEW**
