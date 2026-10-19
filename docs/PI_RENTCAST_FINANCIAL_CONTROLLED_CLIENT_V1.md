# PI RentCast Financial Controlled Client V1

2026-10-12. **OFFLINE CONTROLLED CLIENT CERTIFIED** — **277/277 tests PASS**, zero skips, **4,231/4,231 pre-existing file hashes unchanged**. No live acquisition authorized or executed. Certification results are recorded in the [QA report](PI_RENTCAST_FINANCIAL_CONTROLLED_CLIENT_V1_QA.md).

## Scope and evidence

The controlling specification is `PI_RENTCAST_CONTROLLED_CLIENT_CERTIFICATION_V1_CODEX.md`, followed by Stan's explicit offline-only implementation authorization. This narrows the older nine-request/three-subject proposal to **technical ordinal 1 only, three total attempts, one per stage**. The earlier reports remain historical evidence; their broader proposal is not execution authority.

Verified the original private shortlist against its seal and recomputed it from the existing, fingerprint-verified source inputs:

`ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4`

All three technical subjects remain unapproved and not provider-ready. Ordinals 2/3 are not expanded, replaced or acquired. Historical/IP/RC exclusions, original order, county identifiers, scores and Round 1 flags remain unchanged. No actual private identifiers appear in these reports.

Reviewed the current readiness, provider matrix, acquisition plan, QA, preliminary-analysis and Rule C reports; existing RentCast config/client/lookup/valuation/comps/normalizer and controlled-pilot tooling. Used only retained local contract evidence. **No new website research, dashboard login, provider data call or credential loading occurred.** Current vendor/account behavior is not empirically verified by these mocks.

## Implementation boundary

New local modules live under `scripts/rentcast-financial-controlled-client-v1/`. No existing source, dependency, configuration, historical baseline or generated artifact was edited.

| Module | Responsibility |
| --- | --- |
| `guard.js` | Verify original shortlist/source seals, fresh before/after preservation inventory and shareable-output privacy |
| `contract.js` | Exact stage-specific requests, account/rights/cost preflight, manual approvals, future authorization packet validation |
| `evidence.js` | Minimal projection, unchanged Rule C invocation, mandatory AVM ID/attributes, bounded sale candidates |
| `ledger.js` | Private-path checks, exclusive process lock, fsynced immutable hash-linked reservations/outcomes |
| `client.js` | One-stage engine, timeout/response limits, safe failures, data-only branded mock transport; no live transport |
| `fixtures.js`, `client.test.js`, `process-probe.js` | Explicit synthetic evidence and unit/integration/crash/concurrency/security controls |
| `qa.js` | Full-file regression execution, credential-free child environments, isolated test output and preservation receipt |

The production RentCast client remains unchanged: its retries, six-call defaults, cache and optional-ID behavior are not used. Existing address comparison and Rule C's exact/format-only APN9 and documented county APN strategy are reused unchanged. Source seals, original county cardinality/history and candidate binding remain gates. This wrapper does not turn an address match or a vendor ID into PI canonical identity.

**No live executor or credential/header injector is shipped in this sprint.** The default constructor refuses execution; it accepts only the module's data-only synthetic transport and explicitly synthetic context. Passing an arbitrary fetch callback, actual shortlist subject, environment key or CLI flag cannot enable acquisition. The future authorization validator is a pure packet check and always returns `networkEnabled: false`. A later reviewed live entrypoint must load exact verified original source projections and attach the server-side key only through `X-Api-Key`; neither an unverified caller object nor a packet hash is evidence authenticity or authority. There is no runnable real-acquisition command.

## Exact staged contract

| Stage | Request contract | Required result and stop |
| --- | --- | --- |
| A | `GET https://api.rentcast.io/v1/properties`; only original county street/city and CA constraint in `address`; no ZIP invention | Exactly one complete SFR, nonempty exact string ID, Kern/CA coherence, existing county reconciliation PASS. Hidden total-count/pagination contradictions stop. Write receipt and stop for review |
| B | `/v1/avm/value`; accepted full address, `lookupSubjectAttributes=true`, `compCount=15`, explicitly approved `maxRadius` and `daysOld`; no propertyId/manual attribute override | Required same nonempty `subjectProperty.id`, address/ZIP/type/jurisdiction and nonconflicting supplied attributes; positive complete interval enclosing estimate. Separate listing context; not ARV or a probability distribution. Stop |
| C | `/v1/properties`; accepted address, approved `radius`/`saleDateRange`/SFR, `limit=50`, `offset=0`, `includeTotalCount=true` | One nonempty page; exact total-count agreement, no pagination, unique non-subject IDs, same county/state/type, coordinates within radius and positive dated sale evidence within lookback. Candidate sales only; stop |

No stage automatically calls its successor. Each approval binds the candidate, selection, account, exact request, full bounds-evidence fingerprint and previous receipt hash, with reviewer/evidence/time/expiry. Changing only the market classification or supporting bounds evidence also invalidates authorization, even if numeric parameters stay unchanged. A failed or uncertain stage blocks the rest; slots cannot move between stages or subjects.

Radius 0.01–10 miles and age 1–365 days are **internal safety ceilings**, not asserted vendor limits or approved search standards. No radius/lookback default exists. The test's synthetic 1.5-mile/120-day bounds do not approve real use. Even the older draft 2-mile/180-day proposal remains unapproved. Rural/urban appropriateness requires an explicit evidence-backed decision.

Exact method/host/path/keys/types are enforced. Extra fields, credential query parameters, unsupported endpoints, redirects, malformed bounds, extra pages and widened limits stop. Timeout is 15 seconds across response acquisition/body reading; maximum retained-in-memory body is 2 MiB, checked incrementally as chunks arrive. No retries. Non-200, auth/payment/rate-limit, network uncertainty, timeout, size, JSON, schema, identity and coverage failures have safe codes, never raw provider errors.

## Durable reservations and monetary limits

Each test-owned run uses private storage, no symlinks/junctions, an exclusive `process.lock` and numbered exclusive-write ledger records. A reservation is fsynced **before** transport; outcomes append, never overwrite. Hash links bind sequence, source/context/account, selection/ordinal, endpoint, parameter/request hashes, operator approval, timestamp, exposure and response/evidence hashes. A missing outcome permanently consumes the attempt. A stale crash lock is retained and blocks reopening; no automatic reclamation/reset occurs. Tests exercise independent processes as well as concurrent clients.

Successful or unsuitable HTTP 200 does not refund a slot. Errors/timeouts also retain worst-case reserved exposure; these are conservative accounting limits, not invoices. Non-200/oversized/unread bodies can have a null response hash, explicitly indicating that no complete bounded body hash was obtained. No raw response is retained.

Future proposal: **3 × $0.20 = $0.60 request fees; $1.00 all-in cap, NOT YET AUTHORIZED**. Zero free-quota credit. Account preflight requires dated independently reviewed account/rights evidence, active product access, USD rates at or below the proposal, verified endpoint/tax/fee bounds and an enforceable scoped maximum. Each attempt reserves 20 cents plus the verified maximum tax/fee amount; all three must fit within 100 cents. Unknown charges fail before reservation. Synthetic tests use 25 cents all-in per attempt; that is not a real account charge.

Local fsync and hashes provide crash-conscious/integrity controls, not signatures or immunity to an administrator deliberately deleting all private files. A future live entrypoint must use one fixed, operator-reviewed ledger registry for this exact shortlist/subject, never an arbitrary fresh directory. Windows power-loss durability and actual external billing are not certified by an offline process-crash test.

## Evidence and closed authorities

Only allowlisted ID strings, address/jurisdiction, attributes, documented dates/sale history/tax-year fields survive projection. Original strings/leading zeros remain exact. Nested owner/contact/raw fields are discarded. AVM listing prices never become sold prices; sold candidates remain unqualified with unknown transaction quality unless supplied. Boolean quality assertions, when present, are preserved as vendor assertions, not interpreted codebook values. No inferred condition, arm's-length status, current parcel activity, ARV or model distribution.

Receipts separate retrieval time from provider date fields and bind rights/terms references, source fingerprints and content hashes. Unknown provider-wide as-of remains unknown. Raw in-memory input is hashed, never persisted. All tests use synthetic provider responses, not modified historical evidence or invented responses for the real first subject.

Successful Rule C still means historical source relationship only. Analyst approval, durable persistence, financial analysis, offer and MLS selection remain false. Preliminary Analysis V1's RC-P2-only admission is unchanged; this new technical shortlist is not admitted to that calculation contract. All 34 real financial/support requirements remain unfilled by this sprint.

See [live prerequisites](PI_RENTCAST_FINANCIAL_CONTROLLED_CLIENT_V1_LIVE_PREREQUISITES.md). **STOP FOR STAN/CHATGPT REVIEW. No first real-property acquisition.**
