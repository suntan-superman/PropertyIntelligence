# PI V2.5 ClamAV 1.4.6 Security Maintenance Upgrade

Execution date: 2026-10-18 Pacific / 2026-10-19 UTC  
Project: `property-intelligence-8238b`  
Region: `us-west2`  
Service: `pi-malware-scanner`  
Disposition: **PASS — deployed and verified; stop for Stan/ChatGPT review.**

## Release selection

ClamAV 1.4.6 is the current maintenance patch for the supported 1.4 LTS line. The 1.4 LTS line is supported through August 15, 2027. PI remained on the LTS feature line to minimize compatibility change while receiving the 1.4.6 security fixes.

Official references:

- <https://docs.clamav.net/faq/faq-eol.html>
- <https://github.com/Cisco-Talos/clamav/releases/tag/clamav-1.4.6>
- <https://docs.clamav.net/manual/Installing/Docker.html>

## Deployment

| Field | Value |
| --- | --- |
| Previous revision | `pi-malware-scanner-00010-nf7` |
| New revision | `pi-malware-scanner-00013-jop` |
| Traffic | 100% new revision |
| ClamAV | `1.4.6` |
| Node | `22.12.0` |
| Image tag | `2026-10-18-clamav-1-4-6` |
| Image digest | `sha256:a0de0132a1bb2b868350a00fff603f64bca67ae2f734b7af53892cd2a85e2d97` |
| Image size | 345,739,564 bytes |
| Cloud Build ID | `8d10e162-e52b-4ae7-940a-7261f1715d38` |
| Build duration | 63 seconds |

The container now derives from ClamAV's official versioned `1.4.6-debian13-slim` image. The build fails unless the runtime reports exactly ClamAV 1.4.6 and Node 22.12.0. The existing `/v1/health` and `/v1/scan` protocol, headers and JSON response schema are unchanged.

The new revision was first deployed with zero traffic and a candidate tag. Candidate tests passed before traffic moved. The prior revision remains available as the rollback target.

## Preserved runtime controls

| Control | Verified state |
| --- | --- |
| Cloud Run authentication | Required |
| Public invoker | Absent |
| Authorized invoker | Existing Firebase Admin backend service account only |
| Runtime identity | Existing dedicated scanner service account |
| Minimum instances | 0 — scale to zero |
| Maximum instances | 1 |
| Container concurrency | 1 |
| Request timeout | 60 seconds |
| CPU / memory | 1 vCPU / 2 GiB |
| Automatic scanner retries | None |

## Signature maintenance

Startup logs show FreshClam detected local daily database 28150, downloaded 28157, tested the database successfully and installed it. Main and bytecode databases were current. Authenticated health returned:

- signature version: `28157`;
- signature timestamp: `2026-10-18T06:24:14.000Z`;
- age during verification: approximately 21.1 hours.

The existing 24-hour freshness gate remains in the PI backend. Stale or incomplete scan metadata, scanner unavailability and scanner timeout continue to fail closed in the regression suite.

## Live scanner verification

The zero-traffic candidate and the production service URL both passed:

| Test | Result |
| --- | --- |
| Authenticated health | HTTP 200 / ready / ClamAV 1.4.6 |
| Unauthenticated health | HTTP 403 |
| Harmless synthetic bytes | `CLEAN` |
| Harmless SHA-256 | `eaf0fd2f6582d24e0d419c748a6cd5d3d5deb63a1cefbf3c1577962799f85cea` |
| EICAR fixture | `INFECTED` |
| EICAR SHA-256 | `275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f` |
| Deliberately incorrect SHA-256 | HTTP 422 `SCANNER_HASH_MISMATCH` |
| Failure returned CLEAN | No |

The first candidate probe used the tagged URL as its identity-token audience and was rejected by Cloud Run before reaching the container. The verifier was corrected to use the service audience while targeting the tagged revision; there was no traffic shift, scan or weakened control from that rejected probe.

## Regression and data invariance

- `npm run pi:v2.5:documents:test`: **51/51 passed**.
- CLEAN, infected, malformed, stale-signature, unavailable-scanner, timeout, stored-byte mismatch, tenant isolation and appendix eligibility checks passed.
- Existing Decatur property count: 1.
- Existing supporting document/version count: 1/1.
- Existing investor report revisions: 1.
- Existing document audit events: 4.
- Existing private Storage objects: 1.
- Evidence and scenario hashes match the accepted V2.5 baseline.
- Existing property identity, stored document and report history are unchanged.
- New property-document uploads: 0.
- Firestore writes: 0.
- Storage object writes: 0.
- Provider requests: 0.
- Financial calculation changes: 0.

## Cost change

- The one-time Cloud Build used 63 seconds. At the published default-pool rate of $0.006/minute, this is approximately $0.0063 before the monthly free build allowance.
- Artifact Registry now contains approximately 0.699 GiB of scanner artifacts. With the first 0.5 GiB-month free and storage above that approximately $0.10/GiB-month, the present incremental billed storage is approximately $0.02/month if the billing-account free tier is otherwise available.
- Cloud Run remains request-based with minimum instances zero, so there is no intentional always-on scanner compute charge. Normal scans retain the existing usage-based compute, logging and signature-download costs.

Official pricing references:

- <https://cloud.google.com/build/pricing>
- <https://cloud.google.com/artifact-registry/pricing>
- <https://cloud.google.com/run/pricing>

The old revision and image are retained for rollback, so no destructive artifact cleanup was performed.

## Rollback

Rollback was not required. If a later operational issue is confirmed, restore the verified prior revision without changing IAM or security controls:

```powershell
gcloud run services update-traffic pi-malware-scanner `
  --project=property-intelligence-8238b `
  --region=us-west2 `
  --to-revisions=pi-malware-scanner-00010-nf7=100
```

After rollback, repeat authenticated health, unauthenticated denial, CLEAN, EICAR and SHA-256 checks. Do not delete the 1.4.6 revision until the incident is reviewed.

## Recommendation

**GO for continued private-development authenticated document uploads using ClamAV 1.4.6.**

No public deployment or external beta access is authorized by this maintenance change. Stop for Stan/ChatGPT review.
