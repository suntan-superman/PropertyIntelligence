# PROPERTY INTELLIGENCE — GABE DEMO V2.1
## Six-address human review, verified sold comparables, and investor-research PDF refresh

**Priority:** Immediate. **Project:** Property Intelligence. **Owner:** Workside Software LLC.

## Objective
Improve the existing six-property V2 demonstration, not build another certification framework. Preserve the current V2 PDF, HTML, source evidence and historical decisions. Produce a revised PDF with human-reviewed preliminary addresses and genuine completed-sale comparable evidence wherever supportable.

## Current baseline
The V2 report contains six RentCast-matched property records, six as-is AVMs, historical Kern Power-to-Sell amounts, and listing observations. It contains **zero accepted sold comps** and **zero human-reviewed addresses**. Existing review interface: `data/runtime/gabe-demo-v2-2026-10-13/REVIEW_QUEUE.html`. Existing report: `data/runtime/gabe-demo-v2-2026-10-13/PI_GABE_OPPORTUNITY_REPORT_V2.pdf`.

## Phase 1 — address review (human in the loop)
1. Inspect the existing review queue and its export format. Provide exact local launch/open instructions; ensure all six candidates appear with original county situs, RentCast suggested complete address, relevant source identifiers and discrepancies.
2. Permit **preliminary address acceptance**, correction with cited evidence, or Needs More Evidence. Never conflate preliminary address review with parcel status, ownership, title, postal deliverability or canonical identity approval.
3. Do not forge Stan's decisions, click approval checkboxes on his behalf or infer approvals from matched strings. If human decisions are required, **pause and request Stan to complete/export them**. Validate exported fingerprints and source binding before use.
4. Do not re-query Google just because earlier technical pilots used it. Use retained county/RentCast evidence first. Any Google call must be justified, counted and separately reported; preserve Google retention limits.
5. The PDF must continue to label unreviewed/ambiguous addresses clearly. A partial review must not block other candidates.

## Phase 2 — completed-sale search compatibility
1. Inspect the exact safe RentCast client and supported request contract. Identify why bounded sold-record search is blocked. Implement the **smallest compatible, independently testable extension** for a documented RentCast Property Records search, without changing the existing certified identity/financial engines or bypassing request validation.
2. Check the actual RentCast endpoint documentation/parameters and avoid inventing unsupported radius/date/limit query arguments. Where necessary, search via supported parameters and apply a deterministic **local** distance/date/type/size filter, with a bounded maximum provider response and explicit query plan.
3. Restrict results to **verified completed sales** with an explicit sold/closed transaction indicator and actual sale price/date. A listing price, inactive listing, pending transaction, AVM suggestion or historical assessed value is not a sold comp. Where transaction type or arm's-length status is unknown, label accordingly and do not silently accept.
4. Require geographic/jurisdiction consistency, unique subject binding, deduplication, exclusion of the subject itself, and transparent reason codes for rejected records. Proposed screening preferences: recent 6–12 months, near subject, same property type, reasonable GLA/beds/baths similarity; allow documented expansion for thin markets such as Boron/Taft/Rosamond. These are pilot preferences, not universal valuation rules.
5. Preserve source provenance, transaction dates, addresses, characteristics, exact provider response identifiers and licensing terms in private gitignored storage. Do not store owner/contact data in the report.
6. Implement offline mock tests for wrong subject, stale sale, listing-only results, duplicates, malformed prices, over-budget calls, retries, mismatched location and incomplete transaction evidence. Do not weaken any existing gates or rewrite historical QA.

## Phase 3 — controlled live acquisition
The user authorized **up to $20 total incremental combined Google Maps and RentCast API charges for this six-property enrichment exercise**. The V2 run reported up to $2.40 exposure from 12 RentCast requests; reconcile actual account usage and ledger before estimating remaining headroom. Do not treat $20 as a target or permission for unlimited requests.

Prepare an explicit maximum request count and per-call ceiling, no uncontrolled retries or automatic fallback. Use server-side keys only. Verify the applicable commercial rights and current provider billing evidence already retained, including Cindy's confirmation that all endpoints are included and there are no extra endpoint/tax charges. Respect any separate live-execution controls; **do not bypass a disabled engine or create fake operator attestations**. If a real request cannot be safely authorized under the existing controls, stop live acquisition and deliver the complete offline compatibility work and a precise one-step operator action; do not embark on a new protection architecture.

## Phase 4 — investor-research PDF V2.1
Produce a polished, locally generated PDF and HTML using existing design conventions, retaining the county disclaimer in full. For each of the six real candidates show:
- Reviewed or explicitly pending full address, beds/baths, floor area, lot area, year built, source dates.
- Exact **historical** Power-to-Sell trigger and amount; do not claim current delinquency, foreclosure, payoff, mortgage distress, ownership or sale availability without new evidence.
- RentCast **as-is AVM** and its range, explicitly *not* ARV/appraisal.
- 3–5 actual closed-sale comparables **only where verified**: address, sold date, sold price, size, beds/baths, distance, price/SF, evidence quality and reason for inclusion. Clearly distinguish listing context in a separate section.
- A concise comparison of AVM and observed closed-sale context, without pretending an unadjusted median is an ARV. If too few valid comps exist, say so and avoid numerical ARV.
- Unknown condition/rehab, acquisition price, current taxes/liens, financing, title and returns, with specific next diligence action.

Add an executive comparison page that identifies evidence completeness and review status rather than ranking investments by speculative profit. Do not run real MAO/Monte Carlo unless its existing financial-input gate is actually met. No fabricated condition, rehab cost, offer price, profit or ROI.

## QA and deliverables
- Validate all six county/RentCast bindings, address-review exports, provider rights, sold transaction classification, duplicate filtering, financial claim boundaries, budget/request accounting and no production writes.
- Render every PDF page and inspect clipping, typography, tables, footers and county disclaimer. Report real number of accepted sold comps per candidate.
- Preserve prior V1/V2 reports and original evidence. Keep raw records and review exports private/gitignored.
- Write final outputs under `data/runtime/gabe-demo-v2-1-2026-10-13/` and concise `docs/PI_GABE_DEMO_V2_1_READINESS.md`.
- Return links/paths to PDF, HTML, review queue/export instructions, QA summary, calls made, maximum incremental spend and blockers.

## Stop conditions
If Stan's review is required, stop at that human action and provide exact steps. If live sold-search remains blocked, report the exact contract or permission defect, and **do not substitute listing observations as sold comps**. No production database writes, MLS selections, durable Properties, deployment or changes to certified MAO/Monte Carlo/identity engines.

**Success:** a demonstrably richer, credible six-property research PDF with actual closed-sale evidence where available, and explicit remaining gaps; not another certification-framework sprint.
