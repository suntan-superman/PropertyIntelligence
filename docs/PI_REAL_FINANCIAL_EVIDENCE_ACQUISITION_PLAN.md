# PI Real Financial Evidence — Controlled Acquisition Proposal

2026-10-12. **NOT EXECUTED. COST/RIGHTS CLARIFICATION REQUIRED.** Additional identity, contract-support and methodology gates remain. This document grants no authority to make requests.

## Scope and prerequisites

Use only the three opaque subjects in `data/runtime/real-financial-evidence-v1/private-candidate-shortlist.json`, sealed by selection fingerprint:

`ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4`

They are technical candidates, not durable Properties, approved identities or MLS selections. Do not substitute another candidate or reuse RC/IP/historical fixtures if any fails. No provider ID, complete licensed address or tested provider/county crosswalk exists for them yet.

Before spending anything, Stan must supply a current sanitized account confirmation: active Workside plan, permitted products, actual rate and any endpoint-specific charges/tax, applicable written permissions, and whether concurrent users/jobs can consume shared quota. Existing local credentials must not be displayed or used as proof of entitlement. No dashboard access or authentication was performed here.

Public billing says endpoints share the allowance and counts HTTP 200 responses, including unsuitable results. No vendor hard cap is offered; account-specific access still needs verification. [Billing documentation](https://developers.rentcast.io/reference/billing-and-pricing). The public $0.20 Developer overage matches the user's last confirmation, but is not an authenticated current rate or remaining balance. [Pricing](https://www.rentcast.io/api).

## Nine reservation slots, not three requests

Each subject has three distinct reservations. Execute serially **only after separate approval**. Finish/review the first subject's stage before promoting it; stop the entire controlled run on a hard failure and return unused slots. No automatic continuation past the identity gate. No retry, pagination, wider-area fallback, replacement subject or extra endpoint is included.

| Slot | Subject | Proposed request | Input identity | Evidence sought | Maximum attempts |
| --- | --- | --- | --- | --- | ---: |
| 1 | Technical ordinal 1 | `GET /v1/properties` — exact subject discovery | Original county street/city + explicitly jurisdiction-supported CA; no invented ZIP | Unique RentCast ID, complete address, county assertion, SFR attributes, sale history/tax fields if present | 1 |
| 2 | Technical ordinal 1 | `GET /v1/avm/value` | Accepted licensed complete address; require returned ID equality | As-is valuation context/range and distinct comparable listings | 1 |
| 3 | Technical ordinal 1 | `GET /v1/properties` — bounded sold-record search | Accepted full subject address as center; approved radius/lookback/type constraints | Candidate historical sales, not automatically qualified comps | 1 |
| 4 | Technical ordinal 2 | Same exact subject discovery | Its own original county street/city + jurisdiction CA | Its own unique record/identity evidence | 1 |
| 5 | Technical ordinal 2 | Same value estimate | Its own accepted address and required ID comparison | Its own valuation/listing context | 1 |
| 6 | Technical ordinal 2 | Same bounded sold search | Its own accepted center/approved filters | Its own candidate sales | 1 |
| 7 | Technical ordinal 3 | Same exact subject discovery | Its own original county street/city + jurisdiction CA | Its own unique record/identity evidence | 1 |
| 8 | Technical ordinal 3 | Same value estimate | Its own accepted address and required ID comparison | Its own valuation/listing context | 1 |
| 9 | Technical ordinal 3 | Same bounded sold search | Its own accepted center/approved filters | Its own candidate sales | 1 |
| **Total** | **At most 3** | **3 records + 3 AVM + 3 sold searches** | **No other subject acquisition** | **No financial calculations or reports** | **9** |

Billing/rights per row: at most one successful request under the verified shared plan; RentCast written usage permission plus applicable API/third-party terms; private minimal allowlist, no owner/contact export. Every transmission reserves an attempt and maximum possible cost before sending, regardless of success. A timeout remains potentially billed and cannot free its slot. Quota is not reduced optimistically after ambiguous outcomes.

### Proposed request shapes — placeholders, not runnable orders

Common official host: `https://api.rentcast.io/v1`. API key header only on a later authorized server-side call; never a query parameter. Do not populate the placeholders now.

1. Discovery: `/properties?address=<county street, county city, CA>`. The prior written RentCast confirmation supports omitting ZIP. Expect exactly one record and no unit ambiguity. A unique address match is discovery evidence, **not** permission to proceed to valuation. Review exact county/source relationship, original identifiers, complete address, SFR type, contradictions and exclusions using unchanged existing rules first.
2. Value context: `/avm/value?address=<accepted complete address>&lookupSubjectAttributes=true&compCount=15&maxRadius=<approved radius>&daysOld=<approved listing-age limit>`. Require a nonempty exact `subjectProperty.id` match and compatible SFR/address. No guessed `propertyId` parameter or manual property-attribute override. Retain returned attribute differences and stop on material contradiction. This is a proposed documented contract; the current client rejects `lookupSubjectAttributes` and cannot run it unchanged. [Value endpoint](https://developers.rentcast.io/reference/value-estimate), [lookup controls](https://developers.rentcast.io/reference/property-valuation).
3. Sold candidates: `/properties?address=<accepted complete address>&radius=<approved radius>&saleDateRange=<approved days>&propertyType=Single%20Family&limit=50&offset=0&includeTotalCount=true`. One page only. Proposed lookback syntax is days, not ISO date strings. [Records query parameters](https://developers.rentcast.io/reference/property-records).

The sold-search response intentionally contains other properties as **comparable candidates**, not additional target acquisitions. Limit at most 50 per target / 150 returned rows across the plan before deduplication. Do not create Properties, fetch their individual records, run their AVMs or treat them as approved identities. If returned count/total indicates more than 50, required total-count metadata is missing, a next page is implied or the region/filter is inconsistent, stop; do not paginate or assert exhaustive coverage. An empty response is an evidence failure, not no sales. A repeated sale across subjects must retain its own provenance and never acquire a fabricated subject identity.

Draft parameters for review, **not universal standards or authorization**: radius 2 miles, lookback 180 days, up to 15 AVM listings and up to 50 sold records. These reuse small existing adapter-scale bounds only as a discussion starting point. Analyst must approve urban/rural market appropriateness before acquisition; otherwise no request. Attribute bands and minimum three independent qualified sales also need explicit review. Later sensitivity can tighten the retained set offline; no second wider search is budgeted.

## Cost ceiling and enforcement

| Quantity | Proposal / verification state |
| --- | --- |
| Maximum new HTTP attempts | 9 total; 3 per subject; 0 retries, redirects, pagination or fallbacks |
| Verified remaining included allowance | **UNKNOWN**; credit applied in budget = **0** |
| Last confirmed/public Developer overage | $0.20/successful request |
| Request-fee upper estimate at that rate | 9 × $0.20 = **$1.80**; first discovery-only stage across all three would be at most $0.60 |
| Proposed all-in incremental cap | **$2.00**, including any tax/fees; do not execute unless nine worst-case reserved charges fit |
| Separate endpoint charges | None described in public shared-plan docs; **Workside-specific confirmation UNKNOWN** |
| Operational/enforceable maximum today | **UNKNOWN — COST CLARIFICATION REQUIRED** |
| Actual cost incurred by this assessment | **$0 provider data fees**; no authenticated calls |

Do not assume 47 free calls remain because three historical requests are recorded. Other usage/billing dates are unknown. If verified included quota is later used for accounting, keep the conservative all-overage reserve unless shared consumption can be bounded. Public docs cannot verify taxes, account restrictions or a live balance.

Required future runner controls: new pilot-owned append-only/fsynced reservations, a single process lock, exact manifest fingerprint and endpoint/parameter allowlists, one serial request, no automatic retries, redirect rejection, 15-second request timeout, bounded response size, safe error codes, separate HTTP/billable/uncertain counts and monetary reserves. No resets of historical ledgers. Reject an attempt before network access if its maximum cost cannot fit within the cap. No new authentication call is budgeted; use the existing header mechanism after local credential readiness without a live probe.

The existing client/three-call pilot cannot enforce this plan unchanged: sold-search/lookup parameters are currently rejected; call limits, evidence projection and strict AVM ID checks require a **separately authorized narrow compatibility change and offline certification**. Do not bypass its allowlist, directly call an unrestricted transport, or weaken canonical rules. This phase implements none of those changes.

## Stop conditions

Stop before the next request on any of:

- Changed source/selection fingerprint, new exclusion, duplicate candidate/property relationship, incomplete original county evidence, material identity contradiction, or lack of explicit identity-discovery authority.
- Unknown rights/account access/rate, incompatible retention, unsupported client contract, unknown maximum cost, or unapproved search bounds.
- Non-200, malformed/oversized response, authentication/payment/rate-limit error, timeout/uncertain outcome, unexpected redirect/host, API contract drift or unusable source provenance. Never retry automatically, even if errors are described as unbilled.
- Discovery returns zero/multiple/ambiguous records or wrong jurisdiction/type; county-provider reconciliation fails. Preserve evidence privately; do not silently move on to the AVM or another candidate.
- AVM missing/mismatched provider ID/address/type or implausible/invalid range; do not accept optional-ID behavior.
- Sold-search population exceeds bounds, is outside the approved geography/date/type, has unknown/truncated coverage, or has no usable dated sale-price evidence. No pagination, compensating call or fallback provider.

Missing condition or sale-quality evidence blocks ARV and actual economics even after successful acquisition. An acceptable raw candidate-sales package can be reported as **PARTIAL**, with unknown arm's-length status; it is not a certified comparable set. No other provider or MLS is implicitly authorized to fill that gap.

## Exact next authorization needed

Recommended next approval, after the account/rights/cost information is supplied:

> Authorize a narrowly scoped local controlled-acquisition compatibility update and offline QA for the exact three-subject manifest fingerprint above. Preserve all canonical/Rule C/V3/model/report protections. Certify the documented parameters, strict identity binding, private financial-field allowlist, nine total reservations, zero retries and $2.00 all-in ceiling. Then stop for review; no provider calls yet.

After that certification, a **separate live authorization** should explicitly approve up to nine RentCast requests in the table, the three exact private subject identities, initial no-ZIP discovery followed by a mandatory county/provider identity gate, the radius/lookback/row limits, permitted financial fields/retention, rate/cap and zero retry/fallback policy. An unresolved subject stops the run; unused slots are not transferable. No real calculation, real PDF, approval, Property, database, ATTOM/DataTree/Google/county call, MLS selection or deployment is included.

Condition/rehab, acquisition scenario, lender/holding/transaction assumptions, investor hurdle and probability rationale remain separate human-evidence deliverables. Do not request another provider product merely because a financial input is still absent.

**STOP FOR STAN/CHATGPT REVIEW.** This is a request and budget proposal, not executable authority.
