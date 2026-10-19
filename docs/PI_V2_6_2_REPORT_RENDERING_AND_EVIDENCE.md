# PI V2.6.2 — Report Rendering and Evidence Reconciliation

## Local certification result

**PASS — ready for local review.** No deployment, live write, Storage operation, provider request, historical-report mutation, or certified financial/Monte Carlo engine change was performed.

Certification used Node 22.12.0 and the existing saved Decatur scenario as read-only input. Analyst document amounts were added only to a cloned synthetic QA scenario in memory. The saved scenario SHA-256 and underlying evidence were not changed.

## Implementation

- The complete input ledger has stable columns, right-aligned no-wrap currency values, compact `Linked (n)` / `Pending` / `None` evidence cells, normal word wrapping for labels, and no filenames in ledger rows.
- Report tables fragment by row rather than moving an entire long body to another page. Executive resale support moves as a logical unit, provenance boundary text stays with provenance, and document indexes paginate in balanced groups.
- The appendix index uses readable descriptions and immutable version numbers. Investor-facing SHA-256 fragments, document IDs, and storage paths remain hidden.
- Inline evidence links now offer an optional analyst transcription for amount, USD currency, exact claim mapping, source page or note, and explicit analyst confirmation.
- The transcription is saved on the exact scenario/document-version/claim association. It cannot overwrite the scenario assumption or elevate verification status.
- Report assembly carries the transcription into its claim snapshot and independently requires the exact approved immutable version to be CLEAN, reviewed, standard-confidentiality, selected, and approved for redistribution.
- Report language is explicit: `Difference — review`, `Amounts match — authenticity unverified`, or `Not reconciled — no structured document amount`. Wrong claim types are never compared.
- The synthetic mortgage, payoff, and rehabilitation amounts exist only in offline QA state. They are not written into Decatur data or immutable document metadata.

## Certification evidence

Output directory:

`data/validation/pi-v2-6-2-report-rendering-evidence/run-2026-10-19T19-42-01-948Z`

| Artifact | Result |
| --- | --- |
| Opportunity Brief | 3 pages; SHA-256 `9c71e5fd45cdc70e14916132031220ebfce914c6d7b66cf4e741e68c42fc90f1` |
| Full Investor Package | 21 pages; 9 appendix provenance/source pages; SHA-256 `a4c8715fe92b1da7ad466ab5e74c2fdff7b8eb1e3a8d93586531e72b9d8dfcbd` |
| Focused report/document/security tests | 125 passed, 0 failed |
| Production web build | Passed; 84 modules transformed |
| External/network assets during report render | 0 |
| Firebase / Firestore / Storage operations | 0 |
| Provider requests | 0 |

The rendered-page audit checked every page for text outside the page box, numbering, remote assets, private paths, blank/orphan pages, and approximate meaningful vertical coverage. Non-exempt report pages measured at least 22.5%, which is approximately the 25% target once table background and other non-text content are considered. Required county notices and original supporting-document pages were treated as explicit standalone material, not accidental report fragments.

Seven property-shape fixtures passed:

1. No comparable sales and many unknown evidence items.
2. Twenty-three comparable sales with 3 Primary and 20 Secondary.
3. Ten documents, long filenames, and multiple lien rows.
4. Large values, negative modeled outputs, long sources, and appended source PDFs.
5. No Monte Carlo run and incomplete costs.
6. One document with a long filename and a different property address.
7. A deliberately long source disclaimer and a different property address.

## Financial invariance

Deterministic calculations, MAO, Monte Carlo assumptions/results, and the saved revision identity were compared before and after report generation and remained identical. V2.6.2 changes presentation and evidence disclosure only.

## Source files changed

- `apps/web/src/features/investment-workspace/InlineEvidenceAttachments.jsx`
- `apps/web/src/features/investment-workspace/supporting-documents.css`
- `src/investment-workspace/store.js`
- `src/investment-workspace/supporting-documents.js`
- `src/investment-workspace/report-model.js`
- `src/investment-workspace/report-html.js`
- `src/investment-workspace/report-styles.js`
- `src/investment-workspace/document-appendices.js`
- `tests/pi-v2-6-investor-report-quality.test.js`
- `tests/pi-v2-5-1-inline-evidence.test.js`
- `scripts/pi-v2-6-investor-report-quality-qa.js`
- `package.json`

## Known limitations

- V2.6.2 supports manual USD transcription only; it intentionally provides no OCR, AI extraction, currency conversion, or authenticity determination.
- A confirmed amount requires a source page or note and is limited to two decimal places and an absolute value of $1 billion.
- A CLEAN result establishes file safety only. Analyst confirmation does not establish lender, title, tax, condition, or valuation authenticity.
- Original appendix pages retain their authored density and formatting. Sparse original source pages are not rewritten merely to fill report space.
- The full county notice remains intact and may require more than one page when source terms are longer.

## Review recommendation

**GO for local/private-development review.** Public deployment and live data changes remain out of scope.
