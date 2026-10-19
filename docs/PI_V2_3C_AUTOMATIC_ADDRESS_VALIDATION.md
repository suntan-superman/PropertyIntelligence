# PI V2.3C — Automatic Address Validation

Local implementation status: **certified with mocked Google and RentCast transports** on 2026-10-17. No live provider requests, database changes, or deployment were performed.

## Implemented workflow

1. `Research New Property` repeats the normalized retained-evidence search.
2. If no retained subject matches, the authenticated backend calls Google Geocoding under the existing server-side configuration.
3. An exact, complete `ROOFTOP` or `RANGE_INTERPOLATED` result with consistent street, city, state, and ZIP may continue automatically.
4. ZIP changes, a Google-supplied missing ZIP, material component changes, multiple results, partial matches, and low-precision results stop at an address review screen.
5. Google failure or quota exhaustion exposes a warned manual-confirmation path. It never silently skips validation.
6. Confirmation issues a short-lived, one-use token bound to the authenticated user. The paid-research route rejects an unvalidated new address.
7. RentCast receives the confirmed normalized address. The original entry and validation evidence remain separate in the research audit and preliminary evidence.

Google matching remains preliminary address evidence and does not certify legal parcel identity.

## Server controls

- Authentication applies to validation and research routes.
- Validation tokens expire after ten minutes, are user-bound, and are consumed once.
- Duplicate and cache keys use the confirmed normalized address.
- Existing provider allowlists, request reservations, quotas, spending bounds, timeout limits, zero-retry behavior, and usage logs remain in force.
- Existing retained subjects use their locked retained address and bypass Google and new-property validation.
- The optional manual `Resolve with Google` action remains available for troubleshooting.

## Focused QA

The mocked suite covers:

- exact address and ZIP;
- `400 Decatur St, Bakersfield, CA 93309` corrected to `93308` only after confirmation;
- missing ZIP;
- abbreviated `St` versus `Street`;
- incorrect street number;
- multiple candidates;
- partial/low-precision results;
- Google quota exhaustion and explicit manual warning acknowledgement;
- retained-property short circuit;
- cached validation;
- user-bound, one-use validation tokens;
- duplicate paid-request prevention;
- an HTTP-router test proving RentCast is called zero times before correction confirmation and exactly once afterward.

Results:

- V2.3C/V2.3B/address-resolution suite: 21/21 passed.
- Guided Analysis regression suite: 32/32 passed.
- Authentication/provider regression suite: 35/35 passed.
- Production web build: passed.

## Local startup

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --firebase-auth --live-property-research --google-geocoding --port 4175
```

The existing Google server credential, Firebase configuration, and current RentCast account-level evidence must be valid at startup. No browser-side Google or provider secret is introduced by V2.3C.

## Cache restoration correction

The provider cache now resolves equivalent terminal street suffixes before duplicate-request enforcement. For example, research cached under `400 Decatur St` is reused when Google returns `400 Decatur Street`. This restores the cached preliminary property, valuation, and comparable sales after a server restart with zero RentCast requests and zero added estimated spending. A genuine duplicate attempt without reusable cache is still blocked and is now reported accurately in the UI.
