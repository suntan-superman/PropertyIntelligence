# Home Advisor RentCast audit

Audited 2026-09-18, read-only. Reference root: `C:/Users/sjroy/Source/HomeAdvisor`.

## Files inspected

- `apps/web/lib/api.js`: browser-to-server calls, including pricing analyze/latest; GET/HEAD retries for 502/503/504 and network errors.
- `apps/api/src/config/env.js`: dotenv loads root `.env`, then API `.env` with override; configuration schema.
- `apps/api/src/services/rentcastClient.js`: provider HTTP client and memory cache.
- `apps/api/src/services/compsProvider.js`: live/demo fallback orchestration.
- `apps/api/src/services/pricingEngine.js`: comp normalization, filtering, ranking and valuation.
- `apps/api/src/modules/pricing/pricing.service.js`: property lookup, stored analyses and AI narrative orchestration.
- `apps/api/src/modules/pricing/pricing.routes.js`: pricing route entry points.
- `apps/api/src/modules/properties/property.service.js`: inspected address serialization and projection; no RentCast property-identity verification found in this flow.
- `apps/api/src/modules/usage/pricing-query-policy.service.js`: application usage policy, 24-hour default cooldown and five fresh runs per property/user.
- `apps/api/src/modules/pricing/pricing.service.test.js`: mocked persistence tests; these do not establish provider contract correctness.
- Test/file discovery across `apps`: no dedicated RentCast HTTP/identity fixtures found. A second `current-apps` tree exists but is not a runtime dependency of this port.

## Request flow and configuration

Web pricing analyze request → API property record → comps provider → RentCast client. Base URL defaults to `https://api.rentcast.io/v1`. The key comes from `RENTCAST_API_KEY`, falling back to `MARKET_DATA_API_KEY`; header is `X-Api-Key`. Other relevant names are `RENTCAST_BASE_URL`, `MARKET_DATA_PROVIDER`, and web `NEXT_PUBLIC_API_URL`. No values are recorded here.

Client calls `/avm/value` and then `/listings/sale`, with address assembled from street/city/state/ZIP. Default parameters include `Single Family`, compCount 15, maxRadius 2, daysOld 180, plus subject attributes. There is no `/properties` lookup in the audited RentCast flow, and no verification of returned subject identity. `/properties` will be a documented, bounded adapter addition required by this sprint.

## AVM and comps

Home Advisor merges AVM comparables with sale listings, deduplicating by provider ID or address. It substitutes missing numbers with zero, falls back to the subject property type, and may infer a sold label from a date. Filtering rejects absent/zero distances, distances over two miles, dates older than 12 months, area differences over 50%, and differing property types. Ranking weights distance .25, area .20, beds/baths .15, recency .20, type .10, and market velocity .10. It selects the top ten and derives custom median-price-per-square-foot bands/confidence. AVM fallback synthesizes missing bounds at ±5% and rounds to thousands.

These custom pricing, inferred values, comp selection and confidence rules are not reused. Sprint 1 preserves all provider comps in original order and labels listing prices as such; listing evidence is not proof of a closed sale. AVM is not proof of post-repair condition or sponsor resale proceeds.

## Cache, failures and security

The client caches successes in memory for 24 hours, keyed by ZIP/beds/baths/area bucket supplied upstream; different addresses can collide. It has no provider timeout, transient retry or rate-header handling. Listing failures are swallowed; broader failures can fall back to demo comps. The server logs exception messages but not auth headers in the inspected flow. App-level usage policy is separate from actual provider quota.

Property Intelligence uses native fetch, exact-address/request hashes, persistent sanitized raw evidence, timestamps, bounded retries, a small call budget, an official-host restriction, and explicit STOP outcomes. It never uses demo evidence or defaults manufactured homes to Single Family. Secrets are read only from the process environment; optional local dotenv loading is within this project. Any authorized one-time reuse of the reference secret occurs in memory through an external launch command, never through a runtime Home Advisor import or file copy.

## Provider documentation checked

- [Property records](https://developers.rentcast.io/reference/property-records): property lookup endpoint and structural/tax/history data.
- [Value estimate](https://developers.rentcast.io/reference/value-estimate): AVM, subject property and comparable sale listings; Manufactured is a supported request type.

Supported type alone does not establish reliable representation of a specific park home or ownership of its underlying land. Exact address/unit and subject type remain live gates. No separate listing call is needed when the AVM already returns its comp set.
