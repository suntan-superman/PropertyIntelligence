# PI Monte Carlo Investor Report — Frozen package specification

2026-10-09. Package version: `pi-synthetic-investor-package-v1`. Scope: **LOCAL_SYNTHETIC_ONLY**.

## Reused trust and snapshot conventions

The package uses existing canonical-object JSON fingerprinting, deeply frozen normalized report models and explicit immutable-write guards. It does not reuse the Round 1 six-property execution manifest as an authorization source or change any Round 1 flags. These are standalone synthetic demonstrations, not selected property packages.

The reviewed Monte Carlo certificate is pinned in `analysisTrust.js`:

- Model `pi-monte-carlo-v1`; economics `pi-flip-cents-v1`; generator `sha256-mulberry32-v1`.
- Runtime `v22.12.0`.
- Certificate SHA-256: `cdf3f589dccab37daf193677603ff50d23c87a7993375e211c5bd6b09c646300`.
- Certified source bundle: `94682d485c61b3027cd5c06216886c0954e9d6c08be9edc47be0ce8201c55661`.
- Exact A/B/C result hashes are allowlisted. Different inputs or additional source content require separate review; recomputing a checksum does not grant permission.

The package builder/verifier reads the pinned certificate and recomputes its nine source-file hashes. It requires the source bundle and actual runtime to match. Report sources have a separate bundle, covering seven report modules plus unchanged package/lockfile bytes:

`197d0c2f79d6b63c92b54dccfc1afbcaaeb703ffa0047ba30316e02384eaa223`

That report bundle identifies the final certified adapter/layout/renderer/package implementation, not the Monte Carlo model. Runtime evidence records installed Puppeteer 25.12.0 and actual launched Chrome/154.0.8037.57.

## Directory and contents

Packages are written beneath the existing gitignored directory:

`data/validation/investor-report-v1/mc-integration/<unique-run>/packages/<SYNTHETIC-UUID>/`

| File | Required content |
| --- | --- |
| `inputs.json` | Exact normalized simulation inputs, assumptions and classifications |
| `analysis.json` | Complete certified simulation result, full-precision metrics, inputs and fingerprints |
| `execution.json` | Exact approved synthetic identity, input/result/model/source identities, seed/count and runtime |
| `report.json` | Deeply frozen report-ready normalized model, including validated analysis extension |
| `report.html` | Exact deterministic HTML produced from that report model |
| `report.pdf` | Actual output of the existing Puppeteer renderer |
| `runtime.json` | Node/Puppeteer/browser/renderer versions, local-pipe transport, print configuration and browser diagnostics |
| `sources.json` | Report source hash map and canonical bundle fingerprint |
| `manifest.json` | Package ID/version, FROZEN status, generation time, scope, execution binding, report model/renderer/source identities, and eight artifact SHA-256 hashes/byte counts |

The generation timestamp belongs in the package/report envelope, never in the deterministic simulation result. Input/result values are preserved before presentation rounding. All financial evidence classifications remain explicitly synthetic. No `.env`, credentials, raw provider records or real identity packet is copied.

A separate receipt is written at:

`<unique-run>/receipts/<SYNTHETIC-UUID>.json`

It binds the manifest byte hash, approved execution fingerprint, report source-bundle fingerprint and runtime fingerprint. The verifier requires this independently supplied receipt; it does not accept an internal manifest as its own trust anchor. Final visual-review attestation is another run-level sidecar, not an edit to the frozen manifest.

## Freeze and verify

`freezeReport` validates the trusted source/runtime and exact synthetic result, constructs the adapter/model/HTML, creates a new exclusive package directory, renders through `renderInvestorPdf`, requires zero browser requests/errors, and writes each file with exclusive creation. It rechecks source hashes before freezing and immediately verifies the package.

`verifyPackage(directory, {receipt})`:

1. Requires a separately trusted receipt and exact package file set; rejects symlinked/non-file entries.
2. Verifies manifest bytes against the receipt and checks version, status, scope and package identity.
3. Recomputes all artifact hashes and byte counts; checks PDF header.
4. Validates the certified analysis contract and allowlisted result; binds normalized inputs and approved execution across files, manifest and receipt.
5. Rebuilds report normalization from the exact result/metadata and compares the entire report object and fingerprint.
6. Rebuilds HTML from that normalized report and compares it byte-for-byte.
7. Binds report source hashes, runtime and renderer versions to the manifest/receipt and current reviewed implementation; rechecks the original Monte Carlo certificate/source bundle.

PDF bytes are bound to the trusted render receipt and manifest. The verifier does not rerender a PDF and pretend Chromium output bytes must be identical across generation times. Automated PDF text checks and actual rasterized-page inspection are separate certification gates.

Changing HTML, PDF, JSON or manifest content fails verification. Even with newly computed file/manifest checksums, a report mapped to different metrics fails the independent adapter reconstruction. If an attacker can replace the trusted receipt and all reviewed code/trust constants, these local checks do not provide authentication against that attacker.

## Immutability and limitations

Immutability is **application-enforced append-only behavior**, not WORM storage or OS write protection. Existing package directories are never reused, even after an interrupted attempt; existing files are never overwritten by the generator. Changed assumptions/report content must get a new package UUID and new receipt. Repeated generation retains the exact simulation values but may change report metadata, report/PDF hashes and package identity. A timestamped PDF is not promised byte-identical reproducibility.

No signing key, trusted timestamp authority or digital author signature is used. Checksums plus a separately trusted receipt detect alteration relative to that anchor; **they do not prove who created a package**. Protect receipts through an independently reviewed storage/distribution channel before future external use. Source-code changes intentionally make the current verifier reject older report bundles; retain the corresponding reviewed implementation to verify archived versions. Never rewrite a historical package's hashes to fit new code.

This V1 approves exactly the three certified synthetic scenarios and their source/runtime identities. Broader real-property content, alternative model versions, different return policies, other renderers and production storage require explicit authorization and a new reviewed trust scope.

## Local commands

From the project root, with the existing verified Node 22.12.0 executable:

```powershell
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' scripts/certify-investor-mc.js
```

This creates a new run and new package IDs; it never regenerates historical PDFs in place. The automatic summary stops at contract certification pending image review. Do not automatically elevate it to visual certification.

Read-only verification of the final strong-margin package:

```powershell
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' scripts/verify-investor-mc-package.js data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/packages/SYNTHETIC-F499A98B-2CCE-477C-B50D-1596A2C2168C data/validation/investor-report-v1/mc-integration/2026-10-09T18-30-14-472Z/receipts/SYNTHETIC-F499A98B-2CCE-477C-B50D-1596A2C2168C.json
```

The CLI requires the receipt to resolve outside the package. It imports the offline guard and performs no rendering/provider/database operation. Package links and all three receipts are indexed by the [integration report](PI_INVESTOR_REPORT_MC_INTEGRATION.md) and final run summary.

**STOP for review. No real-property, production or Round 1 integration is authorized.**
