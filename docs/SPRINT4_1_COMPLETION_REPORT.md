# Sprint 4.1 Supabase provider migration completion report

**Date:** 2026-09-19  
**Scope:** provider/runtime plumbing only; Sprint 4 schema and persistence semantics preserved  
**Decision:** **PRODUCTION CERTIFIED — PERSISTENT PROPERTY & DEAL INTELLIGENCE OPERATIONAL**

## TLS investigation update

The original `ENOTFOUND` was resolved by the operator, after which the adapter reached the Supabase Transaction Pooler but Node rejected its certificate chain as `SELF_SIGNED_CERT_IN_CHAIN`. Node 20's default trust store contained 150 roots and did not contain the Supabase Root 2021 CA. The previous pool configuration already required `rejectUnauthorized: true`, but supplied no Supabase CA. The first post-fix preflight reached the database but reported the PostgreSQL backend's `pg_stat_ssl` state as false; direct pooler transport inspection showed the client socket was encrypted and authorized with TLS 1.3. The preflight path now reports that client transport state instead of treating the pooler's backend hop as the client TLS certificate check.

Supabase's current PostgreSQL guidance identifies port 6543 as the shared Transaction Pooler and recommends `verify-full` with the project CA. The adapter now parses the connection string before constructing `pg.Pool` so any URL `sslmode` cannot overwrite the verified TLS object, retains Node's normal roots, and adds the official public Supabase Root 2021 CA with `rejectUnauthorized: true`. It does not set `NODE_TLS_REJECT_UNAUTHORIZED`, use `rejectUnauthorized: false`, or globally disable TLS. The CA fingerprint is recorded in `src/persistence/supabase-ca.js`.

## Implemented

- Replaced the runtime database boundary with standard `pg` and a reusable, server-only pool sourced from `DATABASE_URL`.
- Preserved repository/service SQL, immutable evidence/comparable/analysis snapshots, transactions, idempotency, audit history, and UI/analytical behavior.
- Added safe health metadata (`databaseConfigured`, `databaseProvider`, `persistenceAvailable`) without host or credential disclosure.
- Added ordered, transactional migration/status/preflight commands with checksum ledger and destructive-SQL guards. No reset/down command exists.
- Added Supabase persistence certification coverage using exact `SPRINT4_1_QA` tags, separate connections, rollback, duplicate/idempotency, unknown-versus-zero, immutable snapshots, archive/list, and injection-safe search checks.
- Added the Supabase runbook and updated schema/development/deployment documentation to remove Netlify Database runtime assumptions.
- Removed the obsolete `@netlify/database` dependency from `package.json`/`package-lock.json` after Supabase certification. Active source, Netlify configuration, and function packaging contain no Netlify Database provisioning dependency.

`netlify/database/migrations/001_persistent_intelligence.sql` was not modified. It remains the schema authority. Its use of PostgreSQL `gen_random_uuid()` is compatible with the target PostgreSQL runtime; no migration rewrite or extension change was made.

## Local certification

| Gate | Result |
|---|---|
| Foundation/regression unit suite (`npm test`) | PASS — 91 tests |
| Adapter syntax/source/security tests | PASS — included in `npm test` |
| JavaScript syntax checks | PASS |
| Dependency/provider cleanup | PASS — standard `pg`; `@netlify/database` removed |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| Supabase preflight (`npm run db:preflight`) | PASS — TLSv1.3, client encrypted/authorized, no TLS authorization error |
| Migration status (`npm run db:status`) | PASS — exactly one pending `001_persistent_intelligence.sql` |
| Migration (`npm run db:migrate`) | PASS — applied once; no pending migrations |
| Schema certification (`npm run db:schema:qa`) | PASS — checksum, 15 tables, required columns, 11 indexes, 20 restrictive FKs |
| Supabase persistence QA (`npm run persistence:supabase:qa`) | PASS — separate-pool evidence/analysis immutability, 15 comps, rollback, idempotency, duplicate independence, archive, unknown/zero, injection-safe search; 0 provider calls |
| Full Sprint 4 regression/UI/map/report/runtime/security suite (`npm run sprint4:qa`) | PASS — 91 tests and all QA stages |

The original preflight failures (`ENOTFOUND`, then `SELF_SIGNED_CERT_IN_CHAIN`) were reported without printing or inspecting the value of `DATABASE_URL`. After the verified CA-chain correction, the repository migration and non-destructive Supabase certification completed successfully. QA records are explicitly tagged `SPRINT4_1_QA`; no reset or truncate was used.

## Netlify preview gate

Preview deployment was attempted only after local/Supabase certification. The fresh certified preview is [6aadf0d396f142b809d58703](https://6aadf0d396f142b809d58703--worksidepropertyintelligence.netlify.app), with [build logs](https://app.netlify.com/projects/worksidepropertyintelligence/deploys/6aadf0d396f142b809d58703).

- Deploy/build output showed no `createSiteDatabase` call or Netlify Database provisioning; the function bundle contained standard `pg`/`pg-connection-string` files and no `@netlify/database` package.
- `/api/health` PASS: `runtime: "netlify"`, `databaseConfigured: true`, `databaseProvider: "postgresql"`, `persistenceAvailable: true`; no database error field was returned.
- Deployed QA smoke (`npm run preview:persistence:qa`) PASS using tag `SPRINT4_1_PREVIEW_QA`, with zero RentCast calls:
  - Property reopened across separate Function invocations; evidence history reopened and all 15 retained comps were present.
  - Deal reopened with 10 claims, 21 diligence items, and one analysis snapshot.
  - Property and Deal idempotent replays returned the original IDs; the tagged Deal listing contained exactly one match.
  - Browser HTML/asset scan found no database URL, provider credential, private key, or Netlify Database package.
- Recent deployed Function-log scan found no credential-like content. Local function artifact/security scan passed with 0 provider calls.
- The Netlify project environment list includes the variable name `DATABASE_URL`; its value was never read or printed.

The linked Netlify project receives the server-only variable named `DATABASE_URL` (name only; its value is intentionally not included here). The application code no longer reads `NETLIFY_DB_URL` or imports `@netlify/database` at runtime. This preview verified that Functions connect through `DATABASE_URL` without Netlify Database provisioning.

## Security and protected artifacts

- No connection string, host, password, or API credential was printed, logged, copied, or committed.
- Browser code has no database import or `DATABASE_URL` access.
- No RentCast calls were added; analytical and evidence behavior remains unchanged.
- No Sprint 4 schema, protected historical artifacts, or production data were changed outside the approved Supabase migration and explicitly tagged QA records.

## Required next operator action

Review the certified preview results and explicitly authorize or decline any production deployment. Do not rerun `001_persistent_intelligence.sql`, reset, truncate, or perform the final live production persistence smoke as part of this report.

Preview recommendation before production: **GO only after explicit operator authorization**. That authorization was subsequently provided, but the production analysis-snapshot gate failed; production is therefore **NO-GO / NOT CERTIFIED**.

## Production deployment gate

Production deployment was explicitly authorized and completed without rerunning migration `001_persistent_intelligence.sql`, resetting/truncating data, or invoking Netlify Database provisioning.

- Deploy ID: `6aadf18964d3964fd1278553`
- Production URL: [worksidepropertyintelligence.netlify.app](https://worksidepropertyintelligence.netlify.app)
- Unique deploy URL: [6aadf18964d3964fd1278553--worksidepropertyintelligence.netlify.app](https://6aadf18964d3964fd1278553--worksidepropertyintelligence.netlify.app)
- Production health PASS: `runtime: "netlify"`, `databaseConfigured: true`, `databaseProvider: "postgresql"`, `persistenceAvailable: true`.
- Production deploy output showed no `createSiteDatabase` call or Netlify Database provisioning.

The controlled production smoke began with the explicitly tagged `SPRINT4_1_PRODUCTION_QA` Property/Deal flow. Save Property, Property replay, Property reopen/evidence/comps, Save Deal, Deal replay, and Deal reopen reached the production API. The created Deal ID was `9295105e-321a-4827-819d-d7fbaa3601dc`; the Property ID was not emitted before the STOP. The first analysis-snapshot request then failed with `ANALYSIS_REQUIRED`; a single portable-session retry was attempted and returned only sanitized `DATABASE_UNAVAILABLE`. The production analysis-history/immutability/idempotency gate therefore did not pass. The production smoke was stopped immediately, with no further requests, retries, destructive cleanup, migration, or production redeploy. No cleanup was attempted for the tagged QA record.

At that point in the original run, production status was **NOT CERTIFIED**. That historical STOP was superseded only after the corrective deployment and re-certification recorded below.

## Analysis-snapshot failure investigation

The failure was a request-contract/session-lifetime defect, not a migration, formula, or Supabase connectivity defect. The `/api/deals/:id/analyze` handler previously looked up the analysis model only in the in-memory `sessions` map. The production Save Deal request successfully persisted Property, Evidence, retained Comparables, Deal Claims, Diligence, and the initial Analysis snapshot, but the subsequent Function invocation supplied a cold-session fixture token. Because that token did not reconstruct a model in the new instance, the service correctly returned `ANALYSIS_REQUIRED`. The preview persistence script had verified Deal persistence but did not exercise this cross-invocation re-analysis contract, which is why the defect was not caught earlier.

The single portable-session retry returned sanitized `DATABASE_UNAVAILABLE`, but it used a session/evidence combination that was not independently established as the durable production Deal reference. No schema or transaction evidence implicated Supabase, and no production retry was made after the STOP condition. A sanitized six-hour production Function-log query found 86 entries and no emitted `ANALYSIS_REQUIRED`, `DATABASE_UNAVAILABLE`, or `EVIDENCE_NOT_LINKED` payloads and no credential-like output. The secondary response is therefore treated as error masking in the retry/session path until a separately authorized production run proves otherwise; it was not used to weaken validation.

### Corrective changes

- `openDeal` now reconstructs a deterministic re-analysis model from durable Property, the latest linked Evidence snapshot, its retained Comparables, Deal Claims, Diligence, and the prior analysis payload.
- `/api/deals/:id/analyze` uses an ephemeral session model when present and otherwise falls back to that durable reconstruction. A supplied evidence ID must belong to the saved Deal; otherwise the API returns `EVIDENCE_NOT_LINKED`.
- `ANALYSIS_REQUIRED` remains a real validation error when neither a session model nor durable Deal inputs exist. Analytical formulas, migration `001`, immutable snapshot behavior, and transaction/idempotency semantics were not changed.
- Regression coverage now proves both the preserved missing-model validation and source-level durable reconstruction of evidence, comps, claims, and diligence without session state.

## Corrective deploy-preview certification

The corrected revision was deployed only to a fresh deploy preview (no production redeploy): [6aadf39c3d17fbefe3985ca7--worksidepropertyintelligence.netlify.app](https://6aadf39c3d17fbefe3985ca7--worksidepropertyintelligence.netlify.app), deploy ID `6aadf39c3d17fbefe3985ca7`.

- Preview `/api/health` PASS: `runtime: "netlify"`, `databaseConfigured: true`, `databaseProvider: "postgresql"`, `persistenceAvailable: true`.
- `npm run preview:persistence:qa -- <preview> SPRINT4_1_ANALYSIS_FIX_QA_COLD` PASS. It reopened the Property with 4 evidence snapshots and all 15 retained comps, reopened the Deal with 10 claims and 21 diligence items, and created two analysis snapshots through separate HTTP Function invocations.
- Analysis #1 remained byte-for-byte unchanged after Analysis #2 (`firstAnalysisUnchanged: true`); Analysis History contained both IDs (`d60d2f33-160e-4be5-bf0c-dc08bee0a303`, `4cd5458b-71d3-41ec-8605-9616498d6d84`); replay of the same request was idempotent and created no third snapshot (`analysisReplay: true`, `idempotentReplay: true`). Property/Deal replay also remained idempotent.
- The corrected preview path returned no `DATABASE_UNAVAILABLE`, made zero RentCast calls, and verified the linked evidence/comps reopening contract.
- Browser asset scan PASS; local Function bundle/runtime credential scan PASS; `npm audit --omit=dev` PASS with 0 vulnerabilities. No database URL, password, provider credential, or private key appeared in browser assets, Function artifacts, logs, or this report.
- Full regression/security/UI/PDF suite after the change: PASS — 91 tests, all QA stages, 0 provider calls.

At that stage the corrective revision was **not production-certified** because production redeployment was prohibited during investigation. No existing production QA record, schema, migration, or production endpoint was modified or deleted; the preview smoke created only its explicitly tagged QA records. The authorized production re-certification is recorded below.

### Cold-session verification preview

The initial corrective smoke reused a fixture session token, so the harness was tightened to send an intentionally unknown `cold-reanalysis:<dealId>` key. The final fresh preview above therefore forced durable Deal reconstruction rather than relying on a warm in-memory session:

- QA tag: `SPRINT4_1_ANALYSIS_FIX_QA_COLD`; Property `16141865-fcaf-4d2c-9be5-04c97cc6884c`, Deal `8c5a6ce4-3d7d-4496-b8e8-dd3002df2c48`.
- Property reopened with 4 evidence snapshots and all 15 retained comps; Deal reopened with 10 claims and 21 diligence items.
- Durable re-analysis created Analysis #2 `4cd5458b-71d3-41ec-8605-9616498d6d84` after Analysis #1 `d60d2f33-160e-4be5-bf0c-dc08bee0a303`; Analysis #1 remained unchanged, history contained exactly both snapshots, and replay created no duplicate.
- Zero RentCast calls. Preview Function-log scan: 4 entries and 0 credential-like entries. Browser asset and Function artifact scans PASS; no credential values were printed.

This cold-session preview is the recommended evidence for production re-certification review; it does not authorize or perform production deployment.

## Corrective production deployment and re-certification

The approved corrective revision represented by preview deploy `6aadf444f099639c7cfa0fd4` was deployed to the existing production project without rebuilding application logic, rerunning migration `001_persistent_intelligence.sql`, provisioning Netlify Database, resetting/truncating Supabase, or touching the prior failed `SPRINT4_1_PRODUCTION_QA` records.

- Production deploy ID: `6aadf52b7fdfaae78454d528`
- Production URL: [worksidepropertyintelligence.netlify.app](https://worksidepropertyintelligence.netlify.app)
- Production unique deploy URL: [6aadf52b7fdfaae78454d528--worksidepropertyintelligence.netlify.app](https://6aadf52b7fdfaae78454d528--worksidepropertyintelligence.netlify.app)
- `/api/health` PASS: `runtime: "netlify"`, `databaseConfigured: true`, `databaseProvider: "postgresql"`, `persistenceAvailable: true`.
- Deploy output and sanitized production Function logs showed no `createSiteDatabase`, Netlify Database provisioning, or `@netlify/database` operation.

Controlled production certification used the unique tag `SPRINT4_1_PRODUCTION_RECERT_20260919`:

- Property ID `16141865-fcaf-4d2c-9be5-04c97cc6884c` reopened across separate Function invocations with linked Evidence and all 15 retained Comparables. Property save replay was idempotent.
- Deal ID `c48ef431-21be-4767-8001-401054a6d1ec` reopened with 10 persisted Claims and 21 Diligence items. Deal save replay was idempotent.
- Analysis #1: `b4943315-b0cd-438b-86b0-bcf9811f2e4d`.
- Analysis #2: `7942c131-57ef-43e8-8052-9a2e24ab6550`, created through an unknown/cold session key so durable Property + linked Evidence + Comparables + Claims + Diligence reconstruction was required.
- Analysis #1 remained byte-for-byte unchanged after Analysis #2. Analysis History contained exactly 2 snapshots. Replaying the identical Analysis #2 request returned the existing snapshot and created no Analysis #3.
- Provider-call count: `0` RentCast calls.
- Production browser asset scan: PASS. Function artifact/runtime scan: PASS. Sanitized production Function-log scan: 72 entries, 0 credential-like entries, 0 Netlify provisioning entries. No `DATABASE_URL`, password, provider credential, or private key was exposed.
- Final regression/security smoke (`npm run sprint4:qa`): PASS — 91 unit tests, 18 Netlify runtime tests, UI/map/PDF/UX checks, and credential scan all passed; 0 provider calls. `npm audit --omit=dev`: 0 vulnerabilities.

**PRODUCTION CERTIFIED — PERSISTENT PROPERTY & DEAL INTELLIGENCE OPERATIONAL**

STOP. No Sprint 5, MAO, Kern, Monte Carlo, authentication, or additional feature work was started.

**STOP for Stan/ChatGPT review.**
