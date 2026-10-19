# PI V2.5.1 Final Acceptance

Date: 2026-10-19  
Classification: **ACCEPTED FOR PRIVATE DEVELOPMENT**

## Accepted result

The corrected, authenticated report-only workflow generated one QA Full Investor Package for the existing Decatur QA scenario:

- Scenario: `6f7b1d62-0e91-4da1-9e31-250101000101`, revision 1
- Evidence associations restored: 5
- Report revision: `6f7b1d62-0e91-4da1-9e31-250101000202`
- PDF pages: 25
- PDF SHA-256: `be92285e120555227e47934119684f4264ffa0cbacde44a7dbbd0042fe389c0f`
- QA / NOT FOR DISTRIBUTION label: present on every page
- Investor disclaimer: present

The prior failed execution and its audit files remain preserved. This successful run did not overwrite a historical report.

## Appendix verification

The appendix index is page 16. It contains exactly three entries:

1. Synthetic recorded mortgage / deed-of-trust abstract
2. Synthetic lender payoff statement
3. Synthetic contractor rehabilitation estimate

Provenance covers appear on pages 17, 20 and 23. Original synthetic document pages appear on pages 18–19, 21–22 and 24–25.

Automated PDF inspection and visual inspection confirmed:

- Exactly three authorized immutable versions were included.
- The historical fourth document was not included.
- No duplicate appendix pages exist.
- Appendix indexing and page numbering are correct.
- Provenance covers and source pages are legible.
- Synthetic-document and QA distribution warnings are prominent.
- The document register shows the three authorized documents selected and the inconsistent historical document disabled and unselected.

## Resource accounting

| Resource | Actual |
| --- | ---: |
| Firestore writes | 5 |
| Private Storage reads | 3 |
| Document-in-report audit events | 3 |
| QA reports | 1 |
| New uploads | 0 |
| Malware scans | 0 |
| Metadata repairs | 0 |
| Scenario saves | 0 |
| Provider requests | 0 |
| Automatic retries | 0 |

The five Firestore writes were one report-revision create, one property operational-timestamp update and three document-in-report audit creates.

Each selected immutable PDF was read once from private Storage. Its downloaded bytes matched its recorded SHA-256.

## Integrity verification

- Original evidence snapshots: unchanged
- Scenario revisions: unchanged
- Financial inputs and results: unchanged
- Monte Carlo assumptions and results: unchanged
- Parent document records: unchanged
- Immutable version identities and hashes: unchanged
- Historical fourth document: unchanged
- Historical reports and failed acceptance records: unchanged
- Storage objects: unchanged
- Other properties: unchanged

## Disposition

PI V2.5.1 inline supporting documents and investor-report appendices are **ACCEPTED FOR PRIVATE DEVELOPMENT**.

This acceptance does not authorize public deployment or external user rollout.
