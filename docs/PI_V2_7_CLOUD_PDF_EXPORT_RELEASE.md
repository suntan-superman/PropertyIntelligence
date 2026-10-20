# PI V2.7 — Cloud PDF Export and Cover Production Release

## Architecture decision

PI V2.7 uses one dedicated synchronous Netlify Function for PDF generation. HTML previews continue through the lightweight authenticated API function; only `POST /api/investment/report/pdf` is routed to the renderer function.

The renderer reuses the same certified HTML, Puppeteer-to-Letter-PDF, appendix merge, page-numbering and QA-marking code used locally. `puppeteer-core` launches the packaged `@sparticuz/chromium` binary in Netlify's Linux function runtime. The PDF is returned directly to the authenticated browser and is not written to public or persistent storage.

This was selected instead of Cloud Run because the generated packages are far below Netlify's 6 MB buffered-response ceiling and complete inside the 60-second synchronous-function ceiling. It adds no separately deployed service, public service URL, service account or fixed recurring infrastructure.

The site plan does not support custom function-memory configuration. The renderer therefore retains Netlify's 1 GB default allocation, uses a 45-second application watchdog, and limits each warm instance to one active PDF render. A draft deploy that requested 2 GB was rejected before publication; no paid-plan change was made.

## Security and integrity controls

- Firebase session authentication, verified email, role and organization membership are required before report data is loaded.
- PDF mutation requests require same-origin JSON, the workspace header and the existing double-submit CSRF token.
- Scenario ID and revision resolve only from the authenticated organization's durable property records.
- The saved scenario's evidence fingerprint is validated; browser drafts are not accepted by the report route.
- Full Package appendices are resolved server-side from the exact saved links.
- The existing document service independently checks immutable version identity, CLEAN scan status, review status, redistribution permission, confidentiality and stored-byte SHA-256 before returning bytes.
- Unrelated documents are not selected from the register.
- Request bodies remain bounded at 64 KB.
- A warm function serializes rendering, rejects duplicate in-flight request IDs and has an eight-request-per-minute Netlify domain/IP limit.
- Browser JavaScript is disabled during rendering and all page network requests are blocked.
- Responses use `private, no-store`, `Pragma: no-cache`, `nosniff` and attachment disposition headers.
- Renderer failures and timeouts fail closed and never create a downloadable PDF or report-history record.
- No Firebase Admin credential, Storage object URL, private path, hash or document body is logged or returned as metadata.

## User workflow

The Reports tab exposes three distinct actions:

1. **Preview Report** renders the exact saved revision as HTML.
2. **Generate PDF** invokes the bounded authenticated cloud renderer.
3. **Download PDF** becomes available only after successful generation and saves the returned private browser blob.

Changing the scenario, calculation-bound inputs or report type invalidates the prepared download. Unsaved changes must be saved before generation.

Full Investor Packages receive the approved dynamic cover as page 1. Synthetic scenarios receive `SYNTHETIC QA / NOT FOR INVESTOR DISTRIBUTION`; ordinary reports receive `PRELIMINARY — FOR INFORMATIONAL PURPOSES`. Opportunity Briefs do not receive the cover.

## Caching and persistence

PDF responses are not cached and PDF bytes are not persisted. Each deliberate generation revalidates the saved revision and any selected private document bytes. A successful generation adds one immutable report-history reference; it never overwrites a historical report. Client-side duplicate clicks are disabled while a request is running, and server-side concurrency is bounded.

## Resource and cost model

- New fixed service cost: none.
- Function allocation: existing Netlify default of 1 GB, scale-to-zero.
- Per generation: one authenticated function invocation, Firestore reads needed to restore the property/scenario, zero Storage reads for an Opportunity Brief, and one integrity-verified private Storage read per unique selected appendix document for a Full Package.
- Successful generation: one report-history linkage plus the pre-existing document-inclusion audit events.
- Netlify credit-based plans meter default function compute at 10 credits per GB-hour. At 1 GB, a 10-second render is approximately 0.0028 GB-hours or 0.028 compute credits, plus the small PDF bandwidth and request meters. Legacy-plan accounting may use invocation counts instead.
- No provider request, malware scan, document upload or new scenario revision occurs during report generation.

## Predeployment certification

- V2.7 focused suite: 58/58 passed.
- V2.6.2 report, financial, Monte Carlo and document-security regression suite: 130/130 passed.
- Netlify authentication/runtime suite: 25/25 passed.
- Netlify production bundle: passed; isolated renderer bundle 75.6 MB and API bundle 4.7 MB.
- Draft deploy: succeeded after retaining the supported default memory.
- Draft route audit: 28/28 passed.
- Draft authenticated interaction audit: 29/29 passed, with four documents preserved and exactly three selected for the QA Full Package preview.
- Local visual cover/package certification: Decatur synthetic Full Package 22 pages with 9 appendix pages; ordinary preliminary package 13 pages; no blank/clipped pages; pagination and financial invariance passed.

## Rollback

Rollback is a normal Netlify deploy rollback to the prior production deploy or prior Git commit. Firestore scenarios, evidence snapshots, documents and historical report revisions require no migration and must not be deleted. The dedicated renderer route can be removed independently while leaving previews and the authenticated workspace operational.
