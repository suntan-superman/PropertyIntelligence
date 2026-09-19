# Property Intelligence — Sprint 4.1
## Supabase PostgreSQL Provider Migration & Production Persistence Certification

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**DB host:** Supabase PostgreSQL
**Production connection:** Supabase Transaction Pooler
**Driver:** `pg`
**Config:** server-only `DATABASE_URL`
**Schema authority:** existing `netlify/database/migrations/001_persistent_intelligence.sql`

## Mission
Sprint 4's PostgreSQL persistence design passed locally, but Netlify Database provisioning is unavailable on the Legacy Pro account. Change only provider/runtime plumbing:

`@netlify/database -> pg -> DATABASE_URL -> Supabase Transaction Pooler`

Preserve schema, repositories/services semantics, immutable snapshots, transactions, idempotency, UI, analytical engine and protected artifacts. Then certify persistence against real Supabase and deployed Netlify Functions.

Stan has already placed the complete Transaction Pooler URI in ignored `.env` as `DATABASE_URL`. Never print/request/commit it.

## Hard boundaries
Do not redesign schema; manually create tables in Supabase UI; use Supabase JS/Auth/Storage/Realtime; expose DB credentials to browser; add TypeScript/Drizzle/Prisma; change RentCast/Maps/analysis/Fantasia; add Monte Carlo/Kern/auth/doc uploads; truncate/reset remote Supabase; print DATABASE_URL/password; or run destructive remote reset.

## Preserve migration 001
Review `001_persistent_intelligence.sql` for standard PostgreSQL/Supabase compatibility before remote application. Confirm `gen_random_uuid()` and required PostgreSQL capabilities. Produce a compatibility note.

Do not rewrite migration just because provider changed. If a genuine provider compatibility change is required, STOP for review if semantics change; otherwise add a new migration rather than silently changing applied-history semantics.

## Dependencies
Add `pg`. Migrate all runtime imports away from `@netlify/database`; remove it only after certification. Keep Netlify CLI/deployment dependencies. Run `npm audit --omit=dev`.

## Provider-neutral DB adapter
Refactor `src/persistence/db.js` to expose conceptually:
`getPool()`, `query(text, params)`, `withTransaction(callback)`, `closePoolForTests()`.

Repositories remain provider-agnostic and use `$1` parameter placeholders. Never interpolate values. Do not use named prepared statements with Transaction Pooler.

Use `pg.Pool`, one reusable pool per warm server instance, conservative serverless max connections, reasonable connection/idle timeouts, safe missing-config failure. Document pool choices.

## SSL
Use TLS compatible with Supabase. Do not globally disable certificate verification or add insecure workarounds. Make local-vs-remote SSL environment-aware only where necessary.

## Environment
Production: Netlify server-side `DATABASE_URL`.
Local: ignored `.env`.
Browser: never exposed/VITE-prefixed.

Retain/add secret scans against browser bundle, function artifacts/logs/docs. Never print URI.

## Provider-neutral migration runner
Create safe runner such as `scripts/db-migrate.js`.

Commands:
```text
npm run db:preflight
npm run db:status
npm run db:migrate
```

Runner:
- discovers ordered SQL files in `netlify/database/migrations/`;
- owns ledger `property_intelligence_schema_migrations`;
- stores filename/checksum/applied_at;
- refuses checksum mismatch;
- transactionally applies pending migrations where permitted;
- stops on failure;
- never marks failed migration applied;
- has NO destructive remote reset.

Any local reset tool must refuse non-local hosts.

## Preflight
Report safe metadata only:
- reachable yes/no
- PostgreSQL version
- expected database name
- SSL active if safely detectable
- migration ledger yes/no
- pending count
- expected app tables present/missing

Never report host URI/password/connection string.

## Supabase migration gate
Before applying migration:
1. all offline/unit tests;
2. SQL compatibility inspection;
3. preflight;
4. status;
5. verify application tables are not unexpectedly present;
6. verify no destructive statement targets Supabase system schemas;
7. write sanitized pre-migration artifact;
8. only then `db:migrate`.

Do not paste migration manually into SQL Editor unless automated path is impossible and Stan explicitly authorizes fallback.

## Post-migration schema certification
Verify all expected tables, PK/FKs, indexes, ON DELETE RESTRICT, UUID defaults, timestamptz, JSONB, transactions, advisory transaction locks, migration checksum ledger.

Write `data/validation/sprint4-1-supabase-schema-certification.json` with no secrets.

## Remote QA safety
Never truncate Supabase. Certification records must use explicit QA tags/prefixes and known IDs. Cleanup may delete only exact QA records created by the certification tool when FK-safe; otherwise leave clearly tagged records rather than broad deletion.

## Supabase persistence certification
Against real Supabase certify:
- canonical property save/read across separate connections;
- alias preservation;
- all 15 retained comps;
- valuation/evidence snapshot;
- evidence snapshot #2 leaves #1 unchanged;
- deal/claims/diligence round trip;
- unknown vs explicit zero;
- acquisition/disposition timing;
- analysis #2 leaves #1 unchanged;
- historical evidence linkage;
- duplicate deal independent claims;
- soft archive/list behavior;
- intentional transaction failure rolls back;
- idempotent replay does not duplicate;
- parameterized injection-safe search.

Create sanitized certification artifact.

Automated persistence certification makes zero RentCast calls.

## Existing QA
Rerun:
```text
npm test
npm run sprint3.2:qa
npm run deal:cleanup:qa
npm audit --omit=dev
npm run db:preflight
npm run db:status
npm run persistence:supabase:qa
```

Protected hashes remain unchanged.

## Netlify runtime migration
Netlify Functions use `pg -> DATABASE_URL -> Supabase Transaction Pooler`.

Remove any runtime/configuration that triggers Netlify Database provisioning. `netlify.toml` must retain Vite build, functions and `/api/*` routing but not require Netlify Database.

Do not remove Sprint 4 historical reports.

## Netlify environment
After Supabase DB certification passes, Netlify site needs server-side `DATABASE_URL`.

Do not put it in `netlify.toml`, GitHub, Vite or docs.

If Codex cannot set the value without exposing it, STOP and instruct Stan to add `DATABASE_URL` in Netlify UI. Do not ask Stan to paste it into Codex output/logs.

## Health endpoint
Safely expose conceptually:
```json
{
  "ok": true,
  "runtime": "netlify",
  "rentcastConfigured": true,
  "databaseConfigured": true,
  "databaseProvider": "postgresql",
  "persistenceAvailable": true,
  "pdfAvailable": false
}
```
No Supabase hostname/project ref/user/port/URI/password.

DB failure sets persistence unavailable with sanitized error.

## Preview/deployment gate
After DB certification:
1. commit/build;
2. deploy Netlify preview if possible;
3. preview uses server-side DATABASE_URL;
4. health;
5. Saved Properties/Deals API;
6. confirm no Netlify Database provisioning call;
7. credential scan;
8. small QA-tagged persistence smoke.

Supabase Free may not provide isolated preview DB branches. If preview and production share Supabase DB, use only non-destructive tagged records and document this limitation.

No production deploy until preview/runtime checks pass and operator authorizes it.

## Production persistence smoke
After explicit authorization:
1. analyze/load one chosen property;
2. Save Property;
3. record durable property ID;
4. reload/new function invocation;
5. reopen Saved Property;
6. create/save Deal;
7. record deal/analysis IDs;
8. reload;
9. reopen Saved Deal;
10. confirm claims/economics/diligence;
11. create second analysis with harmless test change;
12. prove first unchanged;
13. provider refresh only if explicitly authorized; otherwise certify evidence history without a live provider refresh.

Do not waste RentCast quota.

## UI
Saved records show Saved + timestamp and survive reload. Unsaved sessions remain clearly nonpersistent. Evidence/Analysis History, Duplicate and Archive remain.

If Supabase unavailable, save must fail clearly; never silently fall back to per-instance memory while claiming Saved.

## Pool/serverless failure handling
Handle connection timeout/transient failure/pool exhaustion/rollback safely. No aggressive retries. Safe logging may include request ID, operation, duration, transaction outcome, SQLSTATE if safe, idempotency replay. Never log credentials/raw sensitive params.

## Remove dead Netlify DB code
After certification:
- remove `@netlify/database`;
- remove imports/provisioning assumptions;
- update docs;
- retain SQL migrations;
- provider-neutral migration runner owns application schema.

Document reason: Legacy Netlify Pro cannot provision Netlify Database; standard PostgreSQL schema moved to Supabase without changing domain model.

## Docs
Update/create:
- `docs/DATABASE_SCHEMA.md`
- `docs/DATABASE_DEVELOPMENT_RUNBOOK.md`
- `docs/SPRINT4_DEPLOYMENT_RUNBOOK.md`
- `docs/SUPABASE_POSTGRES_RUNBOOK.md`
- `docs/SPRINT4_1_COMPLETION_REPORT.md`

No credentials.

## Rollback
Before deployment document rollback. Favor stop writes + revert app deploy while preserving DB evidence. No destructive automatic down migration. Failed migration transaction rolls back.

## Tests
Add tests for pg adapter, missing URL, redaction, pool reuse, transaction commit/rollback, migration order/checksum/mismatch, no remote reset, Supabase-safe QA tagging, DB health sanitization, Netlify no provisioning, persistence across separate connections, snapshot immutability, idempotency, injection safety, and no browser DB secret.

All prior map/PDF/runtime/security/deal-cleanup/Fantasia/Bass/Joyce tests remain green.

## Execution order
1. Hash protected artifacts.
2. Audit Sprint 4 DB-specific code/config.
3. Add pg and adapter tests.
4. Implement provider-neutral pg adapter.
5. Implement migration runner/ledger/preflight.
6. SQL compatibility report.
7. Run full offline regressions.
8. Run Supabase preflight/status.
9. Apply migration 001 only after gates pass.
10. Certify remote schema.
11. Run non-destructive Supabase persistence QA.
12. Prove immutable evidence/analysis.
13. Remove `@netlify/database` and provisioning assumptions.
14. Rerun full regression/security/audit.
15. Update Netlify runtime/config.
16. If DATABASE_URL is not yet configured in Netlify, STOP for Stan to add it.
17. Deploy preview.
18. Preview health/persistence/security smoke.
19. STOP for operator authorization before production.
20. If explicitly authorized, production deploy and controlled persistence smoke.
21. Generate completion report.
22. STOP.

## Acceptance
GO only if:
- migration 001 applies to Supabase from clean app schema;
- migration checksum ledger works;
- no secrets leak;
- pg Transaction Pooler connection works;
- all Sprint 4 persistence semantics pass remotely;
- snapshots remain immutable;
- transactions/idempotency pass;
- all 15 comps persist;
- saved property/deal survive separate connections/runtime invocations;
- Netlify deploy no longer attempts Netlify Database provisioning;
- preview health/persistence works;
- all previous regressions pass;
- protected artifacts unchanged;
- zero RentCast calls in automated QA.

## Completion report
`docs/SPRINT4_1_COMPLETION_REPORT.md` must include provider migration files, migration compatibility, schema certification, remote QA, immutable snapshot proof, dependency/audit results, Netlify env status (name only), preview result, production result only if authorized, credential scans, protected artifact result, limitations, exact operator steps, recommendation, and STOP.

## Final principle
Change the database host, not the persistence model.

Property Intelligence must preserve:
> what we knew, what was claimed, and what the model calculated at that moment.

**Do not sacrifice historical evidence or analysis semantics merely to complete the provider migration.**
