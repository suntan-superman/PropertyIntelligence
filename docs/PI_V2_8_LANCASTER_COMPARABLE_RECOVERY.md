# PI V2.8 — Lancaster Comparable-Sales Recovery

## Diagnosis

The preserved production reservation shows one comparable-sales attempt:

- Reservation: `936b3ab51fd72e96328377f1278fee545afbc66806ccaf02b3cc994eb2779491`
- Created: `2026-10-20T22:15:58.147Z`
- Failed: `2026-10-20T22:16:13.842Z`
- Elapsed: 15.695 seconds
- Provider HTTP status: none captured
- Immutable provider response: none created
- Cache index: none created
- Automatic retries: zero
- Firestore billing state: estimated; actual cost unknown

The request was RentCast `GET https://api.rentcast.io/v1/properties` with these non-secret parameters:

```json
{
  "address": "40924 173rd St E, Lancaster, CA, 93535",
  "radius": 2,
  "saleDateRange": 365,
  "propertyType": "Single Family",
  "limit": 50,
  "offset": 0,
  "includeTotalCount": true
}
```

The 15.695-second duration aligns with PI's 15-second transport timeout. Because no HTTP response or response body was captured, the event was not an HTTP error, an empty result, or a malformed response. It was a network/timeout stop in the Netlify execution path. The retained data cannot prove whether RentCast began processing the request before the client aborted.

RentCast documents this endpoint and parameter combination as valid. RentCast also documents that `includeTotalCount` may significantly increase response time. PI did not consume the total-count response header, so the parameter added latency without providing application value.

RentCast documents that it bills only successful requests returning HTTP 200 and a response body. PI cannot determine from local evidence whether the timed-out request ultimately completed at RentCast; its `actualCostCents` therefore remains `null` and must not be reported as confirmed billed usage.

Official references:

- <https://developers.rentcast.io/reference/property-records>
- <https://developers.rentcast.io/reference/billing-and-pricing>

## Narrow correction

Production commits:

- `5a62c70` — removes unused `includeTotalCount` from new sold-property searches, distinguishes `TIMEOUT_STOP` from `NETWORK_STOP`, records sanitized request metadata, and preserves returned response references and exact error codes.
- `a799466` — moves Guided Analysis to the newly retained immutable evidence snapshot after successful research without modifying or saving the existing scenario revision.

Historical cache compatibility remains intact: PI can still restore older cached requests that included `includeTotalCount=true` without another provider call.

Focused V2.8 regression result: 23/23 passed. Production build passed. Netlify deploy `6ad7ed429706cb0d5e1853e5` is ready.

## Controlled retry state

The original reservation remains deliberately unchanged. Its UTC-day deduplication window is active through `2026-10-20T23:59:59.999Z`. No retry, provider request, reservation deletion, or lock bypass occurred during diagnosis and correction.

The recovery harness is `scripts/pi-v2-8-comparable-recovery.js`. It:

1. Authenticates as the existing Administrator.
2. Verifies the exact Lancaster subject, durable property, scenario revision, AVM, reports, and daily reservation state.
3. Uses the deployed Guided Analysis **Find Recent Sold Properties** button.
4. Requires one research request and zero automatic retries.
5. Restores the new evidence through a fresh login.
6. Confirms the durable property, saved scenario revision, financial analysis, Monte Carlo output, and historical report collection remain byte-equivalent at the JSON projection level.
7. Records the new reservation, response, cache index, displayed sales, and screenshots.

The live retry remains pending until the UTC daily window expires.
