# Property Intelligence — Sprint 5
## Acquisition Decision & Maximum Allowable Offer Engine

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**Persistence:** production-certified Supabase PostgreSQL via Netlify Functions
**Strategy:** FIX_AND_FLIP only. Buy & Hold, BRRRR and Wholesale are future work.

## Mission
Extend PI from “Given this purchase price, does the deal work?” to:

> Given property evidence, exit value, condition/rehab, project costs, known encumbrances and my explicit required return, what is the maximum price I can afford to pay?

Deliver deterministic Maximum Allowable Offer (MAO), Walk-Away Price, Target Offer, seller-ask/proposed-offer economics, negotiation headroom, encumbrance gap, multiple exit-basis MAOs, exit×rehab sensitivity, and immutable Acquisition Decision Snapshots/history.

Every saved decision must reproduce the exact evidence, assumptions, hurdle definition and model version used at that moment.

## Critical accounting rule
Keep separate:

**Seller/property encumbrances:** mortgage payoff, second/HELOC, delinquent taxes, tax/judgment/HOA/mechanics liens, other encumbrances. They constrain title/seller proceeds/negotiation; they are NOT automatically costs added on top of investor purchase price.

**Investor acquisition costs:** purchase price, buyer title/escrow/recording/transfer, inspection/appraisal, financing fees, other buyer-paid costs.

**Project/exit costs:** rehab/contingency, taxes/insurance/utilities/interest/maintenance/security/HOA/space rent during hold, commission, seller closing/transfer/concessions, other disposition costs.

Never double-count.

## Hard boundaries
Allowed: Fix & Flip deterministic MAO, manual encumbrances, manual condition/rehab, explicit hurdle selection, seller ask/auction minimum, target-offer policy, multiple exit bases, persisted decision snapshots, migration 002, UI/history and safe PDF integration.

Forbidden: rental/BRRRR/wholesale math, Monte Carlo, AI/photo repair estimation, mortgage/lien/tax scraping, title provider, Kern ingestion, inferred payoff/liens/taxes/condition/repairs/financing/seller motivation, investment recommendation, authoritative `ARV × 70% - repairs`, auth, or mutation/deletion of historical snapshots.

Automated QA requires zero provider calls.

## Explicit return hurdles
Support:
1. `CASH_ON_CASH = modeledProfit / cashInvested`
2. `RETURN_ON_TOTAL_PROJECT_COST = modeledProfit / totalProjectCost`
3. `PROFIT_MARGIN_ON_SALE = modeledProfit / modeledSaleProceeds`

No IRR in Sprint 5. Persist hurdle type, percentage and formula/model version. UI explains selected definition.

## MAO definition
MAO is the highest purchase price satisfying the selected hurdle under the selected exit assumption and modeled costs.

Solve the actual deterministic underwriting model backward; never use a fixed 70% heuristic as authority.

Prefer exact algebra where valid. If purchase-price-dependent costs require numerical solution, use deterministic bounded solving with explicit bounds, tolerance, iteration cap and tests.

Cost bases may support only what is needed:
`FIXED`, `PERCENT_OF_PURCHASE`, `PERCENT_OF_EXIT`, `PER_DAY`, `PER_MONTH`.

No general expression language.

## Exit bases
Calculate where available:
- `INDEPENDENT_LOW`
- `INDEPENDENT_POINT`
- `INDEPENDENT_HIGH`
- `ANALYST_EXIT`
- `SPONSOR_EXIT`

Each result retains exit basis/value, evidence snapshot ID, evidence status and provenance.

If analyst/sponsor exit is outside independent range, calculate it but mark conflict and show independent alternatives. Never call aggressive-assumption MAO evidence-based.

Default evidence display includes Low, Point and High MAO; never silently select one as “correct.”

## Walk-Away
Default `Walk-Away Price = selected MAO`.

Optional `manualWalkAwayCap` may only tighten:
`effectiveWalkAway = min(MAO, manualCap)`.

Never allow manual override to increase MAO.

## Target Offer
Never invent a negotiation starting point. Policies:
- `MANUAL`
- `FIXED_DISCOUNT_FROM_MAO`
- `PERCENT_DISCOUNT_FROM_MAO`

Persist policy and target. Target is an analyst negotiation assumption, not independent evidence.

## Seller ask / constraints
Optional provenance-aware:
- sellerAskingPrice
- auctionMinimum
- otherAcquisitionConstraint

Calculate `MAO - sellerAsk` and use neutral copy:
- ask below MAO by $X
- ask exceeds MAO by $X

No offer submission.


## Encumbrances
Types:
`FIRST_MORTGAGE, SECOND_MORTGAGE, HELOC, DELINQUENT_PROPERTY_TAX, TAX_LIEN, JUDGMENT_LIEN, HOA_LIEN, MECHANICS_LIEN, OTHER`.

Fields:
`type, amount|null, amountStatus, source, asOfDate, payoffVerified, priorityKnown, notes`.

Amount status:
`VERIFIED, DOCUMENTED, REPORTED, ESTIMATED, UNKNOWN`.

A reported mortgage balance is not a verified payoff.

Calculate:
- knownEncumbranceTotal from supplied numeric values only
- unknownEncumbranceCount
- encumbranceGap = MAO - knownEncumbranceTotal

Unknown never becomes zero.

If known encumbrances exceed MAO:
`Known encumbrances exceed the selected MAO by $X. Meeting the selected return hurdle would require resolution, reduction, assumption, payoff restructuring, or other treatment of at least $X of known obligations, subject to title/legal verification.`

Do not say impossible and do not give legal advice.

If seller ask exists:
`apparentSellerEquityAtAsk = sellerAsk - knownEncumbranceTotal`
label `Apparent equity before unverified obligations and transaction costs`.

## Condition / rehab
Manual categories:
`ROOF, HVAC, PLUMBING, ELECTRICAL, FOUNDATION, STRUCTURAL, KITCHEN, BATHROOMS, FLOORING, INTERIOR_PAINT, EXTERIOR_PAINT, WINDOWS_DOORS, APPLIANCES, EXTERIOR, LANDSCAPING, PEST_TERMITE, PERMITS_CODE, TRASH_OUT, OTHER`.

Each:
`conditionStatus, estimatedCost|null, source, notes`.

Status:
`NOT_ASSESSED, GOOD, MINOR, MODERATE, MAJOR, REPLACE, UNKNOWN`.

Never infer cost from status.

`baseRehab = sum(explicit item costs)`.
Support additional unallocated rehab plus fixed or percentage contingency.

If work is indicated but cost missing: `Condition issue identified without cost estimate.`

Sources may include analyst inspection, contractor estimate, sponsor estimate, inspection report, photo review, other. No upload pipeline this sprint.

## Holding costs
Reuse existing model: explicit hold days plus taxes, insurance, utilities, financing interest, HOA, lot/space rent, maintenance, security, other. Fixed/per-day/per-month where appropriate.

Unknown stays unknown. MAO may calculate as INCOMPLETE; never pretend fully burdened.

## Financing
Manual only:
- cash vs financed
- loan amount or LTV
- interest rate
- points/origination
- financing fees
- interest basis
- expected duration

Incomplete financing => unknown financing cost and incomplete MAO. No exotic structures.

## Acquisition/disposition costs
Reuse Sprint 4 separation.

Acquisition: closing, inspection, appraisal, buyer title/escrow, financing fees, other.
Disposition: commission, seller title/escrow, transfer, concessions, other.

Never double-count.

## MAO completeness
Every result:
- `COMPLETE`
- `INCOMPLETE`
- `UNAVAILABLE`

COMPLETE only when material Fix & Flip cost categories are supplied or explicitly not applicable.
INCOMPLETE when math can run but material unknown costs remain.
UNAVAILABLE when a core input is absent.

Prominent warning for incomplete results.

Core required inputs:
- exit value
- hurdle type/rate
- rehab amount OR explicit no-rehab assumption
- acquisition-cost treatment
- disposition-cost treatment

Holding/financing unknown may yield INCOMPLETE, not zero.

## Deterministic MAO sensitivity
Matrix: Exit basis × Rehab case.

Rehab:
- Base
- +20%
- +50%

Exit where available:
- Independent Low
- Independent Point
- Independent High
- Analyst/Sponsor

No probability language.

## Economics at Ask / Target / Proposed
At seller ask, Target Offer and optional Proposed Offer, run existing deterministic engine and show modeled profit, selected return metric, required hurdle and difference from MAO.

Neutral labels:
`Meets selected hurdle under modeled assumptions`
`Does not meet selected hurdle under modeled assumptions`

No recommendation.


## Persistence — migration 002
Create `002_acquisition_decisions.sql`. Never modify 001.

### acquisition_decisions
Append-only:
`id uuid PK, property_id FK, deal_id nullable FK, evidence_snapshot_id FK, analysis_snapshot_id nullable FK, strategy, decision_version, created_at, hurdle_type, hurdle_rate, selected_exit_basis, selected_exit_value, calculated_mao, manual_walkaway_cap nullable, effective_walkaway_price, target_offer nullable, target_policy_payload jsonb, seller_asking_price nullable, auction_minimum nullable, known_encumbrance_total nullable, unknown_encumbrance_count, encumbrance_gap nullable, cost_completeness, inputs_payload jsonb, outputs_payload jsonb, warnings_payload jsonb, model_fingerprint`.

### property_encumbrances
Historical:
`id, property_id FK, evidence_snapshot_id nullable FK, type, amount nullable, amount_status, source, as_of_date nullable, payoff_verified, priority_known, notes nullable, created_at, superseded_at nullable`.

### property_condition_assessments
`id, property_id FK, deal_id nullable FK, assessment_date, source, created_at`.

### property_condition_items
`id, assessment_id FK, category, condition_status, estimated_cost nullable, source, notes nullable, created_at`.

Use restrictive FKs consistent with Sprint 4. Historical/soft semantics. No destructive normal workflow.

## Acquisition Decision History
Saved Property/Deal shows date, strategy, hurdle, exit basis/value, MAO, walk-away, target, ask, known encumbrances and completeness.

Opening an old decision uses exact historical evidence/inputs. Never substitute latest AVM.

## UI — Deal Mode
Add **Acquisition Decision**.

Order:
1. Strategy
2. Exit Evidence
3. Seller Ask / Acquisition Constraint
4. Encumbrances
5. Condition & Rehab
6. Holding / Financing / Transaction Costs
7. Required Return
8. MAO Results
9. Target / Walk-Away
10. Sensitivity
11. Due Diligence
12. Decision History

Do not overload Property Mode. Property Mode may offer `Create Deal / Acquisition Analysis`.

## Primary result
Conceptually:
```text
ACQUISITION DECISION — FIX & FLIP

Selected hurdle       Cash-on-Cash ≥ 20%

Independent Low MAO       $...
Independent Point MAO     $...
Independent High MAO      $...
Analyst Exit MAO          $...

Selected MAO              $...
Walk-Away Price           $...
Target Offer              $...
Seller Ask                $...

Known Encumbrances        $...
Encumbrance Gap           $...

Completeness              INCOMPLETE
```

If incomplete, list missing material categories directly below.

## Negotiation visual
If target/MAO/ask exist:
`Target Offer ---- MAO/Walk-Away ---- Seller Ask`
with proportional positioning. Do not use recommendation-style “buy” coloring.

## Due diligence
Extend deterministic questions for:
- mortgage amount not payoff verified
- unknown lien priority
- unknown taxes/liens
- stale/estimated/reported encumbrances
- condition work without cost
- no contractor support
- no contingency
- incomplete holding costs
- incomplete financing
- unsupported/conflicting exit
- title not verified

No AI.

## Decision fingerprint
Include engine version, hurdle definition, evidence snapshot ID, exact exit basis/value, rehab/contingency, costs, financing/holding, encumbrance observation IDs, seller ask/constraints and target policy.

Old decision must reproduce outputs.

## PDF
Do not redesign report. Add an Acquisition Decision page/section only if current local renderer can consume the new model safely.

Include hurdle definition, exit MAOs, selected MAO/walk-away/target, ask, known encumbrances/unknown count, rehab, completeness and warnings.

Never call it an investment recommendation. If layout risk threatens core Sprint 5, defer PDF addition explicitly.

## API
Extend shared API for encumbrances, condition assessments, unsaved decision calculation, save decision, history and decision-by-ID.

Use existing persistence, UUID validation, transactions, idempotency and sanitized errors.

Calculation may return unsaved deterministic preview. Save persists immutable snapshot.

## Idempotency
Same decision + same idempotency key returns existing ID. Material assumption change creates new snapshot.


## Migration/deployment gates
Use certified Sprint 4.1 discipline:

1. hash/protect existing artifacts
2. migration 002 compatibility review
3. local isolated schema rebuild with 001+002
4. migration/checksum/schema QA
5. unit/domain tests
6. Supabase preflight/status
7. apply 002 exactly once
8. remote schema certification
9. non-destructive tagged persistence QA
10. full regression/security
11. deploy preview
12. preview cold-invocation decision save/reopen/history/idempotency
13. STOP for production authorization
14. production deploy only after explicit approval
15. controlled production decision smoke
16. final certification
17. STOP

Never rerun 001. Never reset/truncate Supabase.

## Tests — MAO math
For each hurdle:
- exact threshold solution
- $1 below/above behaves correctly within documented currency rounding
- fixed costs
- % purchase costs
- % exit costs
- per-day/month costs
- explicit zero vs unknown
- incomplete/unavailable
- invalid negative/zero domains
- high-hurdle edge cases
- deterministic reproducibility
- no NaN/Infinity
- documented cent rounding

## Tests — encumbrances
- known total uses only supplied numeric amounts
- unknown not zero
- reported vs verified payoff preserved
- positive/negative gap
- no double-count into investor costs
- apparent equity only when inputs exist

## Tests — rehab
- category sum
- fixed/% contingency
- issue-without-cost warning
- explicit no-rehab assumption
- missing rehab behavior
- provenance

## Tests — exits
- low/point/high
- analyst/sponsor
- conflict status
- independent MAOs
- historical evidence linkage

## Tests — persistence
- migration 002
- immutable acquisition decision
- old decision unchanged after new
- history
- encumbrance history
- condition history
- idempotency
- transaction rollback
- separate function/DB connections
- parent archive does not destroy decisions

## Golden deterministic fixtures
Create synthetic, hand-reconciled fixtures; do not hard-code live Mainsail data:
1. simple all-cash complete flip
2. financed flip
3. incomplete holding costs
4. encumbrances below MAO
5. encumbrances above MAO
6. exit conflict
7. rehab issue without cost
8. purchase-price-dependent cost
9. explicit-zero costs
10. extreme mathematical boundary

## Regression
All Sprint 4.1 behavior remains green:
- production persistence semantics
- Fantasia historical arithmetic
- Bass/Joyce gates
- live workflow
- Maps
- PDF
- Netlify runtime
- Supabase TLS
- credential scans
- zero provider calls in automated QA

No changes to existing analysis snapshots/formulas except shared pure primitives where outputs remain byte/value compatible.

## Documentation
Create:
- `docs/SPRINT5_MAO_MODEL.md`
- `docs/SPRINT5_ACQUISITION_WORKFLOW.md`
- `docs/SPRINT5_SCHEMA.md`
- `docs/SPRINT5_QA.md`
- `docs/SPRINT5_COMPLETION_REPORT.md`

Document formulas, solver, rounding and examples.

## Acceptance criteria
GO only if:
- MAO derives from deterministic underwriting, not 70% heuristic
- all 3 hurdle definitions are mathematically correct
- encumbrances never automatically become investor costs
- unknown obligations/costs never become zero
- low/point/high and analyst/sponsor MAOs are distinct/traceable
- Target Offer is explicit policy
- manual Walk-Away cap cannot increase MAO
- rehab/contingency explicit
- ask/target/proposed economics work
- incomplete MAO clearly labeled
- decision snapshots immutable/reproducible
- old decisions remain tied to historical evidence
- migration 002 passes
- full regressions pass
- preview cold-invocation persistence passes
- zero provider calls in automated QA
- production only after separate authorization

## Completion report
`docs/SPRINT5_COMPLETION_REPORT.md` includes files, migration 002, formulas, solver/rounding, hurdles, completeness, encumbrance treatment, rehab, sensitivity, persistence/history, diligence, hand reconciliation, tests, schema certification, preview results, production only if authorized, provider calls, protected artifacts, limitations, next step, STOP.

## Final principle
The engine does not answer “Should I buy this property?”

It answers:

> Under these explicitly stated evidence inputs, costs and required-return definition, this is the highest purchase price at which the modeled transaction still satisfies the selected hurdle.

Then it shows what is known, conflicting, incomplete and unresolved.

**STOP after preview certification for Stan/ChatGPT review before production.**
