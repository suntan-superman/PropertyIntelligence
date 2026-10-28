# PI V3.1.1 — Address Resolution Usability Correction

## Production incident diagnosis

The October 28 attempt for `603 Tyler St, Taft, CA 93268` used the legacy browser action `Resolve with Google`. That action posted to `/api/discovery/address-resolution/suggest`. The route existed in the local investment server but was not registered by the authenticated Netlify API. Netlify therefore returned PI's `NOT_FOUND` response before the Google adapter ran.

Consequences:

- The browser did send a request to PI.
- PI did not send a request to Google for this failed attempt.
- Google did not return zero results, a partial result, a timeout, or an error; it was never reached.
- No Google provider charge was attributable to this attempt.
- Address normalization was not involved in the failure. PI preserved `603 Tyler St`; the modal's expanded `Street` wording came from its display model, not a provider result.
- The contradictory `Not requested` plus `NOT_FOUND` display came from two independent UI branches: an empty suggestion was rendered as `Not requested`, while the failed PI endpoint response was rendered verbatim.

The production validation adapter uses Google Geocoding at `GET https://maps.googleapis.com/maps/api/geocode/json` with an address string and California/US component constraints. The server API key is never returned to the browser.

## Correction

Entered-address resolution now uses the authenticated `/api/discovery/address-validation/start` and `/api/discovery/address-validation/confirm` workflow in local and deployed environments. This workflow:

1. checks organization-retained evidence first;
2. records Google as advisory evidence;
3. distinguishes not requested, searching, exact match, possible match, no match, provider error, timeout, and configuration error;
4. permits an explicit analyst confirmation of the unchanged entered address when Google cannot confirm it;
5. issues a user-bound, organization-scoped, single-use research token;
6. opens the existing RentCast quote/cost confirmation before any billable RentCast execution.

Technical provider status and HTTP fields appear only under **Source Details**. A manual continuation is recorded as `MANUAL_WARNING_ACKNOWLEDGED` and is never represented as Google verification. Manual confirmation uses the immutable original entered address; changing the address requires editing and starting a new lookup.

No automatic provider retry was added. Retained evidence and normalized address matching continue to prevent duplicate property creation before research.

## Security and billing boundaries

Firebase Authentication, organization isolation, Stripe credits, RentCast quote approval, one-time research approval, financial analysis, document storage, and report generation are unchanged. Automated tests use mocked Google and RentCast responses. Production verification must not approve the RentCast quote and therefore must not create a paid RentCast request.
