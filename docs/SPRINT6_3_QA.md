# Sprint 6.3 QA — Production certified

See [completion report](SPRINT6_3_COMPLETION_REPORT.md) for exact hashes/counts and the final certification receipt. Gate 13 production import passed and is fully reconciled. The first preview exposed source provenance metadata and is retained as a failed audit receipt; final corrective preview `6ab469b7e165d1222cdd9ad7` passed explicit DTO sanitization and was deployed to production as `6ab46d05cc42f49433bf22ac`. Production runtime certification passed. Migration 004 was applied once; Gate 11 and corrected Gate 12 passed. Do not rerun any migration or the certified import.

## Production certification — PASS

Production URL: https://worksidepropertyintelligence.netlify.app. Health reports Netlify runtime, PostgreSQL configured/available, durable sessions and `persistenceAvailable=true`. Read-only pre-deploy fingerprints, ledger checksums, batch `6055c2fe-20e8-427a-8912-e46a655ff7e7`, 11,316 observations, 11,263 exact / 53 unmatched and 312/701/10,303 priorities matched the certified baseline. Deployed list/detail/metrics/privacy/CSV/filter/pagination/cold-runtime/UI gates passed, including 118 High Residential Buildings, 81 High Single Family (all with situs), situs/assessment disclaimers and canceled Analyze confirmation. Production security scans found no credentials/private source material; Function logs were sanitized duration/memory only. Provider calls: RentCast 0, Google 0, county 0; Supabase traffic real/nonzero. Full receipt: `data/validation/sprint6_3-production-certification.json`.

## Evidence

| Artifact | Result / scope |
| --- | --- |
| `data/validation/sprint6_3-isolated-schema-certification.json` | PASS: actual Supabase PG17.6, isolated 001–004 ledger/schema/FKs/triggers/RLS/grants/decimals; transaction/replay/history; SQL filters/pagination/cold local handler; exact cleanup; public fingerprints unchanged |
| `data/validation/sprint6_3-enrichment-dry-run.json` | PASS: recomputed ZIP/member/PTS hashes and exact 11,316/11,263/53/1,270/312/118/81 counts |
| `data/validation/sprint6_3-ui-qa.json` | PASS: desktop/mobile presentation fixtures, pagination, labels, presets, unmatched, canceled provider confirmation |
| `data/validation/sprint6_3-regressions.json` | PASS: 12 existing regression scripts including 15 investment PDF fixtures; isolated ignored output copy |
| `data/validation/sprint6_3-security.json` | PASS: browser/source/local Function review bundle, credential variants, local logs and QA/report artifacts (43 files); no deployed artifact credential claim |
| `data/validation/sprint6_3-pre-import-status.json` | PASS: original secure preflight/status, only 004 pending, read-only source/score/status reconciliation, matching public fingerprints |
| `data/validation/sprint6_3-production-schema-certification.json` | Gates 10–11 PASS; Gate 12 STOP before inserts; transaction rolled back |
| `data/validation/sprint6_3-production-stop-diagnostics.json` | Read-only reproduction of QA search-path quoting defect; existing data preserved; new tables empty; exact ledger preserved |
| `data/validation/sprint6_3-gate12-qa.json` | PASS: corrected parameterized search path; pre-write assertions; three synthetic candidates; rollback/replay/history/filter QA; zero rows after rollback |
| `data/validation/sprint6_3-production-import.json` | PASS: authorized Gate 13 batch `6055c2fe-20e8-427a-8912-e46a655ff7e7`; 11,316 observations; independent reconciliation and zero-addition replay |
| `data/validation/sprint6_3-preview-certification.json` | STOP / NO-GO: deploy `6ab45d8eeff8ea741f01670e` counts/latency/UI gates passed, but metrics leaked `owner_name` header and `data/raw` source path |
| `data/validation/sprint6_3-preview-certification-6ab4689b.json` | PASS: fresh corrective preview; aggregate-only metrics, hostile-provenance API tests, full deployed counts/filters/details/CSV/UI/latency/security gates |
| `data/validation/sprint6_3-preview-certification-6ab469b7.json` | PASS: final fresh corrective preview after source-record DTO tightening; deployed counts, privacy, UI, latency, logs and security gates |
| `data/validation/sprint6_3-production-certification.json` | PASS: production deploy `6ab46d05cc42f49433bf22ac`; read-only baseline, health, counts/filters/pagination, cold detail, UI, privacy, performance, logs and regression/security gates |

151 unit tests pass (existing tests + `scripts/sprint6_3/*.test.js`). Tests cover strict namespace allowlist/mode, rejecting public/pre-existing targets, migration namespace audit, scoped baseline, source hashes/counts, decimal null/zero, privacy allowlist, replay payload mismatch, filters and two-flag provider confirmation.

The literal old `scripts/sprint6_2/poc.test.js` command yields 24 pass / 1 fail: its old whole-application freeze expects the pre-Sprint-6.3 App/Opportunities/router/package files. Those four paths are the expressly scoped integration changes, not protected evidence. No old test/artifact was edited. The replacement Sprint 6.3 baseline guard verifies the other 588 protected files. Do not describe the unmodified 25-test command as green.

One initial isolated certification retry corrected a QA regex that failed to recognize the digit in index `apn9`; no migration changed. Rollback/schema absence/public preservation passed. One regression-copy attempt used a dependency junction; Vite correctly rejected paths outside its existing filesystem boundary. Copying dependencies into the ignored QA workspace fixed the harness, without runtime/security changes. All 12 scripts then passed. Intermediate logs remain ignored for audit.

## Reproduction and limitations

- `npm run assessor:enrichment:dry-run`: offline hash/count/source reconciliation only.
- `npm run assessor:enrichment:qa`: seven source/import-plan unit tests; not a substitute for real PG certification.
- `node scripts/db-schema-certify.js --certify-sprint6-3`: authorized isolated real-PG rebuild/import/API tests and exact guarded cleanup; uses remote DB network, never public writes.
- `node scripts/sprint6_3/regressions.js`: copies code/dependencies/test evidence into a new ignored QA workspace, excludes `.env`/county ZIP/runtime trees, strips provider/DB environment variables, and executes unchanged regression scripts there. No production persistence-writer scripts are run.
- `node scripts/sprint6_3/ui-qa.js`: uses safe certified-row presentation fixtures, not a mocked PG certification. External browser requests are blocked. Screenshots/disclaimer retained under ignored `data/runtime/sprint6_3/visual/`.
- `node scripts/sprint6_3/security.js`: opaque credential comparisons, no value output. Local Function review bundle is not a Netlify deployment.
- `node scripts/sprint6_3/pre-import-status.js`: Gate 9 read-only checks after successful regressions; uses unchanged legacy scripts in the isolated QA copy to preserve previous report artifacts.
- `npm run sprint6.3:gate12:qa`: corrected production-schema Gate 12 runner. It performs only pre-write reads, rollback-only synthetic QA and post-rollback reads. It never calls a migration or the production enrichment importer.

No real provider calls occurred. The authorized 004 schema/ledger addition and one certified candidate-scoped 2026 Final enrichment batch are the only committed data changes. Corrected Gate 12 used `set_config` and passed entirely inside a rollback-only transaction; post-rollback counts were zero and preservation fingerprints/ledger matched before import. Gate 13 post-commit reconciliation and identical replay passed. Production runtime performance is recorded in the production receipt. Historical analysis/decision rows and original PDF/evidence bytes remain unchanged.

151 tests and source hashes/counts were rechecked before the authorized migration. Gates 10–12 pass, Gate 13 production import/reconciliation is recorded in the receipt, corrective preview certification is PASS, and production application certification is PASS. Stop before Sprint 6.4, scoring v2, KIPS, parcel-history recovery, bulk RentCast, outreach or other feature work.
