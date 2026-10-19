# PI V2.4/V2.5 Infrastructure Readiness Verification

Verification date: 2026-10-18 (Pacific)  
Method: read-only Firebase, Google Cloud, repository and live-data checks  
No infrastructure, rules, IAM, authentication claims, Firestore records or Storage objects were changed.

## Decision

- **V2.4: GO for one isolated live acceptance test after switching the test process to Node 22.12.0.** This is not approval for general live persistence.
- **V2.5: NO-GO.** Billing is ready, but Storage is not provisioned and the malware scanner, runtime wiring and downstream clean-scan enforcement remain incomplete.

## Verified current state

| Control | Result |
| --- | --- |
| Project | `property-intelligence-8238b`, active |
| Billing / Blaze | Billing enabled, a billing account is linked and open. Account identity intentionally withheld. Linking billing satisfies the Blaze prerequisite for Cloud Storage for Firebase. |
| Firestore | `(default)` exists, Native mode, operational, `us-west2`, pessimistic concurrency |
| Firestore contents | Empty: zero root collections and zero durable properties |
| Firestore rules | Live rules read back through the project-bound Admin SDK identity and deny every client read and write |
| Firestore recovery | Delete protection disabled; PITR disabled; one-hour version retention |
| Admin SDK credential | External credential file is valid and belongs to `property-intelligence-8238b`; expected token project matches |
| Administrator | UID exists, enabled, `Administrator` role, provider-research claim present |
| Administrator cautions | Firebase email is not marked verified. The explicit organization claim is absent, so the initial-administrator fallback resolves to the server's expected organization. This works for V2.4/V2.5, but should be made explicit before multi-user use. |
| Durable backend | Live Firestore adapter initialized and completed an organization-scoped list operation; zero writes performed |
| Node runtime | Repository requires Node `>=22.12.0`. Node 22.12.0 is installed and V2.4 (46/46) plus authentication (8/8) tests pass under it. The machine's currently selected Node remains 20.19.4. |
| Cloud Storage | No buckets. Generic Storage APIs are enabled; `firebasestorage.googleapis.com` is not enabled. No Storage rules release exists. |

The proposed rules remain appropriate because the browser must never access Firestore or Storage directly:

```text
Cloud Firestore: allow read, write: if false
Cloud Storage:   allow read, write: if false
```

Firebase Admin bypasses these client rules and is instead constrained by server authentication, organization/role checks and Google Cloud IAM.

## V2.4 isolated acceptance

The database is empty, the live adapter can read it, transactional duplicate protection is implemented, and the required regression suites pass on Node 22.12. V2.4 is therefore ready for exactly one separately approved write test.

Use the initial administrator fallback to isolate that test under a temporary organization without changing Firebase claims:

```powershell
Set-Location -LiteralPath 'C:\Users\sjroy\Source\PropertyIntelligence'
nvm use 22.12.0
$env:PI_FIREBASE_ORGANIZATION_ID='pi-live-acceptance-20261018'
npm run web:dev -- --investment --firebase-auth --firestore-properties
```

Acceptance sequence after explicit write approval:

1. Capture live Firestore collection/property counts; expected baseline is zero.
2. Sign in with the existing administrator.
3. Open one retained, provider-free fixture and use **Save as Property** without a scenario ID.
4. Confirm one organization, one property, its transactional address key and one immutable evidence reference exist only under `pi-live-acceptance-20261018`.
5. Sign out/in and confirm restoration.
6. Repeat Save as Property and confirm duplicate rejection, not a second record.
7. Confirm zero scenario revisions, zero report revisions and zero provider calls.
8. Archive the fixture; retain it for review. Permanent deletion requires separate approval.

This cannot alter an existing live property or scenario revision because the database is currently empty, the test organization is unique, and promotion omits the scenario argument.

V2.4 rollback:

```powershell
# Stop the server with Ctrl+C, then clear only the process-scoped test setting.
Remove-Item Env:PI_FIREBASE_ORGANIZATION_ID -ErrorAction SilentlyContinue
```

Do not run with `--firestore-properties` afterward. Keep deny-all client rules deployed. Leave the isolated record archived until cleanup is separately approved.

## V2.5 blockers and required remediation

V2.5 cannot be activated yet because:

1. The default Firebase Storage bucket does not exist.
2. Firebase Storage API and Storage rules release do not exist.
3. No production malware scanner or authenticated scanner adapter exists.
4. `scripts/workbench-server.js` does not initialize/inject supporting documents.
5. Upload scans fail closed before storage, but `update()`, `download()` and `reportDocuments()` do not independently require the current immutable version to be `CLEAN`.

Before activation, use one shared server guard requiring:

```text
current immutable version exists
scanStatus == CLEAN
scanEngine and scannedAt are present
stored bytes match the immutable SHA-256
```

Apply it before download, Reviewed/Independently Verified status, redistribution approval and report inclusion. Add repository-seeded negative tests for missing, `PENDING`, `ERROR`, `INFECTED`, stale and hash-mismatched scan records.

## Storage and scanner design

Required default Firebase bucket:

```text
property-intelligence-8238b.firebasestorage.app
```

Configuration: `us-west2`, Standard class, Uniform Bucket-Level Access enabled, Public Access Prevention enforced, no public ACLs/download tokens, no browser access, and deny-all Firebase Storage rules.

Simplest compatible production scanner: private authenticated Cloud Run service `pi-malware-scanner` in `us-west2`, running ClamAV. PI sends the already validated, in-memory file before any Storage write; the scanner returns clean/infected/error. Use one vCPU, 2 GiB RAM, concurrency 1, minimum instances 0, maximum 2, 60-second timeout, no retries and fail-closed responses. Maintain signatures with a daily private updater/mirror; do not fetch the public ClamAV database on every cold start.

## Prepared V2.5 activation commands — do not run yet

These commands intentionally remain unexecuted until remediation and a separate activation approval.

```powershell
$Project='property-intelligence-8238b'
$Region='us-west2'
$Bucket='property-intelligence-8238b.firebasestorage.app'

# Enable only the APIs required by the approved design.
gcloud services enable firebasestorage.googleapis.com run.googleapis.com `
  artifactregistry.googleapis.com cloudbuild.googleapis.com `
  cloudscheduler.googleapis.com --project=$Project

# Provision the Firebase default bucket in the immutable selected location.
$Token=gcloud auth print-access-token
$Headers=@{Authorization="Bearer $Token";'Content-Type'='application/json'}
Invoke-RestMethod -Method Post `
  -Uri "https://firebasestorage.googleapis.com/v1alpha/projects/$Project/defaultBucket" `
  -Headers $Headers -Body '{"location":"us-west2"}'

# Enforce bucket-level access controls.
gcloud storage buckets update "gs://$Bucket" `
  --uniform-bucket-level-access --public-access-prevention

# After firebase.json is reviewed and points only to the two proposed rules files:
firebase deploy --only firestore:rules,storage --project $Project

# Deploy the reviewed, pinned scanner image (image must exist before this command).
$ScannerImage="us-west2-docker.pkg.dev/$Project/pi-security/pi-malware-scanner@sha256:<APPROVED_DIGEST>"
gcloud run deploy pi-malware-scanner --project=$Project --region=$Region `
  --image=$ScannerImage --no-allow-unauthenticated --cpu=1 --memory=2Gi `
  --concurrency=1 --min-instances=0 --max-instances=2 --timeout=60s `
  --service-account="pi-malware-scanner@$Project.iam.gserviceaccount.com"

# Grant invocation only to the existing PI runtime identity without displaying it.
$CredentialPath=((Get-Content -LiteralPath '.env' | Where-Object {
  $_ -match '^GOOGLE_APPLICATION_CREDENTIALS='
} | Select-Object -Last 1) -split '=',2)[1].Trim().Trim('"')
$PiRuntime=(Get-Content -LiteralPath $CredentialPath -Raw | ConvertFrom-Json).client_email
gcloud run services add-iam-policy-binding pi-malware-scanner `
  --project=$Project --region=$Region `
  --member="serviceAccount:$PiRuntime" --role='roles/run.invoker'
```

Required environment after scanner integration:

```text
PI_FIREBASE_ORGANIZATION_ID=<explicit organization>
PI_FIREBASE_STORAGE_BUCKET=property-intelligence-8238b.firebasestorage.app
PI_MALWARE_SCANNER_URL=<private Cloud Run URL>
PI_MALWARE_SCANNER_AUDIENCE=<same URL or reviewed custom audience>
PI_MALWARE_SCANNER_TIMEOUT_MS=60000
PI_MALWARE_SIGNATURE_MAX_AGE_HOURS=24
```

The later startup command should be:

```powershell
nvm use 22.12.0
npm run web:dev -- --investment --firebase-auth --firestore-properties `
  --supporting-documents
```

The `--supporting-documents` flag does not exist yet and must be implemented and locally certified before that command is valid.

## V2.5 controlled acceptance after remediation

1. Use organization `pi-activation-test-20261018` and one test-only durable property with no scenario link.
2. Upload one generated, nonsensitive PDF under 100 KB containing only “Property Intelligence V2.5 storage acceptance — no PII.”
3. Confirm version 1, SHA-256, current ClamAV result, private/no-store metadata and one audit event.
4. Before review, prove redistribution, verified status and appendix inclusion are denied.
5. Prove unauthenticated, Viewer, cross-organization and direct-object requests fail.
6. Download through PI and verify the exact SHA-256.
7. Mark Reviewed—not Independently Verified—approve redistribution and select it.
8. Verify report selection includes exactly that version and provenance.
9. Confirm other organization counts/hashes, all saved scenarios and provider usage remain unchanged.
10. Archive and retain the test property for review; do not delete without cleanup approval.

## Cost estimate

- Blaze has no fixed subscription fee; usage billing is now active.
- `us-west2` Standard Storage is approximately $0.02/GiB-month, plus approximately $0.005/1,000 Class A and $0.0004/1,000 Class B operations.
- The V2.4 write test and V2.5 single-file acceptance should remain under $0.01 combined.
- Low-volume V2.5 with Cloud Run scale-to-zero should normally remain within free allowances; budget approximately $0–$1/month.
- One Cloud Scheduler signature-update job is free if the billing account's three-job allowance is available; otherwise $0.10/job/31 days.
- Artifact Registry storage over the billing account's first 0.5 GiB is approximately $0.10/GiB-month.
- Do not set a warm Cloud Run minimum instance for initial activation; idle scanner cost would be materially higher.

Set $5 and $10 billing alerts before V2.5 activation.

## V2.5 rollback

1. Stop PI and remove `--supporting-documents`; keep `--firestore-properties` only if V2.4 acceptance remains approved.
2. Remove scanner/bucket variables from the runtime environment.
3. Revoke the scanner service-level `roles/run.invoker` binding and restore the captured IAM policy.
4. Set scanner traffic to zero and pause the signature-update schedule.
5. Keep deny-all client rules in place.
6. Do not delete the default bucket or unlink billing while retained objects exist.
7. Verify baseline property/scenario/report hashes are unchanged.
8. Leave test records archived until separately approved cleanup.

## Authoritative references

- [Firebase Storage billing and default bucket requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- [Firebase default-bucket create API](https://firebase.google.com/docs/reference/rest/storage/rest/v1alpha/projects.defaultBucket/create)
- [Firebase Rules deployment](https://firebase.google.com/docs/rules/manage-deploy)
- [Google Cloud malware-scanning architecture](https://docs.cloud.google.com/architecture/automate-malware-scanning-for-documents-uploaded-to-cloud-storage)
- [Authenticated Cloud Run service calls](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)
- [Cloud Storage pricing](https://cloud.google.com/storage/pricing)
- [Firestore pricing](https://cloud.google.com/firestore/pricing)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
