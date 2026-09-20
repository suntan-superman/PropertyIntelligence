# Sprint 6 QA

Required checks:

- `npm run kern:audit`
- `npm run kern:import:dry-run`
- `npm run kern:screen:test`
- `npm test`
- `npm run db:preflight`, `npm run db:status`, `npm run db:schema:qa`
- `npm run kern:import` and `npm run kern:import:status`
- `node scripts/qa-kern-opportunity-persistence.js`
- `npm run web:build`, `npm run web:test`
- full Sprint 1–5 regression/security suite

Persistence QA proves source-record immutability, source-hash import replay, candidate/link/signal history, separate database connections, review idempotency, archive/restore, transaction rollback and zero provider calls. API/UI QA proves server pagination, filtering, candidate detail, safe CSV fields, explicit review/address resolution and no browser payload containing all source rows. Controlled enrichment is never automatic and automated QA makes zero RentCast calls.
