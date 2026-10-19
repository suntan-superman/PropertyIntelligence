# RentCast Controlled Acquisition Pilot V1

Date: 2026-10-09. Status: **PARTIAL COVERAGE — HUMAN REVIEW REQUIRED**.

## Outcome

Three authorized Property Records requests returned three individual records, each with a complete address and ZIP-5. None satisfies the required county **APN9** corroboration gate. All three private packets are exception-review packets, not approvals or persistence authorizations.

The end-to-end objective is therefore only partially met: county candidate → licensed address evidence → exception packet works; defensible APN9 corroboration → routine review remains blocked. Complete addresses do not establish parcel identity or postal deliverability.

| Pilot | HTTP / records | Complete address | APN classification | Review tier |
| --- | --- | --- | --- | --- |
| RC-P1 | 200 / 1 | Yes | APN_CONFLICT | EXCEPTION_REVIEW_REQUIRED |
| RC-P2 | 200 / 1 | Yes | APN_CONFLICT | EXCEPTION_REVIEW_REQUIRED |
| RC-P3 | 200 / 1 | Yes | APN_CONFLICT | EXCEPTION_REVIEW_REQUIRED |

See [identity reconciliation](PI_RENTCAST_IDENTITY_RECONCILIATION.md) and [QA/accounting](PI_RENTCAST_PILOT_QA.md).

## Pre-flight and selection

- Existing local manifests: 81 original high-priority SFR candidates, 1 historical exclusion, 3 existing identity pilots, **77 remaining**. Exact source fingerprints were verified against the existing pilot registry, including the county source and Assessor DBF. No cohort was recreated.
- The 80-candidate prior read-only identity audit was inspected as a **local historical snapshot**, not as proof of current production state. This sprint made no database connection.
- Permanent historical/IP exclusions were applied. The local pilot inventory identified no additional real-candidate selection registry; the new private candidate mapping reserves this technical cohort for reproducibility. This did not change Round 1 eligibility/selection flags.
- Eligibility required exact county/Assessor relationships, unique string ATN/APN9, Kern/California jurisdiction support, SFR classification, nonblank county street/city, no known identity conflict/link/archive/QA marker, and no county quality-review flags. Actual selected Assessor source rows were read locally to recheck identity, situs and use classification.
- There were **54 clean eligible candidates**. Sort fixed-width ATN ascending, then APN9; take the first three. No projected value, profit, ARV, MAO, MLS information or investment ranking was used to choose among the existing cohort.
- Round 1 remained `PRE_EXECUTION`, execution unauthorized, selection unlocked and without a selected cohort. The pilot made **0 Round 1 selections**.
- Before execution, 2,812 protected file hashes were captured. The private output root was confirmed gitignored and untracked. Existing IP packets, decisions, evidence deadlines and V3 persistence were not changed.

## Existing adapter inspection and controls

| Concern | Existing implementation / pilot use |
| --- | --- |
| Property endpoint | `src/sources/rentcast/client.js`: official HTTPS host; only `/properties` used here |
| Request builder | `propertyLookup.js`: `queryAddress` + `lookupProperty`; county street, county city, `CA`; no ZIP or other query parameters |
| Credentials | Existing `configuration()` with locally selected RentCast variables only; broad `.env` environment loader not invoked |
| Normalization | Existing `addressKey`, county string APN validator and pure canonical-address validator reused; domain Property/evidence creation normalizer inspected but not invoked |
| Usage accounting | Existing client metrics plus private fsynced attempt reservations, HTTP receipts and response records |
| Cache | Existing injectable store interface; pilot-only allowlisted evidence store; no shared-cache writes/hits |
| Timeout | Existing 15-second timeout; no automatic retry after timeout or uncertain outcome |
| Retry behavior | Default client configuration permits 2 retries/6 calls; pilot explicitly overrides to **0 retries / 3 calls**, without editing the client or defaults |
| Transport | Single serial transport guard, exact endpoint/query/header validation, redirects rejected, duplicate candidate/restart/fourth attempt blocked |
| Logging | Codes/counts/statuses only; no key, address, parcel ID, owner/contact or full response logging |
| Errors | Existing authentication/quota/rate-limit/network/contract stops preserved; property-level mismatches quarantined separately |

The [Property Records contract](https://developers.rentcast.io/reference/property-records) documents the address lookup endpoint. Cindy Bellford's supplied written confirmation explicitly supports street/city/state without ZIP; the existing builder omits an absent ZIP. No AVM, rental, listing, comparable-sales or market-statistics endpoint was invoked. There are no hidden enrichment calls in `lookupProperty`.

New scripts are confined to `scripts/rentcast-controlled-pilot/`; no application, package, runtime, deployment or production configuration changed. These scripts are not a new provider client or production integration.

## Credential and privacy findings

The key remained server-side. Only RentCast configuration was selected from local `.env`; production database credentials were not loaded into the environment. Pre-flight and post-acquisition scans found no actual key exposure in tracked files, source, scripts, documentation or the local web build. `.env` is ignored. The dashboard's `Unrestricted` label is user-reported; no dashboard change or key rotation was performed.

Private outputs are under `data/runtime/rentcast-controlled-pilot/`. They include candidate mapping, source fingerprints, correspondence reference, request ledger, minimal allowlisted evidence, three sealed review packets and reconciliation results. Owner/contact fields are excluded before persistence; full provider payloads are not retained. Response fingerprints describe parsed, credential-redacted response content, not independently certified wire bytes. Public reports contain only pilot codes and non-identifying findings.

## Licensed evidence and dates

Licensed use: **DOCUMENTED**, not an independent legal opinion. Stan supplied Cindy Bellford's email in this conversation on 2026-10-09, reporting receipt less than 15 minutes earlier. The exact incoming timestamp/message ID was not supplied. A private dated correspondence summary supplements, without overwriting, the initial undated authorization reference.

The supplied confirmation covers retained addresses/identifiers/provenance, combination with county data, persistent profiles, SaaS display and investor PDFs, with no stated retention/caching limit or attribution requirement. It identifies the standard [API Terms of Use](https://www.rentcast.io/terms-api) as applicable. Those terms remain governing, including applicable third-party/legal restrictions; the email is not treated as a legal override.

The three actually returned records are labeled `RENTCAST_DURABLE_LICENSED_EVIDENCE`. This source-rights label does **not** resolve an APN conflict, verify parcel identity, approve a reviewer decision or authorize persistence. No Google content was reused or relabeled.

Local retrievals occurred at 2026-10-09 20:59:33–20:59:35 UTC. No record-wide provider as-of timestamp is available in the retained fields; local retrieval time is not substituted for one. A current API response is not proof that every property characteristic is current.

## Accounting

| Metric | Result |
| --- | ---: |
| Authorized / transmitted attempts | 3 / 3 |
| HTTP 200 / non-200 / uncertain | 3 / 0 / 0 |
| Responses containing one usable Property Records record | 3 |
| Responses meeting routine identity-review requirements | 0 |
| Complete addresses including ZIP-5 | 3 |
| Estimated billable requests | 3 |
| Automatic retries / cache hits / fallback requests | 0 / 0 / 0 |
| Authorized maximum incremental overage | $0.60 |
| Estimated incremental overage, assuming all three exceed allowance | $0.60 maximum |
| Current allowance / actual charge | NOT VERIFIED / NOT VERIFIED |

Cindy's email says only HTTP 200 responses are billed, not errors. Empty/ambiguous HTTP 200 responses would still consume this pilot's budget. Every transmission consumes an attempt regardless of outcome; the conservative budget ceiling remains three. The earlier 0/50 observation is not a current balance. Public documentation reads are accounted separately from authenticated Property Records calls.

## Review and next step

Three private exception packets retain county and RentCast identities separately, source fingerprints, dates, discrepancies, suggested components and a null analyst decision. They do not silently replace the county situs.

The existing local review interface is explicitly allowlisted to IP-P1/IP-P2/IP-P3 and has Google-specific suggestion handling. It cannot safely consume these packets unchanged. No dashboard or protected workflow was altered. The minimum future adapter would accept an explicitly authorized RC packet set, map RentCast component/source references and dates, preserve packet fingerprints and source-rights labels, and expose unresolved APN discrepancies as a hard approval gate. Existing reviewer identity, component evidence and contradiction requirements must remain intact.

Recommended next stage: human/vendor review of the existing three private identifier pairs and the RC-P1 suffix discrepancy, **without further acquisition**. Obtain an authoritative explanation of the eight-/eleven-digit provider parcel representations relative to Kern APN9/ATN; do not invent transformations. Any later persistence requires resolved identity evidence, a human decision, a fresh authorized read-only identity check and separate persistence authorization. None occurred here.

## Stop

The three-attempt budget is exhausted. Do not rerun the live command, reset reservations or initiate additional provider calls. Analyst approvals, durable Properties, database connections/writes, MLS access, other-provider calls and Round 1 selections are all **0**. No deployment, investment analysis, model change or production integration was performed. Stopped for Stan/ChatGPT review.
