# PROPERTY INTELLIGENCE — INVESTMENT WORKSPACE V1
## Codex implementation brief | Workside Software | 2026-10-13

## Mission
Build an actual, usable local-first PI investment workspace—not another isolated PDF demonstration. A nontechnical analyst should be able to select up to six properties, inspect sourced research, optionally enrich missing information, enter underwriting assumptions, run the **existing certified** deterministic economics/MAO and Monte Carlo engines, compare scenarios, and export an Opportunity Brief and full Investor PDF.

**Priority: a working vertical slice.** Do not spend days creating new hash-manifest generations, verifying ZIP codes, or obtaining serial permissions for trivial provider charges. Preserve existing protections without allowing them to block preliminary research. Do not silently bypass a deliberate live-execution guard; if the certified live path remains disabled, use the already retained six-property dataset and report the one specific activation obstacle separately.

## Ground truth / starting data
Use the six real subjects and evidence from `data/runtime/gabe-demo-v2-2026-10-13/` and the V2.1 recorded-sales work. Their reviewed preliminary addresses and AVMs are:
- GABE-01: 1708 Crestview Dr, Bakersfield CA 93305; $291,000 as-is AVM
- GABE-02: 2308 Kent Dr, Bakersfield CA 93306; $363,000
- GABE-03: 2429 Williams Ct, Rosamond CA 93560; $366,000
- GABE-04: 107 E San Emidio St, Taft CA 93268; $168,000
- GABE-05: 27096 Cote St, Boron CA 93516; $159,000
- GABE-06: 3431 Monterey St, Bakersfield CA 93306; $226,000
The V2.1 PDF displays 22 RentCast-reported sale examples (4 each for five subjects; 2 older records for Boron). These are research comparables, **not independently certified arm's-length sales or ARV**. The historical Power-to-Sell amounts are **not** current payoffs or mortgage balances. Do not replace these meanings.

Inspect the repository to identify actual entrypoints, models, APIs, tests, reports and MAO/Monte Carlo interfaces. Reuse them; don't assume file locations beyond known runtime evidence paths. JavaScript/React only, no TypeScript. Follow existing styling and patterns.

## User workflow / acceptance criteria
### 1. Candidate selection
- Search/filter available candidate pool; select up to six with explicit checkboxes and a batch summary.
- Include the six V2.1 subjects as a ready-to-use demo batch. Display reviewed preliminary address, city, beds/baths, size, historical screening reason, data freshness and enrichment status.
- Distinguish historical county signal from current distress, and preliminary address from legal identity. Do not require a new Google lookup to display already reviewed addresses.
- Never turn demo selection into MLS Round 1 or a durable canonical Property approval.

### 2. Evidence detail
- Each selected property opens a detail view with tabs or clear sections: Overview, County/Distress, Property Facts, Sold Sales, Listings, Underwriting, Risk, Reports.
- Show exact source/date for AVM, subject characteristics, historical tax-list amount and recorded-sale candidates. Display price, reported sale date, distance, size, beds/baths and quality flags for sale examples; listings must be separate.
- Enable analyst include/exclude and notes for comparable candidates. Never silently certify arms-length transactions or condition. Show an evidence-quality indicator and reasons for missing fields.
- Cache/reuse existing provider evidence. Optional refresh/enrich action must show expected number of requests and spend before calling. Never auto-retry or loop across pages without a visible cap.

### 3. Underwriting editor
- Analyst can enter and save per-property, per-scenario assumptions: acquisition price, rehab, contingency, resale/exit price, purchase closing costs, financing amount/rate/points, holding duration and costs, taxes/insurance/utilities, selling commission/closing costs, target profit/margin and relevant other costs.
- Every input is explicitly labeled **Analyst assumption**, with editable defaults only when disclosed. Never initialize resale price silently from as-is AVM as if it were ARV; optional 'Use AVM as starting assumption' must require an explicit click and label.
- Inline validation, currency formatting, saved draft, scenario duplication, reset and scenario comparison. Use a local isolated store if production persistence is not approved. Refreshing the page must not silently discard entered assumptions.
- Include a lightweight what-if summary that updates immediately. Use the existing certified deterministic economics/MAO engine for authoritative calculated results, not a newly invented formula. Show a full cost waterfall and break-even/max allowable offer with assumptions and engine version.

### 4. Risk and Monte Carlo
- Wire existing certified Monte Carlo V1 with explicit uncertainty inputs, seed and reproducibility. Show distributions, probability of loss, percentiles and sensitivity drivers. Distinguish simulation output from predictive accuracy.
- If the engine cannot run because of missing required assumptions, identify the exact missing fields. Never invent values to make a green status.

### 5. Reports
- From a saved scenario, generate a clean 1–2 page Opportunity Brief and the existing detailed Investor PDF with source citations, assumptions, cost waterfall, MAO and risk output where computed.
- Preview before export. No synthetic results on real property reports; missing data shown as missing. Preserve full required Kern County disclaimer when county data is distributed.
- Ensure a property-specific PDF has an unambiguous header, generated date, scenario version, 'Preliminary underwriting—not appraisal/title verification' labeling and readable tables. Use existing Puppeteer/report templates rather than starting over.

## Product design
- Professional, restrained PI navy/teal styling; minimal clicks, no analyst-facing hash jargon or SHA-256 text.
- Clear progress steps: Select → Evidence → Assumptions → Analyze → Report.
- One property at a time for editing; batch comparison table across up to six.
- Provide useful empty states, warnings and obvious primary actions. Show error messages that tell the analyst what to do next.
- Local development UI should be accessible using the repo's normal dev server and documented URL. No production deployment.

## Cost and execution boundaries
- User has approved **up to $20 total combined Google/RentCast enrichment expenditure for the six-property demo**, not an unlimited or permanent subscription spend. Prior work reports 18 RentCast requests at a conservative $3.60 overage exposure; reconcile actual ledger before additional paid calls. Do not reset that accounting. Show remaining allowance and request estimate in the UI.
- For this workspace milestone, prefer retained evidence and make **zero new provider calls unless strictly necessary for a user-triggered refresh**. No extra authorization ceremony for simply using cached data. If live provider path is explicitly disabled, do not bypass it; deliver the complete offline workspace with refresh disabled and a clear reason.
- No production database writes, MLS actions, automatic investor sharing, owner/contact exposure or deployment.
- Current legal parcel, title, liens, tax redemption and availability remain separate due diligence—not a prerequisite for a clearly labeled preliminary financial scenario.

## Implementation sequence
**Milestone A — usable vertical slice first:** Existing six subjects load in the real PI UI; choose one, view actual evidence, edit assumptions, calculate economics using certified engine, save local scenario and export a readable Opportunity Brief. Show this working before expanding.

**Milestone B — risk and batch:** Monte Carlo integration, scenario comparison and batch overview; polished errors/empty states.

**Milestone C — complete reporting and QA:** Full investor PDF, provenance, disclaimer, visual QA, end-to-end browser tests.

Do not spend an entire cycle only writing plans. Implement A first and continue B/C if no blocker. If a blocker arises, stop only the affected feature and report the exact issue; preserve a usable working slice.

## QA / exit criteria
- Test all six subjects load from the correct evidence and retain their provenance.
- Test inputs, persistence of local drafts, recalculation, negative/invalid assumptions, missing sold comps, excluded sales, duplicated scenarios and no cross-property leakage.
- Verify economics/MAO and Monte Carlo outputs match existing certified engine fixtures; do not change core formulas.
- End-to-end browser smoke test: select GABE-01 → inspect evidence → enter explicit purchase/rehab/resale/costs → run analysis → save → reopen → export PDF. Repeat an alternate subject with different assumptions.
- Render and visually inspect PDF(s); verify no overflow, clipped charts or invented fields. Confirm source disclaimer and evidence/assumption separation.
- Run relevant existing regressions and focused new tests. Do not rewrite historical baselines or create another certificate-selector framework for this UI.

## Deliverables to return
1. Working local UI URL, launch commands and short user walkthrough.
2. Implemented file list, changed APIs/components and local draft storage behavior.
3. Screenshots of candidate selection, evidence detail, underwriting and analysis.
4. One actual-data/synthetic-assumptions (clearly labeled) Opportunity Brief PDF and one full Investor PDF if possible.
5. Focused QA results, known limitations and precise next steps.
6. Summary of any incremental provider charges and request counts (zero expected for cached-first implementation).

**Stop for Stan/ChatGPT review after delivering a functioning vertical slice, not another paperwork-only certification.**
