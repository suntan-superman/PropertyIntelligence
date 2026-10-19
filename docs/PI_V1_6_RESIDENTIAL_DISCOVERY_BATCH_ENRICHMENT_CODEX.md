# PROPERTY INTELLIGENCE V1.6 — Residential Discovery & Batch Enrichment

**For Codex | Workside Software LLC | JavaScript only**

## Mission
Turn the retained Kern County Power-to-Sell dataset into a practical, desktop-first residential lead research workflow. Do not wait for First American's undocumented Advanced/Flex Search contracts. Do not invent foreclosure, mortgage, equity, lien, or current delinquency claims.

## Starting facts and boundaries
- Existing PI V1.5.2 desktop navigation: Analyze Property, Discover Opportunities, My Workspace.
- Retained cohort: 11,321 imported source rows, 11,316 unique candidates. Reported county situs present 1,270, missing 9,990, malformed 3, Assessor-unmatched 53; geometry crosswalk available for 11,263, but geometry payload/coordinates not necessarily available.
- Historical Power-to-Sell evidence is a screening signal, **not** current default, foreclosure, owner motivation, or property availability.
- Existing RentCast, Google address resolution, V1.4 underwriting, MAO, Monte Carlo and PDF systems must be reused, not rewritten.
- First American geographic foreclosure search remains blocked pending exact vendor contracts. Do not implement speculative endpoint payloads.

## Phase A — Discovery UX and screening (implement first, offline)
1. Inspect actual repo and current UI before editing. Preserve working routes and saved data.
2. Make **Residential Opportunities** the default Discover view, with optional **All County Records** and **Needs Research** tabs. Do not silently discard nonresidential records.
3. Add filters: city/available ZIP (only if sourced), assessor use category, source date, historical PTS amount, county situs availability, match quality, prior enrichment, and shortlist membership. Explicitly label unsupported ZIP as unknown; do not infer ZIP from city.
4. Build a reproducible residential screening score with transparent components: residential use confidence, historical distress evidence, address readiness, source age, property-data completeness, and researchability. Keep investment attractiveness and potential profitability **unscored** absent financial evidence. A high tax amount alone must not imply a good investment.
5. Provide a compact sortable table with source address, category, historical PTS amount/date, address readiness, evidence quality, current research status, and next action. Show detail in a side panel. Use a fixed-width desktop-friendly layout and avoid nested scrolling where possible.
6. Support selecting a batch of up to 80 candidates, saving named research batches, and shortlisting up to six from a batch. Allow later expansion through configuration, not hardcoded assumptions.
7. Persist local drafts using the current supported store without contaminating production Properties or QA fixtures. Verify reload, undo, duplicate prevention, and isolation of different batches.
8. For no-situs parcels, show ATN/APN and exact available geometry *metadata* only. Do not create approximate pins when coordinates or geometry are absent.

## Phase B — Evidence enrichment planner
1. Build a **Preview Enrichment** action for a selected batch. Show each candidate's proposed next lookup, available cached evidence, expected provider request count, estimated incremental charges when rates are actually known, and blockers.
2. Reuse existing Google Geocoding only for street/city-bearing records, with CA from known Kern jurisdiction. Preserve county situs and Google suggestions separately. Respect existing quota (reported 10/min, 25/day), cache policy, and backend key restrictions. Avoid unnecessary repeat calls.
3. Reuse RentCast property/valuation/sold research only where the current contracts and license allow. Never automatically treat listing observations as completed sales. Preserve identifiers and crosswalk conflicts; an address suggestion does not establish legal parcel identity.
4. Add an explicit operator **Run Selected Enrichment** action only if the existing live execution path is operational, current provider entitlement/billing is confirmed, and the requested calls fit a clearly displayed approved budget. Otherwise deliver the full offline planner and an exact blocker list. **No live calls in this assignment without separate operator authorization for this specific batch.**
5. For each enriched candidate, show property facts, source-specific distress reason, as-is AVM where available, sold research status, and missing mortgage/lien/foreclosure evidence. Show status labels: Not researched / Researching / Preliminary / Needs review / Research-ready; do not imply investment approval.
6. Provide a simple review queue for ambiguous identity or address matches. Routine street/city/ZIP suggestions should be easy to accept preliminarily without legal-title-grade attestation.

## Phase C — Shortlist to underwriting and reports
1. Make **Analyze** on a research-ready candidate open the existing unified V1.4 underwriting workspace with the correct subject and source snapshot.
2. Maintain strict subject isolation; no cross-property assumptions, comparables, or cached responses.
3. Preserve Basic/Advanced assumptions, illustrative expense presets, MAO and Monte Carlo. No changes to certified mathematics.
4. Produce a batch summary export and individual research briefs that state why selected, what is supported, what is unknown, and the next investigation. If using county-derived data, retain the applicable complete county disclaimer and existing licensing restrictions.
5. Keep QA/demo fixture records out of ordinary user lists.

## Acceptance scenarios
- Select 80 residential candidates from the retained county cohort, save/reload batch, filter and rank with reproducible reasons.
- Distinguish address-bearing from no-situs candidates; correctly handle an example such as 130 Kern St, Taft, and a no-situs parcel.
- Exclude cannabis production and motel examples from default residential shortlist without deleting them from All County Records.
- Build six-property shortlist and open a candidate in underwriting; verify property, assumptions, comps and report identity stay matched.
- Preview enrichment with cache hits, provider requests and cost/quotas; no actual provider call in offline QA.
- Verify ZIP 93312 search never fabricates coverage where source ZIP is absent.
- Verify all existing regressions and run browser checks on a desktop viewport; visually inspect shortlist and PDF exports.

## Deliverables
- Running local URL and concise operator walkthrough.
- Screenshots: discovery filters/table, 80-property batch, enrichment preview, six-property shortlist, underwriting handoff.
- QA summary, known limitations, and actual provider calls/costs (expected zero).
- One short Markdown implementation report and one focused next-step recommendation.
- No new certification framework, speculative First American integration, production deployment, irreversible deletions or unapproved provider spending.

**Stop for Stan/ChatGPT review after the offline workflow is functioning.**
