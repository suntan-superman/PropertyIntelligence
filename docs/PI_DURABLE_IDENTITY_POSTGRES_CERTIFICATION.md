# PI Durable Identity — PostgreSQL Certification V2

Date: 2026-10-09. **ISOLATED POSTGRESQL CERTIFIED**.

The approved synthetic identity sequence committed successfully through PI's existing repositories on actual local PostgreSQL. Sequential replay created no additional records. Eight concurrent requests on eight PostgreSQL writer backends produced one identity and seven replays. Independent read-only connections verified stable relationships and complete rollback of failed operations.

This closes V1's real-database mechanics gap. It does not certify a real county property, license Google content, enable a production persistence route, or authorize MLS selection.

## Verified local environment

| Setting/check | Verified result |
| --- | --- |
| Server | PostgreSQL 18.6 |
| Database | `pi_identity_test` |
| Role / database owner | `pi_test_user` / `pi_test_user` |
| Server-reported address / port | `127.0.0.1` / `5432` |
| Windows instance | Running `postgresql-x64-18`; listening process is `postgres.exe`, parent is the service process |
| Role capabilities | No superuser, create-database, create-role, replication or bypass-RLS privilege |
| Other client sessions before either run | 0 in the target database |
| Initial application objects | 0 tables/indexes/sequences and 0 application functions; only `public` schema and built-in PL/pgSQL |
| Credential source | Only gitignored `data/runtime/identity-persistence-test/local-db.env` |
| Production configuration or connections | Not loaded; 0 connections |

The earlier read-only check used an inet-to-text cast that included `/32`; V2 verifies the native `inet_server_addr()` value. The server identity is the required loopback tuple, not a hostname assumption.

Isolation rests on the explicit user-designated test instance, exact SQL identity/ownership, empty initial inventory, observed absence of other clients, dedicated local role, and process-level network restrictions. No production database was queried to establish isolation. The Windows server listener also binds other interfaces; this test does not certify firewall exposure. Every test connection is restricted to loopback and no external provider traffic is permitted.

## Schema preparation and preservation

All six existing migrations were reviewed and applied verbatim to each new test-owned schema, with exact certified checksums recorded in its `property_intelligence_schema_migrations` ledger. No production migration command or default `.env` loader was invoked.

The existing Assessor importer accepts only its established QA namespace or separately authorized production use. V2 therefore uses `qa_sprint6_3_<random hex>` inside this verified local database, without enabling production authorization. A local ownership manifest and matching schema comment identify each run. Unknown local schemas or public objects stop execution; existing test schemas require matching ownership and migration ledger before a new run proceeds. Prior test data is never reused or cleaned by a later run.

| Migration | Reason included |
| --- | --- |
| 001 | Property, evidence, audit, idempotency and dependency tables; existing retrieval joins need Deal tables, which remain empty |
| 002 | Preserve the established complete migration sequence; acquisition/condition tables remain empty |
| 003 | Discovery sources/records, Opportunities and authoritative source relationships |
| 004 | Assessor import provenance, observations and history guards |
| 005 | Canonical resolution, confirmation, versions and active uniqueness |
| 006 | Explicit Opportunity–Property lineage, restrictive FKs and active uniqueness |

The actual schema has 30 tables including the ledger, 45 restrictive foreign keys, all FK targets inside the owning schema, the expected active/idempotency unique indexes, and the existing immutable-history triggers. The four Assessor/canonical/lineage tables have RLS enabled and zero PUBLIC/anon/authenticated table grants. This is structural verification under the owning test role, not an anonymous-role penetration test.

Two complete certification invocations were retained:

| Run | Runtime | Retained schema | Result |
| --- | --- | --- | --- |
| Initial local run | Node 20.19.4 | `qa_sprint6_3_82f9f53b405d43199a8750f720694f26` | 81/81 offline; 22/22 PostgreSQL |
| Repeat / primary certification | Existing cached Node 22.12.0 | `qa_sprint6_3_0978fa8d6ba842959caaf5d6b36b6bfe` | 81/81 offline; 22/22 PostgreSQL |

Node 22.12.0 satisfies the repository engine floor. No Node installation, global runtime switch, dependency change or deployment occurred. The repeat run fingerprinted every table in the first schema before and after: unchanged. `public` and all pre-existing schema objects remained unchanged. No DROP or TRUNCATE was issued.

## Repositories and transaction sequence

Positive record creation used existing application interfaces, not SQL fixture inserts bypassing their rules:

1. Validate explicit synthetic approval, packet/evidence fingerprints, exact components, county identity, scope and expiry.
2. Enter the existing `createDatabase().transaction` connected-client transaction; serialize the synthetic county seed key with a PostgreSQL advisory lock.
3. Create/retrieve source and record through `insertDiscoverySource` / `insertDiscoveryRecord`, Opportunity through `upsertOpportunityCandidate`, and its exact source relationship through `insertRecordLink`.
4. Apply a complete synthetic Assessor plan with existing `applyAssessorPlan`, using the same transaction and its original validation/trigger rules. Retrieve with `readAssessor`.
5. Bind an explicitly synthetic approval fixture to the returned synthetic database IDs. This test-fixture construction is not an analyst approval mechanism for real records.
6. Reuse V1's extracted repository composition: `saveAddressResolution`, `insertOrReuseProperty`, `createOpportunityPropertyLink`, `insertEvidenceSnapshot`, `audit` and `idempotent`, all on the same transaction client.
7. Reopen exact canonical/Property/link/evidence and Opportunity relationships through existing read repositories before committing.
8. Inspect counts, hashes and relationships independently from separate physical read-only database connections.

The candidate must be created before canonical/Assessor rows because their FKs require it. Binding the canonical repository and Assessor importer to the outer transaction prevents an intermediate commit. Failure after canonical, Property or lineage insertion rolls back the entire sequence, including source, candidate, Assessor, evidence, audits and idempotency records.

No production application repository was changed. V1's `workflow.js` now delegates to a shared synthetic `sequence.js`; its original offline-only guard remains. V2 adds a local transport, schema-complete synthetic fixtures, integration tests and an explicit certification command. This is test composition of existing persistence interfaces, not a replacement identity architecture.

## Durable and repeat results

Within each retained schema, one identity exercises sequential replay and a second exercises concurrent creation:

| Aggregate | After sequential first write | After same write replay | After eight concurrent requests for second fixture |
| --- | --- | --- | --- |
| Canonical resolutions | 1 | 1 | 2 |
| Properties | 1 | 1 | 2 |
| Opportunities | 1 | 1 | 2 |
| Active lineage links | 1 | 1 | 2 |
| Identity evidence snapshots | 1 | 1 | 2 |
| Audit events | 2 | 2 | 4 |
| Idempotency rows | 2 | 2 | 4 |
| Deals / analysis / valuation rows | 0 | 0 | 0 |

Stable IDs were checked internally but only aggregate results are reported. Existing candidate upsert behavior can advance `last_seen_at` / `updated_at` on replay; no imported score, priority, status or identity relationship changed. Non-candidate historical table fingerprints remained unchanged on replay.

Across the two deliberately separate retained schemas there are four artificial Properties total, not four real Properties. Each schema has exactly two synthetic identities. Failure probes left no additional records. Nothing was deleted; the retained schemas are intentional review evidence, not leaked production data. Cleanup, if later desired, must explicitly identify these test-owned schemas and preserve anything else.

## Evidence and production boundary

The artificial fixture uses reserved-looking test ATN/APN patterns, `SYNTHETIC_COUNTY_CA`, artificial street/city/ZIP components, test-only source hashes and explicit synthetic component permissions. No real pilot packet, county record, owner/contact data, Google response or actual analyst decision is loaded by the integration test. Permission tests use a fixed simulated clock, `2026-10-09T12:00:00Z`.

Missing/stale/expired approval, wrong-property evidence, expired evidence and Google/restricted shared-use evidence are rejected. A synthetic permission label is not production legal authorization. Property status retains existing `UNCONFIRMED` semantics; the canonical resolution is analyst-confirmed in the synthetic fixture and lineage is ACTIVE. This is not postal validation, real parcel certification, or investment readiness.

## Artifacts and reproduction

Primary machine report: `data/runtime/identity-persistence-test/v2-0978fa8d6ba842959caaf5d6b36b6bfe/certification.json`.

Separate offline and PostgreSQL TAP transcripts: `data/runtime/identity-persistence-test/test-run-BPVwMQ/`. Initial run evidence is retained under `v2-82f9f53b405d43199a8750f720694f26/` and `test-run-J0jM5I/`. All runtime artifacts and local credentials remain gitignored.

Explicit local command, from the repository root under Node >=22.12:

```powershell
node scripts/durable-identity-pilot/postgres-certify.js
```

The tested Node 22 invocation used the already-installed binary at `%LOCALAPPDATA%\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe`. The default shell's Node 20 was not changed. Each invocation requires the exact dedicated local configuration, performs isolation checks again, and creates a fresh marked schema. It offers no alternate target option or production fallback and is not connected to npm build/deploy tasks.

304 pre-existing paths were fingerprinted: 303 unchanged; the single intentional change is V1's workflow extraction. All application repositories, migrations, package/ignore files, actual pilot decisions, local credential configuration and Round 1 controls were preserved. No protected baseline was rewritten.

See [QA](PI_DURABLE_IDENTITY_POSTGRES_QA.md) and [remaining production gaps](PI_DURABLE_IDENTITY_POSTGRES_GAPS.md). **Stopped for Stan/ChatGPT review.**
