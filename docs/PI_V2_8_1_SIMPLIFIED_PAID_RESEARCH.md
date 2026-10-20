# PI V2.8.1 — Simplified Paid Research Workflow

## Root cause

The V2.8 production adapter reused a compliance-oriented reservation model as an ordinary user authorization mechanism. A deterministic address/operation/day key made every attempt—including a timeout with no reusable provider response—block another attempt until the next UTC day. Daily and monthly estimates were enforced as hard transaction failures. Guided Analysis called the execution endpoint directly, so it could not present the provider, scope, cache availability, or combined maximum estimated charge before transmission. The Lancaster request also used a 15-second provider timeout.

## Correction

- Added a server-issued, organization- and user-bound research quote with a ten-minute lifetime.
- Added the shared **Approve & Research** dialog to property research and comparable-sales research.
- The dialog identifies RentCast, the normalized address, every approved operation, retained/cache availability, new request count, combined maximum estimated charge, warnings, and zero automatic retries.
- Replaced deterministic daily reservations with random request records plus an expiring in-flight lock for the same normalized address and operation set.
- Added a one-use idempotency key to prevent double-click execution.
- Preserved successful retained/cache reuse; an explicit refresh creates a new disclosed quote.
- Changed daily, monthly, and per-workflow spending thresholds to warnings. A short per-minute rate limit remains server-side.
- Failed requests preserve their request/audit record, release the in-flight lock, and permit an immediate new quote. The retry dialog states that the prior billing status may be unknown.
- Configured the RentCast timeout through `PI_RENTCAST_TIMEOUT_MS` (default and maximum 18,000 ms). With the existing maximum three-call workflow and no automatic retries, this stays within Netlify's 60-second synchronous-function limit while allowing more time than the prior Lancaster attempt.
- Kept provider credentials, Firebase session checks, Administrator/organization authorization, immutable provider responses, evidence provenance, and preliminary-evidence boundaries server-side.

Historical `providerResearchReservations` records are retained for audit and retry disclosure. New attempts use `providerResearchRequests`, `providerResearchApprovals`, and `providerResearchLocks`; no historical record is deleted or rewritten.

## Firestore records

- `organizations/{organizationId}/providerResearchApprovals/{approvalId}` — pending/in-flight/complete one-use confirmation and disclosed scope.
- `organizations/{organizationId}/providerResearchRequests/{requestId}` — provider attempt, estimated cost, outcome, and billing classification.
- `organizations/{organizationId}/providerResearchLocks/{operationSetHash}` — short-lived in-flight duplicate protection only.
- Existing cache indexes, immutable responses, retained evidence, and audit records remain unchanged.

## Verification

Focused automated coverage verifies authenticated quoting, role and tenant denial, single-use approval, retained evidence at zero charge, no automatic retry, immediate manual retry after a mocked timeout, in-flight release, immutable persistence handoff, address validation, and Guided Analysis snapshot rebinding. Automated production verification must open and cancel the dialog only; it must never select **Approve & Research** or issue a RentCast request.

The Lancaster production UI is the normal acceptance path. No JSON authorization file, operator token, dashboard screenshot, password reentry, acceptance script, midnight wait, or developer approval is part of the user workflow.

