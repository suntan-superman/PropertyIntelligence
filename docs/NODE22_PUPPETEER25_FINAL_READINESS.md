# Node 22 / Puppeteer 25 Final Readiness

**Final classification: `MIGRATION NOT READY`**

The isolated candidate passed the production dependency audit, build, PDF QA, Node 20/22 foundation-runner check, runtime/API tests, and security scans. Certification is not complete: the full test-file suite is **196/198** because two historical protected-baseline assertions fail on legitimate later-revision files, and the deployed Netlify Functions runtime could not be inspected. The main workspace, Netlify configuration, and production were not migrated or deployed.

## Candidate and boundaries

- Isolated copy: `%LOCALAPPDATA%\Temp\PI-node22-migration-certification-20261006`.
- Node 20 comparison runtime: `20.19.4`.
- Candidate Node runtime: `22.12.0`.
- Candidate dependencies: Puppeteer `25.12.0`; `source-map-js` `1.2.2`.
- Candidate Puppeteer-managed browser: Chrome `154.0.8037.57`. The separate Puppeteer 24 comparison used Chrome `146.0.7680.153`.
- The `.env` file was not copied into the isolated directory. No RentCast, Google, county, ATTOM, DataTree, Supabase, or production writes were performed. The PDF QA scripts each reported zero provider calls. Supabase reads/writes: **0**. Package registry and browser downloads were used only for isolated setup.

## Blocker resolution results

### `.gitignore` protection reconciliation

`docs/GITIGNORE_PROTECTION_RECONCILIATION.md` classifies the current ignore rules as `LEGITIMATE CURRENT BASELINE`. Its current SHA-256 is `9eb820a21ccd85c510613a6194ed26caed429828e884fed6f444b338ad86ecc4`; the earlier pinned SHA-256 was `b85b13dc23d8ad5b4fb6c9038801047ce4edc46318a562c6c9dd35fdcbb4a7de`.

In the isolated copy only, the two `.gitignore` hash entries in `data/runtime/sprint6_3/baseline.json` and `data/runtime/sprint6_2-kern-assessor/repository-baseline.json` were updated to the current hash. No main-workspace protected baseline was changed. That exact, narrow proposal is **not enough** to make the two protection tests pass: the Sprint 6.2 manifest has 40 mismatched entries; the Sprint 6.3 manifest has 36 mismatches outside its four existing scoped exceptions. The failing tests first encounter `apps/web/src/app/App.jsx` and `apps/web/src/services/api.js`, respectively. The broader differences also include later sprint application files and regenerated validation outputs. They were not silently re-baselined or exempted; each needs independent scope/evidence review and authorized reconciliation. The affected protection-test gate therefore remains **FAIL**.

### Foundation test runner

The isolated `scripts/test-foundation.js` explicitly enumerates the sorted top-level `tests/*.test.js` files. There are 12 such files and no nested test files under `tests/`. Node 20's original directory invocation discovered 131 tests and passed 131/131; the proposed explicit implementation also passed **131/131** under both Node `20.19.4` and Node `22.12.0`, with 0 skipped and 0 failed. Ordering is deterministic by filename, with no filtering. The recorded command metadata now lists the actual explicit file arguments.

Classification: **`MECHANICAL COMPATIBILITY FIX APPROVED FOR MIGRATION`**. The Node 22 directory-entry incompatibility is addressed without changing test semantics.

### PDF QA version instrumentation

The isolated `scripts/qa-investor-reports-v1.js` reads the installed `node_modules/puppeteer/package.json` version rather than printing a fixed label. The isolated Puppeteer 24 run reported `24.40.0`; the candidate Puppeteer 25 run reported `25.12.0`. Both generated the three synthetic report dispositions in Brief and Full formats, with expected 3-page and 12-page outputs and zero provider calls.

Classification: **`QA INSTRUMENTATION FIX`**. No QA code in the main workspace was changed.

## Netlify runtime gate

Repository/local inspection found:

- Main `package.json` engine: `>=20`.
- Main `netlify.toml`: build `NODE_VERSION = "20"`; Functions directory configured, but no Functions runtime or `AWS_LAMBDA_JS_RUNTIME` value declared there.
- No `.nvmrc` or `.node-version` file.
- No Netlify CLI is installed/available to this session; there was no Netlify authentication environment variable available for read-only site inspection. Local `.netlify/state.json` contains only site association metadata and does not prove the deployed runtime.
- No local `AWS_LAMBDA_JS_RUNTIME` environment variable was set.

**Final runtime state: `MANUAL VERIFICATION REQUIRED`**. Stan must inspect the existing Netlify site's read-only configuration and deployed Functions details to record: (1) effective build Node version, including any UI override of `NODE_VERSION`; (2) deployed Functions Node runtime; and (3) whether `AWS_LAMBDA_JS_RUNTIME` is set, including its value and deployment context. Confirm these from site configuration and a deployed Function/deploy log; do not infer Functions runtime from the build Node version. No Netlify settings were changed and no deploy was made.

## Candidate certification results

| Gate | Result |
|---|---|
| `npm audit --omit=dev` | **PASS — 0 vulnerabilities** |
| Production web build | **PASS** — Vite completed in 4.06 seconds. The earlier >2 GB isolated-build stall was not reproduced; a prior sampled candidate run measured roughly 259 MB aggregate Node RSS. |
| Foundation suite (`npm test`) | **PASS — 131/131**, no skips |
| Foundation runner, Node 20 / Node 22 | **PASS — 131/131 on each runtime**, no skips |
| Explicit complete suite | **FAIL — 196/198 across 20 test files; 2 failed, 0 skipped**. Both failures are protected-baseline assertions described above, not Node/Puppeteer failures. |
| Netlify/API/runtime tests | **PASS — 18/18** |
| Investment tests | **PASS — 19/19** |
| Investor-report tests | **PASS — 3/3** |
| Investment PDF QA | **PASS** — all 13 existing synthetic fixture outputs completed. |
| Investor-report PDF QA | **PASS on Puppeteer 24 and 25** — INVESTIGATE/WATCH/PASS, Brief and Full for each; 3/12 pages. |
| Runtime security scan | **PASS** — 14 files, 42 protected patterns, 0 provider calls. Hosted Function artifact/log scanning was not applicable without deployment. |
| Sprint 6.3 security scan | **PASS** — 55 files; credentials not printed; 0 provider/network calls. |
| Protected-artifact checks | **FAIL / NOT CERTIFIED** — historical manifests expose the stale entries above; no coverage was removed or assertions weakened. |
| Provider calls / production writes | **0 / 0** |

The isolated P24/P25 report QA output has matching page counts; the earlier candidate comparison also reported matching normalized PDF text and pixel-identical sampled images. This turn did not deploy or change the main application.

## Required before reconsidering migration

1. Review and explicitly reconcile the historical protected-baseline differences beyond `.gitignore`; rerun all 20 test files until 198/198 pass without skips or weakened checks.
2. Have Stan manually verify the effective Netlify build and Functions runtime values as listed above.
3. Repeat the final isolated gates after any authorized baseline/runtime evidence updates.

No changes were made in the main workspace to `package.json`, `package-lock.json`, Node configuration, Puppeteer, Netlify settings, or application code. **Stop here for Stan/ChatGPT authorization.**
