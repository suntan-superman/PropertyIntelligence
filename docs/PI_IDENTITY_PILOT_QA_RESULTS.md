# PI identity pilot — offline QA results

Date: 2026-10-08 PDT. Final stage classification: **READY FOR HUMAN IDENTITY REVIEW**.

**52/52 tests passed, 0 failed, 0 skipped.** This certifies offline logic and evidence-packet preparation, not successful durable PostgreSQL persistence.

## Actual pilot versus synthetic coverage

| Required case | Evidence / result |
| --- | --- |
| Valid county identity | PASS for three actual candidates; unique exact source identifiers |
| Exact Assessor relationship | PASS for three actual local DBF records, matching Gate 1B identities |
| Official single-family classification | PASS via existing official-description mapping |
| Missing address components | PASS; state and ZIP absent in all three real packets |
| Unsupported address inference rejection | PASS; missing components remain blank; synthetic parser/validator tests |
| Analyst approval required | PASS; all real decision records unreviewed; existing repository rejects missing confirmation before transaction |
| Analyst rejection blocks progression | PASS, synthetic pilot preflight; no real decisions invented |
| Existing Property conflict blocks duplication | PASS, actual repository code with synthetic query doubles |
| Successful isolated persistence after genuine approval | NOT EXECUTED; no genuine approval, separate authorization or verified isolated database |
| Durable Property linkage | Actual pilot: NOT CREATED; existing-lineage reuse/coherence tested with synthetic query doubles |
| Opportunity-to-Property lineage | Actual pilot: NOT CREATED; FK/immutability/uniqueness definitions inspected, replay/conflict branches tested offline |
| Idempotent repeat | PASS for synthetic repository replay branches and byte-preserving real packet regeneration; database insertion/concurrency not executed |
| Source provenance preservation | PASS; packet hashes, source fingerprints, actual DBF row references and historical source dates retained privately |
| Round 1 exclusions | PASS for permanent private registry and unchanged existing flags/selection code; future harness enforcement awaits separate approval |
| No production writes | PASS; no database connections in preparation or tests |

No tests were skipped to claim a persistence PASS. Unexecuted database scenarios above are explicit certification gaps, not passing tests.

## Suites

| Suite | Passed |
| --- | ---: |
| New pilot designation/review/guard/repository tests | 20 |
| Existing Gate 1B identity audit tests | 9 |
| Existing Round 1 harness tests | 10 |
| Existing canonical-address tests | 4 |
| Existing durable-lineage tests | 3 |
| Existing persistence model/schema tests | 6 |
| Total | 52 |

```text
node --import ./src/analysis/offline.js --test scripts/identity-resolution-pilot/pilot.test.js scripts/mls-validation-round1/gate1b-identity-audit.test.js scripts/mls-validation-round1/harness.test.js scripts/sprint6_3_1/address.test.js scripts/sprint6_3_3/linkage.test.js tests/persistence.test.js
```

The existing network blocker disables fetch, HTTP(S), TLS and socket connections. Synthetic query doubles return explicitly seeded rows and fail on unexpected SQL. Replay tests execute actual `saveAddressResolution`, `createOpportunityPropertyLink` and `idempotent` code and assert no write callback / insertion is reached. They do not implement a second ingestion or identity engine, and do not demonstrate durable storage.

## Artifact checks

`node scripts/identity-resolution-pilot/verify-artifacts.js` verifies:

- Three unique registry identities and three fingerprint-consistent real review packets.
- Analyst decisions remain null; no automatic analyst confirmation.
- Packet/source references, exclusion identities and decision-to-packet binding remain coherent.
- Packet regeneration preserves existing artifacts byte-for-byte; no reselection or overwrite.
- All private outputs are gitignored and untracked.
- Shareable reports contain none of the selected addresses, county identifiers or candidate IDs.
- Packet field checks exclude owner/borrower/contact/credential fields and distress amounts.
- All 29 captured Round 1, persistence, migration and protected-baseline files are unchanged.
- All 52 tests pass under the network blocker.

The private QA receipt contains hashes and aggregate accounting, not credentials. Source acquisition dates remain explicitly unknown; source as-of dates are not relabeled as retrieval times.

## Limits and safety

No fresh production query was performed; existing canonical/Property absence is based on the prior Gate 1B snapshot. A fresh authorized read-only conflict check is required before future persistence. No database engine, trigger behavior or concurrent insertion was tested here.

No suitable isolated database was verified. No new dependency, cloud resource, role, policy or migration was installed or executed. The existing general persistence QA script that can truncate tables was not run. Low-level archived-reference and county-parcel policies must not be assumed from repository reuse alone; pilot preflight blocks them, and their integration must be verified in a later authorized rehearsal.

Accounting for this run:

- Database connections/queries/writes: **0 / 0 / 0**; Supabase traffic: **0** (prior snapshot reused).
- Real durable Properties, canonical resolutions and lineage rows created: **0**.
- Synthetic database writes: **0**; query doubles are not storage.
- Provider calls: **0**; MLS access: **0**.
- Round 1 properties selected: **0**; pilot candidates designated: **3**.
- Production deployments and application/identity/scoring/monitoring/report-renderer changes: **0**.
- Round 1 authorization/configuration/selection changes: **0**.

**Duplicate prevention: PASS for offline conflict/replay controls only. Isolated persistence: NOT EXECUTED.**

**STOP FOR STAN/CHATGPT REVIEW.** No real pilot persistence is enabled by these results.
