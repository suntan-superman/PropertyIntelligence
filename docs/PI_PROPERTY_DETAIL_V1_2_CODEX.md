# PROPERTY INTELLIGENCE — PROPERTY DETAIL V1.2
## Comparable Evidence, Map Usability & Investment Workspace Integration

**For Codex implementation — Workside Software LLC**  
**Priority:** Working product UX, not a new certification framework.  
**Scope:** Existing PI Property Detail and Investment Workspace; JavaScript only.

## Objective
Create one coherent journey: **open/select property → inspect evidence and sale/listing comparables → enter analyst assumptions → run existing economics/MAO/Monte Carlo → export brief/full PDF**. Fix the observed saved-property experience for **3484 Haven St, Rosamond, CA 93560**, then test against **GABE-01** and at least one thin-evidence candidate such as **GABE-05**. Do not confuse this saved durable Property with the six preliminary Gabe subjects.

## Observed problems to reproduce first
1. Saved Property Detail displays **15 comparable properties available, 0 mapped to provider coordinates**, and a large mostly empty Google map with only subject marker S.
2. Comparable rows say **Unknown miles** and **Map location unavailable**; `Fit all locations` offers little value.
3. Repeated **3472 W Roxbury St** rows and other possible duplicate addresses appear as independent comps. Some may be separate listing observations; do not delete them blindly.
4. Provider-listed prices, including inactive listings, appear under **Comparable properties** although they are not proven closed transactions.
5. Valuation range chart ($323k–$383k; estimate $353k for saved Rosamond example) wastes space and has unclear axes/legend.
6. **Create Deal Analysis** may be a parallel workflow rather than the existing Investment Workspace. Verify actual behavior before modifying.

## Phase A — Inspection and diagnosis (do not guess)
- Trace data from provider payload through normalization, Property Detail, map adapter and table. Determine whether coordinates are absent, invalid, filtered, lost in transformation, or rejected due to map configuration. Check Google map initialization, browser errors, billing/key restrictions and network failures using existing dev tools; never print keys.
- Inspect existing saved-property evidence and the separate Gabe V2.1 sale-event research. Identify the schemas, data provenance and permitted cross-workflow reuse. Do not silently merge identities or snapshots.
- Inspect routing and scenario handoff for `Create Deal Analysis`, including durable Property IDs, preliminary candidate references, and snapshot selection.
- Record a short root-cause note and proposed narrow fix; continue implementation if safe. Stop only for a genuine external credential/rights or destructive-data blocker.

## Phase B — Comparable evidence and map
- Make separate clearly labeled sections or tabs for **Recorded-sale research**, **Active listings**, **Inactive listings**, and **AVM-suggested observations**. Source, date, price meaning, property attributes, distance and evidence limitations must remain visible. An inactive listing is NEVER a sale.
- Retain raw provider records; group likely duplicate listings by normalized address plus unit/parcel/provider identifiers as appropriate. Show observation count and expand to individual records. Ambiguous duplicates stay separate with a warning. Distinct units must not be merged.
- Use provider coordinates where available and valid. If absent, first investigate whether an existing licensed Google geocoding capability can resolve an address. If geocoding is appropriate and authorized, implement a small explicit user-triggered batch, deduplicated and cached with provider terms respected; bound requests, retries and costs. No geocoding is required merely to view or underwrite a property. Never fabricate coordinates.
- Calculate distances only from valid source coordinates; show units and method. Otherwise display **Distance unavailable**. Keep geocoded map coordinates distinct from verified parcel location.
- If fewer than two comparable points are mappable, replace the giant blank map with a compact informative fallback and full usable comparable table. Do not claim `15 mapped` when zero are mapped. Fit-all includes only actual mapped markers.
- Clicking map markers, rows and grouped observations should reveal the same source-backed detail. Keep keyboard access and mobile responsive layout.
- Prefer already retained sale events for GABE-01 and GABE-05; never turn research examples into analyst-approved underwriting comps automatically. Avoid assuming those sale events are present for the unrelated saved Haven St Property.

## Phase C — Valuation and integrated deal analysis
- Replace oversized valuation graph with compact readable min / estimate / max presentation, explicit dollar scale, model source and retrieval/as-of dates. As-is AVM is not ARV.
- Wire **Create Deal Analysis** to the existing Investment Workspace, passing a stable reference to the selected subject and evidence snapshot. Preserve separate scenario revisions and allow user-entered purchase, rehab, resale, financing, duration and costs.
- For preliminary subjects, allow local scenario analysis without promoting to a durable Property. For already durable Properties, preserve their existing identity/evidence history and avoid duplicate creation.
- Use certified deterministic economics, MAO and Monte Carlo unchanged. Reports must identify observed provider/county evidence vs user assumptions vs calculated outputs. Avoid implying any modeled return is guaranteed.
- Ensure browser navigation/back, save/reopen and report export maintain the same subject and scenario, with no accidental cross-property leakage.

## Phase D — QA and demonstration
Test at minimum:
- Saved Haven St Property: 15 listed observations, zero-coordinate initial state, duplicate grouping, fallback, and no fake map markers.
- GABE-01: preliminary address and retained sale-event examples, clear distinction from listing context, scenario creation and report export.
- GABE-05: sparse/older sales and no invented ARV or confidence.
- Coordinate-rich fixture: map markers, distances, fit bounds and row/marker synchronization.
- Malformed/missing coordinates, duplicate vs distinct unit, Google unavailable, denied geocoding, zero and one mapped point, no comps, large comp list, keyboard/mobile.
- Route handoff, scenario save/reload, financial result invariance, PDF preview/export, no accidental production write, and no unexpected provider calls.

Run focused tests, relevant regressions, production build, and visual/browser QA. Supply before/after screenshots of overview, valuation, comp table, map/fallback, and deal-analysis handoff. Test PDFs for a real retained research subject with explicit analyst-demo assumptions. Do not replace or rewrite historical certified evidence, baseline proofs or financial engines.

## Cost, execution and guardrails
- No new certification/selector/membership architecture. Use existing ordinary app tests and protections.
- Reuse retained evidence first. Do not perform provider calls by default. Any optional new geocoding calls must be bounded, logged and within the **previously approved $20 combined demo enrichment ceiling**, after accounting for the existing conservative $3.60 exposure; do not assume a fresh $20 allowance. If terms, current quota or actual charges are uncertain, leave geocoding disabled and deliver the usable table/fallback.
- No production database mutation, MLS selection, new durable Property creation for Gabe candidates, deployment, or unapproved bulk acquisition.
- Keep JavaScript-only conventions; avoid unnecessary dependencies and broad redesign.

## Deliverables
1. Running local integrated UI with exact URL and launch command.
2. Root-cause analysis of 0/15 map coverage and actual fixes/fallback.
3. Source-backed grouping and separate sale/listing views.
4. Working Property Detail → Investment Workspace → reports path.
5. Screenshots, tests/build results, changed-file list, provider-call and cost ledger, remaining genuine limitations.

**Definition of done:** A nontechnical user can inspect one property, understand what is and is not a completed sale, review the map if actual locations exist, enter a hypothetical deal and produce the corresponding report without navigating two unrelated experiences. Stop for user/ChatGPT review after local QA; do not deploy.
