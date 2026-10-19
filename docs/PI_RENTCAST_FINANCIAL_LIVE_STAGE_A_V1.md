# PI RentCast financial live Stage A V1

Date: 2026-10-12. Implementation and offline certification only. Live status: `STAGE_A_PREFLIGHT_BLOCKED`.

## Scope and implementation

The new local entrypoint is `scripts/rentcast-live-stage-a-v1/run.js`. Its default action is read-only inspection. The explicit `execute` action is gated; it was not invoked for acquisition. There is no browser route, environment-only activation, force flag, subject override, alternate registry, or Stage B/C command.

Only technical ordinal 1 of the original sealed shortlist is permitted. The seal remains `ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4`. Existing private candidate/Assessor relationships, exclusions, original county archive/table fingerprints, complete table census and exact source-row references are rechecked locally. The request uses the sealed county street/city and the California jurisdiction constraint; no ZIP is invented. No current database lookup is made, so historical evidence is not represented as current parcel verification.

The original controlled-client constructor, request contract, projection, Rule C reconciliation and ledger implementation are unchanged. The new wrapper narrows the original three-stage machinery to one Stage A attempt, one conservative 20-cent request-fee reservation, and verified additional charges within a 100-cent all-in ceiling. Remaining included requests never reduce that reservation.

Original evidence/Rule C modules intentionally install the offline network guard. A separate, bounded, credential-free offline child performs source verification and unchanged reconciliation. The parent has a single narrow HTTPS transport; it does not remove or bypass the original offline guard. Raw responses exist in memory only and are passed to that offline child for allowlisted projection. No second ingestion or identity policy is introduced.

## Transport and preservation controls

- Exact `GET https://api.rentcast.io/v1/properties`, with only the `address` query parameter.
- Server-side `RENTCAST_API_KEY` from the ignored local credential file, read only after other preflight gates. No environment-wide credential loading, alternate key, unauthenticated probe or dashboard API request. The key is not loaded during this certification.
- Native HTTPS with certificate verification; no redirects, retry loop, pagination or fallback. Fifteen-second total request deadline; 2 MiB response limit; compressed/unexpected payloads and unsafe schemas stop.
- One fixed private registry under `data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/registry`. An exclusive process lock and fsynced append-only reservation precede transmission. Any retained reservation or orphan outcome blocks reuse. A crash, timeout or uncertain response consumes the attempt; no automatic refund/reset is implemented.
- One hash-linked outcome records the conservative exposure, response fingerprint where complete, projected evidence, source/authorization bindings and stop classification. Actual billing remains unknown without independent verification.
- Owner/contact payloads and raw responses are not retained. Provider identifiers remain assertions until unchanged exact APN9/Rule C reconciliation succeeds. Success still means historical-source agreement only, not analyst approval or current identity verification.
- Existing files, original manifests, historical reservations and decisions are preserved byte-for-byte. New outputs use new, ignored Stage A directories; no previous output is regenerated.

An append failure after reservation cannot restore permission to request again. Consult the fixed ledger and stop for review even if the command returns a generic safe error.

## Evidence-based preflight

The fixed `operator-inputs` directory requires `account.json`, `authorization.json` and locally saved, sanitized source excerpts. Reviewed claims must bind to actual readable source bytes, a SHA-256, an exact supporting quote, reviewer identity, review time and source category. Plan/product, usage, fees/taxes and rights have separate evidence bindings. Current review observations must be no older than 24 hours; authorization must remain valid beyond the 15-second request deadline.

The expiring single-stage authorization binds the exact shortlist, ordinal, candidate/source context, request, account, rights, fee evidence, offline certificate, fixed registry, one-attempt limit, monetary ceiling and mandatory stop. Source, reviewed inputs and certification fingerprints are rechecked immediately before reservation.

This validates source content and a human review attestation, not a vendor digital signature or account authentication. A locally fabricated attestation is not independent evidence. No real account verification or authorization record was manufactured by this task. Synthetic records are labeled as tests and remain in separate test-owned directories.

The user reported 3 of 50 requests used, with 47 remaining; earlier Developer pricing was $0/month with $0.20 overages, and prior written permission covered the proposed commercial use. Those facts are acknowledged, not silently promoted into verified current product entitlement, a tax/fee bound, a current terms review, or a dated expiring execution authorization.

## Certification and current outcome

Offline results: **PASS — 342/342 tests, 0 skipped, 0 failed, 0 cancelled**, under Node 22.12.0. This comprises 65 new Stage A tests and 277 unchanged existing regression tests. All 4,826 pre-existing protected files retained their exact hashes; privacy checks passed across all 15 new shareable files. No certified implementation was modified after that test run.

Read-only `inspect` then verified the earned offline certificate and original source/shortlist binding. Its result was `STAGE_A_PREFLIGHT_BLOCKED`, with `OPERATOR_REVIEW_RECORDS_MISSING_OR_INVALID`. No current operator-reviewed account/authorization input files exist in the fixed input directory. The key was **not loaded**. The real registry is empty: zero reservation/outcome rows, zero transmitted requests. No acquisition was attempted.

The private certificate is `data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/offline-certification.json`, SHA-256 `bacea3dabc1c8622a2b09c29dd96899ddc6a86627f98d690ee85a620331fa377`. Exact QA and inspection evidence are recorded in the companion QA report. Current entitlement, rights/fee/tax review and dated expiring execution authorization remain blocked; credential verification is deferred until those gates pass.

Historical county/provider reconciliation is **NOT EXECUTED for a real response**. Synthetic reconciliation is reported separately. Database connections/writes, real financial analyses, Property creation, Stage B/C requests, MLS selections and deployments are all zero. Actual provider billing was not independently checked; no billable request was transmitted by this task. The prospective reservation remains $0.20 plus verified bounded extras, within $1.00 total.

## Local commands

Use the verified Node 22.12.0 executable, without changing global Node:

```powershell
$stageANode = 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe'
& $stageANode scripts/rentcast-live-stage-a-v1/run.js inspect
```

`inspect` stores only a private readiness artifact, loads no API key and never transmits. `execute` is a separate action and must not be run under this offline handoff. It requires later reviewed, expiring authorization and every preflight gate; there is no bypass option. Do not delete a ledger or certification artifact to regain a slot.

Stop for Stan/ChatGPT review. No Stage B/C authority follows from implementation or mock results.
