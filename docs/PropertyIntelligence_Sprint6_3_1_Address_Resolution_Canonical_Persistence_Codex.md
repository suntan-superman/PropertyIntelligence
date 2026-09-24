# Property Intelligence — Sprint 6.3.1
## Address Resolution & Canonical Address Persistence

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**Baseline:** Sprint 6.3 production-certified
**Scope:** small address-resolution/persistence patch

## Mission
Allow an analyst to convert incomplete Kern county situs evidence into a separately persisted, explicitly confirmed canonical address and reuse it for future Analyze Property actions.

Example:
- County situs: `1240 S CHINA LAKE BL, RIDGECREST, CA`
- Canonical: `1240 S China Lake Blvd, Ridgecrest, CA 93555`

Never overwrite/correct Kern `situs_raw`. County situs and canonical address are separate evidence objects.

## Preserve
Keep exact Sprint 6.3 populations, `kern-screen-v1`, privacy DTOs, Assessor evidence, MAO/report semantics and explicit provider confirmation. Do NOT weaken `ADDRESS_INVALID`: provider analysis still requires street, city, two-letter state and ZIP.

Also include the already identified UX correction: failed Analyze actions stay on Opportunities with the error visible; Overview opens only after a valid analysis model is returned.

## Hard boundaries
Allowed: additive migration 005; immutable/versioned canonical-address persistence; manual entry/confirmation; resolved/unresolved UI status; Analyze reuse; explicit edit/supersession; failed-navigation fix.

Forbidden: modifying Kern situs; ZIP inference; bulk geocoding; automatic Google/RentCast calls; KIPS/history work; scoring changes; owner/contact enrichment; MAO/report changes; rerunning migration 004 or Sprint 6.3 import; automatic Property creation from incomplete situs.

Automated QA provider calls = 0.

## Migration 005
Create `005_candidate_address_resolutions.sql`; never modify 001–004.

Create `candidate_address_resolutions` with conceptually:
`id, candidate_id FK, county_enrichment_id nullable FK, county_situs_raw nullable, street, city, state, postal_code, postal_code_extension nullable, formatted_address, resolution_source, resolution_method, verification_status, provider_name nullable, provider_place_id nullable, provider_payload_fingerprint nullable, analyst_confirmed, confirmed_at nullable, created_at, superseded_at nullable, created_by_context nullable, notes nullable, version, idempotency_key nullable`.

No raw third-party response blobs. One active canonical address per candidate via partial unique constraint/index. Corrections create new immutable versions and supersede old ones.

## Provenance
Suggested source:
`ANALYST`, `ADDRESS_PROVIDER`, `EXISTING_PROPERTY_RECORD`, `OTHER_VERIFIED_SOURCE`.

Suggested method:
`MANUAL_EXTERNAL_LOOKUP`, `MANUAL_DOCUMENT_REVIEW`, `PROVIDER_SUGGESTION_CONFIRMED`, `EXISTING_CANONICAL_MATCH`.

For Stan manually checking Google Maps then typing:
`ANALYST / MANUAL_EXTERNAL_LOOKUP / analyst_confirmed=true`.
Do not call that `GOOGLE_VERIFIED`.

Statuses:
`ANALYST_CONFIRMED`, `PROVIDER_CONFIRMED`, `EXISTING_PROPERTY_CONFIRMED`, `SUPERSEDED`.

Only active confirmed addresses satisfy canonical provider-ready status.

## Server validation
One shared server validator for persistence + Analyze:
- nonblank street/city;
- exactly two-letter US state;
- ZIP-5 required;
- ZIP+4 optional;
- normalized whitespace;
- reject malformed/control characters;
- no silent city/state/ZIP inference.

Preserve entered components plus normalized formatted address.

## Manual resolution UX
If Analyze is clicked without provider-ready canonical address, do not call RentCast. Open:

```text
Complete Property Address

County situs
1240 S CHINA LAKE BL, RIDGECREST, CA

Street [1240 S China Lake Blvd]
City   [Ridgecrest]
State  [CA]
ZIP    [     ]

[ ] I have verified this is the correct property.

[Cancel] [Save Address] [Save & Analyze]
```

County situs read-only. Prefill only safely parsed county fields. Never infer ZIP.

`Save Address`: persist, zero provider calls.
`Save & Analyze`: validate + require analyst confirmation + persist/reuse canonical address, then show existing provider-cost/analysis confirmation. Only explicit confirmation may invoke existing live workflow. Canceling provider confirmation leaves canonical address saved.

## Existing resolved candidate
List/detail status:
- Address resolved
- County situs only
- Address unresolved

Candidate header may prefer confirmed canonical address, labeled `Canonical address · Analyst confirmed`. Assessor Evidence still shows original `County Situs`.

Provide `Edit resolved address`; correction creates a new version and preserves old. Never rewrite historical Analysis/Decision/report identity.

If a durable linked Property conflicts with a proposed correction, STOP with `ADDRESS_CONFLICT`; do not fuzzy merge.

## Address precedence
1. active confirmed canonical address resolution;
2. exact existing linked canonical Property address where certified;
3. county situs only if it already satisfies the full provider-ready contract;
4. otherwise resolution UI.

Never silently fall back to incomplete situs after canonical resolution exists. Tag which source was submitted to analysis.

## Optional automated resolver
Manual persistence is REQUIRED; automated resolution is NOT required for 6.3.1.

A future adapter may expose `resolveAddressSuggestion(...)` behind an explicit `Find address` action. Never background/bulk resolve; provider suggestion always requires analyst confirmation.

Do not assume the existing browser-visible Google Maps key authorizes Geocoding/Places server workflows, billing, retention or key restrictions. If not already clearly supported, defer automation.

## API
Add narrow allowlisted DTO endpoints/actions, e.g.:
- GET `/api/opportunities/:id/address-resolution`
- POST `/api/opportunities/:id/address-resolution`
- controlled edit/supersede action

Never return raw provider payload, DB internals, owner/contact or filesystem paths. Extend Sprint 6.3 hostile-future-key privacy tests.

## Idempotency
Identical save + same idempotency key creates no duplicate active version. UI/network retries of Save & Analyze must not duplicate address rows. Address persistence and provider analysis are separate operations.

## Failure semantics
- `ADDRESS_INCOMPLETE`: stay Opportunities, open/show resolver.
- `ADDRESS_INVALID`: stay Opportunities, component error.
- `ADDRESS_CONFLICT`: stop, identity review.
- `ADDRESS_SAVE_FAILED`: no provider call.
- `ANALYSIS_CONFIRMATION_REQUIRED`: saved address remains; no provider call yet.
- provider failure: visible error; preserve valid canonical address.

Never navigate to Overview without a valid analysis model.

## Historical integrity
Do not retroactively modify existing Property, Evidence, Analysis, Decision or Report snapshots. New analyses may use the new canonical address under existing persistence semantics.

## Migration certification
Use established isolated-schema mechanism:
1. audit 005;
2. real PostgreSQL isolated rebuild 001–005;
3. certify ledger/checksums/tables/indexes/FKs/triggers/RLS/grants;
4. test versioning/idempotency/conflict/rollback;
5. exact QA-schema cleanup;
6. prove public unchanged;
7. STOP for production migration authority.

No Docker/local PostgreSQL. Do not modify 001–004.

## Required tests
- complete manual address accepted;
- missing ZIP/street rejected;
- invalid state rejected;
- ZIP+4 accepted;
- county situs unchanged;
- no ZIP inference;
- analyst confirmation required;
- Save Address = zero provider calls;
- Save & Analyze canceled after save leaves address persisted;
- failed analysis stays Opportunities;
- Overview only after valid model;
- identical save idempotent;
- edit creates superseding immutable version;
- historical version readable;
- Property identity conflict stops;
- address precedence;
- privacy allowlist + hostile nested future keys;
- no raw provider payload persisted/returned;
- no candidate score/status or Assessor-row mutation;
- Sprint 6.3 11,316/11,263/53/312/118/81 populations unchanged.

Run existing Property/persistence/MAO/PDF/maps/runtime/security regressions.

## Visual QA
At 1366 and 390 px inspect incomplete situs, resolver, validation, confirmation, saved canonical address, county-vs-canonical distinction, edit flow, canceled Analyze, and successful navigation only after a valid model. No blank Overview.

## Deployment gates
1. protect Sprint 6.3 baseline;
2. implement 005 + persistence/API/UI;
3. include failed-navigation correction;
4. tests/UI/privacy/security/regressions;
5. isolated PG 001–005 certification;
6. STOP for migration 005 authority;
7. after explicit authority apply 005 exactly once;
8. production schema certification;
9. rollback-only synthetic production persistence QA;
10. fresh preview;
11. preview certify save/reopen/edit/idempotency/privacy with synthetic/approved QA records;
12. confirm RentCast/Google/county calls = 0;
13. STOP for production application deployment review;
14. production deploy only after explicit approval;
15. final read-only/synthetic certification;
16. STOP.

Do not combine migration authority, production data mutation and application deployment into one implicit approval.

## Documentation
Create:
- `docs/SPRINT6_3_1_ADDRESS_MODEL.md`
- `docs/SPRINT6_3_1_MIGRATION_RUNBOOK.md`
- `docs/SPRINT6_3_1_QA.md`
- `docs/SPRINT6_3_1_COMPLETION_REPORT.md`

Report migration checksum/schema, files changed, precedence, county-vs-canonical semantics, workflow, idempotency/versioning, failed-navigation fix, provider accounting, privacy/visual/regression QA, preview/production status and whether automated resolution is deferred.

## Acceptance
GO only if county situs remains immutable; manually confirmed complete canonical address persists with provenance; ZIP is never inferred; future Analyze reuses it; Save Address calls no provider; live analysis remains explicitly confirmed; failed analysis never navigates blank Overview; edits preserve history; old analytical snapshots remain unchanged; privacy holds; scores/statuses unchanged; 005 safely certified; Sprint 6.3 populations unchanged; regressions pass; automated QA provider calls=0.

## Final principle
**Do not make incomplete county evidence look complete.**

Preserve Kern's original situs as county evidence. Add a separate auditable canonical address only after an analyst or explicitly authorized provider resolves it, and preserve exactly how that resolution was obtained.

**STOP at the migration-005 authority gate before any production schema change.**
