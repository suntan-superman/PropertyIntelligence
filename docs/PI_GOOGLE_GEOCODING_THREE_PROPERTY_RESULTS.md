# PI Google Geocoding — three-property feasibility results

**Suitable for a small, human-reviewed address-suggestion workflow. Not automatic canonical or parcel verification.**

Completed 2026-10-08 PDT / 2026-10-09 UTC. Two new requests were made: one for IP-P2, then one for IP-P3. IP-P1's existing result was read locally; its request was **not repeated**, and its reservation and evidence were not changed.

## Comparison

“Analyst-review ready” below uses the existing conservative exact-candidate gate. A non-exact result can still be presented for discrepancy review, but must not be presented as a confirmed address.

| Metric | IP-P1 | IP-P2 | IP-P3 |
| --- | --- | --- | --- |
| Google response | Existing: HTTP 200 / OK | New: HTTP 200 / OK | New: HTTP 200 / OK |
| New requests this continuation | 0 | 1 | 1 |
| Candidate count | 1 | 1 | 1 |
| Street number | Agrees | Agrees | Agrees |
| Street/city agreement | Yes; street-type equivalence | Yes; returned short-route form matches county | City/base street agree; suffix equivalence requires review |
| State returned | Yes | Yes | Yes |
| ZIP returned | Yes | Yes | Yes |
| State/country jurisdiction agreement | Yes | Yes | Yes |
| Precision | ROOFTOP | ROOFTOP | ROOFTOP |
| Partial-match field | Not returned | Not returned | Not returned |
| Match classification | EXACT ADDRESS CANDIDATE | EXACT ADDRESS CANDIDATE | PARTIAL/AMBIGUOUS |
| Analyst-review ready | Yes, proposal only | Yes, proposal only | No at exact-candidate gate; suitable for suffix-discrepancy review |
| Existing acreage-review flag | Retained | None in source packet | Retained |
| Parcel identity verified by geocoding | No | No | No |
| Analyst approval | None | None | None |

All three lookups returned state and ZIP components. This establishes address-completion **feasibility for these examples**, not independent ZIP corroboration, postal deliverability, county parcel equivalence or a general success rate.

### IP-P3: one narrow review item, not another lookup

The only failed exact-comparison check was the route representation. County evidence ends in `CI`; Google uses `Circle` / `Cir`. Offline comparison found the same street number, base street-name tokens in the same order and city. State/country, returned ZIP format, county, result type and rooftop precision passed the other checks.

This looks like a street-type abbreviation difference. However, the reused comparator accepts exact long/short route forms and the previously documented terminal `WY`/`WAY` equivalence; it does not silently translate county `CI`. The inspected local situs schema documents a street-type field, not an authoritative `CI` expansion table. No new fuzzy matching rule was added, no packet was rewritten and no analyst decision was made.

`PARTIAL/AMBIGUOUS` here is **PI's conservative local classification**, not a Google partial-match flag or multiple-result response. Ask the analyst to confirm the suffix equivalence with supporting evidence. If confirmed, a narrowly documented normalization rule could be separately authorized and tested. Repeating the request is not needed to examine this difference. The acreage flag remains a separate review obligation.

## Method and controls

- Existing runtime: **Node v20.19.4**, built-in libraries only. No installation or application change.
- Verified each packet's content fingerprint, pinned the observed fingerprint, and checked the exact candidate/county/Assessor relationships against the existing private exclusion registry and prior Gate 1B audit. Verified the audit source fingerprint and the county jurisdiction metadata fingerprint. These were **local-file checks**, not a current-database query or new county verification.
- One server-side Geocoding V3 request per authorized packet, with its literal county street/city and `components=administrative_area:CA|country:US`. **No ZIP was supplied.** Returned state/country were checked; jurisdiction constraints are not independently verified postal inputs.
- Used only the dedicated local `GOOGLE_GEOCODING_API_KEY`. No key value, credential-bearing URL, raw exception or owner/contact data was logged or copied to the report.
- Separate `attempt-reserved.json` for IP-P2 and IP-P3, written exclusively and flushed before dispatch. Existing reservations/results stop another execution. Only these two pilot codes are accepted by the continuation runner; IP-P1 is not an allowed target.
- Requests were sequential, with no automatic retries, redirects, fallback, browser exposure, batch expansion or additional provider operation. Each had a 25-second timeout and bounded response size.
- Returned fields are minimal: formatted address, requested address components, place ID, result type, precision, partial-match presence/value, coordinates, response status/count and retrieval/fingerprint metadata. No full raw response is retained.

Google's documentation distinguishes administrative-area influence from enforced country filtering. Its rooftop and partial-match indicators inform address review, not county parcel identity. The absence of `partial_match` was recorded as absent, **not** an explicitly returned `false`. [Geocoding contract and response semantics](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding).

## Private evidence and retention

Private directories under `data/runtime/identity-resolution-pilot/`:

- `google-geocoding-ip-p1/`: existing evidence/reservation, unchanged.
- `google-geocoding-ip-p2/` and `google-geocoding-ip-p3/`: separate reservation, minimal diagnostic and pre/post preservation fingerprints.
- `google-geocoding-continuation/`: local execution/QA scripts and offline QA summary. Not an application adapter or public route. Do not rerun the live runner.

| Pilot | Response captured (UTC) | Separate review/deletion deadline (UTC) | Local deadline (PDT) |
| --- | --- | --- | --- |
| IP-P1, existing | 2026-10-09 03:56:46.912 | 2026-10-10 03:56:46.934 | October 9, 8:56 PM |
| IP-P2 | 2026-10-09 05:17:53.936 | 2026-10-10 05:17:53.954 | October 9, 10:17:53 PM |
| IP-P3 | 2026-10-09 05:17:58.734 | 2026-10-10 05:17:58.763 | October 9, 10:17:58 PM |

The existing IP-P1 deadline was not extended. These are local minimization deadlines, not blanket vendor-granted storage periods. Returned content remains restricted to the initiating reviewer's local review; it must not become a shared cache, investor report or canonical-property database. No cleanup scheduler was installed: Stan must review/delete content by the deadlines or confirm a permitted scoped continuation. Preserve non-content reservation/accounting evidence so cleanup cannot silently reopen the request budget.

Google's service terms provide conditional end-user caching exceptions, not unrestricted shared retention. Any later display must satisfy Google Maps attribution and applicable use/storage terms. A human accepting a suggestion does not remove those restrictions. [Service terms, section 6](https://cloud.google.com/maps-platform/terms/maps-service-terms), [Geocoding policies](https://developers.google.com/maps/documentation/geocoding/policies).

## Offline QA and preservation

Offline QA uses the existing outbound-network blocker and synthetic responses separately from real evidence. It covers component mismatches, multiple/no results, partial flags, precision, error handling, conservative suffix classification and non-approval. Real-artifact checks cover request/reservation accounting, returned components, IP-P3's isolated suffix difference, private-storage protection, credentials/report privacy, acreage flags and unchanged decisions.

Before/after checks for each new request covered **273 protected files**, including the entire existing IP-P1 evidence directory, application/reviewer code, migrations, historical baselines, environment/configuration, all three packets/decisions, private cohort/audit and exclusion registry. **Zero changed.** No historical baseline was reconciled or rewritten. The existing three analyst decisions remain null; Round 1 flags and pilot exclusions remain unchanged.

Offline QA: **39/39 PASS, 0 failed, 0 skipped** — 23 synthetic checks and 16 real-artifact/privacy/preservation checks. Results are recorded in the private `google-geocoding-continuation/qa-summary.json`; synthetic tests are not presented as additional live-provider coverage. QA made zero provider/database calls. Public documentation reads were separate from the two Geocoding data requests. No application regression suite was needed for this private POC; no application or UI code changed.

## Accounting and recommendation

| Activity | This continuation |
| --- | ---: |
| Google Geocoding requests | **2** |
| Cumulative three-pilot Geocoding requests | **3** |
| IP-P1 repeat requests | **0** |
| Automatic retries / redirects followed | **0 / 0** |
| ATTOM / RentCast / DataTree / county / MLS calls | **0** |
| Database connections / reads / writes | **0 / 0 / 0** |
| Canonical resolutions / Properties created | **0 / 0** |
| Analyst approvals | **0** |
| Production changes / deployments | **0 / 0** |

**Recommendation: Google Geocoding is suitable for a small assisted-address suggestion implementation, with explicit human review and the existing identity safeguards.** Two pilots passed the exact-candidate gate; the third exposed a reviewable suffix difference while still returning complete components. Do not equate this with three approved canonical addresses.

Any separately authorized implementation should retain explicit per-property requests, durable budgets, mismatch display, private scoped retention/attribution and no automatic approval. Resolve IP-P3's suffix question through evidence-backed review and keep acreage review separate. Shared canonical persistence/licensing, durable identity creation and Round 1 readiness remain separate gates. No broad multi-provider system or additional live test is recommended by this result.

**STOP FOR STAN/CHATGPT REVIEW.** No UI button was implemented. No further requests, approvals, persistence or deployment were performed.
