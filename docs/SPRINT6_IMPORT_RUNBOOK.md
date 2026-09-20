# Sprint 6 Kern Import Runbook

The source authority is the checked-in file `data/raw/kern_power_to_sell_2026-09-15.csv`. The current audit found 11,321 data rows, 11,316 unique normalized ATNs, 0 malformed rows, 0 exact duplicate rows and no address/APN fields. SHA-256: `89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3`.

## Gate order

1. Run `npm run kern:audit` and review `docs/SPRINT6_KERN_SOURCE_AUDIT.md`.
2. Run `npm run kern:import:dry-run`. It writes a sanitized reconciliation manifest and performs no database write or provider call.
3. Stop if filename, hash, count, columns or rejected rows differ unexpectedly.
4. Apply migration 003 exactly once with the provider-neutral migration runner. Never rerun 001 or 002.
5. Run `npm run db:schema:qa`.
6. Run `npm run kern:import`. The importer requires a matching dry-run manifest, uses parameterized batched SQL in one transaction, preserves raw/normalized records, and is hash/idempotency protected.
7. Run `npm run kern:import:status` and the non-destructive persistence QA.

The importer never calls RentCast. Repeating the same source hash returns the existing source edition and rows. No destructive reset/truncate operation is used. A source record is immutable; candidate status/reviews are append-audited operational changes.
