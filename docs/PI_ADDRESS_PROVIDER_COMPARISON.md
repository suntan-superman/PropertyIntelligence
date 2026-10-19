# PI address provider comparison

Assessment date: 2026-10-08 PDT. **Documented capability is not a successful pilot test.** No live verification was performed. All account-specific entitlements, balances and rates not established by local evidence are explicitly **UNKNOWN**.

## Capability matrix

“Observed” refers to existing local evidence, not a new call. “Documented” refers to cited public documentation or the existing vendor-supplied POC contract. “Property address” is not a postal-deliverability certification.

| Criterion | County | Google | USPS | ATTOM | RentCast | DataTree |
| --- | --- | --- | --- | --- | --- | --- |
| Existing integration | Exact source/Assessor pipeline and local packets | Maps JS only; Geocoding/Places not implemented | None found | Local POC, not production adapter | Implemented property lookup/client/cache | UAT POC, not production adapter |
| Street verification | Observed literal situs, not postal validation | Documented geocoded components; untested in PI | Documented standardization; untested in PI | Observed standardized address on historical fixture | Observed record street; component matching implemented | Observed subject street in SearchStandard/TotalView |
| City verification | Observed literal prefill | Documented locality components; may be absent/differ | Documented postal city standardization | Observed locality on historical fixture | Observed `city`; exact comparison | Observed city on historical fixture |
| State | Dataset explicitly California; human citation required | Documented administrative-area component | Documented standardization; supported input needed | Observed state on historical fixture | Observed `state`; input required by PI adapter | Observed state on historical fixture |
| ZIP | Not found for pilots in inspected usable evidence | Documented postal component, not guaranteed | Documented ZIP/ZIP+4 delivery-address output | Observed complete historical address; pilot coverage UNKNOWN | Observed `zipCode`; missing-input-ZIP support needs clarification | Observed complete historical address; missing-input-ZIP behavior UNKNOWN |
| Parcel/APN corroboration | Exact ATN/APN9 relationships | None; place ID is not parcel ID | None; delivery point is not parcel ID | ATTOMID/raw parcel identity distinct; historic APN+FIPS failure preserved | `assessorID` observed; semantics/crosswalk UNKNOWN; not APN9 proof | PropertyId/raw parcel distinct; no APN9 proof |
| Match-quality evidence | Exact county identifiers; no postal score | Documented result count, types, `partial_match`, `location_type` | Address-standardization capability documented; exact current response/status contract not verified here | Unique `ExaStr` observed for other fixture, not pilots | One record + exact component checks; no provider confidence score established | Unique historical result; match-quality field NOT RETURNED |
| Cost per lookup | $0 incremental local reads; future acquisition/license cost UNKNOWN | Public Geocoding first paid tier $0.005/request; allowance below | UNKNOWN for applicable licensed product | UNKNOWN under current account | Public Developer overage $0.20/success; allowance below | UNKNOWN under UAT/production agreement |
| Existing quota | No remote calls needed for present evidence | Project allowance/usage UNKNOWN | No existing entitlement found; quota UNKNOWN | Historic POC hard ceiling 25 API Reports; not pilot authorization | Client cap 6 attempts per instance; account remaining UNKNOWN | Historic hard ceiling 20 property/report requests; not pilot authorization |
| Storage/retention rights | Local evidence already retained; broader redistribution rights UNKNOWN | Conditional exceptions, attribution and end-user limits; shared canonical reuse UNKNOWN | Separate license/use restrictions; PI retention rights UNKNOWN | Account/product terms for new pilot retention UNKNOWN | Public internal use/storage permitted with restrictions; account-specific exceptions UNKNOWN | UAT/production retention and downstream display rights UNKNOWN |
| Implementation effort | LOW to cite jurisdiction; cannot supply missing ZIP | MEDIUM: new adapter/access/retention review | MEDIUM/HIGH: new access, license and adapter | MEDIUM: adapt fixture-bound POC; resolve input/terms | LOW lookup reuse; MEDIUM secured reviewer integration | MEDIUM: contract/entitlement plus local adapter |

## Evidence and limitations

### County / existing local evidence

See [pilot-specific findings](PI_ASSISTED_ADDRESS_VERIFICATION_ASSESSMENT.md). Separately authoritative county metadata supports state; it does not provide ZIP. Reusing billing addresses, assigning a city-wide ZIP or silently treating county situs as postal-validated is unacceptable. County-situs cache is evidence, not a response cache with a provider freshness guarantee.

### RentCast: preferred minimal reuse, one unresolved lookup question

`GET /v1/properties` returns structured address fields and property attributes. Existing PI responses demonstrate address components, but not no-ZIP lookup accuracy on the three pilots. PI rejects empty, multiple, nonmatching or unit-bearing candidate results. Mechanical street normalization is not fuzzy parcel matching. Returned assessor identifiers cannot establish a county relationship without documented semantics. [Property endpoint](https://developers.rentcast.io/reference/property-records).

The public single-property guide recommends all four address components. Do not replace the request with a city, ZIP, radius, pagination or portfolio search to work around the missing ZIP. Ask for written confirmation of the narrower input contract. [Search contract](https://developers.rentcast.io/reference/search-queries).

Public API terms allow internal research/reference/quality-control use and storage. Retained lawfully obtained data can continue to be used under surviving terms after termination, subject to legal/third-party obligations and possible deletion requirements. This supports a minimal private suggestion artifact, not unrestricted resale or permission to retain every raw owner field. Account-specific amendments were not inspected. [RentCast API license, sections 1, 3 and 7](https://www.rentcast.io/terms-api).

### Google: technically suitable geocoding, not currently an enabled PI verifier

Geocoding accepts an address without requiring a postal code and returns component/geometry information. Result count, `partial_match`, result type and location precision support review; rooftop precision does not prove a county parcel relationship. Missing components or street/locality-level results must not become an approved address. The current browser Maps key proves neither Geocoding enablement nor a server-key entitlement. Places/autocomplete and Address Validation are separate products; no access is assumed. [Geocoding contract](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding).

The reviewed service terms include a 30-day coordinate-cache allowance **and** a conditional indefinite-cache exception for coordinates/formatted/structured addresses supporting the initiating end user's functionality, isolated to that user and not replacing additional service calls. Do not misreport these as a blanket prohibition or unconditional permanent shared-database permission. PI's eventual shared canonical identity use needs a terms check before selection. [Service terms, section 6](https://cloud.google.com/maps-platform/terms/maps-service-terms). Place IDs have an indefinite-storage exception; attribution and application policy requirements also apply. Human acceptance alone does not remove licensing restrictions. [Geocoding policies](https://developers.google.com/maps/documentation/geocoding/policies).

### USPS: good postal capability, not a free general-purpose PI database service

The public catalog describes standardization from street/city/state to a domestic delivery address including ZIP+4. No PI request, credentials or successful response exists. The detailed current API page was not readable in this review, so exact validation flags and product limits remain UNKNOWN. Do not use city/state ZIP lists as a substitute for a subject-address match. [USPS API catalog](https://developers.usps.com/apis?check_logged_in=1).

General USPS terms limit use to mailing/shipping unless a specific license permits otherwise; PI research/retention needs applicable written coverage. API-specific limits and deletion obligations must be reviewed with that license. [USPS terms](https://developers.usps.com/terms-and-conditions). Official 2026 notices reference enhanced Addresses access and a license agreement, so older claims of universally free address lookup are not an adequate current price basis. Exact PI fees/allowances remain UNKNOWN; no signup or license request was made. [USPS 2026 notices and Addressing API license listing](https://postalpro.usps.com/resources-list?items_per_page=25&page=26).

### ATTOM: identity rules useful, no need for another capability POC

Local [API POC evidence](ATTOM_API_CAPABILITY_POC.md), [gap analysis](ATTOM_API_GAP_ANALYSIS.md) and `data/validation/attom-poc/endpoint-inventory.json` establish complete-address `property/basicprofile` and returned `AttomID`/address/match fields. `AttomID` is authoritative for supported downstream requests; preserve the raw parcel string separately. Neither address agreement nor removal of the historical APN blocking gate turns that failed APN query into a successful parcel match. Partial-address input, new-pilot entitlement, pricing and retention terms remain UNKNOWN. Bulk feeds are not a Kern ZIP cache. No new APN-format experiments are recommended.

### DataTree: successful complete-address evidence, not partial-input certification

The [endpoint inventory](DATATREE_UAT_ENDPOINT_INVENTORY.md) documents one `SearchStandard` FullAddress property search and one `TotalViewReport` FullAddress request, with one consistent subject identity. SearchStandard already supplied complete components; ordering TotalView solely for ZIP would be unnecessary. No match-confidence field was returned. The inventoried `POST /api/Search/AddressStandardization` was not tested; neither its provisioned access nor its exact no-ZIP contract is established. Existing UAT credentials and a broad product list do not establish production licensing, prices, caching or SaaS display rights. Those remain UNKNOWN.

## Request and cost scenarios — not spending authorization

Assumptions: one request per uncached property, all successful, no retries, no AVM/reports/fallback, one billing period. Three pilots plus 77 other candidates equals 80; the pilots remain excluded from final Round 1 selection. Estimates are not expected match rates. Zero calls if sufficient licensed local evidence exists.

| Option | Three pilots | 80 candidates | 1,000 properties | Price interpretation |
| --- | ---: | ---: | ---: | --- |
| Local county/cache | 0 remote | 0 remote | 0 remote | $0 incremental reads; ZIP completeness not achieved |
| RentCast property lookup | 3 | 80 | 1,000 | With unused Developer allowance: $0 / $6 / $190; account reality UNKNOWN |
| Google Geocoding | 3 | 80 | 1,000 | With unused free cap: $0 / $0 / $0; with cap already consumed, first paid tier: $0.015 / $0.40 / $5 |
| USPS address standardization | 3 | 80 | 1,000 | Monetary cost UNKNOWN; authentication/token requests separate |
| ATTOM property/address lookup | 3 | 80 | 1,000 | Monetary cost/API Report consumption UNKNOWN; old POC budget not reusable authority |
| DataTree SearchStandard | 3 | 80 | 1,000 | Monetary cost UNKNOWN; one auth/session as needed, not included in data-request counts |

RentCast's public Developer plan is $0/month with 50 included requests, then $0.20 each. Foundation is $74/month with 1,000 included, then $0.06 each. Thus Foundation's public monthly fee is below the hypothetical $190 Developer total for 1,000 successes; this is a comparison, not a recommendation to change the account now. If the Developer allowance is already exhausted, the respective incremental examples are $0.60 / $16 / $200. Taxes and account agreements are excluded. [Public pricing](https://www.rentcast.io/api).

RentCast bills HTTP 200 responses with a body; non-200 responses are not billed under the public guide. An HTTP 200 ambiguous/empty result must still be accounted for, and a timeout's billing outcome may be unknown. Overages are automatic; the service does not provide a hard usage cap. Application attempt limits remain necessary. [Billing rules](https://developers.rentcast.io/reference/billing-and-pricing).

Google's public Geocoding schedule lists 10,000 free monthly events and $5 per 1,000 at the first paid tier. These are SKU-level assumptions, not evidence of remaining PI billing allowance. Other Maps products do not share an assumed unlimited free entitlement. [Google pricing](https://developers.google.com/maps/billing-and-pricing/pricing).

## Existing controls versus proposed controls

| Source | Existing controls / evidence | What a future pilot must do |
| --- | --- | --- |
| RentCast | 15-second timeout; six attempts per client instance; up to two transient retries; 300 ms spacing within a reused instance; quota-header checks; cache-first; redirects rejected | One attempt per pilot, three total persistently reserved across restarts, retries disabled; no AVM. Six per new client is not a global budget. |
| RentCast cache | Filesystem request/body hashes and timestamps; runtime memory alternative; no expiry policy in `readCache` | Require documented freshness/retention, exact request and packet binding; do not overwrite existing raw cache. Existing secret redaction does not remove owner PII. Use minimal allowlisted storage. |
| ATTOM | Historical ledger: 20 HTTP calls / 10 estimated API Reports; 25-report hard POC ceiling; bounded runner retries | Ledger is historical, billing estimates unverified; fresh authorization and report accounting required for different properties. |
| DataTree | Historical ledger: one search, one report, five property-API authentications; four Swagger reads and two unrelated historical authentication attempts separately classified; target 10 / hard 20 property-report requests | No new allocation assumed. Authentication, searches, reports and documentation reads must remain separate. No blind retries or report substitutions. |
| Google / USPS | No PI address-verification budget, cache or retry implementation | New explicit access/license review and bounded requests if separately chosen. No automatic fallback from RentCast. |
| County | Existing network client has configured timeout/delay/retries | Not used by this proposal: reuse local evidence only. |

## Questions that actually block the preferred pilot

1. RentCast: confirm/document a street + city + state, no-ZIP, single-address property lookup; explain ambiguity behavior and whether `zipCode` is subject situs rather than owner mailing data. Ask whether any returned match-quality indicator exists; do not invent one if absent.
2. Stan: inspect the existing RentCast API dashboard for active property-record access, current plan, remaining allowance, key restrictions and any account-specific storage terms. No key disclosure is needed. Then authorize a maximum three-attempt pilot and a monetary ceiling explicitly.
3. Only if RentCast cannot support that input: review Google Geocoding enablement and shared-storage fit, or obtain a documented licensed USPS/DataTree address-standardization contract. Choose one fallback for review; do not build or call all of them.

This is a small contract/account check, not a proposal for another broad provider POC.
