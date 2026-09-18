# Property Intelligence — Workbench UX Refinement Pass

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Language:** JavaScript only
**Scope:** presentation/information hierarchy only. No engine changes.
**References:** live Mainsail result plus Fantasia/Bass/Joyce regressions.

## Mission
Make Property Mode read like a property intelligence product instead of a raw evidence/debug inspector. Humanize labels/statuses, surface useful property facts, group evidence, improve the valuation range visual, hide deal-only sections when no deal exists, and clarify navigation.

## Hard boundaries
Do not change RentCast retrieval/endpoints, Netlify runtime, cache, Google Maps, comp selection, coordinates, evidence machine values, provenance, identity/ambiguity/manufactured STOP rules, sponsor claims, underwriting/break-even/scenario/sensitivity formulas, PDF analytical model, Monte Carlo readiness, or protected artifacts.

Add no Firebase/auth/database/AI/Monte Carlo/Kern/title/MLS/new APIs/provider calls.

## Reference case
Use current model for `8612 Mainsail Dr, Bakersfield, CA 93312`, which currently contains SFR, 3/2, 1,306 SF, built 1995, AVM $379K, range $360K–$399K, 15 comps, and available tax/assessment/sale-history/last-sale/features/legal/zoning/identifier/lot/county/coordinate evidence. Never hard-code values.

## Property Mode hierarchy
Render in this order:
1. Property header/overview
2. Valuation
3. Comparables & map
4. Property Details
5. Evidence / Due Diligence
6. Sources & Provenance

Property Mode must not render empty sponsor/deal sections. Keep **Create Deal Analysis**.

Deal Mode may add Deal Assumptions, Economics, Break-Even, Scenarios, Sensitivity, Questions for Sponsor.

## Property Details
Create a first-class panel sourced only from existing evidence.

**Property:** type, beds, baths, living area, year built, lot size, APN/parcel, county.

**Transaction & Assessment:** last sale price/date, assessments, property taxes, sale history. If multiple records exist, show a concise dated/latest summary only when source semantics support it, with expandable details.

**Land & Legal:** zoning, legal description, land/ownership structure. Unresolved tenure = `Not independently verified`.

**Features:** readable provider-reported list/table, never raw JSON.

Missing = `Not available from current evidence`; never substitute zero/false/blank unless explicitly supplied.

## Centralized human labels
Create one presentation adapter/helper. Keep machine keys unchanged.

Examples:
- propertyType → Property type
- squareFeet → Living area
- yearBuilt → Year built
- saleHistory → Sale history
- lastSaleDate → Last sale date
- lastSalePrice → Last sale price
- legalDescription → Legal description
- repairCondition → Property condition / repair needs
- insuranceCost → Insurance cost
- propertyTaxHoldingCost → Holding-period property taxes
- landTenure → Land / ownership structure

Safely humanize unknown keys rather than leaking camelCase.

## Humanize statuses
Machine values remain intact. Primary display:
- INDEPENDENT_ONLY → Independent evidence
- SPONSOR_SUPPLIED → Sponsor supplied
- ANALYST_ENTERED → Analyst entered
- DERIVED → Property Intelligence calculation
- SUPPORTED → Supported
- PARTIAL → Evidence available
- CONFLICTING → Conflicting evidence
- ADDRESS_AMBIGUOUS → Address needs confirmation
- MANUFACTURED_REPRESENTATION_STOP → Property representation needs verification
- SOURCE_STOP → Additional verification required

MISSING is contextual:
- title/tenure → Not independently verified
- condition/repairs → Not assessed
- generic unavailable → Not available

Raw machine status remains available under technical/source details.

## Evidence & Due Diligence redesign
Do not show flat debug rows such as `comps[0] PARTIAL`.

Group:
**Identity & Location:** address, county, parcel/APN, coordinates.
**Property Characteristics:** type, beds, baths, living area, lot, year, features.
**Valuation & Market:** AVM, range, comparable properties, comp status quality, DOM where relevant. Aggregate comps as e.g. `15 comparable properties available`.
**Tax & Assessment:** taxes, assessments.
**Transaction History:** last sale date/price, sale history.
**Legal / Ownership / Condition:** legal description, zoning, land/ownership, title, condition/repairs, insurance, holding-period taxes.

Each item may expand for provenance. Individual comp provenance stays in comp details/table. No numeric completeness score.

Preferred caution copy:
`Available evidence may come from independent data providers, sponsor inputs, or Property Intelligence calculations. Review source details before treating any item as verified.`

## Valuation visualization
Replace three separate low/AVM/high bars with one proportional deterministic range scale:
`LOW ---- AVM ---- HIGH`

In Deal Mode overlay break-even and sponsor resale if present, including values outside the provider range.

Requirements: responsive, readable, padded domain, accessible text equivalent, no probability/bell-curve semantics, uses existing view-model values only.

Property Mode labels:
- Estimated value
- Provider range
- Independent provider evidence

Keep `Independent estimate is evidence, not verified resale proceeds.`

Manufactured-home tenure/comparability warning appears only when subject evidence makes it relevant.

## Comparable section
Do not alter map/comps logic. Preserve every comp, map/table sync, overlap controls, popup, source coordinates, status and tenure limitations.

Presentation only: clearer subtitle, prominent count, humanized statuses, concise explanation that provider-listed/inactive does not necessarily mean closed sale. No default filtering.

## Header
Property Mode should emphasize:
Address
`Single Family · 3 BD · 2 BA · 1,306 SF · Built 1995`

Compact cards:
- Estimated Value
- Provider Range
- Comparable Properties

Optionally second row for last sale/taxes only when supported. Do not overload.

## Navigation
Property Mode only:
`Overview | Comps & Map | Valuation | Property Details | Evidence | Sources`

Deal Mode adds applicable deal sections. No dead/empty anchors.

## Create Deal Analysis
Keep prominent with supporting text:
`Add acquisition, repair, resale and holding assumptions to evaluate break-even, scenarios and sensitivity.`

Do not imply the property itself is an investment opportunity.

## Technical transparency
Move raw field key, machine status, provider, retrieval time, raw reference/model fingerprint behind `View source details` or equivalent. Do not remove provenance.

## Responsive QA
Verify ~1366, 1024, 768, 390 widths. Details stack cleanly; range scale doesn't clip; legal text wraps; no page-level horizontal overflow; comp table may scroll locally.

## Regression fixtures
Test:
- Mainsail conventional SFR
- Fantasia manufactured/conflicting valuation
- Bass STOP
- Joyce ambiguity
- synthetic missing-heavy fixture

Do not alter evidence.

## Tests
Zero provider calls. Cover:
- Property Mode hides sponsor questions/economics/scenarios/sensitivity
- Deal Mode retains them
- no `comps[n]` in main evidence UI
- comp aggregation correct
- raw machine keys preserved in technical view
- centralized label/status mapping
- contextual MISSING wording
- manufactured warning conditional
- Property Details from view model
- unknown never zero
- valuation scale low/point/high positioning
- out-of-range sponsor/break-even markers
- accessible range text
- no dead Property Mode anchors
- Deal Mode deal anchors
- all fixture states preserved
- analytical outputs unchanged
- no provider calls
- protected artifacts unchanged
- browser secret scan passes

## Visual QA
Use existing Playwright QA. Review Mainsail desktop/narrow, Fantasia Deal Mode/conflict, Bass STOP, Joyce ambiguity, expanded Property Details, expanded source details, valuation scale, comp map/table unchanged.

Create `docs/WORKBENCH_UX_REFINEMENT_QA.md`.

## PDF
Do not redesign PDF. Only share centralized display helpers if safe/necessary for consistency. No pagination/layout/analytical changes. PDF regression tests must pass.

## Execution
1. Preserve/hash protected artifacts.
2. Inspect current UI/view model.
3. Create centralized presentation adapter.
4. Add presentation tests.
5. Refine Property Mode navigation.
6. Build Property Details.
7. Group Evidence/Due Diligence.
8. Hide deal-only Property Mode sections.
9. Implement valuation range scale.
10. Conditional manufactured copy.
11. Refine header/cards.
12. Preserve map/comps.
13. Unit tests.
14. UI/browser tests.
15. PDF regressions.
16. Secret scan.
17. Visual QA.
18. Completion report.
19. STOP.

## Acceptance
GO only if Mainsail reads as a human property-intelligence screen; valuable tax/assessment/sale/zoning/legal facts surface when present; evidence is grouped; no `comps[n]` primary rows; technical detail remains available; Property Mode has no empty sponsor questions; Deal Mode remains intact; valuation is one coherent range; manufactured warnings are conditional; map/comps unchanged; analysis/evidence values unchanged; protected artifacts unchanged; zero provider calls; all tests/build/QA pass.

## Completion report
Create `docs/WORKBENCH_UX_REFINEMENT_COMPLETION_REPORT.md` with files changed, presentation changes, mappings, Property Details fields, evidence grouping, mode differences, valuation visual, fixture QA, tests/build/PDF regression, protected-artifact result, zero-call confirmation, QA screenshot paths, known UX limitations, recommended next user test, and STOP.

## Final instruction
This is a small UX pass. Do not change the engine.

Property Mode should answer:
> What property is this? What does independent evidence say? What is it estimated to be worth? What comparable evidence exists? What factual property information do we have? What remains unverified?

Deal Mode then answers:
> What is claimed about a proposed transaction, and what does the deterministic model calculate from those assumptions?

**Stop after the completion report for Stan/ChatGPT review.**
