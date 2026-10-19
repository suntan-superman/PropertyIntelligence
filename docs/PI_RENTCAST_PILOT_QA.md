# RentCast Controlled Pilot V1 — QA and Safety Accounting

Date: 2026-10-09. Runtime: isolated existing Node **22.12.0**. No dependency or runtime changes.

## Offline regression results

Both pre-acquisition and post-acquisition runs: **100/100 PASS; 0 failed; 0 skipped**.

Test files:

- `scripts/rentcast-controlled-pilot/pilot.test.js`
- `tests/foundation.test.js`
- `scripts/mls-validation-round1/harness.test.js`
- `scripts/identity-resolution-pilot/pilot.test.js`
- `scripts/identity-resolution-pilot/review.test.js`

The existing offline network guard was preloaded for every test process. New negative cases use synthetic records and injected mock responses only. No live requests were spent on QA. The foundation suite exercises the existing RentCast client, request contract, normalization, redaction and error handling; other existing suites cover identity/review and Round 1 safeguards. The actual production/database test runners were not invoked.

New focused cases cover: three-attempt ceiling and fourth/replay rejection; fsynced reservations before transport; no reset after process restart; serial execution; no retry after timeout/503; exact endpoint/no fallback; empty 200 accounting; HTTP-200-only billing estimate; APN exact/format-only matches; leading zeros; no number coercion/ATN truncation; APN conflict/missing; county/FIPS mismatch; missing ZIP; supported and unsupported suffix equivalence; units; street/city/state/format conflicts; multiple candidates; duplicate provider ID; property-type disagreement; private storage; field allowlisting; source fingerprints; no invented as-of; and no approval, persistence or Round 1 selection.

Pre-flight test evidence is retained in private `offline-qa.json` and timestamped QA logs. Tested worker hashes and the dated private vendor reference are pinned there. The live runner checked those hashes before transmission. Its command is one-shot and protected by an exclusive execution lock; no rerun or resume is authorized.

## Real acquisition, separate from synthetic QA

Exactly **3** native HTTP attempts, all `GET /v1/properties`, serial, all HTTP **200**. Each returned one record. No retries, no cache hits, no redirects/fallback enrichment, no additional endpoint. Source-level evidence is real; negative QA outcomes are synthetic and kept separately.

Private immutable artifacts include:

- Three fsynced attempt reservations; three HTTP receipts; three minimal response records.
- Three sealed evidence records and three sealed review packets.
- Candidate mapping and its source hashes; request ledger and reconciliation results.
- Original authorization reference plus a separate dated vendor-email supplement.
- Pre/post offline results and post-acquisition certification.

Post-acquisition checks verify reservation counts, HTTP/client accounting agreement, serial timestamps, packet/evidence hashes, exact preserved county identities, source fingerprints, unique provider IDs, null decisions, disabled persistence, unchanged Round 1 authorization and retained discrepancies. They also scan new shareable scripts/reports for the actual private addresses/identifiers and scan for the actual API key without printing it.

## Preservation and privacy

The same **2,812 protected file hashes** passed before execution and after the post-acquisition regression run. This covers existing source, web/Netlify configuration, package files, V3/IP code and private decisions, Round 1 inputs, report/Monte Carlo artifacts and historical protection manifests. **0 protected files changed**; no historical manifest was re-baselined.

The post-acquisition verifier recorded **PASS** in the gitignored `post-acquisition-certification.json`: provenance, reservation accounting, identity preservation and privacy checks passed; the final key scan examined 1,209 files with 0 exposures. New shared output contains no actual candidate address, ZIP, ATN, APN, Property/candidate/provider ID or owner/contact detail. Evidence retains only allowlisted relevant fields, never owner/contact payloads. The actual key was not exposed, rotated or moved into a browser bundle. The shared RentCast cache was not written.

No application/UI/deployment code was edited. Private review packets follow the existing sealing and decision conventions but are intentionally not enabled in the IP-only review interface. No browser/public route was added.

## Accounting and authorization

| Measure | Result |
| --- | ---: |
| Authorized attempts / transmitted | 3 / 3 |
| HTTP 200 / non-200 / unknown | 3 / 0 / 0 |
| Responses with a single returned property record | 3 |
| Complete addresses | 3 |
| Exact / normalized APN9 matches | 0 / 0 |
| APN conflicts / exception packets | 3 / 3 |
| Estimated billable requests | 3 |
| Worst-case incremental overage / authorized ceiling | $0.60 / $0.60 |
| Actual remaining allowance / actual billed amount | NOT VERIFIED / NOT VERIFIED |
| Other-provider authenticated data calls | 0 |
| Database connections, reads or writes | 0 |
| Analyst approvals / durable Properties / Round 1 selections | 0 / 0 / 0 |
| MLS access / deployments / plan changes | 0 / 0 / 0 |

Billing estimate follows the supplied vendor email's HTTP-200-only rule; $0.60 assumes every response exceeds included allowance. It is not a provider-confirmed charge. All attempted transmissions would count against the safety limit regardless of billing. Public documentation inspection was separate from authenticated data acquisition; no other provider service was called.

## Reproducible offline checks

From the project directory under the verified Node 22 runtime:

```powershell
node scripts/rentcast-controlled-pilot/qa.js --post
```

This reruns synthetic/existing offline tests and creates a new private timestamped result; it does not invoke live acquisition. The one-time post-acquisition verifier is `scripts/rentcast-controlled-pilot/verify.js`; it will not overwrite its existing final certificate. Do not reset evidence/reservations, rerun `prepare.js`/`run.js`, or interpret these commands as authorization for additional calls.

## Final status

**PARTIAL COVERAGE — HUMAN REVIEW REQUIRED**. Licensed full-address coverage was demonstrated; the APN9 identity gate was not. This is not production-integration, canonical-identity, real-property-persistence or Round 1 execution certification. Stopped for Stan/ChatGPT review with no further calls authorized.
