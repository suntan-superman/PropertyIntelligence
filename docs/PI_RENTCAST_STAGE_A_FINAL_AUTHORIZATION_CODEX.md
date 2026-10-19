# PROPERTY INTELLIGENCE — RENTCAST STAGE A FINAL PREFLIGHT & CONTROLLED EXECUTION

**Project:** Property Intelligence (PI), Workside Software LLC  
**Date:** October 12, 2026  
**Priority:** High  
**User approval:** Stan expressly authorized **up to $1.00 total incremental RentCast spending** for **one** Stage A Property Records request. This is a spending authorization, not a waiver of preflight requirements or permission to make additional calls.

## 1. Objective and authority

Finish the narrowly scoped Stage A operator preflight, resolve the exact document-membership integrity issue through a versioned successor, and, **only if every existing live gate independently passes**, execute **one** controlled RentCast Property Records discovery request for **technical ordinal 1** of the existing sealed nonpilot shortlist. Stop immediately after the attempt, whatever the result. Do not conduct Stage B or C.

**Hard limits:** one transmitted `GET https://api.rentcast.io/v1/properties` request with only the source-backed `address` parameter (county street/city and supported CA jurisdiction; no invented ZIP); zero retries, redirects, pagination, substitutions, alternate endpoints or fallback providers; $0.20 conservative request-fee reservation and **$1.00 all-in incremental ceiling**, including bounded extras; no database connections/writes, canonical Properties, approvals, real financial calculations, MLS selections or deployments.

**Important distinction:** Stan has approved the maximum monetary exposure. The existing preflight still requires a genuine operator review of account, rights and charges; an evidence-backed upper bound on endpoint fees/taxes; an exact dated and expiring request authorization; and a valid protection certificate. Do not fabricate or self-attest any of these. If they cannot be completed from authentic reviewed evidence, **stop before network transmission** and return a short blocker list.

## 2. Read the controlling local artifacts

Inspect the actual current repository files and schemas before editing or executing:

- `docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1.md`
- `docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1_QA.md`
- `docs/PI_RENTCAST_FINANCIAL_LIVE_STAGE_A_V1_NEXT_GATES.md`
- `docs/PI_RENTCAST_STAGE_A_OPERATOR_PREFLIGHT_REVIEW.md`
- `docs/PI_RENTCAST_STAGE_A_PREFLIGHT_COMPLETION.md`
- `docs/PI_RENTCAST_STAGE_A_PREFLIGHT_COMPLETION_QA.md`
- `scripts/rentcast-live-stage-a-v1/{run,preflight,qa}.js` and its actual guard/worker/engine dependencies
- Existing sealed shortlist and private `operator-review-draft` / `operator-preflight-completion-2026-10-12` artifacts.

Exact shortlist seal: `ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4`.

Verify all original source, candidate, exclusion and certificate fingerprints. Preserve historical evidence, original ledgers, analyst decisions, Rule C, V3, Monte Carlo, MAO, reports and Round 1 state. Do not treat a historical source snapshot as current parcel verification.

## 3. Privacy: protect `source_docs` first

The user-supplied `source_docs` originals contain correspondence/contact information and are **untracked but not gitignored**. Do not stage, commit, publish, move, delete or alter those originals. Prefer already-retained, gitignored private copies under `data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/`.

Before any Git staging, inspect `git status` and confirm that no `source_docs` content is staged. If a targeted `.gitignore` entry is needed, propose and review it as an exact, separately tracked change; do not silently edit a protected ignore file or conceal source changes from the guard. No private addresses, APNs, ATNs, provider IDs, API keys, owner/contact details or raw provider payloads in shareable reports.

## 4. Versioned protection membership reconciliation

The existing immutable guard rejects new documentation paths even though the historical protected hashes still match. Do **not** edit the certified original guard, certificate, baseline or historical manifests in place. Do not globally ignore `docs/`, whitelist wildcards, auto-rebaseline or suppress a failing assertion.

1. Inventory **all** new Git-visible paths since the original certificate, including both operator-preflight documents, completion instruction/reports, this new instruction (if placed in the repository), and the user-supplied `source_docs` originals. Classify private inputs separately; do not automatically admit `source_docs` as shareable files.
2. Verify exact file bytes and SHA-256 for every proposed allowed documentation addition; previously cited two-document hashes are historical evidence, not a complete current allowlist.
3. Design and implement the **smallest versioned successor** for the guard/worker/engine/certificate selection that accepts only specifically approved path/hash pairs through a detached, non-self-referential seal. Preserve all original membership and protected-file checks. No self-approval of newly modified code.
4. Require explicit review of the final proposed additional-path membership before activating the successor. If no actual authorized approval exists for a new path, stop with a manifest proposal; do not claim the successor certified.
5. Run full relevant offline certification, including wrong-hash, missing-file, extra-path, symlink/path traversal, stale-certificate and unrelated-file rejection tests, plus original Stage A and protected-baseline regressions. Zero skips. Retain the old certificate and its failure history unchanged.

**Stop if the successor cannot be certified without weakening original protections.** A versioned successor is not authority to execute a provider call.

## 5. Account, pricing and rights: genuine operator review

Use the retained actual screenshots and complete correspondence, not fabricated excerpts. The October 12 screenshots show **API Developer — Active**, **$0/month**, **3 of 50 requests used**, and **$95.80 account credit** at observation. The vendor's written correspondence supports internal retention, combining county evidence, commercial SaaS display and investor PDF use. Public RentCast documentation supports standard Developer overage pricing of **$0.20 per successful HTTP 200**; however, these facts alone do not attest to every account-specific term or fee.

Prepare the exact `preflight.js` schema-aligned account record using authentic source excerpts/hashes and actual operator review timestamps. Explicitly assess:

- Current account and Property Records entitlement and key status (do not make a probe).
- Current rate, billing of unsuitable HTTP 200 responses, and any endpoint-specific charges.
- **Defensible upper bound** for applicable taxes and other charges. The $95.80 credit is not a hard spending cap; unknown extras must remain unknown. Never invent zero taxes/fees.
- Current terms, third-party licensing qualifications and retained RentCast permission.
- Pilot exclusivity and potential concurrent account usage. Assume zero free-quota credit for the reservation.

Only a genuine human review may mark `independentlyReviewed`, set reviewer identity and actual review times, or confirm a claim. If the required account-specific bound cannot be supported, stop as `COST_BOUND_UNVERIFIED`; do not relax the current cost gate to accommodate the small amount. The $1 authorization is a maximum, **not** evidence that vendor charges are bounded.

## 6. Exact single-stage authorization

After evidence review and successful versioned certificate verification, prepare the exact, short-expiry Stage A authorization bound to:

- Technical ordinal **1** only and the sealed shortlist/candidate/source fingerprints.
- Exact request method, official host/path and canonical parameter hash.
- Account, rights, pricing and certificate evidence hashes.
- The fixed private live registry, empty/no-competing-run state, one attempt and zero retries.
- Conservative $0.20 fee reserve and verified extras totaling **no more than $1.00**.
- Mandatory stop after Stage A, with no Stage B/C or downstream authorities.

Record the user's October 12 spending approval faithfully, but do not reinterpret it as an attestation that the user personally reviewed every private evidence item. Do not create an execution signature, approval timestamp or operator attestation on the user's behalf. If the current contract requires a distinct signed/dated operator approval not already provided, **stop and request that exact approval**. Never insert a fictitious approval or backdate a record.

## 7. Preflight and conditional execution

First run **read-only `inspect`** using the repository's verified Node executable. No credentials, reservation or network activity at this stage. Require PASS for:

- Versioned membership/certificate and unchanged original protections.
- Original candidate/source/shortlist integrity and exclusions.
- Current reviewed account/product and rights evidence.
- Verified rate, endpoint fees, bounded taxes/other charges and enforceable $1 cap.
- Valid expiring exact Stage A authorization and fixed registry exclusivity.
- Server-side credential availability/format, without printing or sending a probe.

**If any check fails, do not invoke `execute`.** Return exact failing gates and stop.

Only when all checks independently pass **and the exact execution authority required by the existing contract has been genuinely granted**, invoke the existing certified Stage A entrypoint once. Preserve the fixed registry and fsynced append-only reservation before transmission. A timeout, crash, uncertain response or unusable HTTP 200 consumes the attempt; no retries, resets, refunds or substitutions.

Capture only allowlisted private evidence. Require one unique complete SFR record with a nonempty RentCast ID and compatible Kern/CA address/type, then use unchanged exact APN9 or Rule C reconciliation. Do not infer ATN equivalence, compute APN9, strip zeros, or treat address similarity as canonical identity. Stop even on success.

## 8. Required outcomes and reports

Create concise, sanitized reports:

- `docs/PI_RENTCAST_STAGE_A_FINAL_PREFLIGHT.md`
- `docs/PI_RENTCAST_STAGE_A_FINAL_PREFLIGHT_QA.md`

Private exact evidence/approval/ledger/receipt must remain gitignored. Report exact certification version, reviewed evidence categories, authorization status, total requests, attempt consumption, reconciliation result, monetary reserve, and protected-file preservation. If new reports themselves affect membership, handle them as exact approved paths in the successor design rather than bypassing checks.

Final Codex response:

```text
PI RENTCAST STAGE A — FINAL PREFLIGHT / CONTROLLED EXECUTION
Original protected certification preserved: PASS / FAIL
Versioned membership successor: CERTIFIED / BLOCKED
Account and Property Records entitlement: VERIFIED / BLOCKED
Rights/terms human review: VERIFIED / BLOCKED
Endpoint/tax/other charges bounded: VERIFIED / BLOCKED
$1.00 user spending ceiling: AUTHORIZED
Exact request-bound execution authorization: VERIFIED / PENDING
Source/shortlist integrity: PASS / FAIL
Preflight: PASS / BLOCKED
Stage A transmitted requests: 0 / 1
Stage A reservation: NONE / CONSUMED
HTTP result: NOT ATTEMPTED / [safe status]
Historical identity reconciliation: NOT EXECUTED / PASS / EXCEPTION
Actual provider invoice: UNKNOWN unless independently checked
Tests: X/X; skipped: 0
Unexpected protected changes: 0
Database operations / Properties / real financial analyses: 0 / 0 / 0
Stage B/C / MLS / deployment: 0 / 0 / 0
Final classification: STAGE_A_DISCOVERY_ACCEPTED_FOR_REVIEW / STAGE_A_IDENTITY_EXCEPTION / STAGE_A_PROVIDER_FAILURE / STAGE_A_PREFLIGHT_BLOCKED
```

**MANDATORY STOP:** Do not proceed beyond one Stage A request. If any source, account, fee, membership, credential or approval gate remains unresolved, do not transmit; report only the narrow remaining blockers. No new general identity, financial, reporting or monitoring subsystem.
