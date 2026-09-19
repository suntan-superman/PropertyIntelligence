# Sprint 5 MAO model

Sprint 5 implements `FIX_AND_FLIP` acquisition decisions only. The engine is deterministic and uses cents for final currency output. It does not use an ARV × 70% heuristic and does not make a recommendation.

For exit value `E`, fixed project costs `F`, purchase-price coefficient `k` and purchase price `P`:

`profit = E - F - kP`

`cashInvested = cashFixed + cashCoefficient × P`

The exact solver returns the greatest cent-rounded `P` satisfying the selected hurdle:

- Cash-on-cash: `profit / cashInvested ≥ r`
- Return on total project cost: `profit / totalProjectCost ≥ r`
- Profit margin on sale: `profit / E ≥ r`

Fixed, percent-of-purchase, percent-of-exit, per-day and per-month cost bases are supported. Financing remains manual and may be cash, fixed loan amount or LTV with explicit interest/points/fees. Unknown material costs are excluded from totals and mark the result `INCOMPLETE`; core missing inputs are `UNAVAILABLE`.

MAO is solved with exact linear algebra where the supplied inputs are linear in purchase price. The result records a nonnegative bound, raw solution, cent tolerance and iteration cap. The candidate is checked at the cent boundary so a displayed MAO satisfies the selected hurdle while the next cent does not.

Rehab is explicit item cost plus optional unallocated rehab and fixed or percentage contingency. `Base`, `+20%` and `+50%` rehab sensitivity cases are deterministic. Encumbrances are never included in investor costs; known numeric amounts are totaled separately and unknown amounts remain unknown.

Decision fingerprints include model version, exact input payload, hurdle, exit basis/value, rehab, costs, financing/holding, encumbrance observations and target policy.
