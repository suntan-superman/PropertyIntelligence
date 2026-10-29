# PI V3.2.1 — Investor Report Final Polish

Status: locally certified; production deployment verification recorded below.

## Scope and result

This pass updates report presentation and the associated editing controls without changing the certified financial, MAO, or Monte Carlo engines. Historical report revisions and immutable property-photo objects remain unchanged.

- Blank photo captions now render as a professional category label instead of “Untitled property photo.”
- Capture date, date provenance, upload date, and an unknown capture date are distinct. A missing date renders as “Photo date not provided.”
- Checklist pagination uses content weights and balanced page groups. The nine Tyler items fit legibly on one page; 3, 6, 9, 12, and 18-item shapes have focused coverage.
- New report finalizations use the authenticated user’s professional display name and optional title plus the server-authorized organization name. Missing names fall back to “Authorized Property Intelligence Analyst.” Internal UIDs, organization IDs, tokens, and role identifiers are not rendered.
- Incomplete-cost reports now use “Gross spread before unentered expenses” and “Illustrative ROI — incomplete costs.” The return-hurdle MAO remains conditional.
- Current occupancy, advertised delivery, and verified possession are separate evidence facts. Analysts can explicitly record a Vacant delivery claim from Wholesaler marketing information as source-reported and unverified; it does not close occupancy or possession diligence.
- Duplicate report/checklist actions are guarded in the browser, and conflict responses now explain that no duplicate mutation was performed.

## Console findings

The supplied console messages had three different causes:

1. Google Maps’ legacy `google.maps.Marker` deprecation was actionable. The comparable-sales map now loads the marker library and uses `AdvancedMarkerElement`.
2. The Microsoft Edge lazy-image message is a browser optimization notice, not an application failure. Lazy loading remains appropriate for the private gallery.
3. HTTP 409 responses are fail-closed conflict protection, not evidence that the downloaded R3 files are corrupt. They can occur when rapid UI actions overlap an in-progress PDF render, submit a duplicate report request, or use a stale checklist version. Single-flight UI guards prevent overlapping submissions and preserve the server’s existing idempotency and concurrency checks.

## Exact Tyler R3 local certification

Read-only production inputs were used for 603 Tyler St, Taft, CA 93268, scenario `ff0642bd-92e6-4d0f-b81c-538f0245aaa1`, revision 3, saved `2026-10-29T17:04:27.924Z`. The evidence fingerprint remained `d54042040bb503c43b7645004b87bf1aa244149b9827b06a7266f581fd77c2dc`.

- Firestore writes: 0
- Storage writes: 0
- Provider requests: 0
- Stripe charges: 0
- Selected existing photos: 12
- Opportunity Brief: 1 page, no overflow, SHA-256 `637581120eac4ccc870ef250d9304c1d0eadc3ba57ec2b2e983a5b7f8d08d562`
- Full Investor Package: 16 pages, all pages inspected, no out-of-bounds content, SHA-256 `5d09034d54af6d466792ed0639491c6e5fd45f22434fcd1dd8920361860204b8`
- The prior 17-page R3 package remains unchanged; the orphan checklist continuation was removed only from the newly rendered local QA artifact.

Local deliverables are retained under `data/validation/pi-v3-2-1-investor-report-final-polish/` and intentionally ignored by Git because PDFs and page images are reproducible binary artifacts.

## Financial invariance

The canonical projection before and after presentation rendering is identical. Projection SHA-256: `45921078a05a18d2d713b5b7fa3b0a124bfd7dcd82cfb18a09bd66edcf75bbce`.

Key unchanged Tyler values:

- Modeled result: $45,000
- Total entered project cost: $125,000
- ROI / cash-on-cash: 36%
- Conditional return-hurdle MAO: $124,500
- Monte Carlo iterations: 1,000
- Probability of modeled loss: 0 in the saved simulation (not a guarantee of no tail risk)

## Verification

- V3.2.1 focused report/security suite: 106 passed
- V3.2 property-photo/report suite: 48 passed
- V3.1 authentication, commercial, organization-isolation suite: 39 passed
- V2.8.2 report, calculations, documents, MAO, and Monte Carlo suite: 138 passed
- Production web build: passed
- Production dependency audit: 0 high-severity production vulnerabilities

The broad historical umbrella runner was also sampled: 583 of 625 tests passed. Its 42 failures are offline-network, locally absent frozen-artifact, and legacy UI/report-text assertions outside the current focused contracts; the V3.2.1-focused suites above pass completely. The certified report-version identifier was deliberately left unchanged because V3.2.1 is presentation-only.

## Production release

- Git commit: `PENDING_DEPLOYMENT`
- Netlify deploy: `PENDING_DEPLOYMENT`
- Production health: `PENDING_DEPLOYMENT`
- Authenticated boundaries: `PENDING_DEPLOYMENT`
- Release classification: `PENDING_DEPLOYMENT`

## Remaining limitations

- The application does not infer photo dates or captions. “File metadata” is an explicit provenance selection and should be used only when the date was read from the original file.
- Existing historical report attribution and captions are immutable; the improved presentation appears only in newly generated reports.
- Advertised vacant delivery remains unverified until appropriate occupancy, contract, and lawful-possession evidence is reviewed.
