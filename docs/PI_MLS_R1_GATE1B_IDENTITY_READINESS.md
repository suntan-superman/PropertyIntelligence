# PI MLS Round 1 — Gate 1B identity readiness

**GATE 1 IDENTITY REQUIREMENT BLOCKED**

Audit completed 2026-10-08 PDT (2026-10-09T01:55:12.326Z). This is an identity-only, read-only inspection, not authorization or certification of Round 1 execution.

## Results

| Measure | Count |
| --- | ---: |
| Candidates evaluated | 80 |
| VERIFIED DURABLE PROPERTY | 0 |
| COUNTY RESOLVED — NOT PERSISTED | 80 |
| IDENTITY REVIEW REQUIRED | 0 |
| EXCLUDED / INACTIVE within audited cohort | 0 |
| UNKNOWN | 0 |
| Duplicate/conflicting candidate identities | 0 |
| Provider-ready canonical addresses | 0 |
| Strict-harness eligible candidates | 0 |

All 80 source identities match exactly one existing PI candidate and one active, exact-match Assessor enrichment. The current Assessor classifications remain single-family residential. None has a canonical resolution (including historical resolutions), an Opportunity-to-Property lineage row, or a legacy durable Property reference. No additional Property was found by those exact county identifiers. This does not claim that an unrelated address-only Property cannot exist: address-string discovery joins were deliberately prohibited.

The original manifest contains one additional documented excluded fixture; it was not evaluated or reintroduced into this 80-candidate cohort. The cohort was not recreated, ranked, or selected.

## Reconciliation and duplicates

The audit follows exact county ATN to candidate, verifies membership in the certified source through discovery-record relationships, and checks the current Assessor enrichment against both county ATN and APN9. It then follows explicit canonical-resolution and Property foreign-key relationships, including compatibility references. No fuzzy or address-based Property discovery is used.

There are 80 distinct candidate IDs, 80 distinct county ATNs and 80 distinct county APN9 values. No other active Assessor enrichment represents these APN9 values under another candidate. Active canonical resolutions and durable Property references are absent, so duplicate canonical/Property references and conflicting active lineage links are zero, not positive proof of a populated canonical registry.

Candidate archive/status and explicit QA/test markers were checked; none of the scoped candidates was excluded by those checks. Canonical/Property archive and QA checks have no matching records to evaluate. No identities were merged, resolved, or created.

## Address and strict-harness interpretation

County situs is source evidence, not a postal-validated canonical address. No city or ZIP was inferred. With no persisted canonical resolutions, provider-ready canonical address count is zero.

The audit reuses the existing canonical component validator and explicit lineage conventions. A verified durable identity would require a coherent, active analyst-confirmed canonical resolution, sufficient address components, and a non-archived durable Property linked through the supported relationships. Address normalization is only a consistency check after following IDs, never a lookup/linking mechanism.

The existing Round 1 harness separately requires standard-analysis readiness. It was not manufactured or evaluated through investment analysis. Since every audited candidate already fails the required durable-identity gate, strict-harness eligibility is definitively zero regardless of later analysis readiness. Provider budgets, Monte Carlo, and report-freeze integration remain separate gates.

## Read-only database controls and accounting

Used the established `createDatabase` PostgreSQL/TLS connection without printing connection information. TLS encryption and certificate authorization were checked. On one pinned client, the audit opened `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` and verified `transaction_read_only=on` and `transaction_isolation=repeatable read` **before application-table reads**. No permanently read-only database role is asserted; the protection was the explicitly verified transaction.

Metadata inspection confirmed SELECT privileges and no active RLS filtering for all eight relevant tables. Therefore empty relationship results were not interpreted through an unverified RLS-filtered view. Application queries were fixed, parameterized SELECTs with an additional read-only statement guard. No write probe was used.

| SELECT category | Statements | Rows returned |
| --- | ---: | ---: |
| Initial read-only verification | 1 | 1 |
| SELECT privilege / RLS metadata | 1 | 8 |
| Scoped candidates and certified source relationship | 1 | 80 |
| Assessor relationships and exact-parcel collisions | 1 | 80 |
| Canonical-resolution history | 1 | 0 |
| Lineage history and global reference counts | 1 | 0 |
| Referenced Properties / exact county identifier checks | 1 | 0 |
| Final read-only / unassigned write transaction ID verification | 1 | 1 |
| **Supabase PostgreSQL SELECT total** | **8** | **170** |

Transaction control: one read-only BEGIN and one ROLLBACK. Final verification again returned read-only/repeatable-read and no assigned write transaction ID. Rollback completed. Row counts above describe query results, not database internal rows scanned or network round trips.

- Production/database writes: **0**. No migrations, DDL, DML, audit-event inserts or persistence helpers invoked.
- Provider calls: **0** (ATTOM, DataTree, RentCast, Google, county and address validation). No provider credentials used. Supabase reads are accounted separately above.
- MLS access: **0**.
- Selected properties: **0**.
- Authorization/configuration changes: **0**. Original manifest and Round 1 config were byte-fingerprinted before/after and unchanged; execution authorization, selection seed/fingerprint and all lock flags remain as found.
- Historical protected-baseline changes: **0**. Application, scoring, deployment and production configuration unchanged by this task.

## Private evidence and reproducibility

Private output: `data/runtime/mls-round1/private-canonical-identity-audit.json`.

It contains only scoped source references, exact identity IDs, relationship/status/component-presence results, conflict reasons, fingerprints, query counts and transaction safety evidence. It contains no owner/contact data, credentials, or actual address text. Neither the audit output nor its input is published in this report. The output is untracked and covered by the existing `data/runtime/` ignore rule; no ignore rule was weakened.

| Evidence | SHA-256 |
| --- | --- |
| Input manifest | `a514e775d52188da12569e4c2c6ed137f8da60bda09ebbe4d4eb1cc50e971f02` |
| In-memory scoped database snapshot | `e86cae17ac00cf12fecead52d1e4967b0f0b4cb8ac6c4bbff38acafc7631863a` |
| Private audit output | `2c2dd4d0a921183824c4238c5590f53e9852e713be061f48fc3c798283232c59` |

Snapshot fingerprint covers the selected fields, not the entire production database. Results describe the consistent audit-time snapshot, not future state.

## QA

Executed existing identity/harness tests and focused audit tests under the existing offline network blocker:

```text
node --import ./src/analysis/offline.js --test scripts/mls-validation-round1/gate1b-identity-audit.test.js scripts/mls-validation-round1/harness.test.js scripts/sprint6_3_1/address.test.js scripts/sprint6_3_3/linkage.test.js
```

**26/26 PASS, 0 failed, 0 skipped.** Existing suites: Round 1 harness 10, canonical-address identity 4, durable-lineage identity 3. New audit safeguards/classifier tests: 9. Synthetic test fixtures are separate from the actual database audit; tests did not select real properties or access the database/providers.

Coverage includes read-only guard rejection, absent identities, coherent explicit lineage, incomplete/unconfirmed canonical addresses, duplicate county representations, shared Property conflicts, archive/QA exclusions, and legacy-only references. Existing authorization, exclusion, freeze and identity assertions remain intact.

## Decision and stop

At least six eligible durable identities are required; **zero** are verified in the authorized cohort. Any future identity-resolution or persistence work requires separate authorization. No such work was performed or started.

**STOP FOR STAN/CHATGPT REVIEW.** No selection, enrichment, investment analysis or Gate 2 execution.
