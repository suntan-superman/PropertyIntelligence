# PI V2.4 Live Firestore Acceptance — 400 Decatur St

Acceptance date: 2026-10-18 (Pacific)  
Execution window: 2026-10-18T20:09:39.713Z–2026-10-18T20:09:52.233Z  
Result: **PASS**

## Approved scope

The test promoted only `400 Decatur St, Bakersfield, CA 93308` from retained preliminary research to a durable Saved Property. It used Firebase project `property-intelligence-8238b`, Firestore database `(default)` in `us-west2`, the existing Firebase administrator, and the existing server-side authorization/session mechanism.

No provider request, Cloud Storage operation, document upload, IAM change, rules deployment, infrastructure deployment, migration, archive, restore, or destructive cleanup occurred.

## Runtime and authorization

- Node runtime: `v22.12.0`
- Administrator UID: `d2NTUCs0lGe6C64pDnRGtgTXm0O2`
- Server-resolved role: `Administrator`
- Organization: `property-intelligence-local`
- Authenticated sessions: 2
- The first PI session was explicitly logged out. A new Firebase login established the second PI session used for restoration and duplicate testing.
- The password was sent only to Firebase's email/password sign-in endpoint. The acceptance runner did not print, persist, or transmit it to the PI backend.

## Saved property

| Field | Recorded value |
| --- | --- |
| Stable property ID | `52638a00-8167-4cff-85c0-f56a0445a5a9` |
| Address | `400 Decatur St, Bakersfield, CA 93308` |
| Lifecycle | `SAVED_PROPERTY` |
| Identity confidence | `PROVIDER_REPORTED_ADDRESS_MATCH` |
| Parcel identifiers | None available; uncertainty remains recorded |
| Preliminary subject | `RESEARCH-EB66B8421C47` |
| Evidence snapshot | `3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71` |
| Created/updated application timestamp | `2026-10-18T20:09:45.229Z` |
| Creator / last editor | `d2NTUCs0lGe6C64pDnRGtgTXm0O2` |

The immutable snapshot identifier in Firestore exactly matches the retained Decatur evidence fingerprint. No APN was invented or inferred.

## Preserved analysis

| Field | Recorded value |
| --- | --- |
| Scenario ID | `2908abf4-03a2-4d3c-931f-f61b5e9900c2` |
| Revision | `1` |
| Original saved timestamp | `2026-10-18T17:30:35.827Z` |
| Evidence snapshot | `3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71` |
| Canonical source payload SHA-256 | `3ec5bf373dd688148b1400486cb41ccb12d601b944bcaa1e01718215fc7ff8b4` |

The linked Firestore scenario payload was deep-compared with the existing local revision and matched exactly. After logout and a new login, the Saved Property and linked scenario revision were both returned through authenticated PI backend reads.

## Firestore documents

The corrected collection-group baseline was zero PI documents. The final state contains exactly these four documents:

1. `organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9`
2. `organizations/property-intelligence-local/propertyKeys/e718f45357362c48b0560e8cacfaae4cbb92ec01e076bda57f7268803fd53b98`
3. `organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/evidenceSnapshots/224580d33d1b4dc96f32959bf03c7644d911360c519250c1732c17e33b5422b2`
4. `organizations/property-intelligence-local/properties/52638a00-8167-4cff-85c0-f56a0445a5a9/scenarioRevisions/2908abf4-03a2-4d3c-931f-f61b5e9900c2--r1`

Firestore server commit metadata:

| Document | Create time | Update time | Data SHA-256 |
| --- | --- | --- | --- |
| Property | `2026-10-18T20:09:45.676Z` | `2026-10-18T20:09:45.676Z` | `fcaebb62c48332953eca5fb83bf70623e446e71fa23f743646bb21f10eba4103` |
| Address uniqueness key | `2026-10-18T20:09:45.676Z` | `2026-10-18T20:09:45.676Z` | `89c30c3962aa735d7b9cd4557499b9f764bf93b1e2f1a491ed27d00d1322d6f3` |
| Evidence link | `2026-10-18T20:09:45.676Z` | `2026-10-18T20:09:45.676Z` | `0a6292b84385502e80e1a739d12aaa47a394f4446db6f4c867f447002077638e` |
| Scenario revision link | `2026-10-18T20:09:47.826Z` | `2026-10-18T20:09:47.826Z` | `90d9329b881b5f9945d1f9291efec0489915fef1f8c2c3d11734da771603f887` |

## Exact write accounting

Firestore transaction retries were explicitly limited to one attempt.

| Transaction | Mutations | Result |
| --- | ---: | --- |
| Property promotion | 3 | Created property, normalized-address uniqueness key and immutable evidence link |
| Scenario association | 2 | Created immutable scenario-revision link and updated the property parent |
| Duplicate promotion attempt | 0 | Rejected with HTTP `409 DUPLICATE_PROPERTY` |

**Exact Firestore document writes: 5.** Four documents remain because the property document was created once and updated once when the scenario revision was linked. The duplicate test performed reads only and created no write.

## Isolation verification

- Final PI collection-group counts: properties 1; property keys 1; evidence snapshots 1; scenario revisions 1; report revisions 0; supporting documents 0; document hashes 0; document audits 0; document versions 0.
- Hash manifests for the RentCast research cache, provider usage/audit files, all local scenario revisions and local reports were unchanged before versus after execution.
- Provider requests: 0.
- Other property writes: 0.
- Other scenario writes: 0.
- Report writes: 0.
- Document writes/uploads: 0.
- Archive/restore writes: 0.
- Cloud Storage buckets after the test: 0.

The two approved Firebase sign-ins can update Firebase Authentication login metadata; they did not modify Firestore property, scenario, report or document data beyond the four paths listed above.

## Duplicate and restoration verification

- A separate Firebase sign-in and PI session successfully read the property by stable ID.
- The same fresh session restored scenario `2908abf4-03a2-4d3c-931f-f61b5e9900c2`, revision 1, through both the durable-property scenario route and the normal investment workspace route.
- A repeated promotion request returned `409 DUPLICATE_PROPERTY`, identified the same stable property ID and committed zero writes.

## Client security rules

Post-test readback confirmed deployed release `projects/property-intelligence-8238b/releases/cloud.firestore` still points to ruleset `1da384f1-96e3-4902-83de-eb84d8114b2c`. Its effective client rule remains:

```text
allow read, write: if false;
```

No rules or IAM changes were made.

## Disposition

The single Decatur live-persistence acceptance is complete and passed. The Saved Property is intentionally retained for review. This result does not authorize additional live promotions, migrations, general persistence acceptance, archiving, restoration or cleanup.

