# PI V2.2 Live Arosa Acceptance Preflight

Date: 2026-10-16 (America/Los_Angeles)

Historical preflight status: **BLOCKED BEFORE PROVIDER TRANSMISSION**

Resolution: Stan supplied fresh dashboard evidence and explicitly approved the exact request on 2026-10-16. The single controlled request subsequently completed successfully. See `PI_V2_2_LIVE_AROSA_ACCEPTANCE.md`. The original blocker analysis below is retained as pre-execution evidence.

## Request boundary

- Subject: 21950 Arosa Road, Tehachapi, CA 93561
- Normalized address key: `21950 AROSA RD|TEHACHAPI|CA|93561`
- Provider / endpoint: RentCast Property Records / `/properties`
- Maximum transmitted requests: 1
- Conservative cost ceiling: $0.20
- Automatic retries: 0
- Additional enrichment: prohibited
- Durable Property creation: prohibited

The non-executable draft is retained privately at `data/runtime/pi-v2-2/operator/arosa-request-authorization.pending.json`. It intentionally has no approval timestamp or expiration timestamp. It is not the sealed Stage A authorization and cannot enable the V2.2 loader.

## Exact authorization contract

The existing V2.2 engine requires an authorization object containing an ID, `provider: RentCast`, `endpoint: /properties`, the authenticated local user ID, the exact normalized address key, the current execution date, one maximum request, an exact 20-cent ceiling, zero retries, no enrichment, no durable creation, an actual approval timestamp at or before execution and an unexpired expiration timestamp. The planned authorization lifetime is 30 minutes from explicit approval.

The live configuration is a private `PI_LOCAL_PROPERTY_RESEARCH_V1` record in `EXPLICIT_LOCAL_DEVELOPMENT` mode. It must include the local user, operational evidence, the request authorization, limits, and exact SHA-256 references for account, current usage, rights, fees and authorization evidence. All referenced evidence must be under `source_docs/` or `data/runtime/pi-v2-2/`. Current account evidence must be no more than 24 hours old.

## Evidence reviewed

| Evidence | SHA-256 | Finding |
| --- | --- | --- |
| `source_docs/RentCast_Email.md` | `013a720e3ce3ee93d04ad5b2c82a5014a99b854f9e3780b7a98bf9c2e973bf08` | Retained written rights, retention and HTTP-200 billing evidence |
| `source_docs/RentCast_Email_2026-10-13.md` | `3b71b49498834bb64c5a900a4c2cf3b49462febd4e0a1ad24a2bfc28f78a1cd2` | Retained endpoint-fee and tax/fee evidence |
| `source_docs/Screenshot 2026-10-12 141712.png` | `c00839575c5e26c165d0a2417c2edbd00a0b014c9656770ae6610f1ea70c1523` | Historical dashboard evidence; stale for an October 16 execution |
| `source_docs/Screenshot 2026-10-12 141727.png` | `48563fd578cfef21eb3781f98a688f20d21bcb2a0366af0de439a4bc5307c1b7` | Historical dashboard evidence; stale for an October 16 execution |

The repository integration has no authenticated account-usage endpoint. It cannot independently retrieve current plan state or remaining quota. The authoritative check is a fresh RentCast API Dashboard capture showing the active plan and current billing-period requests used/remaining.

## Remaining gates

1. Save one fresh RentCast dashboard screenshot in `source_docs/` and provide its capture time in Pacific Time. It must show the active plan and requests used/remaining.
2. After that evidence is verified, explicitly approve this exact Arosa authorization. The approval time will be recorded as received and the authorization will expire 30 minutes later.

No RentCast credential was loaded, no reservation was created and no provider request was transmitted during this preflight.
