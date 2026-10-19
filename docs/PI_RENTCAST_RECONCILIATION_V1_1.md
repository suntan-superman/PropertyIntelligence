# RentCast Reconciliation V1.1

2026-10-09 — local offline implementation and replay. Final status: **MORE DEVELOPMENT REQUIRED**.

Rule C works against the retained real evidence, and its focused tests pass. Full certification is withheld because an existing Sprint 6.2 protected-baseline regression fails on `apps/web/src/app/App.jsx`. The file has the same hash it had before this task; neither it nor its baseline was changed. See [QA](PI_RENTCAST_RECONCILIATION_V1_1_QA.md) and [remaining gaps](PI_RENTCAST_RECONCILIATION_V1_1_REMAINING_GAPS.md).

## Implementation scope

Implemented strategy: `KERN_EXACT_SOURCE_APN_CROSSWALK_V1`.

All new code is under `scripts/rentcast-reconciliation-v1-1/`. No production application route, provider adapter, canonical repository, migration, review UI or persistence system was changed. The strategy is available to the offline replay only; it is not production-enabled.

| Component | Role |
| --- | --- |
| `prepare.js` | Verify historical evidence and preserve existing source/packet/decision/report hashes before work |
| `source.js` | Verify the fixed approved county package fingerprints and original evidence bindings; scan real DBFs with the existing reader; retain minimal matching rows and source references |
| `reconcile.js` | Versioned, deterministic Rule C strategy and independent historical/current/review/persistence states |
| `reconcile.test.js` | Focused synthetic positive/negative controls; no live acquisition |
| `replay.js` | Read the three original evidence records; evaluate twice deterministically; write only new versioned local results |
| `qa.js` | Run the new strategy tests or complete selected existing regression files without filtering/skipping tests |

Existing interfaces reused:

- `scripts/rentcast-controlled-pilot/core.js`: exact/format-only APN9 comparison, county context, address-component comparison, hashing/sealing conventions and exclusive new-file writes.
- `scripts/sprint6_2/dbf.js`: existing bounded DBF reader and schema/row offsets. Existing local county package, dictionary and crosswalk evidence remain authoritative inputs.
- Existing review conventions: fingerprint-bound evidence, separate provider identifiers, null approval and closed persistence. No original packet was regenerated.
- `src/sources/rentcast/normalizer.js` was inspected but not invoked: it creates a domain Property/evidence model unnecessary for this offline reconciliation. The existing acquisition client and builder were inspected/reused in the prior pilot; neither is called here.

## Evaluation order and exact source rule

1. Validate original mapping/evidence bytes, seals and candidate binding, approved source fingerprints/edition, complete source-table scan coverage, row references and jurisdiction.
2. Evaluate the **unchanged existing exact/format-only APN9 comparison** first.
3. Only if APN9 comparison fails, try Rule C: remove ordinary spaces/hyphens from a string provider identifier for comparison, require exactly eight digits and look up the actual stored county `APN` field.
4. Retrieve **the APN9 stored in that unique source row**. Require it to equal the candidate's original APN9, with exactly one relevant land assessment containing the original ATN.
5. Enforce source/identity contradictions, history, existing address/type checks and separate review gates. Do not infer current identity freshness.

No ATN equivalence, integer conversion, leading-zero removal/addition, slicing, calculated check digit, address-only identity match or unsupported suffix mapping was implemented. The existing APN9 code is byte-for-byte unchanged and wins before Rule C when it matches.

### Source and cardinality requirements

Approved source is the fingerprinted Kern County **2026 Final** package. The pinned parcel metadata defines APN/APN9 and APN9's join role. Archive, parcel, land, history, event-domain and metadata fingerprints are checked. Selected source rows retain their file fingerprint, one-based ordinal, byte offset and projected-field fingerprint; projected data excludes owner/contact fields.

The loader re-scanned all **424,125 parcel rows**, **426,054 land-roll rows** and **532,878 history rows**. Land census independently reconciled to **426,054 ATNs**, **424,125 APN9s** and **1,095 repeated APN9 groups**. No selected candidate is treated as unique merely because only one candidate was requested.

Rule C rejects duplicate matching APN rows, mismatched APN9, more than one relevant land row for APN9, duplicate/missing original ATN, incompatible source-row identity, wrong county/state, unverified source relationship, existing link/property conflicts and invalid provenance. It does not pick an assessment from the 1,095 multi-ATN groups.

## Historical versus current identity

The result contract is `RENTCAST_RECONCILIATION_V1_1`; each private result has a deterministic reconciliation fingerprint. It contains:

- Original provider assessor ID, external RentCast ID, county ATN/APN9 references, and matched source APN when present. Original values remain strings and unchanged.
- Source edition/fingerprints, metadata references, source-row references, evaluation order, legacy APN9 outcome and Rule C outcome.
- Cardinality checks, existing address/type agreement, contradictions and history findings.
- Independent historical crosswalk, current identity freshness, analyst-review readiness, approval and persistence fields.

For this sprint, current freshness is always `CURRENT_IDENTITY_FRESHNESS_UNVERIFIED`; no separately authorized current county evidence exists here. Neither today's date, RentCast retrieval time nor a blank inactivation field changes that status.

Missing/ambiguous history, known inactivation, unresolved split/merge/transfer or unknown history meaning prevent a positive historical certification or quarantine it. The accepted snapshot history case does not claim current activity. No chains are inferred. All results retain `EXCEPTION_REVIEW_REQUIRED`, routine eligibility false, approval null, persistence authorization false and no Round 1 selection. Attempts to request automatic approval or persistence are rejected.

## Real-evidence offline replay

| Measure | RC-P1 | RC-P2 | RC-P3 |
| --- | --- | --- | --- |
| Original strict pilot classification | APN_CONFLICT, unchanged | APN_CONFLICT, unchanged | APN_CONFLICT, unchanged |
| Existing APN9 comparison | APN_CONFLICT | APN_CONFLICT | APN_CONFLICT |
| Rule C | NOT SATISFIED | PASS | NOT SATISFIED |
| New historical classification | IDENTIFIER_RELATIONSHIP_UNRESOLVED | DOCUMENTED_HISTORICAL_APN_CROSSWALK | IDENTIFIER_RELATIONSHIP_UNRESOLVED |
| Exact APN row / stored APN9 / expected ATN | Not established under Rule C | PASS / PASS / PASS | Not established under Rule C |
| Observed ATN relationship | Diagnostic only | Not used as an alternate rule | Diagnostic only |
| Address checks | Suffix discrepancy retained | Agree | Agree |
| Current freshness | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Review tier | Exception | Exception | Exception |
| Analyst approval / persistence | None / false | None / false | None / false |

RC-P2 retrieves the stored APN9 from the exact APN source row; it does not manufacture the ninth digit. Its one-row forward/reverse relationships, original Assessor row and history evidence agree. The historical discrepancy is explained only in the new versioned result. It is not promoted to `IDENTITY_VERIFIED`.

RC-P1 and RC-P3 have eleven-digit provider representations after formatting removal. Rule C requires an eight-digit source APN. Their observed ATN matches remain diagnostic and unresolved; RC-P1's `AV` / `Ave` difference is unchanged.

## Artifacts and preservation

Private outputs are gitignored under `data/runtime/rentcast-reconciliation-v1-1/`, including preservation inventory, QA logs and:

`replay-2026-10-09T22-29-15.713Z/`

That replay directory contains three versioned results, the minimal source-evidence projection and an offline manifest. Each result was evaluated twice with identical fingerprints and no input mutation. Original HTTP receipts, minimum responses, evidence/packet seals, request ledger, candidate mapping, crosswalk investigation, decisions and historical reports are unchanged. All **3,134 pre-task protected file hashes** passed after replay and tests. No rebaseline was performed.

The existing six regression files ran without skipping tests: **124/125 passed**, with the pre-existing baseline mismatch. The focused strategy suite passed **40/40**. Aggregate acceptance is therefore **164/165**, not a full certification PASS.

Provider calls **0**; database connections/writes **0**; MLS access **0**; analyst approvals **0**; durable Properties **0**; Round 1 selections **0**; deployments **0**. No `.env`/provider credential loader was called. Source rights remain those already documented; no Google content was repurposed.

**STOP FOR STAN/CHATGPT REVIEW.** No real approval, persistence or production reconciliation is enabled.
