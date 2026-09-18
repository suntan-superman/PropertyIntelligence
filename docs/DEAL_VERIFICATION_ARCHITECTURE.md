# Deal verification architecture — Foundation Sprint 1

```text
Sponsor specification -> Deal + Claim (unchanged)
Sponsor address -> RentCast adapter -> sanitized raw response -> Evidence + Property
Deal claims -> pure deterministic sponsor underwriting
Sponsor projected resale price + independent valuation -> neutral comparison
```

Domain modules contain no RentCast client imports. Claims retain their supplier, source document, units, status, nullable supplied date, notes and evidence references. Independent evidence carries provider, source type, retrieval timestamp and raw response reference. Provider values are not VERIFIED facts. Future adapters can supply the same Property/Evidence shapes.

The port uses only Node built-ins. There are no Home Advisor runtime imports, database, server, UI or deployment dependencies. Existing Kern files and the blocked Kern report are retained separately.

## Execution and gates

1. `npm run deals:seed:florida` writes a deterministic sponsor fixture and reconciles all arithmetic. The original sponsor package was not supplied, so the sprint specification is the source document and supplied dates are null.
2. `npm run rentcast:audit` checks configuration without printing secrets or calling the provider. Node 20.19+ supports the local env loader used here.
3. `npm run deals:verify:florida -- --property fantasia` attempts the first complete address. The client is serial, 300 ms between requests, with 15-second timeouts, at most two transient retries and six total HTTP attempts per invocation. No provider call is made for Joyce.
4. Inspect Fantasia raw and normalized evidence. Only a healthy result permits `--property bass`. Authentication, quota, ambiguous identity, unexpected API contract, and manufactured-type failures stop the run.
5. `npm run deals:compare:florida`, `npm test`, then `npm run foundation:summarize` produce review artifacts, including truthful absent-evidence outcomes after a STOP.

`/properties` is an identity/detail lookup addition documented in the audit. `/avm/value` uses the reference compCount 15, maxRadius 2 miles, daysOld 180; no subject characteristics are guessed or overridden. It uses provider-discovered attributes. Its subject address and provider ID must agree with the selected detail record, and both must report Manufactured for these sponsor deals. Only harmless street suffix/case/punctuation normalization is permitted; city, street number and unit mismatches are not guessed away. Any candidate set other than a unique exact-address match fails the gate.

Joyce's incomplete identity stays unresolved. The selection function records a sole plausible Florida discovery candidate as AMBIGUOUS_PENDING_CONFIRMATION, but the live workflow deliberately performs no broad candidate search. Sponsor confirmation is required before enriching it. Explicit user corrections are stored separately in `addressConfirmation`; the adapter uses that address while retaining the original sponsor claim and documenting the confirmation source. Fantasia's confirmation is recorded in `docs/FLORIDA_ADDRESS_CONFIRMATIONS.md`.

## Evidence storage and security

Successful snapshots are cached under a hash of the full requested address and exact endpoint/parameters. Content hashes and retrieval timestamps validate cache entries. Raw snapshots are immutable; a request index points to the latest successful snapshot. Error responses are preserved but not reused as successful cache entries. No automatic freshness is claimed: cached evidence keeps its original timestamp; `--refresh` requests a new snapshot.

Keys are obtained from the process environment, optionally populated from this project's ignored `.env`. Only the official HTTPS origin is allowed; redirects are rejected. Auth headers are never stored. Known credential fields and the actual key (including common encodings) are redacted recursively before caching. Non-JSON errors are replaced by a safe parse diagnostic. Error messages exposed by the adapter are fixed codes. 401/403 and quota errors are not retried; long Retry-After waits stop instead of continuing requests. All actual HTTP attempts count against the small run budget.

The one-time local Home Advisor secret reuse used a launch process reading dotenv in memory; it is not part of the adapter. Home Advisor is read-only. Stan subsequently supplied a replacement key in `.env.example`; that file was moved to the ignored `.env` without displaying the value, and `.env.example` was restored to blank placeholders.

## Limits

All comps are retained in provider order, with provider fields and metrics. Listing prices/dates are not relabeled closed sales, and missing ranges are not synthesized. No proprietary ARV calculation, confidence score, demo fallback or investment recommendation is produced. Manufactured classification alone does not verify land ownership, tenancy, collateral, title or repair condition. Fantasia's confirmed address now passes both property and AVM checks; Bass stops because the matching provider record omits property type and structural/parcel details. Cache-only replay reproduced both outcomes with networking disabled.
