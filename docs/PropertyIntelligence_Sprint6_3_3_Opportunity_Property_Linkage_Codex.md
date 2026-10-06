# Property Intelligence — Sprint 6.3.3
## Opportunity → Property Durable Linkage & Lifecycle State

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**Baseline:** Sprint 6.3.2 production-certified + Sprint 6.3.1 canonical addresses
**Scope:** narrow lineage/state patch

## Mission
Close the gap discovered in the first real workflow: 3484 Haven St received an analyst-confirmed canonical address, live Property analysis, and a successful durable Save Property, yet Opportunities still displays `Needs Address` and `Not linked`.

Required chain:
`Opportunity -> Canonical Address -> Property Analysis -> Saved Property -> durable Opportunity↔Property link -> future Deal/Decision lineage`.

Do not change screening, valuation, county evidence, MAO or provider evidence.

## Hard boundaries
Allowed: deterministic candidate↔Property linkage; workflow-origin context; lifecycle derivation; Open Property; idempotency/conflict guards; separately gated one-record reconciliation for the already-saved 3484 Haven workflow; additive migration 006 only if existing schema cannot safely represent the relationship.

Forbidden: new provider calls; evidence refresh; changing $353K AVM/range/comps; kern-screen-v1 changes; Assessor/county mutation; fuzzy address/owner linking; bulk historical linking; automatic Deal creation; MAO/title/lien/mortgage inference; historical snapshot rewrites.

Automated QA: RentCast 0, Google 0, county 0.

## Schema audit first
Before creating 006, inspect existing schema/repositories for a safe durable `opportunity_candidate_id ↔ property_id` relationship with correct uniqueness, provenance, history and FK semantics. Reuse it if appropriate. Otherwise create additive migration 006. Document decision in `docs/SPRINT6_3_3_LINEAGE_MODEL.md`. Do not force a migration.

## Preferred link model if needed
Dedicated `opportunity_property_links` conceptually:
`id, candidate_id FK, property_id FK, address_resolution_id nullable FK, assessor_enrichment_id nullable FK, origin, link_method, link_status, created_at, superseded_at nullable, created_by_context nullable, idempotency_key nullable`.

Origin `OPPORTUNITY_ANALYSIS_WORKFLOW`; method `EXPLICIT_WORKFLOW_CONTEXT`; status ACTIVE/SUPERSEDED/CONFLICT as needed.

Restrictive FKs; one active Property per Opportunity. Do not silently link one Property to unrelated Opportunities.

## Identity authority
Never link by formatted/fuzzy address, city/ZIP, owner name, approximate APN, coordinates, AVM or comps.

The normal workflow knows exact `candidate_id`. Carry that exact lineage:
`candidate_id -> address resolution -> Analyze Property -> analysis/session context -> Save Property`.

Also retain references to active address-resolution/Assessor evidence where useful. ATN/APN are evidence context, not sole linking authority.

Do not rely only on browser memory or trust arbitrary client candidate IDs without server-side coherence validation.

## Save Property semantics
When Save Property originates from an Opportunity:
1 validate/save Property as today;
2 reuse idempotent Property if applicable;
3 validate origin candidate context;
4 create/reuse candidate↔Property link transactionally where practical;
5 return Property + linkage result.

Outcomes:
- new Property/new link: success;
- existing idempotent Property/missing link: create link;
- same Property/same link: idempotent success;
- candidate linked to different Property: `OPPORTUNITY_PROPERTY_CONFLICT`;
- Property linked to different unrelated candidate: STOP.

Clearly report partial failure if transaction architecture cannot make save+link atomic.

## Lifecycle must be derived, not screening mutation
Keep High/Medium/Low and score independent.

Derive workflow lifecycle from durable facts, with precedence:
1 `DEAL_CREATED` if durable linked Deal exists;
2 `PROPERTY_SAVED` if active linked Property exists;
3 `ADDRESS_RESOLVED` if active confirmed canonical address exists;
4 `NEEDS_ADDRESS` if no provider-ready address;
5 `DISCOVERED` fallback.

Do not invent an analyzed-unsaved state from ephemeral memory.

Fix contradiction: canonical address present must never display `Needs Address`.

Linkage display:
- Not linked
- Property linked
- Property + Deal linked

## Opportunities UI
Keep table compact. Candidate Status uses derived lifecycle. Add `Open Property` when linked; keep View and Analyze. No provider call from Open Property.

Detail drawer Linkage section should show Canonical Address, Property, Property Evidence and Deal states plus Open Property when linked.

`Open Property` loads existing saved durable evidence exactly like Saved Properties. It must not refresh RentCast, create provenance, substitute unrelated latest evidence or create a new Property.

## Future Deal lineage
Audit current Property→Deal relationship. Derive Opportunity Deal status transitively if safe. Do not add redundant Opportunity↔Deal schema unless required. No Deal creation in this sprint.

## 3484 Haven controlled reconciliation
The first real saved Property must not remain orphaned, but do not bulk-match history.

Create a separately gated reconciliation command requiring explicit candidate ID + property ID and dry-run first, e.g.:
`npm run opportunity:property:reconcile -- --candidate-id <id> --property-id <id> --dry-run`

Only after separate authorization:
`... --apply`

Dry-run must verify:
- canonical address-resolution evidence;
- originating workflow evidence where recoverable;
- compatible ATN/APN/identity context;
- no active conflict;
- no provider call;
- no Property evidence mutation.

Do not hard-code 3484 IDs. STOP with sanitized reconciliation packet before apply.

## Protect 3484 saved evidence
Actual DB is authority; do not refresh/reconstruct evidence merely to link. Expected visible real workflow evidence includes:
3484 Haven St, Rosamond, CA 93560; Single Family; 3 BD/1.5 BA; 1,265 SF; Built 1966; AVM $353,000; range $323,000–$383,000; 15 retained comps.

The displayed ~$117,500 Feb-2025 sale is due-diligence evidence only and out of scope; do not interpret or alter it.

## API/privacy
Extend safe DTO only with minimal derived fields such as `workflowLifecycle`, `propertyLinkStatus`, safe `linkedPropertySummary`, `dealLinkStatus`, `canOpenProperty`. Explicit allowlist only. Never expose raw link/provenance/provider/DB data, owner/contact or filesystem paths.

## Required persistence tests
- create link;
- replay no duplicate;
- same candidate/same property idempotent;
- same candidate/different property conflict;
- different candidate/already-linked property conflict;
- address coherence;
- rollback;
- restrictive FK;
- no score/status/Assessor/address mutation;
- provider calls 0.

## Lifecycle matrix
| Canonical | Property | Deal | Lifecycle |
|---|---|---|---|
| No | No | No | NEEDS_ADDRESS/DISCOVERED per provider-ready rules |
| Yes | No | No | ADDRESS_RESOLVED |
| Yes | Yes | No | PROPERTY_SAVED |
| Yes | Yes | Yes | DEAL_CREATED |

Test complete county situs under existing provider-ready rules, unmatched candidate, stale imported Needs Address not overriding durable canonical state.

## UI tests
Address-resolved/no-property; property-saved; linkage column; Open Property; drawer linkage; filter/page/scroll retention; 1366/390; zero provider calls/mutations.

## Regression
Run Sprint 6.3 population/privacy, 6.3.1 address persistence, 6.3.2 View, Property/Deal persistence, MAO, PDF/reports, maps, Netlify/runtime/security. Automated provider calls 0.

## Migration 006 gate if required
1 create additive 006;
2 isolated real PostgreSQL rebuild 001–006 with established QA schema;
3 certify checksums/FKs/indexes/triggers/RLS/grants;
4 linkage/idempotency/conflict/rollback QA;
5 exact cleanup and prove public unchanged;
6 STOP for production migration authority.

Do not apply 006 without explicit approval.

## Real reconciliation is a separate production-data gate
Required dry-run packet:
candidate safe label/ID; Property safe label/ID; canonical resolution ID/status; candidate ATN/APN9; saved Property identity/address; recoverable origin evidence; current link counts; conflicts; exact rows to insert/update; proof Property evidence unchanged; provider calls 0.

STOP. Do not apply because dry-run matches.

## Deployment gates
If 006 required:
local implementation/tests -> isolated certification -> STOP migration authority -> apply only after approval -> schema certification -> rollback-only synthetic production QA -> fresh preview -> preview linkage/lifecycle/Open Property certification -> STOP production app deploy authority -> production app deploy after approval -> final synthetic/read-only certification -> STOP 3484 reconciliation authority -> apply only explicitly authorized one-record reconciliation -> verify Opportunity linked and Property evidence unchanged -> STOP.

If no migration needed, omit only migration-specific gates; preview, production deployment and real reconciliation remain separate approvals.

## Documentation
Create:
- `docs/SPRINT6_3_3_LINEAGE_MODEL.md`
- `docs/SPRINT6_3_3_RECONCILIATION_RUNBOOK.md`
- `docs/SPRINT6_3_3_QA.md`
- `docs/SPRINT6_3_3_COMPLETION_REPORT.md`

Report schema decision, lineage flow, lifecycle rules, conflict/idempotency semantics, DTO/UI changes, provider accounting, regressions, deployment status, and 3484 dry-run reconciliation packet.

## Acceptance
GO only if:
- exact workflow origin creates durable candidate↔Property lineage;
- no fuzzy linking;
- canonical address no longer displays Needs Address;
- saved linked Property displays Property Saved/linked;
- Open Property reopens existing evidence with zero provider call;
- screening score/priority unchanged;
- Assessor/county/address evidence unchanged;
- historical snapshots unchanged;
- privacy holds;
- tests/regressions pass;
- 3484 reconciliation remains dry-run only until separately authorized.

## Final principle
**Discovery, address resolution, independent evidence and underwriting must remain connected by durable provenance.**

The system should always be able to answer: “Which Opportunity produced this Property?” and “Which saved Property belongs to this Opportunity?” without guessing from an address string.

**Do not create a Deal for 3484 Haven. STOP at the first required authority gate and return the reconciliation dry-run separately before any real linkage mutation.**
