# Property Intelligence V3.0 — Commercial Beta Readiness

Status: production-readiness implementation complete; external beta and Stripe live mode remain disabled pending owner approval.

## Architecture

V3 extends the existing authenticated Netlify/Firebase application. It does not replace the durable property, retained evidence, supporting-document, PDF, underwriting, MAO or Monte Carlo systems.

- Firebase Authentication remains the identity provider. The server verifies session cookies, organization claims, roles, email verification and explicit provider-research claims.
- Netlify Functions remain the only browser-accessible business API. Firestore and Cloud Storage are accessed with Firebase Admin SDK credentials.
- Firestore client rules remain deny-all. Organization data is stored beneath `organizations/{organizationId}`.
- Generated finalized reports are stored privately at `organizations/{organizationId}/generated-reports/{reportId}.pdf`. Downloads require an authenticated organization member and an explicit report grant for Report Viewers; SHA-256 is verified before bytes are returned.
- Existing private document storage, ClamAV eligibility, immutable versions, confidentiality, redistribution and SHA-256 checks are unchanged.

### V3 Firestore records

The commercial adapter uses these organization-scoped subcollections:

- `checklistStates` — current versioned working state bound to property, scenario revision and evidence snapshot.
- `reportFinalizations` — immutable acknowledgment and attribution records.
- `commercialCreditState/balance`, `creditLedger`, `creditSources`, `creditReservations`, `propertyEntitlements` — atomic credit balance, idempotency, reservations and property unlocks.
- `members`, `invitations` — organization directory and expiring invitation lifecycle.
- `generatedReports`, `reportAccess` — immutable private report manifest and explicit viewer grants.
- `commercialAudit` — material commercial, administrative and finalization events.

No provider credentials, Stripe secret, session cookie, private Firebase UID or private Storage URL is exposed in report content or browser records.

## Phase A — Interactive due diligence

- Every derived checklist item has stable identity, notes, assignee, optional due date, reviewed/unavailable/reopened status, evidence attachment and Guided Analysis navigation.
- Progress persists across authenticated sessions with optimistic concurrency. A stale browser gets `CHECKLIST_VERSION_CONFLICT` rather than overwriting newer work.
- Documents reuse the existing V2.5/V2.5.1 attachment component. Upload or review never establishes independent verification.
- Finalization requires the exact approved acknowledgment text and the current checklist version. The immutable server record binds organization, property, scenario revision, evidence snapshot, checklist hash, unresolved counts, Firebase UID, display name, role and timestamp.
- The UID remains audit-only. Investor output shows display name, organization, time, status and unresolved counts and states that finalization is not verification, appraisal or endorsement.
- Full Investor Package attribution was added without changing certified financial or Monte Carlo calculations. Historical reports are not overwritten.

## Phase B — credits and Stripe

- A server-controlled credit unlocks one normalized property identity. Reopening, corrected formatting, retained evidence, assumption edits, documents, checklist activity and report regeneration do not consume another credit.
- Research reserves a credit atomically before a new provider request. Usable research consumes it; failed/interrupted research releases it. Duplicate normalized addresses and concurrent request IDs are idempotent.
- Workside's owner organization is a server-configured, audited owner-funded exception.
- Checkout Sessions are created server-side from `STRIPE_PRICE_ID`; the browser cannot supply an amount. Live secret keys are rejected unless `PI_STRIPE_LIVE_MODE_ENABLED=true`.
- Only a signed actionable webhook changes credits. Purchase, duplicate webhook, failed payment, refund/dispute and out-of-order event behavior is retained in an immutable compensating ledger.
- No subscription or per-PDF charge exists in V3.

Stripe contract tests use a mocked Stripe API and signed webhook payloads. No Stripe test keys are currently configured in Netlify, so no Stripe-hosted test payment or charge was attempted. This must be completed with owner-approved Stripe configuration before external beta activation.

## Phase C — administration and isolation

Roles enforced server-side:

- Platform Administrator — all organizations, users and credits.
- Organization Administrator — own organization administration and analysis.
- Analyst — research, analysis, evidence, checklist and finalization.
- Report Viewer — explicitly granted report list/download only.
- Suspended — no application access.

The Admin portal supports organization create/suspend/restore, member role change, suspend/restore, Firebase password-reset request, invitation/resend/revoke, complimentary credit grants, ledger balance and audit activity. Platform Administrator cannot be assigned by an Organization Administrator. The owner organization cannot be suspended through the commercial service.

Organization suspension is checked during session creation, normal authentication and recent-login verification. All property, scenario, research, document, checklist, report and commercial adapters receive the server-verified organization.

Public registration is not implemented. Administrators never see or set passwords.

## Feature flags and environment

Required existing Firebase/PI variables remain unchanged. Commercial variables are:

- `PI_EXTERNAL_BETA_ENABLED` — default false.
- `PI_STRIPE_CHECKOUT_ENABLED` — default false.
- `PI_STRIPE_LIVE_MODE_ENABLED` — default false and must remain false until final approval.
- `STRIPE_SECRET_KEY` — server-only; test key during acceptance, live key only after approval.
- `STRIPE_PRICE_ID` — authoritative configured Price; amount/currency are never hardcoded in the browser.
- `STRIPE_WEBHOOK_SECRET` — server-only endpoint-signing secret.
- `PI_STRIPE_SUCCESS_URL`, `PI_STRIPE_CANCEL_URL` — same-site return URLs.

The current Netlify project contains no Stripe variables. Deployment with all three commercial flags false is safe and cannot create Checkout Sessions.

## QA certification

Executed on Node 22.12.0:

- V3 focused and integrated suite: 123/123 passed.
- V2.8.2 report/document/financial suite: 138/138 passed.
- Netlify/runtime suite: 27/27 passed.
- Firebase authentication suite: 10/10 passed.
- Durable workspace/guided/financial suite: 48/48 passed.
- Netlify production build passed.
- Synthetic Full Investor Package: 13 pages; no blank/clipped pages; authenticated attribution present; audit UID absent; financial and Monte Carlo projection hash unchanged.
- Provider requests: 0. Live Firestore writes: 0. Storage uploads: 0. Stripe charges: 0.

Synthetic artifacts are in `data/validation/pi-v3-commercial-beta/` and are deliberately labeled as local QA.

## Operating-cost estimate

At a small private beta volume, Firestore will normally remain within its free daily quotas (50,000 reads, 20,000 writes, 20,000 deletes, 1 GiB stored, and 10 GiB monthly outbound transfer for the eligible database); excess use is pay-as-you-go and should be monitored. Cloud Storage, Cloud Run malware scanning, Netlify Functions/PDF compute, bandwidth, RentCast requests and Stripe fees are variable usage costs.

- Stripe's published standard US domestic-card rate is 2.9% + $0.30 per successful transaction. At a $9.99 credit price, the indicative fee is about $0.59 and net before other costs is about $9.40. The configured Stripe Price remains authoritative.
- Netlify's current credit-based plans list Free at $0/300 credits, Personal at $9/1,000 credits, and Pro starting at $20/3,000 credits. Confirm the actual legacy/current team plan in the Netlify billing dashboard.
- Firebase pricing and quotas: <https://firebase.google.com/docs/firestore/pricing>
- Stripe pricing: <https://stripe.com/pricing>
- Netlify pricing: <https://www.netlify.com/pricing/>

Known cost uncertainties: RentCast contract pricing, actual PDF function duration/memory, average appendix download volume, stored-document volume and Cloud Run cold-start/signature-update frequency. Beta usage telemetry should be reviewed before changing the $9.99 proposal.

## Deployment and rollback

Deployment procedure:

1. Run `npm run pi:v3:test`, `npm run pi:v2.8.2:report-quality:test`, `npm run netlify:test`, and `npm run web:build:netlify` under Node 22.12.0.
2. Ensure the three commercial flags are explicitly `false` in Netlify production.
3. Commit and push `main`; deploy the exact commit to the linked Netlify site.
4. Verify `/api/health`, `/api/auth/config`, unauthenticated protection, authenticated Workside workspace, report generation and that checkout returns `STRIPE_CHECKOUT_DISABLED`.
5. Record the Netlify deploy ID and commit SHA.

Rollback procedure:

1. In Netlify: **Deploys → Production deploys → select the previously verified deploy → Publish deploy**.
2. Keep `PI_EXTERNAL_BETA_ENABLED=false`, `PI_STRIPE_CHECKOUT_ENABLED=false`, and `PI_STRIPE_LIVE_MODE_ENABLED=false` during rollback.
3. Do not delete Firestore ledger, checklist, finalization, audit or report records. They are append-only/history-bearing data.
4. If only payments need containment, disable Checkout and live-mode flags without rolling back property/report functions.
5. Revoke any affected Firebase sessions/users if an access-control incident is suspected; do not weaken client deny-all rules.

## Remaining owner-controlled activation

Production readiness does not create Gabe's organization, invite Gabe, grant three credits, enable external beta or activate Stripe live mode. Those remain one final owner approval gate after production verification.

