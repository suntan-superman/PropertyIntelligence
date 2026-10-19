# Production Dependency Security Audit

**Audit date:** 2026-10-06  
**Scope:** Read-only review of the current production dependency graph and a temporary, isolated remediation simulation. No dependency, application, runtime, Netlify, or deployment changes were made to this workspace.  
**Command:** `npm audit --omit=dev --json`

## Executive result

The audit reports **9 high-severity package findings**, representing four distinct upstream advisories (one advisory is reported through several packages in its dependency chain). There are no critical, moderate, or low findings. The current graph has two main roots:

1. Puppeteer 24.40.0 → `@puppeteer/browsers` → archive extraction and proxy/FTP dependencies.
2. Vite 6.4.3 → PostCSS 8.5.28 → `source-map-js`.

The Puppeteer chain has no clean in-major remediation identified: the extract-zip advisories have no patched release listed, and npm's graph-level suggested fix is a downgrade to Puppeteer 19.8.0, a breaking major downgrade. A temporary Node 22.12/Puppeteer 25.12 resolution plus `source-map-js` 1.2.2 override installed cleanly and reported zero audit findings, but browser-install scripts and the full app build were not certified. The synthetic PDF fixture renderers largely passed; details and limitations are below.

**Overall recommendation: `NODE + PUPPETEER MIGRATION`**, gated on a complete build/runtime/PDF verification plan and review before any dependency change. This is a recommendation only, not authorization to change dependencies.

The sanitized machine-readable finding record is [production-dependency-security-audit.json](../data/validation/production-dependency-security-audit.json). It contains package/advisory/dependency data only; no credentials, environment variables, or raw environment data.

## Findings

“npm fix” below describes the result reported by npm for the complete dependency graph, not a fix that was applied. `npm audit fix` and `npm audit fix --force` were not run.

| Finding | Severity; affected → patched | Dependency path / introducing root | Reachability in current PI use | Fix available; breaking? | Recommended remediation |
|---|---|---|---|---|---|
| `basic-ftp` 5.3.1 — GHSA-c475-qrg2-pj4r / CVE-2026-102990 | High; `<=6.2.0` → `6.2.1` | Puppeteer → `@puppeteer/browsers` → `proxy-agent` → `pac-proxy-agent` → `get-uri` → `basic-ftp` | **POTENTIALLY REACHABLE** during dependency/browser installation if an FTP URI is selected; not used by PI request handling. | Patch exists, but `get-uri` requests `basic-ftp` `^5.0.2`; moving to 6.x requires a compatibility-changing override/parent upgrade. npm graph fix is Puppeteer 19.8.0 (major downgrade). | Prefer eliminating this old browser-management chain through the tested Node 22/Puppeteer 25 migration. Do not override `basic-ftp` without compatibility tests. |
| `extract-zip` 2.0.1 — GHSA-jmr9-qjv8-65gv / CVE-2026-56876 | High; `<=2.0.1` → no patched version listed | Puppeteer → `@puppeteer/browsers` → `extract-zip` | **POTENTIALLY REACHABLE** when the Puppeteer browser installer extracts an archive; not reachable from current Netlify request routes. | No patched version listed by the advisory; npm graph fix is Puppeteer 19.8.0 (major downgrade). | Remove the affected extraction path via a supported Puppeteer/browser-management upgrade; verify browser installation and archive handling before adoption. |
| `extract-zip` 2.0.1 — GHSA-7pqw-9j4j-h8q3 / CVE-2026-19693 | High; `<=2.0.1` → no patched version listed | Same `Puppeteer → @puppeteer/browsers → extract-zip` path | **POTENTIALLY REACHABLE** during browser archive extraction; not a user-facing PI archive endpoint. | No patched version listed by the advisory; npm graph fix is Puppeteer 19.8.0 (major downgrade). | Same as above; do not treat transitive status as a reason to dismiss it. |
| `get-uri` 6.0.5 — GHSA-c475-qrg2-pj4r / CVE-2026-102990 (transitive impact) | High; audit range `>=5.0.0`; underlying patched package `basic-ftp` 6.2.1 | Puppeteer → `@puppeteer/browsers` → `proxy-agent` → `pac-proxy-agent` → `get-uri` → `basic-ftp` | **POTENTIALLY REACHABLE** if the browser download/proxy configuration selects FTP; normal configured browser retrieval is HTTPS. | npm reports only the Puppeteer 19.8.0 graph change, a major downgrade. | Migrate away from this old chain; keep FTP/proxy input out of any untrusted request surface. |
| `pac-proxy-agent` 7.2.0 — GHSA-c475-qrg2-pj4r / CVE-2026-102990 (transitive impact) | High; audit range `>=6.0.0`; underlying patched package `basic-ftp` 6.2.1 | Puppeteer → `@puppeteer/browsers` → `proxy-agent` → `pac-proxy-agent` → `get-uri` → `basic-ftp` | **POTENTIALLY REACHABLE** through configured proxy handling during browser installation; not in PI request handlers. | npm reports only the Puppeteer 19.8.0 graph change, a major downgrade. | Node 22/Puppeteer 25 migration; verify proxy behavior if proxies are configured. |
| `proxy-agent` 6.5.0 — GHSA-c475-qrg2-pj4r / CVE-2026-102990 (transitive impact) | High; audit range `>=6.0.0`; underlying patched package `basic-ftp` 6.2.1 | Puppeteer → `@puppeteer/browsers` → `proxy-agent` → `pac-proxy-agent` → `get-uri` → `basic-ftp` | **POTENTIALLY REACHABLE** through browser download proxy support at install time; not in PI request handlers. | npm reports only the Puppeteer 19.8.0 graph change, a major downgrade. | Node 22/Puppeteer 25 migration. |
| `@puppeteer/browsers` 2.13.0 — propagated extract-zip and basic-ftp advisories | High; npm range `*`; affected children above | Puppeteer 24.40.0 and Puppeteer Core 24.40.0 → `@puppeteer/browsers` | **POTENTIALLY REACHABLE** in browser installation/download management. PI's deployed Function does not import this code. | npm reports Puppeteer 19.8.0 as the graph fix, a major downgrade. Puppeteer 25 uses a different browser-management dependency set in the tested resolution. | Controlled Node 22/Puppeteer 25 migration, after install/build/PDF certification. |
| `puppeteer-core` 24.40.0 — propagated `@puppeteer/browsers` advisories | High; `19.8.4–24.43.1` → no in-major fixed release identified in the installed graph | Direct Puppeteer → Puppeteer Core → `@puppeteer/browsers` | **NOT REACHABLE IN CURRENT PI USE** for deployed Functions; local PDF renderers launch Puppeteer and are reachable in local/server report workflows. | npm's graph fix is Puppeteer 19.8.0, a major downgrade. Puppeteer 25.12 requires Node 22.12+. | Node 22/Puppeteer 25 migration, retaining separate testing for local report execution. |
| `puppeteer` 24.40.0 — propagated `@puppeteer/browsers` advisories | High; `19.8.1–24.43.1` → no in-major fixed release identified in the installed graph | Direct dependency → `puppeteer-core` → `@puppeteer/browsers`; also exposes the browser installer | **NOT REACHABLE IN CURRENT PI NETLIFY REQUEST USE**; **REACHABLE** in local report/PDF workflows and **POTENTIALLY REACHABLE** during dependency/browser installation. | npm suggests 19.8.0, a major downgrade. Puppeteer 25.12.0 requires Node 22.12+. | Node 22/Puppeteer 25 migration with browser-install, report, and runtime qualification. |
| `source-map-js` 1.2.1 — GHSA-68fv-2mgg-jv7q / CVE-2026-93749 | High; `>=1.0.0 <1.2.2` → `1.2.2` | Vite 6.4.3 → PostCSS 8.5.28 → `source-map-js` | **POTENTIALLY REACHABLE** in build-time PostCSS source-map parsing; not in deployed PI request handling. | Patch available; `1.2.2` is inside PostCSS's declared `^1.2.1` range, so this is a non-major compatible resolution. | Patch to 1.2.2 through a controlled compatible resolution (for example, lockfile refresh or tested override). |

The nine npm package findings are not nine unique vulnerabilities. npm propagates the same `basic-ftp` advisory to its `get-uri`, proxy-agent parents, browser manager, Puppeteer Core, and Puppeteer package records; it similarly propagates the two `extract-zip` advisories through browser manager/Puppeteer. The independent fourth advisory is `source-map-js`.

## Dependency paths

`npm ls` and `npm explain` confirmed these installed paths:

```text
Puppeteer 24.40.0
├── @puppeteer/browsers 2.13.0
│   ├── extract-zip 2.0.1
│   └── proxy-agent 6.5.0
│       └── pac-proxy-agent 7.2.0
│           └── get-uri 6.0.5
│               └── basic-ftp 5.3.1
└── puppeteer-core 24.40.0
    └── @puppeteer/browsers 2.13.0 (deduped)

Vite 6.4.3
└── PostCSS 8.5.28
    └── source-map-js 1.2.1
```

All vulnerable packages in the Puppeteer chain are introduced by Puppeteer’s browser-management dependency, not by separate direct PI application imports. The `source-map-js` finding is a separate Vite/PostCSS path.

## Reachability assessment

- **Netlify request runtime:** `netlify/functions/api.js` constructs the API runtime from `src/workbench/api/runtime.js`; it does not import the local PDF renderers. The router treats PDF generation as local-only when there is no report service. The vulnerable Puppeteer archive/proxy/FTP functionality is therefore not reachable through the current deployed API request surface.
- **Local report workflow:** PI's local report code imports Puppeteer and launches a browser to render HTML. Puppeteer itself is reachable in that local workflow, but the FTP client and archive extractor are specifically in browser-management/install code rather than report HTML rendering. The extractor can be reached when installing/extracting a browser archive. The `get-uri` FTP handler is potentially reachable only if an FTP URI is selected through download/proxy configuration; PI does not expose a user-controlled archive or FTP URL in its deployed API.
- **Build/install:** Puppeteer's browser downloader/extractor can run during dependency/browser setup, subject to install scripts and download configuration. `source-map-js` is used by PostCSS in the Vite build pipeline; source-map parsing can be reached from build inputs, not the deployed API.
- **Chromium:** Chromium is an external browser binary installed/selected by Puppeteer and is not itself one of the nine npm package findings. This audit did not scan the Chromium binary or its OS libraries.
- **Report input, file handling, URLs, command execution, and SSRF:** no deployed request path was found that passes untrusted HTML, arbitrary report files, or user-selected URLs to Puppeteer. This is a source inspection, not a formal exploitability proof; local report generation remains a security-sensitive execution path.

## Runtime and compatibility

| Component | Observed configuration / requirement |
|---|---|
| PI declared Node floor | Root `package.json` says `engines.node >=20`. |
| PI local Node used for inspection | `v20.19.4`. |
| Netlify build Node | `netlify.toml` sets `NODE_VERSION = "20"`. |
| Netlify Functions runtime | Not queried from the Netlify site settings. Netlify documents that the Functions runtime generally follows the build Node version when valid, while `AWS_LAMBDA_JS_RUNTIME` can override it; Node 20 Lambda deprecation has passed as of the audit date, so the actual deployed runtime must be verified in Netlify before selecting a migration target. |
| Puppeteer 24.40.0 | Package engine supports Node `>=18`; this is the current pinned major. |
| Puppeteer 25.12.0 | Requires Node `>=22.12.0`; Puppeteer 25 also introduces ESM-only support. |
| Other dependency constraints sampled | Vite 6 supports Node `^18 || ^20 || >=22`; `pdfjs-dist` requires Node `>=20`; Playwright Core requires Node `>=18`; sampled remaining direct dependencies do not block Node 22.12. This is not a full Node migration regression certification. |
| Home Advisor | Separate application; its inspected API packages use Puppeteer `^24.40.0` and its Dockerfile uses Node 20. No shared PI package/runtime constraint was found. Home Advisor was not modified. |

Netlify's current runtime configuration is an explicit investigation item, not an assumption: its UI/environment override was not inspected. Netlify may also run build commands under Node 20 while Functions use a different explicitly configured runtime.

## Remediation paths considered

| Path | Audit result |
|---|---|
| **A — patch/minor while retaining Node 20** | Viable for `source-map-js` 1.2.2. No complete Puppeteer-chain fix in the current installed Puppeteer 24 graph was identified. |
| **B — npm overrides** | `source-map-js: 1.2.2` is a compatible candidate because it satisfies the parent range. `basic-ftp: 6.2.1` would cross the `get-uri`-declared 5.x major and is not recommended without compatibility testing. A browser-manager override needs its own Node/peer/behavior verification; it is not a safe Node 20-only fix based on current evidence. |
| **C — update within Puppeteer 24** | No Puppeteer 24 release above the reported vulnerable range was available in the inspected graph; the extract-zip advisories list no patched version. An in-major update alone is not a demonstrated complete remediation. |
| **D — Puppeteer 25 + Node migration** | Most promising complete Puppeteer-chain remediation. An isolated dependency resolution with Node 22.12.0, Puppeteer 25.12.0, and `source-map-js` 1.2.2 reported zero audit findings. It needs complete installation/build/runtime and PDF regression certification before use. |
| **E — replace/remove another vulnerable dependency** | `source-map-js` can be patched in place. No separate PI FTP/proxy dependency is directly used; it arrives with Puppeteer browser management. Replacing the downloader/extractor independently was not tested and would fork supported Puppeteer behavior. |

## Isolated hypothetical test

An isolated temporary copy was used; its package manifest and installed modules are outside the PI repository. The main workspace `package.json`, lockfile, Node configuration, and Puppeteer version were not changed by this audit. No production database, Netlify credential, provider, or deployment was used.

- Resolved temporary graph: Node 22.12.0, Puppeteer 25.12.0, `source-map-js` 1.2.2. `npm audit --omit=dev` returned **0 vulnerabilities**.
- Dependency installation used `--ignore-scripts`; therefore the test did **not** certify Puppeteer's browser download/postinstall behavior. The synthetic PDF tests used an installed Chrome executable explicitly.
- Investor-report PDF QA rendered all six synthetic report outputs successfully.
- Investment-report QA rendered all 15 synthetic fixture PDFs successfully. The overall script then failed in its final protected-artifact check because the temporary copy did not contain an unrelated pre-existing protected report model file. Thus the render fixtures passed, but the entire QA command did not finish green.
- The isolated Vite build did not complete: it ran for over a minute while consuming more than 2 GB of memory and was stopped. Build certification is therefore **incomplete**, not passed.
- One QA script prints a hard-coded Puppeteer 24.40.0 label; for the temporary run, dependency resolution was Puppeteer 25.12.0. That label is not evidence of the tested package version.

This is enough to support a migration candidate, not enough to authorize or certify it. A follow-up experiment should copy the complete required test fixtures/artifacts, use a clean isolated install with install scripts enabled and controlled browser source, verify the resolved versions directly, then complete build, tests, PDF visual/content checks, and Netlify runtime qualification.

## Recommendation and stop gate

**`NODE + PUPPETEER MIGRATION`** is the recommended remediation path because the high findings in the Puppeteer chain are not resolved by a demonstrated safe Puppeteer 24 update, while a temporary Puppeteer 25.12/Node 22.12 graph is clean in npm's audit. Apply a compatible `source-map-js` 1.2.2 resolution as part of the separately reviewed remediation.

Before any change is proposed for implementation, Stan/ChatGPT review should require:

1. Confirm the actual production Netlify Function runtime and any `AWS_LAMBDA_JS_RUNTIME` override.
2. Complete clean isolated Node 22.12 + Puppeteer 25 browser-install, build, full test, and all synthetic PDF QA with no missing artifacts.
3. Review the Puppeteer 25 ESM migration impact and align PI `engines`, Netlify build/runtime, and developer tooling deliberately.
4. Re-run the production audit and reachability review after a separately authorized change.

No dependency remediation, deployment, or production action was performed. **Stopped for review before changing dependencies.**

## References

- [basic-ftp GHSA-c475-qrg2-pj4r](https://github.com/advisories/GHSA-c475-qrg2-pj4r)
- [extract-zip GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv)
- [extract-zip GHSA-7pqw-9j4j-h8q3](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3)
- [source-map-js GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
- [Puppeteer changelog](https://pptr.dev/CHANGELOG) and [system requirements](https://pptr.dev/next/guides/system-requirements)
- [Netlify Functions configuration](https://docs.netlify.com/build/functions/configuration/) and [build software](https://docs.netlify.com/build/configure-builds/available-software-at-build-time/)
- [AWS Lambda runtime lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
