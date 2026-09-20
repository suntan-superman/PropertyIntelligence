# Sprint 6.1.1 — Acquisition Decision / Analysis linkage integrity

Date: 2026-09-20

**PRODUCTION CERTIFIED — INVESTMENT REPORT MODEL & ACQUISITION DECISION LINK INTEGRITY OPERATIONAL.**

## Outcome and scope

New Acquisition Decisions require an explicit immutable Analysis Snapshot ID and Deal ID at creation. The service and repository verify the Analysis belongs to that Property and Deal, and references exactly the Decision's Evidence Snapshot. Missing links and cross-record links STOP before persistence. There is no latest-analysis fallback in calculation, decision persistence, or report reconstruction.

No migrations were added or executed. Migrations 001–003, analytical formulas, provider behavior, PDF model/template/rendering, and the existing protected artifacts were not changed. Hosted Chromium/PDF rendering was not attempted; cloud binary PDF capability remains local-only.

## Implementation

- `src/persistence/acquisitionAnalysisLink.js` reads Analysis by its explicit ID, validates Property/Deal/Evidence ownership, and creates a binding containing exact IDs, the existing Analysis model fingerprint and a canonical SHA-256 of its persisted inputs/outputs.
- `calculateLinkedDecision` establishes this binding before invoking the unchanged MAO engine. A linked calculation returns `analysisLink`. Save revalidates the exact immutable record and recomputes the same existing calculation from explicit assumptions. Changed assumptions, changed IDs, modified outputs or unlinked client results cannot silently be saved.
- `saveAcquisitionDecision` persists the Analysis ID, binding and audit metadata in the existing transaction. Identical retries return the same Decision; reusing the key with different assumptions/references STOPs. The repository insert boundary also rejects missing/mismatched Analysis references.
- The existing unpersisted MAO calculator remains available without database linkage. It cannot be persisted until a saved Deal/Analysis context is explicitly supplied and recalculated. An input-only save with explicit valid IDs performs the linked calculation at creation time.
- The browser carries the exact ID returned by Save Deal or the reopened Deal view. Calculations are invalidated when assumptions or context change; Save Decision is disabled for an unlinked calculation. Save handlers now use the actual session variable. No report controls/layout were redesigned.
- Reopening the current Deal still selects its displayed Analysis as before, but now loads that Analysis's exact Evidence and returns its explicit `analysisContext`. This is view selection, not a persistence fallback: Decision creation never looks up a latest Analysis. Later Analysis creation cannot retarget an already displayed/calculated/saved Decision.
- MAO assumptions remain explicit acquisition inputs, separate from the referenced Deal economics; no costs are copied, inferred, normalized to zero, or newly calculated for reporting.

The existing columns, foreign keys and indexes suffice for this application-boundary patch. Historical nullable links remain representable; no schema rewrite or blanket backfill was needed.

## Historical audit / repair gate

The six original Decisions were inspected read-only **before certification writes**. Full per-record proof metadata, candidate IDs, timestamps, fingerprints, input/output hashes and original row hashes are in:

- `docs/SPRINT6_1_1_HISTORICAL_LINK_AUDIT.md`
- `data/validation/sprint6_1_1-historical-audit.json`

| Decision | Classification |
| --- | --- |
| `1fd6b398-6cae-4e76-aa0f-45e781bc9c95` | UNRECOVERABLE |
| `4aff0c24-ff7c-40bb-9287-c5e98cf2fbeb` | UNRECOVERABLE |
| `322e58d6-a664-4dfd-ba3b-15ed38b54885` | AMBIGUOUS |
| `2cd6bfc1-8b8c-4d07-8e5d-f73b599ac5b6` | AMBIGUOUS |
| `87c8c229-579a-4c8b-ad6e-4e3fe77b2c67` | AMBIGUOUS |
| `0b7a3d79-b9db-436a-b9ae-8647227d891d` | AMBIGUOUS |

The first two have no persisted Deal/Analysis reference. The remaining four each have a compatible candidate but no retained Analysis derivation reference in Decision inputs/outputs or its creation audit. Matching ownership, Evidence, timestamps, or a lone candidate does **not** establish which immutable Analysis supplied the economics.

**LINKABLE_EXACT: 0. Repair mapping: empty. Historical repairs applied: 0.** The generated mapping was reviewed against the retained proof during implementation; it provides no authority to repair any record. No historical-repair endpoint or automatic repair job was introduced. All six original row hashes remain unchanged after local and deployed certification, and all six deployed report requests return `REPORT_HISTORICAL_LINK_REQUIRED`.

A synthetic exact-reviewed repair mapping is covered by a fixture regression across independent service/database wrappers. This is explicitly a test double, not a claim that a real historical repair was authorized or performed. Real separate-PostgreSQL-connection reconstruction was certified for newly linked records. Actual repaired historical database certification is inapplicable until an exact mapping exists and is reviewed.

## Local regression and persistence certification

- Full pre-preview `npm run sprint6.1:qa`: PASS. Includes all 15 investment PDF fixtures, existing investment report tests, MAO arithmetic, Kern read-only audit/dry-run/screen tests, workbench, responsive UX, map/offline fallback, original Deal Review PDFs, Netlify router tests and runtime/security QA. No county import or enrichment was run.
- Final `npm test`: **128/128 PASS** (existing 112 plus 16 linkage regression cases). New cases cover all required linkage STOPs, repository enforcement, no latest lookup, stale calculation rejection, input Evidence mismatch, key misuse, immutable Decision/report history, ambiguous historical STOP, synthetic exact repair, cold API calls and browser ID plumbing.
- Fifteen PDF fixtures: PASS. Complete 8 pages, sparse/minimal 6, many encumbrances 11, long legal/diligence 14, long sources 10, large rehab 34. All 15 comps preserved where supplied. Layout/rendering was not modified.
- Prior PDFs: Fantasia 12 pages/15 comps; Bass/Joyce 4 pages; synthetic long 6; 70-comp case 18. Existing identity and unknown-cost gates passed.
- Real PostgreSQL rollback-only report certification: PASS (`scripts/qa-investment-postgres.js`), including exact linked records, metadata, historical content, 15 comps and verified rollback. No existing row changed.
- Final local cold-request certification: PASS (`scripts/qa-decision-analysis-linkage.js --local`). New service instance per request; separate PostgreSQL connection reconstructed the identical report. Two Analysis/Decision snapshots, immutable first rows/report, identical replay, six original row hashes and six historical STOPs verified.
- Local QA tag: `SPRINT6_1_1_LOCAL_QA_b98eb4e6-16cc-4123-ac52-15a5073ed868`. An earlier successful local run before the additional idempotency-key guard also left its uniquely tagged valid linked QA records. These are append-only test records; nothing was deleted or cleaned up. The original six audit subjects were never repaired or updated.
- Desktop (1366px) and narrow (390px) preview browser checks passed and screenshots were inspected. Reopened Deal's displayed Analysis ID matches the calculated and outgoing save request; edits disable stale saves. Browser save was intercepted for contract QA and created no additional record.

## Fresh preview certification

Deploy ID: **`6ab06aaecf22df927764b7d9`**

Preview: https://6ab06aaecf22df927764b7d9--worksidepropertyintelligence.netlify.app

The linked project is `worksidepropertyintelligence` (`32047018-4a9d-4c5c-a8a1-39430de8d7ea`). Deployment used `netlify deploy --build --json` without a production flag. No Netlify Database provisioning or `createSiteDatabase` operation was observed in captured build output.

Health: `runtime: netlify`, `databaseConfigured: true`, `databaseProvider: postgresql`, `persistenceAvailable: true`.

QA tag: `SPRINT6_1_1_PREVIEW_QA_e4e65f12-5f36-4fbc-85c4-a14a8ea174ea`

| Durable record | ID |
| --- | --- |
| Property | `16141865-fcaf-4d2c-9be5-04c97cc6884c` |
| Evidence | `a0e995e4-6e49-41c8-928e-813995ce8c85` |
| Deal | `4a25c545-70ee-4f86-921b-01005c07fe07` |
| Analysis #1 | `54f60d2d-00a0-4f97-8ba3-95147390b1a4` |
| Decision #1 | `ed139243-969a-4d0e-b3b0-f1c7ca0866d1` |
| Analysis #2 | `77d85d61-6b69-43ae-a611-5af446b9535f` |
| Decision #2 | `554abcd2-2725-4f9d-9880-c5ab9743dce6` |

- 26 separate fixture/persistence/report requests, including unknown session keys, passed. This proves independence from session state, not a claim that Netlify spun up a new container for every request.
- Exact links verified through deployed Functions and separate PostgreSQL reads. Reopened Property/Evidence retained **15 comps**; Deal retained **10 claims / 21 diligence items**.
- Analysis #2 was created through a separate cold/unknown-session request. Decision #2 used that explicit ID and a changed hurdle. Decision History contains exactly **2** records for the QA Deal. Property, Deal and Decision save replays are idempotent; replay of Decision #2 creates no third Decision.
- First Decision row SHA-256 unchanged: `2bc00cabe8c8ebafc7c32ec0ef64110145d28e48b7b174a475ae2a74192414b5`.
- First Analysis row SHA-256 unchanged: `a8a87b917dc4c0b57bcc879e666d303cc5ffd39c9b60dcb9cc31a0f7c2dbb768`.
- Decision #1 report fingerprint unchanged: `d778f75f86d400043298b63a4f792673b56e4485d1d9d4f12c8c84d1aea7c38b`.
- Decision #2 report fingerprint: `491db5de8a3b34b9f15a56ec19acea95aadfca452de4ecdb3dd0314caef8ff43`.
- Report models were deeply equal across deployed invocations after normalizing only the generation timestamp. Independent database reconstruction matched the deployed model with the same timestamp.
- Deployed cross-Property, cross-Deal, mismatched Evidence, nonexistent Analysis, missing linkage and stale-calculation requests STOPped. Rejection checks left the QA history count at 2.
- All six historical report STOPs and original row hashes verified again.

Machine results: `data/validation/sprint6_1_1-deploy.json`, `sprint6_1_1-local-qa.json`, `sprint6_1_1-preview-qa.json`, `sprint6_1_1-preview-rejections.json`, `sprint6_1_1-preview-ui.json`, `sprint6_1_1-production-deploy.json`, `sprint6_1_1-production-qa.json`, `sprint6_1_1-production-rejections.json`, `sprint6_1_1-production-ui.json`.

## Security / preservation

- **Provider calls: 0.** Certification used cached Fantasia fixtures and allowlisted persistence/report paths only, with unknown sessions where applicable. No live lookup/refresh endpoint was called. Local provider tripwire and browser request blocking recorded zero calls. Available deployed Function logs showed no RentCast requests. This is path/test/log evidence, not a claim of access to a provider billing ledger.
- Browser assets, local runtime source, reports/QA JSON, the built Function ZIP and available preview Function logs passed credential scans. Actual database URI/password and provider credential variants were checked only in scanner memory; neither values nor raw log contents were emitted or retained. Private-key patterns passed.
- Function artifact: **278,713 bytes / 61 entries**. SHA-256: `03096cb61118f2a43dc695d2a56445e85fd8acac0a3413675d422dd57a6c95f0`.
- Final available Function-log retrieval exited 0; 34 nonempty output lines scanned. Raw logs were not retained. Build-log scan and final completion-report credential scan passed.
- **351 protected file hashes unchanged**, including historical artifacts, formulas, original PDF renderer and migrations. No Home Advisor modification/runtime dependency was added.
- Preview scan result: `data/validation/sprint6_1_1-security.json`; final production scan result: `data/validation/sprint6_1_1-production-security.json`. `git diff --check` passed (existing Windows line-ending warnings only).

## Production certification

Production deployment was explicitly authorized and completed through the existing `worksidepropertyintelligence` Netlify project.

- Certified preview source: `6ab06aaecf22df927764b7d9`.
- Production deploy ID: **`6ab06ccd0d26a57899d4a26c`**.
- Production permalink: https://6ab06ccd0d26a57899d4a26c--worksidepropertyintelligence.netlify.app
- Canonical production URL: https://worksidepropertyintelligence.netlify.app
- Production build exit: 0; build credential scan PASS; Netlify Database provisioning/createSiteDatabase: **not observed**; migrations run: **0**.
- Production health: `runtime: netlify`, `databaseConfigured: true`, `databaseProvider: postgresql`, `persistenceAvailable: true`.

Production QA tag: `SPRINT6_1_1_PRODUCTION_QA_900e1709-fce7-403b-9037-46da406dada1`.

An earlier non-destructive harness invocation used a unique UUID but retained the preview label before the production output naming correction; it also passed the same zero-provider checks. Its append-only QA records were not used for this certification and were not deleted or modified. The IDs below are the final production certification flow.

| Durable record | ID |
| --- | --- |
| Property | `16141865-fcaf-4d2c-9be5-04c97cc6884c` |
| Evidence Snapshot | `eec75521-25b6-4328-b081-27ab9436ed76` |
| Deal | `67e53433-5d04-4554-aa06-1b0ce95b3362` |
| Analysis #1 | `f5217a78-0795-4968-a646-d07cb93673bf` |
| Decision #1 | `224dcbe7-8a7d-4516-8e32-6d04608bb3e3` |
| Analysis #2 | `ff47eee7-efab-413a-9cec-9207a2a5c56c` |
| Decision #2 | `32499d14-71cf-4a01-8d13-7965dfae43b0` |

- Decision #1 persisted the exact Property, Deal, Evidence and Analysis IDs above. Its row hash is `42d882c80e143871cdce6fc87cc1108e197b608217d1a1f73a1107908d30fec2`; Analysis #1 row hash is `f97639b8056b3e213e7cf2510d04b572f935a96909922f8d78fcc7f4d76f3eb4`.
- Cold/unknown-session reopen reconstructed durable Deal + Evidence + Analysis data. All **15 retained comps**, **10 claims** and **21 diligence items** reopened.
- Decision #1 report fingerprint: `baf147a07b666bc0f11b1b7d7b2182a5b638c9dc08898dc82647cfb8b08c96ef`. Decision #2 fingerprint: `5136fc9ea69bd6ccdc40745d9e8444d844e2b19a6179a80cb1d1cfb1440607f5`.
- Decision #1 remained unchanged after Analysis #2/Decision #2. History contains exactly **2** QA decisions. Identical Decision #2 replay returned the same ID and created no Decision #3.
- Cross-Property, cross-Deal, mismatched Evidence, nonexistent Analysis and missing-link requests all returned the expected linkage STOPs without persistence. The browser cannot save a stale/unlinked calculation; desktop and 390px checks passed with zero browser errors.
- Six original historical rows remained byte-for-byte unchanged by the production audit hashes. All six still return `REPORT_HISTORICAL_LINK_REQUIRED`; historical repairs/backfills: **0**.
- Production provider calls: **0**. Only cached/synthetic fixture evidence and persistence/report paths were used.
- Production browser, Function artifact, QA/report artifacts and available sanitized Function logs passed credential scans. Database URI/password and provider credentials were checked only in scanner memory; no credentials/private keys appeared in browser assets, Function output, logs or reports. The final production log scan exited 0 with 102 nonempty lines scanned and no RentCast request pattern.
- Exact runtime artifact comparison passed: preview and production both served `/assets/index-CYJTQToF.js`, 409,842 bytes, SHA-256 `674c938a3f80a11b722fbceb28175a7683a9f74c187a5cc5599d30550546aafb`; the Function ZIP hash also matched the certified preview (`03096cb61118f2a43dc695d2a56445e85fd8acac0a3413675d422dd57a6c95f0`).
- Complete suite: **128/128 tests PASS**, all 15 investment PDF fixtures PASS, existing report/PDF regressions PASS, MAO/UI/maps/offline/Netlify/security checks PASS. Local Investment Analysis PDF remains the certified binary-report path; hosted Netlify binary PDF remains unavailable/local-only.

## Retained limitations and final STOP

- The six pre-6.1.1 Acquisition Decisions remain PDF-ineligible and continue to return `REPORT_HISTORICAL_LINK_REQUIRED`.
- Hosted Netlify binary PDF generation remains unavailable/local-only; no Chromium package, external renderer or hosted PDF workaround was introduced.
- Newly correctly linked Acquisition Decisions are report-model eligible.

**PRODUCTION CERTIFIED — INVESTMENT REPORT MODEL & ACQUISITION DECISION LINK INTEGRITY OPERATIONAL**

STOP after certification. Do not begin hosted PDF infrastructure, Assessor integration, address resolution, Sprint 7 or additional feature development.
