# Sprint 6.3.2 QA

Date: 2026-09-24

## Local regression

- `npm test`: 128/128 PASS.
- `node --test scripts/sprint6_3/api.test.js`: 6/6 PASS, including detail allowlist, explicit-zero and hostile-field coverage.
- `npm run netlify:test`: 18/18 PASS.
- `npm run web:build`: PASS.
- `npm run web:test`: PASS.
- `node scripts/sprint6_3/ui-qa.js`: PASS (sticky headers/sort, pagination, 118/81 presets, drawer evidence/privacy, resolver handoff, unmatched handling).
- `npm run map:test`: PASS.
- `npm run report:test`: PASS for all existing report fixtures.
- `node scripts/qa-runtime-ui.js`: PASS.
- `node scripts/qa-runtime-security.js`: PASS; browser/function artifacts scanned, provider calls 0.

## Fresh deploy preview

- Deploy ID: `6ab54dca6d9373bd7e38bd20`
- URL: https://6ab54dca6d9373bd7e38bd20--worksidepropertyintelligence.netlify.app
- Preview deploy scan: PASS; no Netlify Database provisioning, credentials or retained raw logs.
- Runtime read-only QA: `node scripts/sprint6_3_1/preview-readonly-runtime.js <preview>` PASS.
- UI QA: `node scripts/sprint6_3_2/preview-ui-qa.js <preview>` PASS at 1366px and 390px. Screenshots: `data/validation/sprint6_3_2-preview-desktop.png`, `data/validation/sprint6_3_2-preview-mobile.png`.

Read-only preview reconciliation: 11,321 source records; 11,316 candidates; 11,263 exact; 53 unmatched; 312 High / 701 Medium / 10,303 Low; 118 High Residential; 81 High SFR; 81/81 High SFR with county situs; 1,270 situs-present. Pagination remained 25 rows by default. No response contained prohibited DTO keys or raw source material.

Representative detail reads (all GET-only): High SFR `52273c0b-021d-4514-9de8-274c58fb954b`; High multifamily `ac8dfcac-97fc-4753-b3f7-61ad0f487b36`; High manufactured `91898290-1118-4300-864f-7e980450c315`; vacant `08a98189-37d0-4092-ae9b-5db53245b0fd`; unmatched `19aeaf69-6e37-4676-b62b-cfde7de58097`; incomplete situs `005b3fea-e2cd-4271-bc79-c4d11f25858b`. Detail latency in this small sample was approximately 1.35–1.59 seconds; no optimization was attempted.

Provider accounting: RentCast 0, Google 0, county 0. Supabase reads were expected; no View/browser POST or other mutation occurred. Analyze Property was not confirmed and no real candidate was changed.

## Production certification

- Deploy ID: `6ab54f6d6d9373c4b938bec4`
- URL: https://worksidepropertyintelligence.netlify.app
- Production read-only runtime reconciliation: PASS for health, PostgreSQL persistence, 11,316/11,263/53 population, 312/701/10,303 priorities, 118 High Residential, 81 High SFR, 81/81 High SFR situs, pagination, cold detail and CSV/privacy contracts.
- Production UI QA script: `node scripts/sprint6_3_2/preview-ui-qa.js https://worksidepropertyintelligence.netlify.app` PASS at 1366px and 390px. Cases: High SFR, High multifamily, High manufactured, vacant, Assessor-unmatched, plus close/Escape/list-state checks. Production screenshots are recorded under `data/validation/sprint6_3_2-production-*.png`.
- Read-only detail samples: explicit-zero acreage `1f4312d6-d73c-4ded-8f30-ce1c9f1a86bb` (`0.00000` roll acres, explicit-zero flag); acreage-difference `005b3fea-e2cd-4271-bc79-c4d11f25858b` (`-3.15000000000`, delta flag). No polygons were returned.
- Detail latency sample: approximately 1.78–2.52 seconds on the small production sample; no optimization was attempted.
- Production browser bundle scan: PASS. Deployed response/DTO scans: PASS. Local Function artifact and sanitized available-log scan: PASS/no raw log stream available; no raw logs printed.
- Provider accounting: RentCast 0, Google 0, county 0. Supabase read traffic expected; browser View mutations 0.
