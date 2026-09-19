# Sprint 5 MAO completion report

**Scope:** Fix & Flip Acquisition Decision / Maximum Allowable Offer only. Buy & Hold, BRRRR, Wholesale, Monte Carlo, Kern, title providers, AI repair estimation and authentication were not started.

**Status:** **PRODUCTION CERTIFIED — FIX & FLIP ACQUISITION DECISION & MAO ENGINE OPERATIONAL**

## Implementation

- Deterministic `sprint5-mao-v1` engine with exact hurdle algebra, cent-boundary checks, fixed/percentage/daily/monthly costs, explicit rehab/contingency, financing, holding costs, exit bases, encumbrance separation, walk-away cap, target policy and exit × rehab sensitivity.
- Additive migration `002_acquisition_decisions.sql`; migration 001 is unchanged.
- Append-only acquisition decision, encumbrance and condition persistence with transaction/idempotency semantics and historical fingerprints.
- Shared API for unsaved calculation, encumbrances, condition assessments, decision save/history/open.
- Deal Mode Acquisition Decision panel and MAO documentation. Existing Property/Deal analysis remains unchanged.
- PDF layout was intentionally left unchanged; the Acquisition Decision PDF section is deferred because the current local renderer is not exposed by Netlify and adding a page would introduce layout risk to the protected Sprint 4 report.

## Gates

| Gate | Result |
|---|---|
| Protected Sprint 1–4 artifacts | PASS — existing protected-input checks |
| MAO deterministic math | PASS — 10 hand-reconciled deterministic checks; 0 provider calls |
| Migration 002 / local schema | PASS — additive migration; 001 unchanged |
| Supabase migration/status/schema | PASS — preflight TLS, one pending 002, applied once, 19 tables, 16 indexes, 29 restrictive FKs |
| Tagged non-destructive persistence QA | PASS — separate connections, immutable decisions, encumbrance/condition history, idempotency, rollback |
| Sprint 4.1 regression/security suite | PASS — 92 unit tests, UI/map/PDF/runtime/security, audit 0 |
| Deploy preview / cold decision persistence | PASS — fresh preview, cold session, linked evidence, 15 comps, decision reopen/history/replay |
| Production | PASS — controlled certification complete; Sprint 5 STOP |

## Deterministic MAO certification

`npm run mao:test` passed the three return definitions (`CASH_ON_CASH`, `RETURN_ON_TOTAL_PROJECT_COST`, `PROFIT_MARGIN_ON_SALE`), exact cent threshold boundaries, fixed/purchase/exit percentage costs, daily/monthly holding costs, explicit zero versus unknown, incomplete/unavailable gates, encumbrance separation and gap, rehab/contingency, exit conflict, sensitivity, target policy, manual walk-away cap and deterministic fingerprint. The engine version is `sprint5-mao-v1`; no 70% heuristic or recommendation field is used.

## Migration and Supabase certification

- `npm run db:preflight`: PASS — TLSv1.3, authorized secure transport; exactly one pending migration.
- `npm run db:status` before migration: PASS — only `002_acquisition_decisions.sql` pending.
- `npm run db:migrate`: PASS — 002 applied once; 001 was not rerun or modified.
- `npm run db:schema:qa`: PASS — checksum ledger for 001/002, 19 application tables, 16 indexes, 29 restrictive foreign keys.
- Non-destructive persistence QA (`SPRINT5_QA_1789786756193`): PASS. Property `950042da-1be5-49eb-92ea-2b3e4d4b4fd2`, evidence `a1b3e11b-18fd-4f99-882e-78b4d7e1520d`, decisions `1fd6b398-6cae-4e76-aa0f-45e781bc9c95` and `4aff0c24-ff7c-40bb-9287-c5e98cf2fbeb`; prior decision unchanged after a material assumption change; separate database connections reopened both records; idempotent replay returned the first; transaction rollback left no row; provider calls 0.

## Regression and security certification

`npm run sprint5:qa` passed: MAO QA, 92 unit tests, web build/UI QA, UX QA, map QA, all report/PDF regressions, 18 Netlify runtime tests, runtime UI and credential scans. `npm audit --omit=dev` reported 0 vulnerabilities. Function artifacts, browser assets and local runtime scans contain no database URL, password, provider credential or private key. Automated provider calls remained zero.

## Deploy-preview certification

Fresh deploy preview: [6aadfbef1e08e110689753d3--worksidepropertyintelligence.netlify.app](https://6aadfbef1e08e110689753d3--worksidepropertyintelligence.netlify.app), deploy ID `6aadfbef1e08e110689753d3`.

- Preview health PASS: `runtime: "netlify"`, `databaseConfigured: true`, `databaseProvider: "postgresql"`, `persistenceAvailable: true`.
- Cold-session preview tag `SPRINT5_PREVIEW_QA_20260919_FINAL`: Property `16141865-fcaf-4d2c-9be5-04c97cc6884c`, Evidence `5cd9e055-ae5f-47ed-a502-a43d8f941339`, Deal `b1f700ad-435b-49a7-ae81-41f87be4e502`, decision `2cd6bfc1-8b8c-4d07-8e5d-f73b599ac5b6`.
- Property reopened with all 15 retained comps; Deal reopened with 10 claims and 21 diligence items.
- Decision calculation and save used an intentionally unknown `cold-decision:<dealId>` session key. The decision reopened in a separate Function invocation with its exact fingerprint, linked Evidence, two encumbrance observations and condition history.
- Decision replay was idempotent; no duplicate decision was created. Known encumbrances totaled `$50,000`; one unknown amount remained unknown; calculated MAO was `$165,000`; no RentCast calls occurred.
- Browser asset scan PASS; preview Function-log scan PASS — 12 sanitized log lines, 0 credential-like entries, 0 provider-like entries. The final preview also includes the corrected normalization of percentage/rate acquisition-cost lines without an explicit amount; `npm run mao:test`, `npm test`, and the full Sprint 5 QA suite passed after that correction.

## Production certification

Production deployment was explicitly authorized after preview review. The already-certified application blobs were promoted without rerunning migrations, resetting/truncating data, or modifying the Supabase schema.

- Production deploy ID: `6aae0319bef698f32a54e696`; production URL: [worksidepropertyintelligence.netlify.app](https://worksidepropertyintelligence.netlify.app); unique deploy URL: [6aae0319bef698f32a54e696--worksidepropertyintelligence.netlify.app](https://6aae0319bef698f32a54e696--worksidepropertyintelligence.netlify.app).
- Production health PASS: `runtime: "netlify"`, `databaseConfigured: true`, `databaseProvider: "postgresql"`, `persistenceAvailable: true`. Deploy output showed only the application build/function bundle; no Netlify Database provisioning or `createSiteDatabase` operation occurred.
- Controlled tag `SPRINT5_PRODUCTION_QA_20260919_1`: Property `16141865-fcaf-4d2c-9be5-04c97cc6884c`, Evidence `a54efe70-9ec2-40d3-b9ce-0cbc4936be97`, Deal `4cda148f-3136-4168-94ae-974d33146414`; Property reopened with 15 retained comps; Deal reopened with 10 claims and 21 diligence items.
- Cold/unknown-session decision certification: Decision #1 `87c8c229-579a-4c8b-ad6e-4e3fe77b2c67`, fingerprint `47e57f3fb8436c04129bc88320af87333f7773b144579d2b59a3f4b5dc08b370`; Decision #2 `0b7a3d79-b9db-436a-b9ae-8647227d891d`, fingerprint `8896ff0363911fd11bb34d2c3806180dbabaccbebe26886afa9f0cc0558e64ae`.
- Selected hurdle/exit: `CASH_ON_CASH` at `20%`, `INDEPENDENT_POINT`. Selected MAO `$152,000`; Walk-Away `$145,000`; Target Offer `$136,800`.
- Encumbrance proof: known total `$50,000` from one numeric reported mortgage; one unknown-amount tax lien remained `null` and excluded from the total. Recalculation with encumbrances removed produced the same MAO, proving no investor-cost double count. One structured roof condition item reopened.
- Decision #1 inputs/outputs/fingerprint remained byte-for-byte unchanged after Decision #2. History contained both decisions (4 total historical decisions on the retained property); replaying the identical Decision #2 request returned the existing ID with no new record.
- Incomplete/unknown-cost calculation remained `INCOMPLETE` with an explicit unknown holding-cost warning; no unknown was converted to zero. RentCast/provider calls: `0`.
- Browser asset scan: PASS (1 asset); Function artifact scan: PASS (20 files, no credentials); sanitized production Function-log scan: PASS (22 lines, no credential-like or RentCast entries). No database URL, password, provider credential or private key was exposed.
- Final `npm run sprint5:qa`: PASS (92 unit tests plus UI, UX, map, PDF/report, Netlify runtime and security checks); `npm audit --omit=dev`: 0 vulnerabilities.

**PRODUCTION CERTIFIED — FIX & FLIP ACQUISITION DECISION & MAO ENGINE OPERATIONAL**

No Buy & Hold, BRRRR, Wholesale, Kern, Monte Carlo, title-provider integration, AI condition analysis or authentication work was started.

**STOP after production certification. Do not begin Sprint 6 or any excluded strategy/provider work.**
