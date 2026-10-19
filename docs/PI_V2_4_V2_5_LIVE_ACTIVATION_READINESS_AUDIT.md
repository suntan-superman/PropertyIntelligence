# PI V2.4/V2.5 Live-Activation Readiness Audit

Audit date: 2026-10-18 (Pacific)  
Mode: read-only control-plane, repository and live-data inventory  
Recommendation: **NO-GO for activation; GO for the bounded remediation work listed below.**

> Historical snapshot: billing was disabled when this audit was captured. See `PI_V2_4_V2_5_INFRASTRUCTURE_READINESS_VERIFICATION.md` for the post-billing verification.

No infrastructure, IAM, rules, authentication claims or application data were changed. No bucket was created and no file was uploaded.

## 1. Current state

| Item | Read-only finding |
| --- | --- |
| Firebase / Google Cloud project | `property-intelligence-8238b`, project number `603607678553`, lifecycle `ACTIVE` |
| Admin credential binding | The `.env` path exists, contains a valid service-account JSON document and identifies `property-intelligence-8238b`. A separate malformed file named `firebase-service-account.json` also remains in the credential directory but is not the path configured by `.env`. |
| Firestore database | `(default)` exists, Native mode, `us-west2`, pessimistic concurrency |
| Firestore protection | Delete protection disabled; point-in-time recovery disabled; one-hour version retention |
| Live Firestore contents | No root collections; zero organizations, properties, supporting-document records, scenario revisions or report revisions |
| V2.4 live acceptance | Not completed. V2.4 and V2.4.1 certification records explicitly report zero live Firestore writes and an in-memory Firestore substitute. |
| Cloud Storage | No buckets exist in the project |
| Billing | No billing account linked; billing disabled |
| Storage environment | `PI_FIREBASE_STORAGE_BUCKET` is not configured |
| V2.5 runtime wiring | The Firebase document initializer exists, but `scripts/workbench-server.js` neither constructs a production scanner nor injects the document service into the server. |
| Deployed Firebase rules | The project-bound Admin SDK identity read back the deployed Firestore ruleset: it denies every client read and write and matches the local proposal. No Firebase Storage release exists because no bucket has been provisioned. |

The active Admin SDK service account currently has `roles/firebase.sdkAdminServiceAgent`, `roles/firebaseauth.admin` and `roles/iam.serviceAccountTokenCreator`. The Firebase Admin SDK service-agent role includes Firestore entity read/write and Cloud Storage object/bucket permissions. It is technically sufficient for V2.4 data and V2.5 object operations, though a dedicated least-privilege PI runtime identity is preferable before broader production use.

## 2. Required bucket and rules

The Firebase default bucket to provision is:

```text
property-intelligence-8238b.firebasestorage.app
```

Recommended immutable location: `us-west2` (Los Angeles), matching the existing Firestore database and proposed scanner service. New Firebase default buckets use the `{PROJECT_ID}.firebasestorage.app` format. Cloud Storage for Firebase requires the Blaze plan; the current project cannot provision or access the bucket until billing is linked.

Bucket controls:

- Standard storage class in `us-west2`.
- Uniform bucket-level access enabled.
- Public Access Prevention enforced.
- No public ACLs, download tokens, public URLs or browser SDK access.
- No permissive CORS policy.
- Firebase Storage rules from `config/storage.rules.proposed`: `allow read, write: if false` for every object.
- Firestore rules from `config/firestore.rules.proposed`: `allow read, write: if false` for every document.
- Only the PI backend identity receives bucket-level `roles/storage.objectAdmin`; human and scanner identities do not receive document-bucket access unless separately justified.
- Keep the application's generation-match precondition, private/no-store metadata and server-generated object keys.

Official references: [Firebase default bucket and billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024), [Firebase Storage locations](https://firebase.google.com/docs/storage/locations), and [Cloud Storage IAM guidance](https://docs.cloud.google.com/storage/docs/access-control/using-iam-permissions).

## 3. Malware-scanning recommendation

Use a private, authenticated Cloud Run service named `pi-malware-scanner` in `us-west2`, running ClamAV with an up-to-date signature mirror. Adapt Google's documented ClamAV-on-Cloud-Run design to PI's existing synchronous upload contract:

1. PI performs the existing extension, MIME, signature, size, image and PDF active-content checks.
2. PI sends the in-memory file bytes (maximum 10 MB) to the authenticated scanner with a Google-signed ID token.
3. The scanner returns a bounded clean/infected/error result.
4. PI writes the object and Firestore metadata only after a clean result.
5. Timeout, unavailable, stale-signature or malformed scanner responses fail closed; there are no automatic retries.

This is simpler for PI than the full event-driven unscanned/clean/quarantine bucket pipeline because PI already buffers small uploads and must not expose an unscanned object. It retains the production-relevant pieces of Google's reference design: isolated ClamAV execution, maintained signatures, logging and metrics. The scanner should use one vCPU, 2 GiB memory, concurrency 1, minimum instances 0, maximum instances 2 and a 60-second service timeout for initial acceptance. Signature freshness should be maintained by a daily updater using a separate private bucket such as `property-intelligence-8238b-clamav-signatures`; do not have scanner instances download directly from the public ClamAV CDN on every cold start.

Reference: [Google Cloud malware-scanning architecture](https://docs.cloud.google.com/architecture/automate-malware-scanning-for-documents-uploaded-to-cloud-storage).

## 4. Scan-status enforcement finding

Current behavior is only partially sufficient:

- **Pass:** `upload()` invokes the scanner before `storage.put()`.
- **Pass:** an unavailable or infected result fails closed.
- **Pass:** production initialization refuses to start without a scanner.
- **Pass:** successful versions record `scanStatus: CLEAN`, scan engine and scan time.
- **Fail:** `update()` can mark a seeded/imported record reviewed or independently verified without checking the current version's scan status.
- **Fail:** `download()` does not independently require `scanStatus === CLEAN`.
- **Fail:** `reportDocuments()` does not independently require `scanStatus === CLEAN`.

Activation is blocked until one shared server-side eligibility guard requires all of the following for review, download and report inclusion:

```text
current immutable version exists
scanStatus == CLEAN
scan engine is present
scannedAt is present and valid
object SHA-256 matches the immutable version metadata
```

Add negative tests that seed `UNSCANNED`, `PENDING`, `ERROR`, `INFECTED`, missing and hash-mismatched versions directly into the repository and prove that download, verified review, redistribution approval and report inclusion all fail. Browser UI state must never override this server gate.

## 5. Additional implementation, IAM and environment requirements

### Code/runtime

1. Add the shared clean-version eligibility guard described above.
2. Implement an authenticated Cloud Run scanner adapter with abort timeout, response-schema validation, no retries and fail-closed behavior.
3. Add a `--supporting-documents` startup flag that requires both `--firebase-auth` and `--firestore-properties`, constructs the scanner, calls `initializeFirebaseSupportingDocuments`, and passes the service into `startInvestmentWorkspace`.
4. Add a startup health check that confirms project ID, bucket name/location, scanner identity, scanner signature age and Firestore access without writing.
5. Add the Firebase rules files to an explicit `firebase.json` deployment target; do not rely on console defaults.

### Environment

Required:

```text
FIREBASE_PROJECT_ID=property-intelligence-8238b
GOOGLE_APPLICATION_CREDENTIALS=<existing valid external credential path>
PI_FIREBASE_ORGANIZATION_ID=<explicit normal or acceptance organization>
PI_FIREBASE_STORAGE_BUCKET=property-intelligence-8238b.firebasestorage.app
PI_MALWARE_SCANNER_URL=<private Cloud Run service URL>
PI_MALWARE_SCANNER_AUDIENCE=<same Cloud Run service URL or approved custom audience>
PI_MALWARE_SCANNER_TIMEOUT_MS=60000
PI_MALWARE_SIGNATURE_MAX_AGE_HOURS=24
```

Do not add scanner credentials, bucket keys or service-account JSON to the repository.

### IAM

- Billing/provisioning operator: project Owner through the Firebase Blaze upgrade flow, or equivalent Cloud Billing permissions managed by an administrator.
- Rules deployment operator: Firebase Rules administration permissions. The runtime identity does not need to deploy rules.
- PI runtime identity: Firestore `roles/datastore.user` and bucket-level `roles/storage.objectAdmin` are the narrow standard roles. The existing Firebase Admin SDK service-agent role already contains these data permissions, so no additional data role is technically required for the present credential.
- PI runtime identity on scanner only: service-level `roles/run.invoker`.
- Scanner runtime identity: no PI document-bucket access; read-only access to the signature mirror and log/metric writing.
- Signature updater identity: write access only to the signature bucket; no PI document-bucket or Firestore access.

References: [Firestore server IAM](https://docs.cloud.google.com/firestore/docs/security/iam), [Cloud Storage bucket IAM](https://docs.cloud.google.com/storage/docs/access-control/using-iam-permissions), and [authenticated Cloud Run service-to-service calls](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).

## 6. Minimal controlled acceptance test

Run only after the code gates, billing, bucket, scanner, IAM and deny-all rules are separately approved.

1. Record baseline counts and hashes for every existing live organization, property, scenario revision and report revision. At present all counts are zero.
2. Create a dedicated Firebase test analyst and claims for organization `pi-activation-test-20261018`; do not change the normal administrator's organization claim.
3. Start PI locally with Firebase auth, live Firestore properties and live supporting documents, but mocked/disabled provider research.
4. Create exactly one clearly labeled fixture property inside the test organization, using subject ref `PI-V25-LIVE-ACCEPTANCE-20261018`, an evidence snapshot ID with the same prefix, no APN and no scenario argument. This exercises V2.4 persistence without linking a scenario revision.
5. Upload one generated, nonsensitive, single-page PDF under 100 KB named `pi-v25-acceptance.pdf`. It must contain only the text “Property Intelligence V2.5 storage acceptance — no PII.”
6. Verify scanner response, `CLEAN` state, hash, immutable version 1, private object metadata and one upload audit event.
7. Before analyst review, verify it is not independently verified, redistributable, selected or present in report appendices.
8. Verify unauthenticated access, another organization, a Viewer and a direct object URL all fail.
9. Download once through the authenticated PI route and compare its SHA-256 to the original.
10. Mark it Reviewed (not Independently Verified), approve redistribution, select it, and invoke the report-document selection service. If a synthetic report is generated, keep it entirely inside the test organization and use a new test-only scenario ID.
11. Confirm live counts outside `pi-activation-test-20261018` and every baseline property/scenario/report hash are unchanged. Confirm provider request count is zero.
12. Archive the test property and retain the isolated test records for review. Permanent deletion requires separate cleanup approval.

Organization scoping, a unique subject/evidence prefix and omission of a scenario during promotion prevent this test from changing an existing property or saved scenario revision. Transactional property keys and document hashes are also scoped under the test organization.

## 7. Cost expectation

Linking Blaze has no fixed subscription fee, but it enables usage billing and a budget alert should be configured before activation.

- Cloud Storage `us-west2` Standard: approximately **$0.02/GiB-month** (derived from the published hourly rate), plus roughly **$0.005/1,000 Class A** and **$0.0004/1,000 Class B** operations. `us-west2` is not one of the three Always Free Storage regions.
- Firestore: the single default database includes 1 GiB storage, 50,000 reads/day, 20,000 writes/day and 20,000 deletes/day at no cost. The acceptance test is well inside those quotas.
- Cloud Run scanner: with minimum instances 0, one small scan is expected to remain inside the monthly free allowance. Without free allowance, a 15-second 1-vCPU/2-GiB scan is still well below one cent at published request-based rates.
- Daily signature updater: expected to remain inside Cloud Run's free compute allowance at this scale; without free allowance, approximately a few cents per month for a one-minute daily job, plus about one cent per month for several hundred MiB of signature storage.
- Cloud Scheduler: one daily signature-update job is expected to cost $0 because each billing account receives three jobs free; additional jobs are $0.10/job/31 days.
- Artifact Registry: first 0.5 GiB-month is free per billing account; larger ClamAV images are about $0.10/GiB-month above that threshold.
- Expected incremental acceptance cost: **less than $0.01**. Expected low-volume operational cost with scale-to-zero and available free tiers: **$0–$1/month**. A continuously warm scanner would materially increase cost and is not recommended for initial activation.

Actual charges depend on billing-account-wide free-tier consumption, scanner duration, image size, stored document volume and network destination. Set $5 and $10 budget thresholds before any activation.

References: [Cloud Storage pricing](https://cloud.google.com/storage/pricing), [Firestore pricing](https://cloud.google.com/firestore/pricing), [Cloud Run pricing](https://cloud.google.com/run/pricing), [Cloud Scheduler pricing](https://cloud.google.com/scheduler/pricing), and [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing).

## 8. Exact activation sequence after approval

1. Implement and certify the scan-status gates, scanner adapter, startup wiring and negative tests. Re-run V2.4/V2.5/auth/report regressions.
2. Link `property-intelligence-8238b` to an approved billing account / Blaze plan and create $5 and $10 budget alerts.
3. Provision default bucket `property-intelligence-8238b.firebasestorage.app` in `us-west2`, Standard class. Record its immutable location and current policy.
4. Enforce Uniform Bucket-Level Access and Public Access Prevention.
5. Configure explicit `firebase.json` targets and deploy the deny-all Firestore and Storage rules. Read them back through the Rules API and compare their content hashes to the reviewed files.
6. Deploy the private `pi-malware-scanner` and signature updater in `us-west2`; verify current signatures and an authenticated clean/infected/error contract without involving PI data.
7. Grant only the resource-level IAM listed above and capture the before/after IAM policies.
8. Configure the environment variables without printing values or copying credentials.
9. Run the startup read-only health check.
10. Execute the single controlled acceptance test in `pi-activation-test-20261018`.
11. Stop for review before enabling ordinary document uploads or migrating any local record.

## 9. Rollback

1. Stop PI and remove the `--supporting-documents` and `--firestore-properties` runtime flags; leave provider research disabled.
2. Remove the scanner URL/bucket environment settings from the runtime environment, not from source control history.
3. Revoke the PI runtime's scanner `roles/run.invoker` grant and any newly added bucket-scoped grants, restoring the captured IAM policies.
4. Disable scanner traffic and the signature update schedule. Do not delete the document bucket while any retained document exists.
5. Keep deny-all client Firestore and Storage rules in place; they are the safe rollback state.
6. Verify baseline organizations, properties, scenario revisions and reports are byte-for-byte/hash unchanged.
7. Leave the isolated acceptance organization archived for review. Delete its Firestore metadata and Storage object only under a separate, explicit cleanup approval.
8. Do not unlink billing as a routine rollback if any Cloud Storage data remains; doing so makes Storage inaccessible. Use budget caps/alerts and disabled runtime paths instead.

Because the current database is empty and the acceptance plan uses a dedicated organization, rollback does not require modifying existing property or scenario records.
