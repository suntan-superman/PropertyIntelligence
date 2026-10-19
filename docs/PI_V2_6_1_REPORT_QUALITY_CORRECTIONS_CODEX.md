# Property Intelligence V2.6.1 — Focused Investor Report Corrections

**For Codex | Local implementation and certification only | 19 October 2026**

## Objective and boundaries

Correct the specific defects in the latest **400 Decatur St, Bakersfield, CA 93308** outputs, while keeping the report generator property-agnostic. This is a **layout, reporting and evidence-disclosure pass**, not a new infrastructure or AI-extraction project.

Baseline PDFs supplied for comparison:
- `400_Decatur_St_Bakersfield_CA_93308_Opportunity_Brief_2026-10-19_R1 (1).pdf` — **3 pages**.
- `400_Decatur_St_Bakersfield_CA_93308_Full_Investor_Package_2026-10-19_R1 (1).pdf` — **22 pages** (includes three synthetic two-page documents and separate appendix covers).

**Do not change:** certified financial or Monte Carlo algorithms, stored scenario inputs, Firestore data, evidence snapshots, original attachment bytes/hashes, authentication, ClamAV, Storage, approval rights, or historic report revisions. No live writes, provider calls, production deployment, or new uploads. Use saved/mock fixtures. Keep synthetic QA material conspicuously labeled and out of actual investor distribution.

## P0 — Fix financial input ledger (Full Package page 5)

Observed: the two-column `Complete input ledger` / `Detailed modeled costs` layout squeezes the ledger's value and evidence columns. The word `Evidence` itself wraps; `$150,000.00` splits; the linked rehabilitation PDF filename stacks character fragments vertically. This is unacceptable.

Implement:
1. Replace the fragile side-by-side ledger with a full-width, legible ledger **or** a compact summary plus a separate full-width input-detail table. Prioritize readability over fitting everything on one page.
2. Use predictable columns: `Input`, `Entered value`, `Evidence` (short human-readable state such as `Linked (1)`, `None`, `Pending`), optionally `Source/notes` when space allows. Do **not** insert long filenames or hashes in narrow cells; use numbered appendix references (`Appendix 3`) or a separate evidence cross-reference table.
3. Keep money values together, right-aligned, with tabular digits. No breaks inside `$150,000.00`, percentage values, headers or appendix numbers.
4. Allow rows to grow for genuine multi-line descriptions but prevent one row from breaking across pages. Repeat column headers on continued pages.
5. Keep the cost waterfall and return-hurdle/MAO definitions accurate. Do not alter numerical outputs.

**Pass:** page render at normal PDF zoom shows no split digits, letter-stacked words, clipped text or illegible narrow columns.

## P0 — Repair pagination and near-empty pages

Observed:
- Full Package **page 6** contains only the tail of returns/sensitivity material and extensive whitespace.
- Full Package **page 11** contains essentially a single sentence (`Raw scenario identifiers...`) and otherwise blank space.
- Full Package **page 3** is a short spillover of comparable/evidence material.
- Opportunity Brief **page 3** is mostly empty beneath a short supporting-evidence table. (The county disclaimer on page 2 is substantive and must not be dropped merely to reduce page count.)

Implement:
1. Introduce semantic section blocks, sensible `keep-with-next`, row non-splitting, orphan/widow control, and preflight height measurement where supported by the existing PDF renderer.
2. Move short continuation sentences into their parent section or an appropriate footer/note; never emit a dedicated page for a sentence.
3. Reflow the returns and deterministic sensitivity section so page 6 is eliminated **when feasible without reducing readability**. If content truly requires an additional page, give that page a meaningful section header and substantive content.
4. For the Brief, keep the main executive content concise. Put the supporting-evidence references in a compact supplementary section or on an explicitly labeled attachment page. Do not falsely call attached documents embedded in the Brief.
5. Do not delete, abbreviate or relocate legally required notices in a way that violates distribution requirements. Retain the full Kern County notice where required and preserve source-rights warnings.
6. Appendix provenance covers may remain separate where needed; do not optimize them by removing material provenance or synthetic warnings.

**Pass:** no page is created solely for a dangling paragraph/footnote; no accidental mostly blank content page. Deliberate notice/appendix pages are allowed and should be classified separately by QA.

## P0 — Make supporting-document amount conflicts visible without OCR

Observed in the **actual synthetic QA PDFs**:

| Claim | Scenario amount | Value printed inside attached synthetic fixture | Difference |
|---|---:|---:|---:|
| Original mortgage principal | $100,000.00 | $150,000.00 | +$50,000.00 |
| Payoff claim | $101,000.00 | $134,912.66 | +$33,912.66 |
| Rehabilitation budget | $35,000.00 | $30,000.00 | -$5,000.00 |

Full Package **page 8** currently lists each as `Not extracted / not structured` and `Not reconciled`. That is *truthful for the current application data*. Do not claim PI extracted these values, or invent source values in production reports.

Implement a minimal, explicit **analyst-entered document amount** workflow using existing immutable document linkage / approved structured metadata, **only if already supported or achievable with a small reporting-layer change**. The analyst may transcribe a claimed amount from the attached document, identify the relevant field, document version and source page, and explicitly confirm it. No OCR, AI extraction, new provider, or broad schema redesign.

When an approved structured amount is available:
- Compare it to the corresponding scenario claim with exact cents, show signed difference, and label `MATCH`, `DIFFERENCE — REVIEW`, or `NOT COMPARABLE` as appropriate.
- Preserve distinction between *recorded principal*, *estimated current balance* and *payoff*; these are different concepts and must not be directly treated as contradictory merely because amounts differ. Compare like with like.
- A single attachment can support several claims, but only compare a structured value whose semantic type matches that claim.
- Do not overwrite underwriting inputs, promote evidence to independently verified, or silently accept an amount as fact.
- For documents lacking approved structured amounts, continue displaying `Not reconciled — amount not entered`; **do not imply there is no discrepancy**.
- For this synthetic QA case, optionally populate analyst-confirmed fixture metadata in a *local-only test fixture*, not in live Firestore or the original PDF, to prove the warning presentation. The three sample differences above are expected test outcomes.
- Avoid showing synthetic document amounts as actual Decatur facts.

If implementing structured amount entry would require a substantial new persistence system, **stop that subfeature and report it as a scoped follow-up**; still improve the `Not reconciled` disclosure text and layout now.

## P1 — Comparable-sales hierarchy and decision usefulness

Current report: 11 sales included for research, **zero designated Primary**; $240,000 exit is an analyst assumption, and $255,000 RentCast AVM is **as-is**, not a validated after-repair value. Preserve these distinctions.

- Present `Primary`, `Secondary`, `Unclassified`, `Excluded` counts prominently.
- When there are zero Primary comps, state plainly: `Comparable-supported ARV not established` and do not calculate one from the 11 included sales.
- If Primary comps exist in other fixtures, display the selected 3–5 prominently with reasons, condition/size/location differences and analyst-supported adjustments (if supplied); remaining research can be condensed into a secondary table.
- Avoid unexplained internal codes in the investor-facing table. Preserve source references in private audit metadata.
- No invented comp adjustments, sale verification, condition or ARV.

## P1 — Improve executive messaging, keep honest qualifications

The V2.6 executive page is better: `$55,000 gross spread`, material missing costs, and `continue diligence`. Retain this.

- Make the difference between gross spread, conditional modeled spread, estimated net profit and MAO immediately clear.
- Do not elevate the 29.7% ROI or $169,000 conditional MAO into an investment recommendation while material expenses remain unreviewed/zero.
- Use concise, prioritized diligence actions rather than repeating the same caveat on every page.
- Retain the accessible Monte Carlo explanation and clearly identify `0/1,000 modeled losses` as conditional on entered ranges, not a real-world guarantee.
- Highlight that zero holding costs make a 30-day delay appear to cost $0 in the model; this is a missing-input warning.

## P1 — Opportunity Brief compactness

Target **one strong executive page plus required notices and optional concise evidence references**; total page count depends on required county notice and selected evidence. Do not impose an arbitrary two-page cap that would remove required legal language.

- Eliminate repeated verbose risk caveats when one prominent warning and a short footer suffice.
- If evidence references require their own page, label it `Supporting evidence references (not attached)` and use meaningful spacing and readable rows.
- Keep the full county notice intact when required. Do not infer redistribution rights.

## P1 — Generic layout resilience

Test at least these synthetic fixtures beyond Decatur:
1. No comparable sales, no documents, many unknown fields.
2. 3 primary + 10 secondary comps with long street names.
3. Many financial fields, 15+ supporting documents, multiple links per claim.
4. Large dollar amounts, long source names, multiple appendix pages.
5. No Monte Carlo result / incomplete assumptions.

The renderer must handle these without overflow, clipping, blank orphan pages or fabricated values.

## QA requirements

1. Generate **new, versioned local PDFs** for both Decatur outputs; never overwrite saved/historical reports.
2. Automated checks: no text outside page bounds, no overlapping table cells, no numeric-token splits, no page with only orphaned content, correct page numbers, correct appendix index and page references, correct disclaimers, no missing selected approved documents, no confidential/unreviewed document inclusion.
3. Visually inspect every page of both PDFs, not only first pages. Produce page contact sheets and before/after images for old pages 3, 5, 6, 8, 11 and Brief page 3.
4. Compare certified financial output values and Monte Carlo distribution/projections against the baseline scenario. The numeric results must be identical; only labels and presentation may change.
5. Verify that QA fixture documents remain clearly synthetic, the original PDF bytes and hashes are unchanged, and no fourth historical document is included.
6. Run focused PDF/report regressions plus the relevant existing financial/document-security suites. Avoid unrelated infrastructure tests.
7. Zero live Firebase writes, provider calls, Storage uploads, deployments or changes to stored evidence.

## Deliverables

- New Opportunity Brief PDF and Full Investor Package PDF (local only).
- Brief change log with exact before/after page counts.
- Page-by-page visual QA index/contact sheet.
- Table of layout defects fixed and any remaining exceptions.
- Evidence discrepancy QA demonstration (explicitly synthetic) and statement whether it uses analyst-entered structured values or remains unreconciled.
- Calculation invariance and security/regression test results.
- **GO/NO-GO for local report quality only**, with no claim of investor distribution readiness while real diligence/source rights remain unresolved.

**Stop for review. Do not deploy.**
