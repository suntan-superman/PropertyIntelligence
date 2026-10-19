# PI V2.4.2 / V2.5 Operational Persistence and Secure Document Storage

Date: 2026-10-18 (Pacific)

## Decision summary

| Workstream | Decision | Reason |
| --- | --- | --- |
| V2.4.2 normal authenticated persistence | **GO for local operation** | The normal startup path uses Firebase Authentication plus the certified Firestore repository. Decatur and its immutable scenario/evidence links restore after a fresh login. The read-only acceptance made zero Firestore writes and zero provider calls. |
| V2.5 application implementation | **GO** | Mock Storage and scanner QA, security-negative tests, appendix PDF generation and regressions pass. |
| V2.5 live infrastructure activation | **NO-GO pending review approval** | The required bucket and scanner do not exist. No Storage rules or IAM changes have been made. The administrator email is not yet Firebase-verified. This document is the required pre-activation review. |

No Cloud Storage bucket, Cloud Run service, Artifact Registry repository, Storage IAM binding, live file, or live document metadata was created by this work.

## Implemented application changes

- `npm run pi:local` now starts authenticated Firebase sessions and Firestore durable-property persistence as one operational mode.
- Save as Property remains an explicit Administrator/Analyst action. The backend retains role and organization checks, CSRF enforcement, atomic duplicate reservations, audit fields and immutable scenario/evidence linkage.
- Per-property development authorization files are not part of durable-property saves.
- Firestore-only subjects are merged back into the server evidence graph from their exact retained cache and immutable evidence ID. My Workspace also renders a durable fallback record if a local evidence file is temporarily unavailable.
- Failed Firestore writes propagate to the UI; browser-local storage is not reported as durable success.
- V2.5 accepts only PDF, JPEG and PNG content up to 10 MiB. Extension, MIME signature, malformed/active PDF content, filename, and size validation occur before scanning.
- A private Cloud Run adapter uses an authenticated Google ID token, an exact hash header, a 60-second upper bound, and one request with no retry.
- A successful scan must return `CLEAN`, the same SHA-256, engine/version, signature version/date, and scan time. Missing, stale, unavailable, timed-out, infected or malformed results fail closed.
- Upload stores an immutable unpredictable object only after a clean scan. Firestore metadata keeps organization/property ownership, category, description, source/date, uploader, review state, confidentiality, redistribution rights, version, SHA-256 and scan provenance.
- Download, review/verification, and report inclusion each independently re-check CLEAN metadata. Download and report inclusion also re-hash the stored bytes.
- Upload never marks a legal or financial claim verified. A new version returns to pending review and not-approved-for-redistribution.
- Full Investor Packages include only explicitly selected, reviewed, non-confidential, redistribution-approved CLEAN versions. Opportunity Briefs reference documents but do not embed them.

## Authentication state

- Firebase project: `property-intelligence-8238b`.
- Initial administrator UID: `d2NTUCs0lGe6C64pDnRGtgTXm0O2`.
- The existing user remains enabled and retains `Administrator` and provider-research permissions.
- The explicit `piOrganizationId=property-intelligence-local` claim was applied idempotently. No user or organization was created.
- Existing refresh tokens were revoked once so the next sign-in obtains the explicit tenant claim.
- The initial-administrator organization fallback was removed. Missing or mismatched organization claims now fail closed.
- **Outstanding:** Firebase reports `emailVerified=false`. PI did not silently alter this security attribute. The administrator must complete Firebase email verification before V2.5 activation.

## Normal persistence acceptance

The live test was read-only and ran on Node 22.12.0 through the normal authenticated application startup.

- Address: `400 Decatur St, Bakersfield, CA 93308`
- Stable property ID: `52638a00-8167-4cff-85c0-f56a0445a5a9`
- Organization: `property-intelligence-local`
- Evidence snapshot: `3630507840c38236a84bd1c30c93adcccc52db72bc94a197343c6566c62f8e71`
- Scenario: `2908abf4-03a2-4d3c-931f-f61b5e9900c2`, revision 1
- Firebase sign-in and server session: PASS
- Saved Properties display and stable-ID recognition: PASS
- Linked analysis restoration: PASS
- Sign-out/sign-in restoration: PASS
- Firestore writes: **0**
- Provider requests: **0**
- Firestore document paths, hashes and timestamps before/after: identical
- Duplicate durable record created: no

Deployed Firestore client rules were re-read through the Firebase Rules API and remain deny-all (`allow read, write: if false`). Ruleset content SHA-256: `ecf30f940747dcc3c5ba4993093e9a11ac9fc5df7e14b2a1512d2446923d84eb`.

## Current cloud state (read-only verification)

- Billing is enabled. Billing account identifiers were not displayed or recorded.
- `(default)` Firestore is operational in `us-west2`, native mode.
- Cloud Storage buckets in the project: **0**.
- Cloud Run services in `us-west2`: **0**.
- Firestore delete protection is currently disabled; this work did not change it.
- The existing Admin SDK service account currently has Firebase SDK Admin Service Agent, Firebase Authentication Admin and Service Account Token Creator bindings. V2.5 would add only bucket-scoped object access and scanner invocation.

## Proposed V2.5 architecture

```text
authenticated browser
  -> PI backend (session + CSRF + role + organization + property ownership)
     -> validate type/signature/size and calculate SHA-256
     -> private IAM-authenticated Cloud Run ClamAV /v1/scan (raw bytes, one attempt)
        -> CLEAN + matching hash + fresh signature provenance
     -> private Firebase Storage immutable object
     -> Firestore metadata/version/hash reservation/audit event

download / review / verification / Full Package
  -> repeat ownership and role checks
  -> independently require CLEAN metadata
  -> download/report path re-hashes object bytes
```

The scanner receives bytes synchronously and has no Storage or Firestore role. Its Cloud Run URL is reachable only with `roles/run.invoker`; it is not unauthenticated. Storage client rules deny every browser read/write. The backend service account alone gets bucket-scoped access.

## Exact proposed activation commands — do not run until approved

Run from the repository root in PowerShell after `gcloud auth login`, with an operator allowed to provision Firebase Storage, Cloud Run, Artifact Registry and IAM.

```powershell
$project = 'property-intelligence-8238b'
$region = 'us-west2'
$bucket = 'property-intelligence-8238b.firebasestorage.app'
$service = 'pi-malware-scanner'
$repository = 'pi-security'
$scannerAccountId = 'pi-malware-scanner'
$scannerSa = "$scannerAccountId@$project.iam.gserviceaccount.com"
$credentialPath = (Get-Content .env | Where-Object { $_ -match '^GOOGLE_APPLICATION_CREDENTIALS=' } | Select-Object -First 1).Split('=',2)[1].Trim()
$backendSa = (Get-Content -LiteralPath $credentialPath -Raw | ConvertFrom-Json).client_email

gcloud config set project $project
gcloud services enable firebasestorage.googleapis.com storage.googleapis.com run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Provision the Firebase-linked default bucket in us-west2.
$token = gcloud auth print-access-token
$headers = @{ Authorization = "Bearer $token"; 'x-goog-user-project' = $project }
Invoke-RestMethod -Method Post `
  -Uri "https://firebasestorage.googleapis.com/v1alpha/projects/$project/defaultBucket" `
  -Headers $headers -ContentType 'application/json' `
  -Body '{"location":"us-west2"}'

gcloud storage buckets update "gs://$bucket" --uniform-bucket-level-access --public-access-prevention

# Deny all Firebase client SDK access before application access is enabled.
firebase deploy --only storage --project $project --config config/firebase.storage.json

# Limit object access to the existing PI backend identity and permit bucket metadata validation.
gcloud storage buckets add-iam-policy-binding "gs://$bucket" --member="serviceAccount:$backendSa" --role='roles/storage.objectAdmin'
gcloud storage buckets add-iam-policy-binding "gs://$bucket" --member="serviceAccount:$backendSa" --role='roles/storage.legacyBucketReader'

# Build and deploy an IAM-private, scale-to-zero scanner.
gcloud iam service-accounts create $scannerAccountId --display-name='PI private malware scanner'
gcloud artifacts repositories create $repository --repository-format=docker --location=$region --description='PI security service images'
$image = "$region-docker.pkg.dev/$project/$repository/$service:2026-10-18-v1"
gcloud builds submit services/pi-malware-scanner --tag $image --project=$project
gcloud run deploy $service --image=$image --project=$project --region=$region `
  --service-account=$scannerSa --no-allow-unauthenticated --ingress=all `
  --cpu=1 --memory=2Gi --concurrency=1 --timeout=60s --min=0 --max=2 --cpu-boost

gcloud run services add-iam-policy-binding $service --project=$project --region=$region `
  --member="serviceAccount:$backendSa" --role='roles/run.invoker'

$scannerUrl = gcloud run services describe $service --project=$project --region=$region --format='value(status.url)'
```

After verifying the bucket metadata and an authenticated `/healthz`, add these backend-only settings to `.env`; do not commit the file:

```dotenv
PI_FIREBASE_STORAGE_BUCKET=property-intelligence-8238b.firebasestorage.app
PI_MALWARE_SCANNER_URL=<scannerUrl>
PI_MALWARE_SCANNER_AUDIENCE=<same scannerUrl>
PI_MALWARE_SCANNER_TIMEOUT_MS=60000
PI_MALWARE_SIGNATURE_MAX_AGE_HOURS=24
```

Then start the document-enabled local process only for the separately approved acceptance:

```powershell
$env:Path = 'C:\Users\sjroy\AppData\Local\nvm\v22.12.0;' + $env:Path
npm run pi:local:documents
```

## Controlled first-live acceptance proposal

This test is not authorized or executed yet.

1. Verify the administrator email first and sign in again to refresh claims.
2. Create or explicitly approve one dedicated durable QA property; do not use or alter Decatur, Haven, existing scenarios, or reports.
3. Record a before-manifest of all PI Firestore document paths/hashes and Storage object generations.
4. Upload one small, nonsensitive, one-page PDF under 100 KiB.
5. Confirm exactly one scan request, CLEAN provenance, one immutable Storage generation, one document record, one version record, one hash reservation and audit entries.
6. Download through PI and verify the SHA-256. Direct client SDK download must remain denied.
7. Mark the document reviewed and redistribution-approved, select it, and create one QA Full Package. Confirm index, appended page, source identity and legibility. Confirm Opportunity Brief references it without embedding.
8. Attempt cross-organization access, unscanned/tampered status, confidential inclusion and duplicate upload; all must fail without additional stored objects.
9. Compare the before/after manifest. Only the approved QA property/document/report paths may differ.
10. Stop for review; do not delete test evidence without separate destructive-cleanup approval.

## Cost estimate

Current public list pricing was checked on 2026-10-18. Actual billed amounts vary by usage and billing-account free-tier consumption.

- Cloud Storage Standard in `us-west2`: about **$0.022/GiB-month** (`$0.000030137/GiB-hour`), plus roughly `$0.005/1,000` Class A and `$0.0004/1,000` Class B operations. Ten GiB retained is about **$0.22/month**, before operations and any soft-deleted copies.
- Cloud Run scanner, request-based, min instances 0: likely **$0/month at low acceptance volume** if the billing account's free tier is available. Beyond free tier, 1 vCPU + 2 GiB for 30 seconds is approximately **$0.00066 per scan** for CPU and memory; 1,000 such scans are about **$0.66**, excluding cold-start/signature-update time.
- ClamAV software and signatures: **no license or recurring scanning-service fee**. Cold starts download signature updates and can add latency.
- Artifact Registry/Cloud Build: generally pennies or free at this scale; image storage/build minutes are separately metered and may exceed their free tiers.
- Firestore document metadata/audits continue under normal Firestore read/write/storage pricing and should be negligible for the proposed single-file acceptance.

Official references:

- Firebase default bucket and Blaze requirements: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Firebase default bucket create API: https://firebase.google.com/docs/reference/rest/storage/rest/v1alpha/projects.defaultBucket/create
- Cloud Run authenticated service-to-service access: https://cloud.google.com/run/docs/authenticating/service-to-service
- Cloud Run pricing: https://cloud.google.com/run/pricing
- Cloud Storage pricing: https://cloud.google.com/storage/pricing

## Rollback

Operational rollback is non-destructive:

1. Stop the document-enabled process and restart with `npm run pi:local`; no document routes receive a Storage service.
2. Remove the five `PI_FIREBASE_STORAGE_BUCKET` / `PI_MALWARE_*` settings from the private runtime environment.
3. Revoke scanner invocation and bucket access:

```powershell
gcloud run services remove-iam-policy-binding $service --project=$project --region=$region --member="serviceAccount:$backendSa" --role='roles/run.invoker'
gcloud storage buckets remove-iam-policy-binding "gs://$bucket" --member="serviceAccount:$backendSa" --role='roles/storage.objectAdmin'
gcloud storage buckets remove-iam-policy-binding "gs://$bucket" --member="serviceAccount:$backendSa" --role='roles/storage.legacyBucketReader'
```

4. Leave the Storage deny-all rules and public-access prevention in place.
5. Retain the private service, bucket, objects, Firestore metadata and audit records for investigation. Deleting the service, image, bucket or document metadata is a separate destructive action requiring explicit approval.

V2.4.2 rollback is simply to omit `--operational-persistence` (or revert the local startup command). That makes durable writes unavailable and does not delete or rewrite Decatur.

## QA evidence

- Auth tests: 8/8 PASS.
- Unified save/durable/financial/report tests: 51/51 PASS.
- Supporting-document suite: 48/48 PASS.
- V2.5 browser/PDF QA: 17 checks PASS.
- Certified financial, Monte Carlo and investor-report regression suite: 149/149 PASS.
- Web production build: PASS.
- Production dependency audit: 0 known vulnerabilities after forcing patched `@grpc/grpc-js` 1.14.6.
- Live Storage uploads: 0.
- Live V2.5 Firestore writes: 0.
- Provider calls: 0.
- The ClamAV container image was not built locally because Docker is not installed on this workstation. The proposed Cloud Build is intentionally deferred with the rest of live infrastructure activation; the scanner protocol, authentication adapter, timeout/no-retry behavior and fail-closed outcomes were tested locally.

Artifacts:

- `data/validation/pi-v2-4-2-operational-persistence/qa-results.json`
- `data/validation/pi-v2-4-2-operational-persistence/01-live-authenticated-saved-property.png`
- `data/validation/pi-v2-4-2-operational-persistence/02-live-linked-analysis.png`
- `data/validation/pi-v2-4-2-operational-persistence/03-live-cross-session-restoration.png`
- `data/validation/pi-v2-5-supporting-documents/qa-results.json`
- `data/validation/pi-v2-5-supporting-documents/02-reviewed-appendix-selection.png`
- `data/validation/pi-v2-5-supporting-documents/pdf-appendix-index.png`
- `data/validation/pi-v2-5-supporting-documents/pdf-appendix-source.png`
- `data/validation/pi-v2-5-supporting-documents/full-investor-package-with-appendix.pdf`

