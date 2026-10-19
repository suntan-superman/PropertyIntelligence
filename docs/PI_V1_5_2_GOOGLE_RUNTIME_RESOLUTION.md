# PI V1.5.2 Google Address-Resolution Runtime Resolution

Date: 2026-10-14 (America/Los_Angeles)

## Result

The local address-resolution workflow is operational. The supplied test address produced one exact Google candidate with rooftop precision, a ZIP code, and full street/city/state/country agreement. No address decision, durable Property, canonical identity, database write, deployment, or financial-model change was made.

## Exact runtime blocker

Two independent local-development conditions caused the feature to appear disabled:

1. The running workbench process was `scripts/workbench-server.js --investment --property-detail --port 4177`. It omitted `--google-geocoding`, so `addressTransport` was intentionally `null` and the service returned `OFFLINE_NOT_CONFIGURED`.
2. The process had not been started with `--env-file=.env`. Node does not load the repository `.env` automatically, so adding the feature flag alone would not reliably load `GOOGLE_GEOCODING_API_KEY`.

Successful Google Maps rendering was not evidence that this server path was enabled. PI uses a separate browser-facing Maps key/configuration, while Geocoding requires `GOOGLE_GEOCODING_API_KEY` on the server.

The manual Analyze Property form also had no bridge into the existing candidate-address resolver. The retained-candidate modal could use the backend resolver, but manually entered street/city/state values could not. A narrow local-only bridge now sends validated street/city/CA input through the same server-side service and renders the existing evidence comparison and review actions.

## Google project and credential verification

Read-only Google Cloud inspection used explicit project `propertyintelligence-509021` rather than changing the operator's active gcloud default project.

| Check | Result |
| --- | --- |
| Project | `PropertyIntelligence` / active |
| Geocoding API | Enabled (`geocoding-backend.googleapis.com`) |
| Billing | Enabled and linked |
| Server key | `.env` value exactly matches the cloud key named `PI Server Geocoding`; value was not printed or stored |
| API restriction | Geocoding API only |
| Application restriction | None returned by API Keys metadata |
| V3 per-minute quota | 10 requests/project/minute |
| V3 daily quota | 25 requests/project/day |
| Browser Maps key | Separate from the server Geocoding key |

The root `.env` contains two distinct `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` entries. This is a configuration-hygiene concern for the browser map integration, but it did not cause the server Geocoding failure and was not changed in this task.

## Local changes

- The workbench now runs locally with:

  ```text
  node --env-file=.env scripts/workbench-server.js --investment --property-detail --google-geocoding --port 4177
  ```

- The Analyze Property address form defaults State to `CA` and exposes **Resolve with Google**.
- The backend accepts only the dedicated `LOCAL-ADDRESS-REVIEW` request shape for this local manual bridge and requires non-empty street/city plus exact state `CA`.
- County/entered source values and Google-returned values remain separate in the UI.
- The UI shows formatted address, ZIP, precision, partial-match status, and Accept/Correct/Reject actions.
- Accepting an exact suggestion produces only an in-memory `ACCEPTED_PRELIMINARY` decision with `durableIdentityCreated: false`. It does not certify legal parcel identity.
- No Google Cloud setting, production CSP, production route, database, MAO, Monte Carlo, investor-report, or historical county evidence was changed.

## Live result

Input/source value: `130 KERN ST, TAFT, CA` with no ZIP supplied.

| Field | Result |
| --- | --- |
| Google status | `OK` |
| Candidate count | 1 |
| Classification | `EXACT_ADDRESS_CANDIDATE` |
| Formatted suggestion | `130 Kern St, Taft, CA 93268, USA` |
| ZIP | `93268` |
| Precision | `ROOFTOP` |
| Partial match | `false` |
| Street number/route agreement | Yes |
| City agreement | Yes |
| State/country agreement | Yes |
| Parcel identity verified | No |

The supplied source value remains visible independently of the Google suggestion. No county, parcel, title, ownership, lien, or deliverability conclusion is inferred from the Google result.

## Provider accounting

- Live Google Geocoding requests: **2 total**.
  - Request 1: direct server-adapter verification and minimal diagnostic.
  - Request 2: Chrome end-to-end workflow verification.
- Automatic retries: **0**.
- Redirect following: disabled by the adapter.
- Other provider calls: **0**.
- Database connections/writes: **0 / 0**.
- Address decisions recorded during live QA: **0**.

Both requests returned the same normalized result. This remained below the authorized maximum of three.

## WebSocket CSP warning

The warning is unrelated to Google. Vite 6.4.3 injects `/@vite/client` into the local middleware-served HTML even with HMR disabled. That development client attempts `ws://127.0.0.1:24678`; PI's CSP `connect-src 'self'` correctly blocks the attempt.

The production build does not inject the Vite development client. Production CSP was therefore left unchanged. No `ws:` wildcard or production policy relaxation was added merely to hide the development-only warning. It is harmless in this non-HMR local workbench; no failed application request or functional error accompanied it.

## QA

| Suite | Result |
| --- | --- |
| Address-resolution unit tests | 5/5 PASS |
| Existing V1.5.2 mocked browser QA | 14/14 PASS |
| Live Chrome address-resolution checks | 9/9 PASS |
| Local-route negative checks | Invalid non-CA input and unauthorized candidate ID rejected with HTTP 400; provider count unchanged |
| Full workspace regression selection | 372/372 PASS, 0 skipped |
| Web production build | PASS |
| Chrome | `154.0.8037.57` |
| Node | `22.12.0` |

The live Chrome run verified State `CA` defaulting, source separation, formatted suggestion, ZIP, rooftop precision, exact-match classification, visible review actions, legal-identity disclaimer, and exactly one transmission from the running server.

## Evidence

- Private minimal diagnostic: `data/runtime/discovery-v1-5-2/google-runtime/130-kern-st-diagnostic.json`
- Chrome QA record: `data/runtime/discovery-v1-5-2/google-runtime/chrome-runtime-qa.json`
- Entry-state screenshot: `data/runtime/discovery-v1-5-2/google-runtime/address-resolution-entry-state-ca.png`
- Result screenshot: `data/runtime/discovery-v1-5-2/google-runtime/address-resolution-130-kern-st.png`
- Full regression output: `data/runtime/investment-workspace-v1/regressions-H8BY4g`

## Status

**LOCAL GOOGLE ADDRESS RESOLUTION OPERATIONAL — PRELIMINARY ADDRESS EVIDENCE ONLY**

Stop for Stan/ChatGPT review. No production deployment or identity persistence was performed.
