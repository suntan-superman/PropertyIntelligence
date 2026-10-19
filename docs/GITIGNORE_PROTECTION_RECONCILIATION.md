# `.gitignore` Protection Reconciliation

**Classification: `LEGITIMATE CURRENT BASELINE`**

## Finding

The current `.gitignore` SHA-256 is `9eb820a21ccd85c510613a6194ed26caed429828e884fed6f444b338ad86ecc4`. The prior protected-baseline SHA-256 is `b85b13dc23d8ad5b4fb6c9038801047ce4edc46318a562c6c9dd35fdcbb4a7de`. The current file differs only by added protections; no existing ignore rule was removed or weakened.

The tracked `.gitignore` already protects RentCast/raw data, Kern Assessor ZIP input, ATTOM capability POC raw responses (`data/validation/attom-poc/raw/`), First American/DataTree UAT raw responses (`data/validation/datatree-uat/raw/`), and licensed ATTOM bulk samples (`data/validation/attom-bulk-poc/raw/`). Those provider/data protections are present in the tracked `bee4898` baseline and were not introduced by the current uncommitted changes.

## Added lines and purpose

| Added rule/comment | Purpose and assessment |
|---|---|
| `# Local environment credentials; keep only the blank example template trackable.` | Documents the credential-protection intent. |
| `**/.env`, `**/.env.*`, `!**/.env.example`, `*.env`, `!*.env.example`, `.envrc`, `**/.envrc` | Prevents nested/local environment files from being committed while allowing example templates. Legitimate secret protection. |
| `# Common local credential stores and private-key material.` | Documents the credential-protection intent. |
| `**/secrets/`, `**/credentials/`, `credentials.json`, `client_secret*.json`, `service-account*.json`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore`, `.netrc`, `.git-credentials`, `.npmrc`, `.aws/`, `.ssh/` | Excludes common local credential stores, service-account/client-secret files, and private-key material. Legitimate secret protection. These are ignore rules, not evidence that any such secret was committed. |
| `# Synthetic investor report PDF QA output; regenerate locally, do not commit artifacts.` | Documents generated local QA artifacts. |
| `data/validation/investor-report-v1/` | Excludes generated investor-report PDF/preview QA outputs. These are reproducible validation artifacts, not application source. |

The additions align with the prior request to review `.gitignore` for secret exposure and with local PDF QA generation. No unrelated application or data-path exclusions were found in the diff. The ignored directories for ATTOM, DataTree, and licensed bulk files remain intact.

## Protected-baseline references

Two checked-in protection baselines still pin the earlier `.gitignore` bytes:

1. `data/runtime/sprint6_3/baseline.json`, asserted by `scripts/sprint6_3/schema-review.test.js` in “protected pre-work baseline unchanged except four explicitly scoped integration files”.
2. `data/runtime/sprint6_2-kern-assessor/repository-baseline.json`, asserted by `scripts/sprint6_2/poc.test.js` in “all protected files including pre-existing dirty PDFs remain byte-identical”. That manifest protects 567 entries; only its `.gitignore` entry needs reconciliation.

The exact proposed baseline change is to replace the `.gitignore` entry's old SHA-256 (`b85b13dc23d8ad5b4fb6c9038801047ce4edc46318a562c6c9dd35fdcbb4a7de`) with the current SHA-256 (`9eb820a21ccd85c510613a6194ed26caed429828e884fed6f444b338ad86ecc4`) in each manifest. All other paths, expected hashes, file counts, and protection assertions remain unchanged. No baseline file in the main workspace was changed for this reconciliation; the proposed two-entry update and affected tests are validated only in the isolated certification copy, pending Stan's authorization to update the tracked baselines.

## Isolated protection-test result

The two `.gitignore` hash entries were changed in the isolated copy only. The complete 20-file test suite still reports two failures in the historical protection tests: the Sprint 6.2 manifest assertion next encounters a changed `apps/web/src/app/App.jsx`; the Sprint 6.3 baseline assertion encounters `apps/web/src/services/api.js`. A direct manifest comparison found 40 mismatched entries in the 567-file Sprint 6.2 snapshot and 36 mismatches in the Sprint 6.3 snapshot after its four pre-existing allowlisted paths are excluded. Those include later authorized application revisions and regenerated QA artifacts. No further baseline hashes or exceptions were changed because doing so would exceed the narrowly authorized `.gitignore` reconciliation and require reviewing those entries individually. Therefore the `.gitignore` classification is legitimate, but the affected protection tests do **not** yet pass under the exact `.gitignore`-only proposal; the broader historical-baseline reconciliation remains a certification blocker.
