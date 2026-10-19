# PI V1.5.1 — Discovery Triage and Desktop UX

**Status:** Working locally; stopped before deployment or live acquisition.  
**Local URL:** [http://127.0.0.1:4177/#home](http://127.0.0.1:4177/#home)

## What changed

- Added a desktop landing page with two obvious actions: **Analyze a Property** and **Discover Opportunities**.
- Reduced primary navigation to **Analyze Property**, **Discover Opportunities**, and **My Workspace**.
- Removed Monitoring and fixtures from ordinary navigation. The Monitoring deep link remains functional, and QA/demo subjects are available only in the local **Developer / QA** area.
- Added My Workspace tabs for Saved Properties, Deals & Scenarios, Shortlists, and Reports, with search, sorting and subject-bound Open/Resume actions.
- Preserved legacy local routes: `#analyze-address`, `#opportunities`, `#saved-properties`, `#saved-deals`, `#fixtures`, `#property-detail`, `#investment`, and `#monitoring` continue to reach the appropriate surface.
- Preserved browser drafts and the existing before-unload warning for unsaved scenarios.

## Needs Address finding

The historical **11,316 Needs Address** metric was not measuring county situs. The original Power-to-Sell import had no address column, so `normalizeCandidateStatus()` mapped every unresolved identity to `NEEDS_ADDRESS`. The later Assessor enrichment persisted county situs and geometry in `opportunity_assessor_enrichments`, but intentionally did not rewrite the candidate's workflow/canonical status. The UI therefore displayed an identity/workflow count as if it were an address-evidence count.

Correct retained source-universe evidence states are:

| Evidence state | Count |
| --- | ---: |
| Total distinct candidates | 11,316 |
| County situs present | 1,270 |
| County situs missing | 9,990 |
| County situs malformed | 3 |
| Assessor unmatched / situs not applicable | 53 |
| Exact parcel geometry available | 11,263 |

These counts are now shown separately from provider suggestions, analyst-reviewed addresses and durable identity. The V1.5 deterministic pilot remains 80 source-backed high-priority SFR candidates after the one authorized fixture exclusion; all 80 have county situs parsed with source provenance, and none is silently promoted to postal validation or durable identity.

## Strategy and exception handling

- **Residential Fix & Flip** is the default preset and contains the exact 80-candidate cohort.
- **All property types** explicitly exposes nonresidential exceptions without mixing them into the residential shortlist.
- The retained cannabis-production counterexample is shown as nonresidential, county-situs missing, and parcel-geometry available. Its investigation priority is not presented as residential flip suitability, and no street is fabricated from geometry.
- ATN and APN9 remain separate retained identifiers. ZIP remains unsupported for the pilot and is never guessed.
- Current delinquency, mortgage, lien, NOD, trustee sale, foreclosure, ownership and seller willingness remain unknown without current evidence.

## Saved-work separation

- Haven is the ordinary durable saved Property.
- GABE-01, GABE-04, GABE-05 and the other demonstration subjects are excluded from ordinary Saved Properties and available in the local Developer / QA area.
- Shortlist rows retain exact subject and evidence-snapshot links.
- Saved scenarios remain versioned and subject-bound; report actions reopen the scenario's Reports tab.
- No record or fixture was deleted or rewritten.

## QA

Final desktop browser run: [qa-results.json](../data/runtime/discovery-v1-5-1/qa-OzSaLd/qa-results.json)  
Final V1.5 workflow/PDF run: [qa-results.json](../data/runtime/discovery-v1-5/qa-CXWBIB/qa-results.json)  
Final preservation regression: [results.json](../data/runtime/investment-workspace-v1/regressions-K3jBfz/results.json)

| Test | Result |
| --- | --- |
| Focused V1.5/V1.5.1 source and UI tests | **11/11 PASS** |
| Existing V1.5 browser/PDF workflow | **38/38 PASS** |
| V1.5.1 desktop/route/browser checks | **21/21 PASS** |
| Complete workspace regression selection | **367/367 PASS**, 0 skipped |
| Production web build | **PASS**; local investment/discovery workspace remains excluded |
| External/provider attempts | **0** |
| Database connections/writes | **0 / 0** |
| MAO/Monte Carlo/report mathematics changes | **0** |

Desktop screenshots:

- [Home at 1600px](../data/runtime/discovery-v1-5-1/qa-OzSaLd/01-home-1600.png)
- [Analyze Property at 1280px](../data/runtime/discovery-v1-5-1/qa-OzSaLd/02-analyze-property-1280.png)
- [Residential discovery at 1600px](../data/runtime/discovery-v1-5-1/qa-OzSaLd/03-discovery-residential-1600.png)
- [All-types exception and six-item shortlist](../data/runtime/discovery-v1-5-1/qa-OzSaLd/04-discovery-all-types-shortlist-1600.png)
- [My Workspace saved Properties at 1280px](../data/runtime/discovery-v1-5-1/qa-OzSaLd/05-my-workspace-properties-1280.png)
- [My Workspace shortlist at 1600px](../data/runtime/discovery-v1-5-1/qa-OzSaLd/06-my-workspace-shortlist-1600.png)

The screenshots were visually reviewed. During review, date-only county evidence was found to display one day early under Pacific time in My Workspace; it was corrected to render date-only evidence in UTC, and the final screenshot shows the exact 2026-09-15 source date.

## Remaining gaps

1. The 80-candidate local pilot is not a complete interactive browser for all 11,316 source records; the complete universe remains in the existing production opportunity repository and retained certification artifacts.
2. Geometry is labeled and audited, but a parcel/centroid map for no-situs exceptions is not rendered in this offline V1.5.1 local workflow.
3. No current Kern mortgage, lien/release, NOD, trustee-sale, foreclosure or ownership feed is connected. A licensed Kern-capable source remains the highest-value data decision.
4. No live batch enrichment was enabled. The existing planning view remains mock/offline and default-deny.

No provider calls, database operations, production deployment, new certification framework or protected-baseline rewrite occurred.
