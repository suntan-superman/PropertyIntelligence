# Property Intelligence — Foundation Sprint 1

## Home Advisor RentCast Audit, Independent Adapter, and Florida Deal Verification POC

**Target:** `C:\Users\sjroy\Source\PropertyIntelligence`  
**Reference only:** `C:\Users\sjroy\Source\HomeAdvisor\apps\web`  
**Language:** JavaScript / Node.js only. No TypeScript.

## Mission

Audit Home Advisor's proven RentCast implementation, selectively port/refactor it into an independent Property Intelligence source adapter, and use Brandon's three Florida deals as the first real Deal Verification fixture.

This is a data/architecture POC. Do not build the polished product UI.

## Hard boundaries

Allowed: read Home Advisor; identify RentCast env-var names/configuration; reuse proven address/property/AVM/comp logic; create Property/Deal/Claim/Evidence models; seed Florida sponsor claims; query RentCast; cache raw responses; normalize evidence; compare sponsor claims with independent evidence; implement deterministic underwriting math; produce QA outputs.

Do not modify Home Advisor, import Home Advisor at runtime, expose/copy secrets into source/logs/docs, commit `.env`, build Firebase/Auth/Cloud Run/mobile, implement Monte Carlo yet, invent distributions, integrate Kern/Daily Report/title/MLS/skip tracing, generate investor solicitation material, or silently treat RentCast values as verified truth.

Record useful out-of-scope discoveries in `docs/FUTURE_WORK.md`.

## 1. Audit Home Advisor first

Before writing new RentCast code, inspect `C:\Users\sjroy\Source\HomeAdvisor\apps\web` and legitimate local modules it references.

Search for RentCast references, API URLs, `/properties`, `/avm/value`, comps, address normalization, env vars containing `RENTCAST`, proxy/server routes, caching, retries/timeouts, quota handling, response normalization, property-match selection, comp filtering/ranking, tests, and fixtures.

Never print or copy secret values. Document only env-var names and how they are consumed.

Create `docs/HOME_ADVISOR_RENTCAST_AUDIT.md` covering files inspected, modules found, endpoints used, env-var names, request flow, address/property-match behavior, AVM/comp behavior, caching/retry/error behavior, tests, reuse/refactor recommendations, security concerns, and Property Intelligence differences.

Do not modify Home Advisor.

## 2. Architecture

RentCast is a source adapter, not our data model.

```text
Sponsor package -> Deal / Claims
Address -> RentCast Adapter -> Evidence -> Normalized Property
Deal + Property + Evidence -> Underwriting Comparison
```

Future Kern/title/MLS/inspection sources must be able to contribute evidence without changing the core domain model.

Add cleanly to the existing project:

```text
data/deals/
data/raw/rentcast/
data/normalized/
data/comparisons/
data/validation/
docs/HOME_ADVISOR_RENTCAST_AUDIT.md
docs/DEAL_VERIFICATION_ARCHITECTURE.md
docs/DATA_DICTIONARY.md
docs/FUTURE_WORK.md
docs/FOUNDATION_SPRINT1_COMPLETION_REPORT.md
scripts/rentcast-inspect-config.js
scripts/seed-florida-deals.js
scripts/verify-florida-properties.js
scripts/compare-sponsor-to-evidence.js
scripts/summarize-foundation-sprint1.js
src/domain/property.js
src/domain/deal.js
src/domain/claim.js
src/domain/evidence.js
src/sources/rentcast/client.js
src/sources/rentcast/config.js
src/sources/rentcast/propertyLookup.js
src/sources/rentcast/valuation.js
src/sources/rentcast/comps.js
src/sources/rentcast/normalizer.js
src/sources/rentcast/cache.js
src/underwriting/deterministic.js
src/underwriting/comparison.js
src/provenance/provenance.js
```

Adapt to existing conventions rather than duplicating utilities.

## 3. Domain model

Use lightweight JavaScript validation; no heavy ORM.

**Property:** normalized address, county, coordinates, APN/ATN/RentCast ID, property type, beds, baths, square feet, lot size, year built, tax/assessment data, sale history, valuation, comps, provenance. Missing is different from zero.

**Deal:** ID, name, property reference, sponsor, claims, evidence, underwriting.

**Claim:** `field`, `value`, `unit`, `suppliedBy`, `sourceDocument`, `suppliedAt`, `status`, `evidenceRefs`, `notes`.

Statuses: `SPONSOR_SUPPLIED`, `INDEPENDENTLY_SUPPORTED`, `VERIFIED`, `CONTRADICTED`, `MISSING`, `AMBIGUOUS`.

RentCast evidence alone does not automatically mean `VERIFIED`.

**Evidence:** source, source type, retrieval time, field, value/range, raw-response reference, notes.

## 4. Seed Brandon's Florida portfolio

Create idempotent `data/deals/florida-portfolio.json` via `npm run deals:seed:florida`.

Preserve these as sponsor claims, not facts.

### 8426 Fantasia Parkway, Riverview, FL
- projectedListPrice 279000
- salesCommission 5000
- escrowClosingCosts 2000
- spaceRentThreeMonths 3000
- projectedNetSaleProceeds 269000
- acquisitionCost 160000
- estimatedRepairs 10000
- projectedNetProfit 99000
- totalCashInvested 173000
- projectedCashOnCashReturn 0.572

### 95 Bass Circle, Winter Haven, FL
- projectedListPrice 65000
- salesCommission 3000
- escrowClosingCosts 2000
- spaceRentThreeMonths 2400
- projectedNetSaleProceeds 57600
- acquisitionCost 15000
- estimatedRepairs 12000
- projectedNetProfit 30600
- totalCashInvested 29400
- projectedCashOnCashReturn 1.041

### 131 Joyce Place
Sponsor supplied only the street address. Do not assign a city/state/ZIP silently.
- projectedListPrice 40000
- salesCommission 2500
- escrowClosingCosts 2000
- spaceRentThreeMonths 3122
- projectedNetSaleProceeds 32378
- acquisitionCost 5000
- estimatedRepairs 5000
- projectedNetProfit 22378
- totalCashInvested 13122
- projectedCashOnCashReturn 1.705

### Portfolio
- totalPurchasePrices 180000
- totalEstimatedRepairs 27000
- totalThreeMonthSpaceRents 8522
- totalCashInvested 215522
- combinedProjectedListPrices 384000
- combinedProjectedNetSaleProceeds 358978
- combinedProjectedNetProfit 151978
- projectedCashOnCashReturn 0.705
- estimatedTimelineDays 120

Also preserve sponsor claims about promissory notes, liens on the three Florida properties, and additional collateral at 713 Bryce Drive reportedly owned free and clear and estimated at $230,000. Do not verify collateral in this sprint.

## 5. RentCast adapter

Use Home Advisor as the reference implementation, but Property Intelligence must be independent at runtime.

For this sprint support only:
1. property match/details;
2. valuation/AVM;
3. sale comparables returned by/associated with the proven valuation workflow.

Requirements: API key only from environment; never log key/auth headers; native fetch preferred; timeout; safe error parsing; transient retries only; rate-limit respect; local raw-response cache; retrieval timestamps; sanitized request metadata; raw and normalized data separate; no fabricated fields.

Cache under `data/raw/rentcast/<address-hash>/`. Support `--refresh`.

If safe automatic reuse of the existing local secret is not possible, stop and tell Stan the env-var name only and where Property Intelligence expects him to populate it.

## 6. Address identity rules

Fantasia and Bass may use sponsor-supplied city/state.

`131 Joyce Place` is incomplete. The workflow may discover candidates, but it must not silently select one.

If exactly one highly plausible Florida candidate appears, record it as `AMBIGUOUS_PENDING_CONFIRMATION`. If multiple plausible candidates exist, save them and stop enrichment for Joyce. Provider best-match behavior must not become sponsor-supplied identity.

## 7. Normalize RentCast evidence

Where actually returned, capture provider property ID, formatted address/county/coordinates, property type, beds/baths, square feet/lot size/year built, APN/parcel identifier, tax/assessment information, sale history, AVM, low/high range, comparable properties, comp address/value/date/distance/similarity/DOM, and other directly returned fields materially explaining valuation.

Do not add extra API calls merely to collect everything RentCast offers.

## 8. Deterministic underwriting engine

Implement pure unit-tested JavaScript that reproduces the sponsor arithmetic.

Calculate acquisition cost, repairs, supplied space rent, selling/closing costs, sponsor-defined cash invested, net sale proceeds, projected profit, cash-on-cash return, profit/list-price ratio, and portfolio totals.

Keep a separate fully burdened model placeholder listing missing categories without inventing values: acquisition closing costs if absent, taxes, insurance, utilities, financing, repair contingency, additional holding costs, park/community fees, transfer/application fees, price reductions, and other disposition costs.

Do not call Brandon's calculation fully burdened net profit.

Acceptance math:
- Fantasia: $99,000 / 57.2%
- Bass: $30,600 / 104.1%
- Joyce: $22,378 / 170.5%
- Portfolio: $151,978 / 70.5%

Stop on unexplained discrepancy.

## 9. Sponsor-vs-evidence comparison

Generate per-property comparison records while preserving both values.

For projected resale price compare sponsor projected price, RentCast AVM if available, RentCast low/high range if available, variance dollars/percent, and whether sponsor value is below/inside/above the independent range.

Use neutral statuses: `NO_INDEPENDENT_EVIDENCE`, `WITHIN_INDEPENDENT_RANGE`, `ABOVE_INDEPENDENT_RANGE`, `BELOW_INDEPENDENT_RANGE`, `INDEPENDENT_ESTIMATE_ONLY`, `ADDRESS_AMBIGUOUS`.

Do not label a deal good/bad or investment-worthy.

Write JSON/CSV under `data/comparisons/`.

## 10. Comparable evidence

Preserve every comp returned by the proven RentCast workflow. Do not cherry-pick favorable comps.

Store raw returned set plus normalized fields/provider metrics. If Home Advisor applies filters/ranking, document them before deciding whether appropriate here.

Do not create a proprietary ARV algorithm in this sprint. Show provider AVM/range and underlying comp evidence separately.

## 11. Provenance

Every material independent value must answer who supplied it, source system, retrieval time, and raw evidence location.

Never overwrite sponsor values. Sponsor claim and independent evidence coexist.

## 12. Commands

Create scripts similar to:

```json
{
  "rentcast:audit": "node scripts/rentcast-inspect-config.js",
  "deals:seed:florida": "node scripts/seed-florida-deals.js",
  "deals:verify:florida": "node scripts/verify-florida-properties.js",
  "deals:compare:florida": "node scripts/compare-sponsor-to-evidence.js",
  "foundation:summarize": "node scripts/summarize-foundation-sprint1.js",
  "test": "node --test"
}
```

Use existing project conventions where appropriate.

## 13. Tests

Unit tests must not consume RentCast quota.

Use sanitized fixtures for successful property match, no match, multiple/ambiguous candidates, AVM with/without range, comps, provider error, 429/transient retry, malformed response, cache reuse, secret redaction, sponsor arithmetic, comparison statuses, and missing data.

A small opt-in live integration test may exist but must never be part of default `npm test`.

## 14. Execution order

1. Inspect existing PropertyIntelligence state.
2. Audit Home Advisor RentCast implementation.
3. Write audit report.
4. Create/refine domain schemas.
5. Build independent adapter.
6. Add unit tests.
7. Seed Florida deals.
8. Confirm sponsor arithmetic.
9. Confirm safe RentCast configuration.
10. Query **one** complete-address property first.
11. Inspect raw/normalized result.
12. If healthy, query the second complete address.
13. Handle Joyce under ambiguity rules.
14. Generate sponsor-vs-evidence comparisons.
15. Run all tests.
16. Create completion report.
17. **STOP.**

Do not start UI work afterward.

## 15. STOP gates

Stop and report rather than improvise if Home Advisor contains no usable RentCast implementation; accessing the secret would expose it; authentication fails; API contract differs materially; Fantasia/Bass resolves ambiguously; RentCast cannot reliably represent these manufactured/mobile-home properties; quota/rate limits would be materially consumed; sponsor arithmetic cannot be reproduced; or a design decision would couple Property Intelligence to RentCast.

## 16. Required outputs

- `docs/HOME_ADVISOR_RENTCAST_AUDIT.md`
- `docs/DEAL_VERIFICATION_ARCHITECTURE.md`
- updated `docs/DATA_DICTIONARY.md`
- `data/deals/florida-portfolio.json`
- sanitized cached RentCast responses
- normalized property/evidence records
- sponsor-vs-evidence comparison CSV/JSON
- deterministic underwriting output
- tests
- `docs/FOUNDATION_SPRINT1_COMPLETION_REPORT.md`

The completion report must state Home Advisor files referenced, endpoints discovered, env-var names (never values), Property Intelligence files changed, tests/results, API calls/cache hits, property-resolution result for each Florida address, AVM/range for each resolved property, number of comps, sponsor-vs-independent variance, missing/unverified evidence, manufactured/mobile-home anomalies, readiness for a later Deal Verification UI, and exact recommended next step.

## 17. Final instruction

Optimize for **evidence integrity**, not a flashy result.

Desired output:

> Here is what the sponsor claims. Here is what an independent source currently reports. Here is the evidence supporting each value. Here is what remains unknown.

Do not make an investment recommendation.

**Stop after the completion report. Do not build the UI, Monte Carlo engine, or investor package until Stan and ChatGPT review the actual Florida results.**
