# Property Intelligence — Deal Analysis Cleanup Patch

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**Scope:** four surgical changes; no new architecture.

## Mission
Implement exactly:
1. Deal-aware deterministic diligence questions.
2. Separate acquisition closing costs from disposition closing costs for new/manual deals.
3. Unsupported holding sensitivity becomes **Unavailable**, never `$0`.
4. Default Evidence becomes concise **Evidence Summary + Additional Due Diligence Required**, with full detailed evidence preserved under expansion.

## Hard boundaries
Do not change RentCast, Netlify/runtime, Google Maps/comps, coordinates, identity/ambiguity/manufactured STOP rules, provider evidence, protected sponsor claims, Fantasia historical arithmetic, AVM semantics, persistence, Monte Carlo, Kern, or external APIs. No AI question generation and no new provider calls.

## Backward compatibility
Existing seeded/persisted deal artifacts must calculate exactly as before. Do not reinterpret Fantasia's legacy `escrow/closing` claim or split it into invented values. Preserve its original category/timing/provenance. New/manual deals use explicit acquisition/disposition fields. Add compatibility tests first.

## New/manual closing-cost inputs
Replace ambiguous `Escrow / closing ($)` with:

**Acquisition closing costs ($)** — buyer-side known title/escrow/recording/transfer/etc.; timing `UPFRONT / CASH INVESTED`.

**Disposition closing costs ($)** — seller-side known title/escrow/transfer/etc., excluding commission unless explicitly included; timing `DISPOSITION / DEDUCTED AT EXIT`.

Commission remains separate. Never double-count.

Blank = `UNKNOWN`/null. Explicit user-entered `0` = known zero with analyst provenance. Do not force fake zero to run incomplete analysis.

Normalize fields conceptually as `acquisitionClosingCosts` and `dispositionClosingCosts`, each with value/null, origin, status, timing and provenance. No calculations in React.

## Economics presentation
Group known modeled costs:

**Upfront / cash invested:** acquisition, repairs, acquisition closing costs, explicit upfront costs.

**Holding:** space/lot rent and other explicitly modeled recurring costs.

**Disposition:** commission, disposition closing costs, explicit disposition costs.

Excluded unknown costs lists only truly unknown categories. Never show missing as `$0`.

## Deterministic diligence question engine
Create/refactor reusable `src/analysis/diligenceQuestions.js` (or equivalent). No AI.

Each question: `id, category, question, trigger, materiality, relatedFields[], status`.

Status initially `UNANSWERED`.

Generate only relevant questions.

### Acquisition
If acquisition price lacks support:
`What supports the $X acquisition price? Please provide the purchase agreement, offer, assignment, auction result, or other acquisition evidence.`

If acquisition closing costs unknown:
ask expected buyer-side title/escrow/recording/transfer/other fees.

### Repairs / condition
If repair budget lacks support: ask what work is included and request contractor/itemized scope.
If contingency missing: ask contingency.
If condition evidence missing: ask photos/inspection.

### Resale / valuation
If projected resale exists: ask what supports $X.
If independent comps exist but sponsor/analyst comp basis absent: request supporting exit comps and distinguish closed sales from listings.
If projected resale lies outside independent range: specifically ask for evidence explaining divergence.
If inside range: still request support if absent, but do not call it conflict.

### Holding
If holding days supplied: ask basis/milestones.
If recurring costs missing, ask relevant taxes, insurance, utilities, financing/interest, maintenance/security, and HOA/space/lot rent only when applicable.

### Title/legal
If title/encumbrances missing: request current title/encumbrance evidence.
If security/lien structure exists: ask lien position/instruments as applicable.

### Manufactured only
Only for manufactured/mobile/park evidence: land/home ownership, community, lot rent/fees, transfer/buyer approval, age/occupancy/investor restrictions, comp tenure.

### Deal costs
If commission unsupported: ask basis/rate when material.
If disposition closing costs unknown: ask seller-side title/escrow/transfer/disposition fees.

## Questions UI
Deal Mode heading:
- sponsor context → **Questions for Sponsor**
- analyst-entered/no sponsor → **Due Diligence Questions**

Show `Draft only — not sent.`

Group nonempty categories: Acquisition; Valuation; Repairs & Condition; Holding Costs; Title / Legal; Manufactured / Community (conditional); Schedule; Other Deal Costs.

Property Mode hides questions.

## Holding sensitivity correctness
If no supported recurring holding-cost basis:
```text
Holding +30 days
Impact: Unavailable
Reason: Recurring holding costs not supplied
```
Machine: `status: UNAVAILABLE`, `profitImpact: null`, `reason: RECURRING_HOLDING_COSTS_UNKNOWN`.

Never rank it as zero impact.

If only partial recurring costs exist, calculate from those only and label:
`Partial — based only on supplied recurring holding costs.`
List excluded recurring categories.

Preserve Fantasia's existing supported/derived space-rent behavior and protected outputs.

## Sensitivity ranking
Exclude `UNAVAILABLE` from numeric ranking. Display separately under:
**Sensitivity not currently measurable**
- Holding period — recurring holding costs not supplied

Partial calculated items may rank with a `Partial` badge and basis explanation.

## Evidence Summary
Default Deal Mode Evidence becomes concise.

Example dynamic categories:
- Property identity — Available
- Property characteristics — Available
- Independent valuation — Available
- Comparable evidence — 15 properties
- Tax & assessment — Available
- Transaction history — Available

Use deterministic statuses: Available, Partial, Conflicting, Not available, Needs verification. No subjective “Strong” scoring.

## Additional Due Diligence Required
Prominently list material unresolved items relevant to current deal, e.g. acquisition support, acquisition closing costs, repair scope, contractor estimate, contingency, condition, insurance, utilities, financing, title/encumbrances, disposition closing costs, holding-period tax treatment.

Do not show manufactured-specific items for ordinary SFR.

Items may link/expand to related diligence questions.

## Detailed evidence
Preserve current grouped field-level evidence/provenance under **View detailed evidence**. Do not delete source details, machine statuses, dates, zoning/legal/property records.

Avoid duplication:
- Property Details = factual values
- Evidence Summary = evidence categories
- Additional Due Diligence = material unresolved items
- Detailed Evidence = exact field/source/status

## Reference behavior
Use current Mainsail workflow as UX reference but never persist/hard-code it. If unavailable in tests, use sanitized synthetic equivalent.

## Fantasia regression
Do not change its historical closing claim, $99K sponsor profit, 57.2% CoC, $180K break-even, preserved scenarios or sensitivity. Manufactured questions remain relevant.

Bass stays representation STOP. Joyce stays address ambiguous. Do not generate full diligence as if gates resolved.

## PDF
No redesign. Preserve fixture PDFs/arithmetic. New manual deals may use explicit closing fields if report model supports them. Minimal terminology compatibility only. Remote PDF availability unchanged.

## Tests
Zero provider calls.

Closing costs:
- acquisition closing cost increases upfront cash
- disposition closing cost reduces exit proceeds
- no double count
- blank unknown
- explicit 0 known zero
- Fantasia legacy outputs exact

Questions:
- acquisition support/closing
- repair scope/estimate/contingency/condition
- resale support and conflict-specific question
- timeline/holding costs
- title
- disposition cost
- manufactured conditional
- conventional SFR no park questions
- no empty categories
- Property Mode hides questions

Holding:
- no recurring costs => unavailable/null
- unavailable excluded from ranking
- partial recurring => partial impact
- Fantasia rent behavior preserved

Evidence:
- category aggregation
- material missing surfaced
- detailed evidence retained
- no raw duplication by default
- manufactured missing conditional
- no unsupported strength scoring

Regressions:
protected artifacts, Fantasia, Bass/Joyce, maps/comps, RentCast, Netlify/runtime/security/secret scan, PDF; zero calls.

## Visual QA
Review conventional SFR Deal Mode with new closing fields; populated questions; Evidence Summary; Additional Due Diligence; detailed evidence expanded; unavailable holding sensitivity; partial holding fixture; Fantasia questions; Bass/Joyce; desktop/narrow.

Create/update `docs/DEAL_ANALYSIS_CLEANUP_QA.md`.

## Execution
1. Preserve/hash protected artifacts.
2. Inspect deal/cost/question/evidence/sensitivity modules.
3. Add compatibility tests first.
4. Add acquisition/disposition closing support.
5. Update manual Deal form/economics.
6. Implement deterministic questions.
7. Populate question UI.
8. Correct holding unavailable/partial semantics.
9. Correct ranking.
10. Build concise Evidence Summary.
11. Build Additional Due Diligence.
12. Collapse/preserve detailed evidence.
13. Unit tests.
14. Full Sprint 3.2 regression.
15. UI visual QA.
16. PDF regression.
17. Security/secret scans.
18. Completion report.
19. STOP.

## Acceptance
GO only if new deals distinguish closing timing; blank remains unknown; explicit zero known; Fantasia unchanged; relevant deterministic questions populate; conventional SFR gets no park questions; unsupported holding is unavailable and unranked; partial holding is labeled; evidence summary is concise; unresolved material items surface; detailed evidence remains; Property Mode remains clean; maps/provider/runtime unchanged; zero provider calls; all tests/build/UI/PDF/security pass; protected artifacts unchanged.

## Completion report
Create `docs/DEAL_ANALYSIS_CLEANUP_COMPLETION_REPORT.md` with files changed, compatibility strategy, closing-cost changes, Fantasia reconciliation, question rules, holding sensitivity change, evidence-summary changes, conventional/manufactured behavior, QA/tests/PDF/security, protected artifacts, zero-call confirmation, limitations, recommended next user test, and STOP.

## Final instruction
This is a surgical correctness/UX patch. Do not start persistence or Monte Carlo.

Deal Mode should answer:
> Here are the deal assumptions. Here is how they compare with independent evidence. Here is the deterministic economics. Here is what happens under explicit scenarios. Here is what cannot yet be measured. Here is the material evidence still needed to underwrite the deal more completely.

**Stop after the completion report for Stan/ChatGPT review.**
