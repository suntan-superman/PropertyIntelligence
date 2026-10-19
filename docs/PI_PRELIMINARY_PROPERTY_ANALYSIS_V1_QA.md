# PI Preliminary Property Analysis V1 — QA

2026-10-12. Certified runtime: **Node v22.12.0**. Final classification: **PRELIMINARY WORKFLOW CERTIFIED**, with real RC-P2 financial execution blocked by missing evidence.

## 1. Evidence and run receipt

Certified append-only run: `data/runtime/preliminary-property-analysis-v1/run-awqwlu/receipt.json`.

- Original acquisition certificate, mapping/packet seals, request ledger, candidate source hashes and county source pins checked.
- Unchanged Rule C re-evaluated all three retained candidates and exactly reproduced the saved results/fingerprints.
- RC-P2 historical crosswalk PASS; preliminary eligible. RC-P1 and RC-P3 blocked.
- Current parcel activity/split-merge UNVERIFIED; no external verification claimed.
- Financial inventory: 15 retained JSON files, zero additional exact-subject records, two unbound valuation bundles excluded; all 34 required entries missing.
- Real financial execution false; no default price, ARV, rehab, financing or cost inserted.
- Synthetic 10,000-draw execution exactly matches the certified result fingerprint and passes the existing report trust adapter.

The earlier `run-hI0KMc` development output is retained, not overwritten. Final run metadata explicitly distinguishes the certified cents-solver version from the unchanged MAO V2 compatibility reference. Calculations did not change.

## 2. Automated suites

| Suite | Result |
| --- | --- |
| New preliminary workflow / negative tests | **50/50 PASS** |
| Twelve unchanged relevant regression files | **330/330 PASS** |
| Total final automated tests | **380/380 PASS** |
| Skips / failures / cancellations in final suites | **0 / 0 / 0** |

Final new-suite receipt: `qa-targeted-MMqMp9/result.json` under the private root. Regression receipt: `qa-regression-9LpHZS/result.json`. Each directory also retains complete TAP output. Earlier passing targeted receipts remain preserved. No name filtering, skipped failure, baseline rewrite or existing-test semantics change was used.

Existing regression files:

1. `scripts/rentcast-reconciliation-v1-1/reconcile.test.js`
2. `scripts/rentcast-controlled-pilot/pilot.test.js`
3. `scripts/identity-resolution-pilot/pilot.test.js`
4. `scripts/identity-resolution-pilot/review.test.js`
5. `scripts/identity-resolution-pilot/streamlined.test.js`
6. `scripts/durable-identity-pilot/trusted-review.test.js`
7. `tests/monte-carlo-v1.test.js`
8. `tests/investor-report-v1.test.js`
9. `tests/investor-mc-integration.test.js`
10. `tests/investor-presentation.test.js`
11. `scripts/protected-baselines-v3/reconciliation.test.js`
12. `scripts/mls-validation-round1/harness.test.js`

The initial new-suite pass was **49/50**: its text assertion rejected the word `iframe` in shared CSS, although the real view contained no frame element. It was corrected to check the actual `<iframe` element marker; browser DOM checks independently verify zero frames in the real view. This is a new-test correction, not removal of isolation coverage. All 50 final tests ran. A later repeat passed against the final contract code.

### Required negative/control coverage

| Requirement | Coverage |
| --- | --- |
| Missing provenance, changed candidate, altered provider source | Eligibility fails closed |
| Invalid Rule C fingerprint / changed historical result | Exact saved-result binding required |
| Missing provider/county rights | Preliminary admission blocked; incomplete rights not labeled licensed |
| Incomplete address / identity conflict | Blocked |
| Unknown current status | Permitted only in explicitly preliminary technical scope; remains UNVERIFIED |
| Historical crosswalk | No final identity, offer, investment, persistence or MLS promotion |
| RC-P1 / RC-P3 / Round 1 | Both pilots blocked; RC-P2 permanent Round 1 exclusion preserved |
| Synthetic financial values in real mode | Synthetic provenance rejected; no fallback default values |
| Missing ARV/comps/valuation date | No real calculation |
| Missing rehab/condition/holding/price/costs | Explicit missing entries, no real calculation |
| Invalid financing, NaN, subject/date/rights/author/value/provenance mismatch | Rejected |
| Incomplete but available financial evidence | PARTIAL, still no calculation |
| Final authority or result tampering | Closed authority assertions and integrity checks |
| View isolation / injection | Separate pages, sandbox, escaped text, no active script/network content |
| Provider/database/MLS safety | Offline guard, dependency/source inspection, unchanged real evidence and authorization files |

Mock financial evidence descriptors exist only in the unit test to exercise positive/negative contract consistency. They are explicitly labeled unit mocks, never persisted or presented as real RC-P2 assumptions, and the complete mock gate is tested without running real financial calculations.

## 3. Presentation and report checks

**15/15 browser assertions PASS** using the installed Puppeteer/Chrome over a local pipe. Browser: **Chrome/154.0.8037.57**. Zero intercepted requests and zero page/console errors. No browser or dependency download occurred.

Checks cover both headings/modes, missing-financial warning, disabled-authority text, no real-view frame, sandboxed synthetic frame, existing synthetic report content, layout width, and zero outbound attempts. Screenshots were visually inspected: warnings are prominent, the real page contains no economics, and the synthetic page displays no real address/parcel identifiers. No public server or application route was created.

Browser receipts/screenshots are in fresh `qa-view-*` directories under the private root. The final run is checked with:

```powershell
& $piNode scripts/preliminary-property-analysis-v1/ui-qa.js data/runtime/preliminary-property-analysis-v1/run-awqwlu
```

Existing investor integration/presentation regressions generated synthetic PDFs in their own fresh UUID-named test directories and verified package/HTML mappings, trust receipts and tamper rejection. No historical frozen package was regenerated. This is not a claim that a new full visual PDF certification was required or performed; the new user-facing artifact is local HTML, not a real-property PDF.

## 4. Preservation and privacy

Before implementation, `guard.js prepare` captured **3,892 files**: existing Git-listed tracked/untracked files plus the prior preservation inventory and explicit private source/decision/model/report directories. This includes the newly introduced preservation helper itself; it has remained unchanged since the snapshot. Original evidence, actual analyst decisions, V3, Rule C, current/historical baselines, Monte Carlo, MAO, Investor Report V1.1, monitoring and Round 1 configuration are included.

SHA-256 over the sorted path→file-hash inventory:

`631840cafd081d11a1e73eb7a8a6c285b79119388798d91c9bd3b2b5eba6485d`

Post-run and post-suite comparisons: **PASS, zero protected changes**. Coverage is explicit, not a claim to fingerprint every unrelated ignored file on the machine. The worktree was already dirty; existing modifications were preserved, not reverted or attributed to this sprint.

The protected-baseline regression also validated both v3 successors, the detached seal, all 351 nested pins and retained generated-artifact structural/content checks. No historical baseline was rewritten.

Final local audit: **25/25 PASS**, checking the exact new source/document allowlist, private output ignore status, **33 distinct private identity/address values**, no owner/contact fields in new property outputs, two-view privacy and final result/version/authority integrity. No private value was found in the new shareable code/docs or synthetic/view artifacts. Receipts are append-only in fresh `qa-final-*` directories. No credentials are read or echoed by this audit. Browser checks for the final run are retained in `qa-view-Y2zeLC/result.json`.

`git diff --check` returned exit code 0 with pre-existing LF/CRLF warnings; no line-ending normalization was performed. This check does not replace explicit content/privacy validation of the new untracked files.

## 5. Safety accounting

| Operation | Count |
| --- | ---: |
| RentCast / ATTOM / DataTree / Google calls | 0 / 0 / 0 / 0 |
| County queries / personnel contacts | 0 / 0 |
| Outbound attempts in workflow and browser checks | 0 |
| Database connections / writes / migrations | 0 / 0 / 0 |
| Actual analyst approvals / decision changes | 0 / 0 |
| Canonical resolutions / durable Properties created | 0 / 0 |
| Real-property financial analyses | 0 |
| MLS access / Round 1 selections / authorization changes | 0 / 0 / 0 |
| Production changes / deployments / dependency installs | 0 / 0 / 0 |
| Unexpected protected changes | 0 |

Only new local preliminary scripts, the three requested documents and append-only private/test-owned artifacts were created. No credential/environment loader, live acquisition entry point, database certification command or production server was run.

**STOP FOR STAN/CHATGPT REVIEW.**
