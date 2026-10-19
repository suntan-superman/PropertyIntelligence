# PI V2.3A — Firebase Authentication and Authenticated Provider Access

## Result

The V2.3A local authentication and authenticated-provider-access implementation is complete and offline-certified with mocked Firebase and RentCast transports.

No Firebase administrator mutation, live RentCast request, database operation, deployment, or production infrastructure change was performed.

## Implemented behavior

- Firebase email/password login using the browser SDK.
- Firebase password-reset initiation.
- Server exchange of a freshly issued Firebase ID token for an eight-hour, `HttpOnly`, `SameSite=Strict` PI session cookie.
- Server-side ID-token and session-cookie verification with revoked-token checking.
- Exact Firebase project binding using both token `aud` and `iss` claims.
- Double-submit CSRF protection for session creation and logout.
- Server-issued `Administrator`, `Analyst`, and `Viewer` authorization; client input cannot assign roles.
- Trusted one-time administrator bootstrap restricted to UID `d2NTUCs0lGe6C64pDnRGtgTXm0O2`.
- Protected `/api/*` application routes when Firebase authentication is enabled.
- Authenticated provider permission derived from server-verified claims rather than manually authored per-request authorization files.
- Explicit address-and-cost confirmation before every uncached lookup.
- Existing address binding, duplicate-attempt ledger, request reservation, one-attempt limit, bounded timeout, zero retries, daily quotas, monthly ceiling, provider audit data, and preliminary-identity boundary.
- No automatic enrichment and no durable Property creation.

The implementation uses Firebase web SDK `12.7.0` and Firebase Admin SDK `14.5.0` with the existing Node 22.12 runtime.

## Files

Primary implementation files:

- `apps/web/src/auth/firebase-client.js`
- `apps/web/src/auth/AuthenticationGate.jsx`
- `src/auth/firebase-admin.js`
- `src/auth/firebase-session.js`
- `src/investment-workspace/authenticated-research-config.js`
- `scripts/firebase-bootstrap-admin.js`
- `scripts/workbench-server.js`

The existing property-research service now accepts a server-derived authorization callback while retaining compatibility with the sealed V2.2 authorization path. Existing financial engines, scenarios, historical evidence, and report calculations were not changed.

## Local configuration required

The ignored repository `.env` must contain:

```text
PI_PUBLIC_FIREBASE_API_KEY=...
PI_PUBLIC_FIREBASE_AUTH_DOMAIN=...
PI_PUBLIC_FIREBASE_PROJECT_ID=...
PI_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_PROJECT_ID=...
GOOGLE_APPLICATION_CREDENTIALS=C:/Users/sjroy/.config/property-intelligence/firebase-service-account.json
```

The `PI_PUBLIC_*` values are Firebase web-app configuration and are intentionally browser-visible. The service-account document remains server-only and must never be copied into the repository or browser configuration.

## Current configuration finding

The ignored `.env` now points to the genuine Firebase Admin service-account document:

`C:/Users/sjroy/.config/property-intelligence/property-intelligence-8238b-firebase-adminsdk-fbsvc-ed8f5caaef.json`

Local validation confirmed that it is a valid service-account JSON, its project matches `FIREBASE_PROJECT_ID`, the Firebase web project ID matches the same project, and the credential remains outside the repository. No credential values were printed or copied into source control.

The smaller `firebase-service-account.json` is browser configuration rather than an Admin key and is no longer referenced by PI.

## Administrator bootstrap

Run the trusted bootstrap once:

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/firebase-bootstrap-admin.js d2NTUCs0lGe6C64pDnRGtgTXm0O2
```

The script rejects every other UID, verifies that the credential JSON is a real service-account document for `FIREBASE_PROJECT_ID`, applies only the reviewed administrator/provider claims, and revokes old refresh tokens so the account must obtain a fresh token.

## Local startup

Authentication-only local startup:

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --firebase-auth --port 4175
```

URL:

`http://127.0.0.1:4175/#analyze-property`

Authenticated RentCast research additionally requires the private, current provider-control evidence package described below, then uses:

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --firebase-auth --live-property-research --port 4175
```

## Remaining operational prerequisites

1. Run the trusted administrator bootstrap and sign in again to obtain fresh claims.
2. Perform a real local Firebase sign-in acceptance test.
3. Prepare `data/runtime/pi-v2-3/provider-controls.json` with fresh account/quota evidence, rights and retention evidence, fee/tax evidence, exact SHA-256 references, and the reviewed local quotas. Evidence older than 24 hours fails closed.
4. Keep `RENTCAST_API_KEY` server-side. A real lookup still requires an explicit in-app address-and-$0.20 confirmation.

No live provider execution was enabled as part of V2.3A.

