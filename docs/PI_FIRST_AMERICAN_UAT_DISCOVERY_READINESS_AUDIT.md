# PI — First American UAT Discovery and Readiness Audit

Date: 2026-10-14  
Execution: repository inspection only; no authentication or provider request

## Recommendation

**ADDITIONAL DOCUMENTATION REQUIRED**

PI can authenticate historically, perform the vendor-supplied exact-address `SearchStandard` request, and order `TotalViewReport` by the proven semantic FullAddress contract. The repository does **not** contain a documented ZIP/property-type/distress search contract, a usable Advanced Search example/filter dictionary, or the exact Last Finance Document product request. Those gaps prevent a safe Bakersfield 93312 discovery test and Last Finance order without guessing.

## Evidence located

| Evidence | What it establishes |
| --- | --- |
| `docs/DATATREE_UAT_ENDPOINT_INVENTORY.md` | UAT hosts, Swagger routes, endpoint inventory, vendor-supplied SearchStandard and TotalView contracts, provisioned-product list, Rodolfo Get Document review |
| `docs/DATATREE_UAT_CAPABILITY_POC.md` | Successful one-property SearchStandard/TotalView result and sanitized capability analysis |
| `docs/DATATREE_UAT_GAP_ANALYSIS.md` | Remaining mortgage, lifecycle, foreclosure, listing, and Last Finance gaps |
| `docs/DATATREE_VS_ATTOM_CAPABILITY_MATRIX.md` | Provider capability comparison without treating missing values as absence |
| `docs/DATATREE_COMMERCIAL_QUESTIONS.md` | Open pricing, product, retention, display, and commercial-license questions |
| `data/validation/datatree-uat/usage-ledger.json` | Sanitized historical request accounting and exact prior result metadata |
| Protected raw responses | One SearchStandard and one TotalView response under gitignored `data/validation/datatree-uat/raw/` |

No reusable DataTree authentication/search/report client, provider adapter, or automated UAT test suite was found. The historical calls appear only through the retained evidence and ledger. Raw responses are correctly gitignored.

Local `.env` contains configured variables named `DATATREE_CLIENT_ID` and `DATATREE_CLIENT_SECRET`; values were not included in this report. These names are absent from `.env.example`.

## Documentation and portal references

- API base: `https://dtapiuat.datatree.com/api`
- Swagger UI: `https://dtapiuat.datatree.com/swagger/ui/index`
- Swagger JSON: `https://dtapiuat.datatree.com/swagger/docs/v1`
- Get Document page supplied through Rodolfo: `https://info.datatree.com/dtapi-dev-portal/get-document`

The repository refers to “Rodolfo Get Document documentation review,” but does not retain a correspondence file identifying Rodolfo Gomez by full name. The Get Document page historically returned HTTP 403 during unauthenticated inspection. No saved Swagger/OpenAPI document or Last Finance example was found.

The exact phrase **Advanced Search** does not occur in the retained repository evidence. `GetFlexSearch` is inventoried and Advanced Search was discussed outside the retained repository, but neither a request schema nor supported filters are locally established. It must not be treated as executable documentation.

## Confirmed endpoints and contracts

| Endpoint | Status | Confirmed use |
| --- | --- | --- |
| `POST /api/Login/AuthenticateClient` | Historically proven | `AuthClientRequestVm { ClientId, ClientSecretKey }`; JWT returned and never persisted |
| `POST /api/Search/PropertySearch` | Proven once | `ProductName=SearchStandard`, `FilterName=FullAddress`, `FilterOperator=is`, exact address; historical request also used `CountOnly=false`, `MaxReturn=1`, `SpatialType=Geography` |
| `POST /api/Search/AddressStandardization` | Inventoried only | Not tested |
| `POST /api/Report/GetReport` | Proven once | `ProductNames=["TotalViewReport"]`, `SearchType="FullAddress"`, `FullAddress=<exact address>` |
| `POST /api/Report/GetDocument` | Generic route inventoried | `DocumentRequestVm` requires ProductNames and SearchType; Last Finance wire value/body unknown |
| `POST /api/Report/GetDocumentById` | Inventoried only | `SpecificDocumentRequestVm`; prerequisite document identifier flow unknown |
| `GET /api/Report/DownloadDocument*` | Inventoried only | File-link/JWT routes; not tested |
| `POST /api/Report/GetFlexSearch` | Inventoried only | Request fields and supported filters not retained |
| `GET /api/Report/GetReportStatus`, `GetDeliveryStatus` | Inventoried only | Order-status routes |

The entitlement list includes TotalView Report, Last Finance Document, Foreclosure Report, Enhanced Transaction History, HOA Lien Report, Property Status Indicator, Flex Search, and Search Standard, among other products. Provisioning does not establish each product's wire identifier, request contract, price, or production/display rights.

## Proposed test readiness

| Proposed test | Readiness | Reason |
| --- | --- | --- |
| Geographic residential discovery in ZIP 93312 | **NOT READY** | No documented ZIP, geography, SFR/land-use, paging, result-limit, or Advanced/Flex Search contract is retained. Exact FullAddress SearchStandard is the only proven property-search filter. |
| NOD, trustee-sale, or foreclosure filtering | **NOT READY** | Foreclosure products are provisioned, but no filter names, operators, event/status code dictionary, rescission logic, or request example is retained. |
| TotalView for a small known-address sample | **CONDITIONALLY READY** | FullAddress request and response are proven. Candidate identities, UAT authorization, pricing, and call limit still require confirmation before a new-subject run. |
| Last Finance Document | **NOT READY** | Generic GetDocument route is known; exact ProductNames value, address/PropertyId method, prerequisite search/order, response form, and charge are unknown. |
| Mortgage, balance, lien, foreclosure evidence | **PARTIALLY READY** | TotalView exposes relevant fields/sections but did not return a subject mortgage or balance in the tested response. Specialized products remain untested. |
| Rescission/release/cancellation/subsequent-status analysis | **NOT READY** | TotalView transaction schema contains `AssignmentVerified`, `ReleaseVerified`, original-document IDs and parent/child document references, but completeness and status-transition semantics are undocumented and not demonstrated. |
| PI identity reconciliation | **DESIGN READY; DATA TEST PENDING** | SearchStandard returns PropertyId, address, APN, FIPS and geocode fields. The reconciliation must keep each provider identity namespaced and require exact corroboration. |

## Existing response fields

The SearchStandard sample returns DataTree `PropertyId`, `FAGeocodeID`, situs components, ZIP, APN, FIPS, latitude/longitude, land-use code/description, `IsInForeclosure`, sale fields, assessed/market values, and provider equity/estimated-value fields. Owner/mailing fields also exist and should be excluded unless specifically required and licensed.

The TotalView response provides report metadata (`OrderItemId`, `PropertyId`, `ReportName`, `ReportStatus`, `ReferenceId`) plus:

- subject property, ownership, legal/vesting and property characteristics;
- last market sale and transaction history;
- lien summary and involuntary-lien document references;
- foreclosure fields (`AuctionDate`, `DocumentType`, `FilingDate`, `Status`, `UnpaidBalance`);
- transaction fields including original/loan amount, finance type, lien position, lender, mortgage rate/type/term, assignment/release flags, original document identifiers and unpaid balance;
- tax status, nearby sales/listings and market trends.

The tested TotalView response returned two sales, an involuntary-lien indicator and two document references, but no distinct subject mortgage, loan position, current balance, assignment/release event, or foreclosure detail. Null or omitted data is **NOT RETURNED**, not proof of absence.

Last Finance Document and Foreclosure Report response fields remain unconfirmed. The requested UAT should explicitly test recorded instrument date/type/number, original mortgage amount, lien position, lender, assignments, releases/reconveyances, rescissions/cancellations, current status, sale-after-default events, image/link availability, source dates and coverage windows.

## Balance and equity boundary

First American has confirmed that outstanding mortgage balances are algorithmic estimates. PI must represent them as **MODELED / ESTIMATED BALANCE**, with provider and as-of date, never as a lender payoff or recorded current balance.

Recorded original mortgage amount, foreclosure unpaid balance, and modeled outstanding balance are separate measurements. They must not be substituted for one another. True equity must remain unresolved until current payoff, lien priority/status and other encumbrances are independently verified.

## Minimal UAT sequence after documentation is supplied

1. Obtain a vendor-authored Advanced Search or Flex Search example for ZIP 93312, residential/SFR restriction, supported NOD/NTS/foreclosure predicates, event/status values, paging/max-return controls and pricing.
2. Obtain the exact Last Finance Document endpoint, ProductNames wire value, supported FullAddress or PropertyId body, prerequisite order/search steps, response type, document-download flow and charge.
3. Confirm the authorized UAT subject count and a hard request/report/document ceiling. Authenticate once using the proven in-memory-token flow.
4. Make one bounded geographic search for ZIP 93312 with a vendor-documented residential and distress predicate. Request at most three candidates; no guessed filters, retries, pagination, fallback search, or owner-name search.
5. Reconcile each result before ordering: retain DataTree PropertyId separately; compare exact standardized address and returned APN/FIPS against county ATN/APN9 evidence and RentCast `id`/`assessorID`. Do not convert the DataTree parcel string into county APN9 by assumption. Quarantine conflicts.
6. Order TotalView for two or three uniquely reconciled candidates using only a documented search method. Separate subject data from nearby/comparable rows.
7. Order one Last Finance Document for the strongest candidate first. Stop if identity, contract, response interpretation, or cost differs from the vendor documentation; expand to another candidate only after review.
8. If needed, order one Foreclosure Report for a candidate returned by the documented distress filter to test NOD/NTS, rescission/cancellation, auction and subsequent-sale status semantics.
9. Compare document number/date/amount with county, ATTOM and RentCast evidence while preserving source-specific formatting and provenance. Stop before production integration.

## Identity reconciliation approach

- Namespace `DataTree PropertyId`, RentCast `id`, RentCast `assessorID`, county ATN and county APN9 separately.
- Treat DataTree PropertyId as First American's internal persistent property key, not a county parcel key.
- Retain DataTree APN/FIPS verbatim; normalize only for comparison and preserve the original value.
- Require exact address component and county/FIPS agreement plus an authoritative county parcel relationship before attaching provider evidence to a PI durable Property.
- Match recorded events using a compound comparison of document identifier, recording/event date, amount and instrument type. Formatting-only document-number differences may corroborate; they are not silently rewritten.
- Preserve retrieval time, source as-of/coverage dates, product name, order/reference IDs and raw-response fingerprint.

## Licensing and pricing gaps

The retained repository contains no executed account agreement or fee schedule. Confirm in writing:

- billing unit for authentication, search, report, document order, image/download and status polling;
- UAT allowance, rate/concurrency limits, minimum fees and production pricing;
- permitted retention of raw responses, normalized fields, identifiers, images and historical snapshots;
- SaaS display, derived analytics, combining with county/ATTOM/RentCast evidence, attribution and audit requirements;
- termination, revocation and deletion obligations;
- whether document images and report fields may be downloaded or exported by authorized users.

The vendor-stated requirement supplied for this audit is that investor-facing reports must be accessed through a **password-protected website or interface**. That statement was not found in the current repository artifacts, so it should be retained with its original correspondence and agreement context. It is not unrestricted PDF redistribution permission. Before any investor output, obtain explicit terms covering authenticated portal display, user access scope, downloadable PDFs, onward distribution, screenshots/exports, retention and termination.

## Remaining blockers

1. Vendor-authored ZIP/SFR/distress search request and filter dictionary.
2. Exact Last Finance Document request/response contract.
3. Foreclosure event/status/rescission/cancellation semantics and coverage.
4. Current UAT subject authorization, pricing and hard usage limit.
5. Executed rights terms, including the password-protected investor-interface requirement and PDF/download restrictions.
6. A retained copy/fingerprint of the applicable Swagger or vendor examples so future execution does not depend on undocumented memory.

**STOP — no DataTree authentication, API request, production change, deployment or database operation was performed.**
