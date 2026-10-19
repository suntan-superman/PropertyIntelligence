# PI streamlined address review V1.2

**READY FOR HUMAN REVIEW**

Completed October 8, 2026 PDT / October 9 UTC. Local development, existing permitted evidence and offline/synthetic QA only. No new lookup, database access, real decision, Property, canonical resolution, deployment or Round 1 selection.

## What changed

Routine review replaces repetitive entry with a compact proposed-address/evidence summary, genuine assembled references, an explicit component-evidence attestation, a decision and personal reviewer attestation. **Confirm address evidence** records the existing local `APPROVED` outcome only after server-side validation. No approval or checkbox is preselected. Notes are optional for routine confirmation; Needs more evidence and Reject still require a rationale. A default confirmation note records the actual explicit action, not an invented investigation or document.

**View supporting evidence** expands the original county/provider comparison and source-specific component references. **Detailed component review** remains available; opening it switches out of compact mode and clears the pending approval/attestation so manual edits cannot be silently ignored. Exception and insufficient-evidence cases open the detailed controls by default. **Use suggested components** still copies only an unverified draft, now with assembled source references.

The existing local reviewer, access code, canonical validator, decision model, packet checks, county identities and lineage safeguards are reused. There is no new identity architecture or provider adapter.

## Deterministic assessment

`review-assessment.js` derives the tier from evidence, never the pilot code:

| Tier | Rule |
| --- | --- |
| `ROUTINE_REVIEW` | Unique exact county identity; coherent exact/unique Assessor relationship; complete permitted component evidence; street number/name/city agreement; consistent state/any existing ZIP; one rooftop result; no true/malformed partial-match indication; no canonical conflict, inactive/existing linked identity or outstanding county quality flag; source provenance present |
| `EXCEPTION_REVIEW` | Permitted complete proposal exists but one or more consistency, identity, provenance, precision, ambiguity or quality checks fail |
| `INSUFFICIENT_EVIDENCE` | Required evidence or complete components, including ZIP, are unavailable, expired, integrity-invalid or not reusable in the reviewer's scope |

Reasons and required actions accompany every nonroutine tier. The retained-evidence gate already withholds multiple-result/incomplete provider responses; those cases fail closed as insufficient evidence in the real adapter. The pure assessment also explicitly rejects multiple/partial/low-precision results as routine when such permitted diagnostic evidence is supplied. Missing provenance remains an exception; nonexistent source references are not fabricated.

Street comparison accepts exact returned long/short routes and the previously documented terminal `WY`/`Way` equivalence only. County `CI` is not translated to Circle/Cir. State consistency uses the existing Kern/California jurisdiction and any explicit county state, not inferred postal verification. A missing partial-match field remains absent, not a returned false. ZIP supplied only by Google remains uncorroborated by county data.

County/Assessor facts remain **as-of the certified local packet snapshot**. Acquisition date and provider data freshness are not invented. The original provider receipt/deadline determines temporary-use availability, not the age of underlying Google records. This is an analyst-review tier, not a fresh database, parcel, postal or title certification. Fresh identity/conflict checks remain a separate future persistence gate.

## Actual read-only pilot assessment

At **2026-10-09T05:57:34.377Z**, the original evidence remained permitted:

| Pilot | Derived tier | Reason | Actual decision |
| --- | --- | --- | --- |
| IP-P1 | EXCEPTION_REVIEW | County acreage-quality flag | Unreviewed |
| IP-P2 | ROUTINE_REVIEW | All current review checks pass | Unreviewed |
| IP-P3 | EXCEPTION_REVIEW | Acreage flag; unresolved suffix and local comparison | Unreviewed |

These are point-in-time local results. Once the unchanged original deadline passes, the affected case becomes **INSUFFICIENT_EVIDENCE** regardless of its POC success. No request is repeated. Synthetic examples, prominently labeled, demonstrate the workflow without extending real permissions.

## Server safeguards and provenance

The compact request carries only the pilot/packet/decision revision, selected outcome, named reviewer/attestation, notes, explicit group-review acknowledgment and pinned suggestion reference. The server rejects injected component fields, recomputes the current tier and source references, then calls the existing detailed validator. It checks again immediately before atomic local decision replacement. A forged compact request cannot move an exception into routine review.

Only an explicit group confirmation of all displayed component evidence maps those components to VERIFIED for a routine approval. Provider return or tier assignment alone never does. Personal attestation, packet integrity, revision concurrency, evidence availability and all existing approval rules still apply. Detailed exception review retains individual verification, contradiction assessment, changed-address explanation and applicable acreage acknowledgment/notes.

Assembled references cite the actual Assessor source row/date/hash and packet hash for supplied county components; Google references cite the component, original retrieval/deadline and evidence hash. They never invent a document/page or claim county ZIP support where absent. Routine saved decisions retain structured component-source metadata and the assessment fingerprint. No Google-derived address becomes independently sourced through approval.

## History and retention

The API/UI now separately shows historical outcome/reviewer/time, supporting-evidence availability, reuse permission and local operational effectiveness. Expired Google-dependent decisions remain auditable while their content is hidden and effectiveness **SUSPENDED**. Physical history is not erased. Independent references typed by an analyst are not represented as independently revalidated availability or permissions; those statuses are unknown pending evidence review.

No canonical identity is created or activated by this interface. Shared canonical reuse is **SHARED RETENTION NOT AUTHORIZED**. See [retention and durable-evidence design](PI_ADDRESS_EVIDENCE_RETENTION_DESIGN.md) for source separation, unchanged deadlines and cleanup requirements.

## Launch

```powershell
Set-Location C:\Users\sjroy\Source\PropertyIntelligence
node scripts/identity-resolution-pilot/review-server.js --reviewer "Stan Roy"
```

Open **http://127.0.0.1:4318/** and enter the private terminal access code. Stop the prior listener in its existing terminal before restarting this revision; browser refresh alone does not reload server modules. No existing listener was terminated by QA. Do not expose a tunnel or share the access code. Google suggestions remain scoped to Stan Roy in the unchanged private access manifest. Live **Verify Address** remains disabled with no executable lookup route.

## Files and verification

Changes are restricted to local reviewer scripts/UI/tests and these documents. New modules: `review-assessment.js`, `streamlined.test.js`, `streamlined-ui-qa.js`, and local `streamlined.css`. Small changes extend the existing store/DTO, suggestion metadata, UI and synthetic fixtures. No production import, dependency, environment, database schema or protected-baseline change.

**105/105 unit/regression tests PASS, 0 skipped**; original review and suggestion QA pass; new Playwright checks pass at **1440 / 768 / 390px**. Synthetic screenshots and accounting: [QA report](PI_STREAMLINED_ADDRESS_REVIEW_QA.md).

**STOP FOR STAN/CHATGPT REVIEW.** No real approval, identity persistence, new provider lookup or six-property selection was performed.

```text
PI STREAMLINED ADDRESS REVIEW V1.2

Review-tier classifier: PASS
Routine review: PASS
Exception review: PASS
Evidence provenance: PASS
Retention enforcement: PASS
Analyst approval safeguards: PASS
Historical decision preservation: PASS
Desktop/tablet/mobile QA: PASS
Unit tests: 105 / 105
Actual analyst approvals: 0
New provider calls: 0
Production database writes: 0
Properties created: 0
Round 1 properties selected: 0
Final classification: READY FOR HUMAN REVIEW
```
