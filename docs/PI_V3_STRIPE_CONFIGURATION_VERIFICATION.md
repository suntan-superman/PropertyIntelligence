# Property Intelligence V3.0 — Stripe Configuration and Live Payment Acceptance

Status: **GO for private owner payment use and the invitation-only GNZ Marketing LLC beta. Public self-registration remains unavailable.**

Final verification was completed on 2026-10-20 (America/Los_Angeles) against Netlify production deploy `6ad845be080a72bf75bba7f1`. No external organization, invitation, onboarding flow, or public beta access was enabled.

## Production configuration

- `STRIPE_SECRET_KEY`: present, Stripe **LIVE** mode, and accepted by Stripe.
- `STRIPE_PRICE_ID`: `price_1USql71P3zfcOCVWYU5XombR`.
- Product: **Property Intelligence New Property**.
- Price: active, live, one-time, **$1.00 USD** for the bounded owner acceptance.
- `STRIPE_WEBHOOK_SECRET`: present and validated against the live endpoint.
- Success and cancel URLs: present, HTTPS, and same-site.
- Webhook endpoint: `https://worksidepropertyintelligence.netlify.app/api/commercial/stripe/webhook`.
- Webhook: enabled, live, with coverage for `checkout.session.completed`, `charge.refunded`, and `charge.dispute.created`.
- `PI_EXTERNAL_BETA_ENABLED=true` as of the bounded GNZ Marketing LLC activation on 2026-10-20. Access still requires a Firebase account with server-issued organization and role claims; the application has no public self-registration flow.
- `PI_STRIPE_CHECKOUT_ENABLED=true`.
- `PI_STRIPE_LIVE_MODE_ENABLED=true`.
- Owner organization: `property-intelligence-local`.

No secret key, webhook signing secret, card data, private Storage URL, or Firebase credential was written to this report or exposed to the browser.

## Live acceptance result

One owner-authorized live Checkout was completed:

- Checkout mode: `payment`.
- Checkout result: `complete` / `paid`.
- Charged amount: **$1.00 USD**.
- Credit quantity: `1`.
- Organization metadata: `property-intelligence-local`.
- Stripe event: `evt_1USrTc1P3zfcOCVWdKfAUUMF` (`checkout.session.completed`).
- Stripe pending webhook count after correction: `0`.
- Firestore credit ledger: exactly one `PURCHASED_CREDITS` entry for `+1`.
- Final available balance: `1`; reserved balance: `0`.
- No credit existed before confirmed payment and webhook processing.
- No browser redirect or client request granted credit.

The same Stripe event reached the application twice after webhook recovery. Both signed deliveries were audited, while the event source ID produced only one credit-ledger entry. Duplicate-delivery idempotency therefore passed in the live workflow.

## Defects encountered and disposition

### Incorrect Price value

The initial `STRIPE_PRICE_ID` contained a comma-separated Price ID and Product ID. Stripe correctly returned `404 resource_missing`. The value was corrected to the intended live `price_...` identifier in local and Netlify production configuration, followed by a production redeploy.

### Webhook signing-secret mismatch

The first paid event reached Netlify but failed closed with HTTP 400 before Firestore processing. A non-actionable signed probe established that local and Netlify shared the same secret, while Stripe used a different live endpoint secret. The endpoint's actual signing secret was copied directly into local and Netlify configuration without exposing it, and production was redeployed. Resending the original event then succeeded; no second Checkout or charge was created.

The original failed webhook delivery remains visible in Stripe's delivery history. It was not erased or reclassified.

### Return to sign-in during the acceptance

The acceptance Checkout was created from an authenticated server harness and opened separately, so the browser that completed payment did not have an established PI application session. Returning to the sign-in view was expected for that harness path and had no authority over credit issuance. Normal in-application Checkout starts from an authenticated PI browser session.

## Security and regression verification

- Anonymous Checkout: rejected with `401 SESSION_COOKIE_MISSING`.
- Unsigned or incorrectly signed webhook: fails closed.
- Server owns the configured Price; the browser cannot submit an amount or alternate Price ID.
- Organization ownership comes from the authenticated server session and signed Checkout metadata.
- Credit is granted only for a paid `checkout.session.completed` event.
- Repeated delivery is idempotent by Stripe event source ID.
- Refund and dispute handling uses compensating ledger entries; historical entries are not rewritten.
- External access remains invitation-only and organization-scoped.

Focused tests run after live acceptance:

- `tests/pi-v3-commercial.test.js`
- `tests/pi-v3-beta-rehearsal.test.js`
- `tests/netlify-auth.test.js`
- Result: **19 passed, 0 failed**.

These automated tests cover canceled/failed payment non-credit behavior, signed webhook enforcement, duplicate-event idempotency, refunds, disputes, organization isolation, concurrent credit reservation, and redirect non-authority. At the owner's direction, separate live charges for failure, cancellation, refund, and dispute cases were not performed.

## Operational disposition

Stripe Checkout and webhook-based credit issuance are accepted for private owner use and the specifically authorized GNZ Marketing LLC beta organization. The production Price remains the owner-approved $1 acceptance amount until the intended commercial amount is separately configured and reverified.

The GNZ organization, invitation, and complimentary grant were provisioned only after separate authorization. Their exact activation record is maintained in `docs/PI_V3_GNZ_MARKETING_BETA_ACTIVATION.md`. This does not authorize public registration, another external organization, or unrestricted onboarding.
