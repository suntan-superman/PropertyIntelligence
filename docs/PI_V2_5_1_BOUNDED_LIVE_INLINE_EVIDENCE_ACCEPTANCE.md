# PI V2.5.1 — Bounded Live Inline Evidence Acceptance

Execution date: 2026-10-19  
Project: `property-intelligence-8238b`  
Organization: `property-intelligence-local`  
Property: 400 Decatur St, Bakersfield, CA 93308  
Property ID: `52638a00-8167-4cff-85c0-f56a0445a5a9`

## Classification

**PARTIAL ACCEPTANCE — STOPPED ON CRITICAL HARNESS ASSERTION — NO RETRY PERFORMED**

The authorized run stopped after uploading, scanning, reviewing, integrity-checking, linking, and saving one QA scenario revision. Cross-session browser verification and report generation were not attempted after the failure.

No cleanup or deletion was performed. The partial resources and all audit evidence remain intact.

## Preflight

The read-only preflight passed before any mutation:

- Administrator email verified, enabled, and password authentication confirmed.
- Role: Administrator.
- Organization: `property-intelligence-local`.
- Decatur durable property, evidence snapshot, and source scenario found.
- Existing evidence, scenario, document, report, property, provider-tree, and Storage baselines recorded.
- Storage uses uniform bucket access and enforced public-access prevention; anonymous listing was denied.
- ClamAV `1.4.6` was ready with signature version `28158`; signatures were approximately 7.1 hours old.
- CLEAN enforcement and stored-byte integrity regression controls passed.
- All fixture pages contained the mandatory synthetic warning.
- No matching document hashes, fixed document IDs, QA scenario ID, or QA report ID existed.
- Current financial and Monte Carlo engines reproduced the source scenario before live writes.

## Completed document operations

| Document | Document ID | SHA-256 | Scan | Review |
|---|---|---|---|---|
| Recorded mortgage / deed of trust | `6f7b1d62-0e91-4da1-9e31-250101000001` | `a6af653d497d3886a84852616b9f46e59ff42e415a739a0f616ae4b8cc5e5a6a` | CLEAN — ClamAV 1.4.6 | Reviewed; redistribution approved |
| Lender payoff statement | `6f7b1d62-0e91-4da1-9e31-250101000002` | `60b9ebbca8aca57db587eaf422ccecbecbc3964ee13b55a3f9bb7c2a5692728c` | CLEAN — ClamAV 1.4.6 | Reviewed; redistribution approved |
| Contractor rehabilitation estimate | `6f7b1d62-0e91-4da1-9e31-250101000003` | `775fbe2d91a5e40a5906c394fe8309b2ccf0be891652d1fdc132ab931172d2c0` | CLEAN — ClamAV 1.4.6 | Reviewed; redistribution approved |

All three records began as `PENDING_REVIEW`, `NOT_APPROVED`, and not selected for appendices. Before explicit review, the report-selection service returned no eligible documents. Each stored immutable version passed an authenticated post-upload SHA-256 read.

## Evidence linkage

The saved QA scenario contains five immutable links:

- Mortgage document → Original recorded mortgage amount.
- Mortgage document → Estimated outstanding mortgage balance.
- Payoff document → Verified payoff supporting material.
- Payoff document → Estimated outstanding mortgage balance.
- Contractor estimate → Estimated rehabilitation cost.

This establishes both one-document/multiple-claim and multiple-document/one-claim behavior without duplicate uploads. The analyst evidence array and financial inputs are unchanged. The payoff attachment did not establish independent verification.

QA scenario:

- ID: `6f7b1d62-0e91-4da1-9e31-250101000101`
- Revision: 1
- Firestore path: `organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/scenarioRevisions/6f7b1d62-0e91-4da1-9e31-250101000101--r1`

## Stop condition and root cause

The harness compared the entire serialized analysis object against the source scenario. That comparison included QA-specific provenance:

- new scenario ID and reference;
- new timestamp;
- `SYNTHETIC_TEST_FIXTURE` classification and rationale;
- QA-specific provenance fingerprints.

Those fields correctly differ for a distinct synthetic QA revision. A read-only post-failure audit removed only scenario-identity and provenance metadata from the comparison and confirmed that the certified deterministic, financial, risk, and Monte Carlo result sections match the source scenario.

This was a harness assertion defect, not a financial-engine or attachment-linkage defect. The original strict failure and the complete field-level difference record remain preserved.

## Resource reconciliation

| Resource | Used | Ceiling | Status |
|---|---:|---:|---|
| Document uploads | 3 | 3 | At ceiling |
| Scanner invocations | 3 | 3 | At ceiling |
| Private Storage reads | 3 | 7 | 4 remain |
| Firestore writes | 29 | 35 | 6 remain |
| Audit events | 9 | 13 | 4 remain |
| New QA scenario revisions | 1 | 1 | At ceiling |
| QA reports | 0 | 1 | 1 remains |
| Provider requests | 0 | 0 | Conformant |
| Automatic retries | 0 | 0 | Conformant |

Firestore write derivation:

- Upload transactions: 12.
- Upload audit events: 3.
- Review transactions: 6.
- Review audit events: 3.
- Integrity-download audit events: 3.
- QA scenario revision transaction: 2.

## Integrity confirmation

The read-only reconciliation confirmed:

- Original evidence snapshot unchanged.
- Original scenario revisions unchanged.
- Original supporting document and report revisions unchanged.
- Immutable Decatur property identity unchanged.
- Other properties unchanged.
- Existing local scenario files unchanged.
- Provider research and usage trees unchanged.
- Three expected new private Storage objects exist.
- No provider request, report request, automatic retry, cleanup, or deletion occurred.

## Incomplete acceptance items

Because the run stopped, these deliverables do not yet exist:

- logout/login and browser-refresh restoration screenshots;
- authenticated inline preview screenshot;
- QA Full Investor Package;
- appendix index and appendix-page screenshots.

## Recommendation

**NO-GO for declaring normal authenticated inline attachments fully accepted.**

A narrowly scoped continuation can complete the outstanding acceptance without another upload, scan, review update, integrity read, or scenario save. It requires separate authorization for:

- zero new uploads and scans;
- one authenticated preview read;
- three report-assembly reads;
- four document audit events;
- two report-revision/property Firestore writes;
- one QA Full Investor Package;
- logout/login, browser refresh, screenshots, and final integrity audit.

The maximum continuation budget is four Storage reads, six Firestore writes, four audit events, zero scenario revisions, and one report.
