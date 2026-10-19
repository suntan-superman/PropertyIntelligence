# PI RentCast financial live Stage A V1 — QA

Date: 2026-10-12. Offline certification: **PASS**. Live classification: `STAGE_A_PREFLIGHT_BLOCKED`. No live requests are authorized by this report.

## Certification design

The new `scripts/rentcast-live-stage-a-v1/qa.js` runs under the existing Node 22.12.0 executable with the existing offline network guard preloaded. Mock sockets exercise the same narrow transport and reservation/preflight orchestration used by the live entrypoint. Synthetic subjects and authorization documents are explicitly separate from the real source-readiness check. The real subject is never paired with a fake provider response.

Child environments are restricted to operating-system executable/path variables and fresh test-owned temporary/output directories. No `.env`, provider key or database credential is loaded. No dependency installation or runtime change is performed.

The new tests cover source/shortlist integrity, candidate/host/path/parameter tampering, missing or expired authorization, stale/unsupported account claims, tax and endpoint fee uncertainty, rights evidence, exact evidence bytes/quotes, cap boundaries, credential handling, pre-reservation revalidation, exclusive locks, crash/orphan reservations, concurrent attempts, timeout, HTTP errors, redirects, malformed/oversized responses, key echoes, population ambiguity, pagination, APN9/Rule C, immutable projections and no automatic second request.

Complete unchanged regression files run without filtering:

- `scripts/rentcast-financial-controlled-client-v1/client.test.js`
- `tests/foundation.test.js`
- `tests/runtime.test.js`
- `scripts/rentcast-reconciliation-v1-1/reconcile.test.js`
- `scripts/protected-baselines-v3/reconciliation.test.js`
- `scripts/mls-validation-round1/harness.test.js`
- `scripts/mls-validation-round1/gate1b-identity-audit.test.js`
- `scripts/real-financial-evidence-v1/audit.test.js`
- `scripts/rentcast-controlled-pilot/pilot.test.js`

The earlier pilot suite runs from a fresh test-owned working directory because it writes relative synthetic output. Existing controlled-client tests receive a fresh output path. Historical QA output is not overwritten. The runner stops between suite groups on any failure, skip or cancellation, retains failure evidence and does not issue a PASS certificate.

The machine-readable certificate, when earned, binds exact implementation hashes, test-file membership, full TAP hashes and result bytes. Live preflight rechecks those artifacts and preservation; changing certified implementation invalidates the certificate.

## Preservation and privacy

The pre-work snapshot covers **4,826 existing files**, including the earlier controlled-client runtime artifacts and inherited historical protected evidence. Aggregate SHA-256:

`13d242cc9317fb4a9d982ba1ce29b6bc81cc20370be3f069cae75a32757e2ed4`

Every existing file must retain its exact hash. The only allowed new shareable files are the 12 Stage A implementation/test files and three Stage A reports. Real request/source data, source context, any later reviewed records, ledger and receipts remain under the new ignored runtime root. Shareable artifacts are scanned against private shortlist identifiers/addresses and credential patterns. No historical baseline hashes are revised.

## Results

The first full run completed successfully at `2026-10-12T19:34:19.691Z` under Node **v22.12.0**. Every one of the 12 new JavaScript files also passed a syntax check. No tests were filtered, skipped, retried after failure or changed to obtain a PASS.

| Check | Result |
| --- | --- |
| New Stage A mock/security suite | 65/65 PASS; 35,557 ms |
| Complete unchanged relevant regressions | 248/248 PASS; 18,544 ms |
| Original controlled pilot regression | 29/29 PASS; 328 ms |
| Total | **342/342 PASS; 0 failed; 0 skipped; 0 cancelled** |
| Historical preservation | **4,826/4,826 PASS; 0 unexpected changes** |
| Shareable-artifact privacy | **15/15 PASS** |
| Offline network guard | Enabled; 0 network attempts; 0 provider calls |
| Real ordinal-1 source/candidate/shortlist checks | PASS; private source rows only |
| Read-only live preflight inspection | BLOCKED: operator review records absent |
| Real credential loading / live reservation rows | 0 / 0 |
| Live provider transmissions | 0 |
| Database connections / writes | 0 / 0 |
| Real Property creation / financial analyses | 0 / 0 |
| Stage B/C / MLS selections / deployment | 0 / 0 / 0 |

The actual Stage A registry and operator-input directory were confirmed empty after QA and inspection. Offline success is necessary but insufficient for execution; unresolved real evidence gates are listed in the next-gates report.

## Reproducible private evidence

All artifacts below are under the new ignored runtime directory; none contain credentials. TAP files contain synthetic failures exercised as successful negative tests, not real acquisitions.

| Artifact | SHA-256 |
| --- | --- |
| `qa-4ywmWi/stage-a.tap` | `0947f63a9e64115e5a2d07186dea3695fc72033ba5f65aadd9d20483957b07e6` |
| `qa-4ywmWi/unchanged-regressions.tap` | `25bdda453fc0903ff72b3df08b7e8542c5b70d78e9a7278fb7870cc04e4c65a3` |
| `qa-4ywmWi/unchanged-pilot.tap` | `d846872a4ffa63d8938a9a8d654e1d1556bdc5eb5e97fd3d4ba5de28c758ab41` |
| `qa-4ywmWi/result.json` | `342a2d03b266c1499fb1398440cf4c1af87cd686bf83d1acb775835ddc2f04e7` |
| `offline-certification.json` | `bacea3dabc1c8622a2b09c29dd96899ddc6a86627f98d690ee85a620331fa377` |
| `inspections/run-hRVM0n/readiness.private.json` | `31dc548469cd6f4a3b7f8d0e3be0d4637277c1d448cc53dc41e6be8e0c87fb43` |

Root: `data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/`. The certificate pins 50 implementation/dependency files. Its result artifact fingerprints the report drafts present at test time. Final documentation is separately fingerprinted in `final-handoff.json`; original QA output and certificate are not rewritten merely to reflect report updates. Preservation and privacy are checked again after final documentation.

The QA command was `node scripts/rentcast-live-stage-a-v1/qa.js` using the verified executable documented in the implementation report. The subsequent command was **only** `node --import ./src/analysis/offline.js scripts/rentcast-live-stage-a-v1/run.js inspect`. It verified certification/source evidence without invoking the live executor or loading the real key.
