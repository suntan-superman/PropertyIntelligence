# PI identity resolution pilot — three-property technical review

**READY FOR HUMAN IDENTITY REVIEW**

Prepared 2026-10-08 PDT (2026-10-09T02:03:01.286Z). This is not six-property MLS selection or production integration. Three real candidates have private evidence packets; **no real or synthetic database persistence was executed**. End-to-end durable creation is not certified by this pilot run.

## Outcome

| Measure | Result |
| --- | --- |
| Pilot candidates designated | 3 |
| County identity | PASS, local source verification |
| Assessor relationships | PASS, exact source verification plus prior Gate 1B snapshot |
| Address evidence | PARTIAL |
| Canonical resolution | REQUIRES REVIEW |
| Analyst approvals | 0 |
| Isolated persistence | NOT EXECUTED; prerequisites blocked |
| Duplicate prevention | PASS in offline guard/replay tests; live database certification pending |
| Round 1 exclusions | PRESERVED; permanent private pilot registry added separately |
| Production writes / new database connections | 0 / 0 |
| Provider calls / MLS access | 0 / 0 |
| Round 1 properties selected | 0 |

## Deterministic designation

Used only the existing Gate 1 non-excluded 80-candidate cohort and its Gate 1B identity audit. The cohort was neither rebuilt nor expanded. All candidates had no canonical resolution or durable Property link at the recorded Gate 1B snapshot.

Rule `IDENTITY_PILOT_V1`:

1. Group by missing canonical-address components and the existing county acreage-review flag. The existing evidence has 25 flagged and 55 unflagged candidates.
2. Sort bucket keys using fixed lexical order; sort each bucket by fixed-width county ATN, then APN9.
3. Take one candidate per bucket in round-robin order until exactly three are designated; assign private review codes IP-P1 through IP-P3.

This represents two existing review conditions without fabricating a third. IP-P1 and IP-P3 have the existing acreage-discrepancy review flag; IP-P2 does not. All three have the same missing address components. Selection uses no market value, distress amount, equity, investment ranking, seller characteristics, MLS status or provider enrichment. It never matches an address to discover a Property.

The designation is sealed by a private registry. Re-running preparation checks input hashes and identical identities, verifies packet hashes, and preserves prior packets and analyst decision files. Changed evidence/selection or an incomplete previous run stops for review, rather than reseeding or overwriting.

## Source verification and address readiness

For each designated candidate, the offline preparation verified:

- One candidate identity and one exact Assessor relationship in the prior read-only Gate 1B evidence.
- Exactly one actual local Land DBF row with consistent ATN/APN9 and the certified source-row locator.
- The local DBF SHA-256 against the existing county source audit; the Power-to-Sell file against its certified fingerprint.
- Official use code/description through the existing county mapping, with single-family classification; no numeric-prefix inference.
- Nonblank actual county situs agreeing with the prior local situs extract.
- Unique parcel representation in the existing crosswalk and no county-identity conflict in Gate 1B.
- Historical Power-to-Sell membership and private source-row/page references, without copying owner names or financial amounts.

| Review code | County / Assessor | County review condition | Address evidence | Human decision |
| --- | --- | --- | --- | --- |
| IP-P1 | PASS / PASS | Acreage discrepancy flag retained | Literal street/city present; state and ZIP absent | Not reviewed |
| IP-P2 | PASS / PASS | No additional county review flag | Literal street/city present; state and ZIP absent | Not reviewed |
| IP-P3 | PASS / PASS | Acreage discrepancy flag retained | Literal street/city present; state and ZIP absent | Not reviewed |

Street and city are **unverified literal display-prefill components**, not approved postal components. The prefill is identical to PI's existing canonical resolver; tests assert that parity. Validation reuses `validateCanonicalAddress` / `providerReadyAddress`. State is not filled from the known county jurisdiction, and ZIP is not inferred. No replacement normalizer or new identity architecture was introduced.

Assessor evidence is the 2026 Final edition, as of 2026-06-26. Power-to-Sell evidence is as of 2026-09-15 and is historical, not verification of current distress. The database identity snapshot completed at 2026-10-09T01:55:12.326Z. Local verification time is recorded separately. **Original source acquisition timestamps were not established in the available certified artifacts** and are explicitly null; filesystem timestamps are not substituted for acquisition dates.

No new production query was made. The absence of canonical/Property links is an **as-of Gate 1B** finding, not a fresh live-state assertion. Any future authorized persistence requires a fresh read-only conflict check first.

## Human review and blocked persistence

Private analyst decision records have `decision=null`, no reviewer, no review timestamp and no confirmed address. Automated readiness is `NEEDS_MORE_EVIDENCE`; that is not a fabricated analyst decision.

An authorized reviewer must examine the source packet and provide one of `APPROVED`, `NEEDS_MORE_EVIDENCE` or `REJECTED`. An approval must reference the exact packet fingerprint, identify the actual reviewer and review time, and cite evidence for every confirmed component, especially state and ZIP. A plausible address, a manually toggled flag or a generated approval string is not proof of human approval. Rejection prevents progression.

This run has **no apply command and no database-writing execution path**. The pilot preflight always includes `REAL_PILOT_PERSISTENCE_DISABLED_THIS_SPRINT`, even if a decision file claims approval. Genuine review and separately authorized isolated persistence remain mandatory in a later task.

### Isolated environment findings

No verified local or explicitly designated non-production PostgreSQL environment was found. PostgreSQL tools and Docker were not available on PATH; the conventional local PostgreSQL install directory and installed embedded PostgreSQL substitutes checked were absent. The existing configured database is nonlocal and is not designated for this pilot; its credentials were not printed, loaded into the pilot, or used. No dedicated test/pilot database setting was identified. This is bounded inspection, not a claim that no database could exist elsewhere on the machine.

Prior QA-schema scripts operate through the configured database and may issue DDL. A temporary schema on production is not an acceptable isolated environment for this task. The older general persistence QA script also performs destructive setup; it was inspected but **not executed**. No database was provisioned and no production data was cloned.

### Existing workflow suitability and remaining persistence checks

The existing canonical repository provides component validation, analyst-confirmation enforcement, candidate/Assessor coherence, immutable resolution history and same-address replay. The existing Property/lineage repositories provide normalized-address Property reuse, request idempotency, explicit context, conflict checks and active-link uniqueness. Their existing migrations remain unchanged.

Offline query-double tests exercise actual repository replay and conflict code without a database. They are not a substitute for PostgreSQL FK/trigger/concurrency or durability tests.

Two important conditions must be addressed in a future authorized persistence rehearsal:

- Low-level Property reuse/link creation does not independently enforce every pilot policy, including archived-Property and duplicate county-parcel checks. These must remain mandatory explicit preflight checks, not assumed from successful insertion. The pilot review preflight fails closed for those cases; production code was not changed.
- `saveProperty` expects a ready workbench model and creates an evidence snapshot. These county-only, incomplete packets must not be promoted into a fabricated provider-ready model or provider evidence. After review, confirm the supported no-provider persistence orchestration in the designated isolated environment before invoking it. No synthetic success is reported for an unexecuted database workflow.

## Permanent pilot exclusions and future Round 1 rule

The three designated identities are permanently recorded with no expiry in `data/runtime/identity-resolution-pilot/pilot-exclusions.json`. Registry SHA-256:

`caebf338ec65da4a30da37011ed8e3f9af935065178d0a10fc7d73f254c8f71e`

The original Gate 1/Gate 1B manifests and Round 1 configuration/selection logic are unchanged. The remaining nonpilot source pool is **77**, not 77 verified or selected Properties. The previously excluded historical fixture remains excluded.

**Proposed rule — not applied to the Round 1 harness:** before any future eligibility ranking or selection, require the private registry and reject each exact registered candidate ID or exact county identity `(jurisdiction, ATN)` / `(jurisdiction, APN9)`. Use those identifiers, never address similarity. Reject conflicting identifier combinations for review; never merge or substitute identities. Carry the exclusion through any later canonical/Property IDs by explicit lineage. Missing, altered or unavailable exclusion evidence must stop selection. Preserve the existing historical-fixture and QA/archive exclusions.

This integration requires separate approval. Until then, the registry is an auditable permanent exclusion policy, **not already-enforced application behavior**. Round 1 remains `PRE_EXECUTION`, `executionAuthorized=false`, with unchanged seed, cohort fingerprint and lock flags. Future selection must not proceed without honoring this registry.

## Private artifacts and reproduction

All real identifiers and situs remain under gitignored `data/runtime/identity-resolution-pilot/`:

- `selection-manifest.json` — rule, input hashes, exact private identities.
- `pilot-exclusions.json` — permanent exclusions, no expiry.
- `IP-P1-review.json`, `IP-P2-review.json`, `IP-P3-review.json` — address/source packets and fingerprints.
- `IP-P1-analyst-decision.json`, `IP-P2-analyst-decision.json`, `IP-P3-analyst-decision.json` — unreviewed human-decision records.
- `identity-verification-results.json` — actual source results, blockers, safety counters and 29 protected-file hashes.
- `persistence-results.json` — explicit NOT_EXECUTED result.
- `offline-qa-results.json` — synthetic-test and actual-artifact checks, explicitly separated.

Preparation: `node scripts/identity-resolution-pilot/prepare.js`. It loads no environment credentials and installs the existing network blocker at entry. Do not edit existing packets or reseed the designation to bypass a changed-input stop. County data disclaimer: `docs/SPRINT6_2_SOURCE_DISCLAIMER.md`.

See `PI_IDENTITY_PILOT_QA_RESULTS.md` for validation boundaries and test results.

## Stop

**READY FOR HUMAN IDENTITY REVIEW.** The packet/review stage is complete; durable creation is not certified. Missing component evidence, actual human decisions, a designated isolated database and separate persistence authorization remain prerequisites.

**STOP FOR STAN/CHATGPT REVIEW.** No real pilot persistence, Round 1 selection, enrichment or Gate 2 work.
