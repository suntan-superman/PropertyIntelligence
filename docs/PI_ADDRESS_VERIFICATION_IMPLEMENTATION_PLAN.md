# PI assisted address verification — minimal implementation proposal

Status: **DESIGN ONLY — NOT AUTHORIZED TO IMPLEMENT OR CALL PROVIDERS**. Companion assessment: [recommendation and local evidence](PI_ASSISTED_ADDRESS_VERIFICATION_ASSESSMENT.md). Final assessment classification remains `PROVIDER CLARIFICATION REQUIRED`.

## Bound the work

After the narrow RentCast contract/account questions are answered and Stan approves implementation, add a single-provider suggestion workflow to the existing local three-packet reviewer. Reuse RentCast property lookup and canonical format validation. Do not create a provider-orchestration layer, autocomplete, map, batch enrichment job, identity database, migration or production route.

The current `review-server.js` imports `src/analysis/offline.js`, which disables fetch and outbound sockets. A working provider button cannot simply call RentCast inside that process. **Do not remove that offline protection globally.** Proposed minimal boundary: an explicitly enabled, short-lived local worker for the one allowed provider operation, launched by the authenticated reviewer handler. The reviewer remains offline except for its existing loopback HTTP; ordinary launches retain zero-provider behavior. This is a local process boundary, not a new hosted service.

No code, launch flags or artifacts described below exist as a result of this assessment.

## Proposed interaction

1. Open one existing pilot. Display raw county situs and missing components unchanged. Show county metadata as an available state-evidence reference; require the reviewer to explicitly confirm state with that reference before preparing a request. Do not infer state or ZIP silently.
2. Click **Verify Address**. The server verifies reviewer access, packet fingerprint and the fixed pilot allowlist. It checks approved, licensed local evidence and the exact prior suggestion first. No provider call on page load, navigation, validation or decision save.
3. On a cache miss, display the precise single-address request, provider, maximum one attempt and remaining pilot budget. Require explicit confirmation in an in-app dialog. This is not an Analyze Property or Save Property action.
4. Reserve the attempt before starting the worker; retrieve only `/properties`. No AVM/comps, address search population, nearby-property query, second provider or automatic retry.
5. Display proposed street/city/state/ZIP beside original county evidence. Identify every change, evidence time/source, match limitations and any disagreement. Missing ZIP, multiple results, inconsistent county/state, unit mismatch or contract error produces **NEEDS_MORE_EVIDENCE**, not a best guess.
6. “Use proposed components” may populate a **draft**, but never mark fields verified, select APPROVED or save a decision. The reviewer must inspect/cite each component, acknowledge acreage flags and choose APPROVED, NEEDS_MORE_EVIDENCE or REJECTED through existing controls.
7. Save only the existing local decision artifact through current fingerprint/revision validation. A saved approval is not authorization to create a canonical resolution, durable Property or lineage. Those gates remain separate.

## Exact minimal change set proposed

| File / area | Proposed change |
| --- | --- |
| New `scripts/identity-resolution-pilot/address-verification.js` | Pilot/packet/input gates, local evidence/cache inspection, budget reservation, worker invocation and allowlisted suggestion DTO. One provider, fixed endpoint. |
| New `scripts/identity-resolution-pilot/address-verification-worker.js` | One-shot bounded RentCast call using existing `createClient` / `lookupProperty`; minimal credential access; no database/application bootstrap. No listener or long-lived daemon. |
| Existing `review-server.js` | An explicit opt-in assisted mode only after authorization; ordinary command remains offline. Inject verification capability into HTTP layer; do not change shared offline blocker. |
| Existing `review-http.js` | One authenticated same-origin POST verification action for `IP-P1`, `IP-P2`, `IP-P3`, disabled by default. Browser cannot submit endpoint, URL, arbitrary pilot, raw file path or arbitrary address. |
| Existing `review-store.js` / `review-model.js` | Read a bound minimal suggestion; preserve all current decision gates and stale-packet behavior. Add evidence-reference binding only where necessary, not weaker approval semantics. |
| Existing `review-ui/index.html`, `review.js`, `review.css` | Small Verify Address action, budget confirmation and component-difference panel. No redesign, native alert dialogs, Maps SDK or provider keys. |
| Local evidence only | New suggestion/attempt artifacts beneath existing gitignored `data/runtime/identity-resolution-pilot/`; do not modify source packets, prior provider caches or exclusion registry. |
| Existing pilot tests + new focused verification tests | Offline mocks for provider responses, budget/concurrency/crash behavior, privacy, stale decisions and UI gating. Keep real-data accuracy results separate from synthetic QA. |

No change proposed to `src/sources/rentcast/*` defaults: the client already supports configuration and store/fetch injection. Its existing `/avm/value` capability must be inaccessible through the narrow worker. Do not invoke `verifyOne`, the full analysis workflow, or canonical-resolution persistence functions.

### Worker and privacy boundary

Use a fixed executable/script with `execFile`-style argument handling, not a shell command containing an address. Pass minimal private input through stdin; suppress raw stdout/stderr and return sanitized error codes. Allow only registered packet identity and server-approved components, not free-form browser lookup targets. The worker independently rechecks packet binding and input scope.

Provide only the necessary RentCast credential and essential runtime environment; never inherit/export the database, ATTOM, DataTree or deployment credentials. If reading the local `.env` is needed, extract the named key only; do not call the generic environment loader. Keys remain in process memory and request headers, never the browser, logs or persisted suggestions. The local access code is not a provider credential.

Retain existing loopback binding, exact Host/Origin checks, session expiry, request-size limits, CSP, no-store headers and reviewer attestation. Gate worker execution behind the existing access check and explicit budget authorization. Reject redirects and all URLs/endpoints other than the fixed HTTPS property-record route. No imports of database repositories for persistence and no other provider clients. These controls need tests before live authorization; this document does not certify a future worker's isolation.

### Cache and evidence record

Reuse existing cache validation concepts, but not the raw cache writer: it redacts secrets, not owner/contact PII. Supply a minimal store through `createClient`'s existing injection point. Hash the response in memory; persist only allowed address/identity-summary fields and diagnostics. Never mutate or sanitize historical raw evidence in place.

Private suggestion fields should include:

- Review code, exact internal county identity reference, packet SHA-256 and lookup-input fingerprint.
- Original situs reference; reviewer-confirmed input state and cited metadata fingerprint.
- Proposed street/city/state/ZIP/ZIP+4, plus provider-specific ID only when returned and needed; no conversion of it into a county key.
- Provider, fixed endpoint identifier, retrieval time, actual provider data timestamp if supplied (otherwise null), response fingerprint and available source reference.
- Result count, actual available match evidence, existing component-comparison result, differences, missing fields and confidence limitations. Never manufacture a numeric confidence score.
- Attempt/budget identity, outcome, cache status, policy version and permitted-retention review reference.
- Separate reviewer decision reference; no automated `analystConfirmed=true`.

Cache lookup must bind to provider, exact request, packet fingerprint, component evidence and permitted use. Existing cache files have no built-in expiry; propose a **30-day maximum reuse age** for this pilot, subject to reviewer approval and applicable terms, not as a vendor freshness guarantee. An expired/changed/incomplete record asks for review; it does not silently refresh. Preserve retrieval dates when reusing evidence. Existing complete-address caches may not share the partial-address request key; do not use approximate cache matches to attach another property's ZIP.

### Three-attempt budget

Proposed ceiling: **one attempt per pilot, three total**, zero automatic retries, one request in flight at a time. Existing client `maxCalls=6` resets per instance and is not sufficient. Configure worker `maxCalls=1`, `maxRetries=0`, retain a finite timeout, and persist a reservation atomically before network dispatch. A timeout/crash consumes the attempt pending manual review; never reset it by restarting the reviewer. A replay of the same action returns existing outcome; stale or competing requests cannot spend again. Block on exhausted allowance, uncertain prior outcome or missing approved monetary ceiling. Count attempts separately from provider-billed successes and cache hits. No spending is authorized by these proposed values.

## Acceptance criteria for a later authorized pilot

1. Written no-ZIP contract, account access, budget and applicable storage basis are recorded before enabling live mode; ordinary mode still cannot call providers.
2. Exactly the existing three packets are accessible; no other candidate/address endpoint can be queried. Packet changes invalidate stale suggestions and approvals.
3. State evidence is explicitly reviewed; missing state stops before a request. No inferred ZIP/city or billing-address substitution.
4. Every useful result contains complete canonical-validator-compatible components. One returned address must satisfy existing exact-component rules; county/state conflicts, unexpected units, multiple records or absent ZIP stop. A legitimate alternative postal city requires separate evidence/review, not a fuzzy auto-match.
5. Provider match evidence is displayed honestly. `MATCHED_ADDRESS` means the adapter's component check, not APN verification, deliverability or a canonical identity decision.
6. Original county ATN/APN9/situs and Assessor relationships stay unchanged. Acreage flags remain visible and require acknowledgment/notes; no automatic rejection or clearance.
7. Neither suggestion retrieval nor draft acceptance approves anything. Existing reviewer identity, timestamp, references, contradiction checks and decision reopening tests pass.
8. Caching, double-clicks, concurrent requests and restart/crash tests demonstrate at most three attempts, no silent refresh/retry and no repeated billing from ordinary replay.
9. Synthetic response fixtures containing owner/contact fields, credentials or malicious content never expose or persist those fields. Browser responses exclude raw payloads, internal filesystem paths and secrets; all displayed content is escaped.
10. Offline unit/UI tests make zero provider/database calls. Separately authorized live results identify their actual attempt counts and successes without being confused with mock coverage.
11. No AVM, comps, reports, other providers, database writes, Properties, resolutions, lineage, MLS access or scoring changes occur. Source packets, pilot exclusions, Round 1 flags and protected baselines remain unchanged.
12. Report per-pilot outcome and actual cost/attempt accounting, then stop. A no-match is an honest outcome, not permission for APN experiments or automatic fallback.

## Expansion and stopping rule

After review of the three-pilot outcome, a separately authorized rollout could reuse this same narrow process for the other 77 candidates with a newly approved budget. Do not run an 80-property batch or select six properties automatically. The permanently excluded pilots remain excluded, and address completion alone does not satisfy durable identity, analysis, provider-budget, Monte Carlo or MLS/report-freeze gates.

If RentCast cannot support the missing-ZIP request, do not implement an ineffective button. Choose one documented alternative after its access/retention review, or use existing manual evidence entry. No broad multi-provider system is justified for this pilot.

**STOP FOR STAN/CHATGPT REVIEW.** This deliverable adds no executable capability.
