# Property Intelligence — Sprint 3.2
## Netlify Runtime, Secure Server API & Live Property Analysis

**Project:** `C:\Users\sjroy\Source\PropertyIntelligence`  
**Language:** JavaScript only  
**Deployment:** Netlify  
**Goal:** Make the Sprint 3 workbench function on Netlify and enable explicit live address analysis securely.

## Mission
Current static deployment succeeds, but `/api` calls receive SPA HTML because the loopback Node API is not deployed. Build one shared runtime:

```text
Local:   React -> local Node adapter -> shared PI API/engine -> cache/RentCast
Netlify: React -> /api -> Netlify Function -> same shared PI API/engine -> cache/RentCast
```

Do not create separate cloud business logic.

## Preserve
All Sprint 1–3 evidence rules remain: sponsor claims separate; RentCast not automatically VERIFIED; unknown never zero; ambiguity requires confirmation; manufactured-home STOP/tenure rules remain; no financial logic in React; shared screen/report model; Fantasia/Bass/Joyce artifacts unchanged; no recommendation or Monte Carlo.

## Scope
Allowed: Netlify Functions, `netlify.toml`, API routing, runtime-neutral handlers, server-only RentCast, explicit live address analysis/refresh, read-only deployed fixtures, cache abstraction, useful API errors, Netlify env docs, local compatibility, tests, deployment smoke test.

Forbidden: expose/copy RentCast secret; real secrets in `.env.example`/toml; Firebase/auth/subscriptions/Cloud Run/mobile; Kern/title/MLS/Daily Report; AI narrative; silent address/tenure inference; duplicate analysis logic; automatic provider calls on load/rerender; durable-storage claims for ephemeral filesystem; production-readiness claim.

## 1. Audit first
Inspect:
`src/workbench/server.js`, `model.js`, `search.js`, `src/reports/*`, `src/sources/rentcast/*`, `apps/web/src/services/api.js`, Vite config, package scripts.

Create `docs/SPRINT3_2_RUNTIME_AUDIT.md` documenting routes, filesystem/env dependencies, loopback assumptions, reusable modules and serverless risks. Refactor only after audit.

## 2. Source-controlled Netlify config
Create/update root `netlify.toml`, conceptually:

```toml
[build]
  command = "npm run web:build"
  publish = "apps/web/dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
```

Adapt if necessary. API routing must precede SPA fallback. Do not rely only on dashboard settings.

## 3. Shared API router
Refactor route/controller logic into runtime-neutral modules (e.g. `src/workbench/api/router.js`, `handlers.js`, `response.js`).

Local Node adapter and Netlify adapter must call the same handlers. Runtime adapters translate HTTP only. No underwriting inside function entrypoints.

Create minimal `netlify/functions/api.js`.

## 4. API
Preserve current route compatibility where practical. Support conceptually:
- `GET /api/health`
- fixture list/load
- cached property lookup
- `POST /api/properties/analyze`
- deal analysis
- report capability/status

Health returns safe booleans/runtime only, never secrets.

## 5. Live Analyze Property
Explicit action only:

```text
validate address
-> normalize
-> check cache/evidence
-> exact cached result OR server-side RentCast
-> normalize candidates
-> identity gate
-> if ambiguous return candidates
-> if reliable retrieve permitted AVM/comps
-> provenance
-> shared workbench model
```

Do not create a Deal automatically.

Normal analysis prefers valid cache. Optional `refresh:true` is analyst-controlled, warns quota may be consumed, never triggers from rerender, and creates new provenance rather than silently overwriting old evidence.

## 6. Identity/representation gates
Multiple plausible candidates => `AMBIGUOUS`; analyst confirmation required. Never first-result guess.

Insufficient manufactured-home subject representation => `SOURCE_STOP`; do not force AVM. Preserve Bass/Fantasia safeguards.

## 7. Credentials
`RENTCAST_API_KEY` is server-only: no VITE/NEXT_PUBLIC prefix, client serialization, logs, auth-header cache, errors, or bundle. Scan built assets for actual key and encoded variants.

Google Maps JavaScript key remains a browser-visible, referrer/API-restricted key using the already accepted Sprint 3.1 variable. Never mix it with RentCast.

Create `docs/NETLIFY_ENVIRONMENT.md` listing variable names and Netlify configuration steps, never values.

## 8. Cache abstraction
Create `get/put/has` abstraction.

Local: preserve filesystem cache.

Netlify POC: bundle required existing fixture evidence read-only server-side; new live calls may use in-memory per-instance cache only unless a simple already-supported durable Netlify store is clearly available without major infrastructure. Do not add Firebase/database.

Document clearly that serverless memory/filesystem is not durable persistence. Every returned live result still gets full provenance.

## 9. Deployed fixtures
Fantasia/Bass/Joyce must load on Netlify without provider calls. Bundle only required read-only evidence server-side; do not publish raw evidence as static assets.

Verify Fantasia works, Bass STOP works, Joyce ambiguity works, quota=0 for fixture use.

## 10. Frontend API hardening
Fix raw `Unexpected token '<'`.

API client must check HTTP status and Content-Type before parsing JSON, handle empty/HTML responses, and show sanitized errors such as:

`Property Intelligence API is unavailable. The web interface loaded, but the analysis service could not be reached.`

Optional safe detail: `HTTP 404 — expected JSON, received text/html`.

No stack traces/environment paths.

## 11. Frontend workflow
When live API configured:
- button: **Analyze Property**
- show result source: Saved fixture / Cached evidence / Live provider retrieval
- show retrieval timestamp
- disable while in flight
- no duplicate calls

If RentCast unavailable, fixtures remain usable and live analysis is visibly disabled.

Property Mode live result uses the same Google Maps/comp table as Fantasia.

Allow resolved Property Mode result -> **Create Deal Analysis**, with manual fields becoming analyst-entered claims. Session/in-memory deal state is acceptable and labeled nonpersistent.

## 12. Maps
Reuse Sprint 3.1 Google Maps component/model for live results. Subject + all mappable comps, rich details, overlap handling, table synchronization, unchanged source coordinates, missing-coordinate evidence retained, tenure unknown remains unknown. No separate live map implementation.

## 13. PDF deployment gate
Audit current Chrome/Playwright PDF implementation.

If it runs reliably in Netlify Functions without unreasonable bundles/unsupported Chrome assumptions/insecure hacks, expose a server endpoint.

If not, explicitly defer deployed PDF and show:
`PDF generation is currently available in the local analyst runtime.`

Local PDF generation must continue to work. Do not jeopardize Netlify deployment to force PDF serverless support.

## 14. Security
Netlify API: allowlisted routes/methods, JSON-only action requests, request-size limits, sanitized errors, no arbitrary file paths/upstream URLs/module execution, no env exposure, no secrets/auth headers, same-origin CORS default, no open proxy.

Provider quota: no page-load/fixture/rerender calls; explicit action; in-flight dedupe; cache preference; explicit refresh; clean 429 handling.

Logs may contain route/request ID/status/duration/cache-live/provider status/address hash. Never secret/auth header/raw provider response/env dump/unnecessary owner data.

## 15. Tests
Default tests consume zero RentCast quota.

Cover:
- local and Netlify adapters call same handlers
- API redirect not swallowed by SPA fallback
- health/fixtures
- mocked live analyze
- key absent from browser bundle
- env/auth not exposed
- arbitrary URL/oversize/wrong content-type rejected
- HTML response yields useful UI error
- ambiguity and SOURCE_STOP
- duplicate in-flight prevention
- Property -> Create Deal
- sponsor artifacts unchanged
- live evidence timestamp/provenance and not VERIFIED
- unknown stays unknown
- all comps retained
- fixture/cache hit causes no provider call
- refresh mocked provider call
- non-durable serverless cache limitation explicit
- live results feed same map model
- local PDF still works
- deployed PDF capability accurately reports available/unavailable

## 16. Deployment smoke test
After offline tests:
1. build locally;
2. run Netlify-compatible local runtime if available;
3. `/api/health`;
4. fixture loading;
5. no HTML/JSON parse error;
6. Google map loads;
7. Fantasia no provider call;
8. Bass/Joyce states;
9. one explicitly authorized live-address smoke test only if key configured;
10. verify provenance;
11. scan bundle/logs for secrets.

Do not repeatedly burn quota.

## 17. Deployment runbook
Create `docs/NETLIFY_DEPLOYMENT_RUNBOOK.md` with prerequisites, environment variables, Google referrer reminder, build/publish/functions config, deployment, health/fixture/live checks, troubleshooting and rollback.

## 18. Suggested commands
Adapt to implementation:
```text
npm test
npm run web:build
npm run web:test
npm run netlify:test
npm run sprint3.2:qa
npm run web:dev
```

## 19. Execution order
1. Preserve/hash protected artifacts.
2. Runtime audit.
3. Add shared router tests.
4. Refactor local server to shared handlers.
5. Add Netlify adapter.
6. Add `netlify.toml`.
7. Implement fixture packaging.
8. Implement cache abstraction.
9. Harden API client errors.
10. Verify deployed-mode fixture flow.
11. Implement live property analysis.
12. Add ambiguity/representation gates.
13. Connect live result to existing map/workbench.
14. Add Create Deal transition.
15. Evaluate PDF serverless gate; implement or defer honestly.
16. Security tests and client secret scan.
17. Build/test.
18. Netlify-compatible smoke test.
19. One live provider smoke test at most if explicitly enabled/configured.
20. Write runbook/environment docs.
21. Generate `docs/SPRINT3_2_COMPLETION_REPORT.md`.
22. **STOP.**

Do not proceed to deployment hardening, auth, Monte Carlo, Kern, or Sprint 4.

## 20. Acceptance criteria
GO only if:
- Netlify build produces `apps/web/dist`;
- functions bundle/deploy;
- `/api/*` reaches JSON function, not SPA HTML;
- Fantasia fixture works deployed without provider call;
- Bass/Joyce states preserved;
- live address analysis works through server-only adapter when configured;
- ambiguity never silently resolved;
- browser bundle contains no RentCast key;
- Google Maps still works;
- live and fixture data use same workbench/map/analysis model;
- unknown/evidence rules preserved;
- frontend never shows raw JSON parser errors;
- local workflow still works;
- PDF local still works; deployed PDF either reliably works or is explicitly unavailable;
- all tests pass;
- protected artifacts unchanged.

## 21. Completion report
`docs/SPRINT3_2_COMPLETION_REPORT.md` must include:
- files changed
- runtime architecture
- routes
- Netlify config
- env names only
- secret-scan result
- test/build results
- fixture provider-call count
- live smoke-test count/result
- cache behavior/limitations
- ambiguity/STOP behavior
- map integration
- PDF deployment decision
- protected-artifact result
- exact Stan deployment commands/Netlify settings
- known limitations
- recommended next step

## Final principle
This sprint is a deployment/runtime bridge, not feature sprawl.

The deployed application must be able to say:
> The interface is online, the analysis API is online, fixtures work without provider calls, and a new address can be analyzed through a server-only provider integration without weakening evidence integrity.

**Stop after the Sprint 3.2 completion report for Stan/ChatGPT review.**
