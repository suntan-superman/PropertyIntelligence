# Sprint 6.3.3 QA

## Current gate

Implementation, isolated migration certification, production schema
certification, and rollback-only synthetic QA are complete. Migration 006 is
applied exactly once. The single authorized 3484 Haven Opportunity↔Property
lineage is applied and certified. No other linkage mutation is authorized.

Required checks:

- schema audit documents why `resolved_property_id` alone is insufficient;
- migration 006 is additive and contains restrictive FKs, active uniqueness, idempotency, immutable-history guard, RLS and grants boundary;
- exact candidate context is required for Opportunity-originated Save Property;
- same candidate/same Property replay is idempotent;
- same candidate/different Property and different candidate/same Property stop;
- address-resolution and Assessor references must belong to the candidate;
- canonical address and saved Property normalized identity must agree;
- lifecycle derives from durable links/address/Deal facts and never changes screening values;
- Open Property is a read-only durable GET with no provider call;
- 3484 Haven reconciliation is the single explicitly authorized link;
- provider calls remain RentCast `0`, Google `0`, county `0`.

The applicable retained Sprint 1–6.2 regression/security suites were run. No
migration, provider call, evidence refresh, or Deal creation is part of this
gate.

## Deploy-preview certification

`PREVIEW CERTIFIED — OPPORTUNITY → PROPERTY DURABLE LINEAGE OPERATIONAL`

- Deploy: `6ab56dd27c58cb6af69e68da`
- URL: `https://6ab56dd27c58cb6af69e68da--worksidepropertyintelligence.netlify.app`
- Health: Netlify runtime with PostgreSQL persistence and durable sessions: PASS
- 3484 Haven API lifecycle: `PROPERTY_SAVED`; linkage: `PROPERTY_LINKED`
- Open Property: PASS; durable 3484 Haven evidence reopened with 15 comps;
  evidence fingerprint unchanged
- Total/active lineage rows remained `1`; no other candidate/property link
- Representative unlinked candidate remained `NEEDS_ADDRESS` / `NOT_LINKED`
- Opportunity list/detail/metrics response allowlist/privacy scan: PASS
- Provider calls: RentCast `0`, Google `0`, county `0`; Supabase reads reported
  separately
- No migration, linkage mutation, address mutation, Assessor import, Deal
  creation, or provider action occurred during preview certification.

## Results

- `npm run sprint6.3.3:test`: PASS (3)
- `npm run sprint6.3.1:test`: PASS (4)
- `npm test`: PASS (128)
- `npm run web:build`: PASS
- `npm run web:test`: PASS (12 checks)
- Sprint 6.3 UI QA: PASS (6 checks)
- Investment report fixtures: PASS (19 tests; 15 PDF fixtures)
- MAO QA: PASS; provider calls 0
- Maps QA: PASS
- Netlify/runtime QA: PASS (18 tests)
- Runtime security QA: PASS; provider calls 0
- pre-migration `npm run db:status`: PASS, exactly `006_opportunity_property_links.sql` pending;
  post-migration status: PASS, no pending migrations
- 3484 Haven reconciliation apply: PASS; one ACTIVE lineage row, replay
  idempotent, protected fingerprints unchanged, provider calls 0

Migration gate results:

- isolated 001–006 PostgreSQL rebuild: PASS; temporary schema removed;
  public namespace unchanged;
- production `db:migrate`: PASS; 006 applied once, no pending migrations;
- production lineage schema certification: PASS; initial rows 0;
- production synthetic rollback QA: PASS; all link/conflict/idempotency,
  coherence, FK, immutable-history, lifecycle, and preservation checks passed;
- pre-write 3484 dry-run: PASS; active links 0; planned insert 1; writes 0;
  post-write read-only dry-run: PASS; exact active link present.

Preview deploy `6ab56dd27c58cb6af69e68da` was promoted to production and
read-only production certification passed. No further development is authorized
in this gate.
