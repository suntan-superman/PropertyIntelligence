# Property Intelligence — Sprint 4
## Persistent Property & Deal Intelligence — Netlify Database/PostgreSQL

**Project root:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only; no TypeScript
**Database:** Netlify Database / PostgreSQL
**Access:** `@netlify/database` + direct parameterized SQL
**Migrations:** repository-owned SQL under `netlify/database/migrations/`

## Mission
Make the existing Property Intelligence workflow durable without changing its analytical behavior.

Persist:
- canonical properties;
- immutable provider evidence snapshots;
- valuations and complete retained comp snapshots;
- deals and claims;
- immutable analysis snapshots;
- diligence items;
- groundwork tables for future discovery signals, documents and reports.

Add:
- Save/Open Property;
- Save/Open Deal;
- Saved Properties/Deals;
- Evidence History;
- Analysis History;
- Refresh Evidence -> new snapshot;
- Duplicate Deal Scenario;
- soft Archive.

Provider refreshes and re-analysis must never silently overwrite historical evidence/analysis.

## Hard boundaries
Do NOT add TypeScript, Drizzle, Firebase, MongoDB, auth, multi-user permissions, subscriptions, Monte Carlo, Kern ingestion, title/MLS/Daily Report, document upload, Netlify Blobs, new providers, or new analysis formulas.

Do NOT use the Netlify AI database wizard to invent the schema.

Do NOT expose database credentials to React/browser.

Do NOT mutate protected Fantasia/Bass/Joyce artifacts or historical analytical outputs.

## Database setup
Audit current linked Netlify project first. If repository DB support is not initialized, use the supported Netlify Database CLI initialization, choosing direct SQL rather than Drizzle and declining/removing sample business schema/data.

Install/use `@netlify/database` server-side.

Never commit connection strings.

Use `netlify dev` for local Postgres-compatible development and apply local migrations through the Netlify Database migration workflow.

## Schema principles
- UUID PKs: `uuid DEFAULT gen_random_uuid()`
- `timestamptz`
- foreign keys
- query-critical fields relational; variable/raw provider payloads may use `jsonb`
- soft archive via `archived_at`
- snapshots append-only in normal workflows
- one Property -> many Evidence Snapshots
- one Property -> many Deals
- one Deal -> many Analysis Snapshots
- future Kern signals attach to the same Property
- never assume APN globally unique

## Initial migration
Create a reviewed initial SQL migration. Use consistent timestamp/sequential naming.

### properties
Canonical identity:
`id, normalized_address, address_line1, city, state, postal_code, county, latitude, longitude, property_type, apn, atn nullable, provider_property_id nullable, identity_status, created_at, updated_at, archived_at nullable`.

### property_aliases
`id, property_id FK, alias_type, address_text, normalized_address, source, created_at`.

Preserve analyst input/provider/county/corrected address forms.

### evidence_snapshots
Immutable source observation:
`id, property_id FK, source, source_record_id nullable, retrieved_at, snapshot_type, status, property_payload jsonb, valuation_payload jsonb, tax_payload jsonb, assessment_payload jsonb, sale_history_payload jsonb, features_payload jsonb, legal_payload jsonb, provenance_payload jsonb, raw_reference nullable, created_at`.

### valuations
Queryable observations:
`id, property_id FK, evidence_snapshot_id FK, source, valuation_type, estimated_value nullable, low_value nullable, high_value nullable, effective_at, created_at`.

### comparable_snapshots
`id, property_id FK, evidence_snapshot_id FK, source, created_at`.

### comparables
Preserve every retained comp:
`id, comparable_snapshot_id FK, provider_comp_id nullable, address, latitude, longitude, property_type, status, price nullable, price_label nullable, bedrooms nullable, bathrooms nullable, square_feet nullable, lot_size nullable, year_built nullable, distance_miles nullable, days_on_market nullable, correlation nullable, land_tenure_status nullable, provider_payload jsonb, created_at`.

Never persist only filtered/displayed comps.

### deals
`id, property_id FK, name, deal_status, origin, sponsor_name nullable, created_at, updated_at, archived_at nullable`.

Initial statuses may include `DRAFT, UNDER_REVIEW, ON_HOLD, CLOSED, ARCHIVED`.

### deal_claims
`id, deal_id FK, field_key, value_numeric nullable, value_text nullable, value_json nullable, unit nullable, origin, status, cash_timing nullable, source_description nullable, created_at, superseded_at nullable`.

Preserve unknown vs explicit zero. Acquisition/disposition closing costs remain distinct. Historical analyses must remain explainable.

### analysis_snapshots
Immutable deterministic run:
`id, deal_id FK, property_id FK, evidence_snapshot_id nullable FK, analysis_version, model_fingerprint, created_at, cost_completeness, modeled_proceeds nullable, cash_invested nullable, modeled_profit nullable, cash_on_cash nullable, break_even_sale_price nullable, inputs_payload jsonb, outputs_payload jsonb, warnings_payload jsonb`.

Every explicit re-analysis creates a new row.

### diligence_items
`id, deal_id FK, analysis_snapshot_id nullable FK, category, question_key, question_text, materiality, status, related_fields jsonb, answer_text nullable, resolved_at nullable, created_at, updated_at`.

Statuses initially `UNANSWERED, ANSWERED, RESOLVED, NOT_APPLICABLE`.

### discovery_signals
Future Kern groundwork only:
`id, property_id FK, source, signal_type, source_date nullable, external_identifier nullable, amount_numeric nullable, signal_payload jsonb, provenance_payload jsonb, created_at`.

Do not ingest Kern now.

### documents
Metadata groundwork only:
`id, property_id nullable FK, deal_id nullable FK, document_type, filename, storage_reference nullable, source, status, created_at`.

No upload/storage implementation now.

### reports
Metadata groundwork only:
`id, property_id nullable FK, deal_id nullable FK, analysis_snapshot_id nullable FK, report_type, storage_reference nullable, generated_at nullable, status, created_at`.

## Indexes
Practical indexes:
- normalized property address
- state/county
- APN with jurisdiction context
- evidence by property/retrieved_at desc
- valuation by property/effective_at desc
- deals by property/status
- analyses by deal/created_at desc
- discovery source/type/date
- diligence deal/status

Do not over-index JSONB.

## Persistence architecture
Server-only modules conceptually:
```text
src/persistence/db.js
src/persistence/propertiesRepository.js
src/persistence/evidenceRepository.js
src/persistence/dealsRepository.js
src/persistence/analysisRepository.js
src/persistence/diligenceRepository.js
src/persistence/discoveryRepository.js

src/services/propertyPersistenceService.js
src/services/dealPersistenceService.js
src/services/evidenceSnapshotService.js
src/services/analysisSnapshotService.js
```
Use parameterized SQL only. React never imports DB modules. Shared API handlers call services/repositories. Keep underwriting formulas out of persistence.

## Save Property
Add **Save Property**.

Resolved model -> identity reconciliation -> create/reuse canonical property -> aliases -> immutable evidence snapshot -> valuation -> full retained comp snapshot -> return property/snapshot IDs.

Do not merge merely similar addresses. Ambiguous identity requires analyst confirmation.

If property exists, attach new evidence snapshot rather than duplicate property.

Use a transaction.

## Refresh Property Evidence
For saved property:
- explicit analyst action;
- quota warning;
- existing RentCast adapter;
- existing identity/representation gates;
- new immutable evidence/valuation/comp snapshots;
- old snapshots untouched;
- newest becomes default current view.

Add **Evidence History** showing source, retrieval date, AVM/range, comp count and open action.

Selecting old evidence must not alter it or recompute old deal analyses.

## Save Deal
Save durable property first if needed, then transactionally persist:
- deal;
- current claim set;
- deterministic analysis snapshot;
- generated diligence items;
- evidence snapshot ID used.

Never save deal without durable property identity.

## Deal edits / Analysis History
Editing current claims is allowed with provenance/history sufficient to explain old analyses.

Explicit re-analysis -> new immutable analysis snapshot.

Never update prior analysis outputs.

Add **Analysis History** showing timestamp, key assumptions, modeled profit/CoC and evidence snapshot used.

When viewing old analysis show:
`Historical analysis — values reflect the assumptions and evidence available at that time.`

Never substitute latest AVM into old analysis.

## Duplicate Deal Scenario
Add action that creates a NEW deal ID associated with same property and copies current claims into independent rows. Default name `<original> — Copy`; rename allowed. No shared mutable claims.

## Archive
Soft archive properties/deals via `archived_at`. Default lists exclude archived. Provide include/view archived. No normal hard delete and no cascade destruction of evidence/history.

## Saved Properties
Top navigation:
`Analyze Property | Saved Properties | Saved Deals`

List:
- address
- property type
- county
- latest AVM/range
- latest evidence date
- deal count
- archive status when applicable

Basic address search only. No advanced discovery filtering yet.

## Saved Deals
List:
- deal name
- property address
- status
- latest acquisition/repair/resale claims
- latest modeled profit/CoC
- latest analysis date
- evidence snapshot date used
- archive state

Do not imply latest analysis is verified.

## Open saved records
Open Property uses the SAME existing workbench components: latest/selected evidence, valuation, all comps/map, details, provenance, evidence history, associated deals.

Open Deal uses same Deal Mode: property, evidence used, claims, latest/selected analysis, economics, scenarios, sensitivity, diligence, analysis history.

No separate duplicate UI.

## Snapshot immutability
Normal application repository APIs must not expose substantive UPDATE operations for evidence/analysis snapshots. Insert snapshots; read snapshots.

Tests must prove refreshing evidence/re-analyzing does not alter prior rows.

Administrative corrections are future explicit workflows/migrations, not Sprint 4 UI.

## Transactions
Use transactions for:
- property + evidence + valuation + comps;
- deal + claims + analysis + diligence;
- refresh evidence + valuation + comps.

Failure must roll back partial writes and preserve prior state.

## Idempotency
Protect Save Property, Save Deal, Refresh Evidence and Re-analyze from double-click/retry duplicates with idempotency/request keys or equivalent server-side mechanism. Disabled buttons alone are insufficient.

## API
Extend shared runtime-neutral API handlers, not Netlify-only business logic.

Conceptual endpoints:
```text
GET  /api/properties
POST /api/properties
GET  /api/properties/:id
POST /api/properties/:id/refresh
POST /api/properties/:id/archive

GET  /api/deals
POST /api/deals
GET  /api/deals/:id
POST /api/deals/:id/analyze
POST /api/deals/:id/duplicate
POST /api/deals/:id/archive

GET  /api/properties/:id/evidence
GET  /api/deals/:id/analyses
```
Adapt to existing routing. Validate UUIDs/input. Same security/error rules as Sprint 3.2.

## No authentication yet
This is still an internal analyst POC. Do not invent users/ownership/security rules.

Document clearly that persistence without authentication is not suitable for public multi-user production.

Do not expose mutation endpoints more broadly than existing same-origin internal app architecture requires.

## Local development
Document:
- Netlify CLI/database initialization
- `netlify dev`
- migration creation/application/status/reset for local only
- how to run tests against isolated local DB
- how to avoid touching production accidentally

Create `docs/DATABASE_DEVELOPMENT_RUNBOOK.md`.

## Deployment / migrations
Netlify applies repository migrations during deploy. Migration failure must block deployment rather than leave app/schema drift.

Use backwards-compatible migrations. Never edit/delete an already-applied migration to change production; add a compensating/new migration.

Create `docs/DATABASE_SCHEMA.md` and `docs/SPRINT4_DEPLOYMENT_RUNBOOK.md`.

## Database tests
Prefer an isolated local/test Netlify Postgres database. Tests must not write production.

Cover:
- migrations apply from empty DB
- schema constraints/FKs
- UUIDs
- property save/read
- alias preservation
- evidence snapshot save
- all comps retained
- valuation history
- refresh creates second snapshot, first byte/field unchanged
- deal save/read
- unknown vs explicit zero
- closing-cost timing
- analysis snapshot history
- reanalysis creates new row and preserves first
- diligence persistence
- duplicate deal independent claims
- archive/unarchive visibility
- transaction rollback
- idempotent repeated submission
- ambiguous identity does not persist incorrectly
- SQL injection attempts parameterized/rejected
- browser bundle has no DB credentials
- existing RentCast/Maps/analysis tests remain green

## Existing regressions
Run full existing suites:
- Sprint 3.2 QA
- deal cleanup QA
- map
- UI responsive
- PDF
- runtime
- security
- secret scans
- protected artifact hashes

No real RentCast calls required for persistence regression tests.

Fantasia arithmetic and legacy semantics remain exact.
Bass/Joyce gates remain exact.

## Seed/demo data
Do not seed production with fake sample data.

For local/test DB, sanitized fixtures may be inserted by explicit test/seed commands.

Do not automatically persist the live Mainsail address unless Stan explicitly chooses Save Property in the app after deployment.

## UI persistence indicators
Clearly show:
- `Unsaved session`
- `Saved`
- latest saved timestamp
- `Historical evidence`
- `Historical analysis`

Remove/replace the current warning about per-instance memory once a record is durably saved. Unsaved live analyses should still warn they may be lost.

## POC limits
No document binary storage yet.
No report binary persistence yet.
No notes editor unless trivial and explicitly needed by schema validation.
No advanced SQL analytics dashboard yet.
No Kern import yet.
No Monte Carlo yet.

## Execution order
1. Hash/protect existing artifacts.
2. Audit Netlify DB/repository readiness.
3. Initialize `@netlify/database` direct-SQL workflow if needed.
4. Write/review initial migration.
5. Apply migration to isolated local DB from empty state.
6. Add repository tests.
7. Implement repositories/services.
8. Implement Property persistence.
9. Implement evidence/valuation/comp snapshots/history.
10. Implement Deal/claim persistence.
11. Implement analysis/diligence snapshots/history.
12. Implement idempotency/transactions.
13. Extend shared API.
14. Add Saved Properties/Deals UI.
15. Add Open/History flows.
16. Add Refresh Evidence workflow using mocked provider in automated QA.
17. Add Duplicate/Archive.
18. Run DB tests.
19. Run complete existing regression suite.
20. Test local Netlify runtime + DB.
21. Create a deploy preview/database branch and verify migration/app behavior there before production.
22. Confirm production migration plan.
23. Deploy only after preview passes.
24. Perform remote persistence smoke using one explicitly chosen property/deal.
25. Generate completion report.
26. STOP.

## Acceptance criteria
GO only if:
- database schema is migration-owned in Git;
- migrations rebuild empty DB;
- browser has no DB credentials;
- Save Property survives restart/cold runtime;
- Save Deal survives restart;
- Refresh creates new evidence snapshot without modifying old;
- re-analysis creates new analysis snapshot without modifying old;
- old analysis stays tied to evidence/inputs used at creation;
- all retained comps persist;
- unknown vs explicit zero survives round-trip;
- acquisition/disposition closing timing survives round-trip;
- duplicate scenario has independent claims;
- archive is soft;
- idempotent retries don't duplicate core records/snapshots;
- transactions prevent partial intelligence;
- Saved Properties/Deals reopen through existing workbench;
- Fantasia/Bass/Joyce regressions pass;
- all existing QA/security/PDF/map/runtime tests pass;
- no protected artifacts changed unexpectedly;
- no real provider calls in automated tests;
- deploy preview/database branch passes before production.

## Completion report
Create `docs/SPRINT4_COMPLETION_REPORT.md` including:
- DB initialization method
- migration files/schema
- tables/indexes/constraints
- repository/service files
- local DB test results
- full regression results
- snapshot immutability proof
- idempotency/transaction proof
- Saved Property/Deal UX
- evidence/analysis history behavior
- duplicate/archive behavior
- deploy-preview DB branch result
- production deploy result if authorized/executed
- remote persistence smoke result
- protected artifact result
- security/credential scan
- known limitations
- exact operator commands
- recommended next step
- STOP

## Final principle
Persistence must preserve **what we knew, what was claimed, and what the model calculated at that moment**.

Do not turn PostgreSQL into a mutable “latest values only” store.

The central audit question Property Intelligence must eventually answer is:

> Why did we believe this deal looked the way it did when the decision was made?

Historical evidence and analysis snapshots must make that answer reproducible.

**Stop after Sprint 4 completion report for Stan/ChatGPT review.**
