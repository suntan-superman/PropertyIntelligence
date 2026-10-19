# PI V2.4 Durable Property Implementation

## Proposed Firestore collections

All records are under `organizations/{organizationId}`. Organization IDs and user IDs come only from server-verified Firebase claims.

- `properties/{stablePropertyId}` — normalized address, available parcel identifiers, lifecycle, verification status, source subject, evidence snapshot IDs, timestamps and editor IDs.
- `propertyKeys/{sha256(identityKey)}` — transactional normalized-address or APN uniqueness reservation pointing to one stable property ID.
- `properties/{stablePropertyId}/evidenceSnapshots/{sha256(snapshotId)}` — immutable evidence-snapshot association. Raw provider payloads and private documents are not copied.
- `properties/{stablePropertyId}/scenarioRevisions/{scenarioId--revision}` — immutable saved scenario revision including assumptions, comparable reviews, analyst evidence, Monte Carlo inputs/results and the exact evidence snapshot binding.
- `properties/{stablePropertyId}/reportRevisions/{reportId}` — immutable report-generation reference with scenario ID, revision, kind, filename, status and generation time. PDF bytes are not stored.

## Security model

- The browser never initializes Firestore and never receives Admin credentials.
- Firebase session cookies are verified by the PI backend before every durable-property API request.
- Reads are scoped to the organization claim. Writes additionally require Administrator or Analyst role and CSRF validation.
- Organization ID, creator, editor, timestamps and stable IDs are assigned by the server, not accepted from browser payloads.
- Exact normalized-address and APN keys are reserved in the same Firestore transaction that creates the property. Concurrent saves cannot create duplicates.
- Proposed Firestore rules deny every client read and write. Firebase Admin bypasses rules only from the trusted local backend.
- Public API projections omit private source references and raw evidence.

## Lifecycle and identity

Lifecycle values are `PRELIMINARY_RESEARCH`, `SAVED_PROPERTY` and `ARCHIVED_PROPERTY`. Verification is independent: address, parcel, title and ownership can remain unknown or unverified after promotion. Archiving changes lifecycle only and retains every evidence, scenario and report association.

## Local certification plan

1. Promote mocked 400 Decatur research with unknown APN.
2. Reopen it through a second service/session over the same mocked repository.
3. Confirm organization isolation and Viewer write denial.
4. Exercise address/APN duplicates and simultaneous creation attempts.
5. Link immutable scenario revisions, evidence snapshots and report history.
6. Archive and restore without deleting history.
7. Run existing underwriting, Monte Carlo and report regression suites.
8. Run browser QA with a mocked durable repository and no provider calls.

No live Firestore write is part of local certification. Enabling the API/database, applying the deny-all rules and executing a live test write require a separate approval after review.

## Local certification result — 2026-10-18

- `npm run pi:v2.4:properties:test` — PASS, 46/46 tests.
- `npm run pi:v2.3a:auth:test` — PASS, 8/8 Firebase authentication and authorization tests.
- `npm run pi:v2.4:properties:qa` — PASS, 15 browser checks using the in-memory Firestore substitute.
- `npm run web:build` — PASS.
- Live Firestore writes: 0.
- Provider calls: 0.
- Production migrations/deployments: 0.

Browser evidence is stored under `data/validation/pi-v2-4-durable-properties/` and includes the promotion confirmation, active Saved Property workspace state and recoverable Archived Property state. The machine-readable result is `qa-results.json`.

## Proposed activation after approval

1. Confirm the `(default)` database is enabled in `property-intelligence-8238b`.
2. Review and apply `config/firestore.rules.proposed` (deny all browser/client reads and writes).
3. Start the authenticated local server with the server-only Firestore adapter:

   `npm run web:dev -- --investment --firebase-auth --firestore-properties --google-geocoding`

4. Perform one isolated test promotion in the local/test organization, then verify the property, identity-key reservation, immutable evidence reference and scenario revision directly through the server-authorized workflow.
5. Test logout/login restoration, duplicate rejection and archive/restore before permitting ordinary local use.

Do not use the `--firestore-properties` flag until this activation plan and the proposed rules have been reviewed. Existing local records remain untouched; no automatic migration is included.
