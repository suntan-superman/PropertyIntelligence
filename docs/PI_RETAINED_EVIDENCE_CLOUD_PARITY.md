# Retained RentCast Evidence — Cloud Parity

## Outcome

The authenticated Netlify application restores the same normalized, previously retained RentCast property evidence used by the local Guided Analysis workspace. No deployed route has RentCast credentials or permission to make a provider request.

## Storage and authorization

- Collection: `organizations/{organizationId}/retainedEvidenceSnapshots/{snapshotId}`
- Snapshot ID: SHA-256 of the source subject reference and evidence fingerprint
- Payload: normalized property evidence plus its normalized Property Detail model
- Integrity: each immutable record carries a canonical SHA-256 payload hash that is verified on every server read
- Access: Firebase Admin SDK only, after Firebase session validation and explicit organization resolution
- Client access: existing Firestore rules remain deny-all; the browser receives data only through authenticated server APIs
- Writes: no browser or normal application route can create or modify retained evidence snapshots

The import is create-only and idempotent. A repeated import with the same identity and payload performs no write. A changed payload for an existing snapshot identity fails with `IMMUTABLE_RETAINED_EVIDENCE_CONFLICT`.

## Imported evidence

The controlled import created nine immutable normalized snapshots:

- Six reviewed GABE QA research subjects
- 3484 Haven St
- 21950 Arosa Rd
- 400 Decatur St

Decatur retains its original subject reference and evidence fingerprint and contains the retained AVM, 11 reported sale events, and 15 valuation observations. The import did not change durable properties, scenario revisions, reports, supporting documents, or provider configuration.

## Deployed behavior

- Investment bootstrap merges retained evidence with durable Firestore lifecycle records.
- Analysis, scenario saving, preview, and PDF generation resolve the exact saved evidence fingerprint and fail closed if it is unavailable.
- Available Local Research lists the organization-scoped retained catalog.
- The research action is cache-only in the deployed app and reports zero provider requests.
- Live provider research remains disabled in Netlify.

## Verification

- Initial serialization failure: zero committed writes; preserved in command history. Cause was an omitted optional comparable field represented as JavaScript `undefined`.
- Correction: normalized Firestore payload serialization before hashing and creation.
- Successful import: 9 Firestore creates, 0 updates, 0 deletes, 0 RentCast requests.
- Idempotency readback: 0 planned creates, 9 unchanged records, no unexpected records.
- Focused cloud parity tests: Decatur 11 sales, Arosa 3 sales, all nine subjects, hash integrity, tenant isolation, cache-only restoration, report compatibility.

This migration covers retained RentCast property evidence used by property research and Guided Analysis. It does not reclassify provider data as independently verified and does not turn the separate Kern County discovery universe into RentCast research.
