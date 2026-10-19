# Property Intelligence V2.0 — Investor Report Quality Pass

**Codex implementation assignment — 15 October 2026**  
**Scope:** Opportunity Brief and Full Investor Package only. **Stop for review before Milestone 2, deployment, provider calls, or production writes.**

## Mission
Make PI's investor-facing reports genuinely useful to a real estate wholesaler and prospective investor: a clear opportunity hypothesis, traceable property evidence, defensible financial assumptions, readable economics, and candid risks. Do not confuse visual polish with evidentiary strength. Preserve the existing MAO, ROI, cash-on-cash, deterministic downside, and Monte Carlo engines unchanged.

## Baseline evidence and known defects
Use the existing GABE-01 Crestview PDFs as baseline: `GABE-01-brief-r1.pdf` (2 pages) and `GABE-01-full-r1(1).pdf` (8 pages), plus their producing code and saved scenario revision. Reconcile any filename differences by examining the repo, not guessing paths. In the baseline:

- Subject: **1708 Crestview Dr, Bakersfield, CA 93305**, 3 BD / 1 BA, 1,098 SF, built 1948.
- Purchase **$175,000**, rehab **$15,000**, exit **$280,000**; total modeled cost **$212,845**, profit **$67,155**, project ROI **31.6%**, cash-on-cash **34.3%**, return-hurdle MAO **$199,783.25**.
- RentCast as-is AVM **$291,000** ($262,000–$319,000). **Four source-reported sale events, zero analyst-selected comps**. Resale is therefore an unsupported analyst assumption, *not* a comp-derived ARV.
- Historical county Power-to-Sell amount **$28,025.21** is **not** current delinquency, foreclosure, payoff, or proof of motivation.
- Seller financial evidence: recorded original principal **$135,000**, seller-reported estimated outstanding balance **$120,000**, delinquent taxes **$1,200**, other liens **unknown**. No verified payoff; seller equity and proceeds remain unknown.
- Full report page 3 exposes raw machine labels such as `RECORDED_DOCUMENT`, `SOURCE_REPORTED`, and `ANALYST_ASSUMPTION`, with unformatted amounts. Its “algorithmic estimated balance” phrasing conflicts with the **Seller** source; resolve this through accurate provenance mapping, not cosmetic renaming.
- Full report page 2 has substantial unused space; page 4 contains comp cards without analyst selections; page 8 is county disclaimer. Brief page 2 is entirely disclaimer. Preserve legally required county notices, but review whether optional county-derived material can be excluded from a report variant **only when source rights and attribution obligations permit**. Do not remove required disclaimer text or assume redistribution rights.
- Simulation 1,000/1,000 positive-profit trials is **conditional on chosen bounded distributions**, not real-world 100% success probability. Avoid prominent unqualified success-rate headlines.

## Phase A — inspect and define acceptance baseline
1. Locate current report renderer, HTML/Puppeteer templates, typography/style tokens, evidence mapping, scenario serialization, PDF export, source attribution, and regression tests.
2. Render both existing PDFs and inspect every page visually. Capture baseline page counts, text overflow, broken tables, whitespace, headings, accessibility/readability concerns, and all displayed values.
3. Produce a concise before/after acceptance matrix. Do not alter financial engine implementation or historical saved evidence.

## Phase B — Opportunity Brief (investor-first, typically 1–2 substantive pages plus required notices)
1. Lead with address, property facts, report status/date, and a **conditional investment hypothesis** grounded in actual inputs. E.g., a $175k acquisition/$15k rehab/$280k exit scenario models $67,155 profit *if* the assumptions hold. Never claim the property is available for purchase, has confirmed distress, or is undervalued.
2. Provide a clear financial dashboard: acquisition, rehab, total costs, modeled profit, project ROI, cash-on-cash, MAO, and break-even. Explain return denominator in concise footnotes.
3. Show a simple cost composition chart and a small downside comparison. Make visual emphasis proportionate; don't visually bury expenses or risks.
4. Include **Resale support status**: “Analyst exit assumption — no comparable sales selected” for current Crestview. Show available sale examples as research context with date, price, size, proximity, and selection status; never silently convert listing prices to closed sales.
5. Present a short **What must be verified** checklist: actual purchase/contract terms, property condition and rehab estimate, title/liens/payoff, sale-event verification, and market-supported exit.
6. Add optional property image only if the user has supplied it or it is obtained from an explicitly authorized source with documented display/export rights. No fabricated house photos, scraped third-party imagery, or generic stock photos presented as the subject. If unavailable, use an elegant typography-first layout.
7. Maintain clear distinction between “Illustrative / preliminary” and fully supported diligence. Avoid a wall of repeated warnings; use concise, strategically placed caveats and an appendix where appropriate.

## Phase C — Full Investor Package
1. Suggested hierarchy (adapt pagination to real content): executive deal overview and investment hypothesis; property & market context; comparable research and resale support; seller financial position; detailed acquisition/rehab/holding/disposition waterfall; returns, MAO and sensitivity; Monte Carlo assumptions/results; diligence/open questions and sources; mandatory notices/appendices.
2. Reduce unused page space with balanced grids, compact evidence tables, and natural pagination. Never shrink text to illegibility to achieve an arbitrary page count.
3. Add meaningful visuals when data supports them: grouped project-cost waterfall, profit sensitivity, simulation histogram, and selected comp comparison. Charts must label units, denominators, sources, and assumptions. Do not generate unsupported geographic or property imagery.
4. Replace raw internal enums with human-readable display labels. Currency must be formatted (`$135,000`, not `135000`). Dates, decimals, line wrapping, and table widths must be consistent. Keep raw codes only in an optional technical provenance appendix.
5. Correct evidence taxonomy end-to-end: **recorded original principal**, **seller-reported estimated balance**, **provider algorithmic estimate** (only when actually algorithmic), **verified lender payoff** (only when independently documented), **analyst proposed sale price**, **unknown liens**. Preserve sources and dates. Do not promote seller claims to verified facts.
6. Clearly distinguish the **seller's existing obligations** from the **investor's acquisition financing**; do not add the former to investor project costs or MAO.
7. If a user has selected comps, show which were included, excluded, or pending and their stated reasons; disclose that selection alone does not establish adjusted ARV. If zero are selected, present an explicit “Exit value not independently supported by selected comps” notice.
8. For simulation: prominently say “0 losses in 1,000 simulated outcomes **under the entered ranges**”; include P10/P50/P90, sample size, seed, distributions, and important omitted risks. No unqualified “100% success” or guaranteed-return language.
9. Retain source references, retrieval/as-of dates, relevant provider licensing/redistribution constraints, and the complete county disclaimer wherever legally required. Do not infer permissions from a password-protected app alone.

## Phase D — Report UX and export
- Preview must faithfully match export; use a saved scenario revision and immutable evidence snapshot. If draft, offer **Save & Preview** with an understandable confirmation rather than a silent disabled action.
- Make **Opportunity Brief** and **Full Investor Package** easy to choose, preview, export, and reopen from My Workspace.
- Include generated-at date, scenario name/revision, subject address, and preliminary status in document metadata/footer.
- Never expose sensitive private attachment paths, credentials, or restricted research fields by default.

## Phase E — Test matrix and acceptance
Test at least:
1. **Crestview GABE-01** with existing figures, zero selected comps, unknown liens, seller-reported mortgage estimate, and a completed Monte Carlo run.
2. A second real retained property with sparse/missing evidence (e.g., GABE-05 Boron), preserving honest Unknown labels and avoiding empty ornamental pages.
3. A case with analyst-selected comps and source notes; a case with no simulation; a case with a lender-confirmed payoff (fixture only, clearly labeled synthetic).
4. Long addresses, large numbers, long source descriptions, and 0–many lien records.
5. Cross-check every financial number against saved scenario/engine outputs; **no financial engine modifications**.
6. Verify PDF visual QA at every page: no clipping, blank pages, overlapping text, broken charts, or tiny text. Compare old/new first-page and report-wide screenshots side-by-side.
7. Verify no remote asset requests during PDF generation, no unauthorized images, no provider calls, no database connections/writes, and no production deployment.
8. Run existing regressions for MAO, deterministic scenarios, Monte Carlo, seller evidence, comparable selection, scenario save/restore, and PDF export. Record counts and skipped tests.

## Required handoff
- Short root-cause/quality assessment and exact modified files.
- Before/after screenshots of each report, including every generated page or a visual QA index.
- Regenerated Crestview Brief and Full Investor Package, plus sparse-evidence report.
- Table of financial numbers and provenance assertions verified.
- Any unresolved licensing, evidence, or presentation issues clearly stated.
- Exact local command to view/preview the new reports.

**Stop for Stan/ChatGPT review. Do not start Milestone 2. Do not invent investment evidence or change the certified financial models.**
