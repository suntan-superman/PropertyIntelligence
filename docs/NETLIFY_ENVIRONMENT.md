# Netlify environment — Sprint 3.2

Names only; never place credential values in source, TOML, browser bundles, CLI command history, logs or completion reports.

| Name | Scope and purpose |
| --- | --- |
| `RENTCAST_API_KEY` | Server-only Functions environment. Required only for explicit live retrieval. Never prefix with `VITE_`, `PI_PUBLIC_` or `NEXT_PUBLIC_`. |
| `MARKET_DATA_API_KEY` | Existing server-only compatibility fallback. Prefer `RENTCAST_API_KEY`; do not configure inconsistent values. |
| `GOOGLE_MAPS_BROWSER_KEY` | Separately issued browser key; intentionally returned by `/api/maps/config`. Restrict to Maps JavaScript API and approved HTTP referrers. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Already accepted Sprint 3.1 browser-key alias. Use either this or `GOOGLE_MAPS_BROWSER_KEY`; do not substitute the RentCast/server key. |
| `NODE_VERSION` | Build runtime, set to 20 in source-controlled TOML. |
| `PI_CHROME_PATH` | Optional local analyst machine only; not needed by Netlify. |

Use Netlify **Project configuration → Environment variables** to enter credentials privately. Give server variables Functions scope, and configure the intended deploy contexts. Do not expose secrets to untrusted branch/PR builds. Redeploy after changes. Do not commit `.env`; `.env.example` contains blank templates only. The function reads `process.env` and does not load a local environment file. The local Node bootstrap may load this project's `.env`.

Configure the Google browser key's allowed referrers for the exact deployed HTTPS hostname and any deliberately authorized preview hostname. Existing `http://127.0.0.1:4173/*` permission does not authorize a Netlify domain. Restrict preview patterns narrowly; avoid unrestricted referrers. Google restrictions and RentCast authentication are separate concerns.

Verify `/api/health`: safe booleans only, `runtime: netlify`, `rentcastConfigured`, `pdfAvailable: false`, `durableLiveCache: false`, `durableSessions: false`. Missing RentCast configuration must leave fixtures usable and disable live analysis in the UI. `/api/maps/config` is the only intentional browser-key exposure. The health endpoint never returns credential values.

No new persistent store, session-signing secret, authentication service or production-readiness claim is introduced. This unauthenticated POC must not be treated as a protected public billable API; same-origin checks are not authentication.

Reference: [Netlify function configuration](https://docs.netlify.com/build/functions/configuration/).
