# PI V2.5.1 — Inline Evidence Attachments Local Certification

Date: 2026-10-18  
Status: **PASS — LOCAL / MOCKED STORAGE ONLY**

## Delivered behavior

- Seller Financial Position exposes compact **Attach Evidence** actions for original mortgage, estimated balance, verified payoff, delinquent taxes, proposed sale price and each individual lien.
- The reusable control is also available for analyst evidence, comparable-sale support, rehabilitation, ARV/exit value, purchase support and closing-cost inputs.
- Analysts may upload a new PDF/JPEG/PNG through the existing V2.5 scanner workflow or link an existing document without duplicating its bytes.
- Links bind the durable Property, scenario revision, exact evidence-field key, document ID and immutable document version.
- One field may have multiple links; one immutable version may support multiple fields.
- Linked filename, source, source date and review status display inline. Internal IDs, storage paths and hashes remain hidden.
- Preview uses the authenticated private download route and does not navigate away from Guided Analysis.
- Uploading or linking never changes evidence status or verification class. CLEAN means file safety only.
- Saving a scenario preserves attachment associations in the immutable revision and durable scenario link.
- Full Investor Package generation independently rechecks organization/property access, exact version, CLEAN status, version-specific review, confidentiality, redistribution approval and appendix selection.
- Report claim rows reference their appendix number. The appendix index and provenance cover identify supported claims. A single document/version linked to multiple claims is appended once.

## Security and persistence notes

- No second storage system was introduced.
- All bytes remain behind the existing server-side V2.5 service.
- New document versions receive independent review/distribution metadata; approving a newer version does not silently approve an older or different version.
- Malformed scenario links, duplicate field/document/version links and unsafe field keys fail validation.
- Legacy scenarios without `evidenceAttachments` continue to load as an empty link collection.
- Certified financial and Monte Carlo code was not changed.

## Automated results

- `npm run pi:v2.5.1:inline-evidence:test`: **108 passed, 0 failed** on Node 22.12.0.
- `npm run web:build`: **PASS**.
- `node scripts/pi-v2-5-1-inline-evidence-qa.js`: **8 browser checks passed**.
- Mocked document uploads: 1.
- Live uploads: 0.
- Firestore writes: 0.
- Provider requests: 0.
- External browser requests: 0.

The focused suite covers safe scenario persistence, multiple documents per claim through the common data contract, one document supporting multiple claims, exact-version resolution, tenant enforcement inherited from V2.5, fail-closed scanner behavior, confidential/unreviewed exclusion, appendix deduplication and financial/Monte Carlo regression invariance.

## Screenshots

- [Attachment selection dialog](../data/validation/pi-v2-5-1-inline-evidence/01-attach-evidence-dialog.png)
- [Linked mortgage evidence](../data/validation/pi-v2-5-1-inline-evidence/02-linked-mortgage-evidence.png)
- [Restored saved-revision links](../data/validation/pi-v2-5-1-inline-evidence/03-cross-session-restored-links.png)

## Review boundary

No production deployment, live document creation, live Firestore write or provider request was performed. Routine live use remains governed by the existing V2.5 authenticated private-development controls.
