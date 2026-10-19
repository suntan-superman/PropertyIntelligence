# PI RentCast Stage A preflight completion — QA

Date: 2026-10-12. Scope: evidence preparation and focused offline checks, not a new live-execution certificate.

## Method

Runtime: existing Node **v22.12.0**. Offline guard: `src/analysis/offline.js`. No dependency install, `.env` loading, certified implementation edit, protected-baseline change or executor call.

Private output root: `data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/operator-preflight-completion-2026-10-12/` (`P`). The helper `P/review.mjs qa` calls the unchanged pure preflight with current unapproved drafts and separately labeled synthetic control documents in a new `P/synthetic-qa` directory. No transport or reservation mechanism is invoked. Earlier source/draft versions remain intact; current versions are `v3`.

Command, using the existing verified Node executable:

```powershell
& 'C:/Users/sjroy/AppData/Local/npm-cache/_npx/f6c81a5e22bed22a/node_modules/node/bin/node.exe' --import ./src/analysis/offline.js data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/operator-preflight-completion-2026-10-12/review.mjs qa
```

## Focused checks

Result: **19/19 PASS, 0 failed, 0 skipped**, completed `2026-10-12T21:30:10.972Z`. All checks below passed:

1. All 5,593 pre-existing snapshot file hashes unchanged.
2. Original certificate, full historical TAP hashes, 50 implementation pins and 4,826 historical hashes match.
3. Original sealed shortlist, ordinal, source/candidate and exact request bindings match.
4. Four retained complete public-source byte hashes and retrieval metadata match.
5. Two original PNGs equal their retained copies; minute-precision operator capture time and Los Angeles zone are recorded without invented attestation.
6. Full original correspondence matches the current operator input; previous APN-only copy remains intact; the operator's supplied expansion is independently accounted, not rebaselined.
7. Public-source quotes occur in retained source text.
8. Draft schema keys, evidence file hashes, exact quotes and account/authorization bindings match.
9. Real reviewer/approval/expiry fields remain unset; no fabricated confirmed claims.
10. Real draft rejected by unchanged preflight with `CURRENT_ACCOUNT_REVIEW_STOP`.
11. Synthetic valid pure-preflight control passes, with no key or transport.
12. Missing authorization rejected.
13. Expired authorization rejected.
14. Unknown tax and endpoint bounds rejected; reserve stays 20 cents, quota credit zero, all-in cap 100 cents.
15. Membership proposal contains only the two stated exact document hashes and remains unimplemented.
16. Fixed actual operator-input directory and request registry remain empty.
17. New private output is ignored and untracked.
18. Both shareable reports contain no actual shortlist addresses/identifiers, contact data or credential patterns.
19. Offline counters show zero network attempts/provider calls during QA.

Membership-successor positive/negative certification is **NOT APPLICABLE: no successor implemented**. Its absence is an execution blocker, not a silently skipped passing test. No full regression suite is claimed newly rerun; the historical 342/342 PASS certificate is preserved and verified. The current task did not change certified code and explicitly prohibits a source fix that would invalidate that certificate.

## Preservation evidence

| Item | Original identity |
| --- | --- |
| Offline certificate SHA-256 | `bacea3dabc1c8622a2b09c29dd96899ddc6a86627f98d690ee85a620331fa377` |
| Historical QA result SHA-256 | `342a2d03b266c1499fb1398440cf4c1af87cd686bf83d1acb775835ddc2f04e7` |
| Historical preservation manifest file SHA-256 | `7ab3bdd6f47adab1135f91fc5ef99720d9bee85bed444c8e841f8b5e3f944e7e` |
| Historical 4,826-file aggregate | `13d242cc9317fb4a9d982ba1ce29b6bc81cc20370be3f069cae75a32757e2ed4` |
| New 5,593-file preparation snapshot aggregate | `f57b0c3cbec0b1d692d6b3b803112e19b790b1c347a193dfad490545834e6a60` |

The user supplied the email input after the new snapshot and then expanded it in response to the clarification. Its original APN-only version and complete replacement are separately fingerprinted in `source-supplement-v3.json`. This explicit user input transition is not an agent modification to certified evidence or an exception to the snapshot. Neither version is discarded.

The unchanged read-only inspector verifies source seal PASS but remains blocked by immutable new-path membership and missing active operator records. The source hash comparison and the new-path acceptance problem are reported separately; existing protection is not relaxed to call inspection ready.

`qa-result.json` retains per-check results and the exact report drafts present during testing. SHA-256: `2d5b3e4d96980fc10d2d15185db89fc89aa0a61b20a79b6d561fdc31606ccf46`. All **5,593/5,593** pre-existing files matched; original certificate/TAP evidence, all 50 implementation pins and all 4,826 historical hashes matched. No unexpected protected changes occurred.

The final handoff receipt separately hashes final report versions and repeats preservation/privacy checks without rewriting QA evidence or historical receipts. The new-path inventory contains exactly the two prior operator documents, the completion instruction, the two completion reports and the three user source files. Hash integrity PASS is deliberately not reported as membership acceptance PASS.

## Accounting and limitations

During offline QA: network attempts 0, provider calls 0. Entire task: provider-data API requests 0, database connections/writes 0, key loads 0, actual reservation rows 0, active authorizations 0, real financial analyses/Properties 0, MLS activity 0, deployments 0.

Permitted public-document research is separately counted: 4 direct unauthenticated HTTPS document downloads and 6 web-tool page opens across 4 official public pages. No authenticated dashboard access or property-specific request. This task is not described as having zero total Internet traffic.

Privacy covers the two newly authored shareable reports and new ignored copies. The user-owned `source_docs` originals are untracked/nonignored and include correspondence contact details; they must not be committed. No ignore file, original input, certificate, application code, historical analyst decision or ledger was edited by the assistant.

Operational result: **ADDITIONAL EVIDENCE REQUIRED**. No Stage A authorization issued. **STOP FOR STAN/CHATGPT REVIEW.**
