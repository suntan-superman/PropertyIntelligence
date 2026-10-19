# PI V2.5 Controlled Live Acceptance Continuation Report

Execution date: 2026-10-18 Pacific / 2026-10-19 UTC  
Firebase project: `property-intelligence-8238b`  
Organization: `property-intelligence-local`  
Property: `400 Decatur St, Bakersfield, CA 93308`  
Stable property ID: `52638a00-8167-4cff-85c0-f56a0445a5a9`  
Runtime: Node.js `v22.12.0`  
Disposition: **FUNCTIONAL PASS WITH RESOURCE-LIMIT DEVIATION — stop for review.**

## Executive result

PI reused the existing CLEAN, reviewed, redistribution-approved synthetic document and generated exactly one QA Full Investor Package from the existing Decatur scenario revision. No document was uploaded, replaced, rescanned or deleted. No provider request occurred.

The package is visibly marked **QA / NOT FOR DISTRIBUTION** on every page. It contains a supporting-document appendix index on page 12, a provenance cover on page 13 and the original one-page synthetic PDF on page 14. Page numbering, content preservation and nonblank-page checks passed for all 14 pages.

The first harness process reported `restored is not defined` only after the live report request, PDF verification and browser capture had succeeded. This was a local result-assembly scope defect. The request was not repeated. A separate read-only reconciliation confirmed the report record and all expected effects.

Subsequent accounting against the complete authorization found that the harness downloaded the existing object once during preflight to verify its byte hash, then the report workflow read it once to create the appendix. This produced **two private Storage content reads**, exceeding the authorized expectation of one by one read. It caused no data mutation, but it is a resource-limit deviation and prevents an unqualified acceptance.

## Authorized-resource preflight

| Check | Result |
| --- | --- |
| Administrator UID, verified email and enabled account | PASS |
| Administrator role and organization membership | PASS |
| Existing Decatur property | PASS |
| Immutable evidence snapshot hash | PASS — unchanged |
| Exact saved scenario ID and revision | PASS — unchanged |
| Existing document and private Storage object | PASS |
| Stored bytes SHA-256 | PASS |
| Immutable version scan status | PASS — `CLEAN` |
| Analyst review | PASS — `REVIEWED` |
| QA redistribution permission | PASS — `APPROVED` |
| Appendix selection | PASS |

## Existing identities used

- Property ID: `52638a00-8167-4cff-85c0-f56a0445a5a9`
- Evidence snapshot: `3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71`
- Scenario: `2908abf4-03a2-4d3c-931f-f61b5e9900c2`, revision `1`
- Document ID: `253ed077-bfd7-49a0-a71a-2cfe75271a0a`
- Document SHA-256: `a47d8bfde5289d5bc4b75a9d427d4231886845fcef183c78975853ea649b2897`

The read-only investment bootstrap restored the Decatur subject and evidence graph before report generation. The resolved subject, snapshot, scenario and revision matched these durable references. No replacement property, evidence snapshot or scenario was created.

## Generated report

| Field | Value |
| --- | --- |
| Report revision ID | `a79f7dce-df72-4e15-ae88-e86008c4f8d5` |
| Status | `QA_NOT_FOR_DISTRIBUTION` |
| Generated | `2026-10-19T03:08:25.583Z` |
| Pages | 14 |
| Appendix index | Page 12 |
| Provenance cover | Page 13 |
| Original synthetic source page | Page 14 |
| Report SHA-256 | `a6c991440b7b2d60f93f3567eac1a0bda5f1b0154b1fae44b07db9d195905186` |

Firestore record:

`organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/reportRevisions/a79f7dce-df72-4e15-ae88-e86008c4f8d5`

The appendix identifies the attachment as synthetic test material and expressly states that it establishes no real mortgage, lien, title or financial evidence and is unsuitable for investor reliance.

## Exact continuation usage

| Resource | Usage |
| --- | --- |
| Full Investor Package requests | 1 |
| Automatic retries | 0 |
| Firestore writes | 3 |
| Private Storage reads — preflight hash verification | 1 |
| Private Storage reads — report appendix | 1 |
| **Total private Storage reads** | **2 — authorized expectation was 1** |
| New document uploads | 0 |
| New document versions | 0 |
| Malware scan invocations | 0 |
| Storage object creates | 0 |
| Storage object deletes | 0 |
| Final private Storage objects for this test | 1 |
| Provider requests | 0 |

The three Firestore writes were:

1. one `DOCUMENT_INCLUDED_IN_REPORT` audit event;
2. one immutable report revision create;
3. one required property `updatedAt` / `lastEditedBy` update.

Cloud Run logs contain no `/v1/scan` request in the continuation window.

## Integrity and restoration

- Evidence snapshot hash remains `0a6292b84385502e80e1a739d12aaa47a394f4446db6f4c867f447002077638e`.
- Scenario revision hash remains `90d9329b881b5f9945d1f9291efec0489915fef1f8c2c3d11734da771603f887`.
- Certified financial and Monte Carlo payloads are unchanged.
- The existing document and immutable version are unchanged.
- Logout/login restoration and browser refresh both passed.
- No other property, scenario, report or document was modified.
- No cleanup or destructive action was performed.

## Regression and browser QA

| Check | Result |
| --- | --- |
| Supporting-document/security tests | PASS — 50/50 |
| Report-before-bootstrap regression | PASS |
| Web production build | PASS |
| QA label on every report page | PASS |
| Sequential page numbering | PASS |
| No blank pages | PASS |
| Appendix order and provenance | PASS |
| Original attachment readability | PASS |
| Cross-session document register | PASS |

The server now rejects report generation with `INVESTMENT_BOOTSTRAP_REQUIRED` until the existing read-only investment bootstrap has initialized the evidence graph. This changes orchestration only; the certified financial, Monte Carlo and report-calculation engines were not modified.

## Recommendation

**NO-GO pending review of the one-read Storage limit deviation.**

The functional acceptance criterion passed: the existing synthetic document is present in the QA package without another upload or scan, and the original property evidence and scenario remain unchanged. However, routine authenticated uploads should not proceed under this acceptance until the resource-accounting deviation is reviewed. This result does not authorize general document-storage use, another upload, a production deployment or broader infrastructure changes.

## Operational review disposition — 2026-10-18

The authorized reviewer accepted the functional result and the one-read resource deviation. The original strict-limit result above and its machine-readable audit remain preserved without erasure.

Current classification:

**FUNCTIONAL ACCEPTANCE PASSED — RESOURCE DEVIATION REVIEWED AND ACCEPTED**

The two reads are classified separately:

1. required acceptance preflight integrity-verification read: 1;
2. report-assembly read, including independent stored-byte SHA-256 verification: 1.

Normal authenticated uploads are approved only for the private development environment under the existing authorization, tenant-isolation, scan, integrity, confidentiality, redistribution, quota and audit controls. Public deployment and unrestricted onboarding remain prohibited. Before external beta access, ClamAV must be upgraded to the recommended patched version and the relevant malware, stale-signature, timeout, tenant-isolation and report-inclusion checks rerun.

