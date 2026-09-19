# Property Intelligence — Sprint 4 completion report

**Date:** 2026-09-19  
**Status:** `NO_GO_PREVIEW_DATABASE_UNAVAILABLE`  
**Scope:** Persistent Property & Deal Intelligence only. No UI polish, Monte Carlo simulation, Kern ingestion, authentication, document/report binary storage, new provider, or Sprint 5 work was started.

## Implementation

- Installed server-only `@netlify/database@1.1.0` (Node 20-compatible) and used its PostgreSQL pool through direct parameterized SQL. No TypeScript or Drizzle was added.
- Added repository-owned migration `netlify/database/migrations/001_persistent_intelligence.sql`. It creates UUID/timestamptz tables for canonical properties, aliases, immutable evidence/valuation/comp snapshots, deals/claims, immutable deterministic analysis snapshots, diligence, discovery/document/report groundwork, idempotency keys, and append-only audit events.
- Added indexes for address/jurisdiction, evidence and valuation history, comps, deals, analyses, diligence, discovery, and audit lookup. Foreign keys use `ON DELETE RESTRICT`; archive uses nullable `archived_at`.
- Added server-only database boundary `src/persistence/db.js`, repositories under `src/persistence/`, and transactional services under `src/services/`. Every repository query uses `$1`-style parameters. React does not import database code or receive credentials.
- Added shared API routes for saved properties/deals, open/history, refresh, analysis history, duplicate, archive, and idempotent save/re-analysis. Existing fixture/provider routes remain shared runtime-neutral routes.
- Added Save Property/Save Deal controls, Saved Properties/Deals navigation, durable-save status, and unsaved-session messaging while retaining the existing workbench components and analytical engine.
- Added `docs/DATABASE_SCHEMA.md`, `docs/DATABASE_DEVELOPMENT_RUNBOOK.md`, and `docs/SPRINT4_DEPLOYMENT_RUNBOOK.md`.

## Local isolated database gate

The local Netlify Postgres branch was reset and rebuilt from empty with:

```text
npx netlify database reset --json
npx netlify database migrations apply
```

Migration application passed (`001_persistent_intelligence`). Persistence QA passed using an explicit localhost branch URL; it truncated only the named local test tables and never contacted RentCast. Latest records are in:

- `data/validation/sprint4-persistence-qa.json` — property `e8bd8f5b-98de-4690-854f-59cb02602701`, deal `8a15215c-76a1-441a-86a4-e8a99bc65080`, duplicate `bf5a8f9f-3b73-4e06-aec5-d89b7427e0ca`.
- `data/validation/sprint4-persistence-api-qa.json` — API property `180313dc-d081-4cdd-b03a-32ddadab64bd`, deal `100179b6-b343-4312-b755-82456b8380e3`.

Passed local checks: empty migration rebuild, property save/read, alias preservation, all 15 retained comps, valuation history, immutable refresh (two snapshots; first row byte/field unchanged), deal save/read, unknown versus explicit zero, acquisition/disposition timing fields, analysis history (two snapshots; first unchanged), diligence persistence, independent duplicate claims, soft archive/unarchive, transaction rollback, FK rejection, idempotent retries, and parameterized injection-safe search.

## Regression and security QA

- `npm test`: **83/83 passed** (including migration/input adapter tests).
- `npm run persistence:qa`: **PASS**.
- `npm run persistence:api:qa`: **PASS** (POST/GET property/deal, history endpoint, idempotent replay, UUID validation).
- `npm run sprint3.2:qa`: **PASS** — existing UI, responsive, map/offline, PDF, runtime, and security suites; no provider calls.
- `npm run deal:cleanup:qa`: **PASS** — Fantasia arithmetic and Bass/Joyce gates retained.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- `node scripts/qa-runtime-security.js`: **PASS** — local/encoded secrets, function output/zip, runtime log, and 42 protected artifacts; provider calls `0`.
- `git diff --check`: **PASS** (only normal CRLF conversion warnings).

Fantasia historical arithmetic and all protected Sprint 1–3 evidence/analytical artifacts remain byte-for-byte protected. Automated tests made no real RentCast calls.

## Snapshot, transaction, and audit proof

Evidence and analysis repositories expose insert/read flows only; there is no substantive application update operation for either snapshot table. Save Property, refresh, Save Deal, duplicate, and re-analysis are transaction-scoped. `pg_advisory_xact_lock` plus a unique idempotency key serializes retries; audit events record property/deal save, refresh, duplicate, archive, and analysis creation. Prior evidence and analysis rows remain tied to their original IDs and inputs.

## Deploy-preview validation — resumed gate

Link verification passed on the linked project `worksidepropertyintelligence` (site ID `32047018-4a9d-4c5c-a8a1-39430de8d7ea`) and the repository `netlify.toml` was confirmed. The required deploy-preview command was then attempted without `--prod`:

```text
npx netlify deploy --build --context deploy-preview
```

Netlify build/deploy ID: `6aade08ef09963456ffa1531`  
Deploy-preview URL: **not created**  
Database branch: **not created**  
Migration `001_persistent_intelligence.sql`: **not run remotely**

The deploy stopped during Netlify Database setup before build/upload. Netlify attempted `createSiteDatabase` for the linked site and returned HTTP `403 Forbidden`: `database feature not available for this account`. This is an infrastructure/account gate, not a migration or schema failure. The local `npx netlify database status` branch still reports migration `001_persistent_intelligence` applied, but it is not a substitute for the required preview database branch.

Because no preview URL or preview database exists, preview health, preview persistence/API smoke, preview snapshot immutability, preview transaction/idempotency, Saved Property/Deal workflows, and preview remote regression/security checks were **not run**. Per the runbook, execution stops when the preview branch is unavailable. No production deploy, production database creation, or manual production migration was attempted.

## Regression/security result after gate attempt

The non-remote baseline was rerun after the linked-project attempt: `npm test` **83/83 passed** and `node scripts/qa-runtime-security.js` **PASS** (42 protected artifacts, provider calls `0`). Previously recorded local persistence/API QA, Sprint 3.2 QA, Deal Cleanup QA, PDF/map/responsive QA, and `npm audit --omit=dev` remain green. These results do not establish preview validation.

## Production recommendation

**NO-GO for production migration/deploy.** Enable Netlify Database for the linked account/project (or obtain an approved account with the feature), then rerun the exact preview gate. Do not modify the migration to bypass this 403, and do not manually migrate production. Only after an isolated preview database applies `001_persistent_intelligence.sql` and all required smoke/regression checks pass should production migration be reconsidered with explicit operator authorization and rollback planning.

## Known limitations

- Internal analyst POC only; no authentication, ownership, or multi-user isolation.
- Open-record API hydrates the existing workbench from the latest durable snapshot; deeper historical snapshot selection UX remains future work.
- Provider refresh is an explicit server action and remains subject to the existing RentCast identity, quota, and representation gates.
- No Kern ingestion, Monte Carlo simulation, binary document/report persistence, or advanced SQL analytics dashboard.

## Exact operator commands

```text
npm ci
npx netlify database status
npx netlify database reset --json                 # localhost/test branch only
npx netlify database migrations apply
npx netlify database connect                      # copy localhost URL to current shell
$env:NETLIFY_DB_URL='postgres://localhost:<port>/postgres'
npm run persistence:qa
npm run persistence:api:qa
npm run sprint3.2:qa
npm run deal:cleanup:qa
npm audit --omit=dev
```

**STOP — Sprint 4 completion report generated for Stan/ChatGPT review.**
