# PI versioned protected baseline reconciliation

Date: 2026-10-09 (America/Los_Angeles). Machine timestamps are UTC.

Final classification: **VERSIONED BASELINE RECONCILIATION CERTIFIED**

## Outcome

Implemented the exact successor procedure authorized after [the discrepancy audit](PI_SPRINT6_2_BASELINE_DISCREPANCY_AUDIT.md). Both historical v2 baselines and the original nested manifest remain byte-for-byte unchanged. Six previously authorized product-source transitions are recognized in coordinated v3 successors; no product implementation was edited.

The nested successor changes only the reviewed MAO pin. The three existing files edited in this task contain only required baseline/checker reference substitutions. New versioned verification tools and a detached seal protect those changes without circular content hashes.

Final isolated certification: **532/532 test executions passed; 0 failed, 0 skipped, 0 cancelled**. The count includes deliberate overlap between complete regression groups. Full evidence and the preserved first-run isolation failure are in [the QA report](PI_VERSIONED_BASELINE_RECONCILIATION_QA.md).

## Successor identities

| Artifact | SHA-256 |
| --- | --- |
| `config/protected-baselines/reconciliation-v3-seal.json` | `6ff4a600f29a2d824a7b4fba02f192e4c88251591c6ecb78560bf5dbe7a921cd` |
| `config/protected-baselines/sprint6_1-nested-v3.json` | `4e85c67e6e6014b6f57c05aa8969742b23badbe1bf9f17d4efeb9c9ba67b7313` |
| `config/protected-baselines/sprint6_2-current-v3.json` | `65a8727acc5cec709ee900d83b46e114f20bed3b74f106761d64419a111653ba` |
| `config/protected-baselines/sprint6_3-current-v3.json` | `c34b73173ea1b4d89b87aee6b66599aa1d092b1d39831b56063cf9a566b49f49` |

| Baseline | Baseline identity | Exact files | Exact additions | Generated paths | Unique membership |
| --- | --- | ---: | ---: | ---: | ---: |
| Sprint 6.2 v3 | sprint6_2-authorized-successor-v3 | 541 | 6 | 26 | 573 |
| Sprint 6.3 v3 | sprint6_3-authorized-successor-v3 | 566 | 5 | 26 | 597 |
| Nested v3 | Separately versioned file; inherited metadata preserved | 351 | 0 | 0 | 351 |

The parent schema remains `PI_PROTECTED_BASELINE_V1` for compatibility; v3 identity is explicit in the versioned path, baselineId, predecessor and authorization records. Preparation time is `2026-10-09T22:52:20.250Z`; successful execution completed at `2026-10-09T23:03:18.608Z`.

## Six authorized product-source transitions

Before constructing successors, all six old hashes were checked against **both reviewed v2 manifests**, and all six actual file-byte hashes were checked against the audit. These are the sole product-source transitions. The current product files already held these bytes and were not changed by this task.

| Path | Historical SHA-256 | Authorized successor SHA-256 | Evidence |
| --- | --- | --- | --- |
| `apps/web/src/app/App.jsx` | `251a346e01b9f03c6fdba83b552614c27cf908c76f3ee1bba4b5243ed5cc9d6c` | `4054620d81b77bade01b7476a16e3dfed9e3166a42ef9e8aa204651f8bd4bdc0` | E1 |
| `apps/web/src/main.jsx` | `026915ec557212054e2f79ab4e2dec7cb6b32e1ade715625fdbfef56888f1757` | `c27e6f0ff6ccca35f958d8246504ca03897e2553a68781ef45fba4f555d1a948` | E1 |
| `apps/web/src/styles.css` | `97fe8de16223de83449d27292c9972e34e175788d950bb66e03c173056570d05` | `5c6336371d16b4400f1464490bc2341b57a106f5f64d33928063757f1bbf6e12` | E1/E2 |
| `package.json` | `4c4abcfb61ab6b11a1a31ee1744e53485874b359c85fc62ef7878be208d857ba` | `417110d584c0de6d818b8c2989054b378165886be680c80bc6b196d5a94013c0` | E1 |
| `src/underwriting/mao.js` | `91cc141c5eef94a4310339800ec6bd8f523b17e0d46f92c24a11f4f510e7ec2e` | `ce80b905f08a74105b6ebd04358c5958d95f1b8ec4ec5337fc581ee31bddcee1` | E3 |
| `scripts/qa-investor-reports-v1.js` | `1a7ad05cf9d725651821cfe3eef9beda0dea7a528ee6c09bb94d4002521a4581` | `1cf0be74b3b19df3f82d47dedf1ccb11228de0dd396ecc4a4aa5d8124c549f2d` | E4 |

The unchanged audit, itself pinned by SHA-256, retains the exact diff/history and authorization evidence:

- **E1:** Continuous Monitoring V1 attachment `cb554424-3fbb-405f-8c7d-262573513e66`, sections 8, 16–18, 20; one App navigation link, isolated monitoring entrypoint, monitoring-only CSS and three package commands. Corroborated by the existing monitoring overview and QA.
- **E2:** Monitoring V1.1 attachment `df8f6f2a-47ec-4b7e-ab21-6a6048333f2a`, sections 9–19, 21–22; additional monitoring/responsive presentation.
- **E3:** Monte Carlo Certification V1 attachment `be11b228-be69-4a36-b893-5e19004a2d1a`, sections 1–5, 14, 21; versioned debt accounting, rate precision and solver safeguards. The exact MAO hash is recorded in `PI_MONTE_CARLO_V1_CERTIFICATION.md`.
- **E4:** Investor Report V1.1 visual-polish attachment `397c18c2-c20f-423b-82d0-e9dcf6f17f75`, sections 12, 15, 19–21; expanded visual/report QA. This task did not change report calculations or this QA source.

Authorization is the current explicit request, not Git status or a generic “later development” allowance. Each successor retains the original explanatory metadata and adds exact old/new authorization records referencing the audit.

## Mechanical reference transitions

These are separately authorized checker/reference edits, not additional product-source changes.

| Path | Historical SHA-256 | Authorized successor SHA-256 | Evidence |
| --- | --- | --- | --- |
| `scripts/sprint6_2/poc.test.js` | `22cbf468be2bc16250f36dafb5ff625f0cf9433896c646360af277484602ee02` | `43fdbbdcc69c69a3661f9f4f8e3ffc12113a1ba7f81fdd6d31ee0a6e5fddf333` | Current authorization; exact reversible reference substitutions below |
| `scripts/sprint6_3/schema-review.test.js` | `c3757cee85b5b61259221ca5e641441e9d6849e917066c1453d86c863f8fdfa5` | `f9424ea05f15d54fe3e7488ab8cf0a9b3e0d10e7d555e31f4a2b141bf5ff8306` | Current authorization; exact reversible reference substitutions below |
| `scripts/sprint6_3/source-plan.js` | `c7b97ae8ba85e3a3dfe2bd225fe8dc0d141015a17ee0e16f436b4d7c25f61c60` | `0bc72220da1c2f3f4a7431c52540f8eebad55e09aef1d1e6c8c82f060f6920e4` | Current authorization; exact reversible reference substitutions below |

Exact substitutions:

1. `scripts/sprint6_2/poc.test.js`: import `../protected-baseline-qa.js` becomes `../protected-baselines-v3/verify.js`; `sprint6_2-current-v2.json` becomes `sprint6_2-current-v3.json`.
2. `scripts/sprint6_3/schema-review.test.js`: the same checker import change; `sprint6_3-current-v2.json` becomes `sprint6_3-current-v3.json`.
3. `scripts/sprint6_3/source-plan.js`: only `sprint6_3-current-v2.json` becomes `sprint6_3-current-v3.json`. This is required because the source-plan protection checks the shared Sprint 6.2 test hash using the Sprint 6.3 baseline. No import, source-plan behavior or database behavior changed.

For each file, reversing exactly those substitutions must reconstruct its entire historical byte hash. Replacement occurrence counts are exact. Extra code or unrelated edits fail. The resulting exact new hashes are pinned in both successors and the detached seal.

## Nested MAO protection

`config/protected-baselines/sprint6_1-nested-v3.json` is a clone of the complete original nested JSON with only the `src/underwriting/mao.js` SHA changed from the E3 old value to the E3 new value above.

All 351 path entries, ordering and original metadata are retained. The other **350 hashes are identical**. Both parent successors pin its exact new file hash and the original nested path/hash/count.

The old nested file still means the historical source snapshot. It is separately checked against `483d243301a8aaf180a95e381eb10408a2cf76935a9eb9494bc04fe89a003b42`, not rewritten or represented as matching current MAO. Current source validation checks every one of the 351 successor pins; MAO is not skipped.

## Generated-artifact policy and unchanged protection

Both parents preserve the exact existing 26 generated records, historical hashes, formats and treatment, as well as every other protected entry and hash. Unique membership and exact arrays are compared against the expected narrow successor; any extra/missing path or altered policy fails.

The new generated-artifact checker preserves the original function's assertions verbatim except for selecting the separately verified nested successor. It adds an original nested count check. Runtime verification compares the copied function body to the SHA-pinned old helper after exactly that permitted substitution, rejecting policy drift.

Existing checks retained and passed include PDF signatures, historical-hash syntax, closed-list membership, JSON PASS/results/page-count checks, zero-failure/zero-skip unit summary checks, 15 historical PDF-result checks, and all 351 current nested source hashes. This is structural/content validation of the historical generated artifacts, not a claim that historical PDF bytes were regenerated or freshly visually inspected.

## Versioned tools and acyclic protection

| Artifact | SHA-256 |
| --- | --- |
| `scripts/protected-baselines-v3/contract.js` | `bfef15219832f77a22b48d43522638d8b110c3ab82dc47a6b3c8b9e2c93dd36c` |
| `scripts/protected-baselines-v3/verify.js` | `37a144dff1e60d1e8d7837b1de7e9884af991051553d98ec2f88d301cf944093` |
| `scripts/protected-baselines-v3/reconciliation.test.js` | `568fd099b484401c65f972c9c0f6f206411880fde00699958e09afb59d8c8d70` |
| `scripts/protected-baselines-v3/certify.js` | `2a02a5db59e15bd95d1d12d8ad41534b8ec603f2039e328871d4ce308ff7af1f` |

`contract.js` holds the exact reviewed transitions and narrow construction/comparison rules. `verify.js` checks all anchors, seal membership, actual bytes, unchanged original exact-hash checks, generated policy and nested protection. `reconciliation.test.js` includes negative cases. `certify.js` isolates regression output and checks before/after preservation.

The detached `PI_DETACHED_PROTECTION_SEAL_V3` contains exactly **17 explicit paths**: the audit, old checker, four new tools, three mechanically changed files, both old/new parent baselines, both old/new nested manifests and both original historical source manifests. It does not include itself. The parent manifests hash leaf sources/reference files and the nested manifest; no helper/test embeds its own current SHA or a manifest-content hash that points back to itself. There is no hash fixed-point requirement.

The seal's exact identity is recorded above and in the successful machine summary. It is a local review/integrity artifact, not an external digital signature or protection against replacing an entire trusted checkout. These two result documents are receipts, not seal inputs.

## Historical preservation

These bytes are unchanged:

| Artifact | SHA-256 |
| --- | --- |
| `config/protected-baselines/sprint6_2-current-v2.json` | `512fd4075662f29ca1012b4567c1b38d60ba2c335ab46546d15fbc1ab3d387f2` |
| `config/protected-baselines/sprint6_3-current-v2.json` | `7fb518c89ee7c6b607e9038515fc04de732bfc1244713ce4a2270d0bd0a88ee3` |
| `data/runtime/sprint6_2-kern-assessor/repository-baseline.json` | `a1adde8cdb5600fe51150b192e37de8e7fc6cbdfd3f5631daab255b4ddf8e7d9` |
| `data/runtime/sprint6_3/baseline.json` | `eefc99778702317f8da83d93ef3f80aa3a8abd73eac3f5dab04725af092160d3` |
| `data/validation/sprint6_1-protected.json` | `483d243301a8aaf180a95e381eb10408a2cf76935a9eb9494bc04fe89a003b42` |
| `scripts/protected-baseline-qa.js` | `44f91437feaa69da94ce4a3bc7cd23b2b7d734f8b378d6c6140bfd6ed49f8e76` |
| `docs/PI_SPRINT6_2_BASELINE_DISCREPANCY_AUDIT.md` | `72dc81963d3beb22263d8cc66cfe118ba8a035a3dfe17139a989dba212831537` |

The pre-work census covers **3,779 existing paths**, combining Git-listed nonignored tracked/untracked files and the prior Rule C preservation inventory. Post-run: **3,776 byte-identical; exactly the three approved mechanical reference changes; 0 unexpected changes**. All **3,947 copied pre-existing isolated files** also remained unchanged after tests.

This is an explicit task-preservation inventory, not a claim to have hashed every ignored raw file on the machine. Existing county/RentCast evidence, analyst decisions, V3 source/artifacts, Monte Carlo, investor reports and Round 1 artifacts in scope were preserved. No v2 baseline, historical generated artifact or previous failure certificate was overwritten.

Ten new reviewable files were created: four tools, three successor manifests, one seal and the two requested documents. QA artifacts live under fresh private run directories. No old file was deleted. No work was committed or deployed.

## Boundaries and handoff

Provider calls: **0**. Database connections/reads/writes: **0**. MLS access: **0**. Migrations/deployments: **0**. Real-property approvals/persistence/acquisition and Round 1 selections: **0**.

No `reconcile-protected-baselines.js --write --replace`, automatic worktree acceptance, wildcard source exemption, test skip/filter, Rule C change, V3 change, financial calculation change or historical artifact rewrite was used.

This certifies the narrow local baseline reconciliation and specified offline regressions. It is not production readiness, a production data certification, a new investment approval or authorization for further acquisition.

**STOP FOR STAN/CHATGPT REVIEW.**

