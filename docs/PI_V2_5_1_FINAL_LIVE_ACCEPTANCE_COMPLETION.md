# PI V2.5.1 Final Live Acceptance Completion

## Outcome

**NO-GO — LIVE RESTORATION PASSED; REPORT APPENDIX ELIGIBILITY FAILED**

The final authorized completion attempt restored the exact Decatur property and QA scenario in fresh authenticated sessions, displayed all five inline evidence links, and completed one authenticated document preview. It then generated the single authorized QA report.

The run stopped during local PDF verification at `2026-10-19T15:43:59.025Z`. The downloaded report contains 15 pages and no appended source documents. Page 15 states that no approved supporting documents were selected for investor distribution.

No retry, cleanup, record deletion, replacement upload, scan, review, evidence-link operation, or scenario save was performed.

## Root cause

This is an application persistence defect rather than a document-register count issue.

The supporting-document service updates review and redistribution rights in both the parent record and its in-memory `versions` array. The Firestore repository's `update` implementation strips `versions` from the parent write and does not update the corresponding `versions/v000001` document. As a result:

- Parent document metadata is `REVIEWED`, `APPROVED`, and selected for an appendix.
- The immutable version record retains its original upload-time eligibility fields.
- Report eligibility intentionally prefers version-level rights when those fields exist.
- All three requested versions are rejected before Storage reads and inclusion-audit events.
- The generated report contains an empty appendix index.

The page-number assertion also expected the appendix-renderer format `Page N of total`. Because no appendices were selected, the base renderer retained its valid `N / total` footer format. That assertion exposed the empty-appendix result but is not the underlying failure.

## Successful live restoration

- Administrator authentication succeeded.
- Organization membership resolved through `/api/auth/me`.
- The exact property ID, subject reference, evidence snapshot, QA scenario ID, and revision were restored.
- All five evidence associations matched the three authorized document IDs at immutable version 1.
- The document register contained the three authorized records plus the preserved earlier V2.5 document.
- The preserved fourth document was not selected or modified by the browser workflow.
- Seller financial and rehabilitation links rendered in the browser.
- One authenticated preview succeeded.
- The corrected financial projection matched the source scenario before the live mutation phase.

## Resource accounting

The live code path and resulting PDF establish the following operation count:

| Resource | Used in final attempt | Cumulative acceptance usage | Original ceiling |
| --- | ---: | ---: | ---: |
| Storage reads | 1 | 4 | 7 |
| Firestore writes | 3 | 32 | 35 |
| Audit events | 1 | 10 | 13 |
| QA reports | 1 | 1 | 1 |
| New uploads | 0 | 3 | 3 |
| Scanner invocations | 0 | 3 | 3 |
| New scenario revisions | 0 | 1 | 1 |
| Provider requests | 0 | 0 | 0 |
| Automatic retries | 0 | 0 | 0 |

Breakdown:

- Authenticated preview: one Storage read and one `DOCUMENT_DOWNLOADED` audit write.
- Report assembly: zero Storage reads and zero inclusion audits because version-level eligibility rejected all three requested versions.
- Report persistence: two Firestore writes—one report revision creation and one property audit-metadata update.

The report ceiling is exhausted. Three Storage reads, three Firestore writes, and three audit events remain under the original numeric ceilings, but they are not authorized for use after this stop.

## Generated artifact

- Filename: `QA_NOT_FOR_DISTRIBUTION_400_Decatur_St_Bakersfield_CA_93308_Full_Investor_Package_2026-10-19_R1.pdf`
- SHA-256: `b99ea91b9dd04584dea0a944d90cd23f18aaa6fea5ce7c52b81945097bb75273`
- Pages: 15
- Status: **FAILED ACCEPTANCE ARTIFACT — EMPTY SUPPORTING-DOCUMENT APPENDIX**

The report must not be treated as the accepted V2.5.1 package and must not be overwritten or deleted without separate authorization.

## Data integrity disposition

No code path wrote property evidence, scenario revisions, document parents, document versions, Storage objects, or the preserved fourth document. The report-link transaction created the expected new report record and updated only the property's mutable `updatedAt` and `lastEditedBy` audit fields.

A post-write live readback was not performed because the authorization required an immediate stop after an application/integrity failure. These statements are based on the instrumented executed code path and the locally received report, not a subsequent live query.

## Required remediation before another report attempt

1. Correct the Firestore document-update transaction so the reviewed version's eligibility metadata is persisted consistently with the parent record.
2. Add Firestore-adapter regression coverage; the memory repository currently masks this difference.
3. Prepare a controlled backfill for the three existing version records without changing file bytes, hashes, scans, parent evidence links, or scenario data.
4. Decide how to disposition the already-created empty QA report without deleting or overwriting historical audit evidence.
5. Use a new immutable report revision ID if another report is authorized.
6. Update PDF verification to accept both supported footer formats while continuing to require appendices for this acceptance.

## Recommendation

**NO-GO for routine authenticated inline-attachment reporting.**

Cross-session restoration and authenticated inline preview passed. Report inclusion cannot be accepted until the Firestore version-rights persistence defect is corrected and the three existing versions are repaired under a separately bounded authorization.
