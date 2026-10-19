# PI assisted address verification V1 — QA

**READY FOR HUMAN ADDRESS REVIEW**

Certification: October 8, 2026 PDT / October 9 UTC. Node **v20.19.4**; existing installed Playwright/Chromium. No dependencies or browser downloaded. Actual Google evidence was read locally; all browser screenshots, decision writes and corruption/expiry experiments use synthetic records in gitignored QA directories.

## Results

**82/82 offline unit/regression tests PASS; 0 failed, 0 skipped.** This is the existing 68-test review/identity/harness/canonical/linkage/persistence coverage plus 14 new suggestion tests, not 150 unique tests. Both the original browser workflow and the added suggestion browser certification pass.

| Required check | Evidence / result |
| --- | --- |
| IP-P1 and IP-P2 permitted exact candidates | Real local gate checks and synthetic API/UI assertions pass; neither populates the draft automatically |
| IP-P3 suffix discrepancy | PARTIAL/AMBIGUOUS; explicit county `CI` / Google `Circle/Cir`; no automatic resolution |
| Expiry | Server denies reuse; browser timer clears content, bound draft, references, selected decision and stale success/approval presentation |
| Changed packet | Self-consistent replacement packet cannot reuse the old evidence binding; browser action blocked |
| Changed evidence bytes | Independent SHA-256 pin fails; raw or tampered content never returned |
| Scope / retention | Wrong reviewer, missing/duplicate grant, unsupported retention basis and manifest-only deadline extension fail closed |
| Draft copying | Components remain UNVERIFIED; approval selection and attestation cleared; no autosave |
| Approval controls | Existing canonical validator, per-component evidence/verification, contradiction assessment, notes and personal attestation still required |
| Acreage | IP-P1/IP-P3 warnings remain; acknowledgment and notes still required |
| Bound decision reopening | Synthetic save/reopen retains content while allowed; expiry hides derived fields and makes decision ineffective; binding cannot be silently removed |
| Access / privacy | Auth, Host/Origin, cross-site, content-type, no-store and CSP checks pass; raw-file routes denied; explicit DTO excludes key/owner/coordinates/place-ID sentinels |
| Live action | Verify Address disabled; POST suggestion denied (403); nonexistent verify route denied (404) |
| Layout | Desktop 1440px and mobile 390px; no horizontal overflow or page-script errors; synthetic screenshots visually inspected |
| Preservation | All 269 captured protected-file hashes unchanged; original packets, decisions, POC evidence/reservations, exclusions and Round 1 flags preserved |

Protected-file checks also cover production source/configuration, package files, environment, ignore rules, migrations and historical baselines. The new private access manifest is an intentional local addition, not a rewrite of any original evidence. No protected baseline hashes were updated.

Final preservation/privacy check at 2026-10-09T05:35:59.026Z: **269/269 unchanged**; 14 edited/new code/document files scanned against actual private address/parcel/candidate values and API-key patterns, **0 matching files**. The private access manifest is gitignored and untracked. No credential value was printed. Port 4318's pre-existing Node listener was left untouched; QA closed only its own ephemeral-port servers.

One existing QA utility needed a narrow filesystem fix: its actual-pilot directory now contains POC subdirectories, so it enumerates files instead of attempting `readFile` on directories. Protected-file assertions remain. Browser timing assertions await completion of the local recheck before assessing visibility; no tests were skipped to obtain PASS.

## Reproduce offline

From the project root:

```powershell
node --import ./src/analysis/offline.js --test scripts/identity-resolution-pilot/review.test.js scripts/identity-resolution-pilot/suggestion.test.js scripts/identity-resolution-pilot/pilot.test.js scripts/mls-validation-round1/gate1b-identity-audit.test.js scripts/mls-validation-round1/harness.test.js scripts/sprint6_3_1/address.test.js scripts/sprint6_3_3/linkage.test.js tests/persistence.test.js
node scripts/identity-resolution-pilot/review-ui-qa.js
node scripts/identity-resolution-pilot/suggestion-ui-qa.js
```

The API worker imports the existing outbound-network blocker. Browser routes permit only the local QA origin, block other requests and count attempted external traffic. Test processes receive no provider or database credentials. Tests use fake/in-memory repository behavior, not live database connections. Real evidence checks print only codes/statuses, not addresses. The real-data test accepts the expected fail-closed state after original evidence expires; synthetic tests independently exercise permitted display and rejection paths.

Machine-readable browser artifacts:

- [Original workflow QA](../data/runtime/identity-review-qa/synthetic-PAAc3G/human-review-qa.json), completed 2026-10-09T05:35:02.195Z.
- [Suggestion browser QA](../data/runtime/identity-review-qa/synthetic-KDf9zj/suggestion-ui-qa.json), completed 2026-10-09T05:33:54.920Z.

These local artifacts are gitignored. The original workflow QA performs synthetic save/reopen operations; the suggestion browser run performs no decision writes. Suggestion unit tests separately exercise synthetic persistence. None modifies real decisions.

## Synthetic screenshots

No actual pilot addresses, parcel identifiers or Google content are captured in these images:

- [IP-P1 exact candidate — desktop](../data/runtime/identity-review-qa/synthetic-KDf9zj/suggestion-p1-exact-desktop.png)
- [IP-P3 differences and acreage warning — desktop](../data/runtime/identity-review-qa/synthetic-KDf9zj/suggestion-p3-discrepancy-desktop.png)
- [IP-P3 full review — mobile](../data/runtime/identity-review-qa/synthetic-KDf9zj/suggestion-p3-discrepancy-mobile.png)
- [Suggestion panel — mobile detail](../data/runtime/identity-review-qa/synthetic-KDf9zj/suggestion-panel-mobile.png)
- [Expired evidence blocked — desktop](../data/runtime/identity-review-qa/synthetic-KDf9zj/suggestion-expired-desktop.png)

## Accounting

| Activity | Result |
| --- | ---: |
| New Google Geocoding requests | **0** |
| ATTOM / RentCast / DataTree / county / other provider calls | **0** |
| Database connections / reads / writes | **0 / 0 / 0** |
| MLS access | **0** |
| Real decisions changed / real analyst approvals | **0 / 0** |
| Canonical resolutions / durable Properties created | **0 / 0** |
| Production modifications / deployments | **0 / 0** |
| Final original-workflow browser loopback requests | **27** |
| Final suggestion browser loopback requests | **18** |
| External browser requests / server outbound attempts, both runs | **0 / 0** |

Loopback counts are for the final successful browser runs, not all development reruns. Earlier synthetic QA runs also made no provider calls. Existing three-pilot live-request accounting and reservations are unchanged.

## Limits and stop

This certifies local presentation, evidence gating and human-decision safeguards, **not** new live Google behavior, parcel identity or analyst approval. Reviewer scope depends on the trusted local account/access code, not enterprise identity. Expiry blocks reuse; it does not delete restricted files/history. Stan remains responsible for the original retention review/deletion deadlines. No new lookup or deadline extension is implicit in READY status.

Launch instructions and exact deadlines: [V1 report](PI_ASSISTED_ADDRESS_VERIFICATION_V1.md). **STOP FOR STAN/CHATGPT REVIEW.** No automatic approval, shared canonical persistence, production integration or Round 1 selection.
