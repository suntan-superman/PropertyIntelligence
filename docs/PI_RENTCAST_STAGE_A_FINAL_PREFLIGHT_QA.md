# PI RentCast Stage A — final preflight QA

Date: 2026-10-12. Runtime: existing Node v22.12.0. No dependencies installed. All test children preload the existing offline guard and receive a restricted environment without provider/database credentials.

## Complete test plan

The successor policy suite tests exact path/hash membership, old/new ignore pins, missing/unrelated/duplicate paths, private-source rejection, traversal and actual Windows junction rejection, failed/stale/skipped proofs and genuine independent review binding. It also checks that the successor engine and complete copied orchestration tests differ from their originals only by the specified mechanical certificate/import selection.

The complete original 65-test Stage A orchestration is additionally run against the successor engine, without deleting, filtering or changing test semantics. The original 65-test file is run separately. All eight existing Stage A regression files, the original 29-test pilot, and the Sprint 6.2/Sprint 6.3 source/protection suites are run in full. Results include failures; no protected test is weakened to obtain a PASS.

Each suite uses fresh test-owned outputs. The original pilot is sandboxed because it writes relative outputs. Historical receipts, TAP files, manifests and certificates remain immutable. Real operator inputs and the fixed actual registry must remain empty.

Command:

```powershell
& 'C:/Users/sjroy/AppData/Local/npm-cache/_npx/f6c81a5e22bed22a/node_modules/node/bin/node.exe' --import ./src/analysis/offline.js scripts/rentcast-stage-a-protection-v2/qa.js
```

## Results

Final run completed October 12, 2026 at **3:32:04 PM America/Los_Angeles** (`2026-10-12T22:32:04.491Z`). **463/467 passed, 4 failed, 0 skipped, 0 cancelled**. Full certification: **FAIL / BLOCKED**. No successor certificate or membership approval was issued.

| Complete suite | Passed / tests | Failed | Skipped |
| --- | --- | --- | --- |
| New successor policy/security | 29/29 | 0 | 0 |
| Successor's complete mechanically ported orchestration | 65/65 | 0 | 0 |
| Original Stage A suite, unchanged | 65/65 | 0 | 0 |
| All eight original regression files | 246/248 | 2 | 0 |
| Original controlled pilot | 29/29 | 0 | 0 |
| Original Sprint 6.2/6.3 source/protection files | 29/31 | 2 | 0 |
| Total | **463/467** | **4** | **0** |

All eleven new JavaScript files also passed `node --check`. Generated-artifact and 351-entry nested-protection assertions in the complete protection suite passed; they were not weakened or skipped.

Exact failures:

- `scripts/protected-baselines-v3/reconciliation.test.js`: Sprint 6.2 exact successor integrity/current pins.
- Same file: Sprint 6.3 exact successor integrity/current pins.
- `scripts/sprint6_2/poc.test.js`: historical exact-source baseline / generated-artifact check.
- `scripts/sprint6_3/schema-review.test.js`: historical baseline / current immutable hashes.

Every failure reports `.gitignore`: expected `9eb820a21ccd85c510613a6194ed26caed429828e884fed6f444b338ad86ecc4`, actual `471b8da0a3018b0a61c8ea66e0e6d5029124804419699c6babc7cdd45a124011`. This is the preceding user-authorized privacy addition, not an unexplained application change. Nevertheless these assertions remain failures and prevent certification. No historical manifests or test references were changed to make them pass.

## Retained run history

Private root: `data/runtime/rentcast-stage-a-protection-v2/`.

| Attempt | Result | Evidence |
| --- | --- | --- |
| Initial runner | 369/467 passed, 98 failed, 0 skipped | `qa-C5k1wz/`; `qa-proof.json` |
| Corrected synthetic-output location | 463/467 passed, 4 failed, 0 skipped | `qa-laAIyB/`; `qa-proof-v2.json` |
| Final hardened verifier | 463/467 passed, 4 failed, 0 skipped | `qa-6SuzSw/`; `qa-proof-v3.json` |

The initial runner incorrectly placed synthetic ledgers outside the unchanged ledger's required private root, causing 94 containment failures in addition to the four historical-pin failures. Only the new QA runner was corrected to use fresh test-owned children of the original permitted private root. No ledger constraint, original test or real registry was altered. That failed run is preserved. The final full run additionally covers symlink-protected detached control reads, group-name safety and proof-count consistency.

Final proof SHA-256: `1448539e2e301387636fdc613ee106da8b592ad7971c6e21f8b73890aa527933`. Earlier proof hashes: `d64945b7245efe6d8147a3d3622e807fee43c798582487a57c21f989962a24e8` and `68c57143649e8b426dc25bf4aa410ac5be00638d19b266f8fe3dcb26285d69de`. Full TAP bytes/hashes are retained for every group in every attempt; no failure was erased or filtered.

The known authorized `.gitignore` transition is separate from unexpected drift. **5,660/5,660 pre-work files match; unexpected changes: 0.** Snapshot SHA-256: `d8a4ddd265695fddf22fae8007f22c0c7dbf10348e8b6744c63448f7ac8dcc88`; aggregate: `804407114d9e8a7f6ef0cd16d9eda4d5624d462fbe9802e10153019f719fd72f`. All 4,826 original protected members remain required; only the exact authorized ignore transition is recognized by the new candidate verifier. The 50 original implementation pins and original 342/342 certificate/TAPs remain unchanged. The unchanged historical tests report their own stale-pin failures.

The final membership proposal is generated after these report bytes are finalized, so it can pin both reports without a circular self-hash. It is not approved or an activated certificate. The separate final handoff receipt binds proposal, proof, final report hashes, read-only inspection and unapproved draft validation. All original and new QA failure receipts remain intact.

Privacy scans cover all 19 proposed additions against the real sealed shortlist and credential/contact patterns. Raw screenshots/correspondence remain ignored and untracked. Public reports omit real addresses, parcel/provider identifiers and owner/contact details.

Accounting: live provider requests 0, real credential loads 0, actual reservations 0, database operations 0, real Properties/financial analyses 0, Stage B/C 0, MLS 0, deployments 0. Test socket responses/authorization records are synthetic only; none enters real operator inputs.

Operational classification: **STAGE_A_PREFLIGHT_BLOCKED**. **STOP FOR STAN/CHATGPT REVIEW.**
