# Property Intelligence V2.6.2 — Report Rendering and Evidence Reconciliation

**Codex implementation directive — local only.** Primary regression case: 400 Decatur St, Bakersfield, CA 93308. This is a narrowly scoped correction to report rendering and analyst-supplied document amounts. Do not modify certified underwriting or Monte Carlo engines, authentication, Firebase/Storage infrastructure, immutable historical report records, or provider data. No live writes, uploads, provider requests, or deployment.

## Why this pass is necessary (verified against the supplied PDFs)

- Full Investor Package (22 pages), **page 5**: the Complete Input Ledger has a severely undersized evidence column; “Evidence” breaks into `Evidenc / e status`, the acquisition/resale amounts break across lines, and a rehab document filename wraps into a tall vertical stack. The resulting table disrupts pagination.
- Full Package **page 6**: a short tail of the returns and sensitivity section occupies the top of an otherwise nearly empty page.
- Full Package **page 11**: only the single technical-provenance privacy sentence appears, wasting a page.
- Opportunity Brief (3 pages), **page 3**: supporting evidence register occupies only the top of the page; large unused area remains. Page 2 is the full Kern County notice, which must not be shortened or omitted without rights review.
- Full Package **page 8**: reconciliation lists all five links as “Not extracted / not structured,” so it does not reveal the discrepancy visible in the *synthetic* source PDFs: mortgage $150,000 versus scenario $100,000; payoff $134,912.66 versus scenario $101,000; rehab $30,000 versus scenario $35,000. These are test fixture differences, **not real Decatur facts**. No automatic extraction is requested.
- Full Package **page 2**: 11 research comparables, 0 Primary. Do not invent a supported ARV or auto-classify sales.

## P0 — Fix ledger layout at its source

1. Find the actual PDF report template/components that produce `Complete input ledger` and `Detailed modeled costs`. Do not fix with PDF post-processing or hard-coded Decatur values.
2. Replace the narrow, verbose evidence column with a fixed-width compact status: `Linked (n)`, `Pending`, or `None`. Move filenames and claim-to-document mapping to the existing evidence reconciliation section or a concise document reference note; do not print long filenames inside the ledger.
3. Use stable column widths, numeric no-wrap formatting, right-aligned monetary values, consistent decimal display, and row-height constraints. The values `$150,000.00`, `$240,000.00`, `$35,000.00` must each remain on one line. Header `Evidence` must not split.
4. For long labels, wrap only at sensible word boundaries; never allow character-by-character vertical wrapping. Keep ledger headers with at least two subsequent rows. Prefer compact row padding to shrinking all report fonts.
5. Support zero, one, or many linked documents, long source names, and wide dollar amounts (including negative values) without horizontal clipping.

## P0 — Eliminate orphaned / near-empty pages

1. Inspect report page-break rules, section wrappers, `break-inside`, `page-break-*`, and PDF renderer fragmentation. Fix pagination in the source template, not by deleting pages after PDF generation.
2. Keep returns and deterministic sensitivity on the economics page where space permits; otherwise move the **entire logical subsection** to the next page, not a tiny fragment. No almost-empty continuation page like current page 6.
3. Keep the technical provenance privacy sentence with its preceding provenance section; no one-sentence page like current page 11.
4. Introduce a reusable report-only layout rule for avoiding orphans/widows, with safe fallbacks for longer content and variable table lengths. Do not force content to overlap footers or clip text.
5. For the Opportunity Brief, preserve the complete county disclaimer subject to applicable terms. Make the main brief self-contained and place evidence references in a compact optional supporting section or companion page when required. Do not falsely label a brief's references as embedded appendices. Do not shrink legally required text merely to meet an arbitrary page count.
6. **Acceptance:** No non-mandatory page with less than ~25% meaningful content unless explicitly a title/cover or a required standalone notice. Inspect actual rendered pages, not only text extraction.

## P0 — Analyst-confirmed document amount reconciliation (no OCR / AI extraction)

1. Reuse the existing immutable document-version reference and inline evidence association. Provide a minimal optional field for an analyst to enter an amount *observed in the linked document*, its currency, the relevant claim, and a source page or note. This is **analyst-entered transcription**, not independently verified evidence.
2. Keep scenario assumption and document-stated amount separate; never silently overwrite either. Do not change claim verification status merely because a number was entered.
3. Show a discrepancy in the report when both comparable amounts are present and differ: scenario amount, analyst-transcribed document amount, signed dollar difference, and status `Difference — review`. If equal, `Amounts match — authenticity unverified`. If absent, `Not reconciled — no structured document amount`.
4. Only compare like-for-like claim types. Original principal is not payoff, estimated balance is not payoff, and the same document may support multiple claims without implying its single amount applies to each. Require explicit claim-to-amount mapping.
5. Respect CLEAN, tenant authorization, confidentiality, redistribution approval, and immutable version checks already implemented. Do not display transcribed values from disallowed documents in investor PDFs. Ensure report revision snapshots retain the chosen analyst transcriptions and cannot mutate historical PDFs.
6. In synthetic QA, enter fixture values **only in a separate synthetic QA scenario / mocked state**: original mortgage $150,000, payoff $134,912.66, rehab $30,000. Confirm comparison against existing scenario values $100,000, $101,000, $35,000 respectively. Differences: +$50,000, +$33,912.66, -$5,000 (document minus scenario). Never treat synthetic fixtures as real Decatur proof.
7. Keep all underlying calculations unchanged; this feature is disclosure and reconciliation, not automatic underwriting.

## P1 — Tighten the investor-facing presentation

- Preserve V2.6 financial labeling: `$55,000` is **gross spread / modeled spread after currently entered costs**, not estimated net profit with zero/unreviewed transaction costs.
- Preserve separation of as-is provider AVM ($255,000) from analyst exit assumption ($240,000); no automatic ARV inference.
- Keep primary vs. secondary comparable classification explicit. When zero primary comps, show `Resale not independently supported`; do not infer values from all 11 sales.
- Preserve the plain-English Monte Carlo explanation and zero-holding-cost warning; do not change probabilities, simulations, or assumptions.
- Minimize duplicate caveat blocks, but retain material limitations, mandatory source notices and synthetic QA warnings.
- Show report evidence references using readable titles; hide SHA-256/internal IDs from main investor-facing tables while retaining audit traceability.

## QA — required before signoff

1. Generate both reports offline from **exact same saved Decatur scenario/evidence** as input; never modify the original Firestore scenario or prior generated reports.
2. Render every PDF page to PNG at 150–200 dpi and visually inspect. Compare against current supplied baseline: Full Package 22 pages, Opportunity Brief 3 pages. Report new page counts but do not optimize solely for fewer pages.
3. Assertions: no split monetary values, no split `Evidence` header, no long vertical filenames in ledger, no orphaned provenance sentence, no mostly blank financial continuation, no clipped/overlapping content, legible footers/page numbers, all mandatory county notice text intact.
4. Run separate property-shape fixtures: no comps; 3 primary comps; 20+ comps; no supporting documents; 1 document; 10 documents; long filenames; large/negative dollar values; long disclaimers. Include at least one different property address; do not hard-code Decatur.
5. Validate document reconciliation: match, mismatch, absent amount, wrong claim type, superseded version, confidential/unapproved document, multi-claim document, multiple document amounts. Ensure synthetic fixture values never leak into non-QA reports.
6. Verify deterministic financial outputs, MAO, Monte Carlo outputs and scenario revisions remain byte-for-byte or numerically identical as appropriate; do not compare mutable timestamps as financial outputs.
7. Run existing report/PDF and document-security regressions plus production build. No new external dependencies unless justified and approved.
8. Deliver: updated Opportunity Brief PDF, updated Full Investor Package PDF, contact sheet or selected before/after page images (ledger, formerly sparse pages, reconciliation), focused QA results, a short implementation report listing exact source files changed and known limitations.

## Stop conditions

Do not deploy or perform live writes, uploads, provider calls, document metadata repairs or production report mutations. Stop after local certification for review. If a requested presentation fix would require changing a certified calculation, explain and stop rather than changing it.

**Acceptance:** An investor can read the economics ledger without broken wrapping, no accidental nearly empty pages remain, and any analyst-entered document amounts are clearly compared to their corresponding scenario assumptions without misrepresenting synthetic material or automatically changing calculations.
