# PROPERTY INTELLIGENCE V2.0 — MILESTONE 1.1
## Workflow Simplification & Scenario UX — Codex Implementation Brief

**Project:** Property Intelligence (PI), Workside Software  
**Stack:** Existing React/JavaScript application; JavaScript only (no TypeScript).  
**Scope:** Focused usability improvements to the existing local lead-to-investor workflow.  
**Stop point:** Complete local implementation and QA, then stop for operator review. **Do not start Milestone 2.**

## 1. Objective

A first-time user should be able to select or enter a property, review its evidence, choose comparable sales, record seller/property research, underwrite a deal, compare scenarios, run optional risk analysis and generate an investor report without learning PI's internal architecture.

Do not rewrite certified MAO, Monte Carlo, scenario calculations, evidence provenance, or report mathematics. Preserve the original source data and historical revisions. Do not add new providers, production database changes, or authentication/deployment in this assignment.

## 2. Inspect the existing implementation first

Locate the current workspace router, tabs, scenario draft and saved revision state, local persistence, property/snapshot binding, risk editor, PDF preview/export, and existing tests. Identify the smallest changes required. Preserve deep links and legacy routes through redirects or aliases. Confirm current behavior using Crestview `GABE-01` (1708 Crestview Dr, Bakersfield, CA 93305) and the saved Haven Street property.

## 3. Five-stage navigation

Present five primary stages:

1. **Property Research** — Overview, county/distress, property facts, listing context.
2. **Comparable Sales** — Recorded sales, map, inclusion/exclusion and analyst notes.
3. **Seller & Property Evidence** — Seller Financial Position, liens, taxes, title, condition and Analyst Evidence.
4. **Financial Analysis** — Underwriting, scenarios, deterministic sensitivity and Monte Carlo.
5. **Investor Reports** — Opportunity Brief and Full Investor Package.

Retain every existing subview, but make them accessible as clear secondary tabs/sections within each stage. Maintain subject ID, evidence snapshot, current scenario and unsaved draft while moving between stages. A direct link to an old tab must still open the corresponding new stage and subview. Preserve keyboard navigation, focus visibility and accessible labels.

Use a single scenario toolbar near the top of the workspace, rather than duplicating the controls in every stage. Keep scenario name, active revision/draft state, Save locally, Duplicate, New blank and Reset draft actions discoverable. Use short confirmation prompts for destructive draft resets; don't introduce repetitive confirmations for ordinary navigation.

## 4. Unsaved draft scenario comparison

**Defect:** Underwriting calculates modeled profit, ROI and MAO for a draft, but Scenario comparison says 'Not available' or 'results withheld'.

Show valid current draft calculations in the comparison table, explicitly labeled **Unsaved draft — calculated preview**. Show saved revisions with their saved values and revision IDs; do not write draft results into saved historical records. If inputs are incomplete or invalid, show a specific explanation rather than invented zeros. Preserve existing calculation precision and labels (especially return-hurdle MAO versus other price ceilings). Never show simulated loss unless Monte Carlo has actually run for that scenario. For comparisons, do not silently mix different properties or evidence snapshots. Display a warning if scenarios use differing assumptions or snapshot dates.

Test that changing a draft input immediately changes only that draft's preview, not a saved revision. Duplicate creates an independent draft with the intended assumptions. Refresh/reopen behavior must match existing persistence semantics.

## 5. Reporting: Save & Preview

Replace the confusing disabled-report dead end with a prominent **Save & Preview** action for an unsaved valid draft. Explain that the preview is generated from a newly saved immutable scenario revision. If save fails, do not preview or imply success. After save, allow Preview and Export PDF for the exact saved subject, snapshot, evidence and assumptions. Keep the ability to select Opportunity Brief versus Full Investor Package. If the draft is incomplete, list missing required inputs in actionable language.

Preserve private evidence exclusions, source attributions, uncertainty disclosures, PDF rights restrictions and current report rendering. Do not auto-publish or deploy generated reports. Validate that scenario changes after saving require another save to appear in a new report, avoiding stale-report confusion.

## 6. Monte Carlo: illustrative starting assumptions

Add **Populate illustrative risk assumptions** to the Risk subview. Seed editable minimum / most likely / maximum values from the current scenario. Example *defaults* (not hardcoded output values):

- Resale: 90% / 100% / 105% of the current analyst resale assumption.
- Rehabilitation: 100% / 120% / 160% of current rehab assumption.
- Renovation duration: approximately 0.83x / 1.0x / 1.33x current days, rounded to whole days.
- Marketing duration: approximately 0.67x / 1.0x / 2.0x current days, rounded to whole days.

Require nonnegative valid bounds and minimum <= most likely <= maximum. For a zero or missing base, avoid silently producing misleading distributions; ask the user to supply values or show a clear reason. Preserve the user's current custom values unless they explicitly invoke the populate action, and warn before replacing edited values. Keep seed, iterations, and distribution rationale visible. The user must explicitly click **Run Monte Carlo**; merely populating values does not run a simulation.

Describe results as **conditional simulations under analyst-selected distributions**, not calibrated real-world loss probabilities. Reuse the existing Monte Carlo engine and output contract unchanged.

## 7. Visual and content polish

- Remove repetitive disclaimer paragraphs from the main screen where a short, accurate inline explanation and expandable details suffice; preserve legally/contractually necessary report disclosures.
- Replace developer-centric labels with plain-language terms while retaining source/evidence detail in expandable panels and tooltips.
- Make the primary next action obvious at the end of each stage (e.g., Review Comparable Sales, Enter Seller Evidence, Underwrite, Review Risk, Generate Report).
- Keep desktop-first layout and avoid horizontal overflow at common 1280–1600 px widths.
- Maintain accessible contextual help and consistent button states. Avoid changing color/theme unnecessarily.
- Hide QA fixture labels, internal cost-budget banners and historical technical IDs from ordinary user screens, but keep them available in developer diagnostics.

## 8. Required end-to-end acceptance cases

### Case A — Crestview (`GABE-01`)
1. Open retained Crestview research; verify address, ID and snapshot.
2. Navigate across all five stages and subviews without losing the selected property.
3. Inspect four retained recorded-sale examples and preserve analyst selections.
4. Enter purchase $175,000, rehab $15,000 and resale $280,000; apply the optional illustrative expense preset.
5. Confirm financial outputs match the pre-change engine for identical inputs.
6. Verify draft results appear in scenario comparison as an **unsaved calculated preview**.
7. Duplicate the draft; change one assumption; verify independent comparisons.
8. Populate illustrative risk assumptions; edit a bound; run Monte Carlo; verify engine output and labels.
9. Use Save & Preview; generate both report types and verify the exact saved revision and source evidence.
10. Reopen saved scenario; verify preservation and no cross-scenario contamination.

### Case B — Haven Street durable property
1. Open 3484 Haven St, Rosamond.
2. Verify subject and evidence handoff, even with zero recorded-sale research examples.
3. Test seller financial evidence with unknown balances and ensure no misleading equity total.
4. Save and report a complete valid underwriting scenario; confirm subject isolation from Crestview.

### Case C — Incomplete/invalid inputs
- Blank purchase/resale or malformed numeric inputs produce helpful validation, not zero-valued profits.
- A missing Monte Carlo bound cannot be silently inferred.
- Unsaved drafts are never represented as immutable saved revisions.
- No loss probabilities are shown if no simulation has been executed.

### Case D — Backward compatibility
- Old deep links to former tabs resolve to the correct new stage/subview.
- Existing saved scenario revisions, source provenance, QA-only fixtures and private evidence restrictions remain intact.

## 9. QA and implementation constraints

Run focused unit tests, current financial regression tests, browser end-to-end checks and PDF rendering checks. Inspect generated PDF pages for clipping, blank pages, overflow and stale content. Include keyboard and tooltip checks. Record failures transparently; do not weaken historical tests or silently rewrite baseline hashes. If a test is obsolete due to an intentional navigation change, explain and replace it with a meaningful equivalent rather than bypassing it.

**No live provider calls, database connections/writes, migrations, credential exposure, new paid services or production deployment.** Do not create another certification framework. Do not modify MAO/Monte Carlo math, county historical data, or provider evidence.

## 10. Deliverables and stop condition

Return:
1. Updated local launch command and URL.
2. Concise implementation and QA report, including exact behavior changes and any remaining issues.
3. Screenshots of the five-stage navigation, draft comparison, Save & Preview and seeded risk editor.
4. Updated Crestview Opportunity Brief and Full Investor Package; one Haven report for subject-isolation validation.
5. Test counts and confirmation of zero provider/database/deployment activity.

**Stop after Milestone 1.1 for Stan/ChatGPT review. Do not begin SellMyKernHome.com integration, authentication, production storage or Milestone 2 without a new instruction.**
