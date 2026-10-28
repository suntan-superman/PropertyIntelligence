# Property Intelligence — Supabase dependency and usage audit

**Audit date:** October 26, 2026  
**Target:** Supabase project `jsrvdryddojhkmjzotef` (`PropertyIntelligence`)  
**Classification:** READ-ONLY AUDIT — NO OPERATIONAL CHANGES AUTHORIZED

## 1. Executive summary

Supabase remains a genuine production dependency. Property Intelligence does not use `supabase-js`, Supabase Auth, Supabase Storage, Realtime, or the browser-facing Data API. It does use the target project's PostgreSQL database from Netlify Functions through the server-only `DATABASE_URL` and the standard `pg` driver.

The current architecture is split:

| Capability | Current authority |
| --- | --- |
| User authentication | Firebase Authentication |
| Organization-scoped saved properties, retained evidence, scenario revisions, reports, documents, commercial records | Firestore and Firebase Cloud Storage |
| Kern “Discover Opportunities” corpus and workflow | **Supabase PostgreSQL** |
| Legacy PostgreSQL properties, deals, analysis snapshots, acquisition decisions and related history | **Supabase PostgreSQL** |
| Payments | Stripe |
| Property research | RentCast, with retained evidence also stored in Firestore |

Direct production proof was obtained on October 26, 2026: an authenticated, read-only request to the deployed `/api/opportunities?page=1&pageSize=1` route returned HTTP 200, `11,316` candidates and `11,321` source records. Those exact counts match the target Supabase database. No mutation or provider request occurred.

### Acceptance questions

| Question | Answer |
| --- | --- |
| Is Supabase used by current PI production? | **Yes.** Netlify uses Supabase PostgreSQL for health checks, Discover Opportunities, and legacy PostgreSQL-backed property/deal/decision routes. |
| Is Supabase used by an active development feature? | **Yes.** Local and deployed workbench runtimes instantiate the same `pg` adapter when `DATABASE_URL` is present. Database migration and certification tools also target it. |
| Does Supabase contain unique or valuable data? | **Yes.** The Kern opportunity corpus and its assessor crosswalk are not present in Firestore. Three PostgreSQL properties and their linked history also have no normalized-address match in the current Firestore saved-property set. |
| Would another automatic pause affect PI? | **Yes.** Firebase-backed administration and Guided Analysis data would remain available, but Discover Opportunities and PostgreSQL-backed routes would fail. The application would not be fully functional. |
| Is there a reason to pay approximately $25/month? | **Yes, for production availability.** Capacity does not require Pro, but a Free project may automatically pause after low activity. Pro prevents inactivity pausing and adds daily backups and longer logs. |
| Can the project safely be archived or retired now? | **No.** Not until the opportunity corpus and all required PostgreSQL workflows are migrated and independently accepted. |

**Recommendation: Option A — Retain Supabase.** For a production/private-beta application that promises Discover Opportunities, use a non-pausing plan or complete a separately authorized migration before allowing another pause. Do not retire this project now.

## 2. Audit method and limitations

The audit used:

- tracked-source searches with `git grep` and `rg`;
- package, migration, runtime, Netlify Function and frontend route inspection;
- authenticated Netlify environment-variable metadata, without reading or printing secret values;
- the deployed health route and one authenticated production GET for a single opportunity row/count summary;
- the existing authorized PostgreSQL connection in explicit `BEGIN READ ONLY` transactions;
- read-only Firestore counts and normalized-address hashes for cross-store comparison;
- official Supabase pricing, pausing and backup documentation.

No database write, migration, deletion, project setting change, deployment, Firebase mutation, billing change, provider request, document download, or secret disclosure occurred.

Supabase Management API/CLI access is not configured in this workspace: `supabase projects list` stopped with `Access token not provided`. Therefore dashboard-only inventory—especially deployed Edge Functions, platform log history, dashboard usage charts and external dashboard integrations—could not be independently read. No access token or secret is requested in this report. Database-level evidence and repository evidence are reported separately from those unknowns.

## 3. Current production dependency assessment

### 3.1 Runtime path

The production path is direct server-side PostgreSQL, not the Supabase JavaScript SDK:

1. `netlify.toml:16-20` sends `/api/*` to the `api` Netlify Function.
2. `netlify/functions/api.js:1-5` creates the Netlify runtime with `process.env`.
3. `src/workbench/api/runtime.js:7,12-13` constructs `createDatabase({connectionString: env.DATABASE_URL})` and passes it to the API router.
4. `src/persistence/db.js:1-4,28-38` uses `pg`, parses `DATABASE_URL`, creates a bounded pool, and applies verified TLS. `src/persistence/db.js:14-18` contains the Supabase pooler CA path.
5. `src/auth/netlify-auth.js:96,308` delegates the health route and all unhandled authenticated routes to this PostgreSQL-backed router.
6. `src/workbench/api/router.js:66-92` uses PostgreSQL for health, properties, deals, opportunities, evidence, acquisition decisions and histories. Mutation paths continue through `src/workbench/api/router.js:100-191`.
7. `apps/web/src/features/opportunities/Opportunities.jsx:2,14-16,24-29,36` actively reads and changes the opportunity workflow through those routes; `apps/web/src/services/api.js:24-34` is the shared browser API wrapper.

This is not a dormant import that happens to remain installed. The deployed Discover Opportunities UI uses it.

### 3.2 Current Netlify configuration

Read-only Netlify metadata confirms:

- `DATABASE_URL`: present and protected;
- prior authenticated metadata records its scopes as Builds, Functions and Runtime and confirms a production-context value (`docs/PI_SUPABASE_PERMISSIONS_AUDIT.md:214-216`);
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL`: absent;
- only `netlify/functions/api.js` and `netlify/functions/report.js` are deployed Function sources;
- `netlify.toml` defines no scheduled or background Function;
- there is no browser Supabase domain in the CSP connect allowlist (`netlify.toml:27-32`);
- there are no Supabase browser-client imports under `apps/web`.

The protected production connection value is intentionally unreadable through the Netlify metadata interface. Independent evidence still establishes the target: the retained local connection identifies project `jsrvdryddojhkmjzotef`; the earlier controlled verification recorded the same PI project and Netlify URL (`docs/PI_SUPABASE_PERMISSIONS_AUDIT.md:250`); and the live opportunity counts exactly match this project's unique corpus.

### 3.3 Live production observations

At audit time:

```json
{
  "healthHttpStatus": 200,
  "runtime": "netlify",
  "databaseConfigured": true,
  "databaseProvider": "postgresql",
  "persistenceAvailable": true,
  "durableSessions": true
}
```

Authenticated opportunity GET:

```json
{
  "httpStatus": 200,
  "totalCandidates": 11316,
  "sourceRecords": 11321,
  "returnedRows": 1,
  "mutations": 0,
  "providerRequests": 0
}
```

### 3.4 Failure effect if Supabase is unavailable

The application would only be partially available:

- `/api/health` would continue returning an HTTP response but report `persistenceAvailable: false` after its `SELECT 1` fails (`src/workbench/api/router.js:66-69`).
- Discover Opportunities list, detail, metrics, export, review, address-resolution and opportunity-analysis bootstrap routes would fail with `DATABASE_UNAVAILABLE`/503.
- legacy `/api/properties`, `/api/deals`, acquisition-decision and PostgreSQL investment-report routes would fail.
- Firebase Authentication, the Firestore durable property workspace, supporting documents, Firestore scenario/report history, administration, Stripe records and Firebase-backed retained research do not require Supabase and should remain available.

Therefore the answer to “Would the current deployed application continue functioning?” is **not completely**. Core Firebase areas would continue, but a visible, actively shipped product area would be unavailable.

## 4. Source-code reference inventory

### Classification 1 — active production dependency

| File and lines | Finding |
| --- | --- |
| `.env.example:7-9` | Defines the server-only Supabase PostgreSQL Transaction Pooler `DATABASE_URL`. |
| `package.json:165-166` | Direct runtime dependencies on `pg` and `pg-connection-string`. |
| `src/persistence/db.js:1-18,28-60` | Active PostgreSQL pool, verified Supabase TLS, transactions and database-required boundary. |
| `src/persistence/supabase-ca.js:1-4` | Public Supabase Root 2021 CA used by the active TLS path. |
| `src/workbench/api/runtime.js:7,12-13` | Instantiates the database for local and Netlify runtimes. |
| `netlify/functions/api.js:1-5` | Creates the production API runtime with Netlify environment variables. |
| `netlify/functions/report.js:1-5` | Creates the report Function's runtime with the same database adapter, although current Firebase report endpoints are intercepted before legacy fallback. |
| `src/auth/netlify-auth.js:96,308` | Routes health and unhandled authenticated API requests to the PostgreSQL router. |
| `src/workbench/api/router.js:42-116,118-191` | Active PostgreSQL read/write endpoints for health, opportunities, properties, deals, decisions and reports. |
| `src/services/propertyPersistenceService.js:1` and repository calls | PostgreSQL property persistence. |
| `src/services/dealPersistenceService.js:1` and repository calls | PostgreSQL deal persistence. |
| `src/services/acquisitionDecisionService.js:1` and repository calls | PostgreSQL acquisition-decision history. |
| `src/services/evidenceSnapshotService.js:1`, `refreshEvidenceService.js:1`, `investmentReportService.js:1`, `opportunityService.js:2` | PostgreSQL-backed evidence, report-model and opportunity workflows. |
| `src/persistence/*Repository.js` | Active SQL repositories reached by the router and services; indirect use matters even without the word “Supabase.” |
| `apps/web/src/features/opportunities/Opportunities.jsx:2,14-16,24-29,36` | Shipped Discover Opportunities UI using the PostgreSQL API. |
| `apps/web/src/features/acquisition/InvestmentReport.jsx:5-6` | Shipped legacy acquisition report UI using PostgreSQL decision/report routes. |
| `netlify/database/migrations/001_persistent_intelligence.sql:9-214` | Base application tables. |
| `netlify/database/migrations/002_acquisition_decisions.sql:3-58` | Acquisition, encumbrance and condition tables. |
| `netlify/database/migrations/003_opportunity_discovery.sql:2-78` | Discovery source, record, candidate, signal and review tables. |
| `netlify/database/migrations/004_kern_assessor_opportunity_enrichment.sql:3-170` | Kern assessor data and immutable guards. |
| `netlify/database/migrations/005_candidate_address_resolutions.sql:3-77` | Canonical-address resolution history. |
| `netlify/database/migrations/006_opportunity_property_links.sql:3-69` | Opportunity-to-property linkage. |
| `netlify/database/migrations/007_backend_table_access_hardening.sql:8-33` | Active deny-by-default RLS hardening. |

### Classification 2 — active local development/operations dependency

| File and lines | Finding |
| --- | --- |
| `package.json:140,144-145` | Supabase persistence QA, migration and schema QA commands. |
| `scripts/db-migrate.js:2,44` | Migration runner and Supabase preflight artifact. |
| `scripts/qa-supabase-persistence.js:3,13,32` | Non-destructive persistence certification. |
| `scripts/qa-supabase-schema.js:3,8,57-58` | Read-only schema certification after obtaining a database adapter. |
| `scripts/qa-investment-postgres.js:3`, `qa-investment-preview.js:3`, `qa-persistence*.js`, `qa-acquisition-persistence.js`, `qa-decision-analysis-linkage.js` | Local/preview PostgreSQL QA consumers. |
| `scripts/sprint6_3/production-import.js:5,135` and related `sprint6_3*` scripts | Historical and repeatable import/certification tooling for the Kern corpus. Not an automatic job. |
| `docs/DATABASE_DEVELOPMENT_RUNBOOK.md:4-8`, `docs/DATABASE_SCHEMA.md:3-5`, `docs/SUPABASE_POSTGRES_RUNBOOK.md:1` | Current operator instructions for this database. |

The same local `.env` connection classifies as active development configuration because `createRuntime()` uses it whenever the local server is started with `DATABASE_URL`.

### Classification 3 — test-only dependency

| File and lines | Finding |
| --- | --- |
| `tests/supabase.test.js:5-37` | Adapter, error-redaction, TLS and dependency regression tests. |
| `tests/discovery-v1-5.test.js:77` | Asserts the browser implementation does not call Supabase directly. |
| `data/validation/sprint4-1-supabase-*.json` | Supabase schema/persistence/preflight certification evidence. |
| `data/validation/sprint5-*.json`, `sprint6-*.json`, `sprint6_3*.json` | Historical preview/production certification records containing PostgreSQL/Supabase accounting. |
| `config/protected-baselines/*.json` | Integrity manifests that name protected Supabase artifacts; not execution paths. |
| `scripts/protected-baseline-qa.js`, `scripts/protected-baselines-v3/verify.js`, `scripts/reconcile-protected-baselines.js` | Test-artifact integrity references only. |
| `scripts/durable-identity-pilot/*` | Isolated PostgreSQL test/certification tooling; production credentials are explicitly removed for local tests. |

### Classification 4 — legacy or unused

- `@supabase/supabase-js` is absent from `package.json` and `package-lock.json`.
- No application source uses `createClient` from Supabase. Other `createClient` matches are RentCast (`src/sources/rentcast/client.js`) and are unrelated.
- No active browser source contains `supabase`.
- `SUPABASE_URL`, anonymous key, service-role key and a Supabase-specific database alias are not configured in Netlify.
- PostgreSQL `documents`, `reports`, and `discovery_signals` currently contain zero rows. Their schemas and routes should not be removed merely from this observation; they remain migration-owned legacy capability.
- The many POC statements saying “Supabase calls: 0” are boundary documentation, not integrations.

### Classification 5 — documentation-only references

The following tracked documents contain Supabase references but do not themselves execute code. The first matching line is included for reproducibility:

```text
docs/ATTOM_API_CAPABILITY_POC.md:71
docs/ATTOM_API_Capability_POC_Codex.md:19
docs/ATTOM_BULK_FIVE_DATASET_POC.md:5
docs/DATABASE_DEVELOPMENT_RUNBOOK.md:4
docs/DATABASE_SCHEMA.md:5
docs/DATATREE_UAT_CAPABILITY_POC.md:92
docs/DATATREE_UAT_GAP_ANALYSIS.md:46
docs/HISTORICAL_BASELINE_RECONCILIATION.md:64
docs/NODE22_PUPPETEER25_FINAL_READINESS.md:14
docs/NODE22_PUPPETEER25_PREVIEW_CERTIFICATION.md:48
docs/PI_DURABLE_IDENTITY_POSTGRES_QA.md:83
docs/PI_DURABLE_IDENTITY_V3_CERTIFICATION.md:104
docs/PI_IDENTITY_PILOT_QA_RESULTS.md:71
docs/PI_MLS_R1_GATE1B_IDENTITY_READINESS.md:57
docs/PI_SPRINT6_2_BASELINE_DISCREPANCY_AUDIT.md:130
docs/PI_SUPABASE_PERMISSIONS_AUDIT.md:1
docs/PI_V1_5_2_WORKSPACE_CLEANUP_SMART_ADDRESS.md:20
docs/PI_V2_2_AUTHENTICATION_FOUNDATION.md:9
docs/PI_VERSIONED_BASELINE_RECONCILIATION_QA.md:164
docs/PropertyIntelligence_Sprint4_1_Supabase_Codex.md:2
docs/PropertyIntelligence_Sprint5_MAO_Codex.md:6
docs/PropertyIntelligence_Sprint6_2_Kern_Assessor_Crosswalk_POC_Codex.md:8
docs/PropertyIntelligence_Sprint6_3_2_Opportunity_Detail_UX_Fix_Codex.md:23
docs/PropertyIntelligence_Sprint6_3_Kern_Assessor_Minimal_Production_Enrichment_Codex.md:6
docs/PropertyIntelligence_Sprint6_Kern_Opportunity_Discovery_Codex.md:6
docs/SPRINT4_1_COMPLETION_REPORT.md:1
docs/SPRINT4_DEPLOYMENT_RUNBOOK.md:3
docs/SPRINT5_COMPLETION_REPORT.md:23
docs/SPRINT6_2_ATN_CROSSWALK_RESULTS.md:98
docs/SPRINT6_2_COMPLETION_REPORT.md:187
docs/SPRINT6_2_HIGH_PRIORITY_312.md:68
docs/SPRINT6_2_KERN_ASSESSOR_SOURCE_AUDIT.md:119
docs/SPRINT6_2_PRODUCTION_IMPORT_RECOMMENDATION.md:52
docs/SPRINT6_2_USE_CODE_ANALYSIS.md:179
docs/SPRINT6_3_1_COMPLETION_REPORT.md:25
docs/SPRINT6_3_1_QA.md:18
docs/SPRINT6_3_2_COMPLETION_REPORT.md:26
docs/SPRINT6_3_2_QA.md:30
docs/SPRINT6_3_3_COMPLETION_REPORT.md:128
docs/SPRINT6_3_3_QA.md:41
docs/SPRINT6_3_COMPLETION_REPORT.md:11
docs/SPRINT6_3_IMPORT_RUNBOOK.md:33
docs/SPRINT6_3_QA.md:7
docs/SPRINT6_3_SCHEMA.md:16
docs/SPRINT6_COMPLETION_REPORT.md:33
docs/SUPABASE_POSTGRES_RUNBOOK.md:1
```

### Classification 6 — unknown, requires management access

- Supabase Edge Function deployment inventory.
- Supabase dashboard integrations and webhooks not represented in PostgreSQL or this repository.
- Dashboard logs and usage charts beyond database statistics available to the PostgreSQL role.
- Current dashboard confirmation of the Data API toggle. The last documented owner confirmation says it remained disabled (`docs/PI_SUPABASE_PERMISSIONS_AUDIT.md:197`).

## 5. Supabase database inventory

Observed target:

- PostgreSQL `17.6`;
- database `postgres`;
- pooler region/hostname class: AWS `us-west-2` Supabase Transaction Pooler;
- database size: `86,625,427` bytes (about `82.6 MiB`);
- schemas: `auth`, `extensions`, `graphql`, `graphql_public`, `public`, `realtime`, `storage`, and `vault`;
- no public views;
- all 30 `public` tables have RLS enabled;
- no public RLS policies;
- `anon` and `authenticated` have no current public table grants;
- `service_role` retains grants on all 30 tables;
- Data API is therefore not the application access path. The application connects through the protected PostgreSQL owner/backend credential.

### 5.1 Public tables

“Most recent activity” below is the maximum value of an actual applicable timestamp column. `Unavailable` means the table does not provide an appropriate timestamp; no date was inferred from PostgreSQL catalog metadata.

| Table | Purpose | Rows | Most recent recorded activity | Assessment |
| --- | --- | ---: | --- | --- |
| `acquisition_decisions` | Deterministic acquisition decisions | 16 | 2026-09-20 | Historical/legacy route |
| `analysis_snapshots` | Immutable deal analysis revisions | 23 | 2026-09-20 | Historical/legacy route |
| `audit_events` | PostgreSQL workflow audit events | 86 | 2026-09-24 | Historical |
| `candidate_address_resolutions` | Analyst-confirmed canonical addresses | 1 | 2026-09-24 | Active opportunity support |
| `comparable_snapshots` | Comparable-set snapshot identities | 16 | 2026-09-24 | Historical |
| `comparables` | Individual retained comparable observations | 240 | 2026-09-24 | Historical and unique to this store |
| `deal_claims` | Deal assumptions/claims | 152 | 2026-09-20 | Historical/legacy route |
| `deals` | Saved PostgreSQL deal records | 15 | 2026-09-20 | Historical/legacy route |
| `diligence_items` | Due-diligence items by analysis | 483 | 2026-09-20 | Historical |
| `discovery_records` | Kern Power-to-Sell source rows | 11,321 | Unavailable; source imported 2026-09-19 | **Active unique production corpus** |
| `discovery_signals` | Older discovery signal model | 0 | Unavailable | Empty legacy schema |
| `discovery_sources` | Source provenance/import manifest | 1 | 2026-09-19 `imported_at` | **Active unique provenance** |
| `documents` | Legacy PostgreSQL document metadata | 0 | Unavailable | Empty; current documents use Firebase |
| `evidence_snapshots` | Immutable property evidence | 16 | 2026-09-24 | Historical and unique to this store |
| `idempotency_keys` | PostgreSQL mutation replay protection | 95 | 2026-09-24 | Operational history |
| `opportunity_assessor_enrichments` | Kern assessor crosswalk rows | 11,316 | No row timestamp; batch completed 2026-09-23 | **Active unique production corpus** |
| `opportunity_assessor_import_batches` | Assessor batch provenance and counts | 1 | 2026-09-23 | **Active unique provenance** |
| `opportunity_candidates` | Deduplicated opportunity candidates | 11,316 | 2026-09-19 | **Active production UI** |
| `opportunity_property_links` | Opportunity-to-PostgreSQL-property linkage | 1 | 2026-09-24 | Active workflow history |
| `opportunity_record_links` | Source-row-to-candidate links | 11,321 | 2026-09-19 | **Active production UI** |
| `opportunity_reviews` | Analyst review/status history | 19 | 2026-09-19 | Active workflow history |
| `opportunity_signals` | Three screening components per candidate | 33,963 | 2026-09-19 | **Active production UI** |
| `properties` | Legacy PostgreSQL saved properties | 3 | 2026-09-24 | Historical/legacy route; unique |
| `property_aliases` | Retained property identity aliases | 15 | 2026-09-24 | Historical/legacy route |
| `property_condition_assessments` | Condition assessment headers | 5 | 2026-09-19 | Historical |
| `property_condition_items` | Condition findings | 5 | 2026-09-19 | Historical |
| `property_encumbrances` | Encumbrance history | 32 | 2026-09-20 | Historical |
| `property_intelligence_schema_migrations` | Migration checksum ledger | 7 | Unavailable | Operational |
| `reports` | Legacy PostgreSQL report metadata | 0 | Unavailable | Empty; current report revisions use Firestore |
| `valuations` | Valuation snapshot records | 16 | 2026-09-24 | Historical |

Kern source provenance is explicit:

- source: `KERN_POWER_TO_SELL`, Kern County Power to Sell Listing;
- source edition/date: September 15, 2026;
- source records: 11,321;
- imported: September 19, 2026;
- assessor edition/date: `2026 Final`, June 26, 2026;
- assessor batch: 11,316 candidates, 11,263 exact, 53 unmatched;
- assessor batch completed: September 23, 2026.

### 5.2 Functions, triggers, policies and extensions

Public functions:

- `guard_candidate_address_resolution()`;
- `guard_opportunity_assessor_batch()`;
- `guard_opportunity_assessor_observation()`;
- `guard_opportunity_property_link()`.

Each is attached as an immutable-history trigger to its corresponding table for INSERT/UPDATE/DELETE. There are no public views and no public RLS policies. Installed extensions are `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, and `uuid-ossp`.

No `pg_cron` extension/schema was observed, so there are no database cron jobs in this inventory.

## 6. Authentication, Storage, Realtime and Edge Functions

### Authentication

`auth.users` contains **0 users**, with no identity, session, token or sign-in activity. Current application authentication is Firebase. No current PI user depends on Supabase Auth.

### Storage

`storage.buckets` contains **0 buckets** and `storage.objects` contains **0 objects**. Therefore there are no Supabase property photos, supporting documents, reports or legacy enhancement artifacts to preserve from Storage. Current private document storage is Firebase Cloud Storage.

### Realtime

`realtime.subscription` contains **0 subscriptions** and `realtime.messages` contains **0 messages**. No repository source creates a Supabase Realtime client.

### Edge Functions

No `supabase/functions` source exists in the repository and no application reference invokes a Supabase Edge Function. Deployment inventory remains **unknown** because Supabase Management API access is unavailable. There is no evidence of an active Edge Function dependency, but the dashboard should be checked before any future retirement decision.

### External integrations

The confirmed integration is Netlify Functions → Supabase Transaction Pooler via `DATABASE_URL`. The repository contains no Supabase auth callback, Storage webhook, Realtime subscription or Edge Function URL. Stripe's webhook is a Netlify API route and stores commercial state in Firestore; it is unrelated to Supabase.

## 7. Unique-data and migration assessment

Read-only comparison produced:

| Store | Relevant inventory |
| --- | --- |
| Firestore owner organization | 2 durable properties; 11 retained evidence snapshots; 51 retained sale observations |
| Firestore GNZ organization | 0 durable properties; 0 retained evidence snapshots |
| Supabase PostgreSQL | 3 properties; 15 deals; 16 evidence snapshots; 240 comparables; 11,316 opportunity candidates and related corpus |

Normalized-address hash comparison found:

- PostgreSQL properties matching Firestore durable properties: **0**;
- PostgreSQL properties without a Firestore match: **3**;
- Firestore durable properties without a PostgreSQL match: **2**.

This comparison does not claim similarly named fields are semantically identical. It establishes that the stores are not replicas and that retirement would discard or strand records not presently represented as Firestore durable properties.

The opportunity corpus has clear historical and commercial value: it powers a production navigation area and contains a provenance-bound Kern tax-sale/assessor research set. It is not represented by a Firestore opportunity collection. A backup is appropriate even if a future product decision removes the feature.

Migration would be required before retirement. At minimum it must preserve:

- all source/import provenance and hashes;
- 11,321 source records and candidate links;
- 11,316 candidate and assessor records;
- 33,963 signal rows and 19 review decisions;
- canonical address and property-link history;
- the server-side filtering, sorting, pagination and CSV behavior;
- immutable guards or an equivalent integrity model;
- any legacy property/deal/evidence history the owner elects to retain.

No migration was performed.

## 8. Available usage metrics and historical activity

The project was reactivated before this audit. PostgreSQL reported a server start at `2026-10-26T20:28:47Z`; `pg_stat_statements` statistics began at approximately the same time. At observation it reported:

- database size: about 82.6 MiB;
- 8 current database connections (including platform and audit connections);
- 4,123 committed and 155 rolled-back transactions since restart;
- 1,787 normalized statement calls in the available statistics window.

These numbers include Supabase platform activity and this audit. They do **not** establish end-user traffic volume. The table-level statements visible after reactivation were dominated by the audit's own fixed SELECTs. No application-table inserts, updates or deletes were recorded in `pg_stat_user_tables` after the restart at the time inspected.

Actual recorded historical application timestamps end primarily in September 2026, with the latest inspected PostgreSQL application timestamp on September 24, 2026. Historical certification explicitly recorded real nonzero Supabase production traffic on September 24 (`data/validation/sprint6_3-production-certification.json:13,37`).

The authenticated production GET during this audit is direct evidence of current read-path use/capability, but it is not evidence of routine customer frequency. Dashboard API request logs, Auth logs, Storage logs, Edge logs and longer connection history were unavailable because Management API access was absent. The available database window is too short to declare the project idle.

## 9. Estimated retention cost

The project currently fits Free-plan capacity: its approximately 82.6 MiB database is below the published 500 MB Free database allowance, with no Supabase Auth users or Storage objects.

Current official pricing states:

- Free: $0/month, but projects may pause after one week of low activity;
- Pro: from $25/month;
- the $25 Pro subscription includes $10/month of compute credits, enough for one default Micro project in the published example;
- Pro includes 8 GB database disk, 250 GB egress, daily backups retained seven days, seven-day logs and no inactivity pausing;
- overages, add-ons and taxes remain additional if incurred.

For this single, small project on default Micro compute, the expected base is approximately **$25/month or $300/year**, before tax or overages. There is no current evidence that usage would create material overage charges.

Official references:

- [Supabase pricing](https://supabase.com/pricing)
- [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)
- [Database backups](https://supabase.com/docs/guides/platform/backups)

The reason to pay is availability and recovery/log retention—not current storage capacity. If Discover Opportunities is not required to be continuously available during private development, the owner could remain on Free and accept pause/resume outages. That is not equivalent to production readiness.

## 10. Risks of project pausing

1. Discover Opportunities becomes unavailable until the owner resumes Supabase.
2. Existing authenticated users may see database errors while Firebase areas continue working, creating a confusing partial outage.
3. Opportunity review/address-resolution state cannot be read or changed.
4. Legacy PostgreSQL property/deal/decision history cannot be opened.
5. Health reports persistence unavailable; automated monitors may mark the application degraded.
6. A Free project with low traffic can pause again even though it is technically connected to production.
7. Relying on pause restoration is not a backup strategy. Supabase recommends regular logical exports for Free projects.

Pausing does not immediately delete the data, but it prevents requests while paused. Permanent retirement without backup would introduce a separate irreversible data-loss risk.

## 11. Recommendation

### Option A — Retain Supabase

Retain the project because there is a confirmed production dependency and unique data.

For the present architecture, upgrading to Pro is operationally justified if the private-production site must keep Discover Opportunities continuously available. The approximately $25/month base cost is modest relative to the outage risk and also adds daily backups and better log retention.

Do **not** select Option B or C yet:

- archive-and-retire is premature because production still reads the database;
- retire-without-migration would break a shipped feature and abandon unique records.

The recommendation can change only after a separately scoped migration or explicit removal of the PostgreSQL-backed product area, followed by production acceptance with `DATABASE_URL` absent.

## 12. Proposed next steps

No step below was executed.

1. **Immediate availability decision:** either upgrade the Supabase organization to Pro for a non-pausing production dependency, or formally accept that the private-development application may suffer repeat partial outages on Free.
2. **Create an off-platform logical backup before any retirement work.** Use a separately approved `supabase db dump`/`pg_dump` workflow that includes the application schema, migration ledger and required role/privilege metadata. Store it encrypted and test restore in isolation. Supabase Storage needs no object export because it is empty, but verify again at execution time.
3. **Complete the dashboard-only inventory:** with an authorized owner session, record Edge Functions, current Data API setting, integrations, usage charts, logs and backups. Do not paste an access token into chat.
4. **Decide the long-term data authority:** retain PostgreSQL as the opportunity/discovery store, or design a deliberate migration to Firestore/another PostgreSQL service. Do not treat current Firestore property records as a backup of the Supabase corpus.
5. **If migration is chosen:** build an isolated export/import and parity suite; prove row counts, provenance hashes, filtering, sorting, pagination, review state, address links and tenant authorization; switch the production routes; observe a defined rollback window; only then remove `DATABASE_URL` and consider pausing.
6. **Before permanent deletion:** retain the tested backup and audit evidence, verify no production traffic or code path uses Supabase, and obtain separate destructive-action approval.

## Final disposition

**Supabase is active, unique, and currently necessary. Another automatic pause would cause a real partial production outage. The project cannot safely be retired today. Retain it; use Pro if continuous availability is required, or complete and certify a migration before retirement.**

