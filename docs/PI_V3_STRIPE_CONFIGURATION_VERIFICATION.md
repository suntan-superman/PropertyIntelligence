# Property Intelligence V3.0 — Stripe Configuration Verification

Status: **NO-GO for payment activation**. Production remains safely disabled.

Verified against Netlify deploy `6ad83d9e9a77b286d8330490` / commit `af8e5cd2532fee147ae0dce3ebfd2a851a1c6795` on 2026-10-20 (America/Los_Angeles).

## Production configuration

- `STRIPE_SECRET_KEY`: present, Stripe **LIVE** mode, accepted by Stripe read-only API.
- `STRIPE_PRICE_ID`: present, but Stripe returns `404 resource_missing` for this live account.
- `STRIPE_WEBHOOK_SECRET`: present.
- Success and cancel URLs: present, HTTPS, and same-site.
- Webhook endpoint: `https://worksidepropertyintelligence.netlify.app/api/commercial/stripe/webhook`.
- Webhook: enabled, live mode, and subscribed to `checkout.session.completed`, `charge.refunded`, and `charge.dispute.created`.
- An unsigned webhook request reaches the endpoint and fails closed with `STRIPE_SIGNATURE_INVALID`.
- Anonymous Stripe-readiness access fails with `SESSION_COOKIE_MISSING`.
- Authenticated Checkout fails closed with `STRIPE_CHECKOUT_DISABLED`.
- `PI_EXTERNAL_BETA_ENABLED=false`.
- `PI_STRIPE_CHECKOUT_ENABLED=false`.
- `PI_STRIPE_LIVE_MODE_ENABLED=false`.

No Checkout Session, payment, refund, dispute, credit grant, Firestore write, external invitation or live charge was created during verification.

## Confirmed defect

The configured Price ID is not retrievable using the configured live secret key. The most likely causes are a test-mode Price copied into the live configuration, a Price from a different Stripe account, or an incorrect identifier. Until corrected, the intended amount, currency, active status and one-time billing type cannot be certified.

Production remediation:

1. Open Stripe Dashboard in **Live mode**.
2. Open **Product catalog → intended Property Intelligence credit product → Pricing**.
3. Confirm the Price is active and one-time, then copy its live `price_...` identifier.
4. In Netlify, open **worksidepropertyintelligence → Project configuration → Environment variables → STRIPE_PRICE_ID**.
5. Replace only the incorrect production Price value. Do not change the live secret key, webhook signing secret or activation flags.
6. Trigger a Netlify production deploy so the function receives the corrected value.

## Isolated test-mode acceptance requirement

A hosted Stripe acceptance was not run because no separately scoped test-mode credentials were made available to an isolated staging deployment. Never put `sk_test_...` values into the production live variables and never use the live key for acceptance payments.

Recommended staging arrangement:

- Stable Netlify deploy alias: `stripe-acceptance--worksidepropertyintelligence.netlify.app`.
- Scope the test key, test Price, test webhook secret and staging return URLs only to the staging/deploy-preview context.
- Keep `PI_EXTERNAL_BETA_ENABLED=false` and `PI_STRIPE_LIVE_MODE_ENABLED=false`.
- Enable Checkout only in that isolated test context.
- Register the staging webhook URL with Stripe in **Test mode**.
- Use synthetic organization/payment data and reconcile the test credit ledger after success, failure, cancellation, duplicate delivery, refund and dispute checks.

## Acceptance already certified offline

Automated tests verify server-owned pricing, signed webhook enforcement, no credit before webhook confirmation, duplicate-event idempotency, failed/canceled-payment non-credit behavior, compensating refund/dispute entries, organization ownership, concurrent reservation control and browser redirect non-authority. The focused V3 suite passes 124/124. These tests do not substitute for one Stripe-hosted test-mode Checkout acceptance.

## Final activation checklist

The single owner go-live approval must not be requested as executable approval until both blockers are cleared:

1. Correct live Price is verified as active, one-time, and the intended amount/currency.
2. Isolated Stripe-hosted test-mode acceptance passes.
3. Production webhook remains enabled and signed-event verification passes.
4. Credit ledger reconciles exactly after purchase, duplicate event, refund and dispute tests.
5. External beta, Gabe organization/invitation and the one-time three-credit grant remain pending the combined owner approval.

