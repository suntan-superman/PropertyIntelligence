# PI Durable Identity V3 — isolated integration results

2026-10-09. Final classification: **V3 ISOLATED INTEGRATION CERTIFIED**.

The authorized separator-only correction passed eight focused comparison checks, the targeted streamlined suite **23/23**, the complete offline suite **167/167**, and the combined PostgreSQL suites **41/41**, with no skips or cancellations. Final preservation accounting passed with **zero unexpected changes** and command exit **0**. No actual analyst decision was reset or edited. Earlier failed runs remain preserved as historical evidence, not relabeled successful.

This is synthetic local integration evidence, not authorization for real-property persistence, production rollout, or Round 1 selection.

## Reused interfaces and narrow changes

The interface inventory was recorded before implementation in [remaining gaps](PI_DURABLE_IDENTITY_V3_REMAINING_GAPS.md). Existing review packets, review-store save/reopen, packet checksums, reviewer/component validation, historical decision audit, and V1.2 review classifications remain in use.

`trusted-review.js` reads server-selected synthetic artifacts; `trusted-persistence.js` wraps the existing V2 repository transaction. `v3-fixtures.js` constructs artificial reviews through the existing review store, not copied real decisions. The caller supplies only a registered reference and exact decision revision. Caller-supplied approval Booleans, address payloads, paths and permissions are rejected.

The original V3 implementation changed four pre-existing certification files narrowly:

| File under `scripts/durable-identity-pilot/` | Change |
| --- | --- |
| `sequence.js` | Optional trusted authorization provenance in the existing evidence/audit records; cached readback must match it |
| `postgres-fixtures.js` | Optional reauthorization callbacks within the existing outer transaction, including immediately before commit |
| `local-postgres.js` | Recognize explicitly owned V3 manifests/markers alongside retained V2 schemas; same target, role, ledger and network restrictions |
| `postgres.integration.js` | Re-run isolation before every V2 test, closing clients between tests; original 22 assertions retained |

No application repository, production save route, migration, package, global runtime, UI or protected baseline changed.

The earlier authorized regression reconciliation changed `scripts/identity-resolution-pilot/streamlined.test.js`, the V3 runner's exact-change accounting/stop behavior, and these three reports. That test checks current historical state, byte/hash/file-identity preservation, packet/evidence integrity, retention and operational effectiveness, zero assessment writes/database attempts, and zero network attempts. It does not pin any real pilot's decision outcome.

This final preservation follow-up changes only the runner's comparison and the three reports; the corrected regression and all application behavior are unchanged. `comparisonPath(value)` converts backslashes to forward slashes with `replaceAll('\\','/')`. Only the exact authorized-change predicate uses it. Both original/corrected SHA-256 comparisons remain mandatory. Actual `readFile(path)` calls, stored manifest keys, other allowances and historical hashes are unchanged. No case folding, wildcard, directory exemption or filesystem rewrite was introduced.

## Trusted analyst decision and evidence gate

The existing review store writes genuine-format synthetic decisions into private, gitignored synthetic review directories. A server-configured catalog selects the directory/code/reviewer. The synthetic test authority authenticates a revisioned envelope with an in-memory HMAC key; the envelope pins decision, evidence, permission and persistence-plan bytes and the original packet fingerprint. The key is never logged or stored. This tests authenticated artifact integrity, not a production login or real licensing service.

The gate verifies explicit approval, authorized reviewer, review timestamps, current revision, original packet integrity, exact county/Assessor binding, complete canonical components, evidence references, contradiction clearance, applicable acreage acknowledgment/notes, and current operational effectiveness. Unknown county-quality flags stop rather than being silently accepted. Expired/suspended/revoked authorization, modified artifacts and observed authority-revision rollback fail closed.

Evidence must cover each component, identify its source/record, match its content fingerprint and property/packet, remain available/current, and carry explicit current shared-purpose and retention permission. An analyst attestation is not a substitute for those permissions. All permissions here are conspicuously synthetic and establish **no actual legal rights**.

| Existing source vocabulary | Explicit V3 classification |
| --- | --- |
| `COUNTY_SITUS`, `COUNTY_SOURCE` | `COUNTY_SOURCE` |
| `GOOGLE_TEMPORARY_SUGGESTION` | Same name; rejected for durable persistence |
| `SYNTHETIC_INDEPENDENT_DOCUMENT`, `INDEPENDENT_DURABLE_EVIDENCE` | `INDEPENDENT_DURABLE_EVIDENCE` |
| `ANALYST_DOCUMENTED_SOURCES`, `ANALYST_ATTESTATION` | `ANALYST_ATTESTATION`; cannot supply component rights |

Original historical source types are not rewritten. The synthetic positive case uses county street/city and separately supported artificial state/ZIP. Existing Google-based V1.2 routine classification remains `INSUFFICIENT_EVIDENCE` without a Google suggestion; V3 does not relabel it routine. The separate explicit independent-evidence gate supplies test-only durable authorization. Historical review scope remains `LOCAL_REVIEW_DECISION_ONLY` with its original separate-persistence-authorization field unchanged.

No actual IP-P1/IP-P2/IP-P3 review content, Google components, coordinates or place IDs entered PostgreSQL. Existing offline review regressions read real local artifacts without changing them; integration inputs are synthetic only.

## Atomic transaction, identity and replay

The existing source/candidate/Assessor creation order precedes canonical resolution because of the actual foreign keys. The existing repositories then create/reuse the canonical resolution and Property, create the exact Opportunity lineage, insert identity evidence, write audit records, and reopen all relationships before commit. The entire operation shares one outer PostgreSQL transaction.

V3 checks trusted authorization before entering the transaction, after acquiring the county seed lock, before persistence, and immediately before commit. Every replay repeats these checks and validates current county/Assessor/source relationships, active Property/canonical/link state and the persisted authorization fingerprint. The V2 mechanical fixture is rebound only to generated synthetic IDs; it is not the approval source of truth.

The existing `SYNTHETIC_DURABLE_IDENTITY_V1` idempotency operation name is retained for compatibility. A changed authorization cannot silently reuse the old cached result even if it is currently valid; that case stops for explicit review. Candidate replay can advance existing `last_seen_at`/`updated_at` behavior, but not score, priority or imported status. Non-candidate historical fingerprints and record counts stay unchanged on successful replay.

## Actual local PostgreSQL results

| Check | Result |
| --- | --- |
| Runtime/server | Existing Node 22.12.0; PostgreSQL 18.6 |
| Verified target | `127.0.0.1:5432` / `pi_identity_test` / `pi_test_user` |
| Configuration | Only dedicated gitignored `local-db.env`; no production configuration initialization |
| Isolation | Exact SQL server identity/owner, no privileged role flags, zero other clients before each test, known schema markers and certified migration ledgers |
| Isolation gates | 22 before V2 tests; 19 before V3 tests; separate schema setup/final checks |
| Schema | Existing migrations 001–006 unchanged; no new migration; PUBLIC application schema untouched |
| Sequential replay | Stable IDs, zero additional rows, current authorization checked |
| Fresh concurrent requests | Eight requests on eight writer backends; one Property/canonical/Opportunity/link/evidence identity; seven replays |
| Conflicting concurrent requests | One commit, one rejection by existing `ASSESSOR_REPLAY_CONFLICT` guard |
| Rollback | Revocation/supersession before commit, injected SQL failure, stale cache and identity conflicts leave no partial records |
| Independent SQL | Separate physical `BEGIN READ ONLY` connections; 41 V3 whole-schema snapshots |
| Primary V3 final counts | Five synthetic Properties, five Opportunities, five canonicals, five active links, five evidence snapshots; zero Deals |
| Relationship defects | Zero orphans, duplicate active identities, broken county/Assessor/canonical relationships, or non-synthetic records |
| Retained V2 evidence | Both original retained schemas unchanged; all other pre-existing schemas also fingerprint-preserved |

The V2 regression also revalidated 45 restrictive FKs, local FK targets, active/idempotency uniqueness, history protection, RLS structure and grants. Testing as the owning local role is not a browser/anonymous-role security certification. The existing Windows instance's broader listener/firewall exposure is not certified; all test sockets are restricted to the exact loopback destination.

## Test and preservation result

| Suite | Result |
| --- | --- |
| Focused path/hash comparison checks before PostgreSQL | 8/8 |
| Existing seven-file identity/canonical/linkage/persistence/Round 1/V1 suite | 81/81 |
| Targeted streamlined suite, before complete certification | 23/23 |
| Existing review/suggestion/streamlined suite | 53/53 |
| New V3 trusted-review suite | 33/33 |
| Complete offline suite, 11 files | **167/167; 0 skipped; 0 cancelled** |
| Existing V2 PostgreSQL suite | 22/22 |
| V3 PostgreSQL suite | 19/19 |
| Combined final PostgreSQL suite | **41/41; 0 skipped; 0 cancelled** |

The original failure was `scripts/identity-resolution-pilot/streamlined.test.js:35`, “actual pilot decisions remain unreviewed; read-only assessment makes no network attempt.” It expected `null` although IP-P2 had historical `APPROVED`. The authorized replacement is “actual pilot decisions remain unchanged; historical approval never grants durable persistence.” It derives expectations from the exact current artifacts, checks suspended/redacted behavior where evidence is unavailable or stale, and always asserts that durable persistence is unauthorized. Existing expired/tampered evidence tests remain unchanged and pass. The full original 167-test count is preserved.

331 historical path entries were fingerprinted: **325 unchanged entries, six recognized change entries, zero unexpected changes**. The six entries represent five files: four original scoped V3 certification changes plus the authorized test, which is listed twice in the historical manifest using different separator spellings. Both test entries now require and pass the exact old/new hashes. Earlier prose counted the test only once; this report distinguishes physical files from manifest entries without changing the manifest. The original baseline and its hashes remain intact. See [QA](PI_DURABLE_IDENTITY_V3_QA.md) for exact hashes and focused checks.

A separate 355-path before/after snapshot covers historical manifests, actual decisions, source files, reports and retained certification artifacts. It allows only this runner edit and these three documentation updates; no unexpected change was found. The historical Sprint 6.2/Sprint 6.3 manifests and V3 preservation manifest are byte-identical. Actual analyst decisions and all prior certification artifacts remain unchanged.

Real decision files, original packets, source/migrations, production configuration, local credentials, Round 1 controls, scoring, reports, monitoring and protected baselines remain unchanged. The targeted and full-run corrected test independently verified decision bytes, hashes and file metadata, with zero assessment write/replace/database attempts.

## Accounting and retained artifacts

Production connections/writes: **0**. Real Properties created: **0**. Provider calls: **0**. MLS access: **0**. Round 1 properties selected: **0**. No deployment, dependency installation, new database, or global Node change.

Final local PostgreSQL socket connections: V2 94; V3 85; external blocked attempts 0 in both. These are local test connections, not Supabase or provider traffic. Failed test transactions rolled back; no DROP/TRUNCATE or destructive cleanup occurred.

Primary evidence (gitignored):

- Focused normalization, targeted regression and preservation: `data/runtime/identity-persistence-test/v3-normalization-Oo4mqp/` (`before.json`, `focused.json`, `targeted.json`, TAP/stderr and `final.json`).
- Latest full run: `data/runtime/identity-persistence-test/v3-test-run-uhNelm/summary.json` and adjacent TAP/stderr files; all test suites PASS, unexpected changes 0, overall exit 0.
- Latest V3 SQL: `data/runtime/identity-persistence-test/v3-ab825ad4474f4443bfdcfd61f67455b7/certification.json`.
- Latest V2 rerun: `data/runtime/identity-persistence-test/v2-a0e61a5925144a309c3871a5c853fa12/certification.json`.
- Earlier path-failure run: `data/runtime/identity-persistence-test/v3-test-run-dy6T5b/summary.json` — all suites passed but preservation flag 1 / exit 1; retained unchanged with its schemas and artifacts.
- Earlier targeted regression: `data/runtime/identity-persistence-test/v3-regression-reconciliation-iCuzgg/targeted-summary.json` — retained unchanged.
- Prior full run: `data/runtime/identity-persistence-test/v3-test-run-A3JSAO/summary.json` — historical 166/167 offline result retained unchanged, along with its V2/V3 schemas and reports.
- Initial V3 diagnostic: `data/runtime/identity-persistence-test/v3-36e81993899c44de84dd49fc9d2c1b2d/certification.json` — 18/19 before correcting the new test's expected conflict error; retained, not erased.

This follow-up created two fresh owned schemas: the latest V3 schema retains five artificial identities and the latest V2 regression schema retains two. All previously retained certification schemas, including the two original V2 schemas and the earlier V3 diagnostic, remain unchanged. All retained test data is synthetic; nothing was cleaned up or deleted.

See [QA](PI_DURABLE_IDENTITY_V3_QA.md) and [remaining gaps](PI_DURABLE_IDENTITY_V3_REMAINING_GAPS.md). **Stopped for Stan/ChatGPT review.**
