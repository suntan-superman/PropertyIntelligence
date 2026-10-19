# PI V2.5 — Supporting Documents and Investor Report Appendices

## Local certification status

PI V2.5 is implemented and locally certified with mocked Firestore and private object storage. No live Cloud Storage upload, Firestore write, provider request, or production deployment was performed.

## Implemented workflow

- A Supporting Documents register is available from Seller & Property Evidence and from the Documents action on a saved property in My Workspace.
- Uploads support PDF, JPEG, and PNG with a 10 MB maximum.
- Metadata includes document type, description, source, source date, upload date, uploader, review status, confidentiality, redistribution permission, evidence claim, immutable version, and SHA-256 hash.
- Documents can be downloaded only through an authenticated server route. The UI never receives a storage object path or unrestricted download URL.
- Every uploaded document and every new immutable version starts unreviewed, not approved for redistribution, and excluded from appendices. Upload payloads cannot confer review status; analysts must use a separate review action.
- Only the current version of a reviewed or independently verified, standard-confidentiality, redistribution-approved document can be selected for a Full Investor Package appendix.
- Opportunity Briefs reference eligible supporting evidence but do not embed attachments.
- Full Investor Packages contain a numbered appendix index, an identity/provenance cover for each selected document, the original PDF or image content, and global page numbering.
- Diligence readiness distinguishes missing, uploaded-but-unreviewed, reviewed, independently verified, and stale/superseded evidence. Existing material-risk warnings are preserved.

## Security and persistence design

All access is server mediated and organization scoped. Analyst or Administrator role checks protect writes; property access is checked before metadata or bytes are returned. Upload inspection validates size, extension, MIME type, file signature, image dimensions, PDF structure, page count, and prohibited active PDF content. Malware scanning is mandatory and fails closed when unavailable.

Proposed Firestore layout:

```text
organizations/{organizationId}/properties/{propertyId}/supportingDocuments/{documentId}
organizations/{organizationId}/properties/{propertyId}/supportingDocuments/{documentId}/versions/v000001
organizations/{organizationId}/documentHashes/{sha256}
organizations/{organizationId}/documentAuditEvents/{eventId}
```

Storage objects use server-generated private keys beneath the organization and property. Writes use generation preconditions, objects are marked private with `no-store`, and client Storage rules deny all reads and writes. Hash reservations are transactional to prevent duplicates and concurrent races. Metadata and object versions are immutable; review changes do not rewrite original source identity.

Relevant configuration proposals:

- `config/storage.rules.proposed` — deny all client Cloud Storage access.
- `config/firestore.rules.proposed` — existing deny-all direct client access remains applicable.
- `.env.example` — documents the inactive `PI_FIREBASE_STORAGE_BUCKET` setting.

## Local QA

- Focused document/security and regression tests: 43 passing.
- Browser acceptance: 17 checks passing.
- Browser console errors: 0.
- External/provider requests: 0.
- Live Cloud Storage uploads: 0.
- Live Firestore writes: 0.
- Web production build: passing.

Browser QA covers upload/download behavior, tenant and role isolation, immutable versions, duplicate rejection, malicious and malformed inputs, scanner fail-closed behavior, confidentiality and redistribution gates, source provenance, report inclusion, appendix ordering and pagination, and the saved-property Documents action.

Artifacts are in `data/validation/pi-v2-5-supporting-documents/`, including `qa-results.json`, browser screenshots, and `full-investor-package-with-appendix.pdf`.

## Required approval and configuration before live use

Live document storage remains intentionally disabled. A later, explicit approval is required before the following actions:

1. Confirm or create the private Cloud Storage bucket for Firebase project `property-intelligence-8238b`.
2. Configure `PI_FIREBASE_STORAGE_BUCKET` locally.
3. Review and deploy the proposed deny-all client Storage and Firestore rules.
4. Select and configure an approved malware-scanning service. Startup must inject that scanner; the service will not bypass it.
5. Wire the Firebase document service into normal startup and run one isolated, non-production live storage acceptance test.

The existing financial, Monte Carlo, scenario, evidence snapshot, and report calculation engines were not modified.
