# Netlify Firebase authentication deployment

## Intended deployment surface

The Netlify build serves the existing serverless Property Intelligence workbench and Supabase-backed APIs. Guided Analysis, its private retained evidence graph, supporting-document uploads, and local PDF generation remain local/private-development surfaces; their ignored evidence and runtime files must not be copied into the public site bundle.

The Netlify API now fails closed behind Firebase Authentication. `/api/health` remains public for deployment monitoring. `/api/auth/config`, `/api/auth/session`, `/api/auth/me`, and `/api/auth/logout` establish a same-origin, CSRF-protected Firebase session. All other API routes require the server-verified session cookie.

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

Rollback by publishing the prior reviewed Netlify deploy. If authentication configuration is incomplete, the function returns `AUTHENTICATION_NOT_CONFIGURED` and does not fall back to an unauthenticated API.
