# PI Supabase permissions audit

**Latest status: TARGETED RLS REMEDIATION APPLIED AND VERIFIED.** Migration 007 committed on October 13, 2026 at 4:38:46 PM America/Los_Angeles (PDT). All 30 public tables now enable RLS; anonymous/authenticated access to the 26 affected tables is denied; the other four tables and backend privileges are preserved. The Data API remains disabled per Stan's saved-setting confirmation. The sections below retain the original findings and intermediate verification limitations; the final execution results are recorded at the end.

## Finding and recommended decision

**Confirmed database permission exposure. Remediation proposed, not applied.**

On October 13, 2026 at 4:22 PM America/Los_Angeles (PDT), a read-only metadata audit found 26 PI tables with row-level security disabled and effective `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges for both `anon` and `authenticated`. Both roles have `USAGE` on `public`. The tables also grant those roles `TRUNCATE`, `REFERENCES`, `TRIGGER`, and `MAINTAIN`. Four newer PI tables already enable RLS and deny these API roles access.

These are confirmed database permissions, not a demonstrated Internet exploit or evidence that anyone accessed the data. Data API enablement and exposed schemas remain unverified: no relevant persisted PostgREST settings were returned from the inspected catalogs, and the audit session's corresponding settings were null. This does not mean the API is disabled. Confirm the Dashboard Data API setting and exposed schemas promptly. No application records, REST/GraphQL responses, or access logs were retrieved.

Recommended immediate correction after approval: enable RLS and revoke unintended API-role privileges on the exact 26 affected tables. Preserve the four already-protected tables, owner/service-role access, all existing records, constraints, triggers, migrations, and certified application code. Do not create permissive policies to silence warnings.

## Database inventory

All 30 objects are ordinary `public` tables owned by `postgres`. There are no RLS policies, public views/materialized views/foreign tables, public sequences, or explicit column ACL entries in the inspected inventory. `anon` and `authenticated` have neither login nor BYPASSRLS and have no role memberships that grant additional inherited access in this snapshot.

In the table below, **Full** means all eight observed table privileges listed above, for each of `anon` and `authenticated`. **None** means no audited table or column-level read/write privileges for either role.

| Table in public | RLS | API-role privileges | Proposed treatment |
| --- | --- | --- | --- |
| acquisition_decisions | Disabled | Full | Enable RLS; revoke API access |
| analysis_snapshots | Disabled | Full | Enable RLS; revoke API access |
| audit_events | Disabled | Full | Enable RLS; revoke API access |
| candidate_address_resolutions | Enabled | None | Preserve unchanged |
| comparable_snapshots | Disabled | Full | Enable RLS; revoke API access |
| comparables | Disabled | Full | Enable RLS; revoke API access |
| deal_claims | Disabled | Full | Enable RLS; revoke API access |
| deals | Disabled | Full | Enable RLS; revoke API access |
| diligence_items | Disabled | Full | Enable RLS; revoke API access |
| discovery_records | Disabled | Full | Enable RLS; revoke API access |
| discovery_signals | Disabled | Full | Enable RLS; revoke API access |
| discovery_sources | Disabled | Full | Enable RLS; revoke API access |
| documents | Disabled | Full | Enable RLS; revoke API access |
| evidence_snapshots | Disabled | Full | Enable RLS; revoke API access |
| idempotency_keys | Disabled | Full | Enable RLS; revoke API access |
| opportunity_assessor_enrichments | Enabled | None | Preserve unchanged |
| opportunity_assessor_import_batches | Enabled | None | Preserve unchanged |
| opportunity_candidates | Disabled | Full | Enable RLS; revoke API access |
| opportunity_property_links | Enabled | None | Preserve unchanged |
| opportunity_record_links | Disabled | Full | Enable RLS; revoke API access |
| opportunity_reviews | Disabled | Full | Enable RLS; revoke API access |
| opportunity_signals | Disabled | Full | Enable RLS; revoke API access |
| properties | Disabled | Full | Enable RLS; revoke API access |
| property_aliases | Disabled | Full | Enable RLS; revoke API access |
| property_condition_assessments | Disabled | Full | Enable RLS; revoke API access |
| property_condition_items | Disabled | Full | Enable RLS; revoke API access |
| property_encumbrances | Disabled | Full | Enable RLS; revoke API access |
| property_intelligence_schema_migrations | Disabled | Full | Enable RLS; revoke API access |
| reports | Disabled | Full | Enable RLS; revoke API access |
| valuations | Disabled | Full | Enable RLS; revoke API access |

Table ACLs explicitly grant access to `anon` and `authenticated`; there are no table ACL entries for the pseudo-role `PUBLIC`. Revoking `PUBLIC` as well as those named roles in the proposed correction provides a clear deny-by-default boundary. `service_role` retains its existing permissions on all 30 tables.

## Backend compatibility

The inspected local connection targets the Supabase project identified in the alert. Its current and session role is `postgres`, which owns all 30 tables and has BYPASSRLS. It is **not** a permanently read-only role; the audit was constrained by an explicitly verified read-only transaction.

The production code path in `netlify/functions/api.js` calls `src/workbench/api/runtime.js`, which uses server-side `DATABASE_URL` through `src/persistence/db.js` and `pg`. The inspected frontend/backend source and package manifest contained no Supabase client-library or REST/GraphQL Data API references. Migrations 004–006 already implement the internal-server-only RLS/revocation pattern for the four newer tables.

The proposed table controls preserve the observed `postgres` owner's access and the existing `service_role` privileges. The deployed Netlify `DATABASE_URL` role was not independently inspected, so production compatibility is conditional on confirming it uses an authorized backend role. Do not change backend credentials, add BYPASSRLS to another role, or weaken RLS as part of this proposal. Backend authorization still matters because privileged server roles bypass RLS.

## Exact table remediation proposal

**Review only. Nothing below has been executed.** Apply through a newly authorized forward-only migration, not by editing migrations 001–006 or replacing their ledger hashes. The migration runner's existing transaction convention should be retained. The final `ROLLBACK` below makes this a review draft, not a committed migration.

Before execution, refresh the metadata snapshot and fail closed if a target is missing, has a different owner/type, has new policies/column grants, or no longer matches the audited state. Confirm that no legitimate consumer requires anonymous or authenticated direct Data API access to these PI tables, and confirm the deployed backend role. Do not silently broaden this list when new tables appear.

```sql
-- PROPOSAL ONLY: not executed; separate authorization required.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.acquisition_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparable_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diligence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_record_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_condition_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_condition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_encumbrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_intelligence_schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.acquisition_decisions,
  public.analysis_snapshots,
  public.audit_events,
  public.comparable_snapshots,
  public.comparables,
  public.deal_claims,
  public.deals,
  public.diligence_items,
  public.discovery_records,
  public.discovery_signals,
  public.discovery_sources,
  public.documents,
  public.evidence_snapshots,
  public.idempotency_keys,
  public.opportunity_candidates,
  public.opportunity_record_links,
  public.opportunity_reviews,
  public.opportunity_signals,
  public.properties,
  public.property_aliases,
  public.property_condition_assessments,
  public.property_condition_items,
  public.property_encumbrances,
  public.property_intelligence_schema_migrations,
  public.reports,
  public.valuations
FROM PUBLIC, anon, authenticated;

-- Deliberate draft boundary. No committed change is authorized.
ROLLBACK;
```

RLS with no policies denies ordinary row access; owners and BYPASSRLS roles are exceptions. RLS does not protect whole-table operations such as TRUNCATE, so privilege revocation is necessary in addition to RLS. This is not a proposal for FORCE RLS or new row policies. [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## Preventing recurrence and related findings

Both `postgres` and `supabase_admin` currently have public-schema defaults granting broad table, sequence, and function privileges to API roles. Thus creating another table without explicit hardening can recreate this issue. After confirming that this project's future public objects are backend-only, approve separately scoped default-privilege changes, beginning with the observed migration creator:

```sql
-- Separate future-object proposal only; not executed.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
```

Equivalent public-schema TABLES/SEQUENCES changes for `supabase_admin` require an authorized role able to modify that role's defaults; the audit did not establish that capability. Do not attempt to obtain that privilege or silently omit this residual risk. Until resolved, every future migration/dashboard-created object must explicitly enforce its intended permissions. Default privileges affect future objects, not the existing 26 tables. [PostgreSQL default privileges](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)

There are four public functions: `guard_candidate_address_resolution()`, `guard_opportunity_assessor_batch()`, `guard_opportunity_assessor_observation()`, and `guard_opportunity_property_link()`. All return `trigger`, are SECURITY INVOKER, and have no function-local search_path setting. API roles have EXECUTE privilege, but trigger functions are not ordinary callable data-returning RPC endpoints. No public SECURITY DEFINER function was found. Review function EXECUTE defaults and search_path hardening separately without rewriting the certified guards. Revoking function EXECUTE only from named roles can leave access through PostgreSQL's global PUBLIC function default; do not claim that a schema-only default revoke resolves that global default. [PostgreSQL default privileges](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)

If no application on this project uses Supabase's Data API, disabling the unused Data API is an additional containment option. Confirm consumers before changing that setting. Database grants and RLS are separate layers, and the dashboard toggle is not verified by this SQL session. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)

## Verification required after an approved correction

1. Re-audit metadata: all exact 26 tables have RLS enabled; `anon`/`authenticated` have no table or column privileges; no permissive policy was added. The other four tables and owner/service-role privileges remain unchanged.
2. Confirm denial using catalog privilege checks and, if authorized, API tests returning no property data. Do not test production writes or deletes to prove denial.
3. Verify legitimate backend access using the actual deployed role. Use offline or isolated synthetic regression tests for write paths; production write probes require separate approval.
4. Refresh Supabase Security Advisor. RLS-enabled/no-policy information may be expected for backend-only tables; do not add a broad policy to remove that message.
5. Review available API/database access logs for suspicious activity over the exposure window. No such log review was performed here, and no breach conclusion is warranted. Avoid reversing containment automatically if an application compatibility issue appears.

## Audit safeguards and evidence

Only fixed metadata SELECT statements ran. No application table contents were read. The connection used the existing project credential in memory with certificate-verified TLS; no connection URI, password, API key, private property data, or provider response is in the report.

The initial attempt stopped at its initial guard and rolled back before inspecting permissions. A second manually initiated audit confirmed that `BEGIN ... READ ONLY` worked, but the requested startup defaults had not taken effect: transaction read-only was on, default transaction read-only was off, and statement timeout was 2 minutes. This is consistent with the documented transaction-pooler architecture. It is not evidence that a dedicated read-only role exists.

The completed audit first verified the read-only transaction, then applied transaction-local read-only defaults and timeouts, verified them, read the metadata, reverified read-only/repeatable-read with no assigned write transaction ID, and rolled back. All transaction-local settings reverted. No role/database settings were changed. Read-only transaction semantics prevent persistent DML/DDL; the audit additionally used fixed catalog queries and no write probes. [PostgreSQL transaction access modes](https://www.postgresql.org/docs/current/sql-set-transaction.html)

| Measure | Result |
| --- | --- |
| Explicit database connections | 2, sequential; first stopped before metadata inventory |
| SQL SELECT statements | 16 total: 1 initial stopped guard + 15 completed-audit statements |
| Transaction controls | 2 read-only BEGIN statements; 2 ROLLBACK statements |
| Transaction-local safety settings | 4; all rolled back |
| Application rows read | 0 |
| Persistent database writes or migrations | 0 |
| Provider API calls | 0 |
| Application/configuration changes | 0 |
| Preserved source/configuration files | 379; before/after SHA-256 maps identical |
| SQL remediation execution tests | Not run; proposal only |

Private, gitignored evidence directory: `data/runtime/supabase-permissions-audit-2026-10-13/`.

- `metadata.json`: original stopped attempt, preserved. SHA-256 `eff2a9de307098d86c8defc4b4bf068af3fd3679dd80992dc76ad24d9189c1a6`.
- `metadata-transaction-local.json`: completed audit, including query fingerprints, permission metadata, timestamps, and source-preservation maps. SHA-256 `d8e2a579538d0c3831a8f71ff68afb3d753232b2877ac6ae7d36e7e3a8463708`.
- `audit.mjs` and `audit-transaction-local.mjs`: retained diagnostic scripts, not production code or automatic deployment inputs. Result files use exclusive creation rather than overwriting previous evidence.

Historical manifests, analyst decisions, identity/financial engines, and existing local modifications were not edited. No remediation, API configuration change, deployment, or production mutation is authorized by this audit. Stop for Stan/ChatGPT review.

## October 13 containment and Netlify follow up

### Data API containment

Stan supplied dashboard screenshots showing the Data API enabled, 26 of 30 tables exposed, four functions exposed, and automatic exposure of new tables enabled. A subsequent screenshot showed the Data API toggle off; Stan then confirmed, "Stays saved." This is operator-provided confirmation of saved containment, not an independent HTTP test. The exposed-schema selector was collapsed, so its two schema names were not independently identified from the screenshot. The extra search path is not equivalent to the exposed-schema list.

Automatic exposure of new tables has not separately been confirmed disabled. Neither disabling the API nor this follow-up changes the database grants or RLS findings above. Containment should remain in place pending remediation and compatibility review.

### Netlify inspection result

**MANUAL VERIFICATION REQUIRED: exact production database role and target.**

The existing local Netlify login successfully completed three authenticated GET requests on October 13, 2026, 4:29:57–4:29:58 PM America/Los_Angeles (PDT). Only the linked PI site, its published deploy, and the single site-level `DATABASE_URL` variable were requested. No new login, CLI installation, token creation, environment modification, deploy, function invocation, or database connection occurred.

| Check | Verified result |
| --- | --- |
| Linked site | `worksidepropertyintelligence`; local and remote site identities agree |
| Published deploy | `6ac51dbc8eb66300088c37a5`; ready; production context; main branch |
| Published deploy created | `2026-10-06T16:11:40.544Z` |
| Published deploy published | `2026-10-06T16:12:01.114Z` |
| Published commit reference | `bee48980228fb6c5965b10cf7ea46a00125da30e` |
| Site variable | `DATABASE_URL` exists with a production-context value |
| Scopes | Builds, Functions, Runtime |
| Secret protection | `is_secret=true`; production connection value not readable |
| Variable last updated | `2026-09-19T02:16:58Z`, before the published deploy |
| Legacy build-settings DATABASE_URL | Absent |
| Production database username | Unverified; do not substitute the local `postgres` role |
| Production target matches audited database | Unverified; connection value is unavailable |
| Historical evidence and inspected configuration preservation | PASS during inspection |

Netlify intentionally restricts secret values outside its runtime; the authenticated API returned metadata, not a readable production connection string. Do not unmark the variable as secret, retrieve another context as if it proved production, or add a public diagnostic endpoint to bypass that protection. [Netlify environment-variable API](https://open-api.netlify.com/#tag/Environment-variables/operation/getEnvVar)

The variable's timestamp predates the published deployment, but that alone does not prove its exact deployed value or rule out deploy-specific overrides. Function environment values are applied at deployment time; no redeploy was performed. [Netlify function environment variables](https://docs.netlify.com/build/functions/environment-variables/)

### Narrowest remaining verification

Use the original securely retained connection record that was supplied to Netlify, or the deployment setup record, to confirm **only the database username/role and whether its project is the same PI Supabase project**. Do not paste the full connection string, password, or any API key into chat or the report. A pooled username of `postgres.<project-reference>` corresponds to database role `postgres`; the actual production username must be established rather than inferred from the local value. Record operator-provided confirmation as such, not as independent runtime evidence.

If the original production record cannot be established, a separately authorized protected runtime metadata check would be needed for independent verification. It should use the deployed connection in a verified read-only transaction, return only role/target-match metadata, and never expose credentials or property records. Implementing or deploying such a check is outside this assignment and was not attempted.

After the role/target and legitimate API-consumer requirements are resolved, request explicit approval for the exact 26-table forward-only RLS/privilege correction. The existing proposal is unchanged. Default-privilege hardening, including the `supabase_admin` limitation, remains a separately reviewed recurrence-prevention step.

### Follow up evidence and safety

- Private result: `data/runtime/supabase-permissions-audit-2026-10-13/netlify-role-check.json`, SHA-256 `f2b5055d882c35443eae7f4a5f8628804b38a6312917a010c04aa7845128f3a0`.
- Diagnostic script: `netlify-role-check.mjs` in the same private directory, SHA-256 `f4cec4cb199278bed44af0b29ddd079300bfcbb7626765dc949358181b92d47a`.
- Exact original report archived privately as `permissions-audit-before-netlify-check.md`, SHA-256 `83b774d9bb99ab8e99c721282dd4a322525eed2741ce7e716f04af152d710889`. The two original database audit JSON files and their hashes are unchanged.
- Netlify requests: 3 GETs, all HTTP 200. Mutating API requests: 0. Automatic retries: 0.
- Database connections/writes, provider acquisition calls, deployments, and configuration changes during this follow-up: 0.
- Only allowlisted metadata was saved. Netlify credentials remained in memory; no token, production connection value, password, full raw API response, or account contact information was printed or retained.

Stopped for Stan/ChatGPT review. The database remediation remains unapplied.

## Authorized remediation completed

### Authorization and scope

After the local connection record was identified and its `postgres` role and PI project target were checked, Stan explicitly replied: **"URL confirmed and you may proceed"** to the request confirming the same Netlify URL and authorizing the exact 26-table correction. This is operator confirmation of the deployed connection; no independent disclosure of Netlify's protected production secret was obtained or attempted. The execution itself independently verified the database role `postgres`, database `postgres`, expected PI Supabase endpoint, and certificate-verified TLS.

The change is the additive, forward-only migration `netlify/database/migrations/007_backend_table_access_hardening.sql`, SHA-256 `b64c0fd236714c406765c974a605ffc9590b934b45bab36e2901d305f761d39d`. Preserve these exact bytes, including line endings, for the existing checksum-ledger convention. Migrations 001–006 and their ledger checksums remain unchanged.

The migration enables RLS on exactly the 26 tables listed in the original proposal and revokes all table privileges on those tables from PUBLIC, anon, and authenticated. It adds no row policies, does not FORCE RLS, and does not alter role attributes, default privileges, function definitions, the four already-protected tables, or application code. One checksum-ledger row was appended for migration 007; no property data was inserted, updated, or deleted.

### Preflight and atomic execution

A fresh verified read-only audit matched every previously captured permission/role/function/default-privilege metadata entry, and all six historical migration hashes matched the live ledger. An initial diagnostic script stopped because its newly written filename filter was incorrectly escaped, not because of a live repository discrepancy. The original stopped result was retained; a separate corrected diagnostic completed the full comparison successfully before any write.

The scoped application harness used the existing `createDatabase` adapter and `withTransaction` rollback/commit behavior on one TLS-verified pinned client. It followed the existing filename/checksum/applied_at ledger convention rather than invoking historical QA commands that write their old artifact paths. It refuses any migration membership other than the six verified originals plus 007, verifies the exact SQL hash, and requires the passing offline QA proof. It cannot apply additional pending migrations.

The transaction acquired locks only on the 26 approved tables, with a two-second lock timeout and bounded statements. Before executing the migration, it rechecked the complete live metadata and six-row historical ledger. After executing the SQL and before committing, it compared the result against a mechanically constructed expected state allowing only the 26 RLS flags and targeted ACL removals to change. It also verified unchanged structural fingerprints and original source hashes, then appended and checked the single new ledger entry. Any failed assertion would throw through the existing transaction helper and roll back. The commit was acknowledged at `2026-10-13T23:38:46.952Z`.

### Verification results

| Check | Result |
| --- | --- |
| Existing complete root test selection | 290/290 PASS across all 16 test files |
| Additional scope and preservation checks | 11/11 PASS |
| Total offline QA | **301/301 PASS; 0 skipped, failed, cancelled, or todo** |
| Offline networking | Blocked by the existing offline preloader |
| Current public tables with RLS enabled | **30/30** |
| Current public tables with RLS disabled | **0** |
| Changed tables | Exactly 26 |
| Previously protected tables | Four; metadata and privileges unchanged |
| Anonymous SELECT permission probes | 26/26 denied with SQLSTATE 42501 |
| Authenticated SELECT permission probes | 26/26 denied with SQLSTATE 42501 |
| postgres backend SELECT permission probes | 26/26 allowed, zero rows requested/returned |
| Other API table/column privileges | Denied by effective-privilege checks on the affected tables |
| postgres and service_role privileges | Unchanged |
| Historical migration ledger | All six original rows unchanged; one new 007 row |
| Original local source/configuration files | 379/379 hashes unchanged |
| Application/property records read or changed | 0 |
| Provider acquisition calls and deployments | 0 |

Post-commit verification used a new read-only transaction. Each permission probe was `SELECT 1 ... LIMIT 0`; no property records were returned or scanned for their values. Expected permission errors were contained with savepoints. No live INSERT/UPDATE/DELETE probe was attempted. The metadata comparison covered all captured ACL entries, including TRUNCATE and MAINTAIN; denial was not inferred solely from RLS. The postcheck ended with `transaction_read_only=on`, `current_user=postgres`, and no assigned write transaction ID, then rolled back its temporary role/settings changes.

Structural fingerprints matched before the migration, before commit, and after commit:

| Catalog structure | Entries preserved |
| --- | ---: |
| Columns and defaults | 381 |
| Constraints | 161 |
| Indexes | 78 |
| Triggers including internal constraint triggers | 184 |
| Public function definitions | 4 |

No Netlify environment setting or deploy was changed. The backend probes establish PostgreSQL access for the confirmed role; they are not a full deployed-application or production write-path smoke test. Existing offline regression tests passed, and application code remained unchanged.

### Preserved execution evidence

All detailed evidence is private and gitignored under `data/runtime/supabase-permissions-audit-2026-10-13/`.

- Successful refreshed preflight: `remediation-preflight-verified.json`, SHA-256 `b1403c433f418fe07f2817a425030be801558c8fdc68d407803bcd66b62ad5ca`.
- Offline QA: `remediation-offline-qa.json`, SHA-256 `f6f46022a8a8eb3927ac733494e404a60a9caff1f01b853e6975ba29df09397e`; complete TAP output retained alongside it.
- Committed result and postchecks: `remediation-execution.json`, SHA-256 `095a0a2200090dcec5062e4cd46a8b1f17c69a3374df100221c1dc55a65eade8`.
- Exact prior report archived as `permissions-audit-before-remediation.md`, SHA-256 `76460d4aaf5ecdd1ab9abd9b06ecf62ff5d597cea5c1d28fbc8598df87d90684`.
- All earlier audit results, stopped diagnostic evidence, Netlify inspection receipts, and original report archives remain intact. No historical protected-baseline hashes were changed.

### Remaining follow up

Refresh Supabase Security Advisor: the 26 **RLS Disabled in Public** findings should clear, although the dashboard itself was not refreshed by this execution. RLS-enabled/no-policy informational findings can be expected for these backend-only tables; do not add allow-everyone policies to silence them.

Keep the Data API disabled unless a separately reviewed consumer requires it. Automatic exposure of new tables and the measured postgres/supabase_admin default grants were **not changed** under this narrow authorization. They remain a recurrence risk if new public tables are created without explicit hardening, particularly if the Data API is later re-enabled. Turning off automatic exposure and verifying the resulting creator-specific defaults remains separate follow-up work.

Function search_path/EXECUTE hardening and review of historical access logs also remain separate. This successful configuration repair is not evidence that earlier unauthorized access did or did not occur. Stopped after the approved remediation and verification; no deployment, broader hardening, or application changes were performed.
