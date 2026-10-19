# PI V2.5.1 — Synthetic Supporting Evidence End-to-End QA

Certification date: 2026-10-19  
Execution mode: local authenticated server with mocked Firebase Storage, mocked Firestore repositories, and mocked malware scanning  
Test context: 400 Decatur St, Bakersfield, CA 93308  
Stable property ID used as mock identity only: `52638a00-8167-4cff-85c0-f56a0445a5a9`

## Result

**PASS — OFFLINE SYNTHETIC QA CERTIFIED**

The V2.5.1 inline-evidence workflow accepted, scanned, hashed, versioned, reviewed, linked, restored, previewed, and reported the synthetic package without live Firebase writes, live Storage uploads, live scanner calls, provider calls, or changes to the saved Decatur record.

The result supports a **GO for the bounded private-development live acceptance plan below**. It is **not approval for external beta, production deployment, or unrestricted uploads**.

## Synthetic fixtures

The eight two-page PDF fixtures are in `tests/fixtures/pi-v2-5-1-synthetic-evidence/`. Every source page contains:

> SYNTHETIC QA DOCUMENT — NOT AN AUTHENTIC PROPERTY RECORD — NOT FOR INVESTOR DISTRIBUTION

| Fixture | Illustrative amount / purpose | SHA-256 |
|---|---|---|
| Recorded mortgage / deed of trust | $150,000 original principal | `a6af653d497d3886a84852616b9f46e59ff42e415a739a0f616ae4b8cc5e5a6a` |
| Estimated mortgage balance | $132,450 non-lender estimate | `26fb791f8ca015f2abd54c40c9c5809758affab73fb720cbde5becccb547506e` |
| Lender payoff statement | $134,912.66 synthetic payoff | `60b9ebbca8aca57db587eaf422ccecbecbc3964ee13b55a3f9bb7c2a5692728c` |
| Delinquent property tax statement | $4,286.42; intentionally unreviewed | `5d736de2bb86079d06c7d9f276287cf1042af88b52006c900c2972f4c07e5b07` |
| Contractor rehabilitation estimate | $30,000; immutable version 2 | `775fbe2d91a5e40a5906c394fe8309b2ccf0be891652d1fdc132ab931172d2c0` |
| Property inspection findings | Synthetic deferred-maintenance findings | `cb93bbe4b79944727a42ea2ab0bef6caf3cc337bbdd2c52a3f9206733b8f6a71` |
| Wholesale assignment agreement | $120,000 purchase / $10,000 assignment; confidential | `7562b5e3fb7f83b7982feeef731ae00d1da8bf2acf45c0d990e30ff2d2733637` |
| Comparable-sales valuation analysis | $210,000 illustrative value | `b29f2846edbdce6cd5317d4b83ca18827da4beea360b0ca64dd8b113fad0d63b` |

All issuers and parties are fictitious. The fixtures contain no real signatures, seals, lender brands, government marks, remittance instructions, or authentic provider evidence.

## Functional and security coverage

- Eight PDF MIME types, `%PDF-` signatures, two-page counts, and SHA-256 hashes validated.
- All nine immutable upload operations (eight documents plus the superseded rehabilitation version) received mocked CLEAN scans before storage.
- Eight document records and nine immutable private objects were created only in memory.
- Exact property, scenario, and evidence-field links persisted through scenario revisions 1 and 2 and a browser reload.
- Two documents supported the same original-mortgage claim.
- One comparable-sales document supported two claims and appeared once in the appendix.
- The superseded rehabilitation version remained immutable and was not selected; reviewed version 2 was selected.
- Authenticated preview/download returned integrity-verified bytes.
- Unauthenticated and cross-tenant access were denied.
- Scanner unavailability failed closed with no object or metadata record created.
- The unreviewed tax statement and confidential assignment agreement were excluded from the report.
- Uploading or linking files did not change an evidence claim to independently verified.
- Certified deterministic financial output was identical before and after attachment persistence.
- Browser QA recorded no runtime errors and no external or provider requests.

The end-to-end harness passed 56 assertions. Existing regression suites also passed:

- V2.5 supporting-document suite: **51/51**
- V2.5.1 inline-evidence, report, seller-position, and Monte Carlo suite: **108/108**
- Production web build: **PASS** (84 modules transformed)

## QA investor package

The generated package is labeled `QA / NOT FOR DISTRIBUTION` on every page. It contains 29 pages:

- existing Full Investor Package pages;
- one supporting-document index;
- six provenance covers; and
- twelve original synthetic source pages.

The six included documents are recorded mortgage, estimated balance, payoff, rehabilitation estimate v2, inspection findings, and comparable valuation. Appendix ordering is deterministic. The comparable valuation is not duplicated even though it supports two claims. Page numbering covers the complete package. No appendix is labeled independently verified.

## Offline resource record

| Operation | Mocked | Live |
|---|---:|---:|
| Private Storage writes | 9 | 0 |
| Private Storage integrity/report reads | 20 | 0 |
| Scanner invocations | 9 | 0 |
| Supporting-document records | 8 | 0 |
| Document audit events | 37 | 0 |
| Provider requests | 0 | 0 |

The high mocked read count deliberately exercises direct download plus repeated preview and HTML/PDF report-selection paths. It is not the proposed live budget.

## Bounded live acceptance plan — approval required before execution

Proposed subset:

1. Synthetic lender payoff statement — financial-field linking.
2. Synthetic contractor rehabilitation estimate — immutable version and underwriting linking.
3. Synthetic comparable-sales valuation analysis — one document linked to multiple claims and appendix deduplication.

Proposed operations:

- 3 private Storage writes.
- 3 malware-scanner invocations, zero automatic retries.
- 3 upload transactions. Each transaction writes the document parent, immutable version, organization hash reservation, and property update, then creates one audit event: **15 Firestore writes**.
- 3 explicit review/redistribution updates. Each updates document metadata and the property, then creates one audit event: **9 Firestore writes**.
- 1 new QA scenario revision linking exact document versions: **2 Firestore writes**.
- 3 explicit integrity-verification reads before reporting: **3 Storage reads and 3 audit-event writes**.
- 1 authenticated preview of one representative file: **1 Storage read and 1 audit-event write**.
- 1 Full Investor Package generation: **3 report-assembly Storage reads, 3 inclusion audit-event writes, and 2 report-revision/property writes**.

Bounded total:

| Resource | Maximum |
|---|---:|
| New document uploads / Storage objects | 3 |
| Scanner invocations | 3 |
| Storage writes | 3 |
| Integrity-verification Storage reads | 3 |
| Authenticated-preview Storage reads | 1 |
| Report-assembly Storage reads | 3 |
| Total Storage reads | 7 |
| Firestore writes | 35 |
| Document audit events | 13 |
| New QA scenario revisions | 1 |
| QA report generations | 1 |
| Provider requests | 0 |

The acceptance must stop on any failed scan, stale signature, hash mismatch, tenant/role mismatch, duplicate conflict, or resource-ceiling breach. It must not retry automatically or perform destructive cleanup. Existing Decatur evidence, historical scenario revisions, and reports remain immutable.

## Reproduction

Use Node 22.12.0:

```powershell
npm run pi:v2.5.1:synthetic-evidence:qa
npm run pi:v2.5:documents:test
npm run pi:v2.5.1:inline-evidence:test
npm run web:build
```

No live-upload step is part of these commands.
