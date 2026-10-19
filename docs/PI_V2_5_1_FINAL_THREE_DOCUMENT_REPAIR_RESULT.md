# PI V2.5.1 — Final Three-Document Repair Result

Date: 2026-10-19  
Project: `property-intelligence-8238b`  
Organization: `property-intelligence-local`  
Property: `400 Decatur St, Bakersfield, CA 93308`  
Property ID: `52638a00-8167-4cff-85c0-f56a0445a5a9`

## Outcome

**METADATA REPAIR PASSED — QA INVESTOR PACKAGE NOT GENERATED — OVERALL NO-GO**

The authorized six-write metadata repair completed atomically. The subsequent acceptance harness stopped before report generation. No report-side write or private Storage data read occurred. Both strict harness failures and the previously failed historical report remain preserved.

## Metadata repair

One Firestore transaction committed exactly six writes at `2026-10-19T16:13:24.006Z`:

- Three updates to the exact `v000001` immutable-version metadata records.
- Three immutable `DOCUMENT_ELIGIBILITY_REPAIRED` audit-event creates.

No PDF bytes, version numbers, filenames, hashes, scan results, evidence links, scenario records, or historical reports were changed.

| Document | Version path | SHA-256 | Before | After |
| --- | --- | --- | --- | --- |
| `...000001` | `organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/supportingDocuments/6f7b1d62-0e91-4da1-9e31-250101000001/versions/v000001` | `a6af653d497d3886a84852616b9f46e59ff42e415a739a0f616ae4b8cc5e5a6a` | Pending review; redistribution not approved; excluded | Reviewed; standard; redistribution approved; included |
| `...000002` | `organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/supportingDocuments/6f7b1d62-0e91-4da1-9e31-250101000002/versions/v000001` | `60b9ebbca8aca57db587eaf422ccecbecbc3964ee13b55a3f9bb7c2a5692728c` | Pending review; redistribution not approved; excluded | Reviewed; standard; redistribution approved; included |
| `...000003` | `organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/supportingDocuments/6f7b1d62-0e91-4da1-9e31-250101000003/versions/v000001` | `775fbe2d91a5e40a5906c394fe8309b2ccf0be891652d1fdc132ab931172d2c0` | Pending review; redistribution not approved; excluded | Reviewed; standard; redistribution approved; included |

All three remain `CLEAN`; parent and version eligibility now agree exactly. The existing parent review timestamps and administrator identity were copied without alteration.

Repair audit records:

- `organizations/property-intelligence-local/documentAuditEvents/jXdIgnNCjxSDqI4s0n8I`
- `organizations/property-intelligence-local/documentAuditEvents/zS036vPNOpN5XLA0xEv3`
- `organizations/property-intelligence-local/documentAuditEvents/wG9frG5QUAlk3a8Owp2L`

## Harness stops preserved

1. The initial execution stopped after the repair because the document-register endpoint returned `DOCUMENT_ELIGIBILITY_INCONSISTENT` for the preserved fourth historical document `253ed077-bfd7-49a0-a71a-2cfe75271a0a`. The report endpoint was not called.
2. A focused code correction changed list behavior so an inconsistent record remains visible but explicitly blocked and ineligible, rather than hiding every valid document. Direct access, update, download, and report eligibility for the inconsistent record still fail closed.
3. The unused report continuation stopped during browser capture because its wait predicate returned a function instead of waiting for document rows. The captured image is an invalid early-loading artifact and is retained only as failure evidence. The report endpoint again was not called.
4. The wait predicate and fourth-row matcher were corrected locally after the stop. No further live continuation was attempted.

The strict failure files are preserved in `data/validation/pi-v2-5-1-final-three-document-repair/`.

## Focused verification

- 26/26 focused document, Firestore-adapter, inline-evidence, and report-security tests passed.
- The Vite web build passed (84 modules transformed).
- Fresh authenticated `/api/auth/me`, investment bootstrap, and scenario reads passed.
- The document-register endpoint now returns four records rather than HTTP 409.
- The three repaired records are independently recognized as approved.
- The fourth historical record remains unchanged, unapproved, and fail-closed.
- The five QA evidence associations remain present in scenario `6f7b1d62-0e91-4da1-9e31-250101000101`, revision 1.
- The financial and Monte Carlo canonical projections were equal before the live transaction.

Final read-only integrity comparison against the pre-repair baseline confirmed:

- Property record unchanged.
- Evidence snapshots unchanged.
- Scenario revisions unchanged.
- Parent document records unchanged.
- Fourth document and its immutable versions unchanged.
- Historical report records unchanged.
- All other properties unchanged.
- Cloud Storage object manifest unchanged.
- No report record `6f7b1d62-0e91-4da1-9e31-250101000202` exists.

## Resource accounting

| Resource | Actual |
| --- | ---: |
| Firestore repair writes | 6 |
| Firestore report-workflow writes | 0 |
| New QA reports | 0 |
| Private Storage data reads | 0 |
| New uploads | 0 |
| Malware scans | 0 |
| Provider requests | 0 |
| Automatic retries | 0 |

Read-only Firestore/Auth/Storage-metadata preflight and diagnosis operations are not writes and did not read private document bytes.

## Recommendation

**NO-GO for final V2.5.1 acceptance.** The live metadata repair is complete and should not be repeated. Routine authenticated inline attachments remain locally regression-tested, but final acceptance requires one separately authorized report-only continuation using the already repaired records. That continuation must not perform another repair, upload, scan, review, evidence-link, or scenario save.

No appendix screenshots or new QA Investor Package are claimed because report generation never began.
