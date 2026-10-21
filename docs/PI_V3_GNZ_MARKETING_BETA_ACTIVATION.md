# Property Intelligence V3.0 — GNZ Marketing LLC Beta Activation

Classification: **PI V3.0 — GNZ MARKETING BETA ACTIVATED**

Activation completed on 2026-10-20 (America/Los_Angeles) against Netlify production deploy `6ad84a8b123d951e309d1843`.

## Provisioned organization

- Display name: **GNZ Marketing LLC**
- Stable organization ID: `org-7f98dd73-6cc4-4d9a-bca9-3f6dd7dd5b00`
- Status: `ACTIVE`
- Billing policy: `CREDIT_LEDGER`
- Matching production organizations by display name: `1`
- Existing GNZ properties, scenarios, documents, reports, reservations, and entitlements copied from Workside: `0`

The permanent identity is a generated UUID-backed identifier, not the display name. GNZ is not assigned to `property-intelligence-local`.

## Gabe invitation and identity

- Login email: `dirhis19@yahoo.com`
- Invitation ID: `b9e004cc-a91f-434e-ac96-9000c06d12b3`
- Invitation status: `PENDING`
- Invitation role: `Organization Administrator`
- Invitation records for the email: `1`
- Organization member records: `1`
- Member status: `INVITED`
- Firebase account: created, enabled, and initially unverified
- Firebase organization claim: `org-7f98dd73-6cc4-4d9a-bca9-3f6dd7dd5b00`
- Firebase role claim: `Organization Administrator`
- Platform Administrator claim: not granted
- Firebase password: not generated, stored, or transmitted by Property Intelligence
- Activation/password-setup email request: accepted by Firebase
- Invitation-record expiration: `2026-10-24T05:15:29.954Z`

Provider research remains unavailable until Gabe completes Firebase email verification and establishes a fresh authenticated session.

## Complimentary credit ledger

- Grant type: `COMPLIMENTARY_GRANT`
- Quantity: `3`
- Reason: `Initial Commercial Beta`
- Source/idempotency key: `gnz-marketing-initial-commercial-beta-v1`
- Administrator actor: initial Property Intelligence Platform Administrator
- Timestamp: `2026-10-21T05:15:39.206Z`
- Available: `3`
- Reserved: `0`
- Consumed: `0`
- Credit-ledger records: `1`

The identical grant request was submitted once as an idempotency verification. It returned the original ledger entry and left the available balance at three with one ledger record. Credits belong to GNZ Marketing LLC, not Gabe's individual Firebase identity.

## Access and isolation verification

- `PI_EXTERNAL_BETA_ENABLED=true` is live only as the server gate that permits non-owner organizations with valid Firebase claims.
- The web application exposes sign-in, password reset, and invitation activation; it does not expose public account registration.
- GNZ starts with zero properties and cannot inherit Workside records.
- Workside's authenticated workspace remains operational with its two existing durable properties.
- Durable properties, scenarios, documents, reports, checklists, credits, and membership operations resolve organization identity from the verified server session.
- Organization Administrator routes reject attempts to administer a different organization.
- Report Viewer edit restrictions remain enforced.
- Stripe remains live with the existing Price ID and no charge was created during GNZ provisioning.
- No provider request, document upload, scenario save, report generation, or Stripe Checkout occurred during provisioning.

Focused verification result: **29 passed, 0 failed** across Firebase session, CSRF, email verification, durable workspace isolation, commercial organization/role controls, credit accounting, report-viewer restrictions, and the synthetic beta rehearsal suites.

## Gabe activation instructions

1. Open the Firebase password-setup email sent to `dirhis19@yahoo.com` and choose a private password. Property Intelligence administrators cannot see or retrieve it.
2. Open `https://worksidepropertyintelligence.netlify.app` and sign in with that email and the new password.
3. In the authenticated account bar, select **Send Verification Email**.
4. Open Firebase's verification link. Return to Property Intelligence and select **Refresh verification** if the session does not refresh automatically.
5. Confirm the account bar shows **Organization Administrator session · Email verified** before starting provider research.
6. Select **Guided Analysis** to research a property. GNZ begins with three analysis credits; a credit is organization-owned and consumed only through the server-controlled usable-analysis workflow.
7. Save the property to make its workspace, scenarios, evidence, and reports durable.
8. Use the due-diligence checklist in the saved analysis before finalizing an investor report. Outstanding items remain disclosed rather than silently cleared.
9. Open **Documents** on a saved property to upload supporting material. Uploads are private, validated, malware-scanned, organization-scoped, and do not authenticate the underlying claim.
10. Use **Investor Reports** to preview or generate reports. Supporting documents appear only when their security and redistribution requirements are satisfied.
11. Open **Administration** to invite authorized GNZ colleagues and assign Organization Administrator, Analyst, or Report Viewer roles.
12. Use **Purchase 1 credit** in the analysis-credit status panel to open server-priced Stripe Checkout when additional credits are needed.

If the activation link has expired, the Property Intelligence Platform Administrator can resend the existing invitation rather than creating another user or organization.

## Welcome email draft — not sent separately

**Subject:** Your Property Intelligence beta access for GNZ Marketing LLC

Hi Gabe,

Your invitation to Property Intelligence has been created for GNZ Marketing LLC with the Organization Administrator role. GNZ begins with three complimentary property-analysis credits.

Please open the Firebase password-setup email sent to `dirhis19@yahoo.com`, choose your password, and then sign in at:

https://worksidepropertyintelligence.netlify.app

After signing in, select **Send Verification Email** in the account bar and complete Firebase email verification. Return to the application and refresh verification before starting property research.

Use **Guided Analysis** to begin a property analysis. Once a property is saved, its workspace provides scenario management, the due-diligence checklist, private supporting-document uploads, and investor reports. Uploaded documents remain source evidence and are not automatically treated as verified claims.

As the GNZ Organization Administrator, you can invite authorized colleagues and assign organization roles from **Administration**. The analysis-credit panel shows the GNZ balance and provides **Purchase 1 credit** when additional analyses are needed.

Please keep access limited to authorized GNZ personnel during the private beta and report any unexpected access or billing behavior before continuing.

## Future email migration

When a GNZ business email becomes available, update and verify the email on Gabe's existing Firebase UID. Do not create a second user or organization. The existing UID preserves organization membership, role, property access, credit balance, report history, and audit records. Any change must require Firebase reauthentication and verification of the replacement email before a fresh PI server session is established.

## Remaining human step

Gabe must complete password setup and email verification. This is intentionally a user-controlled Firebase action and was not bypassed during provisioning. No additional developer action is required unless the invitation email must be resent after expiration.
