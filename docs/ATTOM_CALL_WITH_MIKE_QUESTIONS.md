# ATTOM Call With Mike — Questions

Fixture: 3484 Haven St, Rosamond, CA 93560 (one-property local POC). ATTOM identity: **resolved via unique exact-address `ExaStr` match**. KERN APN ↔ ATTOM APN corroboration remains historically unresolved and is not a blocking gate. No ATTOM ID is repeated in this shareable call sheet.

Identity guidance to confirm with Mike: `AttomID` is authoritative; retain `ParcelNumberRaw` exactly as returned; do not use deprecated `ParcelNumberFormatted` for new integration work; treat `ParcelNumberAlternate` as supplemental only. Kern `APN9` and `ATN` remain separate source identities.

Observed continuation results: preforeclosuredetails: HTTP 200, properties 1; saleshistory/expandedhistory: HTTP 200, properties 1; property/detailmortgage: HTTP 200, properties 1; preforeclosuredetails: HTTP 400, properties 0; valuation/homeequity: HTTP 200, properties 1; preforeclosuredetails: HTTP 200, properties 1.

1. Which required mortgage, foreclosure-history and encumbrance fields are API-only versus Bulk/Cloud/Snowflake?
2. Are assignments, releases, satisfactions and reconveyances available in the Premium API, and what are the exact endpoint/field names?
3. Does Home Equity/Loan Model return first/second/third estimated balances, LTV/CLTV and as-of dates in this trial package?
4. Which judgment, federal/state tax, mechanic's, HOA and PACE lien products are available by exact-property API?
5. Does historical preforeclosure include NOD/LIS, NTS/NOS, auction, foreclosure and REO records, or only latest/current state?
6. What are Kern/California update latency, backfill policy and document-number completeness?
7. ATTOM documentation describes report-based billing: does $500/month mean 5,000 HTTP calls, 5,000 API Reports, or another allowance? What is each endpoint's report cost?
8. What commercial SaaS rights cover persistence, authenticated display, derived analytics, provider combination, attribution, retention and termination/deletion?
9. What incremental pricing and delivery SLA apply to Bulk, Cloud and Snowflake gaps?
10. Can selective exact-property API enrichment coexist with narrowly scoped Bulk/Cloud licensing?

Observed HTTP-denied endpoints (if any): none observed. Review the sanitized extracts and field matrix before discussing production design.
