# PI assisted address verification assessment

Assessment date: 2026-10-08 PDT. Scope: local code/evidence inspection and public documentation review only. No authenticated account inspection or property-data requests.

## Recommendation

**PROVIDER CLARIFICATION REQUIRED**

Reuse **RentCast's existing property-record lookup**, subject to one narrow contract clarification: does `GET /v1/properties?address=...` support a single-property request containing street, city and state, **without ZIP**, and return the missing subject ZIP without broadening into a geographic search? PI's adapter accepts that input, but the public search guide recommends street, city, state and ZIP. This assessment does not convert that recommendation into either proof of support or proof of rejection. [RentCast search guidance](https://developers.rentcast.io/reference/search-queries).

The proposed sequence is: existing county jurisdiction evidence → reviewer-supported state → one RentCast property lookup → component comparison → human decision. No AVM, comps, report order, automatic second provider, geocoding framework or new identity system is needed. The existing review interface already supports manual evidence entry if the analyst obtains a suitable source independently.

Before live implementation, Stan should confirm the existing RentCast account's active product, available requests and spending limit. These account facts cannot be inferred from a populated key or old successful response. The [comparison](PI_ADDRESS_PROVIDER_COMPARISON.md) distinguishes public prices from account-specific costs; the [implementation plan](PI_ADDRESS_VERIFICATION_IMPLEMENTATION_PLAN.md) is a proposal, not executed work.

## Existing capabilities: implemented versus discussed

| Capability | Observed implementation and limits |
| --- | --- |
| Google Maps | `src/workbench/mapConfig.js` and `apps/web/src/features/comps-map/googleLoader.js` provide browser Maps configuration/loading. ComparableMap uses existing coordinates; this is not address verification. |
| Google Geocoding / Places / autocomplete | No working provider adapter or Places autocomplete found in the inspected application. `src/workbench/search.js` searches existing cached fixtures; it is not geocoding. Enabled Google APIs, key restrictions, billing and remaining quota are **UNKNOWN**. |
| Canonical address | `src/persistence/addressResolutionRepository.js` supplies `validateCanonicalAddress` and `providerReadyAddress`: required street, city, two-letter state, ZIP-5; optional ZIP+4. Format validation is not postal validation. Its persistence functions write the database and are out of scope. |
| Analyst review | `scripts/identity-resolution-pilot/review-model.js`, `review-store.js`, `review-http.js` and `review-ui/` already require component evidence, reviewer attestation, packet binding and acreage acknowledgment. `review-server.js` deliberately blocks all outbound traffic. |
| RentCast | `src/sources/rentcast/propertyLookup.js`, `client.js`, `config.js`, `cache.js`, `stores.js`: implemented lookup, exact component comparison, bounded requests, retry handling and caching. ZIP is optional in the lookup's input predicate, unlike PI's canonical validator. Returns only one matching record or a stop/ambiguity outcome. No postal-certification or parcel-link guarantee. |
| ATTOM | `scripts/attom-poc/run.js` and the ATTOM POC artifacts demonstrate complete-address lookup and downstream ID lookup for an excluded historical fixture. Not a production address adapter; no pilot ATTOM lookup exists. |
| DataTree | Existing UAT endpoint inventory, usage ledger and two private responses demonstrate SearchStandard and TotalView for the excluded historical fixture. Not a reusable production adapter. The inventoried AddressStandardization route is untested; its exact applicable contract is not established locally. |
| County | Existing exact ATN/APN9 Assessor relationships, Land DBF situs extraction, county metadata and pilot packets. Literal street/city splitting is display prefill, not a standardized postal resolver. |

Local credential inspection reported **names/presence only**, without loading provider clients or exporting values:

- Nonempty local entries: `RENTCAST_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `ATTOM_API_KEY`, `DATATREE_CLIENT_ID`, `DATATREE_CLIENT_SECRET`; existing `ATTOM_SFTP_USERNAME` / `ATTOM_SFTP_PW` are unrelated to this proposed lookup and were not used.
- `MARKET_DATA_API_KEY` is an empty fallback; `GOOGLE_MAPS_BROWSER_KEY` and `GOOGLE_MAPS_SERVER_API_KEY` were not present in the local file. The latter is mentioned by the map configuration's private-key exclusion logic, not a working server geocoder.
- County configuration names include `KERN_MAPSERVER_URL`, `KERN_PARCEL_LAYER_ID`, `KERN_REQUEST_TIMEOUT_MS`, `KERN_REQUEST_DELAY_MS`, `KERN_MAX_RETRIES`. Reading their names did not contact the county.
- No USPS integration/configuration was found. Local presence does not certify credentials, entitlement, cloud configuration or production settings; none was tested.

## Pilot-specific local evidence

All findings below use the existing three packets, decisions, source audits and prior Gate 1B snapshot. No cohort recreation, database refresh or identity mutation occurred.

| Review code | Exact county / Assessor identity | Independent state support | Subject ZIP found locally | Street/city request readiness | Acreage condition |
| --- | --- | --- | --- | --- | --- |
| IP-P1 | Present in certified packet | County source metadata explicitly supports California; reviewer citation still required | NO in inspected usable evidence | Present; state must be reviewed; no-ZIP provider contract unproven | Existing discrepancy requires acknowledgment and notes |
| IP-P2 | Present in certified packet | Same | NO in inspected usable evidence | Same | No existing acreage discrepancy flag |
| IP-P3 | Present in certified packet | Same | NO in inspected usable evidence | Same | Existing discrepancy requires acknowledgment and notes |

### State can be supported without guessing

The locally extracted county file `data/runtime/sprint6_2-kern-assessor/extracted/Shapefile_Parcels_Land_2026final/parcels_land_2026final_shp.xml` explicitly describes the geographic extent as Kern County in California. Its `dataIdInfo/idAbs` also describes the APN9 join to accompanying tax-roll tables; `exDesc` explicitly names the state. Metadata SHA-256:

`1b74e844badc0bba857f86f5a1668df971eb8c8010aa0a889f234d839536955b`

This is **dataset-level authoritative jurisdiction evidence**, not an independently observed per-row postal-state field. Together with each packet's exact county/Assessor source relationship, it is available for an analyst to cite when confirming state. The PI-created `county.jurisdiction = KERN_CA` label alone is not independent corroboration. No state was filled or approved during this assessment; all three packet state/ZIP fields remain missing.

### ZIP is not supplied by the inspected evidence

- The Land DBF source profile has `ADDR_SITUS`, but no separate subject state/ZIP fields. `ADDR_BILL1/2/3` are billing/mailing fields: they must not be substituted for subject situs, even if they contain a ZIP. Owner/contact fields were not exported.
- The existing KIPS situs layout contains street, city and unit fields, not subject state/ZIP. Its `TE_NO` relationship is not an excuse to invent a new join.
- The historical Power-to-Sell source has no subject address/APN columns. The private Gate 1B snapshot reports no canonical resolution/durable Property for these candidates at that snapshot; it is not a new statement about the current live database.
- Three property-array snapshots in the existing RentCast filesystem cache were inspected in memory. None matched any pilot's literal street/city under the existing mechanical comparison. This was cache-evidence discovery, **not address-based parcel linking**. No cached pilot ZIP was found.
- Existing ATTOM API and DataTree UAT evidence concerns a different, excluded fixture. ATTOM bulk certification documents five sample counties, none Kern; it is not a Kern address source. The additional excluded geography remains excluded.
- The county package's unprocessed Access/FileGDB material was not newly decoded. Therefore the defensible conclusion is “no usable ZIP found in inspected established sources,” not “no ZIP can exist anywhere in the package.” Starting a new raw-data ingestion effort is not recommended for three ZIPs.

Source dates remain Assessor 2026 Final / as-of 2026-06-26 and historical Power-to-Sell 2026-09-15. Unknown original acquisition dates remain unknown. IP-P1/IP-P3 acreage flags do not prove the address is wrong, but address completion cannot clear those flags or settle parcel extent.

## Identity rules preserved

ATN/APN9 and exact Assessor relationships remain immutable county identity evidence. Provider address agreement does not create a Property link. ATTOM's authoritative persistent join key is `AttomID`; retain `ParcelNumberRaw` exactly, do not use deprecated `ParcelNumberFormatted` for new work, and treat alternate parcel numbers as supplemental. The historical failed APN+FIPS lookup remains a failure, not APN verification. A unique exact-address `ExaStr` can resolve ATTOM identity under the written guidance without that failure becoming a blocking gate. No pilot has acquired that result. DataTree `PropertyId` is a distinct provider identity, not a replacement ATN/APN9. See [ATTOM identity guidance](ATTOM_API_CAPABILITY_POC.md) and [DataTree endpoint evidence](DATATREE_UAT_ENDPOINT_INVENTORY.md).

Any future suggestion must preserve original situs, proposed components, timestamp, provider, source reference/fingerprint, available match evidence, differences and limitations. Reviewer acceptance stays a separate decision. The three pilots remain permanently excluded from future Round 1 selection under the existing pilot policy; the other 77 are a potential source pool, not verified or selected Properties. This assessment does not implement exclusion enforcement or open any Round 1 gate.

## Assessment result and safety

```text
ASSISTED ADDRESS VERIFICATION

Existing local evidence sufficient: PARTIAL
Recommended provider: Local evidence first, then RentCast property records after clarification
Existing integration: PARTIAL (lookup exists; assisted-review integration does not)
New API access required: UNKNOWN (existing key; current entitlement not inspected)
Estimated pilot requests: 3 maximum proposed property requests; 0 authorized now
Cost verified: NO (public schedule verified; actual account/marginal cost UNKNOWN)
Storage rights verified: YES (public RentCast internal-storage terms; account-specific exceptions UNKNOWN)
Implementation complexity: MEDIUM (small provider reuse; preserve offline boundary and request accounting)
Final classification: PROVIDER CLARIFICATION REQUIRED

Provider calls: 0
Database reads/connections/writes: 0 / 0 / 0
Analyst approvals: 0
Properties created: 0
```

The storage answer is limited to the public license described in the comparison, not an assertion about undisclosed account agreements or investor redistribution. Public documentation page retrievals were made; no provider data endpoints, authentication, SFTP, county services or MLS were accessed. No dependencies, environment settings, application/UI code, baselines, decisions, raw evidence or Round 1 flags were changed.

Documentation QA: **PASS**. All 14 checked pre/post file hashes agree (three packets, three decisions, pilot exclusions, Round 1 configuration and two private manifests, ignore/package/lock/Netlify files). All three decisions remain null. The three new documents contain no inspected pilot street/situs, county identifiers, candidate/Assessor IDs or local secret values; relative document links resolve and whitespace checks pass. Application tests and live accuracy tests were not run for this documentation-only change. These checks do not constitute provider or current-database certification.

**STOP FOR STAN/CHATGPT REVIEW.** Do not implement or call a provider on the strength of this assessment.
