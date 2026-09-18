# Sprint 3.2 deployment runbook — Stan

## Prerequisites and boundary

Use the existing Property Intelligence Netlify site, not an unrelated new site. Need its site ID, authorized Netlify access, Node 20.12.2+ (tested 20.19.4), npm, and this completed source tree committed to the site's source repository. No deployment was performed by this implementation run: no target/link or Netlify credentials were supplied. Remote GO remains pending.

This is an unauthenticated internal POC, not production-ready deployment hardening. Enabling a server provider key on a publicly reachable site creates a billable endpoint; CORS is not access control. Use only the intended controlled review environment. Do not add auth infrastructure within this sprint.

## Build settings

Root/base directory: project root. Build: `npm run web:build`. Publish: `apps/web/dist`. Functions: `netlify/functions`. TOML sets `node_bundler = "esbuild"`, Node 20, forced `/api/*` rewrite before the SPA fallback, and the existing Google-compatible CSP. The CLI may report `nft` for the modern function's outer package even though the resolved TOML keeps esbuild; the actual function ZIP is built and tested.

Commit `src/workbench/fixtures.generated.js` with the implementation. This allowlisted server module holds six models for the three existing fixtures, built with the same model/analysis code. It is not a browser import or public asset. Do not commit ignored raw evidence, `.env`, local runtime cache, `.netlify`, report PDFs or screenshots. A clean deploy needs the committed fixture module, not the analyst machine's ignored raw-evidence files.

`npm run fixtures:package` is an **offline analyst maintenance** command requiring the original protected evidence. It verifies all protected hashes and regenerates the module. It is intentionally not a Netlify build step: the cloud checkout does not have private raw inputs. Model-equivalence tests check all six packaged models against local originals. Review any proposed fixture change separately; do not refresh old sponsor artifacts.

## Local verification commands (PowerShell)

```powershell
Set-Location C:\Users\sjroy\Source\PropertyIntelligence
npm ci
npm run sprint3.2:qa
npx --yes netlify-cli@23.11.0 build --offline
npx --yes netlify-cli@23.11.0 dev --offline --no-open --framework '#static' --dir apps/web/dist --port 8888 --functions netlify/functions
```

In a second terminal:

```powershell
Set-Location C:\Users\sjroy\Source\PropertyIntelligence
npm run netlify:smoke
```

The CLI is deliberately pinned in commands to a tested Node-20-compatible release and is not a runtime dependency. Default tests and fixture smoke consume zero RentCast quota. `netlify:smoke` uses a browser map double (no Google tiles), checks JSON rewrites and all fixture gates, missing-key UI, and local-only PDF messaging. The local UI/PDF scripts require installed Chrome/Edge or `PI_CHROME_PATH`. `npm run web:dev` and `npm run web:start` remain available.

Real Google QA at the previously authorized local referrer is optional and separate from default tests:

```powershell
node scripts/qa-map-live.js --live --sprint3.2
```

This makes Google requests, not RentCast requests. It uses the built browser assets and production CSP without stopping an existing development server on port 4173.

## Link and deploy after reviewing environment and scope

Configure variable names/scopes in `NETLIFY_ENVIRONMENT.md` privately in the Netlify dashboard, including Google referrer restrictions. Do not paste secrets into shell commands. Then:

```powershell
npx --yes netlify-cli@23.11.0 login
npx --yes netlify-cli@23.11.0 link
npx --yes netlify-cli@23.11.0 build
npx --yes netlify-cli@23.11.0 deploy --build
```

`link` must select the existing Property Intelligence site. The last command creates a review deploy, not a production promotion. Inspect the returned deploy URL and run the fixture-only check (replace the placeholder with that actual URL):

```powershell
npm run netlify:smoke -- https://YOUR-ACTUAL-DEPLOY-HOST
```

Then verify the real Google map manually using the allowed deployed referrer. Do not run live analysis on load or while checking fixtures. Only after successful review and explicit production approval should Stan promote the deploy using Netlify's normal publish controls. No production promotion occurred in this run.

## One live smoke, only with explicit address authorization

No new real RentCast calls were made during implementation. Ask Stan for a complete authorized street/city/state/ZIP and authorize one address-analysis attempt. Verify health first. In Property Mode, enter that address and explicitly click **Analyze Property** once. Do not refresh automatically. Saved-fixture addresses normally return saved evidence with zero provider calls; that is not proof of live retrieval. If deliberately refreshing, use the quota-warning checkbox. One reliable new subject normally requires up to two provider HTTP calls (lookup then AVM), with no interactive retries.

Record: attempt count, safe status, retrieval timestamps, snapshot references/hashes, INDEPENDENT_ONLY status, all comps, unknown tenure/costs and source label. Never record the key, request auth headers or full provider payload in the smoke log. If ambiguous, stop for analyst candidate confirmation; do not choose the first result. Missing representation must stop before AVM. On authentication/quota/rate errors, stop; do not retry repeatedly to obtain a pass. This real smoke and remote deployment acceptance remain pending for this run.

## Cache and sessions

Local new retrieval uses the original filesystem cache contract under `data/runtime/rentcast`; historical `data/raw/rentcast` evidence/indexes are untouched. Explicit refresh creates a new snapshot reference. Cloud cache is bounded per-instance memory only; no durable filesystem/store claim. Retrieval has a two-call budget, no interactive retry, an eight-operation in-flight bound and same-instance dedupe. A 429 pauses further retrieval for that instance for one minute. These limits do not coordinate across cloud instances.

Sessions and live candidate tokens expire after 30 minutes or eviction/restart. Netlify may use another instance on the next request, including its local emulator. Saved-fixture selection, cached fixture confirmation and manual deal evidence bases can be reconstructed from strict allowlisted fixture references with zero provider calls. Manual claim results are recalculated from the explicit submitted values; they are not persisted as sponsor evidence. Live sessions and live candidate confirmations cannot be recovered on a cold instance: the UI returns a safe expiry message and requires a new explicit analysis. No automatic provider re-fetch occurs. Retain this limitation in review; do not imply durable live deal workflow.

## PDF and troubleshooting

- `/api/*` returning HTML: confirm `netlify.toml` is in the linked root, functions were bundled/deployed, API rewrite precedes SPA fallback, and function `api` exists. Never solve this by exposing raw data directories. UI reports a sanitized unavailable-service message, not a parser stack.
- Missing RentCast configuration: check Functions scope/context and redeploy; fixtures must still work. Never put the key in Vite variables.
- Google auth/referrer error: correct the separate browser key's restrictions. Offline coordinate fallback must preserve all comps and selection.
- `SOURCE_STOP` / `AMBIGUOUS`: these are evidence gates, not operational bugs. Confirmation does not prove tenure or clear Bass/Joyce source deficiencies.
- `SESSION_EXPIRED` / `CONFIRMATION_INVALID`: instance-local live state was lost; do not manufacture a verified model or silently spend quota to recover it.
- Cloud PDF: intentionally unavailable with “PDF generation is currently available in the local analyst runtime.” Local generation still uses the exact server-side workbench model and installed Chrome. No Chrome/native canvas/Playwright bundle is deployed.
- Secret scan: `node scripts/qa-runtime-security.js` checks actual local key/encoded variants in assets, server fixture module and emulator output when present. Never print candidate secrets on a scan failure.

## Rollback and STOP

Use Netlify deploy history to republish the last reviewed deploy. Remove/disable the Functions provider key if live access must be stopped, then redeploy; fixture-only operation remains available. Historical local sponsor/evidence files are never overwritten by cloud operation.

After the completion report, stop for Stan/ChatGPT review. No auth, hardening, durable storage, Monte Carlo, Kern, investor package, Sprint 4 or new feature work is authorized here.

References: [Netlify Functions API](https://docs.netlify.com/build/functions/api/), [file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/).
