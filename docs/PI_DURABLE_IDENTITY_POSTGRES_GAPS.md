# Durable Identity V2 — gaps and pre-implementation review

Date: 2026-10-09. **ISOLATED POSTGRESQL CERTIFIED**. The pre-implementation findings below were recorded before the test adapter was added.

Before implementation, the V1 review established that existing repositories provide canonical, Property, candidate, linkage, evidence and transaction storage. Missing production safeguards remain: trusted reviewer/approval bindings, retention/use-scope enforcement, county-aware and archive-safe Property reuse, replay revalidation, and a single identity-only transaction. V2 tests the existing synthetic policy and repository composition; it does not deploy those safeguards.

The inspected `assessorImport.applyAssessorPlan` already validates a complete source plan and uses the real Assessor constraints. It permits the established `qa_sprint6_3_<32 hex>` namespace without production authorization. V2 will use that namespace only inside the exact verified local database, never enable `productionAuthorized`, and never load production `.env`.

Canonical/Assessor rows require an existing candidate by FK. Therefore source and candidate creation/retrieval must precede canonical resolution inside the transaction. This dependency-driven order preserves the requested outcome. A real live adapter, schema-complete synthetic plan, independent SQL checks and actual concurrent connections are the remaining certification additions; no alternative identity schema is needed.

Existing migrations 001–006 will be applied unchanged to a new test-owned schema. Migration 001 supplies Property/evidence/audit/deal tables used by repository joins; 003 supplies candidates/source relationships; 004 supplies Assessor provenance; 005 and 006 supply canonical and explicit lineage. Migration 002 is retained in the established complete migration sequence, with no acquisition/analysis data created. No simplified schema, production migration runner, or default connection will be used.

## Final execution findings

No production repository or migration defect required correction. Existing migrations initialized on PostgreSQL 18.6, and all 22 actual integration tests passed. Real commits, sequential replay, eight-connection duplicate creation, PostgreSQL constraint failures and transaction rollback passed independent read-only verification. All 81 offline regressions also passed. The complete second run preserved the first schema and its synthetic data.

The prior offline workflow was mechanically extracted into a shared synthetic composition so both its guarded offline wrapper and the separately verified local test adapter exercise the same repositories. The V1 guard remains offline-only. V2 does not change application save routes or authorize production writes.

## Production gaps remain distinct

| Gap | What V2 establishes | What is still needed before real persistence |
| --- | --- | --- |
| Trusted analyst approval | Test-only approval/fingerprint, reviewer, expiry and binding gates work | A trusted real reviewer record and server-validated evidence references; no caller-supplied permission Boolean as authority |
| Retention and shared use | Synthetic expired/restricted/Google evidence is rejected | Independently supportable, licensed address components and current permitted-use checks; actual legal/storage review remains separate |
| County-aware Property reuse | The pilot checks exact county/source/Assessor context and rejects ambiguous or archived reuse | Reviewed production orchestration around existing address-key reuse; no fuzzy matching and no blanket unique-APN assumption |
| Atomic identity-only workflow | Existing repositories share one connected-client transaction successfully | A separately authorized production service boundary; current application saves still have their prior boundaries |
| Replay safety | Live replay rechecks policy and exact current relationships | Integrate equivalent checks in a future authorized live workflow; generic `idempotent()` itself does not bind every evidence field |
| Completeness of links | Test workflow always supplies canonical/Assessor IDs and verifies them | Existing schema permits nullable references for other workflows; do not equate every raw link with certified identity |
| Evidence/audit immutability | Historical hashes were preserved, and canonical/lineage guards rejected mutations | Generic snapshot/audit protection and runtime-role privileges still need review for production use |
| RLS/authentication | Existing schema RLS flags and grants verified | Role-specific security tests; these tests ran as the owning local role, not a browser/anonymous principal |
| Real-property identity | No real record or approval was consumed | Separate authorization plus independently supported evidence and genuine review; synthetic success is not parcel verification |

The existing candidate repository advances last-seen/update timestamps on replay; V2 confirms stable IDs, zero new rows and unchanged screening/evidence, not bit-for-bit identity of those operational timestamps. The Property remains `UNCONFIRMED` under current conventions; a synthetic canonical confirmation does not silently promote postal or investment readiness.

No schema migration or new identity architecture is proposed merely because these service-level requirements exist. The local database is ready for targeted follow-up testing, not automatic production integration.

## Minimal next steps — require review

1. Review the certification and retained local synthetic evidence. No further infrastructure project is needed.
2. Authorize the narrow existing-service changes needed to enforce trusted real approval/evidence-use and exact identity/replay rules, if desired. Keep ordinary authentication and retention review separate from this mechanical certification.
3. For any actual pilot candidate, obtain independent permitted durable component evidence and an effective genuine approval bound to the correct packet. IP-P2's historical Google-bound approval remains unchanged and is not promoted into durable permission.
4. Only after separate real-property write authorization, consider a narrowly controlled real identity persistence test. Existing pilot exclusions and Round 1 selection/analysis/MLS gates remain unchanged.

All writes in this task stayed in two positively verified local test schemas. Four artificial Properties are retained across them; real Properties created: zero. No production safety or real-property readiness claim follows from these results. Stopped for Stan/ChatGPT review.
