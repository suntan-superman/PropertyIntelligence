# First American / DataTree UAT Endpoint Inventory

## Status

**BLOCKED at Gate 3 request-contract ambiguity — no property-data calls made.**

### 2026-10-02 update

The supplied correction identifies the authoritative property UAT host as `https://dtapiuat.datatree.com/api` and Swagger UI as `https://dtapiuat.datatree.com/swagger/ui/index`. The host resolved and Swagger returned HTTP 200. The earlier `dtiapiuat.datatree.com` DNS failure remains preserved historically and is not used.

The local repository and attachment directory did not contain the promised DataTree property Swagger/OpenAPI definition. The supplied screenshots provide a route/product summary, but not request/response schemas, and the correct property host is currently DNS-unreachable.

The publicly available DCIS guide documents identity/invitation management, not the property, transaction, mortgage, lien, foreclosure, or recorded-document APIs required by this capability POC. It is therefore not used as a substitute property API contract.

## Gate 1 — DataTree property API authentication

- Authentication: **PASS**
- Token received: **YES**
- Token type: **JWT**
- Token persisted: **NO**
- Credentials: loaded from local `.env` only; not printed, persisted, or included in artifacts
- Property-data requests: **0**

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

## Gate 3 blocker

Swagger defines `FilterName`, `FilterOperator`, and `FilterValues` only as unconstrained strings/arrays, and defines `SearchType` only as numeric values `[0..5]` without meanings or examples. No authoritative PropertySearch request example was supplied. A 3484 Haven query cannot be safely constructed without guessing these values, so no property-data request was sent.

## Candidate documentation locations checked

- Repository files under `docs/`, `data/`, `scripts/`, and the full repository tree
- Pasted-attachment directory
- Official First American DCIS integration guide
- UAT property Swagger/documentation routes on `dtiapiuat.datatree.com` (DNS failure)

## Required inventory (not yet verifiable)

The following remain **UNKNOWN / NOT TESTED** until First American supplies an accessible property API contract and confirms that the credentials are entitled to it:

- Property identity and address/APN lookup
- DataTree permanent property identifier
- Current ownership and deed/transaction history
- Mortgages, loan positions, terms, rates, and estimated balances
- Assignments, releases, satisfactions, and reconveyances
- NOD, NTS, auction, foreclosure, REO, and trustee deed records
- Open liens, judgments, tax liens, mechanics liens, HOA liens, and PACE liens
- Recorded documents, images, and title-chain endpoints

## Required unblock

Provide an authoritative `PropertySearch` request example or filter dictionary from First American/DataTree, specifically the address filter name/operator and the address search type value. Do not provide credentials in chat or commit them to the repository. Resume at Gate 3 only then; do not make property calls before the request contract is verified.

