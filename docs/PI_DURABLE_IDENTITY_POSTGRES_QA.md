# PI Durable Identity V2 — PostgreSQL QA

Date: 2026-10-09. **ISOLATED POSTGRESQL CERTIFIED**.

Primary certification used PostgreSQL 18.6 and Node 22.12.0. An earlier Node 20.19.4 execution also passed and was retained for repeat-run preservation verification. Counts below are per execution, not pooled to inflate coverage.

## Separate test layers

| Layer | Result | Meaning |
| --- | --- | --- |
| Offline logic tests | 81/81, 0 skipped | Existing and focused synthetic/query-double coverage |
| Actual PostgreSQL integration tests | 22/22, 0 skipped | Real repository writes/commits, concurrency, failure/rollback and SQL constraints |
| Independent read-only SQL | PASS; 45 full-table count/hash snapshots plus targeted schema/relationship checks | Separate physical connections; not cached repository responses or mock results |

Offline files: `scripts/sprint6_3_1/address.test.js` (4), `scripts/sprint6_3_3/linkage.test.js` (3), `tests/persistence.test.js` (6), Round 1 `harness.test.js` (10), `gate1b-identity-audit.test.js` (9), identity-resolution `pilot.test.js` (20), durable-identity `pilot.test.js` (29). No test was skipped, weakened or rewritten to obtain a PASS.

## Actual PostgreSQL test matrix

| # | Test | Result |
| --- | --- | --- |
| 1 | Exact migration ledger, local restrictive FKs, active uniqueness, RLS and public grants | PASS |
| 2 | Approved synthetic source/Opportunity/canonical/Property/evidence/linkage commit | PASS |
| 3 | Second committed execution: stable IDs, no added rows, preserved history | PASS |
| 4 | Eight concurrent new requests across eight PostgreSQL writer backends | PASS: one new identity, seven replays |
| 5 | Missing approval | PASS: rejected, no partial records |
| 6 | Stale fingerprint and expired approval | PASS: rejected |
| 7 | Conflicting county identity for same-address Property | PASS: rejected |
| 8 | Conflicting canonical address | PASS: full transaction rollback |
| 9 | Repeated Property repository insertion | PASS: returns existing physical row |
| 10 | Existing inactive Property | PASS: rejected; archive mutation also rolled back |
| 11 | Wrong-property evidence even after synthetic reapproval | PASS: rejected |
| 12 | Expired evidence even after synthetic reapproval | PASS: rejected |
| 13 | Google-derived or restricted shared-use evidence | PASS: rejected |
| 14 | Application failure during linkage insertion | PASS: all prior writes rolled back |
| 15 | Actual PostgreSQL error after lineage insertion | PASS: SQLSTATE 22012, all writes rolled back |
| 16 | Post-write evidence readback failure | PASS: all writes rolled back |
| 17 | Evidence referencing nonexistent Property | PASS: actual FK violation, SQLSTATE 23503 |
| 18 | Same candidate, different Property | PASS: conflict rejected |
| 19 | Different candidate, same Property | PASS: conflict rejected |
| 20 | Canonical/linkage immutable-history mutation probes | PASS: real triggers reject changes |
| 21 | Duplicate normalized-address update | PASS: real unique-index violation, SQLSTATE 23505 |
| 22 | Independent final relationship and population reconciliation | PASS |

Positive workflow records were created only through existing repository/import interfaces. Direct UPDATE statements in tests 20–21 are negative constraint probes against test-owned synthetic rows; successful mutation is not accepted and no probe commits. The injected readback failure is explicitly a test interceptor; the surrounding writes and rollback are real PostgreSQL operations. The division-by-zero probe is an actual server error after prior writes, not an in-memory rollback simulation.

Every expected failure compares all 30 tables' counts and ordered row hashes before and afterward through independent read-only connections. Thus source/candidate/Assessor/canonical/Property/link/evidence/audit/idempotency partial writes cannot be hidden by checking only the final link count. No incomplete fixture from a failed case survives.

## Independent SQL findings

For the primary test-owned schema:

```text
Canonical resolutions: 2
Properties: 2
Opportunities: 2
Lineage rows / active links: 2 / 2
Identity evidence snapshots: 2
Broken county/candidate/canonical/Assessor/Property relationships: 0
Deals: 0
Analysis / valuation / acquisition rows: 0
```

The two identities correspond to sequential and concurrent positive fixtures. Each has one active candidate and Property link. All generated IDs remain local; the report exposes aggregate findings only.

The sequential replay kept all six checked identities stable: candidate, Assessor, canonical resolution, Property, link and evidence. No table gained a row. The only permitted existing-row change is the Opportunity repository's existing last-seen/update timestamps. Evidence, canonical history, lineage, audit and idempotency table fingerprints did not change.

Concurrency was exercised against a fresh second fixture, not merely eight lookups of already-existing data. Eight actual PostgreSQL backend sessions competed through the existing advisory-lock/transaction/idempotency interfaces. One Property and one candidate resulted, with seven replay responses. The query-double model was not used for these tests.

Schema inspection found 45 restrictive FKs with all referenced tables in the same test schema, expected unique indexes, and four RLS-enabled Assessor/canonical/lineage tables with zero PUBLIC/API grants. The database-owner role can bypass ordinary RLS by ownership, so these tests do not claim an end-user authentication/RLS security certification.

## Preservation, repeat run and accounting

The primary run started with the first run's marked schema already present. It verified its owner, matching local ownership artifact and certified migration ledger, then used a fresh schema. Full prior-table hashes and prior schema/object/function inventory matched afterward. `public` remained empty. No unrelated objects were dropped, truncated, reset or rewritten.

Both schemas and their two artificial identities each remain for review: four synthetic Properties across the two local schemas, zero real Properties. There is no automatic destructive cleanup or reuse of another run's synthetic state.

The 304-file start snapshot found 303 unchanged files and one intentional V1 `workflow.js` extraction. Actual analyst decisions, Google/private packets, exclusions, Round 1 controls, all production source/schema files and the credential file remain unchanged.

| Accounting category | Primary execution |
| --- | --- |
| Local PostgreSQL TCP connections | 57 |
| Blocked/unexpected network attempts | 0 |
| Production/Supabase connections and writes | 0 / 0 |
| Google, ATTOM, RentCast, DataTree, county provider calls | 0 each |
| MLS access / selected Round 1 properties | 0 / 0 |
| Real Properties / real analyst approvals created | 0 / 0 |
| Dependency installs / global runtime changes / deployments | 0 each |

Local PostgreSQL traffic is intentional and is not provider traffic. The initial execution also used 57 local connections. Production configuration was never loaded into either test process. All test-client connections were closed at completion.

Artifacts: primary `v2-0978fa8d6ba842959caaf5d6b36b6bfe/certification.json` and `preservation.json`, and `test-run-BPVwMQ/{offline.tap,postgres.tap,summary.json}` beneath gitignored `data/runtime/identity-persistence-test/`. The machine report contains source hashes, migration checksums, aggregate snapshots and test results. See the certification report for the explicit reproduction command and retained schema names.

No UI, monitoring, investor-report, scoring, MAO or Monte Carlo code changed. No real-property or production-integration testing was performed.
