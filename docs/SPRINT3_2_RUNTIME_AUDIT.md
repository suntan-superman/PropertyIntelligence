# Sprint 3.2 runtime audit — before refactor

Scope: deployment/runtime bridge only. The Sprint 3.2 preservation manifest captures sponsor inputs, raw RentCast snapshots/indexes, normalized evidence, comparisons, Sprint 2 analytical artifacts, and analytical engine source hashes before changes. The existing Sprint 3 preservation gate remains active. No new provider calls made during audit.

## Existing routes and coupling

`src/workbench/server.js` combines HTTP, sessions, fixture resolution, deal entry, PDF generation, and static/Vite serving. GET routes: `/api/maps/config`, `/api/fixtures`, `/api/reports/:id`. POST routes: `/api/fixture`, `/api/resolve`, `/api/confirm`, `/api/deal`, `/api/report`. Host and Origin are fixed to the loopback port. Sessions, confirmation tokens and report IDs are already process-local, not durable.

`model.js` loads portfolio, normalized verification, evidence completeness, questions, scenarios and break-even JSON using project-relative filesystem paths. It hashes 36 protected inputs on every fixture load. `search.js` resolves only these cached fixture identities. `finalize`, `manualDeal`, comp presentation and pure analytical modules are reusable; their formulas must not be duplicated. The offline test guard in `analysis/offline.js` must not enter the live server bundle.

`src/sources/rentcast` is an independent, official-host-only adapter with redaction, identity gates, immutable snapshot bodies, cache indexes, bounded retries/quota and normalized provenance. Its cache is filesystem-specific; inject a get/put/has store, preserving the original filesystem implementation. Live writes must use a new runtime cache namespace, never overwrite historical fixture indexes. The existing Florida verification workflow requires manufactured representation and must remain unchanged. New address analysis must explicitly validate identity and subject representation before AVM, including consistency of property type on AVM evidence.

The browser client currently parses every response as JSON, explaining the SPA HTML parser failure. Vite publishes only `apps/web/dist`; its public environment prefix is `PI_PUBLIC_`, not RentCast. Map configuration deliberately serializes only the separately named Google browser key. Map code and all financial calculations remain shared and unchanged.

## Serverless risks and decisions

- Static deploys do not start the loopback server. Add ordered `/api/*` function rewrites before SPA fallback and one Web Request/Response router for both HTTP adapters.
- Dynamic project-root reads are not reliable after function bundling. Generate an allowlisted server-only fixture module during build from verified local artifacts; commit that module so ignored evidence need not exist in a clean Netlify checkout. Never put fixture raw data in the public build. Verify packaged input hashes and fixture equivalence locally.
- The function uses environment configuration only; it must never load `.env`. Only the local bootstrap may load the project's `.env`.
- New live cache, pending confirmations and deal sessions are bounded per-instance memory in Netlify. Cold starts/eviction lose them; return an explicit session-expired response, label nonpersistence, and never claim durable storage.
- `reports/pdf.js` imports Playwright and discovers Windows Chrome/Edge. It writes local PDF/model files. A function bundle must not include Playwright, PDF.js, native canvas, browser executables or report files. Defer remote PDF: “PDF generation is currently available in the local analyst runtime.” Inject the local PDF capability; leave renderer/model contract intact.
- Explicit live actions only. Prefer saved fixtures and cache; deduplicate in-flight retrieval; use bounded per-analysis provider budgets. Refresh creates new snapshot provenance; no background calls, automatic deal creation or silent candidate selection.
- Preserve same-origin JSON actions, route/method allowlists, byte limits, sanitized errors and separate browser/server keys. Avoid returning raw provider candidates or owner data.

## Deployment availability

At audit time no Netlify CLI executable, linked `.netlify/state.json`, or Netlify environment variable names were present. An existing target and deployment access were requested from Stan. Do not create an unrelated site or claim remote GO without deployment evidence. One real provider smoke requires explicit address authorization; mocked tests consume zero quota.

References: [Netlify Functions API](https://docs.netlify.com/build/functions/api/), [function configuration](https://docs.netlify.com/build/functions/configuration/), [file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/). These support the Request/Response adapter, esbuild bundling and source-controlled redirects; they do not establish that this project has been deployed.

## Implementation findings (after the initial audit)

Fixture packaging runs as an explicit offline analyst maintenance command, not the cloud build command. The committed generated module makes clean-checkout deployments independent of ignored private raw inputs. All six models are tested against the original local loader.

Netlify-local requests demonstrated loss of instance-local sessions between requests. Strictly allowlisted saved-fixture references now reconstruct fixture evidence/confirmation without provider calls; complete manual claims are recalculated against that basis. Live evidence and candidate tokens remain instance-local and can expire immediately across instances. No client-supplied model is accepted as evidence and no recovery action silently retrieves provider data.

The real function ZIP was inspected and scanned after a successful Netlify build. It contains the function plus Netlify bootstrap/telemetry metadata, not `.env`, raw evidence directories, report PDFs, Playwright, PDF.js or native canvas code. Full production-domain verification still requires the existing target/access details.
