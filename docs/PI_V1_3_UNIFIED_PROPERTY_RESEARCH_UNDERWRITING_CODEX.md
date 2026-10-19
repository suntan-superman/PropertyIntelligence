# PROPERTY INTELLIGENCE — V1.3 Unified Property Research & Underwriting UX

**Codex implementation brief | Workside Software LLC | October 13, 2026**

## Mission
Make PI feel like one coherent investor application: **select property → review evidence → enter assumptions → analyze economics and risk → export reports**. Build on the existing V1.2 Property Detail and V1.1 Investment Workspace. This is a focused UX/integration iteration, not an engine rewrite, provider acquisition project, or new certification framework.

## Baseline and boundaries
- V1.2 fixed numeric-string coordinates; 15 retained Haven observations map. V1.1 workspace already supports scenario revisions, MAO/economics, Monte Carlo, briefs and full PDF exports.
- Keep original evidence payloads, dated snapshots, analyst decisions, certified calculation code, report source attribution, and legacy workflows intact.
- No new provider calls, production DB writes, MLS selections, deployments, credential exposure, or silent evidence promotion. Work locally with existing retained data.
- Preliminary research must not be presented as verified title, legal identity, current distress, seller availability, arm's-length sale, appraisal or guaranteed return.
- No arbitrary $1 gating, repetitive membership certification, or reapproval of ordinary UI operations. Run normal focused regressions and UI/PDF QA.

## Milestone A — One coherent entry and navigation
1. Inspect existing React routes and Property Detail, legacy Deal Mode and Investment Workspace entrypoints. Document current navigation and how durable properties differ from six Gabe research subjects.
2. Make **Analyze Investment Opportunity** the primary CTA on Property Detail. Route into the **existing** Investment Workspace with the exact selected subject/evidence snapshot bound; never silently substitute a different subject.
3. Keep **Legacy Deal Mode** accessible only as a secondary clearly labeled option, without deleting functionality or changing old URLs.
4. Support both a saved durable property (3484 Haven St) and the six Gabe research candidates. If the workspace cannot consume a durable property's evidence shape, implement the smallest typed read-only adapter; preserve the original record and flag unavailable sold-sale data explicitly.
5. Back navigation must return to the same Property Detail/selection context. A saved scenario must reopen with its original subject and evidence cutoff. Prevent cross-property scenario leakage.
6. Add a concise workflow breadcrumb or step indicator; avoid introducing a second competing dashboard.

## Milestone B — Comparable evidence UX
1. Create clear tabs: **Recorded sales**, **Active listings**, **Inactive listings**, **All provider observations**. Counts must reflect distinct concepts; overlapping categories must not be summed as unique properties.
2. **Haven** has 15 retained AVM/listing observations but no subject-bound recorded-sale research in the shown evidence. Show zero recorded sales honestly; do not borrow Gabe sales from a different property. For Gabe subjects, show only their own retained recorded-sale examples and analyst statuses.
3. Group identical normalized address + unit + coordinates and source identity where safe. Preserve every source observation and original ID in expandable history. Similar addresses, missing units or uncertain identities remain separate with a short ambiguity explanation. Do not claim 15 independent properties when duplicate observations are present.
4. Default to a compact table: address, evidence type, price (listing or reported sale), date, beds/baths, area, distance, selection status. Expand a row for source provenance, observations, cautions and analyst notes.
5. Synchronize selected map marker, group, and table row. Handle overlapping markers with a simple selectable cluster list. Keep keyboard accessibility and visible selection state.
6. Retain provider coordinates, numeric-string parsing and Haversine distances. Never infer legal parcel location. When coordinates are missing, retain a useful list and display a small explanatory map fallback.
7. Do not silently promote a reported Sale event to an analyst-approved comp or treat inactive listings as closed sales.

## Milestone C — Presentation and underwriting continuity
1. Replace verbose repeated disclaimer text in primary UI with one succinct contextual caveat and expandable **Evidence limitations**. Keep mandatory full county disclaimer in distributed PDFs and detailed source pages.
2. Format monetary amounts as USD, dates consistently, and missing values as **Not available** or **Not verified**, as appropriate. In particular format Haven's last sale, assessment and tax amounts.
3. Condense empty property-details sections; keep useful facts above the fold. Preserve detailed records behind disclosures.
4. Show as-is AVM and its range compactly, never label it ARV. Maintain separate editable analyst resale assumption.
5. In the Investment Workspace, clearly separate **Observed/provider-reported evidence**, **Analyst assumptions**, and **Calculated outputs**. Provide straightforward inputs for purchase, rehab, resale, holding and financing; retain existing advanced inputs behind an optional details section.
6. Use the existing economics, MAO and Monte Carlo engines unchanged. Keep scenario versions and saved evidence snapshots stable.
7. Ensure Opportunity Brief and Full Report exports retain the correct subject, comparable selection statuses, assumptions, financial results, risk interpretation and required county disclaimer.

## Acceptance scenarios (must test)
- **Haven durable property:** Property Detail → Analyze Investment Opportunity → correct subject and retained snapshot → edit assumptions → calculate → save/reopen → export brief/full PDF → back to Haven. Recorded-sales tab remains zero if no subject-bound sale research exists.
- **GABE-01:** Four retained sale examples visible; one selected in the QA scenario and three not selected; statuses preserved through report export.
- **GABE-04:** Low-price sale outlier visible with analyst exclusion/rationale, not automatically used as ARV.
- **GABE-05:** Two older sales, thin evidence clearly communicated; no invented additional comps or numerical ARV.
- **Duplicates:** Two exact same-address observations collapse to one display group only when identity evidence supports grouping; all underlying source records remain accessible. Ambiguous unit/address cases remain separate.
- **Map:** Fifteen Haven source observations remain represented; selection sync works for overlapping markers, with accurate distinction between observation count and distinct address groups.
- **Safety:** Switching properties never carries another property's inputs, results or comps without explicit user action. Unknown condition, title, ownership and motivation remain unknown.

## Implementation process
1. Inspect current code and document a concise plan; then implement milestones A–C in the existing app. Do not stop for routine questions when existing behavior and this brief determine the answer.
2. Prefer small reusable components, minimal state changes and JavaScript (no TypeScript). Reuse existing styles, routing and test infrastructure.
3. Run unit/regression tests, browser interactions, and PDF export checks. Visually inspect critical screens at desktop and narrower widths, plus sample PDF pages. Fix functional or material visual defects before reporting done.
4. If a genuine architectural/security blocker arises, stop with exact file/line, user impact and the smallest proposed fix. Do not create another protection or certification architecture.

## Deliverables
- Local running app URL and exact launch command.
- Short implementation summary with changed files.
- Before/after screenshots: Haven overview, valuation, comp map/table, underwriting workspace, GABE-01 research sales.
- Brief and Full PDFs for at least Haven (if evidence supports export) and GABE-01; test GABE-04/GABE-05 edge cases.
- Test results, remaining known limitations, and concise handoff.

## Definition of done
A nontechnical user can select a property, understand its available evidence, open underwriting, change assumptions, see calculated economics and risk, and export reports **without navigating disconnected legacy experiences**. No factual claims are invented, no certified financial engine changes, and no unnecessary operational gates are introduced.

**Stop for Stan/ChatGPT review after implementation and QA. Do not deploy.**
