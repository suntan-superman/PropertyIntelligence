# DataTree UAT Gap Analysis

## Evaluation status — 2026-10-07

One exact-address SearchStandard request and exactly one TotalView request have now been completed for the same 3484 Haven fixture. TotalView succeeded and returned one uniquely matching report. No other report or property was requested.

The prior Swagger `SearchType` concern remains historically documented. First American subsequently directed the POC to ignore integer values 0–5 and provided the exact semantic request body; that body was used unchanged. No enum integer was guessed.

## Identity and TotalView request

- SearchStandard result: HTTP 200, exactly one property; DataTree `PropertyId=10668360`; parcel `251-091-30-00-1`; situs 3484 HAVEN ST, ROSAMOND, KERN, CA 93560.
- TotalView: HTTP 200, 4,503 ms; status `Ready`; `MaxResultsCount=1`; one report; `ReportName=TotalViewReport`; `OrderItemId=45519838`; `ReferenceId=null`.
- Response subject identity matched both PropertyId and situs. Nearby sales/listings were treated only as neighboring properties.
- Exact response structure and raw-response location are recorded in `DATATREE_UAT_CAPABILITY_POC.md` and the endpoint inventory. Raw output remains in ignored storage because it contains owner/party information.

## Evidence comparison

| Existing PI evidence | DataTree observation | Result |
|---|---|---|
| ATTOM sale 2025-02-11, $117,500, document `0000015503` | TotalView subject sale date/price match; recording 2025-02-12; document `2025.15503`, instrument `000000015503` | **CORROBORATES** sale; numeric document suffix matches despite format differences |
| ATTOM mortgage 2025-02-12, $117,500 | No distinct mortgage transaction returned; latest sale has `LoanAmount=0` | **NOT RETURNED** |
| ATTOM modeled balance $114,181 | No subject current/estimated balance returned | **NOT RETURNED** |
| ATTOM defaults 0 / auctions 0 | Subject foreclosure fields null; no event detail returned | **NOT RETURNED**, not a zero-count confirmation |
| RentCast AVM $353,000, range $323,000–$383,000 | TotalView returns comps/trend data, not a comparable subject AVM | **NOT COMPARABLE** |

TotalView adds subject-level involuntary-lien flagging and two document references (`TOWN LIEN`, `NOTICE`), as well as 10 nearby sale records and market-trend sections. HOA and PACE indicators were false with `CountyDataAvailable=true`. This is not a complete title opinion, and document labels do not establish current enforceability or balance.

## Listing question

For the subject, `ListingPropertyDetail` fields are null, `ListingHistory` is empty, and `NearByListingData` is empty. Therefore current listing status, subject last-listed date, and subject asking price were **NOT RETURNED**. Listing fields do appear on nearby/comparable sales, but are not subject facts. Raw `PropertyStatus` values (including `L`) have no supplied semantics and are not interpreted. This POC does not alter the MLS Validation Round 1 selection harness; 3484 Haven remains excluded.

## Highest-value remaining PI gap and next test

Highest priority: determine whether the 2025-02-12 mortgage/finance document can be retrieved and whether it clarifies active loan, original amount, position, lifecycle, and document detail. The TotalView response did not return an explicit mortgage or current balance.

Recommend exactly one next report: **Last Finance Document**. It is a focused test of the strongest unresolved gap and can be anchored to the already returned sale/recording date. It is only a recommendation—**not ordered**.

### Last Finance Document follow-up gate — 2026-10-07

Contract inspection stopped before a request. Vendor materials describe Last Finance Document as a document-image product retrieved via `GetDocument`; the current authorization calls it a report. Swagger's `ReportRequestVm.ProductNames` is an unconstrained string array and does not establish the exact product identifier or a product-specific FullAddress/GetReport body. No authentication, document, or report call was made. The next safe step is to obtain First American's exact endpoint, `ProductNames` value, and supported search request example; do not infer the wire name from the display label.

## Scope and accounting

- DataTree property/report activity: **1 SearchStandard + 1 TotalView**; target ceiling 10, hard ceiling 20.
- Authentication: 5; Swagger: 3; all separately counted in `data/validation/datatree-uat/usage-ledger.json`.
- ATTOM, RentCast, Google, county, MLS, Supabase/PostgreSQL, and Netlify calls/actions: **0** in this continuation.
- No application/database integration, schema, PI data, production, or deployment changes.
