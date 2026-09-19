# Sprint 4 deployment and migration runbook

The repository migration is the schema authority. Run `npm run db:migrate` against the explicitly selected Supabase database before deployment. Netlify deployment must not provision a Netlify Database. A migration failure must block deployment; do not start the app against a partially migrated schema.

## Preview gate (required)

1. Create or select an isolated Supabase database branch for the deploy preview. Confirm the preview branch URL and database branch are not production.
2. Deploy the branch with `npx netlify deploy --build --context deploy-preview` (or the approved CI equivalent). Set `DATABASE_URL` as a server-only Netlify variable; Netlify must not provision a database.
3. Verify the deploy log reports `001_persistent_intelligence` applied and the preview function health endpoint reports persistence configured. Exercise one explicitly selected sanitized fixture through Save Property, Save Deal, duplicate, refresh/re-analysis, history, and soft archive. Use no live RentCast call.
4. Run the preview smoke suite and record the branch URL, migration status, schema checks, idempotent retry result, immutable old snapshot digest, and rollback result. If any result is unavailable or fails, STOP. Do not run a production migration.

## Production gate

Production migration was not authorized by Sprint 4 implementation. After preview passes, obtain explicit operator approval and a rollback/backup plan. Netlify applies the same immutable migration from Git; never edit or delete `001_persistent_intelligence` after it has been applied. A later schema change must be a new backwards-compatible migration.

## Security

`DATABASE_URL` and `RENTCAST_API_KEY` are server-only. `GOOGLE_MAPS_BROWSER_KEY` remains a separate browser-restricted key. Do not print environment values, include connection strings in responses, or import persistence modules from React. This release has no authentication or tenant isolation and must remain internal.

## Scope stop

After the preview gate and Sprint 4 completion report, STOP. UI polish, Monte Carlo simulation, Kern ingestion, document binaries, report persistence, authentication, and Sprint 5 are outside this release.
