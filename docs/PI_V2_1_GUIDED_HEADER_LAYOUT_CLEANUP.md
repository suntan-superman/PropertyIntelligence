# PI V2.1 Guided Header and Layout Cleanup

Status: **IMPLEMENTED AND OFFLINE-CERTIFIED**  
Date: 2026-10-15  
Deployment: Not performed

## Result

Guided Analysis now presents one compact property header instead of repeating the selected-property banner, summary card and step-level address headings. The full property address appears once in the primary guided viewport. The header also shows concise property facts, active scenario, saved/draft status, research-warning count and the evidence-snapshot boundary.

The seven-step rail is contained within the same compact header and preserves current, complete, skipped and needs-review states. Save remains a primary action. Duplicate, New Blank and Reset Draft are grouped in an accessible **Scenario actions** menu. **Change Property** uses the existing custom confirmation dialog whenever the current draft has unsaved work.

## Implementation boundaries

- Guided mode alone receives the compact header; the Advanced Workspace layout remains unchanged.
- Individual steps lead with their purpose and instructions instead of repeating the address or scenario title.
- The application header remains the first sticky layer. The guided property header is offset below it on desktop and becomes non-sticky at the existing responsive breakpoint, so the two layers do not overlap.
- The existing subject ID, evidence fingerprint, scenario ID and revision behavior remain the source of truth.
- Financial engines, evidence snapshots, provider integrations and PDF generation were not changed.
- A reusable-tooltip lifecycle correction removes an open tooltip if its trigger leaves the document during step navigation. Hover, keyboard focus and click behavior remain intact.

## Acceptance results

| Requirement | Result |
| --- | --- |
| Full address appears once in guided primary viewport | PASS |
| Property and scenario survive navigation through all seven steps | PASS |
| Current/complete/skipped/needs-review progress states preserved | PASS |
| Save, resume and duplicate preserve subject/evidence binding | PASS |
| Change Property protects unsaved work | PASS |
| Compact header remains visible without sticky overlap | PASS |
| Keyboard-accessible actions and existing tooltip behavior | PASS |
| Advanced Workspace compatibility | PASS |
| Provider calls | 0 |
| Database connections/writes | 0 / 0 |
| Production writes/deployments | 0 / 0 |

## Verification

| Suite | Result |
| --- | --- |
| Guided/address/workflow/risk/Milestone 2 tests | 30/30 PASS, 0 skipped |
| Report and certified financial-engine regression | 149/149 PASS, 0 skipped |
| Property-detail and contextual-help regression | 32/32 PASS, 0 skipped |
| Chrome guided-flow acceptance | 30/30 PASS |
| Investor PDF quality checks | 44/44 PASS |
| Production web build | PASS, 66 modules, 1.22 seconds |

Chrome acceptance used Node 22.12.0 and Chrome 154.0.8037.57. It verified the single-address invariant, compact header height, desktop sticky positioning, seven-step state retention, scenario duplication, save/resume, draft-protected property switching, Haven/Crestview isolation, 1280-pixel horizontal fit and zero remote requests.

## Visual and report artifacts

QA root:

`data/runtime/pi-v2-1-guided-wizard/qa-eyNJiB/`

The root contains desktop screenshots for all seven steps, `qa-results.json`, an Opportunity Brief and a Full Investor Package. Key review images:

- `02-property-research.png` — compact header and research step.
- `05-financial-analysis.png` — compact warning/progress states above a long form.
- `07-investor-reports.png` — preserved context at report generation.

Generated report fingerprints:

- Opportunity Brief: SHA-256 `3a2ea9a5ea23a3755a3946336876b8fc4ecf5bb41f62282dabb8c8654eb20ea9`
- Full Investor Package: SHA-256 `84628c56fdefc277078c30c9f47ee3c28143b8748b29b0cb3ecaa1043e02f6fa`

Independent PDF QA root:

`data/runtime/pi-v2-investor-report-quality/qa-96EkAj/`

## Local launch

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --port 4175
```

Open `http://127.0.0.1:4175/#analyze-property`.

## Remaining limitations

- Drafts not saved as immutable scenario revisions remain subject to the existing browser-local storage limitation.
- A retained research match still does not certify legal parcel identity.
- Unknown seller obligations and unresolved research remain explicitly unknown.
- Nothing was deployed.
