# PI V2.4.1 Unified Save as Property Actions

## Implementation

All promotion entry points now use `SaveAsPropertyButton` and the existing V2.4 server promotion API. The shared workflow performs the server-side preview and duplicate check, displays the V2.4 identity/evidence confirmation, submits the authenticated CSRF-protected save, and changes the UI to Saved Property only after the server returns the confirmed durable record.

The action is available from:

- Guided Analysis Step 1 retained-subject result.
- The persistent Guided Analysis property header.
- My Workspace > Research.
- My Workspace > Analyses / Deals.
- Preliminary cards under Guided Analysis > Recent Research.

My Workspace > Research provides Save as Property, Continue Analysis and View Research for preliminary records. Saved records provide Open Property. Analyses / Deals now shows Preliminary, Saved or Archived independently of identity verification and preserves the existing scenario actions and revision labels.

Recent Research is collapsed by default. Opening or selecting a research card does not promote it. A separate explicit Save as Property action is required.

After a confirmed save, a shared browser event carries only the server-returned durable record to the mounted Guided Analysis and workspace views. This updates Save as Property to Open Property/Saved Property immediately without pretending that a pending or failed write succeeded.

## Persistence and security behavior

- Every preview, save and durable-property read remains behind the existing Firebase session, role and organization authorization.
- The browser does not access Firestore directly and cannot supply organization ownership, timestamps, creator/editor IDs or stable property IDs.
- The existing organization-scoped transactional address/APN reservations remain the source of duplicate protection, including concurrent clicks and sessions.
- Evidence snapshot references, scenario IDs/revisions and report references are linked without rewriting historical evidence.
- A Firestore error is displayed as a failed save. The client does not create a browser-local substitute or emit the promotion event.
- An existing match opens the duplicate dialog and offers Open Existing Property; uncertain matches are not merged.

## Local certification — 2026-10-18

- `npm run pi:v2.4.1:save-actions:test` — PASS, 51/51 tests.
- `npm run pi:v2.4.1:save-actions:qa` — PASS, 27 browser checks.
- `npm run pi:v2.3a:auth:test` — PASS, Firebase authentication/authorization regression suite.
- `npm run web:build` — PASS.
- Live Firestore writes: 0.
- Provider calls: 0.
- External browser requests during QA: 0.
- Deployments: 0.

The browser run used an in-memory Firestore substitute and verified Guided Analysis Step 1, the persistent header, Workspace Research, Workspace Analyses / Deals and Recent Research. It also verified immediate view updates, existing Haven compatibility, stable duplicate rejection, scenario revision linkage, refresh restoration, organization isolation through the V2.4 regression suite, and a simulated Firestore-unavailable failure with no local fallback.

## Browser evidence

- `data/validation/pi-v2-4-1-save-actions/01-recent-research-actions.png`
- `data/validation/pi-v2-4-1-save-actions/02-workspace-research-promoted.png`
- `data/validation/pi-v2-4-1-save-actions/03-guided-persistent-header.png`
- `data/validation/pi-v2-4-1-save-actions/04-analyses-property-status.png`
- `data/validation/pi-v2-4-1-save-actions/05-unified-saved-properties.png`
- `data/validation/pi-v2-4-1-save-actions/06-firestore-failure-no-fallback.png`
- Machine-readable results: `data/validation/pi-v2-4-1-save-actions/qa-results.json`

## Remaining activation requirement

No live Firestore validation was performed. Continue to use the mocked/in-memory repository until the separately proposed deny-all client rules and isolated live activation test in `PI_V2_4_DURABLE_PROPERTY_IMPLEMENTATION.md` are approved. Existing local records are not migrated, deleted or silently promoted.
