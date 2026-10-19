# PI — Arosa report quality review and Codex instructions

**Source:** Arosa Opportunity Brief (3 pages) and Full Investor Package (9 pages), 2026-10-16, scenario 1 revision 1.  
**Disposition:** NO-GO for external investor distribution until critical defects are addressed. Preserve underlying source data, financial engines, and saved revisions.

## Overall findings

The reports have a professional visual foundation: executive financial dashboard, sensitivity analysis, seller obligations, Monte Carlo chart and a useful plain-English Monte Carlo explainer. However, the headline $105,000 profit assumes $0 for almost every material cost beyond acquisition and rehab. Three source-reported sales are shown but none selected, so $380,000 exit is unsupported by selected adjusted comps. The $403,000 RentCast AVM is explicitly **as-is**, not ARV. Most critically, a $260,000 payoff is labeled lender-confirmed although its listed source is **Owner**. Do not call owner testimony independent lender verification.

## Opportunity Brief — page-by-page

**Page 1:** Keep the executive thesis, tiles and downside table. Replace long `data/raw/rentcast/...json#...` strings in the comparable-sales table with property addresses: 17860 Alps Dr, 22311 Zurich Dr and 22381 William Tell Trl, Tehachapi; retain full identifiers only in internal audit metadata. Show a prominent `Illustrative; material costs unentered/assumed zero` warning alongside $105k profit, 38.2% returns and $308k MAO. Clearly label $380k exit as an unsupported analyst assumption; none of three reported sale events has been selected or independently verified as a closing.

**Page 2:** The page is mostly blank after short diligence and limitations sections. Reflow intelligently: either integrate the material into page 1 or use a substantive, compact diligence/readiness page. Do not insert filler. `Why this property surfaced` currently says historical county Power-to-Sell `Unknown / Not returned`; this is **not evidence of distress**. If provenance supports it, say `Address submitted for analysis; no verified distress evidence attached`; otherwise state lead origin unknown.

**Page 3:** Full Kern County disclaimer. Preserve verbatim if required by applicable county-data license. Verify whether county-derived material is actually present before considering removal. Never trim legal language solely to reduce page count.

## Full Investor Package — page-by-page

**Page 1:** Same executive/comparable-path defects as Brief page 1. Make conditional profit and unentered expenses obvious without requiring footnote reading. $403k as-is AVM must not be presented as support for $380k post-rehab exit.

**Page 2:** Property facts are useful. Source paths overwhelm comparable-sales table. Use address/date/price/size/distance/selection and concise reference IDs. `Analyst proposed sale price $400k` and `modeled resale $380k` are different fields; label both precisely and do not silently reconcile them. Original mortgage, estimated balance and verified payoff all show Owner as source; status language needs correction.

**Page 3:** CRITICAL: `Lender-confirmed / independently verified payoff $260k` with source `Owner` is not supported. Require dated lender-issued payoff demand and verification before granting verified status; otherwise show `Owner-reported payoff claim — unverified`. Preserve historical entered values in a new revision. Keep other liens `Unknown`, equity and seller proceeds `Unknown`; owner-reported $0 taxes is not a verified tax clearance.

**Page 4:** The $275k cost ledger comprises $260k purchase and $15k rehab, while acquisition/sale closing, selling commission, taxes, insurance, utilities, financing and contingency are all $0. Math is internally consistent but not fully burdened. Add a **cost completeness** panel differentiating `Not reviewed`, `Unknown`, `Explicitly assumed $0` and `Verified $0`; never silently inject expense defaults. Show that 38.2% ROI, 38.2% cash-on-cash, $308k MAO and $365k break-even are conditional. Consider moving exhaustive input ledger to appendix while keeping investor-friendly waterfall.

**Page 5:** Monte Carlo presentation is good but `0 losses in 1,000` and `100% target attainment` need adjacent, prominent `Within analyst-entered bounds only; not real-world probability` language. Thirty extra holding days cause $0 loss because daily holding costs are $0: call this an unmodeled-cost warning, not proof timing is harmless. Normalize monetary formatting (`$2,987.20`, not `$2,987.2`).

**Page 6:** Source table includes very long internal raw JSON paths; remove from distributed report and use short evidence references with provider and retrieval date. `Local reviewed demo packet` address-review provenance appears incongruent with the live Arosa record: verify before relabeling. Distinguish provider retrieval time from record as-of time.

**Page 7:** Almost empty orphan page containing one sentence about source dates. Fix section flow/keep-with-next so sentence stays on page 6; no nearly blank pages.

**Page 8:** Plain-English Monte Carlo explanation is strong and should be retained. P10/P50/P90 wording and simulation caveats are appropriate. Technical appendix should stay subordinate and avoid sensitive internal paths.

**Page 9:** Full Kern County legal notice. Preserve intact if required, with legible layout and no truncation.

## Filename requirement — HIGH PRIORITY

Replace opaque `RESEARCH-5E20929A08C8-brief-r1.pdf` and `...-full-r1.pdf` export names with property-based filenames:

- `21950_Arosa_Rd_Tehachapi_CA_93561_Opportunity_Brief_2026-10-16_R1.pdf`
- `21950_Arosa_Rd_Tehachapi_CA_93561_Full_Investor_Package_2026-10-16_R1.pdf`

**Convention:** `<street-number>_<street-name>_<street-suffix>_<city>_<state>_<zip>_<report-type>_<YYYY-MM-DD>_R<saved-revision>.pdf`.

Implementation rules:
1. Derive from the **immutable report-bound property snapshot**, not editable address inputs or current selected property.
2. Standardize suffixes for filename only (`Road` to `Rd`, `Drive` to `Dr`); never rewrite stored canonical addresses.
3. Sanitize path separators, Windows reserved characters/names, punctuation, Unicode and long values. Prevent traversal. Collapse whitespace; cap filename length.
4. Use saved revision and actual report-generation date with documented timezone. Omit unknown ZIP; never invent it.
5. If address unavailable, fall back to sanitized short research ID. Resolve collisions without overwriting other properties/revisions.
6. Apply consistently to browser download, `Content-Disposition`, exported PDFs and report list. Keep research ID in private metadata and report audit trail.
7. Preserve existing historical filenames and immutable revisions. Do not rename archived files silently.
8. Test same street in different cities, unit numbers, unknown ZIP, long names, punctuation, duplicate dates and multiple tenants.

## Codex implementation plan

**P0 — Accuracy and distribution gate**
1. Audit report mappings: every metric must trace to analyst assumption, provider observation, verified document or PI calculation.
2. Fix payoff verification semantics: Owner source cannot alone support `lender-confirmed`. Never auto-upgrade estimates or original mortgage principal into payoff.
3. Add report readiness: `PRELIMINARY / ILLUSTRATIVE` allowed with warnings; `INVESTOR-READY DRAFT` blocked until material cost categories reviewed and major claims correctly attributed. No claim of certified title/appraisal.
4. Show conspicuous missing-cost warning by headline metrics. Do not modify financial calculations or silently apply illustrative presets.
5. Remove raw internal JSON/file paths from all investor-facing tables and source appendices.
6. Implement address-based filenames with robust tests.

**P1 — Presentation and UX**
7. Fix brief page-2 whitespace and full page-7 orphan through content-aware pagination, not property-specific hardcoded page breaks.
8. Keep as-is AVM distinct from analyst resale and adjusted comp-supported ARV. Show three unselected sales as research context only.
9. Improve source citations (human-readable address/date and compact source code) and consistent financial number formatting.
10. Preserve and highlight plain-English Monte Carlo explanation, including the limitations of `0% simulated loss`.
11. Keep legally required Kern disclaimer intact pending licensing/source-rights review.

## Acceptance tests

- Arosa financial invariance: $260,000 purchase, $15,000 rehab, $380,000 exit, $275,000 modeled total, $105,000 modeled profit, 38.2% ROI, $308,000 MAO remain unchanged for **saved revision 1**; warnings are presentation-only.
- No owner-sourced payoff labeled lender-confirmed without qualifying lender document.
- No `data/raw/`, local paths, raw JSON filenames or sensitive identifiers visible in investor PDF text.
- No unsupported assertion of verified closed sales, distress, ARV or seller equity.
- Filename tests and export/download parity pass.
- Brief and full PDF visual QA: no empty/orphan pages, clipping, overflow or tiny unreadable reference columns. Render and inspect every page at 100% and print scale.
- Regression on Arosa, Crestview, Haven and at least one long-address property; preserve reports, saved scenario revisions, financial and Monte Carlo engines.
- No new provider calls, DB migrations, production changes or deployment during this report-only pass.
- Deliver revised PDFs, before/after page renders, machine-readable QA, change log and any unresolved licensing questions. Stop for review.

## Acceptance decision

**GO for internal analysis and continued iteration. NO-GO for investor distribution until P0 accuracy and presentation issues are resolved.**
