# Property Intelligence — Sprint 6
## Kern Opportunity Discovery, Screening & Controlled Enrichment

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**Production:** Netlify + Supabase PostgreSQL
**Primary input:** existing Kern County Power-to-Sell dataset (~11,316 extracted records; audit actual artifact before relying on count)
**Goal:** turn a large public distress list into a prioritized, auditable investigation queue without mass provider spend.

## Mission
PI already answers what a property looks like, what independent evidence says, whether a proposed deal works, and the MAO under an explicit hurdle. Sprint 6 adds:

> Which distressed properties deserve investigation first?

Import the existing Kern Power-to-Sell records, preserve provenance, resolve/deduplicate conservatively, assign deterministic investigation signals, create an analyst queue, and allow controlled/manual enrichment through the existing Property Intelligence workflow.

Do NOT automatically call RentCast for all records.

## Principles
1. Discovery evidence is not property truth.
2. Power-to-Sell is a distress signal, not proof of investment attractiveness.
3. Unknown is not zero.
4. Never invent street addresses from ATN/APN.
5. Never silently merge ambiguous parcels.
6. Ranking prioritizes investigation; it is not an investment recommendation or profit probability.
7. Every ranking point must be explainable.
8. Provider calls require deliberate analyst action or separately authorized capped batch.
9. Every record stays traceable to source.
10. Future Assessor/GIS data plugs into the same model.

## Hard boundaries
Allowed: import existing Kern data, migration 003, candidates/signals, deterministic priority score, analyst queue, status/review, manual address resolution, controlled enrichment, link candidate→Property→Evidence→Deal→MAO, CSV export, future-source interfaces, data-quality metrics.

Forbidden: new county scraping, ArcGIS-token bypass, mass RentCast, automated offers/outreach, skip tracing/contact enrichment, title integration, mortgage/lien inference, AI recommendation, Monte Carlo, rental/BRRRR/Wholesale, modifying Sprint 1–5 protected outputs.

Automated QA: zero RentCast calls.

## Audit actual source first
Locate existing extracted Kern artifacts. Create `docs/SPRINT6_KERN_SOURCE_AUDIT.md` with exact files, hash, record count, columns, edition/date, ATN/APN format, owner-name availability, delinquency/amount fields, address availability, duplicates, null rates, parsing anomalies and row/page provenance.

Do not assume fields not present. If 11,316 differs from actual current artifact, use actual audited count and document why.

## Migration 003
Create additive `003_opportunity_discovery.sql`; never modify/rerun 001/002.

Audit existing Sprint 4 `discovery_signals` table first and reuse/extend where sensible rather than creating redundant overlap.

### discovery_sources
`id uuid PK, source_type, jurisdiction, source_name, edition, source_date nullable, source_file_hash, record_count, imported_at, provenance_payload jsonb`.
Initial source: `KERN_POWER_TO_SELL`.

### discovery_records
Immutable imported rows:
`id, discovery_source_id FK, source_row_number, source_page nullable, external_identifier, atn nullable, apn nullable, owner_name nullable, amount_owed nullable, raw_payload jsonb, normalized_payload jsonb, record_fingerprint, imported_at`.
Unique source/fingerprint constraints. Never overwrite source row.

### opportunity_candidates
`id, jurisdiction, candidate_key, atn nullable, apn nullable, normalized_owner_name nullable, resolved_property_id nullable FK, identity_status, candidate_status, priority_band, screening_score nullable, score_version, first_seen_at, last_seen_at, archived_at nullable, created_at, updated_at`.

Identity: `UNRESOLVED, PARTIAL, RESOLVED, AMBIGUOUS, SOURCE_STOP`.
Status: `NEW, REVIEWING, NEEDS_ADDRESS, READY_FOR_ENRICHMENT, ENRICHED, DEAL_CREATED, DEFERRED, REJECTED, ARCHIVED`.
REJECTED means removed from current investigation queue with reason, not investment verdict.

### opportunity_record_links
`id, candidate_id FK, discovery_record_id FK, link_type, confidence_basis, created_at`.

### opportunity_signals
`id, candidate_id FK, signal_type, numeric_value nullable, text_value nullable, status, source_record_id nullable FK, evidence_payload jsonb, created_at, superseded_at nullable`.

Only create signals supported by actual fields. Potential examples: `TAX_DEFAULT_AMOUNT, POWER_TO_SELL_PRESENT, REPEAT_SOURCE_EDITION, IDENTIFIER_COMPLETE, ADDRESS_RESOLVED, PROPERTY_LINKED, INDEPENDENT_VALUE_AVAILABLE, MAO_AVAILABLE`.

### opportunity_reviews
`id, candidate_id FK, action, reason_code nullable, notes nullable, created_at`.

No auth/user model yet.

## Importer
Create deterministic importer (`scripts/kern-import-power-to-sell.js` or equivalent).

Commands:
`npm run kern:import:dry-run`
`npm run kern:import`
`npm run kern:import:status`

Requirements: schema validation, source hash, immutable records, candidate creation/linking, idempotent rerun, transaction safety, summary, zero provider calls, raw+normalized preservation, reject malformed critical IDs rather than silently fixing.

Dry-run mandatory before DB write.

## Identity
Do not assume ATN/APN equivalence without source-supported normalization.

Rules:
- exact stable county identifier may link across editions
- missing ID → unresolved
- conflicting IDs → ambiguous/STOP
- owner name alone NEVER merges parcels
- similar address alone NEVER merges parcels
- manual analyst resolution is audited

Future Assessor/GIS resolver plugs into this boundary.

## Investigation Priority Score
Name exactly **Investigation Priority Score**. Version `kern-screen-v1`.

Purpose: queue analyst attention only.

If 0–100 is used, every point maps to documented signals.

Potential components only if actual data supports:
- stable identifier completeness
- tax-default amount magnitude using transparent bands
- repeat appearance across editions if historical editions exist
- address/property resolution
- independent valuation availability
- MAO availability

Do NOT award owner-name points. Do NOT infer equity, mortgage status, condition or seller motivation beyond public distress signal.

Sparse source → intentionally simple score.

Priority bands:
`HIGH_REVIEW_PRIORITY, MEDIUM_REVIEW_PRIORITY, LOW_REVIEW_PRIORITY, INSUFFICIENT_DATA`.

UI disclaimer:
`Priority indicates where to investigate first, not expected investment return.`

Every candidate shows “Why this candidate is here” with explicit facts/signals.

## Opportunity UI
Top navigation:
`Analyze Property | Opportunities | Saved Properties | Saved Deals`

Opportunity list: priority, score, ATN/APN, resolved address, owner name only if appropriate, amount owed, identity status, candidate status, linked Property/Deal, source edition, last review.

Server-side search/filter/sort/pagination. Never send all 11k rows to browser.

Candidate detail: source/provenance, original values, normalized identifiers, signals, ranking explanation, identity, review history, linked Property, enrichment actions.

## Controlled enrichment
No automatic mass enrichment.

Actions:
- Resolve Address: analyst confirms full address/provenance.
- Analyze Property: explicit action uses existing RentCast/PI pipeline and may consume quota.
- Save/Link Property.
- Create Deal / Acquisition Analysis.

Batch infrastructure may exist but disabled by default. If later enabled: explicit max count, dry-run count/cost estimate, cache/dedupe, concurrency cap, stop on 429/error threshold, audit calls, and no default batch >25 without explicit operator authorization.

Sprint 6 automated/certification QA should use zero provider calls.

## Funnel / metrics
Show counts: imported records, unique candidates, unresolved, needs address, ready for enrichment, enriched, deal created, deferred/archived.

Data-quality metrics: identifier completeness, amount null rate, duplicate rows, candidate merges, ambiguous count, unresolved addresses, linked Properties, enriched count, import errors.

These are operational QA, not investment analytics.

## Property linkage
Resolved candidate links:
`Opportunity Candidate -> Canonical Property -> Evidence -> Deal -> Acquisition Decisions`.

Do not duplicate canonical Property when identity is safely known. Property view may show discovery source/edition.

## Future source adapters — interface only
Design adapter boundary for:
- Kern Assessor final dataset
- Kern ArcGIS/parcel geometry
- NOD/NOTS
- legal notices
- tax sale/auction lists
- future title/encumbrance sources

Conceptually:
`normalizeSourceRecord()`, `candidateIdentityHints()`, `deriveSignals()`.

No integrations now.

When Assessor/GIS arrives, model should accept only fields actually supplied (address, crosswalk, characteristics, assessed values, geometry/history if present) without redesign.

## CSV export
Export filtered safe fields: candidate ID, identifiers, resolved address, priority/score, amount, statuses, linked Property/Deal IDs, source edition. No secrets/raw provider payloads.

## Defer/reject reasons
`DUPLICATE, NOT_TARGET_PROPERTY_TYPE, BAD_IDENTITY, INSUFFICIENT_DATA, ALREADY_RESOLVED_EXTERNALLY, OUTSIDE_CURRENT_SCOPE, OTHER`.
No financial rejection reasons until actual underwriting exists.

## Security/privacy
Use only lawfully obtained/imported source data. No skip tracing/contact enrichment/outreach. No browser DB access. Parameterized SQL. Preserve TLS/credential protections. Avoid owner names in logs/test fixtures; synthetic names in tests.

## Persistence
Source rows immutable. Score recalculation/versioning must remain auditable. Analyst reviews append-only. Candidate status/property-link changes audited.

Import same source file twice → no duplicate source edition/rows/candidates. Same fingerprint returns existing.

## Tests
Source/import: actual record-count reconciliation, dry-run, malformed rows, raw preservation, hash, idempotency, rollback, duplicate row, identifier normalization.

Identity: exact stable ID linkage, missing unresolved, conflict ambiguous, owner name never merges, manual-resolution audit.

Screening: every point explainable, no absent-field/owner-name points, no equity/mortgage/condition inference, deterministic result, score version, insufficient data, bands.

Persistence: migration 003, source immutability, candidate/link/signal/review history, Property linkage, archive/defer, idempotent rerun, separate connections.

API/UI: server pagination/filter/sort, candidate detail, no 11k browser payload, CSV export, controlled enrichment, no provider call without explicit action.

Regression: all Sprint 5/prior QA remains green—MAO, persistence, Fantasia, Bass/Joyce, maps, PDF, runtime, Supabase TLS, security, credential scans; zero automated provider calls.

## Golden screening fixtures
Synthetic:
1. complete ID/high delinquency
2. complete ID/low delinquency
3. missing ID
4. conflicting IDs
5. duplicate source row
6. repeat edition
7. resolved address
8. linked Property
9. unknown amount
10. owner-name collision across parcels

Hand-reconcile expected scores/explanations.

## Performance
~11,316 records must import/query comfortably. Use indexes and server pagination. Measure import time and common query latency. No Redis/search service yet.

## Deployment gates
1. protect/hash existing artifacts
2. source audit
3. migration 003 review
4. local rebuild 001+002+003
5. actual-source importer dry-run
6. importer/screening tests
7. isolated local import
8. data-quality reconciliation
9. full regression
10. Supabase preflight/status
11. apply 003 once
12. schema QA
13. tagged non-destructive persistence QA
14. before real remote source import, report source filename/hash/expected count/valid/rejected/duplicate/candidate estimate and zero provider calls
15. STOP if hash/count differs unexpectedly
16. import real Kern source only after reconciliation gate
17. deploy preview
18. preview Opportunities list/detail/pagination/filter/export
19. cold-function persistence/linking
20. verify zero provider calls
21. STOP for production application deployment authorization

Migration and source import are distinct gates. Never reset/truncate Supabase.

## Acceptance
GO only if actual source is audited; immutable import is idempotent; 11k list is server-paginated; ranking deterministic/explainable; no inferred equity/mortgage/condition; unknown stays unknown; provenance preserved; ambiguous identities do not merge; candidates link to canonical Property; Analyze Property is explicit; no mass RentCast; Sprint 1–5 unchanged; migration/schema/persistence QA passes; source dry-run reconciles; preview passes with zero provider calls; production app deploy separately authorized.

## Documentation
Create:
- `docs/SPRINT6_KERN_SOURCE_AUDIT.md`
- `docs/SPRINT6_OPPORTUNITY_MODEL.md`
- `docs/SPRINT6_SCREENING_RULES.md`
- `docs/SPRINT6_IMPORT_RUNBOOK.md`
- `docs/SPRINT6_QA.md`
- `docs/SPRINT6_COMPLETION_REPORT.md`

## Completion report
Include actual source files/counts/fields/hash, migration 003, import reconciliation, candidate count, duplicates/ambiguities, score formula/version/bands, data-quality metrics, query/import performance, Supabase/schema QA, source-import result, preview result, provider calls, protected artifacts, security scans, limitations, next recommendation, STOP.

## Final principle
Sprint 6 does not answer “Which property should I buy?”

It answers:

> Which public distress records deserve human investigation first, why are they prioritized, what do we know, what remains unresolved, and can we move a resolved candidate into the existing Property Intelligence acquisition workflow without losing provenance?

**STOP after deploy-preview certification for Stan/ChatGPT review before production application deployment.**
