# PI First American UAT Endpoint Contract V1

Date: 2026-10-14  
Mode: offline repository and retained-evidence review  
Classification: **ADDITIONAL_DOCUMENTATION_REQUIRED**

## Decision

PI has enough retained evidence to authenticate, run an exact-address `SearchStandard` lookup, and order `TotalViewReport` by `FullAddress`. It does **not** yet have a vendor-documented, executable contract for ZIP-based distress discovery, Advanced Search, Last Finance Document, Foreclosure Report, Open Lien Report, or export behavior. No filter name, product selector, or enum may be inferred to fill those gaps.

No provider request, credential access, database access, code change, or deployment occurred during this review.

## Evidence standard

| Confidence | Meaning |
| --- | --- |
| `DOCUMENTED` | A retained endpoint/schema inventory or vendor request example identifies the contract. |
| `HISTORICALLY TESTED` | A retained ledger and protected raw response show the request succeeded. |
| `VENDOR STATED` | First American supplied the capability or endpoint mapping, but the repository lacks a complete executable schema or response example. |
| `UNKNOWN` | Retained evidence does not safely establish the claim. |

## Located evidence

| Evidence | Finding | Confidence |
| --- | --- | --- |
| `docs/DATATREE_UAT_ENDPOINT_INVENTORY.md` — “Swagger contract inventory,” “2026-10-06 continuation,” “2026-10-07 authorized TotalView request,” and “Last Finance Document contract gate” | UAT base URL, Swagger routes, generic endpoint/schema names, product entitlements, and tested SearchStandard/TotalView contracts | `DOCUMENTED` and `HISTORICALLY TESTED` as identified below |
| `docs/DATATREE_UAT_CAPABILITY_POC.md` — “Identity and request,” “Response structure,” “Capability inventory,” and “Differentiation and next report” | Sanitized analysis of the one successful SearchStandard and one successful TotalView result | `HISTORICALLY TESTED` |
| `docs/DATATREE_UAT_GAP_ANALYSIS.md` — capability-gap and next-step sections | Mortgage, lien, foreclosure, listing, and document gaps | `DOCUMENTED` repository analysis |
| `docs/DATATREE_COMMERCIAL_QUESTIONS.md` — pricing/licensing question sections | Unresolved pricing, retention, display, and licensing questions | `DOCUMENTED` open questions |
| `data/validation/datatree-uat/usage-ledger.json` — `requests`, `providerAccounting`, and request-ceiling fields | One property search, one report, request metadata, and protected raw-response paths | `HISTORICALLY TESTED` |
| `data/validation/datatree-uat/raw/` | Protected SearchStandard and TotalView responses; directory is gitignored and contains private data | `HISTORICALLY TESTED` |
| Supplied endpoint guidance | `GetReport`, `GetDocument`, and `ExportReport` product mappings; Advanced Search geography/batch capability; investor-interface restriction | `VENDOR STATED` unless independently documented below |

No saved OpenAPI/Swagger file, product-specific Advanced Search example, Last Finance example, Foreclosure example, Open Lien example, or ExportReport example was found. No reusable DataTree client or automated DataTree UAT suite was found. The local environment declares `DATATREE_CLIENT_ID` and `DATATREE_CLIENT_SECRET`; values were not read or reproduced. Those variable names are not currently present in `.env.example`.

## UAT host and authentication

- API base: `https://dtapiuat.datatree.com/api`
- Swagger UI reference: `https://dtapiuat.datatree.com/swagger/ui/index`
- Swagger JSON reference: `https://dtapiuat.datatree.com/swagger/docs/v1`
- Authentication: `POST /api/Login/AuthenticateClient`
- Retained schema: `AuthClientRequestVm` with `ClientId` and `ClientSecretKey`; optional `bci` header
- Result: JWT, historically received successfully and held only in memory
- Protected endpoints require the JWT authorization header
- Token lifetime, refresh behavior, rate limits, standard error schema, and whether authentication is billable are `UNKNOWN`

## Endpoint contract inventory

The vendor URLs supplied for this review append `?Ver=1.0`; the historical successful calls used the corresponding API routes without relying on a guessed version value. Before future execution, First American should confirm whether `Ver=1.0` is required, optional, or informational.

| Capability | Route / method | Known request contract | Known response | Paging, batch, limits, errors | Readiness |
| --- | --- | --- | --- | --- | --- |
| Exact-address identity | `POST /api/Search/PropertySearch` | Required `ProductName` and `Filters`. Proven values: `ProductName=SearchStandard`, `FilterName=FullAddress`, `FilterOperator=is`, exact address; historical request also used `CountOnly=false`, `MaxReturn=1`, `SpatialType=Geography`. | `LitePropertyList`, `MaxResultsCount`, `Message`, `OrderItemId`, `ReferenceId`; property rows include DataTree PropertyId, address, APN, FIPS, geocode and land-use fields. | Only `MaxReturn=1` is tested. Pagination, batch behavior, error catalog, and billing are unknown. | `HISTORICALLY TESTED` for one exact address only |
| Geographic distress discovery | Vendor states Advanced Search supports geography/batch. `POST /api/Report/GetFlexSearch` is inventoried separately with `FlexSearchRequestVm`. | No exact endpoint/product identifier or request example for Advanced Search; no ZIP, county, SFR, NOD, trustee-sale, foreclosure-status, event-date, or publication-date filter dictionary. | Candidate identity and event response fields are not documented locally. | Pagination, maximum results, batch limits, ordering, date-window semantics, invalid-filter errors, and price are unknown. | **Not executable**; relationship between Advanced Search and Flex Search is `UNKNOWN` |
| TotalView | `POST /api/Report/GetReport?Ver=1.0` (historical route: `/api/Report/GetReport`) | Proven body uses `ProductNames=["TotalViewReport"]`, `SearchType="FullAddress"`, and `FullAddress`. Do not convert SearchType to an integer. | Report metadata plus subject property, ownership, legal/vesting, sale/transaction, lien, foreclosure, property, nearby-sale/listing, market, tax, and file-link sections. | One report returned synchronously as `Ready`. Async states, polling rules, batch limits, errors, and price are unknown. | `HISTORICALLY TESTED` once |
| Foreclosure Report | Vendor maps Foreclosure Report to `GetReport`. Product appears in the entitlement list. | Exact `ProductNames` wire value, accepted search method, and body are unknown. | Expected lifecycle/event schema, code dictionary, completeness, rescission/cancellation/postponement, and subsequent-sale handling are unknown. | Limits, polling, errors, and billing unknown. | `VENDOR STATED`; not executable |
| Open Lien Report | Vendor maps Open Lien Report to `GetReport`. Earlier retained entitlement evidence did not claim Open Lien as enabled. | Exact product value, body, and current account entitlement are unknown. | Lien status, priority, amount, release/satisfaction, and document fields are unknown. | Limits, errors, and billing unknown. | `VENDOR STATED`; entitlement and contract require confirmation |
| Last Finance Document | `POST /api/Report/GetDocument?Ver=1.0`; generic retained schema name `DocumentRequestVm` requires `ProductNames` and `SearchType`. `GetDocumentById` and download routes are inventoried separately. | Exact product identifier, supported FullAddress/PropertyId method, remaining required properties, and whether a prior search/order is required are unknown. The TotalView body must not be reused by assumption. | Whether the initial result is metadata, image/PDF, both, or a link is unknown. Download prerequisites are unknown. | Result limits, document/image fees, polling, errors, and retention rights unknown. | Route `DOCUMENTED`; product contract **not executable** |
| ExportReport | `POST /api/Report/ExportReport?Ver=1.0`; retained `ExportReportRequestVm` requires `ProductNames` and `Filters`. | Vendor maps Foreclosure Detail Export, Open Lien Export, Property Detail Export, and other products here. Exact product/add-on identifiers and filter schema are unknown. | Format, async order/status/download relationship, file fields, and manifest metadata are unknown. | Record caps, paging/chunking, batch size, timeout, errors, and price unknown. | `VENDOR STATED`; not executable |
| Status/download helpers | `GET /api/Report/GetReportStatus`, `GetDeliveryStatus`, `DownloadDocument`, `DownloadDocumentV2`, `DownloadZipDocument` | Order/file-link parameters are only generically inventoried. | No locally retained examples. | Poll cadence, expiry, error and charge semantics unknown. | Inventoried only |

## Historically valid request contracts

The following are the only retained product requests suitable as concrete examples. Address values are deliberately represented as placeholders here.

### SearchStandard by exact full address

```json
{
  "ProductName": "SearchStandard",
  "CountOnly": false,
  "MaxReturn": 1,
  "SpatialType": "Geography",
  "Filters": [
    {
      "FilterName": "FullAddress",
      "FilterOperator": "is",
      "FilterValues": ["<authorized exact address>"]
    }
  ]
}
```

The structure reflects the retained successful request. Any different filters or filter nesting require vendor confirmation.

### TotalView by full address

```json
{
  "ProductNames": ["TotalViewReport"],
  "SearchType": "FullAddress",
  "FullAddress": "<authorized exact address>"
}
```

This contract was vendor-supplied and historically succeeded once. It does not establish that other report/document products accept the same body.

## TotalView evidence boundaries

The tested response exposed fields capable of representing:

- recorded sale and transaction dates, amounts, document IDs/types, finance type, lien position, original document links, assignment/release verification, loan terms and unpaid balance;
- lien summary and involuntary-lien document references;
- foreclosure filing/auction dates, document type, status and unpaid balance;
- property, tax, nearby-sale/listing, and market context.

For the tested subject, TotalView returned sale history and lien/notice references but did not return a distinct mortgage, loan position, current balance, assignment/release event, or foreclosure detail. Missing or null values mean **NOT RETURNED**, not proof that no event or encumbrance exists.

First American has stated that outstanding mortgage balances are algorithmic estimates. Their provenance classification is `ALGORITHMIC_ESTIMATE`; PI must display any such value as `MODELED / ESTIMATED BALANCE` with provider and as-of date. It is not a recorded original loan amount, a foreclosure unpaid-balance field, a verified current balance, or a lender payoff.

## Identity reconciliation contract

- Keep DataTree `PropertyId`, DataTree APN/FIPS, county ATN/APN9, RentCast `id`, and RentCast `assessorID` in separate namespaces.
- Treat DataTree PropertyId as First American's internal property identifier, not a county parcel identifier.
- Preserve provider identifiers verbatim and normalize only for comparison.
- Require exact jurisdiction/address corroboration plus an authoritative parcel relationship before attaching the evidence to a durable PI Property.
- Compare recorded events with document identifier, recording/event date, amount, and instrument type. Formatting differences may corroborate but are not silently rewritten.
- Preserve product name, retrieval time, source/as-of dates, order/reference IDs, and a private raw-response fingerprint.
- Quarantine identity conflicts; do not use address similarity alone.

## Product selection matrix

| Product | UAT role | Classification | Reason |
| --- | --- | --- | --- |
| Advanced Search | Find a small ZIP 93312 residential distress cohort | **Needed for MVP**, if it is a distinct documented product | Exact-address SearchStandard cannot perform the required geographic discovery |
| Flex Search | Possible search mechanism | **Not yet justified** | Relationship to Advanced Search and filter contract are unknown |
| TotalView | Broad subject evidence after identity reconciliation | **Needed for MVP** | Exact request is proven and it provides a useful first-pass inventory |
| Foreclosure Report | Resolve foreclosure lifecycle/status gaps | **Optional later phase** | Use only if TotalView/discovery leaves a specific foreclosure question and the contract is supplied |
| Open Lien Report | Resolve lien status/priority/release gaps | **Optional later phase** | Current entitlement and exact contract are unconfirmed |
| Last Finance Document | Establish latest recorded finance instrument and document evidence | **Optional later phase** | High value, but exact selector, response form, and charge are unknown |
| ExportReport | Batch/export workflow | **Not yet justified** | A three-result sequential UAT does not require bulk export; contract and limits are unknown |

## Commercial and distribution boundary

The prior pricing table was withdrawn because it applied to another customer and is not used here. PI-specific UAT billing, per-product pricing, download/image charges, rate limits, and production pricing remain unconfirmed.

The vendor has stated that investor-facing DataTree reports must be accessed through a password-protected website or interface. That is not permission for unrestricted PDF redistribution. Retention, caching, normalized-field storage, SaaS display, downloadable PDFs, onward sharing, attribution, termination, and deletion obligations require written confirmation before product integration or investor delivery.

## Readiness gaps

1. Vendor-authored Advanced Search/Flex Search relationship and exact ZIP/SFR/distress request.
2. Filter/operator/value dictionaries and foreclosure status/event lifecycle semantics.
3. Last Finance, Foreclosure Report, Open Lien, and ExportReport exact product identifiers and examples.
4. Pagination, batch caps, polling, error schema, rate limits, and request/report/document billing.
5. Current PI entitlements, especially Open Lien.
6. Applicable retention, authenticated-display, PDF/export, and termination rights.
7. A retained vendor-authored OpenAPI file or versioned examples to make future execution reproducible.

**Final classification: `ADDITIONAL_DOCUMENTATION_REQUIRED`**

