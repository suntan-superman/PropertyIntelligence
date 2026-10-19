# PROPERTY INTELLIGENCE — GABE DEMO: SIX-PROPERTY PDF PREVIEW

**Priority:** Today, October 13, 2026. **Deadline:** produce a reviewable PDF by 2:00 PM America/Los_Angeles, ahead of a 3–4 PM meeting. Favor a finished, honest deliverable over new infrastructure.

## Objective
Generate a polished, self-contained **PDF investment opportunity preview** of up to six actual, distinct Kern County candidates, plus a matching local HTML preview and a one-page presenter guide. This is a **preliminary research demonstration**, not a verified investment recommendation or a formal Round 1 MLS selection. Use the existing PI investor-report visual system/Puppeteer PDF pipeline wherever practical. Do not redesign the certified financial engine, identity system, or protection infrastructure.

## First: inventory, select, and validate
1. Inspect the current repository, candidate shortlist, 77 nonpilot pool, existing candidate exclusions, source seals, investor-report V1.1 templates, synthetic Monte Carlo demo, and relevant existing preview/PDF rendering commands. Use actual discovered paths; do not assume a named file exists.
2. Select **up to six** distinct nonpilot candidates deterministically from the existing county pool. Preserve source bindings, exclusions, provenance and original ordering/ranking where applicable. Never use the three excluded RC/IP technical pilot candidates. Never mark selection as Round 1 approval. If only 3–5 candidates meet minimum evidence requirements, show 3–5; do not fill gaps with invented properties.
3. Each candidate must have intact county provenance and sufficient evidence to identify it as a real candidate. Include actual complete address only where licensed and source-supported; otherwise show city/neighborhood or a privacy-safe candidate reference and explicitly mark the address incomplete. Do not derive ZIPs or parcel identifiers.
4. Confirm what real facts are available for each candidate: source dates, property type/attributes, county distress indicators, sale history, valuation or comparables. Do not infer that a foreclosure notice equals a bargain or that assessed value equals acquisition price.

## PDF content and presentation
Deliver a **high-quality 8–12 page PDF if six candidates qualify**, adjusting page count to actual content. Suggested structure:
- Cover: “Property Intelligence | Kern County Opportunity Preview” with **Preliminary Research — Demonstration** and date.
- Executive overview: count screened, count shown, geographic scope, evidence completeness, limitations and the practical question each candidate raises.
- One page per candidate (consistent layout): candidate reference, supported location, source-backed attributes, relevant distress/screening signal and its date, reason to investigate, major unknowns, financial-input readiness, and recommended next diligence action. Use maps/photos only if already licensed, accurately bound to that exact property, and permitted for this output; otherwise use elegant text and simple graphics, not generic stock property images.
- Comparison matrix: consistent columns such as candidate, area, type, screening signal, evidence confidence (categorical, not fabricated numerical score), acquisition/ARV/rehab status, next action. Avoid ranking by projected returns without real data.
- “What PI Can Deliver” page: describe existing deterministic economics, Monte Carlo risk and investor-report capabilities. **If showing an example calculation, place it on a distinctly separate page headed SYNTHETIC FINANCIAL DEMONSTRATION — NOT ASSOCIATED WITH ANY OF THESE PROPERTIES.** Never put synthetic profit figures on actual candidate pages.
- Next steps/disclaimer page: source provenance, dates, uncertainty, analyst review and due-diligence needs.

Visual direction: professional investor-grade layout; restrained navy/charcoal, warm neutral backgrounds, one accent; readable typography; consistent margins, page numbers and section headings; no oversized readiness scores, orphaned headings, awkward blank spaces, repeated images or duplicate maps. Avoid dense tables that overflow pages. Make it suitable to show on a laptop or print.

## Financial evidence rules
- **Never invent** purchase price, asking price, ARV, comps, renovation costs, profit, ROI, MAO or Monte Carlo distributions.
- Use “Not yet supported” / “Analyst estimate required” for missing inputs.
- RentCast AVM listing comparables are not sold comparables. No AVM is automatically ARV.
- If no real property-specific financial inputs are sufficient, produce an attractive **screening opportunity preview** instead of an investment-return report. This is a success, not a blocker.
- Distinguish observed county evidence, licensed provider evidence, analyst estimates, investor assumptions, and synthetic demonstration values.
- Avoid implying current parcel activity, legal ownership or title has been independently verified.

## Implementation constraints
- Work in a new isolated, gitignored demo-output directory, e.g. `data/runtime/gabe-demo-2026-10-13/`.
- Reuse existing rendering/templates where safe; a small dedicated presentation adapter is acceptable if it does not modify certified V3, Rule C, Monte Carlo, MAO or Investor Report V1.1. Do not touch historical PDFs or frozen packages.
- **No new provider requests**, RentCast activation, ATTOM downloads, Google geocoding, MLS access, database writes, durable Property creation, analyst approvals, production deployment, or changes to Round 1 selection.
- Never include owner names/contact information or credentials. Treat any output containing full licensed addresses as private and share only with Gabe for review under applicable source rights; preserve required source disclaimers.
- Do not make this task dependent on the stalled Stage A certificate-selector/activation process.

## Deliverables
1. `data/runtime/gabe-demo-2026-10-13/PI_KERN_OPPORTUNITY_PREVIEW.pdf` — actual finished PDF, not a proposed layout.
2. `data/runtime/gabe-demo-2026-10-13/PI_KERN_OPPORTUNITY_PREVIEW.html` — matching offline HTML preview.
3. `data/runtime/gabe-demo-2026-10-13/GABE_DEMO_TALKING_POINTS.md` — one-page discussion guide, including questions about Gabe's underwriting workflow, investor package requirements, deal sourcing, pricing and whether he can share a real deal for validation.
4. `docs/PI_GABE_DEMO_READINESS_2026_10_13.md` — sanitized summary with count of actual candidates, included/omitted fields, source-rights constraints, PDF page count, output locations, QA, and outstanding gaps. No private parcel IDs/addresses in tracked docs.

## Quality gates
- Render the actual PDF to page images and inspect **every page** for clipping, alignment, readability, visual balance and honest labeling. Repair and rerender defects.
- Verify every displayed property claim against source evidence and source date. Check that all shown candidates are unique and non-excluded.
- Verify zero synthetic financial claims on actual candidate pages; no unsupported investment-return numbers; no accidental disclosure of personal data.
- Verify PDF opens, HTML opens locally, fonts/charts render, links do not require external access, and page count matches intended design.
- Run only focused tests required for the demo; no broad certification framework development or protected-baseline updates.

## Timeboxing and fallback
**Start producing the PDF immediately.** Aim for a first usable PDF within 60–90 minutes. If evidence extraction or report integration is slow, reduce scope to 3–4 fully supported candidates and complete the PDF. Do not spend the meeting window repairing unrelated infrastructure. If a candidate has incomplete financial data, show the gap. If an existing report renderer is difficult to adapt, create a simple standalone HTML/CSS-to-PDF preview using the already installed Puppeteer stack.

## Final Codex response
Report: number of real candidates shown; PDF path; HTML path; talking-points path; pages inspected; evidence/identity QA results; missing fields; any rendering defects; unexpected protected changes; provider calls (must be 0); database writes (must be 0); MLS selections (must be 0). Classification: `GABE_DEMO_PDF_READY`, `PARTIAL_DEMO_READY`, or `DEMO_BLOCKED` with exact reason.

**Stop after deliverables and review. Do not proceed to live acquisition or production deployment.**
