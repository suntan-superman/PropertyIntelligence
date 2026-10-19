# PROPERTY INTELLIGENCE V2.0 — 60-DAY LEAD-TO-INVESTOR PLAN

**Owner:** Workside Software LLC  
**Implementation agent:** Codex  
**Stack preference:** Existing PI stack; JavaScript only (no new TypeScript)  
**Status:** Approved development direction; no production deployment authorized by this document.

## Product decision

PI's initial commercial product is **lead-to-investor research, underwriting, and professional reporting**. Proactive distress discovery remains available as an experimental capability, but is **not** a launch dependency. Preserve existing county datasets, discovery implementation, evidence snapshots, financial engines, and historical tests.

Two user entry points may remain, but **Analyze a Property** is the default. The primary workflow is:

**Enter address / receive seller lead → identify property → retrieve licensed evidence → add analyst research → set acquisition, rehab, and resale assumptions → run MAO, downside scenarios, optional Monte Carlo → review → generate investor package.**

## Operating principles

1. Build on PI V1.5.2/V1.6 work already in the repository; inspect current state before editing. Do not overwrite newer work or break existing routes.
2. Avoid new certification frameworks, source-hash bureaucracy, and repetitive approvals for ordinary user operations. Retain normal tests, access controls, and auditability.
3. Keep facts, provider estimates, analyst assumptions, and PI calculations explicitly distinguishable.
4. Never invent lien status, current loan payoff, property condition, sale availability, ARV, or completed comparable sales.
5. Permit preliminary hypothetical underwriting with unknowns visible; do not make title or parcel certification a prerequisite for a scenario.
6. Protect provider credentials and comply with actual licensing restrictions. Do not scrape consumer property websites or import their reports beyond permitted uses.
7. Desktop-first. Make the experience understandable without knowledge of PI's internal modules.
8. Preserve MAO and Monte Carlo calculations; fix integration or display issues without altering certified formulas unless a demonstrated defect is separately reviewed.

## Days 1–14: Core product — implement first

### A. Simplify the user journey
- Default landing action: **Analyze a Property**.
- Accept street/city/state, with ZIP optional. Reuse working Google geocoding and RentCast services when configured, and retained evidence before new calls.
- Present an intelligible status: Address suggestion, property match, provider evidence, research gaps, and next step.
- Keep **Discover Opportunities** accessible but secondary. Place Saved Properties, Deals, Scenarios, Reports under **My Workspace**. Hide QA fixtures and legacy navigation from ordinary users.
- From Property Detail, make **Underwrite This Property** the obvious next action.

### B. Analyst evidence workspace
- Add editable, source-attributed research entries for: recorded mortgages, original principal, algorithmically estimated balance, verified payoff (if separately evidenced), liens, releases, taxes, NOD/NOTS/foreclosure events, title status, occupancy, condition, and seller/agent notes.
- Each entry: value/status, source name, source date, retrieval date if available, confidence/verification classification, optional notes, and optional attachment reference. Unknown is default.
- Allow attaching user-provided documents where existing local infrastructure safely supports it; otherwise build the UI and document the storage dependency without inventing upload persistence.
- Keep analyst-entered evidence separate from provider payloads and from derived estimates. Do not automatically infer that a recorded lien is outstanding or that a modeled mortgage balance is payoff.
- Do not expose owner contact details or sensitive documents in investor reports by default.

### C. Underwriting workflow
- Basic form: proposed purchase price, rehab budget, resale assumption, expected project duration, financing type, target hurdle.
- Offer explicit, editable illustrative defaults for closing, rehab contingency, taxes, insurance, utilities, holding, selling, and financing; never silently replace saved scenarios.
- Show all major expenses and warn about material zero-cost assumptions.
- Calculate profit, ROI, cash-on-cash where meaningful, break-even acquisition ceiling, hurdle-specific MAO, and deterministic downside cases using existing engines.
- Monte Carlo optional, with transparent distributions and conditional interpretation.
- Save/reopen revisions and preserve property-specific isolation. Allow side-by-side scenarios for the same property.

### D. Reports
- Provide an executive Opportunity Brief and a polished Full Investor Package, generated from the same scenario and evidence snapshot.
- Executive: property, thesis, acquisition/rehab/resale assumptions, total project cost, modeled profit/return, MAO, comparable-sale support, distress rationale if evidenced, top risks and missing diligence.
- Full: research evidence, all comps with analyst selection rationale, cost waterfall, sensitivity, optional Monte Carlo, methodology, source dates, disclaimers/required licensed notices.
- Put long identifiers and exhaustive ledgers in appendices rather than prominent headers. Preserve legally required notices in their entirety where applicable.
- Do not present an AVM as ARV, modeled mortgage balance as verified payoff, or scenario probabilities as forecasts.

### E. Acceptance tests for Milestone 1
Use at least these retained subjects: GABE-01 Crestview (recorded-sale research), GABE-04 Taft (outlier), GABE-05 Boron (thin evidence), and durable Haven Street (no retained sold-sale research). Also test a newly entered address without saved evidence.

A nontechnical tester should be able to: enter address → see research facts/gaps → enter or edit assumptions → run economics → save scenario → generate both PDFs, without visiting development tools.

Check arithmetic consistency, no cross-property leakage, explicit unknowns, no accidental QA fixtures, no blank or overflowing PDF pages, and persistence after reload. Include screenshots and a concise usability issue list.

**Stop after Milestone 1 for user acceptance review.** Do not automatically start Milestone 2.

## Days 15–28: SellMyKernHome.com lead intake and real-case validation

- First inspect the actual website repo, existing form implementation, hosting, and consent language. Do not assume access to production or change the website without approval.
- Define a secure, versioned lead-intake contract (property address, lead reference, submitted date, optional seller-provided property details, source and consent metadata). Use authenticated server-to-server delivery or a signed webhook; no secrets in frontend JavaScript.
- Design idempotency, duplicate handling, spam controls, PII minimization, retention, and error handling. Keep seller contact details out of investor PDFs by default.
- Create a staging/mock integration and test the end-to-end handoff. Production website integration requires separate explicit approval.
- Evaluate 5–10 genuine or historical deals supplied with permission by Gabe. Record his original assumptions and compare PI's outputs and presentation against his process. Do not fabricate cases.
- Track elapsed research/underwriting/report time and actual provider request costs.

**Stop for review before public lead intake or production data transfer.**

## Days 29–42: Restricted beta

- Audit existing backend/data architecture before choosing auth/storage; Firebase Auth may be suitable, but use the stack that fits the actual application.
- Implement authenticated login, server-side authorization, explicit approved-user access, and tenant/user isolation. Initial roles: Super Admin, Analyst, Pending; expand only if needed.
- Protect every API route, stored scenario, private evidence attachment, and PDF download. Prevent direct unauthenticated access to cached reports or provider data.
- Ensure vendor-specific access conditions are honored, including First American's password-protected-interface restriction if its data is later integrated; do not infer general downloadable redistribution rights.
- Stage a restricted deployment with no public registration and test against two separate users. Do not deploy until approved.

## Days 43–60: Commercial validation

- Observe at least 10 real/historical case evaluations and 3 comparisons against prior human underwriting when available.
- Measure median time to first report, time to final investor package, provider cost per property, report corrections, missing-data frequency, usability friction, and user willingness to pay.
- Initial **targets, not claims**: first report under 15 minutes after usable inputs; PDF generation under 2 minutes; routine provider data cost ideally under $5/property excluding specialty reports.
- Identify top five issues from user testing, fix them, and prepare a private-beta go/no-go recommendation.
- Do not commit to pricing or build subscription billing until users demonstrate value.

## Deferred / not in scope

- Mass county enrichment, ZIP-wide NOD harvesting, large-scale foreclosure monitoring, parcel geometry recovery, new First American/ATTOM production integrations, speculative API contracts, consumer-site scraping, and paid subscription launch.
- Preserve all existing discovery code/data and document how to re-enable this future premium capability.

## Immediate Codex deliverables

1. Repository current-state inventory and short implementation plan (avoid rewriting existing working features).
2. Milestone 1 implementation with local URL.
3. Screenshots of address entry, evidence entry, Basic underwriting, scenario comparison, and report preview.
4. Opportunity Brief and Full Investor Report for two contrasting real retained subjects, explicitly labeled as hypothetical scenarios.
5. Focused regression and browser/PDF QA summary.
6. Concise list of remaining blockers and actual provider usage/cost.

**No live paid provider calls, database migrations, public deployment, permanent deletion, or production website changes in Milestone 1 without separate explicit approval.** Existing local retained data may be used. Report a specific blocker rather than creating another approval/certification framework.
