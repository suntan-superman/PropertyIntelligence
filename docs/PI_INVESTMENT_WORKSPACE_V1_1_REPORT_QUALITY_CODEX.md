# PROPERTY INTELLIGENCE — INVESTMENT WORKSPACE V1.1
## Codex implementation brief: Investor report quality, evidence integrity and cross-property regression

**Project:** Property Intelligence (PI), Workside Software LLC  
**Priority:** High — improve investor-facing output before Gabe's evaluation  
**Reference samples:** `GABE-01-brief.pdf` (2 pages) and `GABE-01-full.pdf` (11 pages), generated from the local Investment Workspace V1.  
**Scope:** Existing local workspace, report normalization, presentation templates, PDF export and focused tests. **Do not rewrite certified MAO, deterministic economics or Monte Carlo math.**

## 1. Objective and acceptance standard

Deliver a clear, professional **Opportunity Brief** and **Full Investor Report** for user-defined real-estate investment scenarios. Reports must distinguish (a) sourced observations, (b) analyst inputs and assumptions, (c) calculated outputs, and (d) unknowns. Preserve actual values and provenance, but remove debug-like repetition and poor pagination. Do not add artificial approvals, certification infrastructure, provider calls, database writes, deployments or unnecessary identity gates.

Use the six retained Gabe research subjects as a **cross-property test matrix**, not only Crestview. Support zero, one, two, and four available recorded-sale examples; selected and unselected research examples; low-price outliers; stale sales; and missing values. Keep the complete county disclaimer with every distributed copy where required.

## 2. Specific defects from supplied reports

### P0 — Evidence classification
- Full report page 7 shows `Property condition` and `Seller motivation` under **ESTIMATED** despite both being unknown. Correct to **UNKNOWN** absent a genuine analyst estimate.
- Do not classify preliminary address review as verified legal parcel identity. Split address status from parcel identity, ownership/title and lien status.
- On page 8, `Sources & methodology` repeats generic `Evidence item` and labels the historical county list as `PROVIDER ESTIMATE`. Use meaningful labels (e.g. Property characteristics, As-is AVM, Historical Power-to-Sell amount, Recorded-sale research) and truthful types (county historical record, provider-reported fact, provider model estimate, analyst assumption, PI calculation).
- Property facts such as reported beds, area and year built should be **provider-reported** rather than automatically labeled as valuation estimates. Do not promote them to independently verified facts.
- Write focused tests that fail on classification contradictions, missing source labels, or an unknown shown as zero.

### P0 — Comparable transparency
- V2.1 source research contains **four** reported Sale examples for GABE-01, but the scenario report displays only **one** because only GABE-01-S1 is included in the analyst scenario. This distinction is valid but currently misleading.
- Display **all available research examples** (up to four in the retained set), with explicit `Included in analyst analysis`, `Not selected`, or `Excluded` statuses, source sale date/price, size, distance, beds/baths, and analyst rationale when supplied. Do not imply excluded comps were analyzed or accepted.
- Explain why a single selected $200,000 sale cannot independently validate the $291,000 as-is AVM. No invented price adjustments or numerical ARV. For low-price outliers, visibly flag unverified transfer terms and condition.
- For Boron (two older sales), show `Thin/older evidence` instead of forcing a four-row table or deriving ARV.
- If source research and scenario-selected comps differ, show the distinction prominently in the brief and full report.

### P0 — Monte Carlo interpretation
- Full report page 6 shows `100% probability of positive profit` and `0% probability of loss` from **500 iterations under artificial triangular distributions**. These are conditional simulated frequencies, not calibrated real-world probabilities.
- Prefer wording such as `Positive-profit simulations: 500/500 (100%)` and `Loss-making simulations: 0/500 (0%)`, followed immediately by `Under entered assumptions; not a forecast of actual investment risk`.
- Preserve exact model outputs, seed, distribution settings, percentiles and stress deltas. Do not change calculations or fabricate confidence intervals.
- Make sensitivity labels legible and note that differently sized stress changes cannot be directly interpreted as comparable probabilities or causal impacts.

### P1 — Opportunity Brief redesign
- Make page 1 an **investor decision snapshot**, not a debug-style input dump. Prominently display subject/address, preliminary evidence status, purchase/rehab/resale assumptions, total project cost, modeled profit, modeled ROI and hurdle-specific MAO.
- Add a compact `Why this property was surfaced` panel with historical Power-to-Sell amount/date, explicitly not current delinquency/payoff or seller availability.
- Include an honest `Market evidence` panel: AVM range and a small summary of reported sales, with analyst-selected status. Put top 3 diligence questions where they are immediately visible.
- Replace the long three-column cost waterfall with a readable grouped cost summary; retain detailed line items in the Full Report.
- The county disclaimer may occupy page 2 when necessary; never truncate or omit required text. Design page 1 to stand on its own as an executive summary while preserving required attachment/distribution terms.

### P1 — Full Report hierarchy and pagination
- Page 1 has substantial unused lower space. Pages 3, 4, 7, 8 and 10 also have opportunities to consolidate content. Improve density without shrinking body text to illegibility or creating clipping.
- Suggested sections: Executive snapshot; Property and historical distress evidence; Valuation, recorded-sale research and comparability; Scenario assumptions and economics; Risk simulation and sensitivity; Diligence decisions and sources; Required county disclaimer.
- Use conditional sections: omit empty mortgage/encumbrance tables in favor of one clear `Not checked / not returned` statement. Avoid duplicating the same disclaimer sentence in every subsection.
- Preserve scenario revision, source references, model versions, as-of/retrieval dates and assumptions in a compact methodology section or appendix.
- Keep charts and tables together with their explanatory text; avoid orphan headings, wide blank bands, repeated headers within the body and crowded footnotes.

### P1 — MAO, returns and financial terminology
- Page 5: profit $59,080 and total cost $240,920 imply ROI about 24.5%; confirm report mapping remains correct without changing the engine.
- The reported $194,080 MAO uses `PROFIT_MARGIN_ON_SALE` 15% hurdle, whereas 24.5% is profit divided by total project cost. Label each denominator/criterion clearly; never call them the same target.
- Preserve the distinction between break-even purchase ceiling ($239,080 in sample), MAO ($194,080), purchase assumption ($180,000), and AVM ($291,000). Do not imply any is a recommended bid.
- Financial inputs that are zero must remain **explicit scenario assumptions**, not evidence that the corresponding real-world costs are absent.

## 3. Workflow and implementation constraints

1. Inspect current report adapter, templates, scenario normalization and existing tests before editing. Identify the narrowest change surface.
2. Preserve all certified MAO, economics and Monte Carlo engines; do not modify their calculations or the protected original synthetic report adapter. Use a versioned/presentation-only adapter if necessary, without inventing a new approval framework.
3. Keep local scenario editing, scenario revisions and PDF export functioning. No API acquisition is required for this assignment.
4. Avoid hardcoded Crestview values, fixed page counts or property-specific layout hacks.
5. If a field is unavailable, display a concise `Unknown`, `Not checked`, `Not returned`, or `Analyst assumption`, whichever accurately describes its state.
6. Preserve raw evidence, original PDFs, analyst decisions, county disclaimer and source provenance. Do not overwrite frozen packages.
7. Do not add new third-party services, credentials, provider calls, production persistence, MLS selections or deployments.

## 4. QA requirements

- Focused tests: evidence classification, comp inclusion/exclusion, unknown fields, scenario versioning, dollar/percentage formatting, correct profit/ROI/MAO mapping, Monte Carlo conditional-frequency language, and required disclaimer presence.
- Generate **brief and full report for at least three materially different subjects**: GABE-01 (four sales, one selected), GABE-04 or GABE-02 (outlier), GABE-05 (two older sales). Include a no-comps fixture and zero/unknown input fixture.
- Inspect every page visually at normal reading scale, not merely via text extraction. Verify no clipping, overflow, awkward blank pages, orphaned headings or illegible charts.
- Run relevant existing regressions. Report pass/fail and skips honestly; don't change old expected baselines just to pass.
- Compare modeled financial outputs with pre-change outputs to prove no calculation drift.

## 5. Deliverables and stop condition

Provide:
- Updated local Opportunity Brief PDF and Full Investor Report PDF for GABE-01, plus at least GABE-04 and GABE-05.
- Screenshots/contact sheets or a visual QA index of all generated pages.
- Concise change summary: exact files modified, defects fixed, tests and regressions, remaining limitations.
- A short `What an investor can infer / cannot infer` note for Gabe's demonstration.

**Stop for review after generating the artifacts.** No live provider calls, database writes, production deployment or new certification machinery. If a concrete blocker exists, report it directly rather than expanding scope.

**Success criterion:** A reader can understand the deal hypothesis, entered assumptions, modeled economics, research comps and unresolved risks in two minutes from the brief; the full report adds substantive evidence and calculations without repetition or false certainty.
