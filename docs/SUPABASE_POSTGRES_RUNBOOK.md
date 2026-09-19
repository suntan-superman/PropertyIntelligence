# Supabase PostgreSQL runtime runbook

This application uses standard `pg` against the Supabase Transaction Pooler. The only database credential is the server-side `DATABASE_URL`; its value must never be printed, logged, committed, copied into an artifact, or sent to the browser. `RENTCAST_API_KEY` is also server-only, while the Google Maps browser key remains a separate browser-restricted credential.

## Repository authority

`netlify/database/migrations/001_persistent_intelligence.sql` remains the immutable schema authority. Do not edit an applied migration, use the Supabase SQL editor to redesign the schema, or add a destructive reset/down migration. `scripts/db-migrate.js` applies ordered files transactionally and records filename, checksum, and applied time in `property_intelligence_schema_migrations`. A checksum mismatch is a hard stop.

## Safe local sequence

From the repository root:

```text
npm ci
npm test
npm run db:preflight
npm run db:status
npm run db:migrate
npm run persistence:supabase:qa
```

Run preflight and status before every migration decision. Preflight reports only safe metadata (provider, PostgreSQL version, database name, SSL detection, ledger/table state, and pending count). It never reports a host, URI, password, or connection-string fragment. QA creates explicitly tagged `SPRINT4_1_QA` records and never truncates, resets, or deletes shared data.

The adapter uses one reusable `pg.Pool` per warm runtime, a conservative pool size, bounded connection/idle timeouts, parameterized SQL, and verified TLS for non-local hosts. For Supabase pooler hosts it adds the documented public Supabase Root 2021 CA to Node's normal roots and keeps `rejectUnauthorized: true`; an optional server-only `DATABASE_CA_CERT` can supply a newer/project CA without changing code. It does not use named prepared statements. `closePoolForTests()` exists only for test cleanup. It never uses `NODE_TLS_REJECT_UNAUTHORIZED=0` or `rejectUnauthorized: false` for remote databases.

Supabase documents the Transaction Pooler on port 6543 for serverless workloads and recommends PostgreSQL `verify-full`, which verifies both the CA and hostname. The bundled public CA is pinned by SHA-256 in `src/persistence/supabase-ca.js`; refresh it only from the Supabase Database SSL settings/download and update that fingerprint deliberately.

## Netlify preview gate

Configure `DATABASE_URL` as a server-only variable on the linked Netlify project, then deploy a non-production preview. Confirm the deploy does not call Netlify Database provisioning, the health response reports `databaseProvider: "postgresql"` without connection details, and tagged persistence smoke tests pass. If the preview shares a Supabase database with another environment, use only tagged non-destructive records and document that fact. A failed or unavailable branch, migration, health check, or persistence test is a STOP.

Production migration or deployment requires an explicit operator authorization after the preview gate. Rollback means stopping writes and reverting the application; there is no destructive down migration.
