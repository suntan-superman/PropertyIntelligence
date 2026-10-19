# Gabe Demo V2.1 — completed-sale research refresh

Status: `V2_1_RESEARCH_DEMO_READY_WITH_EXPLICIT_DILIGENCE_GAPS`.

Completed October 13, 2026. All six saved preliminary address decisions validated; six bounded RentCast searches succeeded. The revised 11-page PDF displays 22 distinct provider-reported sale examples, separate listing context, unchanged as-is AVMs, historical county screening amounts and property-specific diligence gaps.

## Deliverables

All private outputs are under `data/runtime/gabe-demo-v2-1-2026-10-13/`:

- `PI_GABE_OPPORTUNITY_REPORT_V2_1.pdf` — final 11-page investor-research PDF.
- `PI_GABE_OPPORTUNITY_REPORT_V2_1.html` — matching standalone local HTML.
- `report-model-v2-1.json` — normalized, source-bound report data.
- `review-validation.json` — validation of Stan's genuine decisions.
- `sold-query-plan.json`, `SOLD_CALLS.jsonl`, `sold-results.json` — acquisition scope, append-only request accounting and results.
- `ENRICHMENT_LEDGER_V2_1.json` — cumulative accounting linked to the unchanged original ledger.
- `final-receipt-v2-1.json`, `final-tests.tap`, `visual-review-v2-1.json` — final hashes and QA.
- `renders/r3/` — final PDF, HTML, all page images and automated checks.

The original V1/V2 reports, Phase 1 queue, raw sources, analyst decisions and failed render evidence remain intact. The prior readiness document is retained exactly as `phase1-readiness-before-continuation.md`. No interface redesign occurred.

## Genuine review validation

All six decisions use `GABE_V2_1_LOCAL_REVIEW_ONLY`, carry the original model/packet/card fingerprints and select `ACCEPT_PRELIMINARY`. All 30 original source-file bindings matched current bytes. Required reviewer, review timestamp, supporting reference and notes were present; no corrections were submitted. Notes report a manual MapQuest check; Codex did not repeat it or independently attest to it.

Decision file SHA-256, unchanged throughout execution:

`48e6821613570a055ed7f53f0f488d025bbd705f3f81cdb3cde07d0364643cf1`

These are preliminary address acceptances only. Legal parcel verification, canonical identity approval and Property persistence authorization remain false. Existing county ATN/APN9 identities were not altered.

## Narrow compatibility correction

The existing safe PI client rejects `radius`, `saleDateRange`, `propertyType` and response-bound search parameters. It was preserved byte-for-byte. A local demo-only Property Records search module implements an endpoint-specific validated contract, reusing existing credential-loading, redaction and stop-error conventions. It does not activate Stage A, change any existing guard, add a production route or alter certified identity/financial engines.

The documented Property Records contract supports address-centered radius searches, sale lookback days, property-type/size/room filters and bounded responses. Six requests were planned in advance: one per reviewed subject, 365 days, Single Family, floor area 65%–135% of the subject, beds/baths within one, limit 200 and offset zero. Radius was two miles in Bakersfield and three miles in the thinner markets. No retries, additional pages or automatic expansion occurred. [RentCast Property Records](https://developers.rentcast.io/reference/property-records)

Local checks enforce source-bound subject identity, same city and Kern/California jurisdiction, coordinates/distance, deduplication, subject exclusion and compatible property characteristics. A usable sale requires an explicit `history.event = Sale` with a valid date and numeric price; last-sale fields must agree when present. Listings, pending events, stale/future dates, nominal or malformed prices and conflicting evidence fail. Presentation prefers records within 180 days, then ranks by size difference, distance, age and rooms; up to four examples are shown. No price-based ranking or invented valuation adjustment is used. [RentCast property data](https://developers.rentcast.io/reference/property-data)

## Empirical results

Counts below are record occurrences within each subject's search, not unique properties across the entire search population.

| Subject | Returned | Locally eligible sale records | Displayed | Age of displayed records |
| --- | ---: | ---: | ---: | --- |
| GABE-01 | 161 | 161 | 4 | All within 180 days |
| GABE-02 | 186 | 185 | 4 | All within 180 days |
| GABE-03 | 58 | 58 | 4 | All within 180 days |
| GABE-04 | 37 | 37 | 4 | All within 180 days |
| GABE-05 | 2 | 2 | 2 | 312 and 321 days |
| GABE-06 | 71 | 71 | 4 | All within 180 days |
| Total | 515 | 514 | 22 distinct examples | 20 recent; 2 older |

All six response totals fit the first page. One nominal-price record was excluded. Rejection reasons, complete bounded response sets and exact record/history references remain private. Initial acquisition analysis retained a score-only shortlist; the final report applies the documented recent-first presentation preference to the same eligible records, without further calls or changing raw evidence.

Each displayed example includes reported price/date, floor area, beds/baths, distance, price/SF and relevance. Sale fields are verified against retained provider responses. **Escrow closing, recorded instruments, arm's-length status, transaction subtype, concessions and condition are not independently verified.** Every example is explicitly research-only, with zero underwriting-approved comparables.

The PDF compares these observed sale ranges with unchanged as-is AVMs without interpreting a median or range as ARV. It flags low-price records for transfer/condition verification, extra-bedroom differences and Boron's two-record, older sample. Active/inactive listing context appears separately and is never counted as a completed sale.

## Rights, account confirmation and cost

Retained Cindy correspondence supports the intended retention and report use and confirms no endpoint-specific fees or additional taxes/fees. Current published pricing lists Developer overages at $0.20/request, and API terms permit specified research, storage and distribution uses subject to their restrictions. [RentCast pricing](https://www.rentcast.io/api), [RentCast API terms](https://www.rentcast.io/terms-api)

Stan confirmed checking the current dashboard and proceeding: **“I confirmed. Please proceed.”** This is recorded verbatim in `current-account-confirmation.json`. A refreshed numeric usage count was not supplied and has not been invented. No free quota or account credit is assumed.

| Accounting | Result |
| --- | ---: |
| Prior demo requests | 12 |
| New Property Records searches / HTTP 200 | 6 / 6 |
| Cumulative demo requests | 18 |
| New conservative exposure | $1.20 |
| Prior conservative exposure | $2.40 |
| Combined conservative exposure | **$3.60 / $20.00** |
| Retries / pagination / fallback requests | 0 / 0 / 0 |
| Google / ATTOM / DataTree / county / MLS calls | 0 |
| Database connections / writes | 0 / 0 |
| Durable Properties / MLS selections / deployments | 0 / 0 / 0 |

Actual invoiced cost is **unverified**; $3.60 is a conservative reserve, not an invoice claim. Public documentation/pricing/terms research is separate from metered API requests. The $16.40 unconsumed ceiling is not authorization for further calls after this stop.

## QA and preservation

- Pre-acquisition focused offline tests: **91/91 PASS**, zero skipped.
- Final focused regression/source-evidence tests: **99/99 PASS**, zero skipped.
- Node 22.12.0; existing Puppeteer renderer and Chrome 154.0.8037.57.
- All **11 pages rendered and visually inspected**; source claims, actual-PDF text bounds, blank pages, per-page footers, fonts, privacy and full county disclaimer passed.
- Original source values, AVMs, historical amounts, no-financial-analysis fields and preliminary-only identity boundaries remain unchanged.
- Preservation passed for **13,621 historical files, 14 links and 216 V1/V2 files**. These overlapping inventories are not additive. The review interface and genuine decision file are unchanged.
- Original client, Rule C, V3, MAO, Monte Carlo, investor-report calculations, Stage A memberships/guards and Round 1 authorization were not modified.

Render r1's profile overflow and r2's PDF footer fragmentation are preserved. Spacing and page-anchored note placement corrected these issues; a per-page PDF footer assertion was added. Final r3 passes. No failed evidence was removed, and no assertion was weakened.

## Remaining diligence / stop

Boron needs more current comparable evidence before a valuation conclusion. All subjects still need transfer/arm's-length and condition review, current parcel/title/tax/payoff evidence, occupancy inspection, sale availability and an actual acquisition price. No mortgage balance, rehab cost, financing, numerical ARV, MAO, ROI or profit is asserted.

**Stopped for Stan/ChatGPT review. No further acquisition, production integration or MLS execution initiated.**
