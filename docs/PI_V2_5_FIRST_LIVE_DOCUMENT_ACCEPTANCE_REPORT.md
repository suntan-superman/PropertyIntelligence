# PI V2.5 First Live Document Acceptance Report

Execution date: 2026-10-18 Pacific / 2026-10-19 UTC  
Firebase project: `property-intelligence-8238b`  
Organization: `property-intelligence-local`  
Property: `400 Decatur St, Bakersfield, CA 93308`  
Stable property ID: `52638a00-8167-4cff-85c0-f56a0445a5a9`  
Runtime: Node.js `v22.12.0`  
Disposition at initial stop: **PARTIAL ACCEPTANCE.** The separately authorized continuation subsequently achieved a functional pass with a one-read Storage-limit deviation; see [PI V2.5 Controlled Live Acceptance Continuation Report](PI_V2_5_LIVE_ACCEPTANCE_CONTINUATION_REPORT.md).

## Executive result

The single authorized upload request succeeded. PI validated the synthetic PDF, invoked the private Cloud Run scanner exactly once, received `CLEAN`, stored one private immutable object, committed one document and version, recorded its hash reservation and audit event, and left it `PENDING_REVIEW` by default. The authenticated Administrator then explicitly marked it `REVIEWED`, approved redistribution, selected it for the QA appendix, logged out, logged in again, and downloaded the identical bytes through PI's authenticated server endpoint.

The QA Full Investor Package request then returned HTTP 400. The harness stopped immediately, did not retry, did not create a report revision, did not produce a report PDF or browser screenshot, and did not perform cleanup.

Read-only diagnosis found that the report request occurred before the acceptance harness called `/api/investment/bootstrap`. Consequently, the server's in-memory evidence graph had not restored the durable Decatur subject, even though the immutable Firestore scenario remained intact. The report validator therefore returned `Choose a valid property and scenario name.` This is a harness sequencing defect. It is not evidence of document corruption, a scanner failure, or a change to the certified financial or Monte Carlo outputs.

## Preflight results

| Check | Result |
| --- | --- |
| Administrator UID, enabled status, verified email | PASS |
| Administrator role and `property-intelligence-local` membership | PASS |
| Existing Decatur property, evidence snapshot and scenario | PASS |
| Document records on Decatur before upload | PASS — 0 |
| Document bucket before upload | PASS — 0 objects |
| Bucket region | PASS — `US-WEST2` |
| Uniform bucket-level access | PASS |
| Public access prevention | PASS — enforced |
| Deployed Firestore client rules | PASS — deny all |
| Deployed Storage client rules | PASS — deny all |
| Public bucket and Cloud Run IAM principals | PASS — none |
| Scanner health | PASS — HTTP 200 |
| Scanner signatures | PASS — daily `28157`, updated `2026-10-18T06:24:14Z` |
| V2.5 document/security regression suite | PASS — 49/49 |
| Firebase authentication regression suite | PASS — 10/10 |
| Browser bundle privileged-configuration scan | PASS — 0 matches |
| Synthetic/no-sensitive-content inspection | PASS |

## Live document result

| Field | Value |
| --- | --- |
| Document ID | `253ed077-bfd7-49a0-a71a-2cfe75271a0a` |
| Filename | `PI_V2_5_DOCUMENT_ACCEPTANCE_TEST.pdf` |
| SHA-256 | `a47d8bfde5289d5bc4b75a9d427d4231886845fcef183c78975853ea649b2897` |
| Size | 1,504 bytes |
| Pages | 1 |
| Uploaded | `2026-10-19T02:05:55.817Z` |
| Reviewed | `2026-10-19T02:05:57.885Z` |
| Review status | `REVIEWED` — not independently verified |
| Redistribution | `APPROVED` for this synthetic test |
| Appendix selected | Yes |
| Scanner | ClamAV `1.4.3` |
| Scan result | `CLEAN` |
| Signature version | `28157` |
| Scanned | `2026-10-19T02:05:55.366Z` |
| Storage generation | `1792375555581290` |

Private object:

`organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/documents/253ed077-bfd7-49a0-a71a-2cfe75271a0a/versions/1/a47d8bfde5289d5bc4b75a9d427d4231886845fcef183c78975853ea649b2897.pdf`

Direct unauthenticated object retrieval returned HTTP 401. Direct unauthenticated bucket listing returned HTTP 401. No signed or public object URL was created.

## Firestore records and exact writes

The test committed exactly **9 Firestore document writes** before the report failure:

1. Upload transaction: 4 writes
   - create document metadata;
   - create immutable `v000001` version;
   - create organization-scoped SHA-256 reservation;
   - update the Decatur property's `updatedAt` and `lastEditedBy` fields.
2. Upload audit event: 1 write.
3. Review transaction: 2 writes
   - replace reviewed document metadata;
   - update the Decatur property's `updatedAt` and `lastEditedBy` fields.
4. Review audit event: 1 write.
5. Authenticated download audit event: 1 write.

Created records:

- `organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/supportingDocuments/253ed077-bfd7-49a0-a71a-2cfe75271a0a`
- `organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/supportingDocuments/253ed077-bfd7-49a0-a71a-2cfe75271a0a/versions/v000001`
- `organizations/property-intelligence-local/documentHashes/a47d8bfde5289d5bc4b75a9d427d4231886845fcef183c78975853ea649b2897`
- three immutable `documentAuditEvents`: `DOCUMENT_UPLOADED`, `DOCUMENT_METADATA_UPDATED`, and `DOCUMENT_DOWNLOADED`.

No `reportRevisions` record was created.

## Exact live resource usage

| Resource | Usage |
| --- | --- |
| Authenticated upload requests | 1 |
| Automatic upload retries | 0 |
| Scanner health requests | 1 |
| Scanner scan requests | 1 |
| Scanner scan responses | 1 CLEAN / HTTP 200 |
| Storage object creates | 1 |
| Storage application reads | 1 authenticated download |
| Storage deletes | 0 |
| Final Storage objects | 1 |
| Firestore writes | 9 |
| Report requests | 1 failed validation |
| Report revisions | 0 |
| Provider requests | 0 |

Cloud Run request logs show exactly one `POST /v1/health` and one `POST /v1/scan` during the acceptance window. The scan reached revision `pi-malware-scanner-00010-nf7` and returned HTTP 200.

## Security and persistence results

| Check | Result |
| --- | --- |
| Upload begins unreviewed despite client-supplied approval fields | PASS |
| CLEAN metadata required for review | PASS |
| Review does not establish independently verified evidence | PASS |
| Explicit redistribution and appendix selection | PASS |
| Logout/login restoration | PASS |
| Authenticated download hash equals upload hash | PASS |
| Unauthenticated PI list/download | PASS — HTTP 401 |
| Cross-organization service access | PASS — `DURABLE_PROPERTY_NOT_FOUND` |
| Direct public Storage object/list | PASS — HTTP 401 |
| Private service configuration in browser bundle | PASS — 0 matches |
| Browser refresh persistence | NOT COMPLETED after report stop |
| Document-register screenshot | NOT PRODUCED after report stop |

## Data-integrity result

- Stable Decatur property ID is unchanged.
- The property metadata changed only as expected for document upload/review (`updatedAt` and `lastEditedBy`). Its post-test data hash is `af90863b8aefc973905aaf5856896c067c522bb66459149e9236047158e99fa6`.
- Original evidence snapshot hash remains `0a6292b84385502e80e1a739d12aaa47a394f4446db6f4c867f447002077638e`.
- Original scenario revision hash remains `90d9329b881b5f9945d1f9291efec0489915fef1f8c2c3d11734da771603f887`.
- The existing scenario ID, revision, evidence fingerprint, analysis, financial inputs, and Monte Carlo payload are unchanged.
- No other property was modified.
- No paid property-provider request occurred.
- No second Storage object exists.
- No destructive cleanup was performed.

## Failure and safe next action

The first authorized upload must not be repeated: the approved live document already exists and organization-wide hash protection will correctly reject the same bytes as a duplicate.

The smallest safe continuation would reuse this existing CLEAN document and perform no new upload or scan. It would:

1. start a fresh authenticated session;
2. call the normal read-only investment bootstrap so Decatur is restored into the in-memory evidence graph;
3. verify the existing document through the register and browser refresh;
4. generate one QA / NOT FOR DISTRIBUTION Full Investor Package;
5. create one `DOCUMENT_INCLUDED_IN_REPORT` audit event plus one immutable report revision and its required property timestamp update;
6. capture the document-register and appendix screenshots.

That continuation would add an expected **3 Firestore writes**, **1 private Storage read**, **0 uploads**, **0 scans**, and **0 provider requests**. It requires separate explicit approval because the authorization prohibited retrying after a failure.

Destructive removal of the current document, metadata, hash reservation, audit history, or private object was not authorized and is not recommended without a separate cleanup plan.

## Recommendation

**NO-GO for enabling normal authenticated document uploads at this initial review point.**

The upload, scanning, private persistence, review, cross-session restoration, download integrity, tenant isolation, and public-access controls passed. The end-to-end acceptance criterion remains incomplete because the browser-refresh evidence, screenshot, and appendix-bearing QA investor package were not produced. Approve either the narrowly scoped continuation above or a separately reviewed cleanup plan; do not repeat the upload.

The separately authorized continuation completed the missing report and browser checks without another upload or scan, but exceeded its private Storage-read expectation by one read. Its recommendation remains NO-GO pending review of that deviation. See [PI V2.5 Controlled Live Acceptance Continuation Report](PI_V2_5_LIVE_ACCEPTANCE_CONTINUATION_REPORT.md).

## Subsequent operational disposition — 2026-10-18

The authorized reviewer accepted the functional result and acknowledged the one-read deviation. The strict-limit failure documented above remains the original audit result. Current classification is **FUNCTIONAL ACCEPTANCE PASSED — RESOURCE DEVIATION REVIEWED AND ACCEPTED**. Private-development authenticated uploads may proceed under the existing controls; this does not authorize public deployment or unrestricted onboarding. See [PI V2.5 Operational Handoff](PI_V2_5_OPERATIONAL_HANDOFF.md).
