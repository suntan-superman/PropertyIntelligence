# PI Durable Identity Persistence Gap Analysis

Date: 2026-10-09. **LOGIC CERTIFIED — ISOLATED DB REQUIRED**.

The mechanics do not require a second identity system. Existing repositories and schema can represent the intended relationships, but the offline PASS does not make the current production workflow safe for arbitrary approved provider suggestions.

## Remaining gaps

| Gap | Evidence / significance | Smallest next step; not implemented in production |
| --- | --- | --- |
| No verified isolated database | Only an unauthorized nonlocal default connection was found; no positive server/role/data/service isolation proof | Stan identifies an existing dedicated non-production target. Verify isolation before writes; do not use a temporary schema on production |
| Full analyst-approval binding absent from production save boundary | `saveAddressResolution` checks `analystConfirmed`, but not a trusted reviewer record, approval expiry, packet fingerprint or independent licensing | Adapt the tested policy checks into the existing service boundary after review; bind trusted approval/evidence references rather than accepting client claims |
| Retention/use rights not enforced by generic repositories | Generic canonical/snapshot storage accepts caller-provided fields; an approved Google suggestion is not independently licensed durable evidence | Require independently supportable component sources and permitted canonical use; reject temporary dependencies, expired/out-of-scope or wrong-property evidence, including on replay |
| Address-based Property reuse is insufficient alone | `insertOrReuseProperty` reuses by unique normalized address without checking original ATN/APN or archive state | Gate reuse with authoritative candidate/source/Assessor/county coherence and archive/conflict checks; pilot tests this before and after reuse |
| County identities not globally unique in Property storage | ATN/APN index is not unique; APN9 intentionally permits multiple assessment entities | Reject ambiguous representations for this narrow pilot. Do not add a global APN unique constraint without separate domain review |
| Canonical and Property saves are separate operations | Address repository opens a transaction; normal Property service assumes existing canonical context | Use one existing connected-client transaction for a future identity-only service; pilot demonstrates transaction-bound repository composition |
| Replay helper caches without request/evidence binding | `idempotent` keys operation/request, returns cached JSON, and does not itself revalidate evidence | Keep deterministic identity, verify current approval/evidence and reopen exact linked rows on every replay; pilot tests this |
| Linkage alone does not prove all evidence coherence | Migration 006 permits nullable canonical/Assessor FKs. Trigger validates same candidate/active references, not address-value equality, county identities or evidence rights. Existing same-Property repository replay does not independently establish identical Assessor context | Require exact nonnull references for this workflow and validate retrieved canonical/Assessor/address/county facts; do not infer identity from the link alone |
| Archive and status policy belongs above low-level storage | Link creation does not independently reject an archived Property; Property `identity_status` is free text | Keep explicit archive checks. Preserve current `UNCONFIRMED` Property convention; do not equate it with postal validation or ready-for-investment status |
| Transaction fallback can be nontransactional | `createDatabase` invokes work directly when injected pool has no `connect` | Require a connected transaction-capable client in any future live persistence path; offline double deliberately supplies `connect` |
| Evidence/audit history not uniformly trigger-immutable | Canonical/Assessor/lineage have immutable-history triggers; generic snapshot/audit immutability is not equivalently enforced in the inspected initial schema | Preserve append-only service behavior and review role/constraint guarantees in isolated PostgreSQL before a broader integrity claim |
| Database behavior still untested here | Query double serializes requests and does not execute SQL constraints/triggers/RLS | Run actual two-connection replay/concurrency, FK, immutable-history and rollback checks only after positive isolation verification |

The offline guards are intentionally under `scripts/durable-identity-pilot/`; they are not wired into production routes. No schema fix or broad baseline update was made. Findings are not claims of observed production data corruption, and no production query was used to investigate them.

## Real-property evidence gap

IP-P2's existing historical APPROVED decision remains unchanged. Its Google binding makes it unsuitable as the sole authorization for shared durable canonical persistence. The task's synthetic approval is explicitly artificial and cannot approve IP-P1/IP-P2/IP-P3. No real component, owner/contact data or parcel identifier was copied into the synthetic fixture.

For any later real-property operation, independently supportable address evidence, trusted human approval bound to the current packet, current retention/use permission, exact county/Assessor relationships, exclusion/conflict review and separate write authorization are all still required. Reviewer approval does not establish licensing; address normalization does not establish parcel identity. Nothing here changes the permanent pilot exclusions or Round 1 authorization.

## Minimal next step

1. Stan identifies an **existing** isolated PostgreSQL environment and its intended test role, without putting credentials in chat or reports. If none exists, request separate provisioning authorization; do not create infrastructure under this task.
2. Establish actual server/database identity, role/privileges, schema, absence of production data, separation from production services, and exact cleanup scope. A name containing `test` or a localhost URL is insufficient. Do not query the default production connection to establish this.
3. After review, reuse the existing repositories with a narrowly reviewed real-database test adapter and schema-complete synthetic source fixtures. Exercise transactions, restrictive FKs, active uniqueness, immutable history and two concurrent connections. Run twice and reopen through a separate connection. This helper currently has no live execution switch.
4. Only with separate approval, harden the existing application save boundary using the demonstrated checks. Do not create a parallel identity service, add a migration speculatively, or admit temporary Google suggestions into durable records.

No real property persistence or MLS selection follows automatically from isolated mechanics certification. The next business milestone remains the six-property MLS validation, with its existing independent authorization/readiness gates.

Stopped for Stan/ChatGPT review.
