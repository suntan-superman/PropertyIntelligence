# PI V2.2 — Authentication Foundation

## Recommendation

Firebase Authentication is a suitable initial maintained identity provider for PI, subject to Workside account/project review. It supports email/password sign-in, password reset, email verification, token/session expiration and administrative user management without PI storing passwords.

Current official references reviewed on October 16, 2026: [Firebase Authentication](https://firebase.google.com/docs/auth/), [password accounts](https://firebase.google.com/docs/auth/web/password-auth), [user/password-reset management](https://firebase.google.com/docs/auth/web/manage-users), [server session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies), [session revocation](https://firebase.google.com/docs/auth/admin/manage-sessions) and [server-issued custom role claims](https://firebase.google.com/docs/auth/admin/custom-claims).

Repository inspection found no existing Firebase SDK, Firebase project configuration or alternate production identity-provider integration. The existing Supabase/PostgreSQL work is data persistence, not an established authentication implementation. Firebase is therefore a recommendation, not a detected Workside dependency or an activated service.

V2.2 introduces an identity-provider-neutral server boundary. It accepts only claims returned by a trusted server verifier and recognizes three roles:

- **Administrator** — manage users, provider settings, spending limits and research permission.
- **Analyst** — research and analyze within assigned quotas.
- **Viewer** — view explicitly shared work only; cannot initiate provider research.

The browser cannot grant itself a role or research permission. Provider authorization is checked on the server independently from UI visibility.

## Proposed production session flow

1. The browser authenticates with Firebase Authentication.
2. The application exchanges the Firebase ID token for a secure server session cookie.
3. The server uses the Firebase Admin SDK to verify signature, issuer, audience, revocation and expiration.
4. The cookie is `HttpOnly`, `Secure`, `SameSite=Lax` or stricter, narrowly scoped and rotated/expired normally.
5. State-changing endpoints also enforce origin and CSRF protection.
6. Server authorization resolves role, organization membership, property/scenario ownership, sharing permission and provider quota before each action.
7. Logout revokes the local session. Sensitive role or account changes revoke active sessions as appropriate.

The current fixed local session adapter is exclusively for an explicitly enabled loopback development process backed by a private operator record. It is not a production authentication implementation.

## Ownership and accounting model

Future persistent records should bind to a verified internal user ID, not email text:

- research request/reservation/outcome owner
- scenario and immutable revision owner
- report owner and explicit share grants
- per-user and per-provider usage counters
- estimated cost, actual provider billing status and administrative override audit

Viewer access must require an explicit share relationship. Analysts must not see another user's private drafts by guessing identifiers. Administrators need audited actions; an Administrator role must not bypass request-bound spending controls silently.

## Deployment prerequisites

- Approved Firebase project/tenant and Workside ownership.
- Firebase web configuration restricted to approved origins; Admin credentials available only to the server runtime.
- Approved account enrollment, password, email-verification and reset policies.
- Server session-cookie implementation, CSRF protection, revocation handling and secure secret rotation.
- Persistent ownership/share/usage schema and row-level authorization design, reviewed before migration.
- Administrative user lifecycle, disabled-account behavior, audit retention and incident response.
- Production rate limiting, monitoring and alerts for authentication/provider abuse.
- Privacy, retention and deletion policy review for identity and provider evidence.
- Emulator-based tests followed by a separately authorized staging deployment.

No Firebase dependency, project, user, database migration or production configuration was created in this task.

