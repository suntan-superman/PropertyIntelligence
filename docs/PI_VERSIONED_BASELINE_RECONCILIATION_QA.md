# PI versioned protected baseline reconciliation — QA

Date: 2026-10-09 (America/Los_Angeles). Machine timestamps are UTC.

Final classification: **VERSIONED BASELINE RECONCILIATION CERTIFIED**

## Final result and exact tested revision

**532/532 test executions PASS; 0 failed, 0 skipped, 0 cancelled.** Every group exited 0. There were 32 test-file executions covering 30 distinct files; overlapping foundation/Sprint 6.2 tests are intentionally included in complete group totals.

The exact tested manifests, six audited transitions and three mechanical reference transitions are recorded in [the reconciliation report](PI_VERSIONED_BASELINE_RECONCILIATION.md). The successful seal SHA-256 is:

`6ff4a600f29a2d824a7b4fba02f192e4c88251591c6ecb78560bf5dbe7a921cd`

This seal pins the exact four new tools and all reviewed manifest/reference inputs. No source changes followed the successful run; only these requested result documents were added.

Runtime: **Node v22.12.0**, invoked explicitly from:

`C:/Users/sjroy/AppData/Local/npm-cache/_npx/f6c81a5e22bed22a/node_modules/node/bin/node.exe`

Successful run: `data/runtime/versioned-baseline-reconciliation/run-WF5zED`.
Completion: `2026-10-09T23:03:18.608Z`.

## Executed groups

| Group | Test files | Passed/total | Failed | Skipped | Cancelled | Test process duration |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| successor-integrity | 1 | 36/36 | 0 | 0 | 0 | 10.569 s |
| sprint6-regressions | 7 | 57/57 | 0 | 0 | 0 | 3.647 s |
| rule-c-focused | 1 | 40/40 | 0 | 0 | 0 | 0.329 s |
| rule-c-complete | 6 | 125/125 | 0 | 0 | 0 | 11.927 s |
| monitoring | 2 | 23/23 | 0 | 0 | 0 | 0.313 s |
| application-financial-reports | 15 | 251/251 | 0 | 0 | 0 | 18.579 s |
| **Total executions** | **32** | **532/532** | **0** | **0** | **0** | **45.364 s** |

Duration excludes copying and preservation hashing. Per-group JSON and complete TAP output are retained in the run directory. No name filtering, skip flags, omitted failure, weakened assertion or provider/database access was used.

## Required integrity and rejection gates

| Gate | Result / evidence |
| --- | --- |
| Exact old source hashes | PASS — all six verified against both SHA-anchored v2 manifests before construction and during successor validation |
| Exact new source hashes | PASS — all six checked against reviewed audit pairs and actual current file bytes |
| Exact successors | PASS — full deep equality to the narrowly derived successor; all current exact hashes checked |
| Wrong old hash | PASS — negative case for each of six source transitions and nested MAO |
| Wrong new hash/current bytes | PASS — separate manifest-hash and current-byte rejection for each of six transitions |
| Unrelated path/extra transition | PASS — rejected unrelated source pin and extra/missing membership |
| Missing file | PASS — ENOENT propagates; no catch-and-ignore |
| Altered generated policy | PASS — missing/extra path, changed format/historical hash/treatment rejected |
| Authorization tampering | PASS — altered evidence record rejected |
| Nested protection | PASS — 351/351 actual entries; exactly one reviewed pin change; wrong old/new, unrelated and missing entry rejected |
| Generated structural/content checks | PASS — all 26 paths and original checks retained; no historical regeneration |
| Mechanical changes | PASS — reverse exact substitutions reconstruct all three old hashes; extra code rejected |
| Detached seal | PASS — exact 17-path membership/content hashes; self entry forbidden |
| Original evidence | PASS — both v2, both historical source manifests, original nested/helper and reviewed audit unchanged |
| Main task preservation | PASS — 3,779 checked; 3,776 identical, three authorized mechanical changes, zero unexpected |
| Isolated existing inputs | PASS — 3,947 copied files byte-identical after tests |

The 36-test successor suite includes all rejection cases; several cases intentionally loop through multiple malformed inputs without modifying real protected files. No missing-file test deletes a real artifact.

## Offline execution and output isolation

The runner creates a fresh `workspace` under a unique private `run-*` directory. It copies existing required protected/model/report and cached comparison/provider fixtures, never downloads or regenerates them. Cached fixture dependencies are enumerated by the existing `sprint3-protected-inputs.json` and `sprint3_2-protected-inputs.json` and verified against their exact hashes before copying.

No `.env`, Netlify runtime state or credential files are copied. Installed dependencies are reused through a local `node_modules` junction; there is no install, upgrade or browser download. Child environment values are restricted to required OS/runtime paths; provider/database credentials are not passed.

Every test worker preloads the existing `src/analysis/offline.js` network guards. Tests use fixtures and fake database query dependencies; guard tests may deliberately attempt calls that must be blocked. Accordingly, zero successful provider/database operations does not mean zero deliberately blocked test attempts. Synthetic PDF tests use the existing renderer and its request-blocked browser configuration.

Regenerating tests write only in the fresh isolated workspace or its test-owned temporary directory. Existing copied inputs are rehashed afterward. No historical QA directory in the main workspace is used as a new output target. The original Rule C reconciliation implementation and QA wrapper are untouched.

### Rule C wrapper distinction

The focused one-file and complete six-file lists below are **exactly the unchanged lists from `scripts/rentcast-reconciliation-v1-1/qa.js`**, executed with its same offline preload/test-reporter arguments. The complete suite passed **125/125**, focused **40/40**.

The older wrapper also enforces its pre-reconciliation, task-specific preservation snapshot, including the old Sprint 6.2 checker-reference bytes. That historical snapshot was not rebased or overridden. The wrapper was not invoked to rewrite its old certificate. This new certification separately verifies the approved three reference transitions and all other preservation bytes, and stores fresh logs. It does not claim the old one-time snapshot now byte-matches the successor test references.

## Preserved failed first attempt

The earlier run `data/runtime/versioned-baseline-reconciliation/run-hNP5J1` is retained without modification. It passed the first five groups, but the application/report group was **218/239**, with **21 failures**, zero skips, exit 1.

Inspection traced these failures to an incomplete isolated copy: missing existing comparison CSV dependencies, missing cached RentCast fixture input, a fixture runtime response dependent on those files, and a Sprint 2 module that could not finish loading. This was not accepted as a product PASS.

The only correction was to the **new** isolation runner: copy the explicitly manifest-enumerated existing fixture dependencies after checking their source hashes. The new-file census exclusions were also narrowed to an explicit owned-file set. The draft runner's seal pin was updated before repeating certification. No product code, old tests, expected financial values or assertions changed.

Every group was rerun unfiltered in the fresh `run-WF5zED` directory using the original pre-work preservation snapshot. The application count increased to **251** because the previously failing Sprint 2 module could load and discover its actual tests; no new product test was introduced to manipulate the count. The first failure and its old runner/seal copy remain evidence of the attempt, not a current certified revision.

## Reproduction

From the repository root, use the verified Node executable above. The successful full rerun command was:

~~~powershell
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' scripts/protected-baselines-v3/certify.js --retry-from data/runtime/versioned-baseline-reconciliation/run-hNP5J1
~~~

For a later complete repeat, `--retry-from data/runtime/versioned-baseline-reconciliation/run-WF5zED` verifies the seal/preservation and creates another unique run directory. Do not reuse a run directory for `--run`, overwrite its artifacts, or invoke the pre-edit `--prepare` gate as a rolling rebaseline.

The read-only focused integrity command is:

~~~powershell
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' --import ./src/analysis/offline.js --test --test-reporter=tap scripts/protected-baselines-v3/reconciliation.test.js
~~~

## Machine evidence identities

| Artifact | SHA-256 |
| --- | --- |
| `data/runtime/versioned-baseline-reconciliation/run-WF5zED/summary.json` | `c1ec7e8e4b1859a4fbf39c9646ec5c54318093af17541dba92dd5c347f3f3b7c` |
| `data/runtime/versioned-baseline-reconciliation/run-WF5zED/preservation-before.json` | `98a0811e2f7f4b4c0e7da4cbae6c2d89afaa497225cea75b2abf3cb9c7e1ab9b` |
| `data/runtime/versioned-baseline-reconciliation/run-WF5zED/retry-provenance.json` | `9e7fd0af5cb5773d901e41e50f142dcb2e40130dc436e6a01196de02c5848c02` |
| `data/runtime/versioned-baseline-reconciliation/run-hNP5J1/failure.json` | `87a547bddd4663c72b85782875e3e5f29d027a53704613c89129aa7b09eae1d8` |
| `data/runtime/versioned-baseline-reconciliation/run-hNP5J1/application-financial-reports.json` | `860d26bd95a08ed5c6a121362baf97fe2aaf48bc4420da8cb15fc3633983d995` |

The successful run includes the unchanged pre-work snapshot, retry provenance, complete per-group TAP/JSON and summary. These private artifacts are gitignored; the shareable documents contain hashes/counts and paths, not credentials, property details or raw provider payloads.

## Complete test-file inventory

### successor-integrity

- `scripts/protected-baselines-v3/reconciliation.test.js`

### sprint6-regressions

- `scripts/sprint6_2/poc.test.js`
- `scripts/sprint6_3/api.test.js`
- `scripts/sprint6_3/assessor.test.js`
- `scripts/sprint6_3/certification.test.js`
- `scripts/sprint6_3/schema-review.test.js`
- `scripts/sprint6_3_1/address.test.js`
- `scripts/sprint6_3_3/linkage.test.js`

### rule-c-focused

- `scripts/rentcast-reconciliation-v1-1/reconcile.test.js`

### rule-c-complete

- `scripts/rentcast-controlled-pilot/pilot.test.js`
- `scripts/sprint6_2/poc.test.js`
- `scripts/identity-resolution-pilot/pilot.test.js`
- `scripts/identity-resolution-pilot/review.test.js`
- `tests/foundation.test.js`
- `scripts/mls-validation-round1/harness.test.js`

### monitoring

- `src/monitoring/monitoring.test.js`
- `src/monitoring/real-attom.test.js`

### application-financial-reports

- `tests/acquisition-linkage.test.js`
- `tests/deal-cleanup.test.js`
- `tests/foundation.test.js`
- `tests/investment-report.test.js`
- `tests/investor-mc-integration.test.js`
- `tests/investor-presentation.test.js`
- `tests/investor-report-v1.test.js`
- `tests/maps.test.js`
- `tests/monte-carlo-v1.test.js`
- `tests/persistence.test.js`
- `tests/presentation.test.js`
- `tests/runtime.test.js`
- `tests/sprint2.test.js`
- `tests/supabase.test.js`
- `tests/workbench.test.js`

## Safety accounting and limits

| Operation | Count |
| --- | ---: |
| Successful provider calls | 0 |
| Database connections / reads / writes | 0 / 0 / 0 |
| MLS access | 0 |
| Migrations / deployments | 0 / 0 |
| Real-property approvals / persistence / acquisition | 0 / 0 / 0 |
| Round 1 selections / authorization changes | 0 / 0 |
| Existing application/product source edits | 0 |
| Existing baseline-reference file edits | 3, exact and authorized |
| Historical baseline/generated artifact rewrites | 0 |
| Dependency/runtime/configuration changes | 0 |

Monitoring unit/real-data-adapter, Monte Carlo, investor integration/presentation/report and runtime/security assertions ran as listed. This is not new provider sampling, production UI certification, full browser visual recertification or database certification. Existing generated-artifact content gates passed without rewriting old outputs.

**STOP FOR STAN/CHATGPT REVIEW. No further acquisition, persistence, production integration or Round 1 execution is authorized by this result.**

