# PI V2.5.1 Report-Only Final Acceptance

Date: 2026-10-19  
Classification: **NO-GO — STOPPED BEFORE REPORT GENERATION**

## Outcome

The single authorized live continuation stopped before the report request. No PDF or browser screenshot was generated.

The failure was local and occurred while the report harness initialized the investment workspace:

`ENOENT: data/runtime/sprint6_2-kern-assessor/exact-situs.json`

The reserved report revision `6f7b1d62-0e91-4da1-9e31-250101000202` does not exist, and a read-only postmortem query found zero audit events for that report ID. The failed one-time state is preserved in:

- `data/validation/pi-v2-5-1-final-three-document-repair/report-only-final-state.json`
- `data/validation/pi-v2-5-1-final-three-document-repair/report-only-final-acceptance.json`

No automatic retry or cleanup of live records was performed.

## Root cause and local correction

The local cleanup had removed three generated assessor artifacts that remain cryptographically bound by the retained investment-evidence manifest. `loadEvidence()` validates those bindings before the report-only server can start, even though the Decatur report does not use county discovery.

The original assessor archive remained available and matched its certified SHA-256. The missing artifacts were restored offline from that unchanged archive and verified against the existing bindings:

| Artifact | Verified SHA-256 |
| --- | --- |
| `exact-situs.json` | `a73af56be907b70f5f12a2c7e6d196da7ceaa56dc46ade34628e39559c5f39c8` |
| `parcels_land_2026final.dbf` | `d27d17ea42946debd31b165893d042ea11fb39c608c81620724dc03f3527bd5e` |
| `TaxRoll_ParcelHistory_2026final.dbf` | `ad866d3dc10122aecf8442da0210e0d25d1cf2287b786ca7fd9769f0c2fd7d11` |

`exact-situs.json` regenerated with 11,263 records and the exact historical hash. A deterministic recovery utility was added at `scripts/sprint6_2/recover-exact-situs.js`.

The report-only harness was also narrowed to `propertyDetail:false`, so it does not initialize the unrelated discovery subsystem. The retained evidence integrity checks remain enabled.

## Focused offline certification

Focused report, supporting-document, inline-linkage, Firestore-eligibility, financial-invariance, and harness tests passed:

- Tests: **54 passed / 0 failed**
- Exact linked immutable version selection: passed
- Three-document appendix behavior and deduplication: passed
- Parent/version eligibility fail-closed behavior: passed
- Required investment bootstrap: passed
- QA restriction labeling: passed
- Financial and Monte Carlo invariance: passed
- Report-only startup configuration regression: passed

No live continuation was repeated after the local correction.

## Actual live resource accounting

| Resource | Actual |
| --- | ---: |
| Firestore writes | 0 |
| Private Storage object reads | 0 |
| Generated QA reports | 0 |
| New uploads | 0 |
| Malware scans | 0 |
| Metadata repairs | 0 |
| Scenario saves | 0 |
| Provider requests | 0 |
| Automatic retries | 0 |

The harness performed authorized read-only preflight queries and Storage metadata inspection before local initialization failed. It did not download document bytes or reach the report mutation.

## Integrity disposition

- The three-document metadata repair was not repeated.
- No Decatur property, evidence snapshot, scenario revision, document, historical report, or financial calculation was modified.
- The preserved fourth document was not modified or selected.
- The reserved report ID remains absent.
- No output PDF exists for this attempt.

## Recommendation

**NO-GO for final live acceptance under the consumed one-time authorization.**

The local defect is corrected and the focused offline suite is green. Completing the acceptance criterion still requires a new, explicit authorization for one report-only live execution. That future execution should reuse the corrected harness and must not repeat uploads, scans, metadata repair, or scenario saves.
