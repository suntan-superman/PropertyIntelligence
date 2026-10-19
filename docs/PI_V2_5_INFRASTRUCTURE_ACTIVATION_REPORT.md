# PI V2.5 Infrastructure Activation Report

Activation date: 2026-10-18 Pacific / 2026-10-19 UTC  
Project: `property-intelligence-8238b`  
Region: `us-west2`  
Runtime: Node.js `v22.12.0`  
Disposition: **Infrastructure provisioned and verified; GO for one separately authorized, isolated live document-upload acceptance test.**

## Scope and safety result

The approved private Storage and malware-scanning foundation was provisioned. No real document was uploaded, no PI document metadata or report revision was created, no provider was called, and no existing property, evidence snapshot, scenario, or report was changed.

The document bucket is empty. The existing Decatur Firestore state remains byte-for-byte equivalent at the application-data level to its accepted baseline.

## Mandatory preflight

All critical preflight checks passed before provisioning:

- Billing is enabled for the correct Firebase/Google Cloud project; billing-account details were not recorded.
- Firebase Admin credentials bind to `property-intelligence-8238b`.
- Administrator UID `d2NTUCs0lGe6C64pDnRGtgTXm0O2` is enabled, has `emailVerified: true`, retains the `Administrator` role, and belongs explicitly to `property-intelligence-local`.
- Firestore `(default)` is Native mode, operational, and located in `us-west2`.
- Firestore direct-client rules remain deny-all, release `projects/property-intelligence-8238b/releases/cloud.firestore`, ruleset `1da384f1-96e3-4902-83de-eb84d8114b2c`.
- Decatur property, evidence snapshot, and scenario revision hashes and commit timestamps matched the prior live-acceptance baseline.
- No prior Storage bucket, scanner service, or conflicting scanner service account existed.

The local gcloud default project is not the PI project. Every infrastructure command therefore used an explicit `--project=property-intelligence-8238b`; operators must continue doing this.

## Resources created

### APIs enabled

- `firebasestorage.googleapis.com`
- `storage.googleapis.com`
- `run.googleapis.com`
- `artifactregistry.googleapis.com`
- `cloudbuild.googleapis.com`
- `iamcredentials.googleapis.com`

### Firebase Storage

| Setting | Effective value |
| --- | --- |
| Bucket | `property-intelligence-8238b.firebasestorage.app` |
| Location | `US-WEST2` regional |
| Storage class | Standard |
| Public access prevention | Enforced |
| Uniform bucket-level access | Enabled |
| Default soft-delete retention | 7 days |
| Objects after verification | 0 |
| Direct unauthenticated list | Denied with HTTP 403 |

The deployed Firebase Storage release is `projects/property-intelligence-8238b/releases/firebase.storage/property-intelligence-8238b.firebasestorage.app`, using ruleset `projects/property-intelligence-8238b/rulesets/33befc40-d8ab-4473-bf38-96410be33179`. Readback confirmed `allow read, write: if false;`; the source SHA-256 is `3aeffd9ee2810f3509b79341db8a5f6cf77e50999086a61703d1f1cfba9406e7`.

Bucket-scoped IAM grants the existing PI backend service account only:

- `roles/storage.objectAdmin`
- `roles/storage.legacyBucketReader`

There is no `allUsers` or `allAuthenticatedUsers` bucket binding. Google-created legacy project Owner/Editor/Viewer bucket bindings remain inherited; no new project-wide Owner or Editor role was granted.

Cloud Build created `property-intelligence-8238b_cloudbuild` as its required source-staging bucket during `gcloud builds submit`. It is not used for PI documents and currently contains approximately 21,287 bytes. This is the only additional bucket and is a technical dependency of the approved scanner image build.

### Malware scanner

| Setting | Effective value |
| --- | --- |
| Cloud Run service | `pi-malware-scanner` |
| Region | `us-west2` |
| Current revision | `pi-malware-scanner-00010-nf7` |
| Container image | `us-west2-docker.pkg.dev/property-intelligence-8238b/pi-security/pi-malware-scanner@sha256:5e2992a6a122841ce5cffaeb05b3d0ed9952b7acd4eb9e36b0d7dd4505003407` |
| CPU / memory | 1 vCPU / 2 GiB |
| Min / max instances | 0 / 1 |
| Concurrency | 1 |
| Request timeout | 60 seconds |
| Automatic PI retries | 0 |
| Ingress | All network ingress, with mandatory Cloud Run IAM authentication |
| Unauthenticated invoker | None |
| Service identity | `pi-malware-scanner@property-intelligence-8238b.iam.gserviceaccount.com` |
| Service identity project roles | None |

The scanner service identity has no Storage or Firestore access. The only service-level invoker binding is `roles/run.invoker` for the existing Firebase Admin backend service account. Public invoker principals are absent.

The Artifact Registry repository is `pi-security` in `us-west2`, with immutable tags. It currently occupies approximately 404.4 MB. Seven diagnostic/corrective build tags remain and share base layers; the running service is pinned to the final digest above. Failed revisions never received traffic.

### Signature-update strategy

Each cold start runs `freshclam` before the HTTP server starts. `freshclam` then remains in daemon mode and checks for updates 24 times per day while an instance remains warm. PI also independently rejects a response whose signature timestamp is missing, invalid, in the future, or more than 24 hours old.

Cloud Run startup logs confirmed successful database validation and current downloads for daily database version `28157`, main database version `63`, and bytecode database version `339`. ClamAV reported engine `1.4.3` while recommending `1.4.6`; the engine image should be refreshed before general rollout.

## Activation command record

The activation used explicit project and region scoping. Authentication tokens and billing details are intentionally omitted.

```powershell
gcloud services enable firebasestorage.googleapis.com storage.googleapis.com run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com iamcredentials.googleapis.com --project=property-intelligence-8238b

# Firebase Management API: create the project's default bucket in US-WEST2.
firebase deploy --only storage --project property-intelligence-8238b --config config/firebase.storage.json

gcloud storage buckets update gs://property-intelligence-8238b.firebasestorage.app --public-access-prevention --uniform-bucket-level-access --project=property-intelligence-8238b
gcloud storage buckets add-iam-policy-binding gs://property-intelligence-8238b.firebasestorage.app --member=serviceAccount:firebase-adminsdk-fbsvc@property-intelligence-8238b.iam.gserviceaccount.com --role=roles/storage.objectAdmin --project=property-intelligence-8238b
gcloud storage buckets add-iam-policy-binding gs://property-intelligence-8238b.firebasestorage.app --member=serviceAccount:firebase-adminsdk-fbsvc@property-intelligence-8238b.iam.gserviceaccount.com --role=roles/storage.legacyBucketReader --project=property-intelligence-8238b

gcloud iam service-accounts create pi-malware-scanner --project=property-intelligence-8238b --display-name="PI Malware Scanner"
gcloud artifacts repositories create pi-security --repository-format=docker --location=us-west2 --immutable-tags --project=property-intelligence-8238b
gcloud builds submit services/pi-malware-scanner --tag=us-west2-docker.pkg.dev/property-intelligence-8238b/pi-security/pi-malware-scanner:2026-10-18-v7 --project=property-intelligence-8238b

gcloud run deploy pi-malware-scanner --image=us-west2-docker.pkg.dev/property-intelligence-8238b/pi-security/pi-malware-scanner:2026-10-18-v7 --region=us-west2 --project=property-intelligence-8238b --service-account=pi-malware-scanner@property-intelligence-8238b.iam.gserviceaccount.com --no-allow-unauthenticated --ingress=all --min-instances=0 --max-instances=1 --concurrency=1 --timeout=60s --cpu=1 --memory=2Gi --cpu-boost
gcloud run services add-iam-policy-binding pi-malware-scanner --region=us-west2 --project=property-intelligence-8238b --member=serviceAccount:firebase-adminsdk-fbsvc@property-intelligence-8238b.iam.gserviceaccount.com --role=roles/run.invoker
```

## Backend configuration

The ignored local `.env` contains only server-side configuration for:

- `PI_FIREBASE_STORAGE_BUCKET`
- `PI_MALWARE_SCANNER_URL`
- `PI_MALWARE_SCANNER_AUDIENCE`
- `PI_MALWARE_SCANNER_TIMEOUT_MS`
- `PI_MALWARE_SIGNATURE_MAX_AGE_HOURS`

`.env` remains Git-ignored. No service-account content, identity token, private object path, or scanner endpoint configuration was included in the browser bundle. The live Firebase Authentication, durable Firestore, private Storage, and scanner adapters initialized successfully under Node 22.12.0.

During live invocation verification, PI was found to truncate Google identity tokens at 500 characters. The token parser now preserves valid three-segment tokens up to 8 KiB and rejects malformed or whitespace-bearing values. A focused regression test covers this boundary.

## Mandatory CLEAN enforcement

Server-side inspection and focused tests confirmed that the current immutable version must have `scanStatus === CLEAN`, complete engine/signature metadata, and fresh signatures before:

- review-status or distribution metadata can be updated;
- the file can be downloaded;
- the document can contribute document-backed completeness;
- appendix selection can succeed; or
- the Full Investor Package can retrieve and append the bytes.

Download and report inclusion also re-read the private object and compare its SHA-256 with immutable version metadata. Appendix inclusion additionally requires `REVIEWED` or `INDEPENDENTLY_VERIFIED`, `STANDARD` confidentiality, and `APPROVED` redistribution rights. Upload always resets review to pending, redistribution to not approved, and appendix selection to false. A CLEAN result does not verify authenticity or legal reliability.

## Verification results

| Check | Result |
| --- | --- |
| Storage location and controls | PASS |
| Public/direct client Storage denial | PASS |
| Backend Storage adapter initialization | PASS |
| Scanner container startup and bounded ClamAV readiness gate | PASS |
| Scanner current signature download | PASS, from container startup logs |
| Unauthorized scanner access | PASS; no public invoker and unauthenticated endpoint access did not reach the container |
| Backend `run.routes.invoke` permission | PASS, verified using `testIamPermissions` as the backend service account |
| Google identity token validity/audience | PASS, verified without exposing the token |
| Authenticated scanner health (`POST /v1/health`) | PASS, HTTP 200 |
| Harmless synthetic CLEAN scan | PASS, CLEAN and SHA-256 matched |
| Isolated EICAR signature test | PASS, INFECTED and SHA-256 matched |
| Malware/timeout/stale-signature fail-closed fixtures | PASS |
| Metadata CLEAN forgery prevention | PASS |
| Existing Decatur integrity | PASS |

The Cloud Run service reports `Ready`, `ConfigurationsReady`, and `RoutesReady`; ingress is explicitly `all`, the default URL is enabled, the token is Google-validated with the exact audience, and the backend identity has `run.routes.invoke`. Unauthenticated `POST /v1/health` returned HTTP 403. Authenticated health and scan requests reached the current revision. No public or bypass access was introduced.

The deployed scanner now waits up to 60 seconds for `clamd` readiness before starting the Node listener and passes its explicit ClamAV configuration to every version and scan command. PI remains fail closed: scanner errors return unavailable and prevent storage, review, download, and distribution.

## Focused regression evidence

- `npm run pi:v2.5:documents:test`: **49/49 passed**.
- `npm run pi:v2.3a:auth:test`: **10/10 passed**.
- `npm run pi:v2.5:documents:qa`: **17 checks passed**, 0 live Storage uploads, 0 live Firestore writes, 0 provider calls.
- `npm run web:build`: **passed**, 84 modules transformed.
- Frontend privileged-configuration scan: **0 matches** for bucket, scanner endpoint, Admin identity, private key, or server authorization header names.

Browser/PDF QA evidence remains under `data/validation/pi-v2-5-supporting-documents/` and uses mocked storage only.

## Firestore and Decatur post-check

Post-provisioning collection-group counts remain:

- properties: 1
- property keys: 1
- evidence snapshots: 1
- scenario revisions: 1
- report revisions: 0
- supporting documents: 0
- document hashes: 0
- document audit events: 0
- document versions: 0

The accepted Decatur paths and data hashes remain unchanged:

- Property: `fcaebb62c48332953eca5fb83bf70623e446e71fa23f743646bb21f10eba4103`
- Evidence link: `0a6292b84385502e80e1a739d12aaa47a394f4446db6f4c867f447002077638e`
- Scenario revision link: `90d9329b881b5f9945d1f9291efec0489915fef1f8c2c3d11734da771603f887`

## Cost controls and estimate

- Cloud Run is request-based, min instances 0, max instances 1, so there is no intentional always-on compute charge. At current list rates, a full 60-second 1-vCPU/2-GiB request is approximately $0.00174 before request charges and free-tier credits. Authentication failures that do not reach the container are not billed as requests. See [Cloud Run pricing](https://cloud.google.com/run/pricing).
- Standard Cloud Storage in `us-west2` is approximately $0.02/GiB-month plus operations and transfer; soft-deleted objects are billable during retention. The approved document bucket is currently empty. See [Cloud Storage pricing](https://cloud.google.com/storage/pricing).
- Artifact Registry currently uses about 0.395 GiB, below the account-level 0.5-GiB free tier if that tier is otherwise unused. Above the free tier, storage is approximately $0.10/GiB-month. See [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing).
- Seven corrective Cloud Build executions were one-time operations totaling about 338 seconds of wall time. Build charges depend on account-wide monthly usage; ongoing scanner operation does not require recurring builds. See [Cloud Build pricing](https://cloud.google.com/build/pricing).
- ClamAV itself has no scanner-service subscription fee. Normal Cloud Logging and outbound signature-download usage can add small usage-based charges.

Budget alerts were not modified and are not hard spending caps.

## Controls for the separately authorized first upload

For the first separately authorized live PI document upload:

1. Limit the acceptance to one small, nonsensitive PDF and one designated test property.
2. Record the immutable SHA-256, scanner metadata, Storage object generation, Firestore paths, and exact write count.
3. Confirm the document starts `PENDING_REVIEW`, is not redistribution-approved, and is not appendix-selected.
4. Verify authenticated download only after CLEAN metadata and hash revalidation.
5. Repeat the tenant-isolation, deny-all rules, and Decatur-invariance checks.
6. Do not include the document in an investor report during the initial upload test unless separately authorized.
7. Rebuild onto ClamAV 1.4.6 or another maintained engine image before general user rollout.

These steps do not authorize a property document upload or Firestore document write.

## Rollback procedure

Rollback is destructive and was **not executed**. It requires separate approval. The safe order is:

1. Stop PI with `--supporting-documents` and remove the five V2.5 server environment variables from the local `.env`.
2. Remove the backend service account's service-level `roles/run.invoker` binding.
3. Delete Cloud Run service `pi-malware-scanner` in `us-west2`.
4. Delete Artifact Registry repository `pi-security` after confirming its images are no longer required.
5. Remove the backend service account's two bucket-scoped Storage roles.
6. Confirm the document bucket still contains zero objects, then delete `property-intelligence-8238b.firebasestorage.app`.
7. Delete the dedicated scanner service account.
8. Retain the Cloud Build staging bucket unless a separate review confirms no other build uses it; delete it only under explicit approval.
9. Disable newly enabled APIs only after dependency review confirms no other Firebase or Google Cloud workload needs them.
10. Re-read Firestore rules and Decatur hashes. Firestore data requires no rollback because this activation wrote none.

Example commands must always include `--project=property-intelligence-8238b` and the relevant `--region=us-west2`. No rollback command should be run against a computed or unverified resource name.

## Recommendation

**GO for one separately authorized, isolated live document-upload acceptance test.**

The private Storage foundation, IAM, application security gates, adapter initialization, authenticated scanner health, CLEAN scan, malware detection, and regression suite are operational and fail closed. This GO does not authorize an upload by itself and does not authorize general rollout, report inclusion, provider activity, or production deployment.

## Post-acceptance operational status — 2026-10-18

The first live document acceptance and its controlled report continuation are complete. The reviewer accepted the functional result and the documented additional preflight integrity read. The original strict-limit failure remains preserved in the acceptance audit.

Normal authenticated document uploads are now enabled for the private development startup only. Public deployment and unrestricted onboarding remain disabled. The ClamAV engine must be upgraded to the recommended patched version and the relevant security suite rerun before external beta access.

Resource estimates must list byte reads independently:

- acceptance or audit preflight integrity verification: one private object read per version inspected;
- report assembly: one private object read per included version, with SHA-256 revalidation on those retrieved bytes;
- authenticated download: one additional private object read per download.

Do not remove byte-hash validation, CLEAN-status enforcement, tenant isolation, confidentiality restrictions or redistribution approval to reduce these counts.

