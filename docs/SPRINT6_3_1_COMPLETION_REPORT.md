# Sprint 6.3.1 Completion Report

## Status

**PRODUCTION CERTIFIED — CANONICAL ADDRESS RESOLUTION & PERSISTENCE OPERATIONAL**

The address-resolution patch is complete within the authorized scope. Migration 005 was applied exactly once to production after all pre-migration checks passed. The certified revision was deployed to production and passed final runtime certification. No real candidate address was saved and no provider call was made.

## Production deployment and final certification

- Production deploy ID: `6ab541f19ad382458783f15c`
- Production URL: https://worksidepropertyintelligence.netlify.app
- Exact certified preview revision deployed: `6ab53c8d41d64774dd564fa6`
- Deployment/build: PASS; no migration, Assessor import, bulk address operation, Netlify Database provisioning, or provider action was invoked.
- Production Function-log retrieval for the deployment returned 102 sanitized log lines; credential scan PASS.
- `/api/health`: `runtime=netlify`, `databaseConfigured=true`, `databaseProvider=postgresql`, `persistenceAvailable=true`, `durableSessions=true`.
- Read-only pre-deploy reconciliation: migrations 001–005/certified checksums and migration 005 timestamp unchanged; canonical rows `0`; Assessor batch `6055c2fe-20e8-427a-8912-e46a655ff7e7` unchanged; 11,316 candidates, 11,263 exact / 53 unmatched, priorities 312 / 701 / 10,303, High Residential 118, High SFR 81, and score/status fingerprint `fc883cf777b35b966d5fdd84d44d2005739e200fea0a19e0497641e50a7a0a17`.

### Production UI and synthetic persistence

`production-ui-qa` passed at 1366px and 390px using a real incomplete-situs candidate without saving it: High SFR filtering remained 81, resolver opened, county situs stayed read-only, ZIP remained blank when unsupported, analyst confirmation and missing-ZIP/invalid-state validation worked, cancellation stayed on Opportunities, Overview was not activated, and no analyze/provider request occurred.

`production-address-qa` passed with synthetic tag `SPRINT6_3_1_PREVIEW_62fbdd84-1d3b-4203-8478-d94969acb367`; synthetic candidate `05af8ea7-8cc0-402a-8457-4740d7224b91`, conflict candidate `d3faec6a-a0d3-4d48-980b-311fea42eed2`, and temporary property `46c44f1c-08fd-4f34-85a8-8e810eeb4d3d`. Save Address, cold reopen, `ANALYST / MANUAL_EXTERNAL_LOOKUP`, confirmation, unchanged county situs, idempotent replay, immutable version 1→2, one-active invariant, conflict STOP, Save & Analyze confirmation/cancel gate, privacy, and exact cleanup passed. After cleanup canonical production rows returned to `0`; no real candidate was modified.

`production-runtime-qa` passed pagination, population/category filters, cold candidate detail, Assessor evidence/signals, `ADDRESS_INCOMPLETE` STOP, CSV contract, and privacy DTO checks. It confirmed 11,316 candidates, 11,263 exact / 53 unmatched, High 312, High Residential 118, High SFR 81, and all 81 High SFR candidates with county situs. Production browser bundles, Function artifact, responses, QA artifacts, and sanitized Function logs contained no credentials, raw provider payload, owner/contact data, filesystem paths, or database material. Production provider calls: RentCast `0`, Google `0`, county `0`. Supabase traffic was used for health/read-only checks and synthetic QA and is reported separately.

## Fresh deploy preview certification

- Deploy ID: `6ab53c8d41d64774dd564fa6`
- Preview URL: https://6ab53c8d41d64774dd564fa6--worksidepropertyintelligence.netlify.app
- Build/deploy checks: PASS; no migration, Assessor import, Netlify Database provisioning, or provider action was invoked.
- `/api/health`: `runtime=netlify`, `databaseConfigured=true`, `databaseProvider=postgresql`, `persistenceAvailable=true`, durable sessions enabled.

`preview-address-qa.js` PASS with tag `SPRINT6_3_1_PREVIEW_55c2e111-3d29-47c8-8b16-8c08b8863d3a`: synthetic candidate `238d7211-ee98-48f8-9b58-ded150f8d596`, conflict candidate `b93c321c-ef94-41e4-841f-08774ceae076`, and temporary property `1e8c1557-acf6-4961-850e-19744cf61833`. Save Address, cold reopen, `ANALYST / MANUAL_EXTERNAL_LOOKUP`, confirmation, unchanged county situs, idempotent replay, version-2 supersession/version-1 readability, one-active invariant, conflict STOP, Save & Analyze confirmation/cancel gate, and response allowlisting passed. Exact tag-scoped cleanup removed all synthetic rows; no real candidate was written.

`preview-readonly-runtime.js` PASS: server pagination, 11,316 candidates / 11,321 records, 11,263 exact / 53 unmatched, priorities 312 / 701 / 10,303, High Residential 118, High Single Family 81, situs present 1,270, cold detail signals/provenance, `ADDRESS_INCOMPLETE` STOP, CSV allowlist, and response privacy.

`preview-ui-qa.js` PASS at 1366px and 390px: incomplete-situs candidate remained on `#opportunities`; read-only county situs, blank ZIP/no inference, required analyst confirmation, missing-ZIP and invalid-state validation, resolver presentation, no-blank-Overview, and no-provider-request checks passed.

Preview provider calls: RentCast `0`, Google `0`, county `0`. Supabase traffic was used only for authorized synthetic/read-only checks and is reported separately.

## Deliverables

- Additive migration `005_candidate_address_resolutions.sql` with candidate FK, optional Assessor enrichment FK, immutable version history, active-address uniqueness, idempotency index, confirmation checks, supersession trigger, RLS, and public/anonymous role revocation.
- Shared server validator and persistence repository in `src/persistence/addressResolutionRepository.js`.
- Allowlisted GET/POST canonical-address API actions and provider-ready precedence in `src/workbench/api/router.js`.
- Opportunities resolver UI with read-only county situs, explicit analyst confirmation, Save Address, Save & Analyze confirmation, edit/supersession, and canonical/county distinction.
- Failed Analyze navigation correction: Overview is assigned only after a successful model response; `ADDRESS_INCOMPLETE`/`ADDRESS_INVALID` remain visible in Opportunities.
- Isolated certification runner and regression tests under `scripts/sprint6_3_1/`.

## Isolated migration result

`npm run sprint6.3.1:schema:certify` PASS. QA schema: `qa_sprint6_3_1_b81a97399d53498c93a903707a5578b0` (dropped and verified absent); `current_schema()` and `current_schemas(false)` resolved to the generated schema plus `pg_catalog`. TLS was encrypted and authorized; production writes during isolation were zero. The isolated behavior QA proved active-address uniqueness, two immutable versions with explicit supersession, and rollback cleanup. Certified migration checksums:

| Migration | SHA-256 |
|---|---|
| 001 | `10388d31537f8f65cfadc1b8c6ab590d84707a65ea6ff18e886f23147b85ebfe` |
| 002 | `3ef7649d10f76297d74c12b8e8527e936407f39a7b195482014b545dbeda6ce7` |
| 003 | `d7ac242d9ff2230a5ffe78290ccbedcd6bb002e73a99cd325baa6ef56901ed77` |
| 004 | `df557e0aec7d276e628ebced3c1fcc43e743f974d60c51290e3b369bd4e08c18` |
| 005 | `d123cb84e38dca2bffab0559d7fe579bcea612186b37007581ad0a26ac2b29e1` |

The isolated rebuild observed 29 tables, 4 canonical-address indexes, one canonical guard trigger, and 18 canonical constraints with RLS enabled. No public application namespace was changed.

## Production migration and certification

The pre-migration read-only gate passed with TLS 1.3 authorized, exactly 001–004 applied, exactly 005 pending, the certified checksum above, isolated certification PASS, one completed Assessor batch `6055c2fe-20e8-427a-8912-e46a655ff7e7`, 11,316 candidates, 11,263 exact / 53 unmatched, priorities 312 / 701 / 10,303, High Residential 118, High Single Family 81, and score/status fingerprint `fc883cf777b35b966d5fdd84d44d2005739e200fea0a19e0497641e50a7a0a17`.

The normal migration runner applied `005_candidate_address_resolutions.sql` once at `2026-09-24T14:53:36.797Z`; `db:status` then reported 001–005 applied and no pending migrations. Production certification confirmed all expected columns/types, FKs, indexes, immutable/supersession trigger body, confirmation checks, RLS, no unexpected grants/policies, and zero initial rows.

Rollback-only QA used synthetic candidates inside one transaction. It passed missing-ZIP and invalid-state rejection, ZIP+4 acceptance, manual source/method and analyst confirmation, one-active-address enforcement, immutable version-2 supersession, readable history, idempotent replay, identity conflict STOP, and unchanged candidate/Assessor/application records. The transaction rolled back completely: canonical rows `0`, synthetic records absent, ledger unchanged, Assessor unchanged, and protected application fingerprint unchanged. Real candidate address writes: `0`. Production schema certification/rollback traffic: 271 Supabase query calls; provider calls remained zero.

## Integrity and scope

County `situs_raw`, Assessor observations, `kern-screen-v1` scores/statuses, Sprint 6.3 populations (11,316 candidates; 11,263 exact; 53 unmatched; 312/701/10,303 priorities; High Residential 118; High Single Family 81), and historical analytical snapshots remain untouched. ZIP values are never inferred. Automatic Google/RentCast/county address resolution is deferred. Automated provider calls: RentCast 0, Google 0, county 0.

## QA result

`npm run sprint6.3.1:test`: 4/4. `npm test`: 128/128. `npm run web:build`: PASS. `npm run web:test`: PASS. `npm run report:test`: PASS. `npm run map:test`: PASS. `node scripts/qa-runtime-ui.js`: PASS. `npm run netlify:test`: 18/18. `node scripts/qa-runtime-security.js`: PASS (20 files, function artifact and runtime logs scanned; provider calls 0). Existing privacy allowlists and failed-navigation regression remain green. Deployed preview response/browser checks and local artifact scans passed; no credentials appeared in preview responses, bundles, Function artifacts, logs, or reports.

## STOP / next gate

Do not create a canonical address for a real candidate or make a provider call as part of certification. Sprint 6.4, bulk address resolution, and additional feature work remain out of scope. STOP after certification; Stan’s first intentional live action may proceed under the existing address/provider gates.
