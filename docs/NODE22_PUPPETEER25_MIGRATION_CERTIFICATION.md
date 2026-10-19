# PI Node 22 + Puppeteer 25 Migration Certification

**Certification date:** 2026-10-06 (America/Los_Angeles)  
**Scope:** Isolated migration certification only. No dependency, application, Node, Netlify, or production changes were made in the main workspace. No deployment or provider calls were made.  
**Isolated copy:** C:\Users\sjroy\AppData\Local\Temp\PI-node22-migration-certification-20261006 (complete project/data copy; .env, .git, existing node_modules, and .netlify excluded). A safe .env.example template was copied.  
**Final recommendation:** **MIGRATION NOT READY**

## Executive summary

The candidate dependency graph is viable at the package/build/PDF level:

- Node v22.12.0, Puppeteer 25.12.0, Chrome for Testing 154.0.8037.57, and source-map-js 1.2.2 installed in the isolated copy with Puppeteer's install scripts enabled.
- npm audit --omit=dev returned **0 vulnerabilities**.
- Headless Chrome launch, PI production build, report tests, PDF generation, protected-artifact checks, and security scans passed.
- The previous >2 GB Vite build stall did not reproduce. The measured build used approximately **259 MB aggregate Node working set** and completed in 5.36 seconds wall time (Vite reported 4.28 seconds).
- Puppeteer 24 and 25 produced identical page counts and normalized extracted text for **23 PDFs**: 15 investment fixtures, 6 current investor-report outputs, and 2 synthetic stress-case outputs. Eight representative raster comparisons were pixel-identical.

Certification is **not ready** because the complete existing test-file suite did not finish green (196/198; two repository-protection tests fail on the already-modified .gitignore hash), the unmodified npm test harness does not run on Node 22 until a small test-runner compatibility edit is made, and the deployed Netlify Functions runtime / AWS_LAMBDA_JS_RUNTIME value could not be verified. These are not evidence of a Puppeteer runtime/PDF failure, but they prevent an unconditional migration certification.

## Gate 1 — Production/runtime configuration

| Item | Finding |
|---|---|
| Netlify build Node | netlify.toml sets [build.environment] NODE_VERSION = "20". |
| Netlify Functions Node runtime | **UNVERIFIED.** No authenticated Netlify site/runtime inspection was available through the current tools. |
| AWS_LAMBDA_JS_RUNTIME | **UNVERIFIED.** Not declared in netlify.toml; the live Netlify UI/CLI/API value was not inspected. Netlify documents that this value is configured outside netlify.toml. |
| .nvmrc | Absent. |
| .node-version | Absent. |
| Root package engine | package.json currently declares node >=20. |
| Local developer Node | v20.19.4; left unchanged. The isolated test used a cached Node binary, v22.12.0. |
| CI | No .github/workflows directory or repository CI Node declaration was found. External CI, if any, is unknown. |

Netlify says Function runtime normally follows the build Node if that version is a valid Lambda runtime not nearing deprecation; otherwise its fallback is Node 24. AWS lists Node 20 as deprecated April 30, 2026, and Node 22 (nodejs22.x) as supported with a scheduled deprecation date of April 30, 2027. This suggests the current Node 20 build configuration may default Functions to Node 24, but it does **not** establish the actual PI runtime; the runtime remains **UNVERIFIED** until checked in the site settings. [Netlify Functions runtime configuration](https://docs.netlify.com/build/functions/configuration/), [AWS Lambda runtime lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html).

## Gate 2 — Isolated copy and data safety

The isolated copy included the full project and data tree (about 3.32 GB), including data/validation/sprint6_1-protected.json and all of its referenced report artifacts. No .env file, credential-bearing Netlify cache, or existing node_modules was copied. The non-secret .env.example was included because local regression copies expect that template. Candidate changes and test-generated files remain under the temporary directory only.

The previous missing protected report model was present in this copy. The 15-fixture investment PDF QA completed its final protected-artifact check with **351 protected files**, status PASS, and provider calls 0.

## Gates 3–6 — Candidate runtime, dependencies, browser, audit

The isolated candidate used:

| Component | Resolved version |
|---|---|
| Node | 22.12.0 |
| Puppeteer | 25.12.0 |
| Puppeteer Core | 25.12.0 |
| @puppeteer/browsers | 3.2.3 |
| source-map-js | 1.2.2 (npm override satisfying PostCSS's declared range) |

The candidate package manifest in the temporary copy declared engines.node >=22.12.0; the lockfile was resolved accordingly. Both a normal install (install scripts enabled) and a clean npm ci completed. No provider credentials were present, no .env was copied, and no provider endpoints were called.

Puppeteer downloaded and launched its own browser; the run did not use an installed system Chrome:

| Renderer baseline | Downloaded browser | Executable |
|---|---|---|
| Puppeteer 24.40.0 | Chrome for Testing 146.0.7680.153 | Isolated .puppeteer-cache-p24 |
| Puppeteer 25.12.0 | Chrome for Testing 154.0.8037.57 | ...\.puppeteer-cache\chrome\win64-154.0.8037.57\chrome-win64\chrome.exe |

Puppeteer 25 headless launch succeeded, reported Chrome/154.0.8037.57, rendered a test page, and used the explicit isolated cache path. Puppeteer's current installation documentation states that install normally downloads a compatible Chrome for Testing binary; that behavior was exercised here with scripts enabled. [Puppeteer installation](https://pptr.dev/guides/installation), [supported browser versions](https://pptr.dev/supported-browsers).

npm audit --omit=dev on the final clean candidate graph: **0 known vulnerabilities**.

## Gate 7 — Production build and resource use

The actual PI command, npm run web:build, completed successfully:

- Vite: 6.4.3; 49 modules transformed.
- Vite build duration: 4.28 seconds.
- Total command wall time: 5.36 seconds.
- Sampled aggregate Node working set peak: approximately 258.8 MB (100 ms sampling).
- Warnings/errors: none reported.
- Output bundle: 426.42 kB JavaScript / 130.62 kB gzip; 35.74 kB CSS / 11.37 kB gzip.

The prior >2 GB stall did not reproduce in the complete copy, even though only about 2.1 GB of system memory was free before the run. This evidence does not support a Puppeteer 25/Node 22 build regression. The earlier behavior is classified **not reproducible; likely prior isolated-environment/resource artifact, exact cause undetermined**. No memory limit was raised to obtain the successful result.

## Gate 8 — Tests and security

Results under Node 22.12.0 / Puppeteer 25.12.0:

| Suite | Result |
|---|---|
| Foundation npm test after isolated test-runner adjustment | **131/131 pass** |
| Netlify/API/runtime npm run netlify:test | **18/18 pass**; the suite uses offline guards and mocked provider cases |
| Investment report tests | **19/19 pass** |
| Investor report model tests | **3/3 pass** |
| All explicit tests/*.test.js plus scripts/**/*.test.js files | **196/198 pass; 0 skipped; 2 fail** |
| Runtime security scan | **PASS**, 14 files; 42 protected files; zero provider calls |
| Sprint 6.3 bundle/security scan | **PASS**, 55 files; zero network/provider calls |

The two failures are both existing protected-baseline assertions. They expect .gitignore SHA-256 b85b13dc23d8ad5b4fb6c9038801047ce4edc46318a562c6c9dd35fdcbb4a7de; the current workspace's pre-existing .gitignore SHA-256 is 9eb820a21ccd85c510613a6194ed26caed429828e884fed6f444b338ad86ecc4. The .gitignore edit predates this migration task; it was preserved, not reverted, and its protection baseline was not rewritten. No other test failed in the explicit test-file run.

The unmodified scripts/test-foundation.js invokes Node's test runner with the directory argument tests. Under Node 22.12 this exits with ERR_UNSUPPORTED_DIR_IMPORT before tests execute. In the isolated copy only, I made a minimal mechanical test-harness adjustment to enumerate tests/*.test.js and pass explicit file paths. With that isolated adjustment, npm test passed all 131 tests. This change is needed to make the existing npm test entry point work on Node 22; it is not a Puppeteer ESM change. The main workspace was not changed.

The full test gate therefore remains **not green** until the existing .gitignore protected-baseline discrepancy is reviewed and the isolated test-harness change is separately accepted or replaced by an approved test-runner solution. The suite was not filtered to hide the two failures.

## Gate 9 — PDF generation, QA, and comparison

### Investor Opportunity Brief and Full Due-Diligence Report

The existing v1 model admits INVESTIGATE, WATCH, and PASS only; STRESS is not a PI disposition. I did not add a new disposition. A separate synthetic downside stress-case was produced by changing scenario/economic evidence while retaining the valid INVESTIGATE disposition, and labeled clearly as a stress scenario.

Under both Puppeteer versions, all eight case/type combinations rendered and passed PDF text, blank-page, and page-bound checks:

| Case | Brief pages | Full report pages |
|---|---:|---:|
| INVESTIGATE | 3 | 12 |
| WATCH | 3 | 12 |
| PASS | 3 | 12 |
| Synthetic STRESS scenario (PI disposition remains INVESTIGATE) | 3 | 12 |

For each report, charts were rendered and inspected on Brief page 3 and Full Report page 10. Investor PDF QA had provider calls 0.

### Existing investment PDF suite

All 15 existing synthetic investment fixtures rendered under both Puppeteer 24 and 25. The 15 page counts were unchanged between versions: 8, 6, 8, 11, 34, 8, 14, 14, 8, 8, 8, 8, 10, 6, 8. Text assertions, page bounds, blank-page checks, full 15-comp checks where applicable, chart/contact-sheet rendering, local API PDF flow, and protected-artifact checks passed. Provider calls were 0.

### P24/P25 comparison

- Across all **23 corresponding PDFs**, page counts matched and normalized extracted page text was identical.
- Three investor-report page images (brief cover, brief chart page, and full-report chart page) were pixel-identical at 827×1070.
- Five representative investment-report page/contact-sheet images (complete, large rehab, long legal, many diligence) were pixel-identical.
- PDF byte lengths differed between Chrome versions (Puppeteer 25 outputs were slightly smaller in the tested investment fixtures), but no page-count, extracted-text, or sampled visual difference was found. The byte-level difference is a PDF serialization/browser-version difference, not a visible-content difference in the tested outputs.

## Gate 10 — Puppeteer ESM impact

The project already declares type: module and uses static ESM imports. The deployed API entry does not import either PDF renderer.

| File/surface | Classification | Finding |
|---|---|---|
| src/reports/pdf.js | **NO CHANGE** | Already uses import puppeteer from 'puppeteer'; its existing puppeteer.launch() options worked. |
| src/reports/investor-v1/pdf.js | **NO CHANGE** | Already uses the same ESM import and Puppeteer launch API; all report tests/renderers passed. |
| src/reports/investment/pdf.js | **NO CHANGE** | Uses the shared PDF browser path; no CommonJS Puppeteer import found. |
| netlify/functions/api.js | **NO CHANGE** | Imports the API runtime only; the PDF renderers remain local-only and are excluded from the Function bundle by the security checks. |
| scripts/test-foundation.js | **MECHANICAL CHANGE** | Node 22 test-runner invocation must enumerate test files instead of passing the tests directory. Temporary-copy-only adjustment passed 131 tests. This is Node runner compatibility, not Puppeteer ESM. |
| scripts/qa-investor-reports-v1.js | **MECHANICAL CHANGE** | Its output prints a hard-coded Puppeteer 24.40.0 label, which was false when it ran against 25.12.0. The tested package version was verified independently from the installed graph. Update this QA label to read the installed version before using its output as version evidence. |

No architectural ESM change was required by the two Puppeteer import sites. Puppeteer 25 also changes some APIs such as executablePath() to return a Promise; PI's runtime renderer does not call that API. [Puppeteer 25 changelog](https://pptr.dev/CHANGELOG), [Node requirements](https://pptr.dev/next/guides/system-requirements).

## Gate 11 — Proposed Netlify/developer/CI changes only

No settings were changed. If migration is later approved, the proposed changes are:

1. netlify.toml: change [build.environment] NODE_VERSION = "20" to NODE_VERSION = "22.12.0" (or an explicitly selected compatible Node 22 patch release).
2. package.json: change engines.node from >=20 to >=22.12.0; set Puppeteer to 25.12.0; add the tested source-map-js: 1.2.2 override; regenerate package-lock.json with install scripts enabled.
3. Netlify UI/runtime: first read the current AWS_LAMBDA_JS_RUNTIME. If a deliberate pin is desired, set it in the Netlify UI to nodejs22.x; Netlify documents that this setting must not be placed in netlify.toml. Then certify the deployed Function runtime read-only. Do not assume it from the build config.
4. Developer environment: add .nvmrc and/or .node-version containing 22.12.0, or use the team's chosen runtime manager. No global Node change is needed for this migration.
5. CI: no repository workflow was found. If an external CI job exists, configure it to Node >=22.12.0 and run the complete lockfile install/build/test/PDF/security gates.
6. Apply the isolated scripts/test-foundation.js file-enumeration adjustment and the QA version-label correction only after review; these were not copied back to the main workspace.

Node 22 is accepted by current AWS Lambda as nodejs22.x; Node 22's scheduled Lambda deprecation is April 30, 2027. [Netlify runtime settings](https://docs.netlify.com/build/functions/configuration/), [AWS runtime support](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html).

## Gate conclusion and STOP

The candidate proves that PI's current ESM PDF code can render under Puppeteer 25.12.0/Node 22.12.0, that the production build completes, and that the candidate package graph has zero known production audit findings. PDF output behavior matched Puppeteer 24 in the tested fixtures.

However, this is **not** migration certification ready because:

- the actual deployed Netlify Function runtime and AWS_LAMBDA_JS_RUNTIME remain **UNVERIFIED**;
- the complete explicit test run still has two protected-baseline failures caused by the pre-existing .gitignore hash mismatch;
- the official npm test entry point required an isolated Node 22 runner adjustment;
- the QA script's Puppeteer version label is hard-coded and must be made accurate before its output is relied upon.

**Final recommendation: MIGRATION NOT READY**

No migration was applied to the main workspace. No Netlify configuration or production setting was changed. No deployment or provider call occurred. **Stopped for Stan/ChatGPT review.**
