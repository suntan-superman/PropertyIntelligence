# PI Durable Identity V3 — QA

2026-10-09. **V3 ISOLATED INTEGRATION CERTIFIED**: eight focused checks, 23/23 targeted tests, 167/167 offline tests, 41/41 PostgreSQL tests and final preservation accounting all pass. No skips/cancellations; command exit 0. This is not production readiness.

## Reproduction

From the repository root under the existing Node >=22.12 runtime:

```powershell
node scripts/durable-identity-pilot/v3-certify.js
```

The actual run used the already-installed Node 22.12.0 executable at `%LOCALAPPDATA%\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe`. Global Node was not changed.

This is an explicit local writing certification command, not a build hook or deployment task. It requires the existing gitignored dedicated test credentials, rejects alternate target arguments, rechecks isolation before every database test and creates fresh owned schemas. It never reuses/cleans the original V2 schemas. Do not run it as a production diagnostic.

Offline execution preloads the existing network blocker. Real PostgreSQL execution blocks external fetch/HTTP/TLS/socket traffic and only permits `127.0.0.1:5432`; every connection verifies database, role, server address, port and version. The runner captures every suite and stops subsequent suites on any test failure; the obsolete exception for the old stale assertion remains removed. The previous path-accounting failure was preserved and work stopped then. This separately authorized separator-only correction was verified locally before a fresh full run, which exited 0.

## Final test inventory

All 11 offline files executed explicitly, without filtering:

| File | Scope |
| --- | --- |
| `scripts/sprint6_3_1/address.test.js` | Existing canonical validation |
| `scripts/sprint6_3_3/linkage.test.js` | Existing lineage/identity/conflict logic |
| `tests/persistence.test.js` | Existing persistence behavior |
| `scripts/mls-validation-round1/harness.test.js` | Round 1 gates |
| `scripts/mls-validation-round1/gate1b-identity-audit.test.js` | Exact identity eligibility |
| `scripts/identity-resolution-pilot/pilot.test.js` | Existing pilot constraints |
| `scripts/durable-identity-pilot/pilot.test.js` | V1 synthetic persistence policy and query-double mechanics |
| `scripts/identity-resolution-pilot/review.test.js` | Review packet/decision handling |
| `scripts/identity-resolution-pilot/suggestion.test.js` | Temporary suggestion boundaries |
| `scripts/identity-resolution-pilot/streamlined.test.js` | V1.2 review classifications and historical decisions |
| `scripts/durable-identity-pilot/trusted-review.test.js` | New authenticated artifacts and durable rights gate |

Results: **167/167**, no skips/cancellations. The existing seven-file group passed 81/81; review/suggestion/streamlined passed 53/53; new V3 passed 33/33. Before the full command, the targeted streamlined suite passed **23/23**, with no skips/cancellations. No tests were added, removed or filtered in this follow-up.

PostgreSQL: `postgres.integration.js` **22/22**, `v3-postgres.integration.js` **19/19**. Both use real transactions and separate read-only verification, not the offline query double.

## New negative coverage

| Gate | Cases and outcome |
| --- | --- |
| Trusted authority | Missing approval, forged HMAC, unsigned decision tampering, unknown reference, caller Boolean/path/rights/address, unauthorized reviewer: rejected |
| Decision lifecycle | Stale packet, superseded revision, signed authority rollback, expired/future review, suspended historical approval: rejected |
| Component review | Unverified state, missing ZIP, unresolved contradiction, missing acreage acknowledgment/notes: rejected |
| Evidence integrity | Changed bytes/content hash, wrong-property component, changed Assessor source hash, unavailable/expired evidence: rejected |
| Rights | Unknown shared use, unsupported retention, expired/revoked permission, analyst attestation substituted for source: rejected |
| Google | Google-only ZIP and expired Google content, even with synthetic rights labels: rejected |
| Database identity | Conflicting Assessor, active canonical conflict, same address/different county identity, archived Property: rejected and rolled back |
| Replay | Revoked/expired current authorization, changed authority versus stored proof, corrupted cached Property ID: rejected despite idempotency rows |
| Atomicity | Permission revocation and decision supersession immediately before commit, actual division-by-zero after lineage insertion: all inserted rows rolled back |

The acreage-positive case confirms acknowledged discrepancies are not automatic rejection. Decision reopen preserves file bytes. Existing historical types stay unchanged. The authentic local review alone does not establish source permissions.

Adversarial `testHooks` are internal synthetic fault-injection helpers, not request fields or a public API. They introduce conflicts inside the outer transaction so independent SQL can prove full rollback. No real record is a target.

## Concurrency and SQL evidence

Eight fresh requests used eight physical writer backends. IDs were stable for Property, candidate, canonical, link, evidence and Assessor; exactly one of each committed and seven requests replayed. All five primary identity/evidence table counts increased by one.

Two separately approved but conflicting synthetic address/evidence requests produced one commit and one existing Assessor replay rejection. On the first diagnostic run the new test expected a later Property/cached-authorization error; the actual earlier `ASSESSOR_REPLAY_CONFLICT` was correct. Inspection confirmed the existing importer rejects a changed Assessor payload for the same import identity. Only the new test's allowed guard code was corrected; the one-success/one-failure and exact-count assertions remain. Initial 18/19 evidence is retained. The final fresh-schema run passed 19/19.

V3 performed 41 independent whole-schema snapshots across 30 tables, comparing row counts and existing V2-style MD5 row-set fingerprints before/after failure probes. Artifact/file integrity uses SHA-256 and authenticated envelopes. SQL checked five exact active county/candidate/Assessor/canonical/Property relationships, no missing references or duplicate active identities, exactly five evidence snapshots, unchanged imported screening state, synthetic-only data and zero Deals. Reads used separate physical connections with verified `transaction_read_only=on`.

V2 additionally performed 45 snapshots and revalidated restrictive constraints, active uniqueness, immutable history, RLS structure and grants. All prior schema inventories and table fingerprints remained unchanged after each suite, including both original retained V2 schemas. Local role ownership means this is not a non-owner RLS enforcement test.

## Authorized assertion reconciliation

The original assertion was `assert.equal(v.decision.decision,null)` for each real pilot. Historical IP-P2 `APPROVED` made it stale; neither that actual decision nor any other actual artifact was edited to satisfy the test.

The replacement keeps the same test slot and executes the actual existing review store. Before assessment it captures all three decision files' exact bytes and SHA-256, plus packet and locally present suggestion/access-file snapshots. It checks unchanged bytes/hash and `dev`, `ino`, size, mode, modification/change timestamps afterward; access time is excluded because reading can update it. It also checks unchanged directory contents. Assertions avoid dumping private bytes on failure.

During assessment, the store's existing `writeFile`/`rename`/`unlink` interfaces are guarded; any call fails and is counted. PostgreSQL Client/Pool `connect`/`query` are guarded similarly. Guards are restored in `finally`, then preservation and zero-attempt checks run. The existing offline network blocker stays active. Actual results: assessment writes/replacements **0**, database attempts **0**, network attempts **0**.

Each expected decision comes from its current captured artifact, not a fixed pilot outcome. Packet hashes are validated; decision revisions must equal original file hashes. Available suggestions must bind to the original diagnostic hash, packet/code and current dates. Unavailable evidence must yield insufficient evidence and no Google component references. Stale/unsupported Google-bound decisions remain redacted and ineffective. Historical audit entries remain faithful to the saved history, while current operational state is independently checked. Every case asserts `canonicalPersistenceAllowed=false`, `SHARED RETENTION NOT AUTHORIZED`, and no canonical activation. Historical APPROVED is never treated as durable authorization.

The existing synthetic tests for expired evidence, tampered diagnostic, suspended approval/history preservation, packet integrity, contradictions, unknown manual rights and retention remain unchanged and pass. No Google deadline, rights label, actual decision or original packet was modified. The corrected test remains valid when a reviewer legitimately changes the saved decision before a subsequent run; a concurrent change during read-only QA correctly fails preservation.

## Preservation-accounting correction — separately authorized and verified

The runner needs to account for this explicitly authorized test edit without replacing historical hashes. Its added entry pins both exact file hashes:

| State | SHA-256 |
| --- | --- |
| Historical test | `b94f46e69897392b087bc88cf71b1757661b57822f37d2e00344805d3502b72f` |
| Authorized corrected test | `cca18e7af1b15e9e91da99361d30e2d7d8776e0cfcdbffe2cd69f059762ceaa9` |

The earlier literal comparison failed for the manifest key `scripts\identity-resolution-pilot\streamlined.test.js` versus `scripts/identity-resolution-pilot/streamlined.test.js`, despite the exact hash match. That failure was introduced in reconciliation bookkeeping, not in the application or historical baseline. The original failed run remains at `v3-test-run-dy6T5b/summary.json` with its original exit-1 result.

The final authorized code change is:

```js
const comparisonPath = value => value.replaceAll('\\', '/');
const exactReconciliation =
  comparisonPath(path) === comparisonPath(reconciliation.path) &&
  hash === reconciliation.before && current === reconciliation.after;
```

Normalization is comparison-only. The original path still goes to `readFile(path)` and remains in the output/manifest. Neither exact hash changed. No new directory allowance, wildcard, case folding, path resolution or manifest rewrite was added; the existing four scoped V3 exceptions are unchanged.

Before PostgreSQL, an offline private verification evaluated the actual helper, constant and predicate extracted from the runner without importing/executing its database entry point. All eight checks passed:

1. Windows and forward-slash paths produce the same comparison key.
2. Forward path with both exact hashes is accepted.
3. Windows path with both exact hashes is accepted.
4. Wrong historical hash is rejected.
5. Wrong corrected hash is rejected.
6. Two wrong hashes are rejected.
7. An unrelated path is rejected even with both exact hashes.
8. The actual corrected file and original manifest contain the required exact SHA-256 values.

The focused phase also verified unchanged historical manifests/actual decisions/prior certification artifacts and zero network attempts. A 355-path snapshot found only the runner edit at that point. The targeted suite was then rerun and passed 23/23 before the full certification command. These eight private checks are separate from the unchanged 167-test suite count; no test was added, removed or skipped in the official suite.

Final full summary: **331 manifest entries; 325 unchanged; six recognized change entries representing five physical files; unexpected changes 0; exit 0**. The historical manifest includes both separator spellings of the corrected test, so it contributes two entries. This corrects the earlier prose's single-entry count without editing the baseline. Both entries pass exactly the same two hashes. The separate final 355-path preservation check permits only the runner and three requested report edits, confirms unchanged historical manifests/decisions/prior artifacts, and reports no unexpected changes.

Focused/targeted/final evidence is under `data/runtime/identity-persistence-test/v3-normalization-Oo4mqp/`; full certification is `v3-test-run-uhNelm/summary.json`. Both earlier failed certification runs and all retained schemas remain preserved.

## Safety accounting

Zero production connections/writes, real Properties, provider calls, MLS access, selected Round 1 properties and deployments. No dependencies installed, actual approvals generated, production migrations run, or protected hashes re-baselined. New schema/data writes are limited to identified synthetic local test schemas; fixtures and logs remain private/gitignored. V2 and V3 final runs observed respectively 94 and 85 local SQL socket connections and zero attempted external connections.

Canonical/source/linkage evidence and detailed aggregate manifests are linked from [certification](PI_DURABLE_IDENTITY_V3_CERTIFICATION.md). No UI changed, so browser/Playwright work was neither needed nor run. No production or real-data readiness is claimed.

The previous V3 run's static/privacy checks remain historical evidence: 10 JavaScript files parsed, runtime artifacts remained gitignored, and targeted report scans found no credential-pattern/private-identity matches. This final follow-up modified only the runner's comparison, not the corrected regression or application source. The runner executed successfully and all fresh test suites passed. Focused verification is a private gitignored local QA artifact, not an application module or new official test suite. This is not a claim of repository-wide secret scanning.
