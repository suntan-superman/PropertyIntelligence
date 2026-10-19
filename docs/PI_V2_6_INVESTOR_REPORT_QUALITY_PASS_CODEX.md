# Property Intelligence V2.6 — Investor Report Quality Pass

**Codex implementation specification | 19 October 2026**

## Mission and boundaries

Improve the **Opportunity Brief** and **Full Investor Package** so a prospective investor can quickly understand the deal thesis, economics, uncertainty, evidence, and next diligence steps. This is a **report content and presentation** milestone, not a storage, authentication, infrastructure, provider, or calculation-engine milestone.

Use these two existing report outputs as the primary visual and content regression fixtures:

- `400_Decatur_St_Bakersfield_CA_93308_Opportunity_Brief_2026-10-19_R1.pdf` (4 pages)
- `400_Decatur_St_Bakersfield_CA_93308_Full_Investor_Package_2026-10-19_R1.pdf` (25 pages)

Do not hard-code the Decatur address, page counts, values, comparable count, or appendix count into templates. Preserve report generation for Crestview, Haven, Arosa, and future properties, including incomplete data and zero documents.

**Hard exclusions:** No Firebase/Firestore/Storage/IAM/Cloud Run changes, no provider calls, no live data edits, no new uploads, no deployment, no rewriting certified financial or Monte Carlo engines, no alteration of historical report revisions. Work locally and use synthetic/mocked fixtures. Stop after offline certification for review.

## Findings to correct, grounded in the supplied reports

### P0 — Financial headline integrity

Both reports lead with $150,000 acquisition, $35,000 rehab, $240,000 resale, **$55,000 modeled profit**, and **29.7% ROI** while financing, holding, acquisition closing, selling, and exit costs are $0. The report does disclose that costs are omitted, but the headline may be mistaken for a complete net-profit estimate. The Full Package also displays a **$169,000 conditional MAO** and **$205,000 break-even purchase** based on the incomplete cost model.

**Implement:**

1. Create a report-only `costCompleteness` presentation projection from existing input metadata; never change engine outputs.
2. Distinguish **gross acquisition-to-resale spread** from **modeled profit after entered costs** and **estimated net project profit**. Use the last label only when material costs have been reviewed/entered or expressly validated as zero; otherwise show **Incomplete-cost scenario / not a net-profit estimate**.
3. On the first page, visually couple any headline profit/ROI/MAO with an adjacent prominent cost-completeness warning. Do not bury the caveat in tiny text or a distant section.
4. Explicitly identify major unentered/assumed-zero cost categories (purchase closing, financing, property tax, insurance, utilities, commissions, exit closing, rehab contingency). Show a concise summary rather than repeating a long warning everywhere.
5. Preserve the exact existing model values and definitions; never manufacture missing expenses or silently replace a zero with a benchmark. If illustrative expense examples are shown, label them as hypothetical and exclude them from saved certified results.
6. Avoid presenting 0% simulated losses or a zero-dollar delay impact as real-world safety when material cost inputs are zero.

**Acceptance:** A reader of page 1 cannot reasonably mistake the $55,000 example for verified net profit; conditional MAO is clearly not an offer recommendation. Engine-output hashes remain unchanged.

### P0 — Evidence-to-claim discrepancies

The Decatur synthetic attachments intentionally conflict with scenario entries:

| Claim | Entered scenario | Attached synthetic fixture |
|---|---:|---:|
| Original mortgage principal | $100,000 | $150,000 |
| Payoff | $101,000 | $134,912.66 |
| Rehabilitation estimate | $35,000 | $30,000 |

These are **QA-only** attachments, not real property records. The system must not imply that a linked reviewed document corroborates the entered amount simply because it is attached.

**Implement:**

1. Add a report-only evidence reconciliation summary for material linked claims. Use **structured analyst-confirmed amounts** where available; do **not** pretend PI can reliably extract amounts from arbitrary PDFs or introduce a new AI/OCR pipeline.
2. When both structured document-supported amount and entered claim amount are available, compare them and show a clear **Mismatch — analyst review needed** status with both amounts and the delta.
3. If no structured document amount is available, show **Document linked; amount not independently reconciled**, not a fabricated match.
4. Differentiate **CLEAN file**, **reviewed document**, **approved for redistribution**, and **independently verified underlying claim**. These are different concepts. Never elevate a claim based on upload or approval.
5. Use existing immutable document-version references; preserve synthetic labels and never alter evidence inputs, documents, or scenario history.
6. Present discrepancies in the Full Package's diligence section; the Brief should show only material unresolved discrepancies in a short alert.
7. Resolve naming inconsistencies: e.g., a field named “Verified payoff” can still contain an owner-reported *unverified* amount. Investor-facing text must reflect actual verification status, not the input control's title.

**Acceptance:** All three Decatur discrepancies are surfaced **only if their document amounts are represented in supported structured metadata**. Otherwise explicitly report “not reconciled” and identify the limitation; do not invent extraction. The report never calls a synthetic document authentic evidence.

### P1 — Opportunity Brief: concise, decision-oriented

Current Brief is four pages: main material on pages 1–2, a lengthy county disclaimer on page 3, and supporting references on page 4. Page 2 has excessive whitespace. Required notices must not be silently removed.

**Implement:**

1. Target **one to two pages of main brief content** for ordinary cases, followed by any legally/source-required notice and optional evidence-reference annex as separately labeled supplemental pages. Do not guarantee two total PDF pages if a required notice must remain.
2. Suggested main content order: property and status; executive investment hypothesis; financial assumptions and cost completeness; primary valuation support; top risks; key next diligence questions; compact scenario/downside panel.
3. Limit primary comparable table in the Brief to approximately 3–5 analyst-designated primary comparables, if available. Summarize secondary observations by count; do not silently discard them from the Full Package.
4. Make the source/distribution notice and supporting-document register clearly distinguishable from the brief's core pages.
5. Use conditional, accurate wording for unsupported ARV and source-reported transactions. Avoid promotional claims of investment quality.
6. Avoid almost-empty continuation pages through measured layout, section grouping, and sensible page-break rules.

**Acceptance:** Brief is scannable in 60–90 seconds; no orphaned few-line pages except a legally required standalone notice; no omitted required disclaimer.

### P1 — Full Package: pagination, wrapping, and density

Observed defects in Decatur's 25-page PDF:

- Page 4: sparse continuation of analyst evidence table.
- Page 6: nearly empty continuation of seller-position material.
- Pages 7–9: narrow “Linked evidence” column wraps repeated “No approved linked document in this report” into tall vertical text, bloating the input ledger.
- Page 14: almost blank continuation of provenance.
- Pages 17–25: appendix covers + original pages work, but covers may be space-intensive.

**Implement:**

1. Replace verbose per-row linked-evidence prose with compact `Linked (n)`, `Pending`, `None`, or short appendix references. Explain the statuses once in a legend.
2. Rebalance table widths for currency, labels, and evidence; use minimum sensible font sizes and avoid character-by-character wraps.
3. Use keep-together for headings with their first content rows, but do not force entire large tables onto a new page unnecessarily.
4. Use repeating table headers on continuations and clearly mark “continued” where needed.
5. Fix orphaned continuation pages using layout measurements and intentional page-break decisions. Avoid hard-coded page indices.
6. Preserve source notice in full if required; do not truncate or reword licensing text without verified permission.
7. Keep appendix provenance, original pages, document order, synthetic notices, SHA/version references, and page numbering. Optimize covers only if traceability remains equally clear.
8. Maintain readable PDF text and avoid content overlap, clipping, blank pages, and excessively small fonts.

**Acceptance:** No isolated one-line continuation pages, no visibly vertical-word wrapping in ledgers, no blank pages, and consistent page numbering across varying document lengths.

### P1 — Comparable-sales evidence quality

Decatur has 11 selected research observations spanning $140,000–$310,000, with no individual adjustment rationales. The report correctly says these are unverified, unadjusted research—not a validated ARV. Preserve that distinction.

**Implement:**

1. Support analyst-designated **Primary**, **Secondary**, and **Excluded** research roles. If this designation does not exist in current scenario data, use a report-only grouping and label it **not yet classified**; do not silently infer primary comps by price or distance.
2. In Full Package, show primary comps prominently (subject vs comp: SF, beds/baths, distance, date, price, condition when known, rationale, adjustments only if supported).
3. Summarize secondary observations and retain complete source research in a compact supplemental table when appropriate.
4. No auto-adjusted ARV, no assumption that provider-reported “Sale” is independently verified escrow closing, and no implication that selecting 11 records makes all 11 strong comparables.
5. Explain the difference between provider **as-is AVM $255,000**, analyst **$240,000 exit assumption**, and any separately supported post-rehab ARV. Do not merge them.
6. Surface known source-reported property risks, when present in structured evidence: unpermitted bedroom, cooling configuration, as-is condition, assignment/closing terms. Do not invent unrecorded facts.

**Acceptance:** Decatur report does not label 11 unadjusted observations as an independently established resale valuation.

### P1 — Investment assessment and actionability

Add a concise report section answering: What is the current thesis? What is supported? What is assumed? What prevents a reliable decision? What would change the assessment?

Use a **diligence status**, not a fabricated investment recommendation. Example Decatur state: purchase $150k assumption; exit $240k unverified; rehab $35k unverified; material cost inputs incomplete; valuation not established; title/payoff/condition open.

A short ranked “Next five diligence actions” is preferable to repeating every possible disclaimer. Explicitly separate seller obligations from investor project costs and financing.

### P2 — Monte Carlo explanation and readability

Keep the certified simulation untouched. Retain the existing plain-English “Understanding the Monte Carlo Analysis” section. Improve its visual association with the risk results and make input-range/cost-completeness caveats prominent. A 0/1000 loss result is **conditional on bounded assumptions**, not a real-world zero-loss claim. For 30-day delay stress, $0 modeled change must prominently explain that daily holding expenses are entered as zero.

### P2 — Source and appendix UX

Keep detailed technical provenance and required legal/source notices, but move low-level identifiers out of investor decision sections. Avoid repeating full address, disclaimers, or internal codes more often than needed. Use report appendix index, compact cross-references, and clear “Synthetic QA / Not for Distribution” labeling in test reports.

## Implementation method

1. **Inspect** current report rendering architecture, layout helpers, fixture generation, scenario/report binding, and existing tests. Identify the smallest reusable presentation-layer changes.
2. **Baseline** current Decatur PDFs with page thumbnails and a machine-readable content manifest (headlines, values, page count, selected docs, disclaimers).
3. Implement the P0 content changes first, then P1 layout, then P2 polish. No broad refactor.
4. Keep report projections **pure and deterministic** from saved scenario + evidence/document metadata; no mutation or provider lookup during rendering.
5. For discrepancy checks, use existing structured metadata only. If missing, document a later enhancement rather than introducing PDF parsing or AI extraction in V2.6.
6. Render both reports for Decatur and at least two materially different fixture properties (e.g., one with zero docs/zero comps, one with many comps/long appendices).
7. Inspect **every page visually** (page montage plus targeted full-resolution views) and programmatically check text boundaries, overflow, unexpected blank pages, header/footer collisions, page numbers, and expected content.
8. Run focused report tests and existing financial/Monte Carlo/document authorization regressions. Record exact pass counts; do not claim a pass for anything not run.

## Acceptance tests

- Headline labels change appropriately when material costs are unreviewed/zero; certified numbers unchanged.
- Incomplete-cost warnings accompany ROI/MAO/profit on first page.
- Evidence links show correct version and eligibility; mismatches are not invented from unparsed PDFs.
- Opportunity Brief main narrative fits 1–2 pages in typical fixtures; mandatory notices remain intact.
- No orphan pages like current Full Package pages 4, 6, 14; ledger no longer exhibits narrow-column vertical wrapping.
- Comp evidence status and AVM vs ARV vs analyst exit remain distinct.
- Source dates, redistribution restrictions, and county notices remain correct.
- Monte Carlo output and explanation remain consistent; no false “0% real-world risk” impression.
- Appendix document count, order, cover/source details, page numbering, and exclusions remain correct.
- No live provider calls, uploads, Firestore writes, Storage writes, or deployment.
- Report filenames remain property-associated (street/city/date/revision), sanitized for Windows/macOS.

## Deliverables and stop condition

Produce:

1. `docs/PI_V2_6_INVESTOR_REPORT_QUALITY_PASS.md` — implementation decisions, before/after examples, remaining limitations.
2. Updated Opportunity Brief PDF and Full Investor Package PDF for **synthetic QA Decatur scenario**, with obvious **QA / NOT FOR DISTRIBUTION** marks.
3. Before/after page montages and targeted screenshots for financial summary, comparable analysis, input ledger, risk, and appendices.
4. Machine-readable QA summary with tests, report page counts, zero-write/provider-call confirmation, and data/financial invariance hashes.
5. A concise **GO/NO-GO for private-development report quality**, explicitly separating rendering quality from the unresolved accuracy of the underlying investment assumptions.

**Stop for review after local certification. Do not deploy or modify live Decatur data.**

## Priority principle

**Make the report useful to a real investor without claiming to certify the underlying investment.** Accuracy of labels, source distinctions, financial completeness, readable layout, and clear next diligence actions matter more than adding features.
