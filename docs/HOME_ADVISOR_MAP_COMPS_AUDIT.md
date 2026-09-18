# Home Advisor map, comps and report audit — Sprint 3

Inspected read-only on 2026-09-18. No Home Advisor files changed or imported at runtime.

## Reference files

- `apps/web/package.json`: Next 15 / React 19; maps use the Google Maps JavaScript API directly.
- `apps/web/components/PropertyLocationMap.js`: loader/error cleanup, geocoding, subject and numbered comparable markers, information windows, bounds fitting, resize handling; also a server-rendered provider-map image pattern.
- `apps/web/app/properties/[propertyId]/PropertyWorkspaceClient.js`: workspace organization, selected comparable subset and expanded map.
- `apps/web/app/properties/[propertyId]/workspacePricingTab.js`: responsive map/list layout and comparable summaries.
- `apps/web/app/properties/[propertyId]/page.js`: public Google Maps key passed into the client.
- `apps/api/src/modules/documents/html-pdf.service.js`: targeted inspection of HTML escaping, print CSS, static Google map URLs, Puppeteer rendering, Letter pages, browser cleanup and page-count handling.
- `apps/api/src/modules/documents/report.service.js`: targeted inspection of comp selection, static maps and PDF fallback.
- Web test inventory: onboarding test found; no dedicated map/table synchronization or PDF clipping coverage found.

## Patterns to reuse independently

Distinct subject/numbered comp markers, fit all geographic bounds, responsive map/list pairing, explicit failure states and lifecycle cleanup. Use structured data to render escaped report HTML; print on Letter paper with table headers, controlled margins and a footer. Close the rendering browser reliably.

## Patterns not to port

Reference UI caps comps at eight; reports select five. Retain all evidence instead. Do not inherit generic “Nearby sales” labels, missing-distance-to-zero conversion, silent first-geocode acceptance, displaced coordinates, inferred comp scoring, recommended price bands, marketing narrative or fixed-coordinate PDF fallback. Reference map and table do not provide the required two-way selection state. Do not interpolate untrusted evidence into marker HTML.

## Security and infrastructure

Google browser keys are public but require restrictions; Google static maps require separately authorized server infrastructure. Neither authorization is established here. RentCast keys remain private, server-only, and must never become Vite configuration or browser props. No key, header or environment-file content was copied into this audit.

## Decision and limitations

Use independent React/Vite JavaScript, Leaflet with an offline coordinate graticule (no external tiles/geocoding, no map key), and a loopback Node API. Preserve real coordinates and label the missing street basemap honestly. All mappable comps participate in bounds; missing locations remain table rows. Selection is shared React state.

Use local Chrome via Playwright Core for content-driven HTML-to-PDF, sourced from the same server analysis model as the screen. This preserves the reference HTML/print approach without its Puppeteer dependency: the initially considered Node-20-compatible Puppeteer version had vulnerable archive dependencies, so it was removed before use and replaced with audited Playwright Core. Omit a PDF map with an explicit explanation, coordinates and full comparable tables; no interactive-map screenshot. Render PDF pages to PNG for QA. These are local/internal limitations, not reasons to infer location, tenure, transaction status or investment quality.
