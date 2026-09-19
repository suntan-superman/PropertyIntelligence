# Property Intelligence Sprint 4 database schema

The schema is owned by Git under `netlify/database/migrations/`. The initial migration is `001_persistent_intelligence.sql`; the provider-neutral migration runner applies it to the configured PostgreSQL database and records applied migrations in the repository-owned ledger. Never edit an applied migration. Add a new compensating migration for future changes.

The database is Supabase PostgreSQL reached through the server-only `DATABASE_URL` Transaction Pooler connection string. Server modules use the standard `pg` pool with parameterized `$1`, `$2`, … queries. React and the browser bundle never import persistence or receive `DATABASE_URL`. Netlify is only the deployment/runtime host; it does not provision or migrate a Netlify Database for this application.

Core relational records are `properties`, `property_aliases`, `evidence_snapshots`, `valuations`, `comparable_snapshots`, `comparables`, `deals`, `deal_claims`, `analysis_snapshots`, and `diligence_items`. `discovery_signals`, `documents`, and `reports` are metadata-only groundwork tables; Sprint 4 does not ingest Kern, upload binary documents, or persist report binaries. `idempotency_keys` stores bounded retry results and `audit_events` is append-only historical audit.

All primary keys are database-generated UUIDs and timestamps are `timestamptz`. Foreign keys use `ON DELETE RESTRICT` so ordinary application actions cannot destroy evidence or history. Properties and deals have nullable `archived_at` for soft archive. Evidence, comparable, and analysis rows are inserted and read; the application exposes no substantive update operation for those snapshots. Claims retain nullable values, allowing an explicit numeric zero to remain distinct from unknown/null.

Indexes cover address lookup, state/county, jurisdiction-context APN, evidence retrieval, valuation effective date, comparable history, deal status, analysis history, discovery source/date, diligence status, and audit aggregate history. JSONB stores provider payloads and variable analytical output only; query-critical identity, status, dates, and numeric summary fields are relational.

This is an internal analyst POC without authentication or ownership isolation. It is not suitable for public multi-user production until an explicit authentication/authorization design is approved.
