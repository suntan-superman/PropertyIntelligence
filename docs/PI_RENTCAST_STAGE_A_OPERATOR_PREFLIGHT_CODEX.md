# PROPERTY INTELLIGENCE — RENTCAST LIVE STAGE A
## Operator Evidence Preparation and Authorization Review (No Transmission)

**Project:** Property Intelligence (PI), Workside Software LLC  
**Scope:** Prepare and validate evidence for technical ordinal 1 only  
**Execution:** Local, read-only except new private review artifacts  
**Live provider requests:** NOT AUTHORIZED  
**Stage B/C:** NOT AUTHORIZED

## 1. Objective

Resolve the remaining `STAGE_A_PREFLIGHT_BLOCKED` operator-record gaps without manufacturing vendor or human evidence. The existing live Stage A entrypoint has 342/342 offline tests passing and 4,826 pre-existing protected files unchanged. Do not reopen the certified implementation or rework identity architecture.

The output must be a factual, reviewable account/rights/cost evidence package and a **draft** request-bound authorization for Stan's explicit approval. Do not create an attestation purporting to be signed or personally reviewed by Stan unless he actually confirms it. Do not invoke `execute`.

## 2. Inspect existing contracts

Read the actual current files:

- `docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1.md`
- `docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1_QA.md`
- `docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1_NEXT_GATES.md`
- `scripts/rentcast-live-stage-a-v1/preflight.js`
- `scripts/rentcast-live-stage-a-v1/run.js`
- The existing private shortlist and offline certification.

Confirm exact expected schemas for `account.json`, `authorization.json`, excerpt references, reviewer timestamps, SHA-256, evidence quotes, expiries, and fixed registry binding. Use the real schema; do not invent fields.

## 3. Source evidence inventory

Search only already retained local evidence for:

1. Dated Workside RentCast API usage screenshot showing 3/50 requests used (47 remaining). The screenshot does **not** alone verify active product entitlement or overage terms.
2. Previously supplied Developer plan screenshot: $0/month, 50 included requests, $0.20 per overage. Treat as previously observed, not automatically current.
3. Cindy Bellford's written permission for retaining identifiers/address/provenance, combining county data, commercial SaaS display, investor PDFs, and her statements on attribution/retention. Retain exact quotes and identify any terms qualifications.
4. The current RentCast API terms and billing/endpoint documentation already retained. Public documentation may support general pricing or product capability but not authenticated account entitlement.
5. Any existing authenticated dashboard evidence specifically confirming current plan, active key, Property Records access, and fee/tax/endpoint charges.

Do not search unrelated personal files, read or print secrets, log in, query provider data, or send private property identifiers over the network. If a source is not locally accessible, mark it MISSING and identify exactly what Stan should supply.

## 4. Factual claim matrix

For each required preflight claim record:

- Claim and exact value or UNKNOWN.
- Evidence source/path and whether it is authenticated account-specific or general vendor documentation.
- Verbatim supporting excerpt, timestamp, source SHA-256 and review recency.
- What the evidence **does not** establish.
- Whether an actual human review/attestation is still required.

Claims must separately address: active Workside Developer plan, Property Records entitlement, current HTTP-200 request billing, $0.20 maximum overage rate, additional endpoint charges, bounded taxes/fees, written data rights and applicable third-party terms, pilot exclusivity and concurrent usage uncertainty.

Never assert zero taxes or no additional charges without defensible evidence. Do not use assumed free quota to reduce the conservative $0.20 reservation. If any maximum monetary exposure remains unknown, classify cost gate BLOCKED.

## 5. Draft private operator records

Use the exact `preflight.js` schema to create **draft** operator materials under a new gitignored review directory. Do not populate the active `operator-inputs/account.json` or `authorization.json` with unapproved attestations. If the preflight schema requires human-confirmed fields, leave them unapproved in the draft and report the missing action.

Where the source bytes exist, produce sanitized `.txt`/`.json` excerpts and compute actual SHA-256 hashes. Do not create fake vendor excerpts, synthetic billing statements or fabricated review times. Preserve original sources. If images cannot be faithfully converted into the required quoted evidence, retain the original and flag manual transcription/review as required.

Draft the exact request-bound Stage A authorization referencing:

- The existing sealed shortlist fingerprint `ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4`.
- Technical ordinal 1 only and its private source/candidate/request fingerprints from `inspect`.
- Exact `GET https://api.rentcast.io/v1/properties` with only the source-backed address query; no invented ZIP.
- One transmitted attempt maximum, zero retries/redirects/pagination/fallbacks.
- $0.20 conservative request-fee reservation and $1.00 all-in cap, conditional on verified bounded extras.
- Fixed private registry and immutable one-attempt ledger.
- Mandatory stop after Stage A; no automatic B/C, approvals, Property creation, database operations, financial analysis, MLS or deployment.
- Named human reviewer, actual approval timestamp and short expiry **to be completed only after human approval**.

Do not insert the current time as a fictional human-review time. Do not sign on Stan's behalf.

## 6. Read-only validation

Run only the entrypoint's `inspect` action and any purpose-built read-only validation that does not consume a request, create a live reservation, load an API key or alter the certified implementation. Report whether the draft is structurally complete and which real preflight gates remain blocked. Do not bypass `preflight.js` or weaken its tests. No need to rerun broad regression suites if no certified code changes occur.

## 7. Security and preservation

- No provider calls, dashboard login, database connections or credential loading.
- No `execute` invocation and no Stage A reservation.
- Do not edit protected code, baseline manifests, historical ledgers, original evidence, analyst decisions or Round 1 selection.
- No actual address/APN/ATN/RentCast ID in tracked documents or terminal summaries.
- Drafts and source excerpts remain gitignored; verify privacy and source hashes.
- Never reset a ledger or alter a source fingerprint to make preflight pass.

## 8. Deliverables

Create:

- `docs/PI_RENTCAST_STAGE_A_OPERATOR_PREFLIGHT_REVIEW.md` — sanitized claim matrix, verified/missing sources, exact human actions needed.
- `data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/operator-review-draft/` — private source excerpts, hashes, schema-aligned draft records, request-binding summary.

Report:

```text
PI RENTCAST STAGE A — OPERATOR PREFLIGHT PREPARATION
Offline Stage A certificate: PASS / FAIL
Original candidate/shortlist integrity: PASS / FAIL
Current plan evidence: VERIFIED / PARTIAL / MISSING
Property Records entitlement: VERIFIED / PARTIAL / MISSING
Current rate and fee/tax bound: VERIFIED / PARTIAL / MISSING
Commercial rights evidence: VERIFIED / PARTIAL / MISSING
Human review/authorization: PENDING
Draft records: COMPLETE / PARTIAL / BLOCKED
Active authorization written: NO
Stage A reservations: 0
Provider requests: 0
Database connections/writes: 0
Protected changes: 0
Final classification: READY FOR HUMAN PREFLIGHT REVIEW / ADDITIONAL EVIDENCE REQUIRED
```

## 9. Mandatory stop

**STOP FOR STAN/CHATGPT REVIEW.** Do not activate draft records or execute the request. Once Stan verifies missing account facts and expressly approves the exact request, a separate instruction may authorize activation of operator records and one Stage A transmission.
