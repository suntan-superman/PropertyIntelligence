# PI Custom Notification Dialog

Date: 2026-10-15

## Result

Property Intelligence now uses one reusable, application-owned notification dialog for destructive and replacement actions in the investment workspace. The dialog follows PI's visual language and supports keyboard focus, Escape cancellation, focus trapping, focus restoration, backdrop cancellation, and accessible dialog semantics.

The GNZ Marketing source was inspected for the referenced pattern. Its relevant interactions still use native `window.confirm`, so no reusable GNZ dialog implementation was copied.

## Native reload warning

The screenshot showed the browser-controlled `beforeunload` confirmation. Browsers do not allow applications to restyle that prompt. PI's investment drafts are already persisted to local storage and recovered after a reload, so the redundant `beforeunload` hook was removed. Browser QA confirmed that a populated draft survives reload with zero native dialogs.

## Covered actions

- Reset the current browser draft.
- Apply the illustrative expense preset over populated assumptions.
- Replace populated risk distributions with values derived from current assumptions.

Each prompt states what will change and whether saved revisions remain unchanged.

## Verification

- Focused unit/regression tests: 20/20 passed, 0 skipped.
- Custom-dialog browser QA: 10/10 passed; native dialogs observed: 0.
- Milestone 1.1 browser regression: 44/44 passed.
- Production Vite build: passed.
- Provider calls: 0.
- Database writes: 0.
- Deployment: none.

Visual evidence: `data/runtime/pi-custom-notification-dialog/qa-oWPQ6j/custom-reset-dialog.png`

