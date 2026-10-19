# PI Durable Identity Persistence Pilot V1

Date: 2026-10-09. Classification: **LOGIC CERTIFIED — ISOLATED DB REQUIRED**.

The existing repositories support canonical resolution, Property storage and explicit Opportunity lineage. The complete approval/retention-gated workflow is **PARTIAL**: this pilot demonstrates an offline composition of those repositories, not a new production endpoint or a certification of production safety. No isolated database was positively verified. No database was connected or queried.

## Certification boundary

| Level | Result |
| --- | --- |
| Logic certification | PASS: 81/81 tests, zero failures/skips |
| Isolated PostgreSQL persistence | NOT EXECUTED |
| Real property identity certification | NOT EXECUTED / not authorized |
| Real pilot approvals, Properties or Round 1 selections created | 0 |
| Database queries/writes; provider calls; deployments | 0 / 0; 0; 0 |

IP-P2's existing local APPROVED decision is Google-bound. It was not changed, copied into a synthetic fixture, or accepted as permission to persist an address. Historical approval and current evidence-use permission remain separate questions.

## Existing architecture and schema

These findings describe checked-in SQL and source, not a fresh inspection of any deployed schema. All six migration files match the existing certified local checksums; no migration was run or edited.

| Responsibility | Existing implementation | Storage and important protections |
| --- | --- | --- |
| County discovery identity | `opportunityRepository.js`; `assessorOpportunityRepository.js` | `discovery_sources`, `discovery_records`, `opportunity_candidates`, `opportunity_record_links`; unique source hash, source/row and source/fingerprint, candidate key and record-link tuple; restrictive FKs |
| Assessor relationship | `assessorOpportunityRepository.js`; migration 004 | `opportunity_assessor_import_batches` and `opportunity_assessor_enrichments`; exact candidate ATN, batch/source provenance, one current observation per candidate; immutable history with controlled supersession |
| Canonical address | `addressResolutionRepository.js`; migration 005 | `candidate_address_resolutions`; required components, confirmation flag/timestamp, source/method, candidate and Assessor FKs, versioned history, active-candidate and candidate/idempotency unique indexes |
| Durable Property | `propertiesRepository.js`; migration 001 | `properties`; stable UUID, unique normalized address, separate `atn`/`apn`, `identity_status`, `archived_at`; normalized-address conflict reuses the row |
| Explicit Opportunity linkage | `opportunityPropertyLinkRepository.js`; migration 006 | `opportunity_property_links`; restrictive candidate/Property/canonical/Assessor FKs; one active candidate and one active Property link; candidate/idempotency unique index; immutable history except supersession |
| Approval/audit/provenance | Address repository; `evidenceRepository.js`; `db.js` | Canonical confirmation/context/notes, generic `evidence_snapshots.provenance_payload`, `audit_events`, `idempotency_keys`; no dedicated durable evidence-license or reviewer-approval binding enforced by the existing workflow |
| Transaction/replay | `db.js`; `propertyPersistenceService.js` | Connected pool client with BEGIN/COMMIT/ROLLBACK; advisory-lock idempotency; existing save service groups Property/evidence/link operations, but canonical confirmation is a separate operation |
| Active/inactive/conflicts | Existing repositories and schema | Candidate/Property archive fields; Assessor/canonical supersession; lineage status and active unique indexes; legacy `resolved_property_id` compatibility checks |

Repository paths above are under `src/persistence/`, except `propertyPersistenceService.js` under `src/services/`. The Assessor, canonical and lineage tables enable RLS and revoke PUBLIC/anon/authenticated access in migrations 004–006. Runtime roles/policies were not queried. Do not extrapolate those protections to every table.

Important constraints are `opportunity_assessor_current_candidate_idx`, `candidate_address_resolutions_active_candidate_idx`, `candidate_address_resolutions_idempotency_idx`, `opportunity_property_links_active_candidate_idx`, `opportunity_property_links_active_property_idx` and `opportunity_property_links_idempotency_idx`. The corresponding immutable-history triggers remain intact. `properties.normalized_address` is unique even for archived rows. County APN9 is deliberately not globally unique: multiple assessment entities may reference one parcel.

There is no direct canonical-resolution FK on `properties`; the explicit lineage row connects these identities. Imported screening status and `resolved_property_id` were not rewritten. The modeled Property retains existing `UNCONFIRMED` identity-status semantics; its canonical resolution is `ANALYST_CONFIRMED` and its lineage `ACTIVE`. This does not manufacture postal/parcel verification or investment readiness.

## Isolation verification

**ISOLATED DATABASE NOT VERIFIED.** The inspection was limited to existing local configuration, installed tooling and service/listener metadata. Environment contents were not printed or loaded into the test runtime.

| Check | Observation |
| --- | --- |
| Existing database settings | Default database is nonlocal and not authorized for this pilot; no dedicated isolated/test setting found |
| Local tooling | No `psql`, `postgres`, `pg_ctl` or Docker command on PATH; installed `pg` is a client library, not proof of a database |
| Local service/listener checks | No PostgreSQL service or conventional port 5432 listener found; standard PostgreSQL install directory and PGlite package absent |
| Actual server/database identity | NOT VERIFIED |
| Role and privileges | NOT VERIFIED |
| Existing schema / absence of production data | NOT VERIFIED / NOT VERIFIED |
| Separation from production services | NOT VERIFIED |
| Safe cleanup target | NOT VERIFIED |

This is not proof that no other database exists. No default connection was opened to find out. Existing `qa-persistence.js` loads configured credentials and includes destructive cleanup; it was not run. Historical temporary-schema certification on the configured database is not acceptable evidence of isolation for this task and was not run. Nothing was provisioned or installed.

## Offline implementation

New files are confined to `scripts/durable-identity-pilot/`, these three reports, and gitignored local QA output. Application code, database code, migrations, review decisions and protected baselines are unchanged.

| File | Purpose |
| --- | --- |
| `fixture.js` | Explicit artificial county, source, Assessor, Opportunity, address, approval and independent component-evidence fixtures |
| `policy.js` | Synthetic-only approval, reviewer, fingerprint, expiry, permitted-use and exact evidence-binding preconditions |
| `workflow.js` | Compose the existing canonical, Property, linkage, evidence and audit repositories in one transaction; validate retrieved identities on replay |
| `query-double.js` | Strict SQL-routing in-memory test double behind the existing transaction wrapper; unknown SQL fails |
| `pilot.test.js` | 29 focused offline tests, including negative and fault-injection cases |
| `certify.js` | Explicit seven-file offline regression run, two executions plus read-only repository reopen, unique QA output and preservation checks |

The fixture uses artificial county `SYNTHETIC_COUNTY_CA`, ATN `90000000001`, APN9 `900000001`, and `100 Synthetic Persistence Lane, Fixture City, CA 99999`. Candidate/source/Assessor IDs are explicit synthetic UUIDs. Discovery-source and Assessor-source hashes are distinct; source row, packet, component evidence and approval fingerprints are bound separately. The test clock is fixed at `2026-10-09T12:00:00.000Z`, not a claim about real review or evidence expiry. Seeded source objects are query-double projections, not complete PostgreSQL import fixtures.

The workflow requires exact candidate/ATN/APN/source/Assessor relationships before address equality is considered. No fuzzy/address-only discovery is used. An ambiguous existing county representation stops for review; this is a conservative pilot gate, not a new global APN uniqueness rule. The real Opportunity repository was inspected, but the test seeds a synthetic existing Opportunity rather than importing county data or creating an investment Opportunity.

The existing canonical validator and repository are reused. The address repository's transaction call is bound to the outer transaction so there is one modeled commit boundary for resolution, Property, linkage, generic identity evidence and audit. `propertyPersistenceService.saveProperty` is not invoked: it expects a ready analysis model and saves analysis/provider evidence. This identity-only experiment must not fabricate one. Existing generic evidence storage records synthetic component provenance without valuation, Deal, provider lookup or investment calculations.

The harness accepts only a query-double object registered by its private WeakSet; a URL, injected real pool or an `isolated: true` assertion cannot enable live persistence. There is no `--apply` path. Network blocking is preloaded, and no `.env` is loaded. These restrictions intentionally prevent this certification helper from becoming an accidental live writer.

## Approval and retention controls

Before any modeled transaction, the pilot requires explicit synthetic approval, the authorized synthetic reviewer and acknowledgement, nonfuture/unexpired review, current packet/evidence hashes, exact confirmed components and no unresolved contradictions. Every component must have independent synthetic source support, correct candidate/county binding, current retention and shared-canonical permission.

Google-tagged evidence, unresolved temporary-provider dependencies, expired evidence, wrong purpose or property, and unsupported components fail even if an approval or permission Boolean is supplied. Replay reruns these guards; historical approval is not erased on rejection. These are tested pilot controls, not a deployed licensing service or proof that caller-supplied permission metadata establishes real legal rights. Existing production repository gaps are explicit in the gap analysis.

## Reproduction and evidence

From the repository root:

```powershell
node scripts/durable-identity-pilot/certify.js
```

The command only runs offline tests and writes a fresh gitignored local artifact directory. Its stdout reports that directory. Certification artifact for this run: `data/runtime/durable-identity-pilot/certification-FklWS6/certification.json`; test transcript beside it: `tests.tap`. Isolation observations and the 294-file start fingerprint set are in the parent directory. No credential values are recorded.

Read [QA results](PI_DURABLE_IDENTITY_PERSISTENCE_QA.md) and [remaining gaps](PI_DURABLE_IDENTITY_GAP_ANALYSIS.md). Stopped for Stan/ChatGPT review. No real persistence or Round 1 selection is enabled.
