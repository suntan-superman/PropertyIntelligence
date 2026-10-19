# PROPERTY INTELLIGENCE — RENTCAST LIVE STAGE A V1
## One-Subject Discovery, Controlled Transport and Mandatory Stop

**Project:** Property Intelligence (PI), Workside Software LLC  
**Date:** 2026-10-12  
**Priority:** High  
**Scope:** Technical ordinal 1 only; one RentCast Property Records discovery attempt  
**Authorization:** Implement and certify a narrowly scoped live Stage A entrypoint. One actual request is conditionally authorized **only after every preflight gate below is independently verified**. If any gate is unresolved, STOP without transmitting.  
**Stages B/C, database writes, MLS, deployment, real economics:** NOT AUTHORIZED.

## 1. Objective

Move from the certified mock-only RentCast financial controlled client to a single, securely authorized live discovery request for technical ordinal 1 of the sealed nonpilot shortlist. Capture a minimal, private, source-bound evidence receipt; reconcile using the existing exact APN9 / documented Rule C policies; then stop for Stan/ChatGPT review. **Do not proceed to valuation or comparable sales**, even if Stage A passes.

This is not a new identity, financial, reporting or persistence subsystem. Reuse the offline certified code without weakening its default-closed behavior.

## 2. Controlling artifacts and preservation

Read the current versions of:

- `docs/PI_RENTCAST_FINANCIAL_CONTROLLED_CLIENT_V1.md`
- `docs/PI_RENTCAST_FINANCIAL_CONTROLLED_CLIENT_V1_QA.md`
- `docs/PI_RENTCAST_FINANCIAL_CONTROLLED_CLIENT_V1_LIVE_PREREQUISITES.md`
- `docs/PI_REAL_FINANCIAL_EVIDENCE_ACQUISITION_PLAN.md`
- `docs/PI_REAL_FINANCIAL_EVIDENCE_READINESS_V1.md`
- `docs/PI_RENTCAST_RECONCILIATION_V1_1.md`
- The actual `scripts/rentcast-financial-controlled-client-v1/` implementation and its ledger/contract/evidence/guard modules.

Reverify the existing shortlist fingerprint exactly:

`ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4`

Use only ordinal 1; do not reselect, substitute or promote ordinals 2/3. Verify original county source pins, unique candidate/Assessor relationships and exclusions. Preserve historical RC/IP pilot ledgers, all actual analyst decisions, V3, Rule C, monitoring, MAO, Monte Carlo, Investor Report V1.1, baseline manifests, ATTOM evidence and Round 1 state. Hash protected files before and after. Do not reset any previous reservation ledger.

## 3. Account, rights and price preflight — mandatory BEFORE any network call

Stan's 2026-10-12 dashboard screenshot shows **3 used of 50 included requests** and zero recent errors. This is a dated usage observation, **not proof by itself** of active plan, exact product entitlement, rate, tax/fees or unchanged account state. The earlier dashboard showed Developer Active at $0/month; the plan selection screenshot showed $0.20 overage per request. RentCast's written correspondence permits the described retention, county combination, commercial SaaS and investor PDF use; preserve the dated terms/source reference and limitations.

Before transmission, require a sanitized, operator-reviewed preflight record verifying:

1. Current active Workside RentCast plan and access to **Property Records**; no need to query the API to discover entitlement.
2. Current included balance and any concurrent account usage uncertainty, with observation time.
3. Actual current overage rate no greater than **$0.20 per HTTP-200 request**, any endpoint-specific fees and an upper bound for taxes/other charges. If any charge is unknown, **STOP**.
4. Applicable written rights and terms for storing the minimal returned property/address/identifier/attribute evidence privately and using it for the proposed workflow.
5. An enforceable pilot-local cap, exclusive fixed ledger registry and no competing run of this pilot.
6. Valid server-side key availability without printing, copying into a report, or testing via an extra API request. Confirm the key is never exposed in browser code, URL/query, logs or artifacts.

Do not claim that a screenshot proves all six conditions. If independent evidence is missing, prepare a concise preflight blocker report and stop. Do not ask Codex to invent an account attestation.

**Budget:** Stage A permits **one transmitted request**, one conservative **$0.20 request-fee reservation**, and an **all-in Stage A ceiling of $1.00** (including verified bounded tax/fees). The previously proposed $1.00 first-subject cap does **not** authorize additional stages. Never assume unused included quota removes the need to reserve worst-case exposure. No automatic retries or refunds for timeouts/uncertain outcomes.

## 4. Live transport: narrow, default-closed

Create a separate local live Stage A entrypoint that reuses the certified contract, evidence, and ledger machinery. Do not modify the synthetic-only constructor to accept arbitrary fetch callbacks or allow an environment flag alone to enable live access.

- Only `GET https://api.rentcast.io/v1/properties` is permitted.
- Request input: the exact private county street/city of ordinal 1 plus jurisdiction-supported `CA`; **no invented ZIP**.
- Use the key only in the server-side `X-Api-Key` header; redact it in every error and receipt.
- One exact allowlisted host/path/method/parameter set; reject redirects, unexpected query keys, alternate hosts and extra subjects.
- One attempt maximum, zero retries, no fallback, no pagination, 15-second total timeout, 2 MiB response bound and safe schema/error handling.
- Keep a fixed private ledger path bound to the exact shortlist, candidate, stage and authorization. Exclusive process lock; durable reservation before sending; append-only hash-linked outcome afterward. A crash, timeout or uncertain delivery consumes the sole Stage A attempt and requires review, not replay.
- The live entrypoint must require an explicit dated, expiring, single-stage authorization record naming reviewer, candidate fingerprint, exact request hash, rights/account evidence hashes, monetary cap and stop rules. Verify actual evidence, not just hashes. Do not expose an executable bypass or `--force` mode.

Do not run an unauthenticated probe, dashboard API probe or test request to validate credentials; that would be an additional transmission.

## 5. Offline certification BEFORE transmission

Use mock transport to certify the new live-entrypoint wiring and authorization checks without provider access. Test wrong candidate, changed source fingerprint, absent/expired approval, missing current plan/rights/rate/tax evidence, wrong key handling, invalid request parameters, duplicate attempt, stale lock, timeout, non-200, oversized response, redirects, unexpected multi-record results, identity mismatch, zero retries, no second request and privacy leakage. Run the existing complete relevant controlled-client, Rule C, baseline and Round 1 regressions without skipping or weakening assertions.

If any offline test fails, STOP. Record exact test counts, preservation results and remaining gaps. **No live transmission until offline integration certification passes and every preflight condition is satisfied.**

## 6. Stage A live execution — exactly one request, if all gates pass

Only after successful preflight and offline QA:

1. Reverify the fixed private ordinal-1 candidate/source binding, shortlist seal, and exclusions immediately before reserving.
2. Confirm the exact approved request and fee/tax reserve fit the Stage A ceiling.
3. Atomically acquire the fixed process lock and fsync the sole Stage A reservation **before** transmitting.
4. Transmit **one** HTTPS Property Records request. Do not retry, redirect, paginate or switch candidates, even after errors.
5. Retain only a minimal, allowlisted private projection: exact RentCast ID, complete address components, jurisdiction, property type, provider `assessorID` as an untrusted assertion, allowed property attributes, relevant sale/tax dates if present, source/retrieval date distinctions, source/terms references and content fingerprints. Never store the raw response, owner/contact fields, key or unneeded PII.
6. Verify response is a single unambiguous complete SFR record, with nonempty provider ID and correct Kern/California context. Treat ambiguous pagination/total-count as a stop.
7. Reconcile using the **unchanged** exact APN9 or documented Rule C county APN lookup against verified original source rows. Do not treat address agreement or RentCast ID as canonical proof; do not accept ATN equivalence, numeric coercion, stripped zeros or calculated check digits.
8. Record an append-only private receipt including HTTP status, attempt consumption, response/evidence hash where complete, source/candidate binding, reconciliation classification, account/rights evidence references and conservative monetary reserve. No public address/parcel IDs in shareable reports.
9. **STOP regardless of outcome.** Do not run Stage B, Stage C, real financial calculations, investor reports or persistence.

A successful HTTP 200 with a bad identity is a **billable, stopped exception**, not a reason to change matching rules. A failed or uncertain request is consumed; do not repeat without new explicit authorization and investigation.

## 7. Acceptance and classifications

Report separate outcomes:

- `STAGE_A_DISCOVERY_ACCEPTED_FOR_REVIEW`: unique record and supported historical county relationship; still **not** current identity verification or final approval.
- `STAGE_A_IDENTITY_EXCEPTION`: returned record but material or unresolved county/provider relationship.
- `STAGE_A_PROVIDER_FAILURE`: network/HTTP/schema/size/timeout failure or uncertain outcome.
- `STAGE_A_PREFLIGHT_BLOCKED`: account, rights, pricing, cap, source, credential, approval or QA gate failed before transmission.

No classification authorizes Stage B automatically. If no request was transmitted, say so clearly; do not present mocks as real acquisition.

## 8. Required deliverables

Create:

- `docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1.md`
- `docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1_QA.md`
- `docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1_NEXT_GATES.md`

Keep property-level request/evidence, ledger, preflight record, receipt and source references under a new gitignored, fixed private Stage A runtime directory. Do not overwrite existing synthetic or historical outputs. The shareable reports must contain no private property address, APN/APN9/ATN, RentCast ID, owner/contact information or credentials.

Final Codex response:

```text
PI RENTCAST FINANCIAL LIVE STAGE A V1

Offline live-entrypoint QA: PASS / FAIL
Current account and product entitlement: VERIFIED / BLOCKED
Rights and fee/tax maximum: VERIFIED / BLOCKED
Candidate/source/shortlist seal: PASS / FAIL
Stage A operator authorization: VERIFIED / BLOCKED
Maximum transmitted requests: 1
Actual transmitted requests: 0 or 1
HTTP outcome: [status / not attempted / uncertain]
Historical county reconciliation: PASS / EXCEPTION / NOT EXECUTED
Stage A reservation: [consumed / not created]
Conservative fee reserve: $0.20 if transmitted
Stage A all-in ceiling: $1.00
Actual provider bill: UNKNOWN unless independently verified
Protected-file changes: 0 unexpected
Tests: X/X; skipped: 0
Database writes: 0
Real financial analyses: 0
Stage B/C requests: 0
MLS selections: 0
Deployments: 0

Final classification:
STAGE_A_DISCOVERY_ACCEPTED_FOR_REVIEW
or STAGE_A_IDENTITY_EXCEPTION
or STAGE_A_PROVIDER_FAILURE
or STAGE_A_PREFLIGHT_BLOCKED
```

## 9. Hard restrictions

Do **not**:

- Make more than one RentCast data request or any other provider/county/MLS call.
- Authenticate to dashboards programmatically or make a credential probe.
- Use any subject other than sealed technical ordinal 1.
- Modify original shortlist, county records, Rule C, V3, analyst decisions or protected baselines.
- Alter Monte Carlo, MAO, investor-report or monitoring logic.
- Treat historical identity reconciliation as current parcel verification.
- Add automatic retries, pagination, wider searches, fallback providers or transferable slots.
- Expose private identifiers or credentials in tracked files or browser content.
- Create canonical/durable Properties, perform financial analysis, make an investment recommendation, select MLS Round 1 properties or deploy.
- Reset or delete an attempt ledger to regain an exhausted request.

**FINAL STOP:** After the one permitted request (or preflight block), stop for Stan/ChatGPT review. Stage B valuation and Stage C sold search each require new explicit authorization after the prior stage's real receipt has been reviewed.
