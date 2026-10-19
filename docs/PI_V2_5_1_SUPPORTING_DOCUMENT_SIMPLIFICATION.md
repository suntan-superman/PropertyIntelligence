# PI V2.5.1 Supporting Document Simplification

Status: local implementation and focused mocked certification complete; no deployment and no live metadata repair performed.

## Root cause

The supporting-document service correctly produced matching report-eligibility fields on the parent document and its current immutable version. The Firestore repository then removed the `versions` array before persisting the parent and never updated the current version subdocument. The document UI therefore displayed the parent as reviewed and selected, while the report generator correctly read the immutable version as pending and excluded it.

The immutable file bytes, SHA-256 hashes, Storage objects and version identities were not defective.

## Minimal correction

The immutable version is now authoritative for report eligibility. The parent document remains a current-version summary for efficient UI display.

- A metadata update runs in one Firestore transaction.
- The transaction reads the parent and current version, verifies the current-version number and immutable identity, writes the parent summary, and updates only the version's eligibility fields.
- Hydration compares both records and fails closed with `DOCUMENT_ELIGIBILITY_INCONSISTENT` when they differ.
- The UI and report generator use the same authoritative version state.
- SHA-256, Storage key, filename, MIME type and version number cannot be changed by an eligibility update.
- Existing approval events and historical reports are not rewritten.

Authoritative fields are `reviewStatus`, `confidentiality`, `redistributionPermission`, `appendixSelected`, `reviewedAt` and `reviewedBy`.

## Simplified workflow

The normal workflow is now Upload → Attach → Include in Report.

The inline evidence card and property document register display one `Include in Investor Report` checkbox. Selecting it records analyst review and redistribution permission through the existing authenticated server endpoint. It never classifies a document as independently verified. Confidential or provider-restricted documents remain excluded. File hashes, scanner details, immutable version data and internal provenance are under `Source Details`.

## Exact proposed repair for existing QA records

A read-only Firestore inspection on 2026-10-19 read the three parent/version pairs only. It performed zero writes, zero Storage reads, zero scanner calls and zero provider requests.

The proposed repair is one preconditioned Firestore transaction updating only these three `versions/v000001` documents:

| Document | Required immutable precondition | Exact eligibility update |
| --- | --- | --- |
| `6f7b1d62-0e91-4da1-9e31-250101000001` | current version `1`; SHA-256 `a6af653d497d3886a84852616b9f46e59ff42e415a739a0f616ae4b8cc5e5a6a`; CLEAN | `reviewStatus: REVIEWED`; `confidentiality: STANDARD` (unchanged); `redistributionPermission: APPROVED`; `appendixSelected: true`; `reviewedAt: 2026-10-19T13:33:49.180Z`; `reviewedBy: d2NTUCs0lGe6C64pDnRGtgTXm0O2` |
| `6f7b1d62-0e91-4da1-9e31-250101000002` | current version `1`; SHA-256 `60b9ebbca8aca57db587eaf422ccecbecbc3964ee13b55a3f9bb7c2a5692728c`; CLEAN | `reviewStatus: REVIEWED`; `confidentiality: STANDARD` (unchanged); `redistributionPermission: APPROVED`; `appendixSelected: true`; `reviewedAt: 2026-10-19T13:33:50.286Z`; `reviewedBy: d2NTUCs0lGe6C64pDnRGtgTXm0O2` |
| `6f7b1d62-0e91-4da1-9e31-250101000003` | current version `1`; SHA-256 `775fbe2d91a5e40a5906c394fe8309b2ccf0be891652d1fdc132ab931172d2c0`; CLEAN | `reviewStatus: REVIEWED`; `confidentiality: STANDARD` (unchanged); `redistributionPermission: APPROVED`; `appendixSelected: true`; `reviewedAt: 2026-10-19T13:33:51.298Z`; `reviewedBy: d2NTUCs0lGe6C64pDnRGtgTXm0O2` |

Full paths share this prefix:

`organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/supportingDocuments/{documentId}/versions/v000001`

The transaction must abort if any parent eligibility value, current-version number, SHA-256, CLEAN status or immutable identity differs from the table. It must not update the parent documents (already correct), property, evidence snapshot, scenario revisions, report revisions, Storage objects, hash reservations, fourth retained document or historical audit events.

Proposed resource budget after separate approval: six Firestore writes—three version updates and three new immutable `DOCUMENT_ELIGIBILITY_REPAIRED` audit events. No Storage reads or writes, uploads, scans, provider calls, scenario writes or report writes are required for the repair itself.

## Focused QA

- Firestore mismatch fails closed: PASS.
- Atomic parent/current-version eligibility update: PASS.
- Immutable identity mutation rejected before writes: PASS.
- Upload, attach and one-click report inclusion with mocked Storage/Firestore/scanner: PASS.
- Excluded/confidential documents remain excluded: PASS.
- Full package appendix, page ordering and due-diligence disclaimer: PASS.
- Certified financial and Monte Carlo regression suite: PASS.
- Browser build: PASS.

The focused V2.5.1 suite passed 114/114 tests. Browser QA passed 9/9 inline checks and 17/17 document/report checks with zero live uploads, live Firestore writes or provider calls.

## Review gate

The local mocked Full Investor Package is a QA artifact, not the requested final post-repair package. The live metadata repair and one final QA investor package remain intentionally pending separate approval.

## 2026-10-19 execution disposition

The separately authorized repair completed exactly as proposed: one transaction, three version updates and three immutable repair-audit creates. The final QA package was not generated because the acceptance harness stopped before reaching the report endpoint. The full before/after comparison, strict failure record, resource accounting and NO-GO disposition are documented in [PI_V2_5_1_FINAL_THREE_DOCUMENT_REPAIR_RESULT.md](PI_V2_5_1_FINAL_THREE_DOCUMENT_REPAIR_RESULT.md).
