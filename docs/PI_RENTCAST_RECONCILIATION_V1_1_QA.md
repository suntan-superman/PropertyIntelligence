# RentCast Reconciliation V1.1 — QA

2026-10-09. Final classification: **MORE DEVELOPMENT REQUIRED**.

## Results

| Gate | Result |
| --- | --- |
| Focused strategy tests | **40/40 PASS**, 0 skipped |
| Relevant existing regressions | **124/125 PASS**, 1 failure, 0 skipped |
| Combined latest suites | **164/165 PASS**, 0 skipped |
| Three-record real offline replay | PASS; expected independent outcomes, deterministic second evaluation |
| Existing APN9 rule | Unchanged; exact and normalized precedence tests pass |
| County/source fingerprints | PASS |
| Cardinality / original-identifier preservation | PASS |
| Historical/current/review/persistence separation | PASS |
| Protected-file preservation | **3,134/3,134 unchanged** |
| Overall certification | **WITHHELD** pending protected-baseline review |

Runtime: existing Node **22.12.0**. No dependencies/runtime/configuration were changed. Network blocking was preloaded. Synthetic mocks are not live provider/database requests.

## Exact regression blocker

Test: `scripts/sprint6_2/poc.test.js`, “historical exact-source baseline and narrowly scoped generated-artifact checks pass,” near line 18.

Historical manifest: `config/protected-baselines/sprint6_2-current-v2.json`.

First failing protected entry: `apps/web/src/app/App.jsx`.

| Fingerprint | SHA-256 |
| --- | --- |
| Historical expected | `251a346e01b9f03c6fdba83b552614c27cf908c76f3ee1bba4b5243ed5cc9d6c` |
| Actual, captured before V1.1 changes | `4054620d81b77bade01b7476a16e3dfed9e3166a42ef9e8aa204651f8bd4bdc0` |
| Actual after tests/replay | `4054620d81b77bade01b7476a16e3dfed9e3166a42ef9e8aa204651f8bd4bdc0` |

This establishes that the mismatch predated this task; it does **not** establish authorization for that older change. No app code, test assertion or baseline entry was modified. The baseline test stops at the first mismatched entry, so this report does not claim it is the only possible stale entry. No broad historical reconciliation was undertaken.

The complete existing regression run was retained with its failure. It was not filtered, skipped, relabeled green or replaced with the newer preservation inventory. The latter proves this task caused no protected modifications; it does not make the older baseline test pass.

## Required negative controls

The focused suite exercises all 25 requested controls:

| Controls | Result / behavior |
| --- | --- |
| Missing APN; duplicate APN; conflicting APN9 targets; multiple relevant ATNs | Reject; no arbitrary row selection |
| Wrong candidate APN9/ATN; wrong county/state | Reject with preserved source evidence |
| Invalid fingerprint; missing source-row reference | Fail closed before acceptance |
| Leading-zero mismatch; numeric input; unsupported padding; calculated check-digit substitute | Reject; only ordinary spaces/hyphens removed for comparison |
| ATN accepted as APN; address-only match | Reject; ATN diagnostics never become equivalence |
| Property-type conflict | Quarantine, no historical PASS |
| Known inactivation; unresolved split/merge/transfer | Quarantine |
| Unknown current freshness | Historical observation may pass, but routine eligibility/current verification/persistence remain false |
| Changed original evidence; changed candidate mapping; another candidate's evidence | Reject fingerprint/candidate binding |
| Automatic approval; durable persistence requests | Throw explicit unauthorized-action error |

Additional tests cover exact and normalized APN9 precedence, source APN references, string/leading-zero preservation, unsupported whitespace, missing/ambiguous/unknown history, suffix/unit/ZIP/city/street consistency, wrong edition/incomplete table scans, changed source-row projection, deterministic fingerprints, provider-ID separation/duplicates, independently decoded structured source references, missing identity-state flags and zero network attempts.

The original real results remain `APN_CONFLICT` inside their unchanged original artifacts. Only the new versioned RC-P2 result reports `DOCUMENTED_HISTORICAL_APN_CROSSWALK`. No test fixture was substituted for real replay evidence.

## Existing test files run completely

1. `scripts/rentcast-controlled-pilot/pilot.test.js`
2. `scripts/sprint6_2/poc.test.js`
3. `scripts/identity-resolution-pilot/pilot.test.js`
4. `scripts/identity-resolution-pilot/review.test.js`
5. `tests/foundation.test.js`
6. `scripts/mls-validation-round1/harness.test.js`

No test-name filter or skipped test was used. Existing county/RentCast tests created their own new synthetic scratch files; no prior raw source, response or decision file was overwritten. The V3 PostgreSQL runner, live acquisition commands and other providers were not invoked.

## Evidence and reproduction

Private, append-only logs are under `data/runtime/rentcast-reconciliation-v1-1/qa/`. Earlier intermediate focused runs and the first regression failure remain preserved; summary counts use the latest complete targeted/regression run once each, not cumulative executions.

The offline replay manifest and three results are under `replay-2026-10-09T22-29-15.713Z/` in that private directory. Source evidence uses the original fixed package fingerprints and actual source rows; result fingerprints repeat identically on a second in-memory evaluation.

Commands used from the repository with the existing verified Node executable:

```powershell
node scripts/rentcast-reconciliation-v1-1/prepare.js
node scripts/rentcast-reconciliation-v1-1/qa.js --targeted
node scripts/rentcast-reconciliation-v1-1/replay.js
node scripts/rentcast-reconciliation-v1-1/qa.js --regression
```

Preparation is exclusive and refuses an existing output root. These commands performed no live acquisition and did not reset any pilot reservations. Do not treat the command record as authorization to resume beyond this sprint's STOP.

## Safety

Original protected sources, receipts, ledger, evidence/packet seals, county files, analyst decisions, Round 1 artifacts and certified model/report files remained unchanged. New reports use pilot codes only; private identifier/source projections remain in gitignored storage. No owner/contact payloads or provider credentials were copied.

Provider calls **0**; database connections/writes **0**; MLS access **0**; current identities verified **0**; approvals **0**; durable Properties **0**; Round 1 selections **0**; deployments **0**.

**STOP.** Full certification cannot be labeled `RULE C OFFLINE CERTIFIED` while the required regression suite is not green.
