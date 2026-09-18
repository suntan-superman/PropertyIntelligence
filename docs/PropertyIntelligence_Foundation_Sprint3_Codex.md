# Property Intelligence — Foundation Sprint 3
## Internal Workbench, Comparable Map & First-Generation Deal Review PDF

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`  
**Reference only:** `C:\Users\sjroy\Source\HomeAdvisor\apps\web`  
**Language:** JavaScript only; no TypeScript  
**Golden fixture:** 8426 Fantasia Park Way, Riverview, FL 33578  
**Stage:** local/internal analyst tool, not production SaaS.

## Mission
Build the first visible Property Intelligence workbench using Sprints 1–2. Support Property Mode (address → property/evidence/valuation/comps/map) and Deal Mode (property + sponsor claims → comparison/underwriting/break-even/scenarios/sensitivity/evidence → PDF).

React and PDF must consume the same normalized analysis objects. Never create a second calculation engine in the UI or report.

## Protected facts
Do not mutate existing Sprint 1/2 artifacts.

Fantasia sponsor: acquisition $160K; repairs $10K; 3-month space rent $3K; projected sale $279K; commission $5K; escrow $2K; modeled profit $99K; sponsor-defined cash invested $173K; CoC 57.2%.

Independent evidence: confirmed address; Manufactured; 3/2; 1,242 sf; built 2006; RentCast AVM $122K; range $40K–$204K; 15 retained comps; sponsor resale `CONFLICTING`; land tenure/park/comp-tenure unresolved.

Sprint 2: modeled break-even $180K; sponsor +$99K/57.2%; AVM point -$58K/-33.5%; AVM high +$24K/13.9%; all incomplete due to unknown costs.

Bass remains `MANUFACTURED_REPRESENTATION_STOP`. Joyce remains `ADDRESS_AMBIGUOUS`.

## Scope
Allowed: React/Vite JS internal web app; selective reuse of Home Advisor map/comps/report patterns; address entry; Property/Deal modes; existing cached analysis; analyst-initiated live retrieval through server-side adapter; map; comp table; valuation; economics; scenarios; sensitivity; evidence/provenance; missing information; first PDF; tests.

Forbidden: modify/import Home Advisor at runtime; expose RentCast secret/client-side Vite secret; duplicate formulas in React/PDF; Monte Carlo; AI underwriting narrative; Firebase/auth/subscriptions/Cloud Run/mobile/investor portal; Kern/title/MLS/Daily Report/skip tracing; inferred tenure/restrictions; unknown→zero; RentCast as verified truth; investment recommendation; securities offering memorandum.

## Home Advisor audit
Inspect Home Advisor web app for map provider/library, subject/comp markers, popups, fit bounds, geolocation, comp list/table, selection synchronization, responsive behavior, map-key handling, tests, PDF/report implementation and static/report-map approach.

Create `docs/HOME_ADVISOR_MAP_COMPS_AUDIT.md`: files inspected, libraries, reusable patterns, what not to port, token handling, limitations, recommendation. Do not modify Home Advisor.

## Structure
Prefer:
```text
apps/web/src/
  app/
  components/
  features/property-search/
  features/property-summary/
  features/comps-map/
  features/valuation/
  features/underwriting/
  features/scenarios/
  features/sensitivity/
  features/evidence/
  features/provenance/
  features/reports/
  services/
  utils/
```
Shared business/analysis stays outside React.

## Secure local API boundary
Browser must never contain RentCast secret. Use a minimal local Node API if needed:
```text
React -> Property Intelligence local API -> existing RentCast adapter -> cache/provider
```
Conceptual endpoints may include property resolve/intelligence, deal analyze, report PDF. Keep lightweight. Never return secrets/auth headers.

## Navigation
Keep small:
`Property Intelligence | Analyze Property | Saved Fixtures`
No accounts/settings/admin.

## Property Mode
Address entry → normalize → resolve identity → analyst confirmation if ambiguous → normalized evidence → valuation → comps → workspace. Do not automatically invent deal assumptions. This must later work for Kern-discovered properties.

## Deal Mode
Allow explicit claims: acquisition, repairs, projected resale, hold days, lot/space rent, commission, escrow/closing, other known modeled costs. Manual entries become claims with provenance (`ANALYST_ENTERED`/`SPONSOR_SUPPLIED`) and never overwrite independent evidence. Fantasia loads existing seeded deal.

## Saved fixtures
Use actual data artifacts, not hard-coded React copies:
- Florida Portfolio / Fantasia
- Bass (show STOP)
- Joyce (show ambiguity)

## Property header
Fantasia should show address, Manufactured · 3 BD · 2 BA · 1,242 SF · Built 2006, plus Sponsor Purchase $160K, Sponsor Resale $279K, Independent AVM $122K, range $40K–$204K, Modeled Break-Even $180K. Each metric exposes provenance/status.

Never label AVM simply “Market Value.”

## Comparable map
Central deliverable. Reuse Home Advisor pattern where appropriate.

Requirements:
- distinct subject marker
- all retained comps with valid coordinates
- price labels when legible
- selected state
- fit bounds
- marker click/tap → detail
- row/card selection ↔ map marker synchronization
- responsive
- graceful missing coordinates
- a comp lacking coordinates stays in table with `Map location unavailable`

Do not silently discard evidence.

## Comparable table/cards
Preserve all 15 Fantasia comps. Where available: address, provider status, provider-labeled price/value, beds/baths, sqft, year, distance, DOM, similarity/correlation, property type, lot/unit info, source status.

Never relabel listing/inactive as closed sale. Evidence badges: Closed sale only when explicitly established; Listing; Inactive; Status unclear; Land tenure unknown.

Optional analyst filters only on supported evidence: type/status/distance/sqft/year. Disable land-tenure filter if absent. Do not default-filter unfavorable comps.

## Valuation panel
Show sponsor $279K; AVM $122K; range $40K–$204K; break-even $180K; sponsor-vs-AVM and sponsor-vs-high divergence; status `CONFLICTING`.

Persistent statements: independent estimate is evidence, not verified resale proceeds; manufactured-home tenure/comparability unresolved.

## Valuation visual
Responsive deterministic scale showing low, AVM, break-even, high, sponsor. No probability semantics. Include accessible text alternative.

## Economics
Render existing engine outputs only. Show acquisition, repairs, rent, commission, escrow, cash invested, modeled proceeds, modeled profit, CoC. Persistent warning: `Excludes material unknown costs. This is not a fully burdened profit estimate.` Known/unknown costs separate. Unknown never `$0`.

## Scenarios
Default: Sponsor, Sale -10%, Sale -20%, AVM High, AVM Point. Show sale, repairs, modeled profit/loss, cash invested, CoC, change vs sponsor. `View all` exposes existing deterministic set. No probabilities.

## Break-even
Show modeled break-even $180K and available acquisition/repair thresholds. Label `Based only on currently modeled known costs.`

## Sensitivity
Show existing deterministic ranking and sale-price × repair-cost matrix. No probability/variance language.

## Evidence completeness
Sections: Supported/available, Conflicting, Missing/unresolved. Clicking item shows sponsor value, independent evidence, source, date, status, notes. No numeric score.

## Sponsor questions
Render structured sponsor-information-request grouped by valuation, tenure/property, repairs, holding costs, legal/title, schedule, unresolved identity. Optional Copy Questions; do not send messages.

## Provenance
Every major figure can expose source/status:
- Sponsor package / SPONSOR_SUPPLIED
- RentCast / INDEPENDENT_ONLY / retrieval timestamp
- Property Intelligence calculation / DERIVED / input references

## PDF
Generate professional **PROPERTY INTELLIGENCE — Independent Deal Review**. Do not call it Investment Recommendation, Offering Memorandum, Guaranteed Return, or Investment Approval.

Inspect Home Advisor PDF/report code first and selectively reuse proven patterns without runtime dependency. Generate from Property Intelligence data, not webpage screenshots. Screen and PDF must share analysis objects.

Target content-driven ~8–12 pages:
1. Executive Deal Summary: address/property, sponsor acquisition/resale, AVM/range, break-even, sponsor and independent scenarios, prominent limitations.
2. Property Intelligence: normalized facts, property type, map/location if technically reliable, provenance/identity limitations.
3. Comparable Evidence: map if practical plus all comps in paginated table; preserve statuses/tenure limitations.
4. Valuation Analysis: sponsor vs independent, range visual, break-even, divergence/conflict/limitations.
5. Deal Economics: sponsor-modeled economics, known and unknown costs, incomplete warning.
6. Scenario Analysis: sponsor, -10%, -20%, AVM high, AVM point.
7. Sensitivity & Break-Even: deterministic ranking, matrix/subset, thresholds.
8. Evidence & Due Diligence: supported/conflicting/missing.
9. Questions for Sponsor: structured unresolved evidence.
10. Sources & Methodology: sponsor package, RentCast retrieval, PI calculations, limitations.

Do not generate investment recommendation language.

## PDF layout rules
- US Letter unless existing proven report stack strongly favors another standard.
- consistent margins/header/footer/page numbers
- no orphan headings
- repeat table headers across pages
- wrap long addresses/notes
- no clipped tables
- never shrink body text to unreadability
- content-driven page breaks
- unknown displayed as `Unknown`/`Not supplied`, never `$0`
- negative values unmistakable
- provenance/limitations readable
- report remains usable with missing photo/map/fields
- no Fantasia-specific absolute positioning

## Map in PDF
Do not screenshot interactive browser map as a fragile default. First inspect Home Advisor report approach. If a reliable static/report map can be generated using existing authorized infrastructure, use it. Otherwise omit the PDF map in Sprint 3 and include a clear comp table/location summary. Do not block PDF completion solely on static-map rendering.

## Report generation workflow
Provide internal `Generate Deal Review PDF` from Deal Mode. Generate server-side/local process. Save under:
`data/reports/<deal-id>/property-intelligence-deal-review-<timestamp>.pdf`
Also support deterministic fixture command such as:
`npm run report:fantasia`
Never overwrite previous reports silently.

## Property-agnostic requirement
Fantasia is golden fixture, not template logic. Test at least:
1. Fantasia complete-ish deal.
2. Bass incomplete provider representation.
3. Joyce ambiguous identity.
4. synthetic fixture with long address/many unknowns.
5. synthetic fixture with enough comps to force multi-page comp table.
PDF and UI must degrade gracefully.

## Visual QA
For PDF, create a repeatable QA workflow that renders pages to images or otherwise visually inspects output. Check page count, clipping, overlaps, blank pages, table splits, headers/footers, long text, negative currency, missing-data presentation, comp pagination.

Create `docs/PDF_QA_CHECKLIST.md` and `docs/SPRINT3_UI_QA_CHECKLIST.md`.

## Accessibility/basic UX
Semantic controls, keyboard accessible, visible focus, sufficient contrast, not color-only statuses, loading/empty/error states, responsive at laptop and narrower widths. This is internal but must not be sloppy.

## State/error handling
Explicit states:
`IDLE`, `RESOLVING`, `AMBIGUOUS`, `LOADING_EVIDENCE`, `READY_PROPERTY`, `READY_DEAL`, `SOURCE_STOP`, `ERROR`.
Do not render stale prior-property data during a new failed lookup.

## Network behavior
Existing cache remains first-class. No automatic repeated API calls on rerender. Fetch only on explicit analysis/refresh action. Show whether evidence came from cache and retrieval timestamp. Respect existing retry/rate-limit rules.

## Testing
No default tests consume RentCast quota.

Test:
- protected Sprint 1/2 inputs unchanged
- UI adapters do not recalculate finance logic
- fixture loading
- Property vs Deal Mode
- ambiguity/STOP states
- missing values not zero
- valuation conflict
- scenario values equal Sprint 2
- break-even equals Sprint 2
- all comps retained
- comp map/table synchronization logic
- missing-coordinate comp retained
- provenance display model
- no secret in client bundle/config
- report model equals screen analysis model
- PDF generation Fantasia
- incomplete/ambiguous PDF handling
- long/multi-page comp report
- deterministic report data
- no recommendation language in generated report

## Suggested commands
Adapt as needed:
```text
npm run web:dev
npm run web:build
npm run web:test
npm run report:fantasia
npm run report:test
npm run sprint3:qa
npm test
```

## Execution order
1. Inspect current project/Sprint 1–2 artifacts.
2. Audit Home Advisor map/comps/report implementation.
3. Write audit.
4. Define shared workbench/report view-model sourced from analysis engine.
5. Add security test preventing RentCast secret in client.
6. Build minimal local API boundary.
7. Build fixture loading.
8. Build Property Mode shell.
9. Build Deal Mode shell.
10. Build property header/valuation/economics.
11. Build comps map/table.
12. Build scenarios/break-even/sensitivity.
13. Build evidence/questions/provenance.
14. Build PDF report model from same view-model.
15. Build PDF renderer.
16. Add fixture/report tests.
17. Perform UI QA.
18. Perform PDF visual QA.
19. Build production-like local web bundle.
20. Generate Fantasia PDF.
21. Create completion report.
22. **STOP.**

Do not proceed to Monte Carlo, deployment, auth, Kern integration, or customer polish.

## Acceptance criteria
Sprint 3 is GO only if:
- web app starts locally and Fantasia loads from existing artifacts;
- Property and Deal modes are distinct;
- no RentCast secret appears in client bundle;
- all 15 Fantasia comps preserved and map shows every mappable comp;
- table/map selection sync works;
- sponsor/independent/break-even values match Sprint 2 exactly;
- unknown costs never display as zero;
- Bass STOP and Joyce ambiguity remain visible;
- evidence/provenance accessible;
- PDF generated from shared analysis/view model;
- Fantasia PDF has no clipping/overlap/unreadable tables;
- incomplete fixtures generate honest usable reports;
- tests pass;
- no investment recommendation language;
- no protected source mutation.

If any evidence-integrity/security condition fails, STOP rather than cosmetically working around it.

## Completion report
Generate `docs/FOUNDATION_SPRINT3_COMPLETION_REPORT.md` with:
- files created/changed
- Home Advisor patterns reused/refactored
- map/report technology chosen and why
- security/key handling result
- tests/build results
- UI routes/workflows
- comp map count vs retained comp count
- missing-coordinate behavior
- displayed Fantasia values and reconciliation
- Bass/Joyce behavior
- PDF path/page count
- PDF visual QA findings
- known UI/report limitations
- confirmation no Monte Carlo/Kern/deployment work occurred
- exact commands Stan should run
- recommended next step

## Final principle
Sprint 3 should make Property Intelligence **visible without making it less rigorous**.

The screen and report must communicate:
> Here is what the sponsor claims. Here is what independent evidence reports. Here is what the deterministic model calculates. Here is what conflicts. Here is what remains unknown.

**Stop after the Sprint 3 completion report for Stan/ChatGPT review.**
