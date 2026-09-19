# Sprint 5 acquisition workflow

1. Open a saved Property or Deal and select `FIX_AND_FLIP` Acquisition Decision.
2. Select independent low, point or high exit evidence; analyst/sponsor exit assumptions remain separately labeled and are marked conflicting when outside the independent range.
3. Enter seller ask/auction constraints, encumbrances, condition/rehab, holding, financing and transaction costs explicitly.
4. Select one required-return definition and rate. The UI displays the formula, selected MAO, walk-away, target policy and completeness.
5. Review economics at ask, target and optional proposed price plus exit × rehab sensitivity and deterministic due-diligence questions.
6. Save an immutable decision snapshot. Replaying the same idempotency key returns the same ID; a changed assumption creates a new snapshot.

Encumbrances constrain seller/title negotiation and are not automatically added to purchase or project costs. Unknown is never converted to zero. Target offers and manual caps are analyst assumptions; a manual walk-away cap may only reduce MAO.
