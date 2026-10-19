# PI V2.3 — Final Provider Access Simplification

Date: 2026-10-16 (America/Los_Angeles)

Status: locally implemented and certified with synthetic RentCast transports. No live provider request, production deployment, database write or durable Property creation occurred.

## Root cause

The authenticated provider service existed, but the normal UI still used two incompatible paths:

- `Discovery.jsx` required a plan, Firebase password reauthentication, a browser-visible authorization token and a separate run action.
- `Workspace.jsx` rendered a hard-coded legacy warning in Comparable Sales and did not call a provider route from **Find Recent Sold Properties**.
- `workbench-server.js` loaded provider research only when the legacy `--live-property-research` switch was present, even when Firebase authentication was active.
- `AuthenticationGate.jsx` exposed the second-password reauthentication helper to the application.
- `PropertyDetail.jsx` still described live refresh as disabled and showed prior demo cost text.

The older Stage A and V2.2 services remain preserved for historical tests, but they are not selected by the authenticated V2.3 server path.

## Implemented behavior

- Added one server endpoint for normal authenticated research: `POST /api/property-research/research`.
- The server validates the Firebase session, PI role, organization, provider permission, allowlisted RentCast request contracts, current account evidence, actual-plan remaining quota, configured spending controls and duplicate reservations.
- The browser receives no provider credential or internal authorization token and does not ask for a second password or cost confirmation.
- A new property requests only missing Property Records, valuation and comparable-sale research, in that order.
- Retained and permitted cached results are reused. Moving between wizard steps does not repeat successful requests.
- **Complete Property Research** and **Find Recent Sold Properties** use the same authenticated server policy.
- A failed operation remains unavailable while successful evidence is preserved. Automatic retries remain zero.
- Local limits are 20 requests per user/day, 20 requests per provider/day, no more than 3 requests or $1.00 estimated exposure per property, and a $20 monthly estimated-spend ceiling. All are additionally constrained by the retained RentCast plan balance.
- ATTOM and First American are not included in the allowlist.

## QA evidence

- Focused provider/authentication tests: 34/34 passed.
- Address/workspace and V1.4 compatibility tests: 14/14 passed.
- Financial, Monte Carlo, scenario, seller-position and report regressions: 149/149 passed.
- Web production build: passed.
- Browser acceptance: 13/13 checks passed with zero browser errors and zero unmocked external requests.
- Arosa reused its existing Property Records evidence and made two mocked calls: valuation and sold-property research.
- A new synthetic address made three mocked calls: Property Records, valuation and sold-property research.
- Browser acceptance observed one Firebase sign-in, zero additional reauthentication, zero provider retries and zero durable Property creations.

Browser evidence and the machine-readable result are in `data/validation/pi-v2-3b-research/`.

## Local launch

From the repository root:

```powershell
node scripts/workbench-server.js --investment --firebase-auth --port 4175
```

Then open `http://127.0.0.1:4175/#analyze-property` and sign in. The legacy `--live-property-research` flag is not required when Firebase authentication is enabled.

## Live acceptance boundary

The implementation is ready for a separately user-initiated live acceptance. This certification intentionally did not contact RentCast. Before the live action, the private provider-control evidence must still validate as current and the authenticated account must show sufficient plan quota. A live click may request only missing evidence and remains subject to the server limits above.
