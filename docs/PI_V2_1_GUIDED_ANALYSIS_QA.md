# PI V2.1 Guided Analysis QA

Date: 2026-10-15  
Result: **PASS**

## Commands

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe --test tests/pi-v2-1-guided-wizard.test.js tests/pi-v2-address-workspace.test.js tests/pi-v2-milestone1-1.test.js tests/pi-v2-risk-sync.test.js tests/pi-v2-milestone2.test.js
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/pi-v2-1-guided-wizard-qa.js
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe --test tests/investment-workspace-report.test.js tests/investment-workspace.test.js tests/investment-workspace-v1-4.test.js tests/pi-v2-milestone1.test.js tests/pi-v2-milestone1-1.test.js tests/pi-v2-risk-sync.test.js tests/seller-financial-position.test.js tests/monte-carlo-v1.test.js
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe --test tests/property-detail.test.js tests/contextual-help.test.js
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/pi-v2-investor-report-quality-qa.js
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe node_modules/vite/bin/vite.js build --config apps/web/vite.config.js
```

## Results

| Suite | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Guided/address/workflow/risk/Milestone 2 | 30 | 0 | 0 |
| Report and financial-engine regression | 149 | 0 | 0 |
| Property-detail and contextual-help regression | 32 | 0 | 0 |
| Guided Chrome acceptance checks | 30 | 0 | 0 |
| PDF quality checks | 44 | 0 | 0 |

Production web build: PASS.  
Provider calls: 0.  
Remote browser requests: 0.  
Database connections/writes: 0 / 0.  
Production writes/deployments: 0 / 0.

## Browser acceptance coverage

- `1708 Crestview Drive` resolves to retained GABE-01 and preserves its evidence fingerprint.
- `3484 Haven Street` opens as a separate saved Property and does not inherit Crestview evidence or scenarios.
- An unknown address remains unmatched until the user explicitly chooses the cost-disclosed provider action; the QA transport sends no request.
- All seven steps render at desktop width with no document-level horizontal overflow at 1280 pixels.
- The selected subject address occurs once in the primary guided viewport, inside the compact persistent property header.
- The property header remains below the application header during long-page scrolling without sticky overlap.
- Current, complete, skipped and needs-review progress states remain distinguishable in the compact rail.
- Save stays immediately available while Duplicate, New Blank and Reset Draft remain keyboard-accessible in the secondary scenario menu.
- Change Property protects an unsaved draft and proceeds only after explicit confirmation.
- Moving from a scrolled lower section to the next wizard step resets the document to the top.
- Progress and workflow controls are keyboard-focusable and expose readable button names.
- Selected comparable evidence, financial inputs, risk assumptions/seed and report revision persist through the workflow.
- Monte Carlo runs only after explicit user action.
- Guided ↔ Advanced mode switching retains exact subject and scenario identifiers.
- Save & Exit returns through My Workspace and resumes the same scenario.
- Scenario duplication retains the source subject and evidence snapshot while using a distinct scenario ID.
- Opportunity Brief and Full Investor Package generate from the saved revision.

## Visual review

All seven full-page screenshots were inspected. The compact property header, progress rail, scenario toolbar, control spacing, evidence boundaries, readable tables, Monte Carlo explanation and readiness warnings rendered without observed overlap or clipping. The long financial, risk and report pages retain the single property context while avoiding competing sticky elements.

