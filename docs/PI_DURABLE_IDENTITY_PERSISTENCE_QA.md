# PI Durable Identity Persistence QA

Date: 2026-10-09. **LOGIC CERTIFIED — ISOLATED DB REQUIRED**.

Execution: Node `v20.19.4`, existing installed packages, no installation or runtime change. All database operations below are routed to a synthetic query double unless explicitly marked not executed. No PostgreSQL connection was attempted.

## Automated results

| Test file | Passed / total |
| --- | --- |
| `scripts/sprint6_3_1/address.test.js` | 4 / 4 |
| `scripts/sprint6_3_3/linkage.test.js` | 3 / 3 |
| `tests/persistence.test.js` | 6 / 6 |
| `scripts/mls-validation-round1/harness.test.js` | 10 / 10 |
| `scripts/mls-validation-round1/gate1b-identity-audit.test.js` | 9 / 9 |
| `scripts/identity-resolution-pilot/pilot.test.js` | 20 / 20 |
| `scripts/durable-identity-pilot/pilot.test.js` | 29 / 29 |
| **Total** | **81 / 81; 0 failed, 0 skipped, 0 cancelled** |

The explicit command is encoded in `scripts/durable-identity-pilot/certify.js`: Node test runner with `--import ./src/analysis/offline.js`, TAP reporter, and the seven files above. No live persistence runner, provider acquisition, browser UI test or full application build is needed for this offline-only addition. No existing test was modified or filtered to force success. Tests that require actual database access were not invoked.

## Required-case evidence

| Required case | Offline result / evidence | Actual PostgreSQL result |
| --- | --- | --- |
| 1. Valid synthetic identity persists | PASS in model: existing repositories called | NOT EXECUTED |
| 2. Canonical resolution created | PASS: one analyst-confirmed modeled resolution | NOT EXECUTED |
| 3. Durable Property created | PASS: one modeled Property, stable UUID and original county identities | NOT EXECUTED |
| 4. Opportunity linkage created | PASS: one modeled ACTIVE link, exact canonical/Assessor context | NOT EXECUTED |
| 5. Repeat idempotency | PASS: stable IDs, zero added modeled rows | NOT EXECUTED |
| 6. Concurrent duplicates | PASS for eight callers in serialized model; seven replays | NOT EXECUTED; no PostgreSQL concurrency claim |
| 7. ATN/APN conflict | PASS: candidate, Assessor, source and Property coherence failures stop | NOT EXECUTED |
| 8. Canonical conflict | PASS: active conflicting address rejected, history unchanged | NOT EXECUTED |
| 9. Missing approval | PASS: rejection before SQL/transaction | No database needed for policy check |
| 10. Stale approval | PASS: expired/future, wrong reviewer, stale packet/evidence hash rejected | No database needed for policy check |
| 11. Expired evidence | PASS, including replay-time expiry | No database needed for policy check |
| 12. Shared Google evidence | PASS: Google/temporary dependency rejected despite approval | No real Google content used |
| 13. Wrong-property evidence | PASS: candidate/county/packet binding and component support required | No database needed for policy check |
| 14. Atomic rollback | PASS in model: linkage/snapshot insertion and retrieval faults roll back all partial state; retry succeeds | NOT EXECUTED |
| 15. Inactive Property | PASS: archived row stops, never silently unarchived | NOT EXECUTED |
| 16. Historical evidence | PASS: source/candidate/evidence unchanged; superseded canonical/link history retained | NOT EXECUTED |
| 17. Production unchanged | No database connections, queries or writes; existing files preserved | Production not queried |
| 18. No real pilot Property | Only artificial fixtures accepted, no live writer | 0 created |

Additional checks cover exact reuse of coherent pre-existing modeled canonical/Property rows, duplicate county Property representation, candidate-to-other-Property conflict, other-candidate-to-same-Property conflict, inactive Assessor, incomplete source batch, changed replay lineage and rejection of a lookalike database object.

## Repeat execution and retrieval

| Modeled table group | Before | After first run | After second run | Added by replay |
| --- | --- | --- | --- | --- |
| Canonical resolutions | 0 | 1 | 1 | 0 |
| Properties | 0 | 1 | 1 | 0 |
| Opportunity links | 0 | 1 | 1 | 0 |
| Identity evidence snapshots | 0 | 1 | 1 | 0 |
| Audit events | 0 | 2 | 2 | 0 |
| Idempotency records | 0 | 2 | 2 | 0 |

The second operation returned `idempotentReplay: true`. Resolution, Property, lineage and evidence IDs remained identical. Full modeled state and evidence hash were unchanged. A subsequent transaction reopened all four through the existing read repositories without mutation. Two idempotency records represent the composed workflow and canonical-address operation; two audits represent canonical confirmation and synthetic identity linkage.

These are model counts, not database counts. The test double serializes whole transactions, recognizes only specific SQL shapes and simulates storage/rollback. It does not parse PostgreSQL SQL, execute FKs/checks/triggers/RLS, simulate real lock races or establish durability across database connections. The static migration checksum/index assertions are source integrity checks, not deployed-schema certification.

## Preservation and accounting

294 pre-existing file hashes were captured at task start and checked after implementation: **294 unchanged, 0 changed**. This set covers application/persistence/schema/package/ignore files, protected baseline artifacts, existing identity-review code, real pilot packets/decisions, Google diagnostics/reservations, exclusions and Round 1 controls. The snapshot was taken after the genuine IP-P2 approval already existed; an old all-unapproved assumption was not restored.

The certification runner checks the start snapshot when available; a reproduction without it explicitly reports `NO_START_SNAPSHOT_AVAILABLE`, never preservation PASS. All six migration files also pass exact certified local checksum assertions. No historical protected manifest was rebased.

| Operation | Count |
| --- | --- |
| Database connections / queries / writes | 0 / 0 / 0 |
| Google / ATTOM / RentCast / DataTree / county / MLS calls | 0 each |
| Real pilot Properties / new real analyst decisions | 0 / 0 |
| Round 1 properties selected | 0 |
| Dependencies installed / resources provisioned / migrations / deployments | 0 each |

The offline preload blocks HTTP(S), fetch and socket connections. The focused test and main sequence recorded zero network attempts; the other selected tests also ran under that blocker. Runtime output is gitignored. Shareable additions contain synthetic examples only, no actual pilot addresses, parcel identifiers, owner/contact data or credentials.

Evidence: `data/runtime/durable-identity-pilot/certification-FklWS6/certification.json`, adjacent `tests.tap`, parent `isolation-inspection.json` and `preservation-before.json`. Earlier local test artifacts were retained, not overwritten. **Actual persistence, canonical creation, durable Property creation, linkage and rollback certification remain NOT EXECUTED.**
