# PI V3.1 Administration Console

## Release scope

V3.1 replaces the original long commercial-administration page with an organization-scoped console containing four tabs: Organizations, Users & Invitations, Billing & Credits, and Activity & Audit.

Every displayed metric and action is loaded through one server-authorized organization overview. A Platform Administrator may change the selected organization. An Organization Administrator is restricted to the organization in the verified Firebase session. The browser remembers a selection only as a convenience; it is never accepted as authorization.

## Implemented controls

- Searchable organization context and organization list, protected Workside internal organization, display-name updates, confirmed suspension, and reactivation.
- Firebase identity metadata for account state, email verification, and last sign-in without exposing passwords or credentials.
- Dedicated invitations with expiration, resend/reissue, revocation, and server-side prevention of duplicate active invitations.
- Server-authorized role changes, prohibition on Organization Administrators granting platform roles, and protection for the last active Organization Administrator.
- Password-reset support and a clear handoff to the existing signed-in Firebase verification-email flow. Administrators cannot override verification.
- Report-specific grants and revocation for Report Viewers without expanding their application capabilities.
- Current credit balance and historical purchased, complimentary, consumed, refund, and dispute totals; plain-language ledger entries; confirmed complimentary grants using the existing idempotent ledger.
- Read-only Stripe mode, configured product, provider-sourced unit price, webhook state, payment totals, refunds, and disputes. No secret value is returned.
- Organization-scoped properties, reports, provider requests, estimated provider spending, active users, failures, and a filterable audit timeline. Raw records remain expandable and sensitive field names are redacted.
- Responsive primary navigation with single-line desktop links and horizontal mobile overflow.

## Security invariants

- Firebase Authentication, Firestore organization paths, Stripe pricing, credit-ledger transactions, report storage, and provider-research authorization were not rebuilt.
- Organization selection is reauthorized on every API call.
- Workside cannot be suspended.
- Suspension does not delete Firebase users or application records.
- Report Viewers remain excluded from research, underwriting edits, uploads, billing administration, and other organizations.
- No provider request, Stripe charge, document upload, invitation resend, role mutation, suspension, or credit grant was performed during release verification.

## Focused certification

`npm run pi:v3.1:test` covers organization isolation, selected-organization API behavior, safe Firebase identity projection, duplicate invitations, the last-administrator invariant, role authorization, password-reset boundaries, report grant/revocation, credit idempotency, Stripe webhook behavior, prior V3 beta flows, and authentication regressions.

`npm run web:build:netlify` is the deployment-equivalent frontend build.

`npm run pi:v3.1:production:verify` is read-only. It verifies the live Firestore data through the same repository and overview service without changing records. The accepted baseline is:

- GNZ Marketing LLC: active, three available complimentary credits, zero reserved credits, zero properties, one preserved pending Organization Administrator invitation.
- Workside Software: one available credit and two durable properties.

## Known boundaries

- Firebase does not provide an administrator API that sends a verification email on another user's behalf without a separate transactional-email delivery integration. Users continue to request the standard Firebase verification email from the secure account/sign-in flow.
- Provider spending is explicitly labeled as an estimate because the retained request records do not contain confirmed invoiced cost.
- Future credit bundles are presentation-ready but no bundle products or purchase behavior are introduced in V3.1.
- Generated screenshots are retained locally under `data/validation/pi-v3-1-production/` and excluded from Git as regenerable QA artifacts.
