# PROPERTY INTELLIGENCE — RENTCAST CONTROLLED FINANCIAL ACQUISITION CLIENT V1
## Offline compatibility implementation and certification; NO live requests

**Project:** Property Intelligence (PI), Workside Software LLC  
**Priority:** High  
**Execution:** Local/offline development and QA only  
**Live RentCast requests:** ZERO authorized  
**Database connections/writes, MLS, deployment:** ZERO authorized

## 1. Objective and scope

Implement a narrowly scoped, auditable RentCast acquisition client that *could later* acquire a single nonpilot Kern County technical candidate in three serial stages: (1) Property Records discovery, (2) Value Estimate, and (3) bounded sold-record search. **Do not execute any provider request now.** The first subject is technical ordinal 1 in the already sealed private shortlist; the other two remain reserved for a later, separately authorized expansion. No new selection, replacement, or economic cherry-picking.

This task is a compatibility and offline certification sprint, not a new property identity, valuation, ARV, database, or report subsystem. Reuse existing source adapter and evidence/guard patterns. Preserve existing historical RentCast attempts and all sealed packets.

## 2. Read and verify the controlling evidence

Inspect the current versions of:

- `docs/PI_REAL_FINANCIAL_EVIDENCE_READINESS_V1.md`
- `docs/PI_REAL_FINANCIAL_EVIDENCE_PROVIDER_MATRIX.md`
- `docs/PI_REAL_FINANCIAL_EVIDENCE_ACQUISITION_PLAN.md`
- `docs/PI_REAL_FINANCIAL_EVIDENCE_QA.md`
- `docs/PI_PRELIMINARY_PROPERTY_ANALYSIS_V1.md`
- `docs/PI_RENTCAST_RECONCILIATION_V1_1.md`
- Existing `src/sources/rentcast/{config,client,propertyLookup,valuation,comps,normalizer}.js` and controlled pilot tooling, using actual repository paths.

Verify the private shortlist seal before implementing any runner:

`ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4`

The prior assessment reports **three technical subjects**, none provider-ready, with historical county bindings only. Do not treat selection as identity approval or MLS Round 1 selection. Do not copy private identifiers to tracked files or logs.

## 3. Exact allowed future workflow — ONE subject only

The new client must be **disabled by default** and use injected fake transport for all certification tests. No real transport invocation, credential loading, or environment-based fallback is permitted in this sprint.

Stage A — `GET /v1/properties` for technical ordinal 1 using original county street/city and jurisdiction-supported California, without invented ZIP. Require one unambiguous SFR record, a complete returned address, and a nonempty RentCast ID. Treat RentCast `assessorID` as a vendor assertion, not authoritative county identity. Reconcile only with existing exact APN9 or certified Rule C documented county APN crosswalk. Never infer ATN equivalence, trim zeros, calculate APN9, or approve based on address alone. Stop on missing/ambiguous/mismatched identity. A failed discovery must never trigger AVM or sold search.

Stage B — `GET /v1/avm/value` with the accepted full address, documented supported options, and explicit approved SFR context. Require a nonempty returned `subjectProperty.id` exactly equal to the accepted Stage A RentCast ID, with compatible address, jurisdiction and property type. Reject absent IDs, conflicting subject attributes, invalid values, and malformed ranges. Preserve AVM and listing-comparable data separately from sold transactions. Do not call the AVM result ARV or treat its interval as a Monte Carlo distribution.

Stage C — bounded `GET /v1/properties` sold-record search centered on the accepted subject address. Restrict to an explicitly approved radius, sale-date lookback, property type, limit 50, offset zero, and one page. Do not run this stage until the bounds are explicitly approved in the later live authorization. A draft 2-mile/180-day window is **not** approved by this instruction. Detect truncation, missing total-count semantics, unexpected pagination, date/geography mismatch, and unusable closed-sale evidence; stop without widening or retrying. Returned records are only *comparable candidates*, not approved sales, and no new durable Properties may be created for them.

**Maximum future requests for this first subject: 3 attempted transmissions total, one per stage, serially.** Stage progression must be a deliberate gated action, not automatic chaining after HTTP 200. At each stage write a private receipt and stop for inspection; an operator must explicitly authorize advancement under the eventual live approval. No use of ordinal 2 or 3 in this sprint.

## 4. Client compatibility and parameter safety

Inspect the current official endpoint contracts already cited in the provider matrix and acquisition plan. Implement the narrowest compatibility changes needed for the documented parameters: `lookupSubjectAttributes`, `compCount`, `maxRadius`, `daysOld`, `radius`, `saleDateRange`, `propertyType`, `limit`, `offset`, and `includeTotalCount`, as applicable. Do not assume all parameters are valid together: verify contract and fail closed on ambiguity. Never invent a `propertyId` AVM query parameter.

Prefer a dedicated controlled-client wrapper with a strict endpoint/method/parameter allowlist and an injected transport over loosening a shared production client. Do not globally expand generic RentCast access, change defaults for other callers, or bypass the existing HTTPS host and API-key-header restrictions. Reject unapproved methods, hosts, redirects, extra parameters, missing values, excessive limits, malformed numeric bounds, and attempts to send credentials in query strings. Never expose API keys in client/browser bundles, logs, errors, receipts, or documentation.

The existing client's two retries and six-call default are unsuitable. For this controlled runner enforce **zero retries** and **three attempts maximum** for ordinal 1. A timeout or unknown network result permanently consumes its reservation; do not assume it was unbilled. Reject redirects rather than silently following them. Enforce a bounded timeout (proposed 15 seconds), response byte limit, JSON/schema checks and explicit error classification.

## 5. Hard spending controls and reservations

Implement an append-only, crash-conscious private attempt ledger with exclusive process lock and durable reservations written **before** any transmission. It must bind: exact shortlist fingerprint, ordinal 1, stage, endpoint, canonicalized parameter fingerprint, allowed provider host, timestamp, maximum billable exposure, request outcome and response/evidence hashes. Repeated execution must not reuse a consumed attempt, including after crash, timeout or uncertain outcome. No reset of historical pilot ledgers.

The previously observed Developer plan was 50 included requests at $0/month with $0.20 overage per successful request. That is **not current authenticated entitlement**. For safety reserve the full worst-case $0.20 per attempt without assuming free quota: **$0.60 maximum request-fee estimate for three stages**. Propose a **$1.00 all-in first-subject cap**, subject to later verification of account-specific pricing, tax, fees and endpoint charges. This cap is a *future authorization proposal*, not permission to incur charges. If an enforceable upper bound cannot be established, the runner must refuse to send.

No live provider calls or dashboard authentication in this sprint. Implement a mandatory later preflight that requires operator-supplied, independently verified account/rights/rate information without storing secrets in the manifest. Require an explicit, separate live authorization and approved bounds before enabling any network path. An ordinary environment variable or CLI flag by itself must never grant live authorization. Tests must demonstrate that the default runner cannot call the network.

## 6. Evidence projection and rights

Design minimal private allowlists for each response:

- Subject: RentCast ID, full address components, assessorID as untrusted provider assertion, county/state, property type, characteristics, documented sale history and tax fields with original dates and source references.
- AVM: same subject ID, valuation estimate and range, provider date fields if present, separately labeled **listing** comparables, attributes and provenance.
- Sold candidates: source record ID, address/location at permitted precision, sale date/price, property type and relevant characteristics, transaction-quality fields when supplied, and source dates.

Exclude owner names, contact information, phone/email, unrelated personal data and unapproved raw payload retention. Preserve exact source ID strings and leading zeros. Use private gitignored paths, content hashes, bounded payload size, source rights/terms version and distinct source-effective/retrieval dates. No public addresses, parcel numbers, IDs, raw responses or credentials in tracked reports or screenshots. Hashes are integrity checks, not authenticity signatures.

RentCast's written retention/SaaS/PDF permission is retained evidence, but current account access and any third-party limitations still require confirmation. ATTOM, DataTree, Google and new county data are outside this sprint.

## 7. Identity and financial gating

Reuse unchanged Rule C, original source seals, county candidate binding and the preliminary identity contract. The first technical candidate currently has **no certified RentCast crosswalk or complete licensed address**; Stage A must establish discovery evidence and then stop at the identity gate if reconciliation is unsupported. Do not weaken the gate to obtain an AVM. Do not use RentCast address or ID as PI canonical identity.

A successful three-stage acquisition would still **not** establish ARV, rehab scope, acquisition price, loan terms, costs, investor hurdle, or Monte Carlo uncertainty distributions. Financial readiness remains PARTIAL/INSUFFICIENT until all required entries are independently supported. No real Monte Carlo, MAO, investor PDF, offer, investment recommendation, canonical approval, durable persistence or MLS selection is authorized.

## 8. Offline QA and negative tests

Use mocked transports and synthetic fixtures only. Test at least:

1. Exact private shortlist fingerprint and ordinal-1-only restriction.
2. Historical technical/IP/RC exclusions and Round 1 unchanged.
3. No-ZIP discovery without inferred ZIP; wrong county/state/type rejected.
4. Zero/multiple/ambiguous subject results rejected.
5. APN9 and Rule C valid branches; ATN equivalence, stripped zeros, fabricated APN9 rejected.
6. Stage B blocked unless Stage A identity gate passes.
7. AVM missing or mismatched subject ID rejected even if address agrees.
8. AVM listing prices never classified as sold prices or ARV.
9. Stage C blocked without approved radius/lookback and stage authorization.
10. Sold-search limits, total-count, truncation, pagination and invalid dates rejected.
11. Unapproved endpoint, query parameter, HTTP method, host or redirect rejected.
12. Three-attempt cap, zero retries, one attempt per stage, nontransferable slots.
13. Crash/timeout/uncertain response consumes reservation and prevents replay.
14. Process lock and concurrent invocation reject double spending.
15. Budget reservations fail closed on missing account/rate/tax/charge certainty.
16. No credential leakage, owner/contact retention, raw-response logging or public identifiers.
17. No provider calls even when credentials exist in the developer environment.
18. No database reads/writes, MLS access, real analyses, PDFs, approvals or deployment.
19. All existing source evidence and certified modules unchanged.
20. Explicit stop between stages and no automatic second/third-subject expansion.

Run focused tests plus relevant unchanged RentCast, Rule C, protected-baseline and Round 1 harness regressions. No skipped tests or weakened assertions. Do not run historical regeneration or live pilot commands. Record before/after protected hashes, with zero unexpected changes.

## 9. Deliverables

Create:

- `docs/PI_RENTCAST_FINANCIAL_CONTROLLED_CLIENT_V1.md`
- `docs/PI_RENTCAST_FINANCIAL_CONTROLLED_CLIENT_V1_QA.md`
- `docs/PI_RENTCAST_FINANCIAL_CONTROLLED_CLIENT_V1_LIVE_PREREQUISITES.md`

Store all synthetic receipts, private test manifests, preservation inventory and QA output under a new gitignored `data/runtime/rentcast-financial-controlled-client-v1/` directory. No actual property values in shareable documents.

The live-prerequisites document must identify the exact later approvals needed: active account/rate/endpoint access and rights; enforceable cap; first candidate and shortlist fingerprint; stage-specific allowed parameters; explicit urban/rural search bounds; secure credentials; exact stage authorization; expected output and stop rules. Do not claim that the user has authorized live execution by asking for this implementation.

## 10. Final Codex report

```text
PI RENTCAST FINANCIAL CONTROLLED CLIENT V1

Offline compatibility implementation: PASS / FAIL
Endpoint/parameter allowlist: PASS / FAIL
Identity/Rule C preservation: PASS / FAIL
Strict subject-ID binding: PASS / FAIL
Sold-record search bounds: PASS / FAIL
Append-only reservation and lock: PASS / FAIL
Zero-retry/timeout handling: PASS / FAIL
Budget enforcement (offline): PASS / FAIL
Minimal evidence projection: PASS / FAIL
Stage-by-stage manual gates: PASS / FAIL

First-subject maximum future attempts: 3
Proposed first-subject request-fee reserve: $0.60
Proposed first-subject all-in cap: $1.00 — NOT YET AUTHORIZED
Live account entitlement: UNVERIFIED
Search bounds: AWAITING APPROVAL

Tests: X/X; skipped: 0
Unexpected protected changes: 0
Provider calls: 0
Database connections/writes: 0
Real financial analyses: 0
MLS Round 1 selections: 0
Deployments: 0

Final classification:
OFFLINE CONTROLLED CLIENT CERTIFIED
or MORE DEVELOPMENT REQUIRED
or LIVE CONTRACT/COST BLOCKED
```

## 11. Hard restrictions and stop

Do not call RentCast, ATTOM, DataTree, Google or county services. Do not authenticate to provider dashboards, download new data, install dependencies, change V3/Rule C/Monte Carlo/MAO/report logic, rewrite historical ledgers or baselines, alter analyst decisions, create Properties, run MLS, or deploy. No live execution is permitted even if all offline tests pass.

**STOP FOR STAN/CHATGPT REVIEW after offline certification.** The next decision will be whether to authorize **Stage A only** for the first subject, after reviewing current account information and approved request limits. Stages B and C require separate stage advancement and must not occur automatically.
