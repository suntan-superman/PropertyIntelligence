# Durable Identity V3 — interfaces and remaining gaps

2026-10-09. Interface inventory recorded before implementation; final results appended below.

| Existing interface | Reuse and boundary |
| --- | --- |
| `review-model.validatePacket`, `validateSubmission`, `decisionView` | Validate original packet checksum, existing genuine-format decision fields, reviewer/component/contradiction/acreage requirements and stale review state |
| `review-store.createReviewStore({directory,reviewer,clock})` | Existing private-file/registry checks, server timestamp, revision CAS, save/reopen and historical decisions; use synthetic directories only |
| `review-assessment.assessReview`, `historicalDecisionAudit` | Preserve V1.2 classification and original historical source vocabulary. Google-assisted routine status is not durable-use authorization |
| `postgres-fixtures.seedThroughRepositories` | Reuse complete synthetic source/candidate/Assessor setup and original import validation, not direct positive SQL inserts |
| `sequence.persistSyntheticSequence` | Existing one-transaction canonical/Property/link/evidence/audit/idempotency composition, with county-aware reuse and readback checks |
| `local-postgres.localConfig/preflight/prepareSchema/testDatabase` | Exact loopback credentials, server/role/inventory isolation, unchanged migrations, verified local transaction transport and independent SQL connections |
| Existing `src/persistence/*` interfaces | Remain the actual storage implementation; no application save-route modification |

V2's embedded synthetic approval alone is not a trusted human-review integration. V3 must load a validated server-selected decision artifact, independently authenticate its evidence-use authorization and recheck both inside transactions and on replay. The request must contain only a server-issued reference/revision, never address, rights or approval Booleans.

Implemented narrow trust boundary: synthetic decisions saved by the existing review store; server-configured allowlisted directories; authenticated, revisioned local authorization envelopes pinning exact decision/packet/evidence/permission bytes. The signing capability belongs to the isolated fixture authority, not the caller. This demonstrates artifact integrity, not real human authentication or actual legal licensing. No signing secret is persisted or printed.

The pre-existing regression has been corrected under explicit authorization: `streamlined.test.js` verifies current historical state, exact byte/hash/file-identity preservation and independent evidence-effectiveness/no-persistence gates instead of assuming all decisions are null. Actual IP-P2 approval and all other actual decisions remain unchanged. The subsequent separator-only fix also passed eight focused checks. Fresh results: targeted 23/23, complete offline 167/167, combined PostgreSQL 41/41, no skips/cancellations, preservation PASS and command exit 0. Final classification: **V3 ISOLATED INTEGRATION CERTIFIED**.

No migration or alternate identity architecture is indicated. Real shared evidence rights, production approval issuance, cross-process authorization lifecycle and deployment remain outside this sprint.

## Certification blockers resolved; review stop

The Windows separator bookkeeping defect in `v3-certify.js` is resolved under separate explicit authorization. `value.replaceAll('\\','/')` is used only to compare the one exact authorized-change path. Actual filesystem reads and manifest entries remain unchanged, and both specified old/new hashes are still required. Wrong old/new hashes and unrelated paths fail focused checks. No broader exception or historical baseline rewrite was introduced.

There is no remaining blocker to this isolated synthetic certificate. The earlier stale-regression and path-accounting failure artifacts remain unchanged; the new passing run is separate evidence. Stop for Stan/ChatGPT review. This certificate does not authorize real-property persistence, production integration, provider enrichment or Round 1 selection.

## Production boundaries not certified by synthetic tests

1. **Real evidence rights:** obtain independently supportable, currently available, component-specific evidence with explicit durable/shared-purpose/retention rights. Synthetic rights fixtures are not licenses. Existing Google POC content and actual IP-P2 approval remain unavailable as shared canonical persistence authority.
2. **Actual approval authority:** the local catalog/HMAC demonstrates a trusted artifact boundary, not human authentication. A separately authorized production connection to existing reviewer identity/access controls and current decision/evidence records is required. No signing key is shipped or retained, and no production issuance endpoint exists.
3. **Authorization concurrency:** file integrity is rechecked on every replay and immediately before commit; monotonic revision detection is scoped to one gate process. A filesystem snapshot and database commit are not a distributed atomic operation. Multi-process revocation/rollback durability, authority storage ACLs, key lifecycle and transactional current-version coordination remain outside this local certificate. No claim of race-free production revocation is made.
4. **Existing saved identities:** the certified first-use review format describes no existing Property, then supports exact replay/current database checks. A different current authorization cannot silently replace historical saved evidence. Real historical reconciliation/reapproval would need explicit review, not automatic reuse or address-string merging.
5. **Runtime/security operations:** local owner-role tests do not certify external access, production RLS roles, deployment settings or the Windows listener/firewall. No production connection was made.
6. **Execution authorization:** real Properties, production save routes, provider enrichment and Round 1 selection remain unauthorized. The wrapper intentionally accepts only synthetic review directories and artificial identities.

These limits do not call for a new Property identity architecture, provider adapter, migration, dashboard or general infrastructure workstream. With separate future authority, the next business step can focus on acquiring durable address evidence for a small nonpilot candidate set, then targeted integration of the already-tested gates. Do not begin that work now.

## Preservation and stop

331 historical manifest entries checked: 325 unchanged and six recognized changes representing five files (the test has two separator aliases); unexpected changes **0**. The separate 355-path preservation check allows only the runner and three report changes in this final follow-up. Historical manifests and their recorded hashes, actual decisions, and prior certification artifacts remain unchanged. Both original V2 schemas and every other retained schema were independently verified unchanged. Production routes/migrations, Round 1 flags, scoring/MAO/Monte Carlo, monitoring and reports outside the three requested V3 documents remain intact. This follow-up's two fresh owned schemas retain only synthetic data (V2 two identities; V3 five). Nothing was dropped or truncated; no production/provider/MLS activity or real-property creation occurred.

See [certification](PI_DURABLE_IDENTITY_V3_CERTIFICATION.md) and [QA](PI_DURABLE_IDENTITY_V3_QA.md). **STOPPED FOR STAN/CHATGPT REVIEW.** No real-property persistence or six-property selection follows this work.
