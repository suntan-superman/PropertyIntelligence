# First American / DataTree UAT Capability POC

## Current result — 2026-10-07

**TotalView request succeeded for the single 3484 Haven fixture.** This remains a local, read-only, one-property capability test. No PI application/database data was changed and no production integration or deployment was made.

The separately authorized Last Finance Document test is currently **STOPPED BEFORE REQUEST**: available documentation presents it as a document-image product (`GetDocument`), while this authorization describes one report and the existing exact FullAddress wire example is for TotalView/GetReport only. Swagger does not enumerate `ProductNames` values or provide a product-specific request example. No new authentication, report, or document request was made; obtain the exact vendor API contract before resuming.

### Identity and request

The prior exact-address SearchStandard request uniquely resolved the fixture to DataTree `PropertyId=10668360`, parcel representation `251-091-30-00-1`, and situs `3484 HAVEN ST, ROSAMOND, KERN, CA 93560`. It is not an APN9 identity assertion.

First American subsequently supplied authoritative wire guidance. The one GetReport request used exactly:

```json
{
  "ProductNames": ["TotalViewReport"],
  "SearchType": "FullAddress",
  "FullAddress": "3484 Haven St Rosamond, CA 93560"
}
```

The earlier Swagger integer-enum blocker is preserved historically; vendor guidance supersedes it for this request. No enum integer was guessed and no undocumented parameters were added.

- Authentication: HTTP 200; bearer token held in process memory only, not printed or persisted.
- GetReport: HTTP **200**, elapsed **4,503 ms**.
- `StatusDescription`: `Report generation completed.`
- `MaxResultsCount`: **1**; exactly one `Reports` item.
- `PropertyId`: **10668360**; `ReportName`: **TotalViewReport**; `ReportStatus`: **Ready**.
- `ReferenceId`: null; `OrderItemId`: **45519838**.
- Subject address in `Data.SubjectProperty`: **3484 HAVEN ST, ROSAMOND, CA 93560**; parcel `251-091-30-00-1`.
- Raw response retained only in ignored `data/validation/datatree-uat/raw/totalview-3484-haven-20261007.json`. It includes owner/party fields and must not be copied into shareable artifacts.

### Response structure and subject/nearby separation

The top-level response contains `StatusDescription`, `MaxResultsCount`, `LitePropertyList`, and `Reports`. The single report contains metadata plus `Data`. Major `Data` sections are: `SubjectProperty`, `OwnerInformation`, `LienSummary`, `LegalAndVestingData`, `LastMarketSaleInformation`, `ListingPropertyDetail`, `ForeClosureData`, `AssociationInformation`, `PropertyDetailData`, `Transactions`, `InvoluntaryLienInfo`, `NearByListingData`, `NearBySalesData`, `MarketTrendData`, `ListingHistory`, `TaxStatusData`, and `FileLink`.

All property-level conclusions below use `Data.SubjectProperty` or the subject report sections. The 10 records in `NearBySalesData` are neighboring/comparable records, not the subject. Their listing/status fields are not attributed to 3484 Haven.

### Capability inventory

| Area | TotalView result for the subject | Assessment |
|---|---|---|
| Identity/address | PropertyId, normalized situs, county/state/ZIP, and DataTree parcel returned; matches the unique SearchStandard fixture | **CORROBORATES identity** |
| Property characteristics | `PropertyDetailData` includes site information (land use SFR) and characteristics including 1966, 3 bedrooms, 1,265 living area; several further fields are present in the raw schema | Useful subject-level property/assessor-style detail; no owner details reproduced here |
| Last sale | 2025-02-11 sale, $117,500; recording date 2025-02-12; DataTree document fields `2025.15503` / instrument `000000015503` | **CORROBORATES** ATTOM date/amount and numeric document suffix (`0000015503`), with different formatting |
| Older sales | One additional transaction is dated 1994-09-10, $68,500 | Historical transaction returned |
| Mortgage / loan position | The two `Transactions` entries are sales; the 2025 transaction has `LoanAmount=0`. No subject mortgage record, loan position, interest rate/term, or current balance was returned | ATTOM mortgage $117,500: **NOT RETURNED**; ATTOM modeled balance $114,181: **NOT RETURNED** |
| Mortgage lifecycle | No assignment, release, satisfaction, or reconveyance item was identified in the returned subject transactions | **NOT RETURNED** in this response; do not infer none exist |
| Liens / encumbrances | `LienSummary` reports HOA and PACE `LienOnProperty=false` with `CountyDataAvailable=true`; involuntary lien indicator is true. Two `InvoluntaryLienInfo` records are labeled `TOWN LIEN` and `NOTICE` (party data omitted) | Useful distinct lien/notice signal; underlying legal effect/status requires document-level review |
| Foreclosure | `ForeClosureData` fields are null; no subject foreclosure event details returned | ATTOM's 0 default / 0 auction records: **NOT RETURNED**, not a confirmed zero by this report |
| Listing, subject | Subject `ListingPropertyDetail` fields are null; `ListingHistory` count 0; `NearByListingData` count 0 | No subject current/historical listing record returned; no current subject status/date/price established |
| Listings, nearby | `NearBySalesData` has 10 neighboring sales, each with listing/status fields; six have raw `PropertyStatus="L"`, four null. Some include listed date/price; some use `0001-01-01` and/or zero. | Comp/nearby-only. Status codes are undocumented and are not interpreted as active/inactive. Anomalous values are retained as vendor output, not corrected. |
| Comparable sales | 10 records; sale dates span 2020-03-19 to 2026-09-15; prices $220,000–$400,000; distances about 0.142–0.317 mi; lot area, living area, year, beds/baths, garage, and price/SF fields are present | Useful descriptive comp evidence, not an independent valuation; selection methodology was not described in the response |
| Recorded documents | Sale and involuntary-lien document references are present; report `FileLink` is empty/not usable in the captured response | References available; document retrieval/image access not proven by this call |
| Ownership / vesting | Ownership and legal/vesting sections exist, but may contain personal data | Inventory confirms section presence only; PII intentionally excluded from report |
| Tax/assessment | Tax status and county recording-history sections exist | No conclusion beyond returned fields; absence of an assessment number/value here is not evidence of absence in other products |

No TotalView subject AVM was used as a substitute for RentCast. RentCast AVM **$353,000** and range **$323,000–$383,000** are **NOT COMPARABLE** to this report's nearby sale/listing evidence.

### ATTOM comparison

| Known independent evidence | DataTree TotalView observation | Result |
|---|---|---|
| ATTOM sale 2025-02-11, $117,500, doc `0000015503` | Subject sale 2025-02-11, $117,500; recorded 2025-02-12; DataTree doc `2025.15503`, instrument `000000015503` | **CORROBORATES**; document identifiers differ in formatting but share numeric suffix 15503 |
| ATTOM mortgage 2025-02-12, $117,500 | No mortgage transaction was returned; latest sale record has `LoanAmount=0` | **NOT RETURNED** |
| ATTOM modeled total loan balance $114,181 | No current/estimated loan balance returned | **NOT RETURNED** |
| ATTOM default 0 / auction 0 | Foreclosure section fields are null; no subject foreclosure details | **NOT RETURNED** (not a zero-record confirmation) |
| RentCast AVM $353,000; range $323,000–$383,000 | TotalView returned nearby sales and market-trend sections, not a subject AVM comparable to RentCast | **NOT COMPARABLE** |

### Listing-data answer

1. Current or historical subject listing: **not returned**. The subject listing detail is all null and subject listing-history/nearby-listing arrays are empty.
2. Current subject listing status: **not returned**.
3. Subject last-listed date: **not returned**.
4. Subject asking/listed price: **not returned**.
5. Listing-status semantics: **not documented** in the returned payload; do not decode `L`.
6. Listing fields are observed on the 10 nearby/comparable sale records only, not as subject-level listing facts.

These POC listing observations do not alter MLS Validation Round 1 selection; 3484 Haven remains excluded.

### Differentiation and next report

TotalView's demonstrated additive value beyond the tested ATTOM + RentCast stack is a structured sale history, nearby property/market evidence, and a subject involuntary-lien indicator plus two document references (Town Lien and Notice). It did **not** answer the key open-mortgage/balance/lifecycle question; it did not provide subject listing evidence or foreclosure details in this response.

Highest-priority remaining gap: identify the 2025-02-12 mortgage/finance document and determine whether DataTree exposes an active loan and document-level mortgage evidence. Recommend exactly one next test: **Last Finance Document**, using only this same DataTree PropertyId/fixture if authorized. **Not ordered.**

### Request accounting and scope

- Property/report activity: **1 SearchStandard + 1 TotalView** (2 cumulative; target ceiling 10, hard ceiling 20).
- Authentication: **5 total** (token never persisted/displayed); Swagger: **3**.
- ATTOM 0; RentCast 0; Google 0; county 0; MLS 0; Supabase/PostgreSQL 0; Netlify 0.
- No other property, production data, PI database, application, schema, scoring, or deployment was touched.

## Preserved history

The earlier Swagger `SearchType` integer-enum blocker and the prior stop before report ordering remain historically accurate. First American's later written instruction authoritatively superseded that blocker with the exact semantic request body used above. No enum integer was guessed.
