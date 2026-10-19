# PI V2.5.1 Final Acceptance Harness Stabilization

## Current outcome

**LIVE COMPLETION STOPPED BEFORE MUTATION — HARNESS ASSERTION CORRECTED OFFLINE — NO RETRY PERFORMED**

The mandatory offline stabilization passed, and the authorized live run began after a clean read-only preflight. The live run stopped at `2026-10-19T15:36:12.063Z` before any Storage data read, Firestore write, audit event, or report generation.

## Offline certification

The isolated rehearsal used two fresh mock sessions and the implemented server, UI, report renderer, document service, durable-property service, and security controls.

Verified:

- Session establishment returns UID, role, and email-verification state.
- Organization membership is resolved through authenticated `/api/auth/me`.
- The investment bootstrap runs before report generation.
- Property ID, subject reference, evidence snapshot, QA scenario ID, revision, three document IDs, immutable version 1, hashes, and all five evidence associations must match exactly.
- An unrelated fourth preserved document cannot substitute for or enter the acceptance report.
- Cross-session restoration and inline browser rendering work.
- One authenticated preview produces one Storage read and one audit event.
- Report assembly produces three Storage reads and three inclusion audit events.
- Report persistence produces exactly two additional writes.
- Uploads, scans, reviews, scenario saves, provider calls, and retries are prohibited.
- The financial and Monte Carlo deterministic projection is unchanged.

The rehearsal generated a 25-page QA package with:

- Appendix index on page 16
- Provenance covers on pages 17, 20, and 23
- Six source-document pages on pages 18–19, 21–22, and 24–25
- QA / NOT FOR DISTRIBUTION labeling and page numbering on every page
- No duplicate appendix documents

Broader focused regression result: **66 passed, 0 failed**.

## Live stop and diagnosis

The live document register correctly returned four Decatur documents: the three V2.5.1 acceptance documents plus the earlier preserved V2.5 synthetic acceptance document.

The harness incorrectly asserted that the entire register must contain exactly three documents. The corrected assertion now:

1. Filters the register to the three explicitly authorized document IDs.
2. Requires exactly those three records.
3. Requires immutable version 1 and each expected SHA-256 hash.
4. Requires CLEAN, REVIEWED, and APPROVED states.
5. Permits unrelated preserved records to remain in the property register.
6. Prevents unrelated records from substituting for an expected version or entering the report.

The corrected behavior passed an additional offline rehearsal containing an explicit unrelated fourth document.

## Resource accounting

### This live attempt

| Resource | Used | Remaining authorized maximum |
| --- | ---: | ---: |
| Storage reads | 0 | 4 |
| Firestore writes | 0 | 6 |
| Audit events | 0 | 4 |
| QA reports | 0 | 1 |
| New uploads | 0 | 0 |
| Scanner invocations | 0 | 0 |
| New scenario revisions | 0 | 0 |
| Provider requests | 0 | 0 |
| Automatic retries | 0 | 0 |

### Cumulative live acceptance usage

The cumulative totals remain unchanged from the original partial run:

- Uploads: 3
- Scanner invocations: 3
- Storage reads: 3 of 7
- Firestore writes: 29 of 35
- Audit events: 9 of 13
- Scenario revisions: 1 of 1
- QA reports: 0 of 1
- Provider requests: 0
- Automatic retries: 0

## Remaining acceptance work

- Restore and capture the already-proven live inline-attachment screens.
- Perform one authenticated preview.
- Generate exactly one QA Full Investor Package.
- Run the post-generation immutable-data and resource audit.

No live screenshot or QA Investor Package was created in this attempt because the run stopped before the browser-preview phase.

## Recommendation

**NO-GO for final V2.5.1 live acceptance until another explicitly reviewed continuation is authorized.**

The application and stabilized harness pass offline. The remaining live work is unchanged and still fits the original remaining resource ceilings.
