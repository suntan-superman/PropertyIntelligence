# PI MLS Round 1 — Gate 1 Private Candidate Eligibility Audit

## Result

**GATE 1 BLOCKED.** The locally available certified source records identify a promising pool, but do not establish the cohort-wide PI canonical-address and durable-Property identities required by the current Round 1 harness. No production database was queried to fill that gap. No property was selected.

Classification of the evaluated high-priority single-family population:

| Classification | Count | Meaning |
|---|---:|---|
| A — Eligible / verified | 0 | No non-excluded candidate could be independently verified against a cohort-wide PI canonical/durable-Property snapshot from approved local artifacts. |
| B — Potentially eligible / identity review | 80 | Source identity, SFR classification, historical distress, and raw county situs are present; PI canonical/durable identity and provider-ready address status remain unestablished locally. |
| C — Ineligible | 1 | Previously tested Round 1 fixture, explicitly excluded. |
| D — Insufficient evidence | 0 | Within this scoped population, source-level evidence was present for the B/C classifications; unresolved PI identity is B, not an assertion of source absence. |
| **Evaluated population** | **81** | Reconciles: 0 + 80 + 1 + 0. |

The A count is the number verified from available evidence, not proof that no other PI records exist. The actual number among the 80 that already have durable PI identities is **UNKNOWN** because this task prohibited production queries and no local cohort-level identity export was found. Thus the actual strict-harness selection count is **UNKNOWN; 0 are locally verified as meeting it**. Do not treat 80 as an approved or selected pool.

## Aggregate summary

| Metric | Count |
|---|---:|
| Total source candidates | 11,316 distinct normalized ATNs (11,321 original PTS rows) |
| High-priority candidates | 312 |
| High-priority residential | 118 |
| High-priority single-family | 81 |
| County-resolved identities | 81 of 81; 80 after the explicit fixture exclusion |
| Verified PI canonical properties | 1 known, and it is the excluded fixture; remaining 80: **UNKNOWN** |
| Eligible for selection | **UNKNOWN actual strict-harness count**; 0 of the 80 locally verified |
| Potentially eligible — identity review | 80 |
| Ineligible | 1 |
| Insufficient evidence | 0 in the scoped A/B/C/D classification; PI identity/persistence for B remains unknown |
| Duplicate property identities | 0 ATN duplicates and 0 APN9 duplicates detected in the 81; canonical-ID duplicate count: **UNKNOWN** |
| Excluded historical QA fixtures | 1 |

“County-resolved” means the local PTS ATN has one exact Assessor relationship and a valid APN9 in the audited crosswalk. “PI canonical property verified” is a separate, stronger workflow/persistence fact. County situs presence is not postal validation or analyst-confirmed canonical-address resolution.

## Measured funnel

```text
Power-to-Sell source rows                         11,321
            ↓ normalize/group by county ATN
Distinct source candidates                       11,316
            ↓ existing screening edition
High priority                                       312
            ↓ official conservative residential categories
High residential                                    118
            ↓ official single-family category
High single-family                                   81
            ↓ exact unique Assessor ATN + APN9 + situs
County-resolved (including excluded fixture)        81
            ↓ remove explicit prior-test fixture
Potentially eligible for PI identity review          80
            ↓ verified PI canonical + durable identity
Locally verified, non-excluded A candidates           0
```

The final zero is **zero verified in the local audit**, not a claim that a production read would return zero. Actual persisted PI identity coverage and therefore the strict selection count remain unknown.

## Source provenance and quality

| Source | Local source/artifact | Acquisition / as-of | Records and identity | Relevance and certification |
|---|---|---|---|---|
| Kern Power-to-Sell | Protected local source CSV; certified Sprint 6 source audit; candidate crosswalk | Source date 2026-09-15 | 11,321 source rows; 11,316 normalized unique ATNs; five duplicate ATN groups in the source rows. Source supplies ATN and amounts owed, not property address/APN/classification. | Historical distress evidence only. It does not establish current delinquency. Source hashes and screening edition were certified in Sprint 6. |
| Kern Assessor land/use crosswalk | Local 2026 Final Assessor package, extracted read-only under ignored runtime storage; Sprint 6.2 certified crosswalk | Assessor edition 2026 Final; KIPS situs snapshot 2026-06-26 | 426,054 county land records in source profile; exact crosswalk covers the 11,316 candidate ATNs, 11,263 exact and 53 unmatched. APN9, official use description/category, tax-roll values, and situs-presence status are represented in the crosswalk. | Previously certified source match and conservative use-code classification. Assessed values are tax-roll evidence, not market value. |
| Candidate crosswalk | `data/validation/sprint6_2-kern-atn-crosswalk.csv` | Generated 2026-09-23; source editions above | 11,316 rows, one grouped candidate per normalized ATN; contains no owner/contact field and no full situs text. | Re-read and reconciled locally for this audit. Its high-SFR subset has 81 exact matches, 81 unique ATNs, 81 unique APN9s, and 81 `SITUS_PRESENT` statuses. |
| Exact county situs cache | Protected ignored local runtime artifact | KIPS as-of 2026-06-26 | 11,263 exact-match entries; raw situs values were used only in memory to confirm nonblank situs and were not copied into the private eligibility manifest. | Situs is raw county evidence, not independently postal-validated; no city/state/ZIP components are certified by this audit. |
| PI identity/persistence | Local certified Sprint 6.3.3 reconciliation artifact for the known excluded fixture; no cohort-level local export | Certified prior lineage evidence | One verified canonical/durable Property identity, belonging to the excluded fixture. The remaining 80 candidates have no candidate-level PI IDs in the local crosswalk. | No production database or service was queried. Identity status for the remaining 80 and canonical duplicate counts are unknown, not zero. |

The source-level PTS history and Assessor snapshots are from different dates. No current tax-delinquency, title, mortgage, MLS, or provider evidence was acquired in Gate 1.

For context outside the 81-record evaluation scope, the same historical High-312 crosswalk contains 231 candidates outside the official single-family category (including multifamily, manufactured, vacant, other, and unknown categories), 309 exact Assessor matches and three unmatched records. Among the 312 High candidates, 258 have situs present, 51 have missing situs, and three are unmatched. The 81 high-priority SFR records evaluated here are all within the exact-match/situs-present group. Across the complete candidate edition, the crosswalk reports no `MATCHED_MULTIPLE`; the five duplicate ATN groups are duplicate source rows consolidated into distinct normalized-ATN candidate groups, not five extra candidates.

## Duplicate and exclusion treatment

- The 81 scoped rows have 81 distinct normalized ATNs and 81 distinct APN9s. No source-identifier duplicate was detected inside this evaluated subset.
- The local crosswalk does not contain canonical Property IDs, so duplicate canonical identities cannot be checked. Reported as **UNKNOWN**, not zero.
- All 81 have a unique exact Assessor match, official single-family classification, and a nonblank raw county situs status. This does not itself verify a PI canonical property.
- One historical QA/fixture property is excluded by the existing Round 1 rule. It is not replaced.
- The crosswalk’s POC manual-review diagnostic is present for 25 of the 81 due to source-quality flags (e.g., acreage difference or other diagnostic conditions). These flags were preserved and were not promoted into a new blanket exclusion because the Round 1 eligibility definition does not prescribe that exclusion. Review them where identity/parcel comparability is material.
- No fuzzy address matching or formatted-address deduplication was used.

## Blockers and minimum next work

| Blocker | Affected | Selection impact | Minimum corrective action | Provider calls? | Additional authorization? |
|---|---:|---|---|---|---|
| No candidate-level PI canonical/durable identity snapshot | 80 unknown | Prevents verifying the current strict harness requirement (`candidateId`, canonical `Property` identity, complete canonical address); actual eligible count remains unknown | Obtain an allowlisted, read-only private identity export with candidate ID, ATN/APN9, exact Assessor context, active analyst-confirmed canonical resolution ID/status, active Property-link status/Property ID, archive/duplicate/conflict flags, and QA/exclusion status. Reconcile to the 80 local source identities using exact IDs only. | No | Yes, if obtaining it requires a production query; production access was not authorized in this gate. |
| Raw situs is present but not postal/canonical verified | 80 potential candidates; extent of missing complete address unknown | Prevents asserting provider-ready address completeness; county situs must not be silently treated as canonical address | In the authorized identity review, use the existing address-resolution evidence/workflow and record unresolved cases. Do not infer ZIP or city and do not create a durable Property just to satisfy the count. | Not necessarily; address confirmation is separate from provider enrichment | Yes for any production persistence/change; none occurred. |
| Canonical duplicate/conflict status unavailable | 80 unknown | Cannot certify six distinct PI properties solely from ATN/APN9 uniqueness | Compare canonical IDs and active Property links in the private identity export; quarantine any conflict and count by authoritative IDs. | No | Same read-only identity-export authorization. |
| Historical distress is not current delinquency | 80 candidates | Does not block initial historical-distress selection, but limits later current-distress/underwriting claims | Preserve PTS date/source in any future frozen packet; obtain a current source only under separately authorized later-stage scope. | Not for Gate 1; potentially later | Yes for any later external data acquisition. |

Shortest safe path: first obtain the narrow, private, read-only cohort identity export and reconcile it against these 80 exact county identities. It should contain, at minimum, candidate ID, ATN, APN9, active Assessor enrichment ID/status, canonical-resolution ID/status/analyst-confirmed flag, canonical address components (kept private), active durable-link status/Property ID, archived/conflict/duplicate flags, QA markers, and evidence recency. If at least six distinct, non-excluded candidates already satisfy the current durable identity/address controls, Gate 1 can be reconsidered without bulk remediation. If fewer than six do, determine the minimum number of individually justified identity resolutions needed under separate authorization. No property selection or address resolution is started here.

## Controls, tests, and privacy

- The private candidate manifest is generated at `data/runtime/mls-round1/private-candidate-eligibility.json`; `.gitignore` rule `data/runtime/` covers it. `git check-ignore` confirmed the exact path is ignored.
- The private manifest contains only source references, county ATN/APN9, classification/status fields, and evidence dates. It omits raw situs/address, owner/contact data, distress amounts, full candidate IDs, provider payloads, and database secrets. The one excluded fixture is identified only via its private source identity/status.
- Audit generator: `scripts/mls-validation-round1/gate1-local-audit.js`. It reads only local source/certification artifacts, asserts source/population/category reconciliation, writes the ignored manifest, and emits aggregates only. It contains no database/provider/network execution path.
- Round 1 authorization/configuration was not changed: `executionAuthorized=false`, no seed or cohort fingerprint, all locks false, and no final selection.
- Provider calls: **0**. Database reads/writes: **0**. ATTOM SFTP, MLS, realtor, RentCast, DataTree, Google, and county services: **0**. Property selection: **0**. Economic/MAO analysis, Monte Carlo, and real-property PDFs: **0**.
- `scripts/mls-validation-round1/harness.test.js`: **10/10 pass**.
- Sprint 6.2 local source tests: **24/25 pass**. The remaining protected-baseline test fails on the existing modified `apps/web/src/app/App.jsx` hash (`405462…` versus the historical expected `251a34…`). That unrelated worktree change was preserved; no baseline or application file was changed by this audit.
- Combined run: **34 passed, 1 failed, 0 skipped**. The failure is a pre-existing protected-source baseline mismatch, so the complete regression gate is not green.

## Gate decision / stop

**GATE 1 BLOCKED.** Although the audited source data yields 80 non-excluded, county-resolved, high-priority SFR candidates, the allowed local evidence cannot establish cohort-wide PI canonical/durable identities or canonical duplicates; the current harness explicitly requires stable candidate/property identity. Do not call this an eligible pool of 80 or proceed to selection. Obtain the separately authorized, read-only private identity snapshot first.

No final six were selected. Stop for Stan/ChatGPT review. Do not begin Gate 2, provider enrichment, investment analysis, Monte Carlo, PDF generation, or MLS review.
