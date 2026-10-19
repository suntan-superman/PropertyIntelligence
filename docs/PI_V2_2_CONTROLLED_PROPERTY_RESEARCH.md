# PI V2.2 — Controlled Property Research

## Result

The local Property Intelligence workspace now has a default-deny, server-controlled path for one RentCast Property Records lookup after retained evidence is searched. The new path does not create a durable Property, does not perform AVM or comparable enrichment, and does not modify a production database.

The acceptance address is `21950 Arosa Road, Tehachapi, CA 93561`. Offline certification used a synthetic response for that exact address. **No live RentCast request was transmitted.**

## Root cause of the former blanket block

`Research New Property` previously displayed a static cost notice only. The local investment server exposed no Property Records preview or execution route, loaded no controlled provider service, and returned retained evidence with `refresh.enabled=false`. Existing Stage A tooling is sealed to a different fixed candidate and cannot safely be repurposed for Arosa.

## Implemented flow

1. PI searches durable Properties and retained preliminary research first.
2. An unmatched address exposes **Research New Property**.
3. `/api/property-research/preview` validates the authenticated server-side user, Analyst/Administrator role, current operational evidence, exact address-bound authorization, quotas and cost limits.
4. PI displays the exact address, provider, endpoint, expected request count, conservative cost and remaining configured/account budget.
5. The user must check an explicit confirmation and select **Confirm and Research**.
6. The server verifies a short-lived HMAC-bound confirmation, rechecks the request authorization, creates an atomic address/user reservation and permits one request.
7. The RentCast client uses the official HTTPS host, a 15-second maximum timeout, no redirects, no pagination, one request maximum for the action and zero automatic retries.
8. A successful response is cached only when retained rights evidence says caching is permitted. Estimated cost and actual billing remain separate ledger fields.
9. Exact supported matches become process-local `PRELIMINARY_RESEARCH` subjects. They can enter Guided Analysis, but are never promoted to a durable or legally verified Property.

Safe UI outcomes are distinct: exact supported match, ambiguous match, no property found, provider error, quota exceeded and authorization failure.

## Server controls

- Credentials are loaded only by the server and only after the private operational-evidence record passes its schema, freshness, path and SHA-256 checks.
- Browser code receives no key, secret, operator evidence path or raw provider response.
- Roles are server-verified. Frontend role claims are not trusted.
- Limits cover requests per user/day, requests per provider/day, maximum estimated cost/request and monthly estimated spending.
- A displayed budget is informational; exact request-bound authorization is separately required.
- Atomic reservation files prevent duplicate transmissions, including after a timeout with an uncertain outcome.
- Successful cached results can be reused without a transmission.
- Usage records include estimated cost and a separate nullable actual-cost field. PI does not claim an actual vendor charge until billing evidence exists.

## Local activation prerequisites

The normal launch remains offline:

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --port 4175
```

Controlled live mode is available only with:

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --live-property-research --port 4175
```

That command fails closed unless the ignored private file `data/runtime/pi-v2-2/operator/research-access.json` exists and passes all checks. Its record must contain:

- `version: PI_LOCAL_PROPERTY_RESEARCH_V1`
- `mode: EXPLICIT_LOCAL_DEVELOPMENT`
- trusted local user identity and Analyst or Administrator role
- current account/entitlement, Property Records coverage, rights/retention, request availability and complete fee/tax upper bounds
- exact account, usage, rights, fees and authorization evidence file paths and SHA-256 hashes under `source_docs/` or `data/runtime/pi-v2-2/`
- an Arosa-address/user-bound authorization with genuine approval and expiration timestamps
- explicit daily, provider, per-request and monthly limits

The prior financial Stage A authorization and its $1 ceiling are bound to another sealed subject. They are not treated as authorization for this address.

## Current live blocker

No current Arosa-bound, dated, expiring authorization record was supplied, and no account/quota observation fresh within 24 hours was established for this execution date. PI therefore did not load the RentCast credential or transmit a request.

Safe inspection confirmed that both existing RentCast-compatible environment-variable names are present in `.env`; their values were not printed or copied. The retained account screenshots are dated October 12, 2026, and the vendor correspondence is dated October 12–13. Those records support prior plan/rights findings but do not establish current October 16 request availability. The required ignored Arosa operator record does not exist.

## Files

- `src/investment-workspace/property-research.js` — preview, confirmation, quota, reservation, ledger and preliminary-evidence service.
- `src/investment-workspace/live-research-config.js` — private evidence verification and server-only client construction.
- `src/auth/access-control.js` — identity-provider-neutral server authorization boundary.
- `src/investment-workspace/server.js` — local capability, preview and execution routes.
- `apps/web/src/features/discovery/Discovery.jsx` — Guided Step 1 disclosure, confirmation and result handling.

