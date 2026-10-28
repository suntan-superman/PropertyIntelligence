# PI V3.2 Property Photo Gallery and Investor Report Polish

## Release scope

PI V3.2 adds an organization-scoped property-photo workflow to Step 4 of Guided Analysis. The normal workflow is **Upload → Organize → Select for Report → Generate PDF**. It reuses Firebase Authentication, the durable-property workspace, private Firebase Storage, Firestore, the existing ClamAV service, and server-authorized report generation.

No underwriting, MAO, Monte Carlo, provider-research, supporting-document, or payment calculation was changed.

## User workflow

- Upload JPEG, PNG, or WebP images in a batch.
- Maximum original size is 10 MiB, maximum active gallery size is 30, and maximum report selection is 12.
- Edit caption, source, capture date, category, and the optional condition/rehabilitation association.
- Preview, reorder, select a cover image, select report images, or soft-remove an image.
- Confirm: “I confirm that I have permission to use and distribute the selected photographs in this report.”
- Save the scenario revision and generate the report.

The acknowledgment binds the authenticated user, organization, timestamp, exact immutable photo versions, selection fingerprint, scenario ID, and revision. An unchanged selection can carry forward; a changed selection requires a new acknowledgment.

## Storage and security design

Firestore metadata uses:

`organizations/{organizationId}/properties/{propertyId}/propertyPhotos/{photoId}`

Immutable version metadata uses:

`organizations/{organizationId}/properties/{propertyId}/propertyPhotos/{photoId}/versions/v000001`

Private Storage objects use:

`organizations/{organizationId}/properties/{propertyId}/photos/{photoId}/versions/v000001/`

Each upload is checked for authenticated organization/property access, role, declared size/type, filename extension, binary signature, successful bounded image decode, maximum pixel count, SHA-256 integrity, and a fresh CLEAN ClamAV result. Scanner failure, stale signatures, hash mismatch, or any non-CLEAN result fails closed.

The protected original is not transformed. Reports and previews use a bounded JPEG derivative created after auto-orientation; EXIF/GPS metadata is absent from the derivative. Storage URLs and object paths are not returned in gallery records. Preview bytes are returned by an authenticated, `private, no-store` server route.

Netlify buffered functions cannot carry a 10 MiB image. Production therefore issues a ten-minute V4 upload-only URL for one exact private object path. The browser performs one conditional PUT (`if-generation-match: 0`), then an authenticated completion request downloads, validates, scans, hashes, derives, and registers the object. The URL cannot download an object, cannot overwrite an existing generation, and does not bypass server-side completion. The Firebase bucket CORS policy is restricted to the production origin and PUT.

Removing a gallery item is a metadata soft deletion. Original and derivative objects are retained, and historical reports continue to resolve the exact recorded version. This release does not provide a destructive object-deletion action.

## Report behavior

- Full Investor Package: optional cover image, then a Property Photo Overview and balanced Property Condition & Rehabilitation Photos pages.
- Opportunity Brief: one optional thumbnail without adding a second page.
- No eligible selection means the existing text-only cover and no empty photo section.
- Cover fallback is the selected cover, otherwise the first selected Exterior image, otherwise the first selected image.
- Reports record exact photo ID, immutable version, derivative SHA-256, caption, category, and cover status.
- The report states that photo dates, condition, and authenticity are not independently verified and that photos do not replace an on-site inspection.

Comparable-sales report rows are explicitly paginated in balanced groups. Current occupancy, advertised delivery condition, and verified possession/vacancy are presented as separate claims; advertised vacant delivery does not establish possession.

## Local certification

The actual retained 603 Tyler St, Taft scenario was captured through a read-only Firebase script into a sanitized local fixture. All upload, Storage, Firestore, scanner, and report-photo operations used isolated in-memory test doubles and synthetic images clearly marked as non-authentic QA material.

Certification command:

`npm run pi:v3.2:photos:qa`

Focused regression command:

`npm run pi:v3.2:photos:test`

Outputs are generated under `data/validation/pi-v3-2-property-photos/` and intentionally ignored by Git. The run generates four PDFs (brief/full, with/without photos), every rendered page, contact sheets, gallery/upload screenshots, and `qa-results.json`.

The certified Taft inputs remain acquisition $105,000, rehabilitation $20,000, exit $170,000, and as-is AVM $183,000. The deterministic output remains $45,000 modeled profit, 36.0% project ROI, and $124,500 return-hurdle MAO. The deterministic and Monte Carlo analysis hash is identical with and without photos.

## Production activation and rollback

1. Apply `config/firebase.storage.cors.json` to the existing private bucket. Do not create a bucket or make it public.
2. Deploy the existing Netlify site from `main`.
3. Verify health, authenticated gallery GET, upload UI, and report preview without uploading synthetic images.

Rollback is application-only: restore the prior Netlify deploy (or revert the V3.2 commit and redeploy), then restore the prior bucket CORS policy if necessary. Existing photo objects and metadata remain private and are not deleted during rollback. Firestore client rules remain deny-all; all access stays server-authorized.

## Known operational boundary

The V3.2 UI creates new photo identities. It does not offer replacement of immutable bytes within an existing photo identity; replacement is a new upload, preserving historical report reproducibility.
