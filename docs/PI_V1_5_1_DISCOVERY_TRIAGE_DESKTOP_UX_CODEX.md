# Property Intelligence V1.5.1 — Discovery Triage and Desktop-First UX

## Objective
Make PI useful through two obvious entry points: **Analyze a Property** (address-led) and **Discover Opportunities** (county-record-led). Combine discovery triage/address enrichment with a coherent desktop-only navigation and saved-work organization. JavaScript only. Reuse V1.4 underwriting, V1.5 discovery, existing report engines, and evidence snapshots. Do not build another certification framework.

## 1. Inspect before editing
- Inventory the current six top-navigation routes, their deep links, dependencies, and data persistence. Identify the actual current labels and do not guess.
- Inspect how Saved Properties, Saved Deals, saved shortlists, reports, and Saved Fixtures are stored and accessed. Distinguish real user records from QA fixtures; do not delete either.
- Trace Monitoring Prototype links and any reachable code. Hide inactive functionality from ordinary navigation without removing or breaking its code or historical tests.
- Trace the V1.5 imported county dataset and why 11,316 candidates display Needs Address even when county situs exists. Report the cause before fixing.

## 2. Desktop navigation and information architecture
Create a desktop-first shell with three clear primary destinations:
1. **Analyze Property** — address input (street, city, state; ZIP optional), evidence acquisition/preview, property details, underwriting and reports in one guided flow.
2. **Discover Opportunities** — county/imported candidate search, filters, evidence reason, triage, enrichment and shortlist.
3. **My Workspace** — separate subviews/tabs for Saved Properties, Saved Deals/Scenarios, Shortlists, and Reports. Include search, sorting, date, source/status, and Open/Resume actions.

- Move **Saved Fixtures** into a visibly labeled *Developer / QA* area available only in local development, not ordinary user navigation. Never mix synthetic QA fixtures with user records.
- Remove **Monitoring Prototype** from the ordinary nav while preserving its code and deep-link behavior for development as appropriate.
- Make the home/landing page feature two large actions: Analyze Property and Discover Opportunities; show recent work below.
- Preserve and redirect legacy routes/deep links to their correct new destinations; do not strand saved links or break tests.
- Design for 1280–1920px desktop widths; use readable data grids, sticky filter/action controls, resizable or appropriately sized detail panels, and restrained density. At narrower widths, provide a usable fallback; no dedicated mobile product is required.
- Use human-readable labels. Keep internal IDs, source hashes, and technical evidence metadata in expandable details.
- Navigation should not unexpectedly discard unsaved edits; prompt on changes or autosave only where current storage semantics support it.

## 3. Discovery triage: accurate address states
- Separate **county situs present**, **address components parsed**, **provider address suggested**, **analyst-reviewed preliminary address**, **canonical/durable property identity**, and **no address**. These are distinct states.
- Recalculate dashboard counts from the actual data; don't equate unresolved canonical identity with missing county situs. Add clickable count filters and a clear legend.
- Preserve county situs exactly; create separately derived normalized/parsed components with provenance and confidence.
- For county situs records, prepopulate the review form with available street/city/state. ZIP remains optional. Allow preliminary research with county situs when appropriate; do not require a legally certified parcel.
- For no-situs records with geometry, show parcel/point context using existing geometry/map layers, clearly labeling any centroid or approximate location. Never fabricate a street address from geometry.
- For ATN/APN-only records, use existing safe identifier crosswalk evidence; do not assume ATN=APN or fabricate digits.
- If no usable identity/location evidence exists, keep the candidate in an explicit unresolved queue.

## 4. Strategy suitability versus evidence priority
- Separate *investigation priority* from *residential fix-and-flip suitability*. A cannabis-production parcel, vacant land, or commercial property must not be presented as a conventional residential flip simply because of a high historical tax amount.
- Add a default **Residential Fix & Flip** discovery preset using supported county use codes/classifications; provide **All property types** and other available strategies as explicit alternatives.
- Preserve historical distress source, amount, source date, assessor use description, acreage discrepancies, and source IDs. Current tax delinquency, foreclosure, NOD, liens, and seller willingness must remain unknown absent current evidence.
- Show why a candidate surfaced in one sentence, with expanded evidence and unresolved questions on demand.

## 5. Batch enrichment and 80-candidate workflow
- Support choosing 80 source-backed residential candidates using reproducible filters and deterministic selection. Preserve original source identifiers and duplicate relationships.
- Stage progression: **80 candidates → research-ready addresses/geometry → exception queue → shortlist up to six → Property Detail → V1.4 Underwriting → PDFs**.
- Provide a batch preview showing expected matches, unresolved items, request count and cost. Reuse cached evidence first. Avoid per-row human approval for routine preliminary address suggestions; permit bulk acceptance with explicit scope and an exception queue.
- Do not make new provider calls in this assignment. Implement/test the acquisition UI with mocks and retained data. Keep live enrichment behind existing secure provider integrations and applicable authorization, with no hard-coded API keys or automatic retries.
- Support importing CSV, preserving source rows, validating schema, reporting duplicates, undoing import, and exporting filtered/shortlisted results under existing license restrictions.
- ZIP filters must operate only on supported ZIP evidence; report excluded unknown ZIP counts rather than guessing ZIPs.

## 6. Analyze-by-address flow
- A new user can enter a complete or partial address without first importing county data or creating a durable Property.
- Show candidate matches, source provenance, ambiguity and a clear choice before proceeding. ZIP optional. Preserve user input and avoid silent cross-property substitution.
- Guide into existing Property Detail and V1.4 underwriting, with saved scenario/resume/report controls. Clearly separate evidence from analyst assumptions.

## 7. My Workspace
- Separate Saved Properties, Saved Deals/Scenarios, Shortlists, and Reports as discoverable tabs or sections with compact searchable tables.
- Identify QA/demo records and exclude them from ordinary lists by default; allow local developers to inspect them through a separate QA view.
- Never delete historical fixtures or saved data as a cleanup shortcut.
- Make it easy to resume a specific property and its linked deal/scenario; avoid mixing subjects or versions.

## 8. QA and acceptance
- Test both entry paths end-to-end, including legacy deep links and unsaved changes.
- Verify real county-situs vs unresolved-canonical counts and filters, nonresidential exclusion from the residential preset, geometry-only records, APN/ATN ambiguities, duplicate import, and shortlist persistence.
- Test 80-candidate selection and six-candidate handoff without new provider calls.
- Test Haven durable property, Crestview GABE-01, Taft GABE-04, Boron GABE-05, and the cannabis-production ATN 30927104008 as a nonresidential counterexample.
- Run focused unit/integration/browser tests, production build, and screenshot QA at 1280px and 1600px desktop widths. Verify financial outputs unchanged and no scenario/evidence cross-contamination.
- No production deployment, production database writes, new provider calls, or changes to certified MAO/Monte Carlo calculations. Avoid broad protected-baseline changes.

## 9. Deliverables
1. Local app URL and navigation screenshots.
2. Corrected discovery counts with explanation of prior Needs Address issue.
3. Demonstrated 80-candidate triage and six-property shortlist flow.
4. Screenshots of Analyze Property, Discover Opportunities, My Workspace tabs, and address/geometry exception handling.
5. Focused QA and regression results, build result, provider-call and database-write counts.
6. Short list of remaining gaps, especially current mortgage/NOD/lien/foreclosure coverage.

**Stop for review when the working desktop UX and discovery triage are complete. The acceptance criterion is an intuitive application, not additional certification paperwork.**
