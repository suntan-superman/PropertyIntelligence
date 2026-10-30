# Property Intelligence V3.4 — Investor CRM and Deal Distribution

## Release scope

V3.4 adds an organization-private investor CRM, spreadsheet import review, deterministic deal matching, immutable-report campaigns, secure recipient access, response capture, and observed deal-velocity reporting. The Final Owner Amendment controls the implementation: Platform Administrators can select and manage any organization through the existing Administration console; customer administrators remain restricted to their own organization.

No RentCast, Stripe, financial-calculation, Monte Carlo, document, photo, or report-rendering behavior is changed by this release.

## Data ownership and paths

All investor business data is owned by the selected organization and is accessed only through Firebase Admin on the authenticated server:

- `organizations/{organizationId}/investors/{investorId}`
- `organizations/{organizationId}/investorImportRuns/{runId}`
- `organizations/{organizationId}/investorImportMappings/{templateId}`
- `organizations/{organizationId}/dealCampaigns/{campaignId}`
- `organizations/{organizationId}/campaignRecipients/{recipientId}`
- `organizations/{organizationId}/investorActivities/{activityId}`
- `organizations/{organizationId}/commercialAudit/{auditId}`
- `investorReportAccess/{sha256Token}` — global lookup contains only a one-way token hash plus the immutable organization/campaign/investor/report binding

Firestore client access remains deny-all. Browser-provided organization, role, investor, report, scenario, and revision values are not trusted. The server reauthorizes each request and campaign creation independently verifies the immutable generated-report manifest.

## Roles

| Role | Investor access |
| --- | --- |
| Platform Administrator | View and manage any selected organization; cross-organization detail/report access is audit logged |
| Organization Administrator | View and manage only their own organization |
| Analyst | Read directory, matching, campaigns and metrics for their own organization; cannot create/update/import/distribute |
| Report Viewer | No Investor CRM access |

Changing the organization query parameter never grants authority.

## Profile and privacy model

Profiles preserve contact details, mailing address, investment criteria, geography, numeric acquisition range, strategy, funding preference, capability classification, proof-of-funds status, consent/suppression state, imported historical context, notes and observed platform metrics.

Proof-of-funds document references are stored as internal references but are removed from all ordinary CRM API responses, matching snapshots, campaigns, emails, and public recipient views. A `CLEAN` or reviewed document never automatically elevates investor capability to independently verified.

Observed response, offer, commitment, closing and withdrawal metrics are calculated from activities. When no activity exists the UI reports zero counts or “Not yet established”; it does not invent performance.

## Import safety

- CSV and XLSX only; 5 MB and 500 rows in the browser workflow.
- XLSX must have one worksheet.
- Formula, shared-formula, hyperlink and external-reference cells are rejected.
- Server normalization rejects spreadsheet formula prefixes and control characters.
- Import is preview-first with mapping, invalid-row and potential-duplicate results.
- Commits require an idempotency key. Created record IDs are deterministic per import run and row, allowing interrupted commits to resume without duplicate creation.
- Duplicate checks use normalized email, normalized phone, or name plus street address.
- Exports prefix formula-leading values before producing CSV.

## Matching

Matching is deterministic. It evaluates property type, strategy, geography, numeric acquisition range, rehabilitation tolerance, active-buying status, contact suppression and deliverability. Every result includes positive reasons, missing criteria and exclusions and is classified as `STRONG_MATCH`, `POSSIBLE_MATCH`, `NEEDS_REVIEW`, or `NOT_MATCHED`. It is not an investment recommendation.

## Distribution and secure access

Campaigns bind one property, immutable scenario revision, immutable generated-report manifest, selected investor list, match snapshot and expiration. Dispatch rechecks active status, explicit `PERMITTED` email state, suppression, hard bounce and deliverable email. It supports idempotency and a maximum batch of 100 recipients.

Recipient tokens are generated with 256 bits of randomness, stored only as SHA-256 hashes, time limited, revocable and bound to one organization, campaign, investor and report. The public portal never receives a Firebase Storage URL. Each download reauthorizes the token and retrieves the expected SHA-256 report object server-side.

Public responses can record interest, showing requests, information requests, declines and offers. Unsubscribe immediately records `OPTED_OUT` and revokes the token.

## Outbound email status

PI has no configured transactional-email provider. V3.4 therefore deploys campaign preparation and secure-access infrastructure with outbound delivery disabled. The Campaigns UI states this explicitly, and the server returns `INVESTOR_EMAIL_DELIVERY_NOT_CONFIGURED`; it never simulates success. A later provider configuration must supply an injected sender with provider message IDs and webhook authentication without changing the CRM security model.

## Threat controls

- Firebase session and CSRF protection for authenticated mutations
- strict organization authorization and audited platform override
- private Firestore server access
- non-enumerable hashed public tokens and no credentials in logs
- same-origin public token API with bounded per-IP/token request windows, no tracking pixels, no public Storage URLs
- immutable report/scenario binding and SHA-256 download verification
- explicit consent, opt-out, bounce and suppression enforcement
- HTML escaping in prepared email content
- input size, row, string, enum, currency and identifier limits
- formula-injection protections on import and export
- fail-closed delivery and expired/revoked/tampered token handling

## Operational acceptance

Automated tests use synthetic investors, deals, reports, sender responses, and in-memory repositories. They exercise customer isolation, Platform Administrator access/audit, role boundaries, PII redaction, formula rejection, row limits, import idempotency, duplicates, deterministic matching, suppression, immutable campaign binding, disabled delivery, dispatch idempotency, hashed token access, tampering, expiration, response capture, unsubscribe/revocation and safe export.

Production verification must be read-only against `property-intelligence-local`. It must not create GNZ Marketing data, send a real email, call a property provider, or alter an existing report/scenario. External beta activation is outside V3.4.
