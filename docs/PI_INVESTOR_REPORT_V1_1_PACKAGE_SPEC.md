# PI Investor Report V1.1 — Frozen package specification

2026-10-09 · Local synthetic-only. Extends the existing package builder/verifier and Puppeteer path; no separate report stack.

## Version and analytical boundaries

- Package: `pi-synthetic-investor-package-v1.1`.
- Report: `investor-presentation-v1.1`.
- Renderer: `investor-report-v1.1-presentation`.
- Normalized model remains `investor-report-model-v1`; adapter remains `investor-mc-adapter-v1`.
- Certified models unchanged: `pi-monte-carlo-v1`, `pi-flip-cents-v1`, `sprint5-mao-v2`.
- Exact certified Node runtime: `v22.12.0`. Actual Puppeteer/browser recorded in runtime.json: 25.12.0 / Chrome/154.0.8037.57.
- Analytical source-bundle fingerprint remains `94682d485c61b3027cd5c06216886c0954e9d6c08be9edc47be0ce8201c55661`.
- New report source-bundle fingerprint: `8ffa0ae23b28c45b2af0aaade6a70ae9136def8ea1dbf06dd7a790de321cc46a`.

The report bundle covers eight report modules plus package.json and package-lock.json. The new presentation module is included in the trust boundary. The core certificate and three approved result fingerprints remain pinned and are rechecked. This version does not expand permission to other analyses or real properties.

## File set

Each unique SYNTHETIC-UUID directory contains exactly:

| Artifact | Purpose |
| --- | --- |
| inputs.json | Exact certified inputs and source classifications |
| analysis.json | Full original simulation, economics, MAO, sensitivity, assumptions and provenance |
| execution.json | Same approved execution identity for both documents |
| report.json | Renderer-independent normalized model, NOT_ASSESSED decision, new presentation version/ID/date |
| report.html | Five-page investor HTML |
| report.pdf | Investor PDF from the existing Puppeteer renderer |
| appendix.html | Technical evidence HTML from that same report object |
| appendix.pdf | Companion technical PDF from the same renderer |
| runtime.json | Runtime, renderer, print configuration and separate browser diagnostics for both documents |
| sources.json | Exact report source hash map and bundle fingerprint |
| manifest.json | Frozen package metadata and ten artifact SHA-256/byte-count entries |

A separate trusted receipt outside this directory binds manifest bytes, execution fingerprint, source-bundle fingerprint and runtime fingerprint. It is required, not inferred from an internal package file.

New files reside under:

`data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/<SYNTHETIC-UUID>/`

Receipts are at the corresponding run-level `receipts/<SYNTHETIC-UUID>.json`. Visual QA and final certification are external sidecars and are never inserted into or used to rewrite the frozen package.

## Binding and independent verification

The investor report and appendix share the exact scenario analysis ID, approved execution, normalized-report fingerprint and package ID. Each HTML/PDF has its own manifest hash. Changing either PDF changes a separately checked artifact hash and fails the same trusted receipt. The appendix is independently hash-bound, not trusted merely because its filename or title looks correct; verification uses the complete package plus separate receipt.

The existing `verifyPackage` and CLI now dispatch an exact versioned file profile:

1. Require an approved package-version receipt and the exact file set; reject symlinks/non-files.
2. Check manifest bytes against the external receipt and verify package/version/status/scope/ID.
3. Verify all ten artifact hashes and byte counts, including both PDFs.
4. Bind inputs, full approved result and execution across artifacts/manifest/receipt.
5. Reconstruct normalized report using the explicit presentation version; compare the full object/fingerprint.
6. Reconstruct investor and appendix HTML independently from the same report; compare each byte-for-byte.
7. Check PDF headers, report source/version binding and actual runtime binding; recheck the original analytical certificate and source.

No PDF rerender is used as a substitute for original bytes. Timestamps and browser PDF internals can vary across new packages; each new rendering gets its own identity/receipt.

Tamper tests cover both PDFs, appendix HTML and manifest. A different-analysis appendix with recalculated file/manifest hashes still fails the independent HTML mapping. Missing trusted receipts and regeneration of an existing directory fail.

## Final package identities

| Case | Package identity | Manifest SHA-256 |
| --- | --- | --- |
| A — Strong Margin | `SYNTHETIC-76AD0D34-668C-4A15-9B63-4EBAF92A63BF` | `7ff4ccd54b1d94b85555ef53244e6a86cfaf5c87f8c08b0075a28ea9fd1b5449` |
| B — Marginal Investment | `SYNTHETIC-B968CF14-FF2C-45AA-9E75-3EB88591A477` | `4f54de45758951aa2447e128022152f03d573195dd39d746969eca07f044f1a9` |
| C — Renovation Overrun | `SYNTHETIC-BAC91DF3-76B6-4A65-B36A-1928CFC4339D` | `7f983b3f50092851fceb51dde6cf51859e331c0f312af0739104c4729b589ab0` |

| Case | Preserved certified result fingerprint | New normalized report fingerprint |
| --- | --- | --- |
| A — Strong Margin | `b854e2c29320e50adda00c821763922bef9a22d51fb03253416176a99c82266f` | `a1f78d51f48a19aefb119dc487262df39049d739eb24df1981d42693d61ca5ab` |
| B — Marginal Investment | `c8c6fc92afdd229614e2a335735ae270cf928773e0340b4b314460d784cc89b1` | `4fd4e31648353faa10d08617859ab32684e8f55bf48bd70467d8b581f1b2fa9a` |
| C — Renovation Overrun | `4a88b988d5e22c54adb616e635ab7f95946f58921188d706750be34e8395d38f` | `7b0d760c4bbd640fd1be6d3eae3ebfdf3a62730ef4a6057e2571978c8f709aa5` |

Artifact and preview links are in the [presentation report](PI_INVESTOR_REPORT_V1_1_PRESENTATION.md).

## Read-only verification command

From the project root, for Strong Margin:

```powershell
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' scripts/verify-investor-mc-package.js 'data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-76AD0D34-668C-4A15-9B63-4EBAF92A63BF' 'data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/receipts/SYNTHETIC-76AD0D34-668C-4A15-9B63-4EBAF92A63BF.json'
```

Substitute the corresponding package and receipt for the other two cases. All three were reopened through this existing CLI and returned PASS, ten artifacts verified. The CLI requires the trusted receipt to resolve outside the package and uses the offline guard.

## Historical preservation and integrity limits

The original V1 packages, PDFs, manifests, receipts and QA were not modified. Their existing manifest/receipt byte hashes and every artifact hash were rechecked. The current legacy template also reconstructs their original HTML exactly.

As before, the full source-version verifier rejects an archived report bundle when running a different reviewed source revision; this is deliberate source binding, not permission to rewrite an archived manifest. Full original-source verification uses the corresponding reviewed V1 implementation. This sprint preserves the old integrity evidence and certifies the new V1.1 source separately; it does not loosen source matching for convenience.

Frozen writes use exclusive file/directory creation. This is application-enforced append-only behavior, not WORM storage or an OS guarantee. Checksums relative to a separately trusted receipt detect alteration; they do not authenticate an author. No signing authority, cryptographic signature or trusted timestamp service is claimed. A compromised receipt and reviewed implementation are outside this local integrity guarantee.

No raw provider content, credentials, actual addresses or parcel identities are introduced. The machine-readable analytical values and technical status codes remain exact; only investor-facing labels and the authorized arithmetic price delta change.

**STOP FOR STAN/CHATGPT REVIEW.** No real-property reports, production storage/integration, provider calls or deployment.
