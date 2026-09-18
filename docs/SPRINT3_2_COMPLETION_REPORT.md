# Sprint 3.2 completion report

Date: 2026-09-18. Project: Property Intelligence. Scope: deployment/runtime bridge only.

## Outcome and STOP decision

**Implementation and local QA complete. Overall remote acceptance: NO-GO / pending verification.**

The shared API, Netlify function/configuration, packaged fixtures, server-only live-analysis path, explicit browser workflow and regression coverage are implemented. The actual Netlify local build and emulator pass. Remote deployment was **not attempted or verified**: no existing target/site link or deployment credentials were supplied. The requested explicit live-address authorization was also not supplied, so **real RentCast smoke attempts = 0; real RentCast HTTP calls = 0**. A configured local key is not treated as proof that live retrieval works in a deployed function.

Do not claim the full Sprint 3.2 GO criteria or production readiness until those two outstanding checks are completed. This report is the stopping point for Stan/ChatGPT review; no Sprint 4 or unrelated feature work follows.

## Runtime architecture

```text
React workbench
  → /api/*
  → local Node HTTP adapter OR Netlify Request/Response adapter
  → shared router and runtime services
  → same fixture/model/manual-deal/analytical code
  → explicit RentCast adapter, with filesystem or instance-memory cache
```

`netlify/functions/api.js` only creates the shared runtime and forwards the request. It contains no underwriting. Local static/Vite serving, loopback Host validation and PDF file access remain in the local adapter. The cloud adapter reads process environment only and never loads `.env`.

The generated server-only fixture module contains six models: Property/Deal modes for Fantasia, Bass and Joyce, plus minimal cached-search metadata. All six match the original local models exactly. Packaging is explicit offline analyst maintenance (`npm run fixtures:package`), not a cloud build step that would require ignored raw files. The deploy must include this generated module. No raw evidence directory is published as static assets.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Safe runtime/configuration/capability booleans only |
| GET | `/api/maps/config` | Separately designated Google browser configuration |
| GET | `/api/fixtures` | Three saved fixture identities |
| GET | `/api/reports/capability` | Accurate local/cloud PDF capability |
| GET | `/api/reports/:id` | Local opaque report download; no arbitrary file path |
| POST | `/api/fixture` | Load fixture with zero provider calls |
| POST | `/api/resolve` | Existing cached-identity lookup |
| POST | `/api/confirm` | Explicit cached/provider candidate confirmation |
| POST | `/api/properties/analyze` | Explicit property-only analysis; cache preferred |
| POST | `/api/deal/start` | Resolved property → blank manual deal entry |
| POST | `/api/deal` | Existing deterministic engine with explicit claims |
| POST | `/api/report` | Local PDF; explicit local-only response in Netlify |

Routes and methods are allowlisted. JSON actions require same origin and JSON content type; bodies are limited to 16,000 bytes. Unknown paths return JSON errors, not SPA HTML. The browser handles HTML, empty/malformed JSON, non-2xx and network failures without parser stacks, raw provider messages or environment paths.

## Netlify configuration and environment

Root `netlify.toml`: build `npm run web:build`; publish `apps/web/dist`; Functions directory `netlify/functions`; configured bundler `esbuild`; Node 20; forced `/api/*` → `/.netlify/functions/api/:splat` rewrite before `/*` SPA fallback. Existing Google-compatible CSP and safe headers are included. Netlify CLI's outer modern-function package identifies its wrapper as `nft`; the resolved config retains esbuild and the real ZIP bundles successfully.

Environment names only: `RENTCAST_API_KEY`; existing server-only fallback `MARKET_DATA_API_KEY`; separate browser `GOOGLE_MAPS_BROWSER_KEY` or accepted `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; `NODE_VERSION`; optional local-only `PI_CHROME_PATH`. No credentials added to source, TOML or example files. See [environment instructions](NETLIFY_ENVIRONMENT.md).

Google referrer restrictions must explicitly authorize the deployed hostname. The existing local permission does not authorize a Netlify hostname. No Google provider replacement or Home Advisor runtime dependency was introduced.

## Live analysis, evidence and cache behavior

An explicit **Analyze Property** action validates the address, checks saved evidence/cache, and uses only the official-host server RentCast adapter if necessary. It returns Property Mode, never an automatic deal. The button is disabled when configuration is unavailable and while requests are in flight. Results show Saved fixture / Cached evidence / Live provider retrieval and retrieval dates. Refresh requires the quota-warning acknowledgement and creates new provenance.

Multiple/mismatched candidates return AMBIGUOUS and require analyst selection. Selection records an analyst identity choice, never VERIFIED evidence. Missing manufactured representation or contradictory AVM identity/type returns SOURCE_STOP. Unexpected units do not silently become resolved identities. The original Florida verification default remains manufactured; broader supported residential live types require matching subject/AVM representation.

Provider fields remain INDEPENDENT_ONLY. Returned live models include evidence dates, references, IDs, successful snapshot hashes and explicit unresolved tenure/title/condition/cost fields. All provider comps are retained, including missing coordinates, inactive listings and type mismatches. Listing prices are not relabeled closed sales. Unknowns remain unknown; no sponsor claims, missing costs or investment conclusions are inferred. Manual deals use the existing engine and retain null fully burdened profit.

The cache exposes get/put/has. Local live writes use the original filesystem snapshot/index contract in the separate `data/runtime/rentcast` namespace, never historical `data/raw/rentcast` indexes. Cloud storage is bounded instance memory only. In-flight dedupe, an eight-operation bound, two-call interactive budget, no interactive retry and a same-instance 429 cooldown limit accidental repeated calls; these are not distributed quota controls.

**Important limitation:** live cache, deal sessions and candidate tokens are not durable or guaranteed across requests. A cold/other instance may lose them immediately; otherwise sessions expire after 30 minutes or eviction. Saved-fixture evidence and cached fixture confirmations can be reconstructed from strict allowlisted references without provider calls. Complete manual claims are recalculated against that fixture basis. Live evidence is never reconstructed from an untrusted client model and recovery never silently re-fetches a provider. Live confirmation/deal continuation can therefore return a clear expiry message after an instance change. This limitation was observed in the Netlify emulator and is explicitly retained, not represented as persistent storage.

## QA results

| Check | Final result |
| --- | --- |
| `npm run sprint3.2:qa` | PASS, exit 0 |
| `npm test` | 72/72 pass: 54 existing + 18 bridge tests; network guard enabled |
| `npm run netlify:test` | 18/18 pass (same bridge tests, not an additional 18 unique tests) |
| `npm run web:build` | PASS; 44 transformed modules; `apps/web/dist` produced |
| Existing browser regression | 12 checks pass, plus development fixture smoke |
| Map regression | 7/7 cases pass: Google double, narrow, duplicates/missing coordinates, network/auth/tile-timeout/missing-key fallback |
| New live-workflow browser QA | 5 checks pass; mock provider only, exactly 2 mocked calls in the final run |
| PDF regression | 5/5 cases pass: Fantasia 11 pages/15 comps; Bass 4; Joyce 4; long synthetic 5; 70-comp synthetic 17 |
| Netlify CLI local build | PASS with CLI 23.11.0 / Netlify Build 35.3.1 / Node 20.19.4 |
| Actual function ZIP | PASS; 460,775 bytes; executable entries inspected and scanned |
| Netlify emulator smoke | PASS at `http://localhost:8888`; JSON routing, fixtures/gates, map/table, responsive UI, missing-key behavior and local-only PDF |
| Real Google map smoke | 6 checks pass using production assets/CSP at the authorized local referrer; no Google API errors or CSP violations in final run |
| Secret scan | PASS; actual local private key and URI/base64/JSON variants absent from browser assets, packaged server model, function output/ZIP and captured local runtime logs |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | PASS |
| Sprint 3.2 preservation | 42/42 protected evidence/analytical-source hashes unchanged |
| Original Sprint 3 preservation | 36/36 protected input hashes unchanged |
| Fixture provider calls | 0 |
| Real RentCast smoke / HTTP calls | 0 / 0 — pending explicit address authorization |
| Remote site deployment | Not attempted; acceptance unverified |

Google was exercised only for map QA; it is separate from RentCast/address-analysis quota. Screenshots were generated for laptop/narrow street maps, fallback, Netlify fixtures, live mocked workflow and PDF pages. The narrow real-map popup and Fantasia PDF contact sheet were visually inspected: the popup stays within the map viewport with scrollable details, and the report retains its sections, comparable continuation and page layout.

QA findings resolved: cloud fixture session loss now reconstructs allowlisted evidence; repeated mocked browser tests now use isolated memory cache rather than retaining synthetic evidence in the local runtime cache. The temporary synthetic cache was moved to ignored `.netlify/qa-artifacts/synthetic-runtime-cache`. The existing developer server on 4173 was not stopped or modified. Its occupied Vite HMR port produces a warning in the dev fixture smoke, which still passes. Real-map QA explicitly uses built assets and production CSP to avoid testing an unrelated development HMR connection. The temporary Netlify emulator started for this sprint was stopped. Its generated root Deno lockfile was removed; no Deno dependency or edge function was added.

## PDF decision

Remote PDF is deliberately deferred. The installed-Chrome/Playwright local renderer and exact server-side workbench-model contract still work. Netlify reports: **“PDF generation is currently available in the local analyst runtime.”** The function ZIP contains only its executable and Netlify bootstrap/telemetry/metadata/package entries; no `.env`, raw evidence directories, report files, Playwright, PDF.js or native canvas executable code.

## Files changed

Modified:

- `.gitignore`, `package.json`
- `apps/web/src/app/App.jsx`, `apps/web/src/services/api.js`
- `src/workbench/server.js`, `src/workbench/search.js`
- `src/sources/rentcast/client.js`, `src/sources/rentcast/valuation.js`
- `scripts/test-foundation.js`, `scripts/qa-ui.js`, `scripts/qa-maps.js`, `scripts/qa-reports.js`, `scripts/qa-map-live.js`

Added implementation and tests:

- `netlify.toml`, `netlify/functions/api.js`
- `src/workbench/api/router.js`, `src/workbench/api/runtime.js`, `src/workbench/api/live.js`
- `src/workbench/fixtureRepository.js`, `src/workbench/fixtures.generated.js`
- `src/sources/rentcast/stores.js`
- `scripts/package-fixtures.js`, `scripts/qa-netlify-smoke.js`, `scripts/qa-runtime-ui.js`, `scripts/qa-runtime-security.js`
- `tests/runtime.test.js`

Added documentation:

- `docs/SPRINT3_2_RUNTIME_AUDIT.md`
- `docs/NETLIFY_ENVIRONMENT.md`
- `docs/NETLIFY_DEPLOYMENT_RUNBOOK.md`
- `docs/SPRINT3_2_COMPLETION_REPORT.md`

Added machine-readable evidence under `data/validation/`:

- `sprint3_2-protected-inputs.json`, `sprint3_2-unit-tests.json`, `sprint3_2-build-qa.json`
- `sprint3_2-ui-qa.json`, `sprint3_2-runtime-ui-qa.json`, `sprint3_2-netlify-smoke.json`
- `sprint3_2-map-qa.json`, `sprint3_2-live-map-qa.json`, `sprint3_2-pdf-qa.json`, `sprint3_2-security-qa.json`

Generated ignored screenshots: `data/validation/sprint3_2-visual/`; new local PDF/model artifacts: `data/reports/`; local build/log artifacts: `.netlify/`. Previous QA records use their original filenames and were not replaced by final Sprint 3.2 outputs. The user-supplied Sprint 3.2 specification remains unchanged. No analytical/underwriting engine, original model, report renderer/template, map component, sponsor/evidence artifact, Home Advisor file or dependency lockfile was changed.

## Exact deployment handoff

Full settings, context restrictions, troubleshooting and rollback: [Netlify deployment runbook](NETLIFY_DEPLOYMENT_RUNBOOK.md).

From the project root:

```powershell
npm ci
npm run sprint3.2:qa
npx --yes netlify-cli@23.11.0 build --offline
npx --yes netlify-cli@23.11.0 dev --offline --no-open --framework '#static' --dir apps/web/dist --port 8888 --functions netlify/functions
```

In a second terminal: `npm run netlify:smoke`.

After Stan supplies/selects the existing site and configures Functions-scoped server credentials plus the separate Google browser key privately in Netlify:

```powershell
npx --yes netlify-cli@23.11.0 login
npx --yes netlify-cli@23.11.0 link
npx --yes netlify-cli@23.11.0 build
npx --yes netlify-cli@23.11.0 deploy --build
npm run netlify:smoke -- https://YOUR-ACTUAL-DEPLOY-HOST
```

Use the returned review-deploy URL in the last command. Do not create an unrelated site or promote production automatically. Validate the deployed Google referrer separately. Then authorize **one** complete live address and make one explicit analysis attempt, recording safe status/provenance without credentials. Do not repeatedly refresh to force success.

Recommended next step: Stan/ChatGPT review this report and the live-session limitation, provide the existing Netlify target/access and one authorized smoke-test address, then complete only the outstanding remote/live acceptance checks. No production-hardening/auth, persistent storage, Monte Carlo, Kern, investor package or next sprint work was performed.

**STOP — Sprint 3.2 implementation handoff complete; remote/live acceptance remains pending.**
