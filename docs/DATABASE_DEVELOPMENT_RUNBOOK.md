# Local database development runbook

1. Work only from the Property Intelligence root. Confirm the linked Netlify project with `npx netlify status`; Netlify database provisioning commands are not part of this runtime.
2. Install dependencies with `npm ci`. The repository is JavaScript-only and uses standard `pg`; no TypeScript, Drizzle, Prisma, or Supabase client is used.
3. Set `DATABASE_URL` only in the ignored local `.env` or the server environment. Never print, copy, commit, or expose its value. The browser receives no database configuration.
4. Inspect safely with `npm run db:preflight` and `npm run db:status`. Apply repository migrations only after the documented gates with `npm run db:migrate`; the runner uses the ordered SQL files and checksum ledger and has no reset/down command.
5. Run isolated, non-destructive persistence QA with `npm run persistence:supabase:qa`. It creates only explicitly tagged `SPRINT4_1_QA` records, never truncates or resets shared data, and proves rollback, idempotency, snapshot immutability, foreign keys, unknown/zero retention, archive, aliases, all retained comps, and parameterized search.
6. If a local database is needed, use an explicitly isolated PostgreSQL database/branch and the same `DATABASE_URL` workflow. Never point a destructive command at preview or production, and never use a reset command against shared Supabase data.

The Netlify Functions runtime injects `DATABASE_URL` server-side. The shared runtime creates a database boundary only when that server environment is configured; fixture and analytical regression tests remain database-free and make no RentCast calls. The API returns `DATABASE_NOT_CONFIGURED` rather than silently treating an unsaved session as durable.

Before any deployment, run `npm test`, `npm run web:build`, the existing Sprint 3.2/deal-cleanup suites, and `node scripts/qa-runtime-security.js`. Keep preview and production URLs in separate shells and stop at the preview gate if a branch or migration check is unavailable.
