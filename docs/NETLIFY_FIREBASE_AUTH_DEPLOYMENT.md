# Netlify Firebase authentication deployment

## Intended deployment surface

The Netlify build serves the same Guided Analysis, Discover Opportunities and My Workspace desktop shell used by the private local runtime. The organization-scoped durable workspace is restored from Firestore through authenticated server APIs. The obsolete serverless workbench is not the Netlify entry surface.

Durable property identity, immutable scenario revisions, report history and sanitized document metadata are available in the deployed shell. Evidence that was retained only in ignored local files is not copied into the site bundle; where an immutable Firestore evidence payload is absent, the deployed UI reports that evidence as Unknown instead of fabricating it. Private supporting-document bytes and local PDF rendering remain server-controlled and are not exposed as static assets.

The Netlify API now fails closed behind Firebase Authentication. `/api/health` remains public for deployment monitoring. `/api/auth/config`, `/api/auth/session`, `/api/auth/me`, and `/api/auth/logout` establish a same-origin, CSRF-protected Firebase session. All other API routes require the server-verified session cookie.

`/api/durable-properties`, `/api/investment/bootstrap`, `/api/investment/scenarios` and `/api/durable-properties/:id/workspace` use Firebase Admin on the server to restore the authenticated user's organization-scoped properties, immutable scenario revisions, report history, and sanitized supporting-document metadata. The browser never initializes Firestore or receives Storage paths, hashes, service-account material, or direct database permissions. Archive/restore and scenario revision writes use the same CSRF and role boundary. Historical report metadata is available, but historical PDF bytes are not reconstructed or exposed by this connection.

## Required Netlify variables

Set these in **Project configuration → Environment variables**. Apply them to Production and Deploy Previews. The four `PI_PUBLIC_*` values are Firebase web-app identifiers and are returned at runtime; the service-account value is sensitive and must have **Functions** scope only.

| Variable | Scope | Source |
| --- | --- | --- |
| `PI_PUBLIC_FIREBASE_API_KEY` | Functions | Firebase project settings → General → Web app SDK setup |
| `PI_PUBLIC_FIREBASE_AUTH_DOMAIN` | Functions | Same Firebase web-app config |
| `PI_PUBLIC_FIREBASE_PROJECT_ID` | Functions | `property-intelligence-8238b` |
| `PI_PUBLIC_FIREBASE_APP_ID` | Functions | Same Firebase web-app config |
| `FIREBASE_PROJECT_ID` | Functions | `property-intelligence-8238b` |
| `PI_FIREBASE_ORGANIZATION_ID` | Functions | `property-intelligence-local` |
| `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` | Functions, secret | Base64 of the existing administrator service-account JSON |

Do not set `GOOGLE_APPLICATION_CREDENTIALS` to a Windows path in Netlify. That path exists only on the analyst workstation. Do not expose `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` to Builds or the browser.

Add `worksidepropertyintelligence.netlify.app` in **Firebase console → Authentication → Settings → Authorized domains**. Keep Email/Password as the intended sign-in provider and retain the existing administrator role and organization custom claims.

## Verification

After a deploy preview is created:

1. `GET /api/health` returns 200.
2. `GET /api/auth/config` returns 200, a CSRF cookie, and the expected Firebase project ID.
3. `GET /api/fixtures` without a session returns 401.
4. Sign in through the browser and confirm `/api/auth/me` reports the Administrator role, verified email, and `property-intelligence-local` organization.
5. Load a packaged fixture and verify zero provider calls; do not use live research as a deployment smoke test.
6. Open **Durable Property Workspace**, confirm `400 Decatur St, Bakersfield, CA 93308`, and verify its saved revisions, report history and supporting-document register load without a provider request or database write.

Rollback by publishing the prior reviewed Netlify deploy. If authentication configuration is incomplete, the function returns `AUTHENTICATION_NOT_CONFIGURED` and does not fall back to an unauthenticated API.
