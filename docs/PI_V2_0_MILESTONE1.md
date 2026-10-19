# PI V2.0 — Milestone 1 Implementation and QA

Date: 2026-10-14 (America/Los_Angeles)  
Scope: authorized Days 1–14 only  
Status: **MILESTONE 1 IMPLEMENTED — LOCAL REVIEW READY**

## Current-state inventory and implementation plan

The existing V1.5.2/V1.6 local product already supplied the correct foundation:

- address-first retained-evidence lookup with optional ZIP and a safe no-match stop;
- a secondary discovery workflow;
- Property Detail with subject/snapshot-bound handoff;
- My Workspace views for Properties, Deals/scenarios, Shortlists and Reports, with confirmed QA scenarios excluded from ordinary views;
- append-only local scenario revisions, duplicate scenarios and comparison;
- the existing cents-based economics, MAO, break-even, deterministic downside and optional Monte Carlo engines;
- one normalized report model feeding HTML and Puppeteer PDF output.

The implementation therefore extended the current workspace rather than creating a second product or calculation stack. The material missing capability was a source-attributed analyst evidence ledger that remained separate from provider evidence and calculated outputs.

## Implemented

### Lead-to-investor journey

- `Analyze Property` remains the default product entry. Street, city and state are required; ZIP remains optional.
- Retained evidence is searched before any configured provider action. The local Milestone 1 server made no provider call.
- `Discover Opportunities` remains a secondary navigation item.
- Saved Properties, Deals/scenarios, Shortlists and Reports remain consolidated under `My Workspace`.
- Property Detail preserves the exact subject and evidence-snapshot binding before underwriting.
- A new address with no retained evidence stops with an explicit evidence-gap message; it does not create a Property or invent facts.

### Analyst evidence workspace

The scenario now supports revisioned analyst research entries for:

- recorded mortgage/deed of trust and original principal;
- algorithmic estimated balance and separately verified payoff;
- liens/encumbrances and releases/reconveyances;
- property taxes and foreclosure/NOD/trustee-sale events;
- title, occupancy, condition and seller/agent notes.

Each entry has a status/value, source, source date, optional retrieval date, verification class, notes, local attachment reference, investor-report inclusion control and sensitive-data control. Every category is Unknown until an entry establishes otherwise. A non-Unknown assertion requires a source and verification class. A “verified payoff” assertion additionally requires the independently verified class.

Attachment upload/storage was not fabricated. Milestone 1 stores only an optional local reference with the scenario. A governed private document store, authorization model, retention rules and malware scanning remain a documented dependency before binary attachments can be added.

Sensitive entries and private attachment paths are excluded from reports by default. The implementation explicitly preserves these boundaries:

- recorded lien does not mean currently outstanding;
- algorithmic/modelled balance is not a lender payoff;
- Unknown is not zero or proof of absence;
- analyst research does not rewrite retained provider/county evidence.

### Underwriting and scenarios

- Basic underwriting presents acquisition, rehab, resale, renovation/marketing duration, financing choice and target hurdle.
- The illustrative expense preset is an explicit action and is labelled hypothetical; it never silently changes an existing saved revision.
- Advanced inputs remain available without changing the existing calculation contracts.
- Existing profit, ROI, cash-on-cash, total-cost, break-even, MAO and three deterministic downside calculations are unchanged.
- Monte Carlo remains optional and requires explicit distributions, seed and rationale.
- Scenario revisions are append-only, reopen exactly, remain property-bound, and can be duplicated for side-by-side comparison.

### Reports

- The same saved scenario/evidence model produces an **Opportunity Brief** and **Full Investor Package**.
- Reports distinguish retained facts, provider model estimates, analyst evidence, analyst assumptions and PI calculations.
- The Full Investor Package includes the analyst evidence ledger while omitting sensitive entries and raw attachment paths.
- AVM remains labelled as-is and not ARV; balances are not represented as payoff; simulations are conditional model output rather than forecasts.
- Dense comparable research is moved to a deliberate continuation page when needed, avoiding an orphaned single comparable and preserving readable page breaks.

## Local launch

From the repository, using Node 22.12 or later:

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --port 4175
```

Open: `http://127.0.0.1:4175/#home`

No provider credentials are needed for this retained-evidence review. Do not add `--google-geocoding` unless a separately authorized live geocoding exercise is intended.

## Acceptance and QA

Final private QA output: `data/runtime/pi-v2-milestone1/qa-mH0LQz`

- Existing focused workspace/property/report suite: **105/105 PASS**.
- New Milestone 1 evidence tests: **5/5 PASS**.
- Final report/evidence focused rerun: **28/28 PASS**.
- Web production build: **PASS** under Node 22.12.0.
- Browser/PDF acceptance checks: **14/14 PASS**.
- Skipped tests: **0**.
- Provider calls: **0**.
- Database connections/writes: **0 / 0**.
- Production writes/deployments: **0 / 0**.
- Existing financial engine changes: **0**.

Coverage includes GABE-01 Crestview, GABE-04 Taft and GABE-05 Boron truthfulness/report regressions; saved durable Haven identity/scenario isolation; and a newly entered no-retained-evidence Bakersfield address. The new-address case correctly stops instead of allowing unsupported underwriting.

The final visual pass inspected the address entry, analyst evidence form, Basic underwriting, same-property scenario comparison, in-browser report preview and contact sheets for both full PDF packages. Opportunity Briefs are two pages each (analysis plus required county notice). Full packages contain no blank pages, out-of-bounds PDF text or external resources.

### Screenshots

- [Address entry](../data/runtime/pi-v2-milestone1/qa-mH0LQz/01-address-entry.png)
- [Analyst evidence entry](../data/runtime/pi-v2-milestone1/qa-mH0LQz/02-analyst-evidence.png)
- [Basic underwriting](../data/runtime/pi-v2-milestone1/qa-mH0LQz/03-basic-underwriting.png)
- [Scenario comparison](../data/runtime/pi-v2-milestone1/qa-mH0LQz/04-scenario-comparison.png)
- [Report preview](../data/runtime/pi-v2-milestone1/qa-mH0LQz/05-report-preview.png)

### Hypothetical report outputs

These use retained evidence with explicitly artificial assumptions. They are not actual offers, appraisals, ARVs or investment recommendations.

- [Crestview Opportunity Brief](../data/runtime/pi-v2-milestone1/qa-mH0LQz/GABE-01-opportunity-brief-hypothetical.pdf)
- [Crestview Full Investor Package](../data/runtime/pi-v2-milestone1/qa-mH0LQz/GABE-01-full-investor-package-hypothetical.pdf)
- [Boron Opportunity Brief](../data/runtime/pi-v2-milestone1/qa-mH0LQz/GABE-05-opportunity-brief-hypothetical.pdf)
- [Boron Full Investor Package](../data/runtime/pi-v2-milestone1/qa-mH0LQz/GABE-05-full-investor-package-hypothetical.pdf)
- [Machine-readable QA result](../data/runtime/pi-v2-milestone1/qa-mH0LQz/qa-results.json)

## Usability findings and remaining dependencies

1. Binary evidence attachments still need a private document-storage design; the UI truthfully stores references only.
2. A no-retained-evidence address cannot proceed to underwriting without a separately authorized/licensed evidence acquisition. This is an intentional identity/evidence gate.
3. The evidence editor is optimized for a small number of high-value findings. Bulk evidence import and document OCR are not part of Milestone 1.
4. Current title, payoff, lien status, occupancy and condition remain unknown unless an analyst adds appropriate evidence. No retained source is silently promoted.
5. Reports may require the vendor's password-protected interface/licensing controls before investor distribution; local PDF generation does not grant redistribution rights.
6. Scenario comparison is intentionally analytical, not a portfolio ranking or recommendation.

## Provider usage and cost

No live Google, RentCast, DataTree, ATTOM, county, MLS or other provider request was made. Incremental provider cost/exposure for this milestone is **$0.00**.

Milestone 2 and all later 60-day-plan work were not started. Production deployment, migrations, live acquisition, durable Property creation and financial-engine modifications remain outside this authorization.

## Navigation and property-handoff correction — 2026-10-15

The Milestone 1 follow-up corrected four local UX defects without changing evidence, MAO, Monte Carlo or report calculations.

### Root causes and corrections

1. Property Detail already created a subject/snapshot-bound route, but Investment Workspace always rendered the generic property selector before the requested subject. Direct handoffs now suppress that selector, validate the exact evidence fingerprint, load a matching saved scenario when present, open **Underwriting**, and scroll the bound subject into view.
2. **Analyze this property** was disabled until the separate batch-comparison checkbox was selected. The action is now always available; using it selects only that subject for the working context and opens Underwriting. The checkbox remains a comparison control.
3. My Workspace mixed management actions with developer-facing references. Ordinary views now show property addresses and the explicit actions **Open Property**, **Continue Analysis**, **Compare Scenarios**, and **Generate Report**. Internal references, enrichment accounting, and the QA archive are absent from ordinary views; the QA archive remains reachable only through the development-only `#fixtures` route.
4. The local Investment Workspace server hard-coded `/api/maps/config` as disabled. The launcher now reuses the existing allowlisted `readMapConfig()` browser-key boundary, while the local server returns that safe public configuration and uses the existing Maps CSP sources. No server/provider key is exposed, and production CSP was not changed. The offline coordinate fallback remains unchanged.

Scenario selection additionally rejects a saved scenario whose evidence fingerprint differs from the requested Property snapshot. This prevents a valid Property ID from accidentally reopening assumptions bound to stale evidence.

### Verification

- Focused unit/regression suite: **114/114 PASS**, 0 skipped.
- Navigation browser acceptance: **14/14 PASS**.
- Crestview and Haven each generated an Opportunity Brief and Full Investor Package: **4/4 PDFs generated**.
- Existing Milestone 1 PDF/browser QA: **14/14 PASS**; GABE-01 full package 7 pages and GABE-05 full package 6 pages.
- Existing map contract/fallback QA: **7/7 browser scenarios PASS**.
- Production web build: **PASS** on Node 22.12.0.
- Live basemap verification: `STREET`, one Google Maps JavaScript load, one `.gm-style` map instance, no Google authorization error.
- Google Geocoding requests: **0**.
- Provider enrichment requests: **0**.
- Database connections/writes: **0 / 0**.
- Production deployment: **0**.

Private acceptance artifacts:

- [Crestview direct handoff screenshot](../data/runtime/pi-v2-milestone1/navigation-qa-ni4If5/01-crestview-direct-handoff.png)
- [My Workspace Deals screenshot](../data/runtime/pi-v2-milestone1/navigation-qa-ni4If5/02-my-workspace-deals.png)
- [Live Crestview street basemap screenshot](../data/runtime/pi-v2-milestone1/navigation-qa/crestview-map.png)
- [Navigation QA result](../data/runtime/pi-v2-milestone1/navigation-qa-ni4If5/navigation-qa-results.json)
- [Crestview Opportunity Brief](../data/runtime/pi-v2-milestone1/navigation-qa-ni4If5/GABE-01-brief-r1.pdf)
- [Crestview Full Investor Package](../data/runtime/pi-v2-milestone1/navigation-qa-ni4If5/GABE-01-full-r1.pdf)
- [Haven Opportunity Brief](../data/runtime/pi-v2-milestone1/navigation-qa-ni4If5/PROPERTY-37cb8526-c1e7-4896-8525-a9cdb82f370b-brief-r1.pdf)
- [Haven Full Investor Package](../data/runtime/pi-v2-milestone1/navigation-qa-ni4If5/PROPERTY-37cb8526-c1e7-4896-8525-a9cdb82f370b-full-r1.pdf)

The local launch command remains:

```powershell
C:\Users\sjroy\AppData\Local\nvm\v22.12.0\node.exe scripts/workbench-server.js --investment --property-detail --port 4175
```

The browser Maps key is loaded automatically through the existing `.env` allowlist. `--google-geocoding` is not required and should remain omitted unless a separately authorized geocoding exercise is intended.
