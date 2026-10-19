# PI V2.0 Milestone 2 — Implementation and QA

## Result

The investor-report corrections and a local, authenticated mocked lead-to-analysis workflow are implemented. The existing deterministic MAO, Monte Carlo, evidence history, scenario revision, and report numeric outputs were not changed.

The local implementation is ready for continued offline/private workstation evaluation. An externally reachable private authenticated staging pilot **should not begin yet** because PI does not yet have multi-user queue authentication/authorization, a managed intake secret/ingress deployment, or an approved website sender and privacy/retention operating procedure. No live website submission or deployment was enabled.

## Workstream A — report corrections

- Removed the duplicated `Scenario Scenario 1` presentation while preserving the scenario name and revision.
- Preserved the entered `$135,000` original amount but downgraded the report wording: its `Tax Assessor` source and absent attachment do not establish that a recorded mortgage document was reviewed.
- Preserved the `$120,000` balance as `Seller-reported — not a verified payoff`; it is not described as an algorithmic estimate.
- Kept other liens unknown. Illustrative equity and seller proceeds remain unavailable while material obligations are unresolved.
- Added a conditional executive synthesis covering attraction under entered assumptions, key sensitivities, and the three highest-value diligence questions without implying availability, motivation, distress, supported ARV, or investment advice.
- Kept zero-selected-comparable disclosure visible and retained the resale value as an unsupported analyst assumption.
- Used the seller-page whitespace for evidence interpretation and highest-value checks without reducing its body text.
- Added the plain-language Monte Carlo explanation immediately before the technical provenance appendix and retained the existing warning that `0 losses` under entered ranges is not real-world zero risk.

Final inspected reports:

| Report | Pages | SHA-256 |
| --- | ---: | --- |
| `GABE-01-brief-quality.pdf` | 2 | `7743934070ff1be68b97d12c8be02c6c011a2847d4ae66d2208a39ccf3681917` |
| `GABE-01-full-quality.pdf` | 8 | `e83646eb1baaac3d4922fda364dd4505ad2a17f3a3182a62c25431693d4df324` |
| `GABE-05-sparse-full-quality.pdf` | 6 | `f46f9127da94fa8a38b2fa341b28049d6758ec0cfd18eeb4a9553c602c097c11` |
| `QA-layout-stress-full-quality.pdf` | 8 | `7ccc7ca7cc24033deb01713cb7dd4c203bfbdf4f671dd3244b0e09e22c4c3df2` |

The PDFs, HTML, per-page renders, comparison images, layout diagnostics, and machine-readable results are under `data/runtime/pi-v2-investor-report-quality/qa-zEHgrU/`.

## Workstream B — local lead workflow

Repository inspection found the SellMyKernHome Next application and its seller form. The existing website persists fields including `submissionToken`, address, contact preference, consent, property type/condition/occupancy/timing/comments, and attribution. No website code was changed.

PI now contains:

- a strict `pi.lead-intake.v1` contract and explicit website-record adapter;
- HMAC-SHA256 request authentication with five-minute expiry and timing-safe comparison;
- a 32 KiB payload cap, allow-listed fields, length/type validation, and a bounded rate limiter;
- idempotency on site/source plus external lead ID, safe retry receipt, and explicit duplicate-review signal;
- a local private file store with atomic writes and states `NEW`, `NEEDS_REVIEW`, `IN_RESEARCH`, `UNDERWRITTEN`, and `ARCHIVED`;
- an Incoming Leads workspace with Review Lead, Research Address, Start Analysis, and Archive actions;
- exact retained-evidence address research with zero automatic provider calls;
- separation between seller statements, retained source evidence, and analyst scenario assumptions.

The integration contract and staging controls are documented in `docs/PI_V2_MILESTONE2_INTEGRATION_CONTRACT.md`.

## Mocked end-to-end evidence

Node `v22.12.0`, Chrome `154.0.8037.57`:

- Signed intake created exactly one local lead.
- An identical safe retry returned the same lead ID and flagged duplicate review.
- The browser displayed the queue, moved the lead to review, matched retained Crestview evidence, and opened `GABE-01` analysis.
- A test-owned scenario was saved without durable Property creation.
- Brief and Full PDFs were generated.
- Accepted lead to first report: `5.906 seconds` in the automated local fixture.
- Both PDFs: `1.929 seconds` combined.
- Provider calls: 0.
- Database connections: 0.
- Production writes: 0.
- External lead transmissions: 0.
- Browser remote requests: 0.

Artifacts and screenshots:

- `data/runtime/pi-v2-milestone2/qa-dOdkrA/qa-results.json`
- `data/runtime/pi-v2-milestone2/qa-dOdkrA/01-incoming-lead-new.png`
- `data/runtime/pi-v2-milestone2/qa-dOdkrA/02-address-research-match.png`
- `data/runtime/pi-v2-milestone2/qa-dOdkrA/03-start-analysis-retained-evidence.png`
- `data/runtime/pi-v2-milestone2/qa-dOdkrA/GABE-01-brief-milestone2-qa.pdf`
- `data/runtime/pi-v2-milestone2/qa-dOdkrA/GABE-01-full-milestone2-qa.pdf`

## Workstream C — real-deal validation

The analyst worksheet is ready at `docs/PI_V2_MILESTONE2_REAL_DEAL_VALIDATION_WORKSHEET.md`. No actual/historical Gabe deal closing packages, permission records, invoices, or realized outcomes were supplied in this task, so real-deal validation remains explicitly unexecuted. No values or feedback were invented.

## QA summary

| Check | Result |
| --- | --- |
| Milestone 2 focused/security/report suite | 41/41 PASS, 0 skipped |
| Existing report/financial regression selection | 149/149 PASS, 0 skipped |
| Mocked browser lead-to-report QA | 12/12 PASS |
| PDF content/layout/network QA | 44/44 PASS |
| Production web build | PASS, 66 modules transformed |
| Certified MAO QA | PASS, 10 named checks |
| Visual PDF inspection | PASS for Brief, Full, sparse, and stress reports |

Commands:

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe --test tests/pi-v2-milestone2.test.js tests/investment-workspace-report.test.js tests/seller-financial-position.test.js tests/pi-v2-risk-sync.test.js
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/pi-v2-milestone2-qa.js
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/pi-v2-investor-report-quality-qa.js
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe node_modules/vite/bin/vite.js build --config apps/web/vite.config.js
```

Local application launch (intake stays disabled because this command supplies no secret):

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --port 4175
```

Open `http://127.0.0.1:4175/#incoming-leads` to inspect locally retained test-owned leads. Use the QA script—not a real secret or live sender—to exercise signed intake.

## Milestone-related files

- `src/leads/contract.js`
- `src/leads/authentication.js`
- `src/leads/store.js`
- `src/investment-workspace/server.js`
- `src/investment-workspace/report-model.js`
- `src/investment-workspace/report-html.js`
- `src/investment-workspace/report-styles.js`
- `apps/web/src/features/desktop-shell/MyWorkspace.jsx`
- `apps/web/src/styles/workspace.css`
- `apps/web/src/main.jsx`
- `tests/pi-v2-milestone2.test.js`
- `scripts/pi-v2-milestone2-qa.js`
- `scripts/pi-v2-investor-report-quality-qa.js`
- `package.json`
- the three Milestone 2 documents listed here

## Open risks and next authorization gates

1. Secure multi-user login and role enforcement for lead/contact access are not implemented.
2. The current local file store is not a production PII store; retention, deletion, backup, audit, and incident controls are not established.
3. A managed secret, sender deployment, TLS/ingress controls, centralized rate limiting, and replay/audit monitoring remain staging work.
4. The website outbound adapter has a defined mapping but has not been added, deployed, or allowed to transmit.
5. Private photo-object storage is only designed; binary storage is not implemented.
6. Real-deal accuracy/usability validation awaits three permitted deal packages and first-time-user observation.

Recommendation: **DO NOT BEGIN EXTERNALLY REACHABLE STAGING YET.** The local mocked workflow is suitable for internal review. A private authenticated staging pilot can begin only after gates 1–4 above are implemented and reviewed; photo ingestion may remain disabled. Stop before live website submissions or deployment.

