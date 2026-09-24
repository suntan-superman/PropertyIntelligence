# Sprint 6.3.1 Migration Runbook

Migration `005_candidate_address_resolutions.sql` is additive and was applied exactly once to the production application namespace. Migrations 001–004 were not modified, rerun, or imported.

## Certified isolated gate

`npm run sprint6.3.1:schema:certify` loads the opaque local `DATABASE_URL`, requires an authorized TLS connection, creates a generated `qa_sprint6_3_1_*` schema, sets the search path with parameterized `set_config`, rebuilds 001–005 there, checks the ledger/checksums, canonical table/index/trigger/constraint/RLS properties, drops only that generated schema, and records no production writes. It does not invoke `db:migrate`.

The certification completed PASS with QA schema `qa_sprint6_3_1_b81a97399d53498c93a903707a5578b0`; cleanup verified. The normal migration runner applied only `005_candidate_address_resolutions.sql` at `2026-09-24T14:53:36.797Z`, checksum `d123cb84e38dca2bffab0559d7fe579bcea612186b37007581ad0a26ac2b29e1`.

Production schema certification passed: all 24 expected columns/types, candidate and optional Assessor FKs with RESTRICT behavior, active-address partial unique index, idempotency/history indexes, certified trigger body, RLS, zero public/anon/authenticated grants, zero policies, and zero canonical rows initially.

Rollback-only synthetic QA passed in one transaction. It verified strict invalid-address rejection, ZIP+4, manual provenance and confirmation, idempotent replay, version-2 supersession with readable version 1, identity conflict STOP, unchanged candidate score/status and Assessor data, then rolled back. Post-rollback canonical rows and synthetic candidates were zero/absent.

## Future production gate

The production schema and application gates are complete. Certified preview `6ab53c8d41d64774dd564fa6` was deployed as production deploy `6ab541f19ad382458783f15c`; health, synthetic canonical-address persistence/versioning, read-only population/privacy, and 1366px/390px resolver QA passed. Canonical rows returned to zero after exact synthetic cleanup. Do not reset, truncate, import Assessor data, create real canonical addresses, make provider calls, rerun migrations, or begin Sprint 6.4. Stop after certification.
