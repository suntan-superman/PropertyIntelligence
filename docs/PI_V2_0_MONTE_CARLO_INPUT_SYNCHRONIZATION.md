# PI V2.0 — Monte Carlo Input Synchronization and Contextual Help

Date: 2026-10-15

## Result

The Risk stage now initializes each valid Most Likely value from the active underwriting scenario without running a simulation. Exit value, rehabilitation cost, renovation days and marketing days remain bound to their matching underwriting assumptions only while their provenance is `INHERITED`.

Every risk cell is labeled as one of:

- `Inherited from underwriting`
- `Illustrative preset`
- `Manual override`
- `Not set`

Manual and illustrative values are not silently replaced when underwriting changes. A legacy saved value without provenance is conservatively treated as manual. Scenario risk metadata, seed and engine output remain bound to the scenario ID and evidence snapshot through save/reopen and scenario switching.

## Behavior

- New scenarios default to reproducible seed `12345` and 1,000 iterations.
- Opening Risk fills only valid Most Likely values. Minimum and maximum remain unset.
- The illustrative preset remains optional, editable and explicitly labeled as uncalibrated.
- Applying the preset records all three bounds as illustrative and never runs Monte Carlo.
- Editing any bound records a manual override, including an explicitly cleared value.
- Invalid inherited underwriting input clears that inherited Most Likely value instead of retaining a stale number.
- The existing engine continues to enforce nonnegative ordered bounds, 100–20,000 iterations and a nonempty seed before simulation.
- Deterministic-preview and Monte Carlo responses are request-version bound, preventing an older preview response from replacing a newly completed simulation.
- Tooltips explain the seed, iterations, minimum, Most Likely, maximum, triangular distribution, rationale and Run Monte Carlo action through the shared accessible tooltip component.

## Certified-engine boundary

No file in the deterministic economics, MAO or Monte Carlo engine was modified. The new `valueOrigins` metadata is workspace state only; the existing analysis adapter continues to send the same numeric uncertainty distributions to the certified engine.

## QA

- Focused synchronization unit tests: 6/6 passed.
- Existing workflow compatibility tests: 6/6 passed.
- Complete relevant calculation, workspace, property-detail and tooltip regressions: 173/173 passed, 0 skipped.
- Browser synchronization QA: 24 checks passed.
- Covered initial inheritance, manual overrides, later underwriting changes, illustrative provenance, default seed, no automatic execution, keyboard tooltips, invalid bounds, deterministic reruns, save/reload, scenario switching and cross-scenario isolation.
- Provider calls: 0.
- Database connections/writes: 0.
- Deployment: 0.

Browser evidence is stored in `data/runtime/pi-v2-risk-sync/` under the latest `qa-*` directory.
