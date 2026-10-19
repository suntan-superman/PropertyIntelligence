# PI Google Geocoding IP-P1 proof of concept

**EXACT ADDRESS CANDIDATE — suitable for analyst review, not approved.**

Executed 2026-10-08 PDT / 2026-10-09 UTC. Request started at `2026-10-09T03:56:46.560Z`; response captured at `2026-10-09T03:56:46.912Z`. Exactly one live Geocoding V3 request was made for IP-P1. No other pilot was queried. This is a local proof of concept, not a production integration or canonical identity certification.

## Result

| Measure | Observed result |
| --- | --- |
| Google requests / automatic retries | **1 / 0** |
| HTTP status / Google status | **200 / OK** |
| Candidates returned | **1** |
| Match classification | **EXACT ADDRESS CANDIDATE** |
| Street number | Agrees with county source |
| Street name | Equivalent; terminal county `WY` versus returned `Way` is an abbreviation difference, not a changed street name |
| Locality / city | Agrees with county source |
| State | Returned; agrees with jurisdiction-supported California |
| ZIP-5 | Returned; absent in county evidence, so no independent county ZIP comparison is possible |
| Country | Returned; agrees with US constraint |
| County, when returned | Agrees with source jurisdiction |
| Location precision | **ROOFTOP** |
| Partial-match indicator | **NOT RETURNED**; do not relabel as an explicitly returned `false` |
| Formatted address / place ID / coordinates | Captured in private diagnostic only |
| Material address ambiguity | None observed in the single returned candidate and component checks |
| Analyst-review ready | **YES**, as an unverified proposal |
| Parcel identity verified by geocoding | **NO** |

Google describes rooftop precision as street-address precision; it does not establish parcel boundaries, title, postal deliverability or county identifier equivalence. A missing partial-match flag and one candidate are useful match evidence, not proof that every possible ambiguity has been eliminated. [Geocoding response documentation](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding).

## Request and execution controls

- Read the existing IP-P1 private review packet; verified its content fingerprint and exact agreement with the user-authorized county situs. State and ZIP were still missing, and the existing analyst decision was null.
- Used existing **Node v20.19.4** and built-in HTTPS, filesystem and cryptographic libraries. No installation or runtime change.
- Sent one server-side `GET` to `https://maps.googleapis.com/maps/api/geocode/json`, with `address` taken directly from the private county packet, and `components=administrative_area:CA|country:US`. **No ZIP was supplied.** The address and credential-bearing URL are intentionally omitted here.
- Used only `GOOGLE_GEOCODING_API_KEY` from the local `.env`. No key value, complete request URL, authorization header or arbitrary exception was logged or persisted. Other credentials were not loaded into provider clients.
- California and United States were **request constraints based on jurisdiction**, not preverified postal components. Google's documentation notes that administrative-area components influence results rather than being enforced like country filtering; the returned state was therefore explicitly checked. Agreement with a supplied constraint is not independent confirmation. [Component-filter behavior](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding#ComponentFiltering).
- A private durable reservation was written before dispatch. The one-shot runner refuses an existing reservation/result, including after a crash or timeout. No retry loop, redirects, fallback, batches, browser requests, AVM or secondary lookup were used. The request had a 25-second deadline and bounded response size.
- Project name, dedicated key restriction and quotas of 10/minute and 25/day are **user-reported configuration**. They were not changed or independently inspected through Cloud administration. Successful use establishes access for this request, not current account-wide remaining quota or an invoice amount.

## Proposed evidence for the existing reviewer

No interface, review packet or decision was updated. The private diagnostic contains the proposed evidence summary for a later, separately approved display.

| Evidence class | What the reviewer must see |
| --- | --- |
| County source | Original street/city and immutable county/Assessor source references from the packet; no source state/ZIP silently added |
| Jurisdiction source | Previously inspected county metadata supports California; distinct from postal validation |
| Request constraints | California and US, explicitly supplied to narrow the request; no ZIP input |
| Google result | Returned formatted address, street number, route, locality, administrative-area level 1, postal code, country, place ID, precision, partial-match field presence and coordinates |
| Differences | Street-type expansion only for existing street/city; returned state/ZIP are additions to the incomplete source address, not corrections to known source values |
| Confidence limitations | Unique precise address candidate, not APN/ATN equivalence or delivery-point certification; returned ZIP has no independent county corroboration |
| Analyst state | Every component remains **not analyst-verified**; no decision selected or approved |
| Existing acreage flag | Retained; reviewer must acknowledge and add notes separately. Geocoding does not resolve parcel extent or acreage discrepancies. |

The existing canonical validator and review controls remain unchanged. A later analyst may review/cite this evidence, but approval is a separate human action; durable resolution/Property persistence requires separate authorization. No Google place ID is substituted for a county identifier or used to establish a Property link. Round 1 authorization and pilot exclusions remain unchanged.

## Private evidence and retention

Local, gitignored directory: `data/runtime/identity-resolution-pilot/google-geocoding-ip-p1/`.

- `diagnostic.json`: minimal requested result fields, response fingerprint, comparison findings, request constraints, proposed review summary, accounting and retention notice. No complete raw response is stored.
- `attempt-reserved.json`: consumed one-request authorization; prevents accidental replay. Do not delete it to re-enable this request.
- `preservation-before.json` / `preservation-after.json`: local file fingerprints, not copied source contents.
- `run-once.cjs`: private execution record; **do not rerun** or adapt it for other pilots without authorization.

Retrieved content is restricted to the initiating authorized reviewer's local review, not a shared response cache, public document, canonical database or investor report. The private record supplies retrieval time; Google data freshness is unknown. No provider timestamp was invented from the HTTP response date.

**Retention review/deletion deadline: 2026-10-10T03:56:46.934Z** (2026-10-09, 8:56 PM PDT). This is a local minimization deadline, not a claim that every response field has an unrestricted 24-hour storage license. No automatic deletion job was installed; Stan must review/remove the returned content by that deadline or confirm a permitted, scoped continuation. Non-content accounting/reservation evidence can remain; never reuse content to bypass a future authorized request.

Google's service terms provide conditional end-user address/coordinate caching, not unrestricted cross-user storage. Its policies separately address place IDs and attribution. Any future display must identify Google Maps as the source and satisfy applicable attribution; do not assume a human's acceptance erases source restrictions. [Service-specific terms, section 6](https://cloud.google.com/maps-platform/terms/maps-service-terms), [Geocoding policies](https://developers.google.com/maps/documentation/geocoding/policies).

## Safety and QA

Before/after checks covered **267 existing files**, including application/source code, reviewer scripts, migrations, protected baseline files, packages/Netlify/ignore/environment files, all three packets/decisions, private cohort/audit, exclusions and Round 1 configuration. **Zero changed.** All private execution artifacts are gitignored and untracked. No new production or public route exists.

The shareable report deliberately omits property addresses, parcel/candidate identifiers, Google place ID, coordinates and ZIP value. The retained private diagnostic was checked against the dedicated key and encoded forms before writing. Post-run offline checks passed **17/17**, covering request accounting, component capture/comparison, constraint separation, no approval, reservation/ignore protection, file preservation and privacy. All three existing analyst decisions remain null. Existing unrelated worktree changes were preserved. This was a one-request empirical POC, not a regression-suite rerun or current-database audit. Public documentation reads are separate from the one Geocoding data request.

```text
GOOGLE GEOCODING IP-P1

Requests made: 1
Google status: OK (HTTP 200)
Candidate count: 1
Match classification: EXACT ADDRESS CANDIDATE
Street/city agreement: YES (street-type abbreviation equivalence)
State returned: YES
ZIP returned: YES
Location precision: ROOFTOP
Analyst review ready: YES — unverified proposal only
Parcel identity verified: NO

Provider calls other than Google: 0
Database connections / reads / writes: 0 / 0 / 0
Canonical resolutions created: 0
Properties created: 0
Analyst approvals: 0
```

## Recommendation and stop

This single result supports requesting separate authorization for **one similarly constrained request each for IP-P2 and IP-P3**, with their own packet checks and budget reservations. It does not predict their match quality or authorize those calls. Review IP-P1's private evidence and retention requirements first; do not change the historical RentCast-first assessment retroactively or automatically switch the application provider.

**STOP FOR STAN/CHATGPT REVIEW.** No further Geocoding request, decision, canonical persistence, Property creation, database activity, Round 1 change or deployment is authorized by this result.
