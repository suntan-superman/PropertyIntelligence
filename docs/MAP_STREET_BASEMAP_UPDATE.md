# Street basemap and evidence popup update

Implemented 2026-09-18. Scope: comparable map, map configuration/security boundary, map tests and documentation only. Underwriting, analysis, PDF generation, other workbench panels and original evidence were not changed.

## Reference inspected first

Read Home Advisor's `apps/web/components/PropertyLocationMap.js` and `apps/web/app/properties/[propertyId]/page.js` before choosing the implementation. The reference uses Google Maps JavaScript, a shared script-loader promise/callback, `gm_authFailure`, raster street mapping, subject/numbered markers, `InfoWindow`, bounds fitting and resize handling. Its page supplies an explicitly public browser key.

Adapted those patterns locally. No new mapping provider, map dependency, Home Advisor import, Home Advisor configuration read at runtime or Home Advisor modification. Did not port its eight-comp cap, automatic geocoding, unchecked HTML interpolation, or coordinate offsets. This update supersedes the original Sprint 3 coordinate-grid-only map decision; it does not change the PDF's map policy.

## Behavior

- Google Maps `roadmap` is the primary renderer. The coordinate grid is instantiated only when the street basemap is unavailable: offline browser, blocked/unreachable loader, missing/invalid configuration, authorization failure, or initial tile timeout. Missing coordinates produce an explicit no-location state, not invented geography.
- All 15 Fantasia comps and the subject retain their exact provider coordinates. Missing-coordinate comps stay in the table and accessible evidence detail.
- Persistent comp markers contain numbers only, not persistent price labels. The subject has a distinct marker and priority above group badges.
- Subject and comp popups contain property type, bedrooms/bathrooms, area/year, lot/unit, independent AVM/range or provider-listed price/status, distance, DOM, evidence status, retrieval timestamps and unresolved land tenure. Existing deal metrics appear only when already supplied by the shared model. No financial formulas added.
- Unknown fields remain Unknown. Inactive/listing is not relabeled as a closed sale. Google supplies street context, not property evidence. No geocoding, tenure inference or new RentCast call occurs.
- Row, marker, popup and expanded-group selection share a single selection ID. Closing a popup or clearing selection clears the highlight; offline transitions preserve the selected evidence. Escape closes Google popup selection; keyboard activation works in the fallback.
- Overlap detection uses projected screen positions. Group badges and expandable rosters expose every nearby/coincident location; zoom-to-group separates distinct locations where possible. Exact duplicates remain individually selectable in the roster. Neither group expansion nor zoom rewrites marker positions/source coordinates.
- Popups scroll internally on narrow screens; the full selected evidence is also readable below the map. Fallback zoom controls sit below the popup area.
- Google loading is shared across rerenders. Fallback stays in place after reconnection until explicit **Retry street basemap**, avoiding repeat-load loops.

## Configuration and security

The project currently has **no configured Google Maps browser key**. The implementation and offline behavior are tested; **live Google street tiles have not been verified**. Without the key, the application truthfully displays the unavailable-map fallback.

Add the real value only to this project's ignored `.env`:

```dotenv
GOOGLE_MAPS_BROWSER_KEY=your_authorized_browser_key
```

Use an enabled/billed Maps JavaScript API project and restrict the key to that API and the approved browser referrer, including `http://127.0.0.1:4173/*`. This is a browser-visible key, not a private server key. The explicit `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` name is also accepted for compatibility with the reference pattern; no generic/server-key fallback exists. The real key was not copied from Home Advisor or printed in logs.

Official setup/security references: [Google Maps JavaScript key setup](https://developers.google.com/maps/documentation/javascript/get-api-key) and [Google Maps key restrictions](https://developers.google.com/maps/api-security-best-practices).

Only the allowlisted browser configuration is returned by `/api/maps/config`. RentCast, generic provider and Google server keys are never returned; a browser-key value matching a known private key is rejected. Existing loopback Host/Origin checks and environment-path blocks remain intact. The browser key is runtime configuration, not bundled by Vite.

The server's [Google Maps CSP allowlist](https://developers.google.com/maps/documentation/javascript/content-security-policy) permits the required Google script, image, font, connection and worker origins. Google script evaluation is allowed; inline scripts remain disallowed. No wildcard all-host script policy was introduced. Map popup content is constructed with DOM text nodes, including addresses and marker labels.

After configuration, reload the workbench (or choose Retry if only the key was previously absent):

```powershell
Set-Location 'C:\Users\sjroy\Source\PropertyIntelligence'
npm run web:dev
```

Open `http://127.0.0.1:4173`, load Fantasia, and confirm the map status says **Google street basemap** with real streets visible. A maps-script request is made when a mapped fixture loads; the property-analysis search elsewhere remains cache-only. The unchanged search panel's earlier blanket “no remote tiles” copy is superseded by the map's explicit status/context notice; other workbench sections were left untouched as requested.

## Tests and QA

```powershell
npm test
npm run web:build
npm run map:test
npm run web:test
```

- Unit tests: **54 passed**, including map configuration isolation, rich evidence mapping, exact/transitive overlaps, null-versus-zero and coordinate immutability.
- Build: PASS.
- Map browser QA: **7 scenarios passed**: Google adapter desktop; narrow 390px; missing coordinates/exact duplicates; blocked network; authorization failure; tile timeout; missing key. Tested selection, popup close/Escape, responsive wrapping, fallback transitions/retry, one loader per session, no permanent price labels, and no browser/CSP errors.
- Existing workbench browser regressions and development-server smoke: PASS. Original financial figures and evidence gates still reconcile.
- **Google-path tests use a clearly identified API contract double**, not real Google tiles or quota. The fallback runs real Leaflet in Chrome. No live-basemap acceptance claim is made until the authorized key is configured and checked.
- Reviewed desktop/narrow popup screenshots. Moved fallback zoom controls out of the popup heading area and verified no horizontal popup clipping. Internal scrolling is intentional and explicitly labeled.
- Protected original evidence: **36/36 hashes unchanged**. Non-map implementation: **21/21 source-file hashes unchanged**, covering underwriting, analysis, reports, shared model/search, App, panels and deal form. Baseline: `data/validation/map-update-protected-sources.json`.

Machine result: `data/validation/map-update-qa.json`. Screenshots: `data/validation/map-update/`, with `*-popup.png` for focused review. The Google contract-double screenshots test layout only and are not screenshots of an actual Google street basemap. Earlier `*-failure.png` files, if present, are retained debugging artifacts, not passing acceptance evidence.

## Changed surface

Map feature: `Comps.jsx`, `ComparableMap.jsx`, `mapData.js`, `googleLoader.js`, `googleMap.js`, `offlineMap.js`, `map.css` under `apps/web/src/features/comps-map/`.

Supporting boundary/tests: `src/workbench/mapConfig.js`, map-only additions to `src/workbench/server.js`, `.env.example`, `.gitignore`, `package.json` (`map:test`), `tests/maps.test.js`, `scripts/qa-maps.js`, `scripts/fixtures/google-maps-browser.js`, map readiness/isolation adjustments to `scripts/qa-ui.js`, and generated QA records. No new npm dependency.

Remaining external prerequisite: supply the restricted browser key and verify the live street map. No underwriting, other-panel redesign, PDF change, deployment or authentication work was performed.
