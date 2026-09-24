# Sprint 6.3.1 QA

Completed:

- `npm run sprint6.3.1:test` — 4/4 address validator/migration/API contract tests.
- `npm test` — 128/128 retained foundation/regression/security tests.
- `npm run web:build` — PASS.
- `npm run web:test` — PASS, including failed Analyze navigation remaining on Opportunities and no provider call in the rejected action path.
- `npm run netlify:test` — 18/18 PASS.
- `node scripts/qa-runtime-security.js` — PASS; browser/function artifacts, runtime logs, protected files, and provider accounting scanned.
- `npm run web:test` — PASS; retained map/comps/evidence, responsive, Bass/Joyce, failed-navigation, and secret-boundary checks.
- `npm run report:test` — PASS; Fantasia/Bass/Joyce PDF fixture regressions and synthetic long/many-comps reports.
- `npm run map:test` — PASS; Google, duplicate/overlap, responsive, offline-network, auth, timeout, and missing-key cases.
- `node scripts/qa-runtime-ui.js` — PASS; zero-provider page load and runtime UI smoke.
- `npm run sprint6.3.1:schema:certify` — PASS, isolated PostgreSQL rebuild of 001–005 with exact generated-schema cleanup.
- `node scripts/sprint6_3_1/production-certify-qa.js` — PASS after migration 005; production schema certification and rollback-only synthetic address QA passed. Canonical production rows after rollback: 0.

The test contract covers complete manual entry, required ZIP and state validation, ZIP+4, no inference, allowlisted DTOs, no raw payload, no latest-analysis fallback, and the failed-navigation correction. The existing Sprint 6.3 evidence/population baseline remains protected; no provider calls were made by automated QA (`RentCast=0`, `Google=0`, county network=0). Supabase traffic used only the isolated certification schema and is not described as zero database traffic.

Fresh preview certification completed:

- Deploy `6ab53c8d41d64774dd564fa6` at https://6ab53c8d41d64774dd564fa6--worksidepropertyintelligence.netlify.app.
- Health reported Netlify runtime, PostgreSQL configured/available, and durable sessions.
- `preview-address-qa.js` PASS for synthetic Save Address, cold reopen, source/method, confirmation, idempotency, immutable versioning, conflict STOP, Save & Analyze confirmation/cancel gate, privacy, and exact tag-scoped cleanup.
- `preview-readonly-runtime.js` PASS for pagination, 11,316/11,263/53 reconciliation, 312/701/10,303 priorities, 118/81 presets, situs count 1,270, detail provenance/signals, incomplete-address STOP, CSV allowlist, and response privacy.
- `preview-ui-qa.js` PASS at 1366px and 390px for resolver opening, county-situs read-only behavior, no ZIP inference, required confirmation, missing-ZIP/invalid-state validation, Opportunities retention, no blank Overview, and zero provider requests.

Production certification completed on deploy `6ab541f19ad382458783f15c` at https://worksidepropertyintelligence.netlify.app. `production-address-qa.js`, `production-readonly-runtime.js`, and `production-ui-qa.js` passed the synthetic-only persistence, read-only population/privacy, and 1366px/390px resolver gates. Canonical rows returned to 0 after exact synthetic cleanup; no real candidate was modified. Production provider accounting: RentCast 0, Google 0, county 0. Supabase traffic is reported separately. Production is certified; stop after certification.
