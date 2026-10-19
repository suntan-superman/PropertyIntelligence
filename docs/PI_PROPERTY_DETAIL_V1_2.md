# PI Property Detail V1.2 implementation and QA

The local Property Detail now connects retained evidence to the existing Investment Workspace, scenario revisions and Brief/Full PDF export. Haven remains an existing durable Property; the six Gabe subjects remain preliminary research candidates. No identity approval, production record or financial engine was changed.

## Open the local application

Running URL: **http://127.0.0.1:4176/#property-detail**

From the Property Intelligence repository, launch with the existing isolated Node 22.12.0 runtime:

```powershell
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' scripts/workbench-server.js --investment --property-detail --port 4176
```

Choose a retained subject, inspect its valuation and comparable evidence, and click **Create Deal Analysis**. The existing workspace opens the same subject and exact evidence fingerprint. Enter assumptions, save a local revision, optionally run Monte Carlo, then preview and export either report. The Property Detail link and browser Back preserve the subject. Invalid subject/snapshot combinations fail closed.

Scenarios remain in the existing private `data/runtime/investment-workspace-v1/scenarios` directory. QA uses separate test-owned scenario directories. No scenario is written to the production database. This local selection is the saved Haven snapshot plus the six existing Gabe subjects, not a general production database browser. The production build continues to exclude the private workspace and its evidence; its older deal route is explicitly labeled **Open legacy Deal Mode**.

## Why Haven showed zero mapped observations

All **15 saved comparable observations already contain coordinates**. PostgreSQL returns their numeric columns as strings. The prior `Number.isFinite` guard rejected those strings; the subject coordinates remained numeric, producing the subject-only map. This was a display conversion defect, not evidence that RentCast omitted the coordinates.

The saved-record adapter also supplies `distanceMiles` and nested `providerPayload.providerAttributes`, while the old table expected `distance` and top-level `providerAttributes`. Display normalization now reads these shapes, safely converts finite decimal values, retains nested source identifiers/dates and leaves original records untouched. Distance is calculated only from valid subject and comparable coordinates, using straight-line Haversine miles. Provider-reported distance remains separately labeled, including an explicit reported zero; malformed/missing coordinates produce **Distance unavailable**.

The prior map opened whenever any location existed, including the subject alone. It now uses a compact explanation instead of a large empty map when fewer than two comparable points are available. With valid points, fit-all includes only actual locations. Markers, rows and grouped-observation controls share the same evidence detail and selection state.

A browser-designated Google key is configured locally; its value was not printed. Google billing, live key restrictions and tiles were **not validated through paid/network requests**. Browser QA reproduced the original display failure with retained evidence, not live Google traffic. The local review server deliberately provides an offline coordinate plot with no street tiles or credentials. Google geocoding remains disabled because the earlier three-property pilot does not establish current quota, retention permission or all-in pricing for comparable-address batches. No geocoding is needed to use the table or underwriting workspace.

## Comparable evidence and valuation

| Subject | Retained evidence | Presentation |
| --- | --- | --- |
| Saved Haven | 15 AVM observations: 3 active, 12 inactive, zero retained comparable-sale events | All 15 coordinates restored; statuses are historical observations, not current availability or proof of closing |
| GABE-01 | 4 retained Sale research examples and 4 listing observations | Source-index-bound coordinates for the Sale examples; no automatic analyst inclusion or ARV |
| GABE-05 | 2 older Sale research examples and 4 listing observations | Thin/older evidence and diligence limitations retained; no invented confidence or ARV |

Separate views cover Recorded-sale research, Active listings, Inactive listings and AVM-suggested observations. The AVM view includes the listing observations in the other views; it does not add extra transactions. Dates, price meaning, source references, property attributes and limitations remain accessible.

Exact normalized address/unit matches group only when available identifiers and property attributes do not conflict. Every observation remains expandable. Distinct units, conflicting identifiers and directional address variants remain separate with warnings. Haven's Roxbury variants are **not merged** merely because they look similar. Synthetic duplicate fixtures verify grouping without changing the actual saved records.

The valuation graph is replaced by compact minimum / as-is estimate / maximum USD values, source and retrieval/as-of information. The saved example remains $323,000 / $353,000 / $383,000. As-is AVM is explicitly not ARV. Display and report changes do not alter economics, MAO, Monte Carlo or comparable acceptance decisions.

## Verification results

| Check | Result |
| --- | --- |
| Complete root regression selection | **338/338 PASS**, 18 test files, 0 skipped |
| New Property Detail unit cases | **25/25 PASS**, included above |
| Integrated browser and PDF QA | **111 checks PASS**, no browser errors or remote requests |
| Existing Investment Workspace browser QA | **44 checks PASS** |
| Production build | **PASS**, private workspace/evidence excluded |
| Financial invariance | Exact deep equality for all **9** retained deterministic/MAO/Monte Carlo output cases from the pre-V1.1 capture |
| Pre-existing preservation capture | **1,170** files checked: 1,158 identical; 12 scoped source changes; 0 unexpected changes |
| PDFs | 6 PDFs / **22 pages**, text/bounds/blank-page checks and visual inspection complete |

Browser coverage includes zero/one/malformed/missing coordinates, no comps, duplicate versus distinct unit, a large list with progressive disclosure, unavailable Google, denied geocoding, keyboard selection, 390-pixel mobile layout, exact snapshot routing, scenario save/reload, navigation and PDF preview/download. An old map assertion was updated to distinguish provider-reported zero distance from unavailable coordinate-derived distance; its zero-DOM and invalid-coordinate assertions remain intact.

Historical manifests, proofs, source evidence, original reports and analyst decisions remain unchanged. No protected-baseline hashes were rewritten to accept UI changes. Earlier failed QA outputs are retained alongside the passing run. The preservation capture covers implementation/configuration, historical validation artifacts, original Gabe evidence and local pilot decisions; the intentional `tests/maps.test.js` expectation update is separately listed below.

## Screenshots and PDF review

- [Before overview](../data/runtime/property-detail-v1-2/before-nrF6yh/overview.png), [before valuation and zero-map coverage](../data/runtime/property-detail-v1-2/before-nrF6yh/valuation.png), [before map and table](../data/runtime/property-detail-v1-2/before-nrF6yh/map-and-table.png).
- [After screenshot and PDF index](../data/runtime/property-detail-v1-2/qa-olQONh/index.html): overview, valuation, map, table, selections, fallback, desktop/mobile and scenario handoff.
- [Saved Haven Brief](../data/runtime/property-detail-v1-2/qa-olQONh/HAVEN-brief.pdf) / [Full](../data/runtime/property-detail-v1-2/qa-olQONh/HAVEN-full.pdf).
- [GABE-01 Brief](../data/runtime/property-detail-v1-2/qa-olQONh/GABE-01-brief.pdf) / [Full](../data/runtime/property-detail-v1-2/qa-olQONh/GABE-01-full.pdf).
- [GABE-05 Brief](../data/runtime/property-detail-v1-2/qa-olQONh/GABE-05-brief.pdf) / [Full](../data/runtime/property-detail-v1-2/qa-olQONh/GABE-05-full.pdf).

These PDFs use **artificial QA financial assumptions on retained real evidence**, not investment recommendations. The same demonstration inputs intentionally test financial invariance across different subjects. `edge-*` screenshots contain synthetic coordinate/grouping variants and must not be presented as real property research. All screenshots, PDFs and the saved snapshot are private and gitignored.

Machine-readable results:

- `data/runtime/property-detail-v1-2/qa-olQONh/qa-results.json`
- `data/runtime/property-detail-v1-2/qa-olQONh/preservation-results.json`
- `data/runtime/property-detail-v1-2/qa-olQONh/visual-review.json`
- `data/runtime/investment-workspace-v1/regressions-mjiFcW/results.json`
- `data/runtime/investment-workspace-v1/qa-Pg0e9Q/qa-results.json`

## Access and cost accounting

One verified-TLS, repeatable-read, **read-only** database transaction inspected the single existing Haven Property and its saved snapshot: 5 SELECT statements including the before/after read-only guards, 15 comparable rows, zero persistent writes, then ROLLBACK. The resulting minimal local evidence copy excludes owners and contact data. The application and all QA use that copy, with **no database connection** in the local application.

Provider calls: **0**. New geocoding/Maps API calls: **0**. Additional provider exposure: **$0.00**. Existing demo conservative exposure remains **$3.60 of $20.00**, leaving **$16.40**; actual invoiced cost remains unverified. No spending allowance, request reservation or vendor ledger was reset.

No new durable Properties, migrations, production mutations, MLS selections, dependencies or deployment. No provider refresh or broad acquisition path was added.

## Changed files

Modified existing files:

- `apps/web/src/app/App.jsx`: local saved-Property handoff; explicit legacy label outside the local workspace.
- `apps/web/src/main.jsx`: local Property Detail and subject-bound workspace routing.
- `apps/web/src/components/Panels.jsx`: compact valuation component.
- `apps/web/src/features/comps-map/Comps.jsx`, `ComparableMap.jsx`, `mapData.js`: evidence categories/groups, valid-coordinate rendering, fallback and consistent details.
- `apps/web/src/features/investment-workspace/Workspace.jsx`: exact subject/snapshot handoff, return navigation and durable-versus-preliminary labels.
- `src/investment-workspace/server.js`, `store.js`: optional retained detail selection and property-specific snapshot validation; local-only protections retained.
- `src/investment-workspace/report-model.js`, `report-html.js`: truthful durable-Property reference and missing-distress labels; no calculation changes.
- `scripts/workbench-server.js`: `--property-detail` option.
- `tests/maps.test.js`: explicit provider-distance versus calculated-distance assertion.

Added files:

- `apps/web/src/features/comps-map/evidence.js`
- `apps/web/src/components/CompactValuation.jsx`
- `apps/web/src/features/property-detail/PropertyDetail.jsx`, `navigation.js`, `detail.css`
- `src/investment-workspace/property-detail.js`
- `tests/property-detail.test.js`
- `scripts/property-detail-qa.js`
- This handoff; private read-only extraction, before-capture and QA artifacts under `data/runtime/property-detail-v1-2/`.

## Remaining limitations

Haven has no retained comparable-sale search result in the selected snapshot. Gabe sales are not substituted. Listing summaries for Gabe do not retain coordinates in their reviewed presentation records; their map omissions stay explicit. A source-reported Sale event is not independent closing/title verification. Historical listing status does not establish present availability.

The local map is a coordinate plot, not a live Google street basemap. Live Google billing/key restrictions and optional geocoding remain unverified and disabled. Production rollout and support for additional saved snapshots require separate work; this task does not deploy the local workspace or refresh evidence automatically.

Ready for Stan/ChatGPT local review. Stop before deployment or further acquisition.
