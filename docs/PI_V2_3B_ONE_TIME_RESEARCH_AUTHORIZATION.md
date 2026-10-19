# PI V2.3B — One-Time Research Authorization and Automatic Enrichment

Date: 2026-10-16 (Pacific)

Status: local implementation and mocked browser acceptance complete. No live provider request, deployment, production database write, durable Property creation, or financial-engine change occurred.

## Implemented workflow

An authenticated Administrator, or an Analyst carrying the server-issued provider-research and organization claims, can now prepare one complete property research plan. PI displays the normalized address, each operation, the maximum of three provider requests, the $1.00 property ceiling, and zero-retry policy before execution.

The user reauthenticates directly with Firebase. PI never receives the password; the browser sends only the resulting Firebase ID token to the backend. The backend independently verifies project, UID, role, organization, email-verification state, provider permission, and an `auth_time` no more than five minutes old. It then issues an opaque ten-minute, single-use authorization bound to that user, organization, address, evidence snapshot and operation set.

Execution remains server-side and ordered:

1. retained evidence or authorized cache;
2. RentCast Property Records when absent;
3. RentCast valuation;
4. RentCast sold-property search.

Every uncached attempt receives an atomic reservation before transmission. Limits are enforced again at reservation time. Successful evidence is retained when a later operation fails, automatic retries remain zero, listings remain separate from completed-sale evidence, and provider identity remains preliminary. No automatic canonical Property is created.

Manual request-authorization files are no longer part of this authenticated path. Account-level provider controls remain private in `data/runtime/pi-v2-3/provider-controls.json`. Missing, invalid or older-than-24-hours account evidence disables research and produces one administrator setup blocker instead of bypassing the controls.

## Local acceptance result

- Focused regression: **34/34 passed**, zero skipped.
- Financial, Monte Carlo, seller-evidence and report regression: **131/131 passed**, zero skipped.
- Production web build: passed, 79 modules transformed.
- Mocked Chrome acceptance: **11 checks passed**; zero browser errors and zero unmocked external requests.
- Arosa Property Records: `Available` from the existing retained response; **0 repeated Property Records requests**.
- Mocked valuation: `Retrieved`.
- Mocked comparable sales: `Retrieved` from an explicit provider `Sale` history event.
- Firebase password operations: one sign-in plus exactly one research reauthentication.
- Research authorization: one, property-bound and single-use.
- Provider requests: **2 mocked**, estimated exposure **$0.40**, retries **0**.
- Live provider requests: **0**.
- Durable Properties created: **0**.

QA receipt: `data/validation/pi-v2-3b-research/qa.json`

Screenshots:

- `data/validation/pi-v2-3b-research/01-one-time-authorization.png`
- `data/validation/pi-v2-3b-research/02-research-complete.png`
- `data/validation/pi-v2-3b-research/03-guided-handoff.png`

## Preservation and source identities

The original protected RentCast client remains exactly:

`src/sources/rentcast/client.js` — `57a0bd9c924cc0dab9096b695caf5be8e9d842153d7d727a849bde68879c1141`

The V2.3B provider shapes use the separate versioned client:

`src/sources/rentcast/research-client-v2-3b.js` — `3180c1a2a438062b8d374c7627bcc0a3c808ad93254be8545ca8b8db526190e7`

Primary V2.3B implementation hashes:

| File | SHA-256 |
|---|---|
| `src/investment-workspace/automatic-property-research.js` | `c6268c1cec1bd371b31be330288924ce065ad54e221c9e6dbe1a65d68c6bc066` |
| `src/investment-workspace/authenticated-research-config.js` | `d71e92c3c9005e8947c43a7038f4929034e2b6aa07f961df5609906fa38f6ba7` |
| `src/auth/firebase-session.js` | `23600f310eb55a3eefef311e75ff3fbeb1a5415ffe8b907a9d6aa5be802b66a9` |
| `apps/web/src/auth/AuthenticationGate.jsx` | `2cfc55c4ad7b13937801218867f123b868366c95d85b7a0de190df60bf2612e3` |
| `apps/web/src/features/discovery/Discovery.jsx` | `594234bc3d154ff8f74ebf82f5a2dd04b335e3a66bdf2a918a147cb409f641d3` |
| `tests/pi-v2-3b-research.test.js` | `79e4e3fc12f8006320b0c5285c2dd0cf239e7e5367ddc0750df5d0aa266795e2` |
| `scripts/pi-v2-3b-research-qa.js` | `21e07e3c7384d8ce1b9f773275c2dba7f1555bfc1b9b80ce8463eb29351f890e` |

Existing Crestview and Haven retained-first regressions passed. Their scenarios, evidence, certified MAO/Monte Carlo engines and investor-report behavior were not altered by this workflow.

## Start locally

```powershell
node scripts/workbench-server.js --investment --firebase-auth --live-property-research --port 4175
```

The local startup check succeeded with the configured Firebase Application Default Credential and current private provider controls. Before any later live research, retain valid Firebase web/Admin configuration, `RENTCAST_API_KEY`, current account/quota evidence (not older than 24 hours), rights/retention evidence and the fee/tax bounds in the private account-level record. Analysts other than the initial administrator must carry both the approved organization claim and provider-research permission.

Run the offline checks with:

```powershell
npm run pi:v2.3b:research:test
npm run pi:v2.3b:research:qa
```

Any new live paid research still requires the authenticated user to review the displayed plan and complete the one-time Firebase reauthentication. This implementation did not authorize or perform such a live run.
