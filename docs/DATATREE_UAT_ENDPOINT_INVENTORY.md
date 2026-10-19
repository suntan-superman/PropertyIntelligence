# First American / DataTree UAT Endpoint Inventory

## Status

**SearchStandard identity PASS; one TotalView report completed successfully on 2026-10-07.** The earlier report blocker below is retained as historical context and was superseded by written First American wire guidance.

### 2026-10-07 — authorized TotalView request

First American instructed that `SearchType` integer values 0–5 are not used for this request and supplied this exact body. It was sent unchanged once to `POST /api/Report/GetReport`:

```json
{
  "ProductNames": ["TotalViewReport"],
  "SearchType": "FullAddress",
  "FullAddress": "3484 Haven St Rosamond, CA 93560"
}
```

Authentication returned HTTP 200; token remained in memory only. GetReport returned HTTP 200 in 4,503 ms, `StatusDescription=Report generation completed.`, `MaxResultsCount=1`, one report, `PropertyId=10668360`, `ReportName=TotalViewReport`, `ReportStatus=Ready`, `ReferenceId=null`, `OrderItemId=45519838`. Subject situs and parcel matched the unique SearchStandard fixture. Raw response is restricted to ignored `data/validation/datatree-uat/raw/totalview-3484-haven-20261007.json`; it contains PII and must not be copied into shareable artifacts.

The report response's major sections and capability findings are documented in `DATATREE_UAT_CAPABILITY_POC.md`. Nearby/comparable rows are distinct from `Data.SubjectProperty`; their listing/status fields were not attributed to the subject. Exactly one report request was made; no follow-on report was ordered.

### 2026-10-07 — Last Finance Document contract gate (STOP before request)

The available First American materials list Last Finance Document as a provisioned product, and the product documentation describes it as a document-image retrieval. The route inventory distinguishes `GetDocument` from `GetReport`, while the available Swagger defines `ReportRequestVm.ProductNames` only as an unconstrained string array and supplies no Last Finance Document wire identifier or request example. The authorized task calls this a report and permits the proven FullAddress GetReport pattern only if documented for that product. The exact route/product contract therefore cannot be established safely from the available documentation. No new authentication, GetDocument, or GetReport request was made. Request a vendor-provided API example identifying endpoint, exact product value, and supported search body before proceeding.

### 2026-10-08 — Rodolfo Get Document documentation review

**`VENDOR CLARIFICATION REQUIRED`**. The supplied [Get Document documentation page](https://info.datatree.com/dtapi-dev-portal/get-document) returned HTTP **403 Forbidden** to a no-credential read-only fetch; the web documentation lookup was also inaccessible/no results. The supplied endpoint summary maps Last Finance Document retrieval to `POST /api/Report/GetDocument`; the previously inspected Swagger identifies `DocumentRequestVm` with required `ProductNames` and `SearchType`, and `POST /api/Report/GetDocumentById` with `SpecificDocumentRequestVm`. The endpoint route is therefore identified, but the material available locally does not provide the product-specific `DocumentRequestVm` property schema or exact Last Finance Document `ProductNames` value. The required JSON body, supported `Address`/`PropertyId` selection, whether a prior document query/order is required, whether the response is metadata or document/PDF content, and any ordering/usage charge or limit remain **UNVERIFIED**. The proven TotalView `GetReport` FullAddress pattern is not assumed to apply. No DataTree authentication, report, or document call was made. Obtain a vendor-provided exact request/response example and usage terms before any document request.

### 2026-10-02 update

The supplied correction identifies the authoritative property UAT host as `https://dtapiuat.datatree.com/api` and Swagger UI as `https://dtapiuat.datatree.com/swagger/ui/index`. The host resolved and Swagger returned HTTP 200. The earlier `dtiapiuat.datatree.com` DNS failure remains preserved historically and is not used.

Historical status at this point: the local repository and attachment directory did not contain the promised DataTree property Swagger/OpenAPI definition. The supplied screenshots provided a route/product summary, but not request/response schemas. This was later superseded when the corrected property host and Swagger JSON became reachable; the host is not currently treated as DNS-unreachable.

The publicly available DCIS guide documents identity/invitation management, not the property, transaction, mortgage, lien, foreclosure, or recorded-document APIs required by this capability POC. It is therefore not used as a substitute property API contract.

## Gate 1 — DataTree property API authentication

- Authentication: **PASS**
- Token received: **YES**
- Token type: **JWT**
- Token persisted: **NO**
- Credentials: loaded from local `.env` only; not printed, persisted, or included in artifacts
- Property/report requests in the complete POC: **2** (1 SearchStandard + 1 TotalView). The authentication-only historical phase had 0 property-data requests.

## Swagger contract inventory

- Swagger UI: `https://dtapiuat.datatree.com/swagger/ui/index`
- Swagger JSON: `https://dtapiuat.datatree.com/swagger/docs/v1`
- API base: `https://dtapiuat.datatree.com/api`
- `POST /api/Login/AuthenticateClient` — `AuthClientRequestVm { ClientId, ClientSecretKey }`; optional `bci` header; JWT response.
- `POST /api/Search/PropertySearch` — `SearchRequestVm`; required `ProductName`, `Filters`; required JWT `Authorization` header.
- `POST /api/Search/AddressStandardization` — `AddressSearchRequestVm`; inventoried but not used because the gate requires PropertySearch only.
- `POST /api/Report/GetReport` — `ReportRequestVm`; required `ProductNames`, `SearchType`; required JWT.
- `POST /api/Report/GetDocument` — `DocumentRequestVm`; required `ProductNames`, `SearchType`; required JWT.
- `POST /api/Report/GetDocumentById` — `SpecificDocumentRequestVm`; required JWT.
- `POST /api/Report/ExportReport` — `ExportReportRequestVm`; required `ProductNames`, `Filters`; required JWT.
- `GET /api/Report/DownloadDocument`, `DownloadDocumentV2`, `DownloadZipDocument` — file link and JWT.
- `POST /api/Report/GetFlexSearch` — `FlexSearchRequestVm`; required JWT.
- `GET /api/Report/GetReportStatus`, `GetDeliveryStatus` — order item ID and JWT.
- `GET /api/Report/HealthIndicator` — service health.

The written entitlement list is authoritative: Last Transfer Document, Last Finance Document, Specific Document, Assessor Map, Assessor Index Map, TotalView Report, Enhanced Transaction History, Transaction History Report, Sales Comparables, Foreclosure Report, HOA Contact Report, HOA Lien Report, Instant Recordable Legal, Flex Search, Property Status Indicator, and Search Standard. Open Lien and PACE are not claimed as enabled.

### 2026-10-06 continuation — search succeeded; report call remains gated

First American supplied the exact SearchStandard request contract: `ProductName=SearchStandard`, `FilterName=FullAddress`, `FilterOperator=is`, and the exact fixture address. One request returned HTTP 200 in 653 ms with exactly one result. DataTree `PropertyId=10668360`; returned parcel/APN string is `251-091-30-00-1`; returned situs is 3484 HAVEN ST, ROSAMOND, KERN, CA 93560; land-use description is SFR. No match-quality field was returned. Raw response is retained under the gitignored `data/validation/datatree-uat/raw/` directory.

At the time of this 2026-10-06 update, the report Swagger schema included optional `PropertyId` but required `SearchType`, documented only as integer enum `[0..5]`; no enum names/meanings or report example were then available. No request was made at that point. This historical state was superseded on 2026-10-07 by authoritative written First American guidance (above); the exact documented semantic FullAddress body was used for one TotalView call.

## Preserved historical Gate 3 blocker (search contract later supplied)

Swagger defines `FilterName`, `FilterOperator`, and `FilterValues` only as unconstrained strings/arrays, and defines `SearchType` only as numeric values `[0..5]` without meanings or examples. No authoritative PropertySearch request example was supplied. A 3484 Haven query cannot be safely constructed without guessing these values, so no property-data request was sent.

## Candidate documentation locations checked

- Repository files under `docs/`, `data/`, `scripts/`, and the full repository tree
- Pasted-attachment directory
- Official First American DCIS integration guide
- UAT property Swagger/documentation routes on `dtiapiuat.datatree.com` (DNS failure)

## Remaining capability limits after one TotalView response

The exact-address identity route and one TotalView subject response are now proven for this fixture only. Still **UNKNOWN / NOT TESTED** or insufficiently established:

- Address/APN lookup behavior outside this exact address; DataTree parcel is not APN9 corroboration.
- Mortgage instrument, loan position, terms/rate, open balance, and mortgage lifecycle. TotalView did not return a subject mortgage; Last Finance Document is recommended, not ordered.
- Whether the two involuntary-lien document references are open/enforceable or their balances/status; document retrieval and title-chain endpoints remain untested.
- Foreclosure event completeness; null TotalView fields are not a zero-record confirmation.
- Subject listing history/status/price. Listing fields observed on nearby properties only; status codes are undocumented.
- Whether TotalView includes all historical sale/recorded-document history or only a bounded subset.
- Methodology/selection criteria for the 10 nearby sales and market trend sections.
- Document image/download access and coverage/refresh/completeness semantics.
- Other enabled specialized report behavior and entitlement at runtime.

## Historical report-call blocker (cleared 2026-10-07)

The request was resolved when First American supplied the authoritative semantic wire body recorded above. One TotalView request succeeded for the unique 3484 Haven fixture. No additional report is authorized or has been ordered; the next report recommendation is Last Finance Document, pending separate review/authorization.

