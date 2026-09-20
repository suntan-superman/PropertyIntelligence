# Investment report architecture

Retain PI's installed Playwright/Chromium renderer, PDF.js/canvas QA and Letter format. Add a separate template and renderer; existing Independent Deal Review files stay protected. No new dependencies, external images, maps, fonts, providers or cross-project imports.

An ID-only report request loads the Acquisition Decision, its exact Analysis Snapshot and Evidence Snapshot, and evidence-linked comps in a transaction. Validate Property/Deal/Evidence/Analysis linkage before presentation. Missing historical links stop explicitly; no latest fallback or recalculation. Canonical Property/Deal rows validate identity only; historical property facts/claims come from immutable snapshot payloads. Encumbrances/rehab/diligence come from the decision's embedded payload, not current property history. Separately saved condition assessments without an immutable decision reference are not silently attached.

Report metadata contains durable IDs, generation timestamp, report type, content fingerprint, renderer version, status and nullable storage reference. The existing reports table can hold common fields; the same transaction's existing audit_events payload holds the complete metadata. No migration. Metadata persistence is optional and only after successful rendering. Binaries are returned directly, not stored durably.

Netlify currently has no browser renderer: preserve the existing local-only capability boundary. The deployed API supports exact historical JSON models and returns a sanitized PDF_LOCAL_ONLY response for binary generation. The local API renders PDFs with the existing installed Chrome/Edge. No Chromium packaging workaround is introduced.

Presentation uses compact tables and explicit page containers. Rows are measured in Chromium, long cells split into continuation rows, repeated section/table headings and page numbers are inserted before PDF printing. All source text remains HTML-escaped. A 30-second render limit, 2 MB model limit, 20 MB PDF limit and 200-page cap bound resources. Network requests are aborted and scripts disabled in the report browser.
