# PI V2.3A — Offline QA and Security Review

## Certification result

`V2.3A OFFLINE AUTHENTICATION CERTIFIED — OPERATIONAL CONFIGURATION REQUIRED`

## Automated results

| Check | Result |
| --- | --- |
| Focused and compatibility tests | 25/25 PASS |
| Skipped tests | 0 |
| Mocked browser acceptance checks | 12/12 PASS |
| Mocked provider transmissions | 1 |
| Live provider transmissions | 0 |
| Automatic retries | 0 |
| Unmocked browser network requests | 0 |
| Browser page errors | 0 |
| Production build | PASS |
| Built-artifact secret scan | PASS |
| Database connections/writes | 0 |
| Deployments | 0 |

The focused suites covered the V2.1 Guided workflow, V2.2 controlled research compatibility, and V2.3A authentication/provider controls.

### Post-login discovery correction

The investment entrypoint previously loaded the shared discovery/property evidence graph only when the optional `--property-detail` CLI flag was supplied. The client still exposed Guided Analysis at `#analyze-property`, so an older launch command could authenticate successfully and then receive `Discovery evidence unavailable.`

Investment mode now always loads the retained evidence graph. A real local-server regression launched `--investment` without `--property-detail` and confirmed `/api/discovery/bootstrap` returned HTTP 200 with 11,316 retained records. The correction does not change authentication, provider controls, evidence contents, or financial calculations.

### Firebase session issuer correction

Real login exposed a second, independent defect: PI applied the Firebase ID-token issuer requirement (`https://securetoken.google.com/<project>`) to the decoded Firebase session cookie. Firebase session cookies correctly use `https://session.firebase.google.com/<project>`, so the valid server session was rejected as `AUTHENTICATION_PROJECT_MISMATCH` and protected APIs returned 401.

ID-token and session-cookie verification now enforce their respective exact issuers while retaining the same exact audience/project check. Login also verifies `/api/auth/me` before rendering protected application content.

Security rejection coverage includes:

- unauthenticated protected-route access;
- wrong Firebase project audience/issuer;
- missing initial-administrator custom claim;
- invalid CSRF token;
- non-service-account or wrong-project credential documents;
- viewer and unclaimed analyst provider access;
- changed address/user authorization binding;
- missing or malformed request scope;
- reused confirmation and reservation tokens;
- duplicate attempted address;
- exceeded daily, provider, monthly, and per-request controls;
- timeout with zero retries;
- missing credentials or operational evidence;
- no-match, ambiguous, and quota/provider failures.

## Browser acceptance

The mocked Chrome flow performed:

1. protected application route opens at the sign-in screen;
2. password reset request succeeds through a mocked Firebase transport;
3. administrator signs in and receives a server session;
4. a new address is entered in Guided Analysis;
5. the provider preview discloses one request and a conservative `$0.20` exposure;
6. no provider request occurs before the explicit checkbox confirmation;
7. exactly one mocked RentCast Property Records request occurs;
8. zero automatic retries occur;
9. the preliminary result preserves the legal parcel-identity limitation;
10. the result opens in Guided Analysis;
11. logout returns to the protected sign-in screen.

Evidence:

- `data/validation/pi-v2-3a-auth-final-4/qa.json`
- `data/validation/pi-v2-3a-auth-final-4/01-login.png`
- `data/validation/pi-v2-3a-auth-final-4/02-authenticated-guided.png`
- `data/validation/pi-v2-3a-auth-final-4/03-provider-confirmation.png`
- `data/validation/pi-v2-3a-auth-final-4/04-provider-result.png`
- `data/validation/pi-v2-3a-auth-final-4/05-guided-handoff.png`

## Exact evidence hashes

| Artifact | SHA-256 |
| --- | --- |
| `apps/web/src/auth/firebase-client.js` | `1e896fa578ba09b47d947bd035665c2fbe308695f9053824895fd1335f1f5afd` |
| `apps/web/src/auth/AuthenticationGate.jsx` | `b42fa78f19b68bb290f9be20e686bfb54fa9b76b140374d5b59aa7e301965b25` |
| `src/auth/firebase-admin.js` | `c22d0d24d02fd23f067a6c4595e0c44d2bf869a79182b8744900a7e225b0a305` |
| `src/auth/firebase-session.js` | `b9430d87d182338b4f335800ed379ab56631330fde23f8363bc83ef905d9f880` |
| `src/investment-workspace/authenticated-research-config.js` | `8f8cccc40e417813c4cadf0afa7034d4db055478842b6b0fd8e9c12645e7b5a5` |
| `scripts/firebase-bootstrap-admin.js` | `f9e790909f58643e83fe0e1d92f840f8659c4144a455d895ff026d7875a46f17` |
| `tests/pi-v2-3a-auth.test.js` | `8e7ad5de6c8a6fd44acfe76be2a4e49987c5fe79eb5b2fa2322bb19104af1934` |
| `data/validation/pi-v2-3a-auth-final-4/qa.json` | `f51a624db3ffe7470b383e085bcf0ae4753fe362c566135ee60b1666c870ee04` |

The QA-script hash in the implementation workspace changes when its final output directory changes; it is therefore not treated as a detached certification seal.

## Dependency review

The final dependency audit reports four high-severity transitive findings under the full Firebase browser package: `@firebase/firestore`, `@firebase/firestore-compat`, and `@grpc/grpc-js`, with the direct aggregate reported against `firebase`. PI imports and bundles only `firebase/app` and `firebase/auth`; no Firestore or gRPC module is present in the built browser artifact or used by the V2.3A path. Firebase Admin `14.5.0` is clear in the final audit.

This is a documented dependency-supply limitation, not a claim that the audit is clean. The production build passed and a scan of `apps/web/dist` found no service-account fields, private-key markers, `GOOGLE_APPLICATION_CREDENTIALS`, or RentCast API-key names.

## Known local-development warning

The strict Content Security Policy continues to block Vite's development-only hot-reload WebSocket. This does not block the application or the tested authentication workflow. Production CSP was not weakened to suppress it.

## Preservation

- No live Firebase sign-in or Admin API call was made.
- The genuine Admin credential now passes local format and project-binding validation, but the initial administrator has not yet been bootstrapped because this validation step was intentionally read-only.
- No live RentCast or other provider request was made.
- No provider credential was loaded by QA.
- No production database was accessed.
- No durable Property was created.
- No financial, MAO, Monte Carlo, or report calculation was changed.
- Existing scenarios and historical evidence were preserved.

