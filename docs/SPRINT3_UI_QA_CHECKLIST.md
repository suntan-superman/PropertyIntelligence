# Sprint 3 internal workbench UI QA

Run `npm run web:build` then `npm run web:test`. Real local Chrome runs through Playwright Core; no external website, map tile, geocoding or provider request is allowed by the browser test. Default unit tests separately install the offline network guard.

## Acceptance checks

- [x] Built application starts on loopback; development-server fixture smoke passes.
- [x] Property Mode contains property/valuation/comps/evidence, without invented deal inputs or economics.
- [x] Deal Mode loads actual seeded claims; metrics reconcile to preserved Sprint 2 artifacts.
- [x] All 15 Fantasia comps retained, with 15 provider-coordinate markers and a distinct subject marker.
- [x] Table click selects marker; marker click selects row; Enter activates an overlapping marker.
- [x] Price labels are decluttered, not comp evidence. Fit-all, zoom and selection work without moving source coordinates.
- [x] Missing-coordinate synthetic comp remains in the table as `Map location unavailable`.
- [x] Provider listing/inactive labels retained; no closed-sale status inferred. Tenure filter disabled.
- [x] Default five scenarios and View all 21 reconcile; signed losses and unknown costs displayed honestly.
- [x] Known/unknown costs, break-even, thresholds, sensitivity ranking and matrix visible.
- [x] Expandable metrics, evidence and source references expose status, original claims, dates and notes.
- [x] Questions remain grouped draft requests; no messages sent.
- [x] Bass retains representation STOP; Joyce retains address ambiguity.
- [x] Abbreviated cached address requires explicit confirmation. Confirmation cannot clear a source gate.
- [x] Failed new lookup clears the prior property, map, report link and analysis.
- [x] Manual claims require explicit base amounts, origin, hold duration and additional-cost timing; original artifacts remain unchanged.
- [x] Server-generated PDF download matches the exact saved screen-model fingerprint.
- [x] Cross-origin API action rejected; environment paths blocked; actual private key and encoded key absent from client bundle.
- [x] Laptop 1366×950 and narrow 390×844 inspected; no page-wide horizontal overflow. Wide evidence tables intentionally have local horizontal scrolling.
- [x] Keyboard controls and visible focus tested; status is textual, not color alone. Long synthetic addresses and 70-comp evidence render without omission.
- [x] No uncaught browser runtime errors; no external browser requests in built-app QA.

## Visual review and fixes

Inspected `data/validation/sprint3-visual/ui-laptop-top.png`, `ui-narrow-top.png` and `ui-map.png`, plus generated full-page screenshots. Header metrics, warnings and navigation remain legible. Narrow layouts stack search controls and preserve table access.

QA found overlapping marker pointer targets and a fixture-switch cleanup race. Added explicit Enter/Space activation, marker selection/hover elevation, nonanimated selection and cleanup of map listeners. Coincident locations remain geographically accurate; use table selection or zoom to inspect them. No evidence is displaced or discarded.

The initial development-server path guard also blocked required vendor CSS/runtime modules. It now permits only the specific public Vite runtime and Leaflet distribution paths, while still blocking environment/server paths. Development HMR is disabled to avoid a separate listening WebSocket; reload the browser after edits.

## Release limitations

Local/internal, cache-only address workflow. No live lookup or refresh button is shipped; uncached addresses return an explicit no-evidence message. The map is a labeled geographic coordinate grid without street tiles. No authentication or deployment is implied. Analyst sessions are memory-only and disappear at restart; generate a report to preserve its model snapshot. Synthetic fixtures are QA-only and are not added to the saved-property menu.

Machine results: `data/validation/sprint3-ui-qa.json`. Source of truth for protected inputs: `data/validation/sprint3-protected-inputs.json`.
