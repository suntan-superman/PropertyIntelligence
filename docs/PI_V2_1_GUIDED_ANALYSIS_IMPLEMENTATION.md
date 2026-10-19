# PI V2.1 Guided Investment Analysis Wizard

Status: **IMPLEMENTED AND OFFLINE-CERTIFIED**  
Date: 2026-10-15  
Production deployment: Not performed

## Outcome

Guided Analysis is now PI's default property-evaluation experience. A first-time user can identify a retained property, review its evidence, select comparable sales, document seller/property evidence, enter underwriting assumptions, run an optional Monte Carlo analysis, save the scenario and generate both investor-report formats.

The existing Advanced Workspace remains available. Guided and Advanced modes bind to the same subject ID, evidence fingerprint and scenario ID; switching modes does not copy or translate financial data.

## Seven-step workflow

1. **Identify Property** searches saved Properties and retained preliminary research before offering an explicit, cost-disclosed provider lookup.
2. **Property Research** reuses the existing overview, county/distress, property facts and listing views.
3. **Comparable Sales** reuses reported Sale-event evidence, selection/exclusion controls, analyst notes and map behavior. Listings remain separate.
4. **Seller & Property Evidence** reuses the revisioned seller-financial-position and analyst-evidence models. Unknown obligations remain unknown.
5. **Financial Analysis** reuses the certified underwriting, MAO and scenario-comparison implementation unchanged.
6. **Risk Analysis** reuses synchronized underwriting inputs, editable illustrative ranges, the certified Monte Carlo engine and explicit Run control.
7. **Investor Reports** adds a concise readiness review, unresolved-question list, preview and PDF export. The existing approved plain-English Monte Carlo explanation is retained.

Every selected-subject screen includes one compact persistent property header containing the full address, key characteristics, active scenario, save state, warning count and seven-step progress rail. The address is not repeated in the individual steps. Save remains directly available; Duplicate, New Blank and Reset Draft are grouped under an accessible secondary menu. Back, Continue, Skip for Now and Save & Exit preserve the current draft. Every wizard step transition resets the document to the top so the newly selected step is immediately visible. Save & Exit creates a revision only when the draft has unsaved changes.

## Implementation

- `apps/web/src/features/investment-workspace/workflow.js` defines the seven-step presentation map over the existing workspace tabs.
- `apps/web/src/features/investment-workspace/Workspace.jsx` supplies progress, property/scenario context, navigation, readiness review and the Advanced-mode switch.
- `apps/web/src/features/investment-workspace/guided.css` supplies the desktop and responsive guided presentation.
- `apps/web/src/features/discovery/Discovery.jsx` makes retained-first address identification Step 1 and opens an exact match directly in Guided Analysis.
- `apps/web/src/features/desktop-shell/Shell.jsx` makes Guided Analysis the primary application entry.
- `apps/web/src/features/property-detail/navigation.js` preserves `subject`, `snapshot`, `scenario`, `tab` and `mode` route context.
- `tests/pi-v2-1-guided-wizard.test.js` verifies the workflow contract and state binding.
- `scripts/pi-v2-1-guided-wizard-qa.js` exercises the complete browser flow, saves all seven screenshots and generates both sample PDFs.

No certified calculation was rewritten. No provider integration, production database, durable identity, source evidence or immutable saved revision was changed.

## Local launch

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --port 4175
```

Open:

`http://127.0.0.1:4175/#analyze-property`

## Certification summary

| Verification | Result |
| --- | --- |
| Guided/address/workflow/risk/Milestone 2 focused suite | 30/30 PASS, 0 skipped |
| Investor-report and certified-engine regression | 149/149 PASS, 0 skipped |
| Property-detail and contextual-help regression | 32/32 PASS, 0 skipped |
| Guided Chrome acceptance | 30/30 PASS |
| Investor PDF quality QA | 44/44 PASS |
| Production web build | PASS, 66 modules |
| Provider calls | 0 |
| Database connections/writes | 0 / 0 |
| Production writes/deployments | 0 / 0 |

The Chrome acceptance used Node 22.12.0 and Chrome 154.0.8037.57 at desktop widths of 1440 and 1280 pixels. It verified Crestview address normalization and exact GABE-01 binding, Haven isolation, explicit unknown-address lookup, selected comparable persistence, scenario duplication, skip status, save/resume, Guided/Advanced switching and report generation.

## Evidence artifacts

Wizard QA root:

`data/runtime/pi-v2-1-guided-wizard/qa-eyNJiB/`

Screenshots:

- `01-identify-property.png`
- `02-property-research.png`
- `03-comparable-sales.png`
- `04-seller-property-evidence.png`
- `05-financial-analysis.png`
- `06-risk-analysis.png`
- `07-investor-reports.png`

Sample reports:

- `GABE-01-brief-guided.pdf` — 130,031 bytes; SHA-256 `3a2ea9a5ea23a3755a3946336876b8fc4ecf5bb41f62282dabb8c8654eb20ea9`
- `GABE-01-full-guided.pdf` — 314,816 bytes; SHA-256 `84628c56fdefc277078c30c9f47ee3c28143b8748b29b0cb3ecaa1043e02f6fa`

PDF regression root:

`data/runtime/pi-v2-investor-report-quality/qa-96EkAj/`

The PDF run validated the 2-page Opportunity Brief, 8-page Full Investor Package, 6-page sparse fixture and 8-page layout-stress fixture for text, page bounds, blank pages and visual rendering.

## Preserved boundaries and limitations

- Browser-local drafts use the existing `pi-investment-workspace-v1-drafts` storage key. Clearing browser storage can remove drafts that have not been saved as immutable revisions.
- A retained address match supports preliminary research; it does not establish legal parcel identity, title or ownership.
- Provider lookup remains an explicit action with usage disclosure. No paid request is initiated merely by entering an address.
- Comparable selection records analyst judgment; it does not automatically produce or certify an ARV.
- Monte Carlo ranges remain analyst-selected or illustrative assumptions, not calibrated forecasts.
- Seller balances, liens, taxes and payoff evidence remain unresolved until entered with evidence; unknown is never converted to zero.
- Google street basemaps still depend on an available authorized browser key; the offline coordinate fallback remains intact.
- SellMyKernHome.com integration was not changed or activated.
- Nothing was deployed.

