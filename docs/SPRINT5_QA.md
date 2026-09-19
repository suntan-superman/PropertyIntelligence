# Sprint 5 QA gates

`npm run mao:test` covers all three hurdles, exact cent boundaries, fixed and percentage costs, daily/monthly holding costs, explicit zero versus unknown, incomplete/unavailable results, invalid domains, encumbrance separation, exit conflict, rehab sensitivity and deterministic fingerprints with zero provider calls.

Persistence QA must apply migration 002 once after preflight/status, certify all four tables/columns/indexes/checksums, and verify immutable decisions, old-decision reopening, encumbrance/condition history, idempotency, rollback, separate connections and archive behavior without reset/truncate.

Preview QA uses a unique tag, a cold/unknown session key, separate HTTP invocations, two immutable analysis/decision snapshots, linked evidence and all retained comps, idempotent replay, browser/function/log credential scans and zero RentCast calls. Production requires separate authorization after the preview STOP.
