# Sprint 6.3.3 Completion Report

## Status

`PRODUCTION CERTIFIED — OPPORTUNITY → PROPERTY DURABLE LINEAGE OPERATIONAL`

The authorized migration and schema gates passed. Migration 006 was applied
exactly once. The single explicitly authorized 3484 Haven Opportunity ↔
Property lineage was applied and independently certified. A fresh Netlify
deploy preview was certified against the durable PostgreSQL state and the exact
certified deploy was then promoted to production. No evidence was refreshed, no
Deal was created, and no provider call was made.

## Migration and schema certification

- Migration: `006_opportunity_property_links.sql`
- SHA-256: `00d0402c5506f0a62b36e208ffbae67017da0287ecf785136715e7aec0c082b6`
- Production migration timestamp: `2026-09-24T18:16:22.025Z`
- Migrations 001–006: present with certified checksums
- Pending migrations: none
- TLS: verified (`TLSv1.3`)
- Production lineage rows after migration: `0`

Isolated certification artifact:
`data/validation/sprint6_3_3-isolated-schema-certification.json`

The temporary PostgreSQL schema rebuilt migrations 001–006 and certified the
ledger, columns, restrictive FKs, active-candidate and active-Property unique
indexes, idempotency index, immutable supersession trigger, RLS, grants, and
policies. Its transaction was rolled back and the QA schema was removed. The
public fingerprint before and after isolated certification was identical.

Production certification artifact:
`data/validation/sprint6_3_3-production-certification.json`

Production schema checks passed:

- expected 12 columns and UUID/text/timestamp types;
- 4 restrictive FKs to candidate, Property, canonical address, and Assessor;
- 5 expected indexes;
- certified trigger body;
- RLS enabled;
- no public/anon/authenticated grants or policies;
- initial lineage row count `0`;
- existing application data fingerprints unchanged.

## Rollback-only production QA

Synthetic tag: `SPRINT6_3_3_LINK_QA_1790273917174`

All synthetic rows were created inside one transaction and rolled back. Passed:

- exact candidate → Property link;
- same-candidate/same-Property idempotent replay;
- same-candidate/different-Property conflict;
- different-candidate/same-Property conflict;
- candidate/address and candidate/Assessor coherence;
- exact normalized-address compatibility;
- restrictive FK behavior;
- immutable history and supersession (2 historical, 1 active);
- lifecycle states `NEEDS_ADDRESS`, `DISCOVERED`, `ADDRESS_RESOLVED`,
  `PROPERTY_SAVED`, and `DEAL_CREATED`;
- screening score, priority, status, Property evidence, Assessor evidence, and
  canonical-address evidence unchanged;
- post-rollback lineage rows `0`, synthetic rows absent, 3484 unlinked.

Provider accounting: RentCast `0`, Google `0`, county `0`.

## Regression and security verification

- `npm run db:status`: PASS; migrations 001–006 applied, no pending migrations
- `npm run sprint6.3.3:test`: PASS (3)
- `npm test`: PASS (128)
- `npm run web:build`: PASS
- `npm run web:test`: PASS (12 checks)
- `npm run netlify:test`: PASS (18)
- runtime security scan: PASS; browser/function artifacts and logs contained no
  credentials; provider calls 0

The existing Sprint 6.3 population, screening, evidence, and canonical-address
fingerprints remained unchanged through migration and rollback QA.

## Refreshed 3484 Haven dry-run

Artifact:
`data/validation/sprint6_3_3-reconciliation-dry-run.json`

The read-only packet identifies the same authorized records and, after the
authorized commit, shows the retained active lineage row:

- Candidate `01a98c28-a14b-4c60-ab10-581684c99389` (`ATN:25109130001`);
- Property `37cb8526-c1e7-4896-8525-a9cdb82f370b`;
- canonical resolution `b6f69e57-071c-4029-8eef-c22435e4875e`, analyst-confirmed v1;
- Assessor enrichment `943aa186-9598-4735-aa91-5763dbc1356a`, APN9 `251091302`;
- exact normalized-address match: PASS;
- candidate/property conflict: none;
- active lineage links after commit: `1` (the authorized row below);
- Property evidence rows: `1`, metadata fingerprint unchanged;
- planned insert: exactly `1` ACTIVE `EXPLICIT_WORKFLOW_CONTEXT` link;
- writes performed: `0`.

The apply command reran this packet immediately before its transaction. That
pre-write execution reported `schemaLinkTablePresent: true`,
`plannedOperation: INSERT_ACTIVE_EXPLICIT_WORKFLOW_LINK`, and zero active links.
The post-write read-only packet reports the exact active lineage row and no
additional write is required.

## Authorized 3484 Haven reconciliation apply

Artifact: `data/validation/sprint6_3_3-reconciliation-apply.json`

- Lineage row: `2ce14477-ab18-4391-ad2a-8347cc000a15`
- Write timestamp: `2026-09-24T18:26:02.771Z`
- Candidate: `01a98c28-a14b-4c60-ab10-581684c99389` (ATN `25109130001`)
- Property: `37cb8526-c1e7-4896-8525-a9cdb82f370b`
- Canonical resolution: `b6f69e57-071c-4029-8eef-c22435e4875e`
- Assessor enrichment: `943aa186-9598-4735-aa91-5763dbc1356a` (APN9 `251091302`)
- Origin/method/status: `OPPORTUNITY_ANALYSIS_WORKFLOW` /
  `EXPLICIT_WORKFLOW_CONTEXT` / `ACTIVE`
- Post-write totals: 1 lineage row, 1 active candidate link, 1 active Property link
- Reopen boundary: PASS through a newly constructed database pool/connection;
  exact identities, status, and protected fingerprints matched
- Idempotent replay: PASS; 0 additional rows, 0 supersessions
- Derived lifecycle: `PROPERTY_SAVED`; Property link status `PROPERTY_LINKED`
- Property/evidence preservation fingerprint: `3fb5a5968cd7fe6cdedb7928bfd44444ccd6bb87dcfbdcc095944cf477745a8b`
- Candidate, canonical, Assessor and Property fingerprints were unchanged;
  candidate score/status and `kern-screen-v1` remained unchanged.
- Provider calls: RentCast `0`, Google `0`, county `0` (Supabase traffic was
  database traffic and is not counted as provider calls).

The first post-commit verifier invocation returned a harness-only lifecycle
lookup error because it searched the API list by UUID while that endpoint's
search contract is ATN/candidate-key based. It performed no additional write;
the corrected verifier was rerun through a separate pool and passed all gates.

## Baseline preservation

The certified Kern population remains `11,316` candidates from `11,321` source
records with priorities `312 / 701 / 10,303`. Assessor observations remain
`11,263` exact and `53` unmatched. The 3484 Property/evidence fingerprint,
canonical address, Assessor row, candidate score/status, and `kern-screen-v1`
values remain unchanged.

## Deploy-preview and runtime certification

Artifact: `data/validation/sprint6_3_3-preview-certification.json`

- Deploy ID: `6ab56dd27c58cb6af69e68da`
- Preview URL: https://6ab56dd27c58cb6af69e68da--worksidepropertyintelligence.netlify.app
- Health: PASS — Netlify runtime, PostgreSQL configured/available, durable
  sessions available; no migration or provisioning action occurred
- Production lineage after preview reads: exactly 1 active row,
  `2ce14477-ab18-4391-ad2a-8347cc000a15`; no other candidate/Property link
- Deployed 3484 Haven Opportunity: `PROPERTY_SAVED` / `PROPERTY_LINKED`, with
  the analyst-confirmed canonical address and exact linked Property
- Open Property: PASS — `3484 Haven St, Rosamond, CA 93560`; Single Family,
  3 BD / 1.5 BA, 1,265 SF, built 1966, AVM `$353,000`, range
  `$323,000–$383,000`, 15 retained comps
- Property/evidence fingerprint: `3fb5a5968cd7fe6cdedb7928bfd44444ccd6bb87dcfbdcc095944cf477745a8b`
- Representative unlinked candidate remained `NEEDS_ADDRESS` / `NOT_LINKED`;
  no unrelated candidate was shown as Property linked
- Population reconciliation: 11,316 candidates; 11,263 exact / 53 unmatched;
  312 High / 701 Medium / 10,303 Low; High Residential 118; High SFR 81,
  all 81 with county situs
- Opportunity list/detail/metrics privacy scan: PASS; responses exposed only
  allowlisted opportunity, derived linkage, and safe summary fields
- UI route: PASS (HTTP 200); deployed API list/detail and Open Property reads
  returned 200. Reads created no Property, evidence, provenance, or linkage
  records.
- Provider calls: RentCast `0`, Google `0`, county `0`; Supabase read traffic
  occurred as expected and is not counted as provider traffic
- Regression: Sprint 6.3.3 tests PASS (3), retained foundation tests PASS (128),
  Netlify/runtime tests PASS (18)

## Production application certification

Artifact: `data/validation/sprint6_3_3-production-certification.json`

- Production deploy: `6ab56dd27c58cb6af69e68da` (the exact certified preview
  deploy promoted without a rebuild)
- Production URL: https://worksidepropertyintelligence.netlify.app
- Health: PASS — `runtime: netlify`, PostgreSQL configured/available, durable
  sessions available
- Migrations 001–006: unchanged, all applied, no pending migrations; no
  migration command ran during deployment
- Production lineage: exactly 1 active row,
  `2ce14477-ab18-4391-ad2a-8347cc000a15`; no other link
- 3484 Haven: `PROPERTY_SAVED` / `PROPERTY_LINKED`; canonical address linked;
  imported screening state remains `NEEDS_ADDRESS`, score `55`, and High Review
  priority (workflow lifecycle is derived and does not rewrite screening)
- Open Property: PASS — 3484 Haven durable Property reopened with Single Family,
  3 BD / 1.5 BA, 1,265 SF, built 1966, AVM `$353,000`, range
  `$323,000–$383,000`, and 15 retained comps
- Evidence fingerprint unchanged:
  `3fb5a5968cd7fe6cdedb7928bfd44444ccd6bb87dcfbdcc095944cf477745a8b`
- Population: 11,316 candidates; 11,263 exact / 53 unmatched; priorities
  312 / 701 / 10,303; High Residential 118; High SFR 81; all 81 with situs
- Production list/detail/metrics privacy allowlist: PASS; no raw lineage,
  provenance, provider, owner/contact, database, or filesystem fields exposed
- Browser credential scan: PASS
- Production UI route: HTTP 200; representative unlinked candidate remained
  `NEEDS_ADDRESS` / `NOT_LINKED`
- Mutations during certification: no migration, linkage, Assessor import,
  address mutation, evidence refresh, Property creation, or Deal creation
- Provider calls: RentCast `0`, Google `0`, county `0`; Supabase read traffic
  occurred as expected and is reported separately
- Regression: Sprint 6.3.3 tests PASS (3), foundation tests PASS (128), and
  Netlify/runtime tests PASS (18)

## Mandatory stop boundary

Do not create a Deal, refresh evidence, link any other candidate/Property pair,
call a provider, or begin another sprint. Production certification is complete.
