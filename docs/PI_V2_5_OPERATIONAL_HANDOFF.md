# PI V2.5 Operational Handoff

Date: 2026-10-18  
Environment: private local development  
Classification: **FUNCTIONAL ACCEPTANCE PASSED — RESOURCE DEVIATION REVIEWED AND ACCEPTED**

## Enabled scope

`npm run pi:local` now starts Property Intelligence with Firebase Authentication, organization-scoped Firestore persistence and private supporting-document uploads enabled. `npm run pi:local:documents` remains an equivalent explicit command. `npm run pi:local:no-documents` is the non-destructive local rollback command.

The investment workspace remains local-development only and rejects `--built`. No public deployment, public Storage access or unrestricted user onboarding is enabled.

## Required local configuration

The ignored `.env` must retain these server-side settings:

- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_PROJECT_ID`
- `PI_FIREBASE_ORGANIZATION_ID`
- `PI_FIREBASE_STORAGE_BUCKET`
- `PI_MALWARE_SCANNER_URL`
- `PI_MALWARE_SCANNER_AUDIENCE`
- `PI_MALWARE_SCANNER_TIMEOUT_MS`
- `PI_MALWARE_SIGNATURE_MAX_AGE_HOURS`

Do not expose their values in browser configuration or commit `.env` or service-account credentials.

## Preserved controls

- authenticated server-side property and organization authorization;
- PDF/JPEG/PNG allowlist, content inspection, 10 MiB limit and PDF/image bounds;
- fail-closed authenticated malware scanning with bounded timeout and zero retries;
- fresh CLEAN metadata required before review, download or report inclusion;
- immutable versions and organization-wide SHA-256 duplicate protection;
- stored-byte SHA-256 revalidation on download and report assembly;
- confidentiality and redistribution approval before appendix inclusion;
- private Storage, deny-all Firebase client rules and no unrestricted URLs;
- audit events for upload, review, download and report inclusion.

## Resource accounting

Estimate each category separately:

| Operation | Private object reads |
| --- | ---: |
| Acceptance/audit byte-level integrity preflight | 1 per inspected version |
| Report assembly | 1 per included version |
| Authenticated download | 1 per downloaded version |

Report assembly re-hashes the bytes it retrieves. A separate acceptance preflight therefore adds a distinct read; it must not be hidden inside the report estimate.

## Acceptance history

The original strict-limit audit remains at `data/validation/pi-v2-5-live-document-acceptance/continuation/continuation-results.json`. Its one-read overage is not rewritten. The later reviewer disposition is recorded separately at `data/validation/pi-v2-5-live-document-acceptance/continuation-review-disposition.json`.

No Decatur property, evidence, scenario or report history was migrated, deleted or rewritten while enabling routine private-development startup.

## ClamAV maintenance status

ClamAV was upgraded from 1.4.3 to the supported 1.4.6 LTS maintenance release on Cloud Run revision `pi-malware-scanner-00013-jop`. The authenticated health, unauthenticated denial, CLEAN, EICAR, SHA-256, failure-path, stale-signature and data-invariance checks passed. See [PI V2.5 ClamAV 1.4.6 Upgrade Report](PI_V2_5_CLAMAV_1_4_6_UPGRADE_REPORT.md).

## Before external beta

1. ClamAV 1.4.6 maintenance upgrade — complete.
2. Clean, infected, malformed, stale-signature, scanner-unavailable and timeout checks — complete.
3. Tenant isolation, unauthorized access, stored-byte hash mismatch and appendix eligibility checks — complete.
4. Reconfirm deny-all Firestore and Storage client rules immediately before beta activation.
5. Obtain separate approval for external beta or any deployment.

Until those steps pass, external beta access is **NO-GO**.
