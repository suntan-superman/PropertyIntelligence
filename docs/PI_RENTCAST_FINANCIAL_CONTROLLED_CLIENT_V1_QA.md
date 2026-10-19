# RentCast Financial Controlled Client V1 — Offline QA

2026-10-12. **OFFLINE CONTROLLED CLIENT CERTIFIED. 277/277 PASS, zero failures/skips/cancellations.** No live readiness claim.

## Preservation and execution controls

Before implementation, verified the exact existing shortlist seal and original source relationships, then captured **4,231 existing files**. Preservation inventory:

`data/runtime/rentcast-financial-controlled-client-v1/preservation-before.json`

Aggregate SHA-256: `5e0941586a9f67f1056b5ac7f1ca5393c405d34e1ba4f84f1f572a7da3a1ec17`

Coverage inherits the prior source/raw-data inventory and adds current files, prior readiness artifacts and current pilot decisions/ledgers. This is preservation of the pre-existing dirty workspace, not reauthorization/re-baselining. No historical manifests or evidence are rewritten.

All new artifacts live in fresh gitignored task-owned directories; code and the three requested reports are the only permitted new nonignored files. Unchanged pilot regression outputs use a fresh sandbox working directory inside this task; unchanged foundation tests use a new private temporary root. No old QA artifacts are regenerated. Original temporary test cleanup is confined to its newly created directory.

Node: existing **v22.12.0**, no installation. Network blocker imported/preloaded; regression child environments contain only platform essentials and task-specific temporary locations, not credentials/provider/DB configuration. Mocks are data-only with no live fallback. Database modules may be imported by unchanged tests, but no database connection or query is executed. No `.env` loaded.

## Test coverage

The complete new test file covers every specification family: shortlist/exclusions; no-ZIP constraints; unique address and strict county/type/ID; exact APN9 and unchanged Rule C; missing/conflicting AVM identity/attributes/ranges; separate listings; approved search bounds; sold total/page/date/price/geography/duplicate checks; method/host/parameter/redirect controls; three serial nontransferable slots; timeout/crash/uncertainty; exclusive process locks; conservative account/rights/rate/tax bounds; minimal nested projection; disabled default/environment transport; closed operational authorities; source immutability; and explicit receipt-bound stage stops.

Additional controls exercise future authorization packet checks without enabling execution, A-response hidden pagination, failure receipts with bounded response hashes, B-failure blocking C, and a reservation observed on disk before response completion. A real 15-second timer is used; separate Node processes test locks and abrupt death. All identities/provider economics in those tests are synthetic. Exact source pins in synthetic Rule C fixtures emulate the validator contract, not actual source-row authenticity.

Unchanged full regression files: RentCast foundation/API runtime, original controlled pilot, Rule C, versioned protected baselines (including nested 351/generated 26), Round 1 harness/identity classifier, and prior financial-readiness assessment. No filtered failures, skipped assertions, historical regeneration or model/report execution is used.

## Reproduction

From repository root:

```powershell
$piNode = 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe'
& $piNode scripts/rentcast-financial-controlled-client-v1/qa.js
```

Each invocation creates a fresh `qa-…` directory with complete TAP logs, group counts, synthetic receipts/ledgers, source/report revision hashes and preservation/privacy result. Do not repeat the one-time `guard.js capture` or delete retained test/crash directories. There is no real-acquisition CLI.

## Development-run evidence retained

- `qa-Rh8RVJ`: runner failed before tests because Windows absolute `--import` needed a file URL. Corrected only the new QA runner.
- `qa-UBZxIP`: 72/81 passed, zero skips. New mock responses without bodies incorrectly raised an internal error before HTTP classification; the account-negative test built its permit after invalidating account evidence; an empty AVM ID stopped at the general string validator rather than the dedicated ID gate. Corrected mock defaults, test setup and earlier explicit ID rejection. No existing source/test changed or assertion removed.
- `qa-T85RRw`: **81/81 passed**, zero skips; **4,231/4,231** preserved. Further negative controls were then added, so this is not substituted for final full-suite certification.
- `qa-WQ2xrS`: **276/276 passed**, zero skips; **4,231/4,231** preserved. Final review additionally bound the full bounds-evidence/market-context fingerprint to each approval and reservation, with a new rejection test. No unrelated changes.

## Final results

Measured complete run: `data/runtime/rentcast-financial-controlled-client-v1/qa-mwjqxc/`.

| Group / check | Result |
| --- | ---: |
| New controlled-client unit/integration/security tests | **88/88 PASS** |
| Unchanged foundation/runtime, Rule C, versioned protection, Round 1 and prior assessment tests (seven complete files) | **160/160 PASS** |
| Unchanged original controlled-pilot tests, isolated output working directory | **29/29 PASS** |
| Total across nine complete files | **277/277 PASS** |
| Failed / skipped / cancelled | **0 / 0 / 0** |
| Existing before/after file hashes | **4,231/4,231 identical** |
| Unexpected protected changes | **0** |
| Allowed new code/report files, private-identifier and credential-pattern scan | **12/12 PASS** |
| Original shortlist fingerprint and recomputed source-bound selection | **PASS** |
| Live transport enabled / credentials loaded | **NO / NO** |

Durations: focused 18,117 ms (includes actual 15-second timeout); unchanged main regressions 2,765 ms; isolated prior pilot 343 ms. Full TAP and machine-readable results are retained, including process-crash locks and uncertain reservations. Later append-only QA reruns pin the final report revision in their `result.json`; they do not erase these earlier runs. No historical generated files were rewritten or model/report protection weakened.

All ten acceptance controls PASS: offline compatibility, endpoint/parameter allowlist, unchanged Rule C identity, strict AVM subject ID, bounded sold search, append-only reservation/lock, zero-retry/timeout, conservative budget, minimal evidence projection and deliberate stage gates. The tests certify the local offline contract, not empirical vendor response behavior, authenticated account prices, real-property identity or billable live transport.

Final accounting/proposal:

```text
First-subject maximum future attempts: 3
Proposed request-fee reserve: $0.60
Proposed all-in cap: $1.00 — NOT YET AUTHORIZED
Live account entitlement: UNVERIFIED
Search bounds: AWAITING APPROVAL
Provider calls: 0
Database connections/writes: 0
Real financial analyses: 0
MLS Round 1 selections: 0
Deployments: 0
Final classification: OFFLINE CONTROLLED CLIENT CERTIFIED
```

Provider calls, database connections/writes, real financial analyses, analyst approvals, Properties created, MLS access/selections, dependency installs and deployments: **0**. Public documentation/network research this sprint: **0**. Synthetic mock transmissions are not billed/provider traffic.

**STOP FOR STAN/CHATGPT REVIEW. No first real-property acquisition.**
