# Property Intelligence V1.5 — Property Discovery & Distress Intelligence

**Status:** `V1.5 OFFLINE DISCOVERY WORKFLOW FUNCTIONING`  
**Completed:** 2026-10-14  
**Runtime:** Node 22.12.0; Chrome 154.0.8037.57  
**Execution boundary:** local retained evidence only; no provider call, database connection/write, durable Property creation or deployment

## Outcome

PI now has two local entry points that converge on the existing product rather than creating a parallel workflow:

- **Discover Opportunities** screens an exact deterministic cohort of 80 retained Kern County candidates, explains each dated source signal, filters/searches, persists a maximum-six working shortlist, imports/exports CSV and opens the candidate in Property Detail.
- **Analyze an Address** searches retained subjects with optional ZIP, clearly handles absent/ambiguous matches and never silently creates or verifies a durable Property.
- **Property Detail → Analyze Investment Opportunity** reuses the V1.4 underwriting, MAO, deterministic sensitivities, Monte Carlo and Puppeteer reports without changing their financial math.

Local launch: [http://127.0.0.1:4177/#discover](http://127.0.0.1:4177/#discover)

## Short walkthrough

1. Open **Discover Opportunities**. The header should show 80 candidates and source date 2026-09-15.
2. Filter **City → Bakersfield** to see 24 retained candidates. ZIP is disabled because this cohort has no supported ZIP values; 93312 cannot honestly be evaluated.
3. Select **Shortlist first available (max 6)**. The shortlist persists in the local gitignored state file and cannot exceed six.
4. Open **Why flagged?** to review the historical timeline, source date/amount and explicit current-evidence gaps.
5. Select **Investigate** to open the existing Property Detail, then **Analyze Investment Opportunity** for the existing V1.4 workspace and reports.
6. Use **Analyze an Address** when beginning from a known street/city/state. ZIP is optional; a retained match remains preliminary unless it already is a durable saved Property.

## Retained pilot construction

The pilot contains no invented or duplicated subjects:

- 81 retained `HIGH_REVIEW_PRIORITY + RESIDENTIAL_SINGLE_FAMILY` rows were eligible.
- The one previously certified Round 1 fixture was removed through the retained exclusion relationship.
- The remaining 80 were ordered deterministically by historical `local_ref`.
- All 80 have exact retained ATN/APN9 relationships and county situs evidence.
- Bakersfield count: **24**.
- Supported ZIP values: **0**; ZIP 93312 result is therefore **not evaluable**, not zero.
- Current NOD, trustee-sale, lien, mortgage, ownership and valuation coverage: **Not checked / not available**.

Every discovery row carries `HISTORICAL_POWER_TO_SELL`, status `historical`, observed/source date 2026-09-15, the source amount and a plain-language warning that this is not current delinquency, foreclosure, payoff, equity, availability or motivation.

The exact source hashes and selection invariants are enforced in [model.js](../src/discovery/model.js). The shareable field mapping and exception counts are in [import-mapping.json](../data/validation/discovery-v1-5/import-mapping.json).

## Import, export and local state

- CSV is processed in the browser with interactive mapping, preview, row issues, duplicate flags, optional ZIP and separate raw APN/ATN fields.
- Valid imports are reversible browser-session records; they cannot be shortlisted or investigated until reconciled to retained evidence.
- XLSX and PDF import are explicitly unavailable because the current dependency graph has no safe, tested structured extraction path.
- Filtered and shortlist CSV exports retain source attribution and raw identifiers.
- Shortlist/research status uses a local atomic JSON store under gitignored `data/runtime/`; there is no database adapter or production API in this server.

## Distress and identity safeguards

- Candidate research records use `DISCOVERY_CANDIDATE`, not durable canonical Property status.
- ATN and APN9 are always separate retained strings. The system never calculates, pads or truncates one into the other.
- No owner/contact data is loaded into the discovery view.
- Haven remains a saved Property outside the 80-candidate pilot and is described as having no documented distress signal in its retained snapshot.
- Unsupported filters are visibly disabled. Missing evidence never renders as “No liens” or “Not in foreclosure.”
- Address lookup performs no provider request and creates no record. California can be a Kern jurisdiction constraint, not proof of postal or parcel identity.

## Source capability decision

The full field/coverage/rights/cost matrix is [PI_V1_5_SOURCE_CAPABILITY_MATRIX.md](PI_V1_5_SOURCE_CAPABILITY_MATRIX.md).

The practical next step is written confirmation and a small licensed sample for a Kern/FIPS 06029 recorded-document/foreclosure feed with NOD, trustee-sale, cancellation/outcome, mortgage, lien and release chains. ATTOM is the shortest technical evaluation path because its offline replay tooling already exists, but current Kern coverage, rights and economics are not established. The county Recorder's official material says online APN search ended 2024-12-09 and does not establish a reliable automated parcel-level feed; restricted-site scraping is not recommended.

## QA evidence

Final browser/PDF run: [visual index](../data/runtime/discovery-v1-5/qa-SNdRFw/visual-index.html) and [machine-readable result](../data/runtime/discovery-v1-5/qa-SNdRFw/qa-results.json).

| Check | Result |
| --- | --- |
| Focused V1.5 unit tests | **9/9 PASS**, 0 skipped |
| Existing focused Property/Workspace/V1.4/report tests | **105/105 PASS**, 0 skipped |
| Complete workspace regression selection | **365/365 PASS**, 0 failed, 0 skipped across 21 test files |
| Production web build | **PASS**; production build excludes the local-only workspace/discovery entrypoint |
| Browser workflow | **38/38 checks PASS**; 0 browser errors; 0 external requests; ambiguous addresses remain unresolved and Haven gains no fabricated distress signal |
| Dashboard pilot/filter | **80 exact**, Bakersfield **24**, unsupported ZIP/NOD disabled |
| Shortlist | **6/6**, persisted after reload, isolated test-owned store |
| Opportunity Brief | **2 pages**, all pages nonblank, text in bounds, visually inspected |
| Full Investor Report | **5 pages**, all pages nonblank, text in bounds, visually inspected |
| Provider calls / DB connections / DB writes | **0 / 0 / 0** |
| Durable Properties created / deployment | **0 / 0** |

Private screenshots:

- [80-candidate dashboard](../data/runtime/discovery-v1-5/qa-SNdRFw/01-dashboard-80-candidates.png)
- [Bakersfield filter](../data/runtime/discovery-v1-5/qa-SNdRFw/02-bakersfield-filter-24.png)
- [six-property shortlist](../data/runtime/discovery-v1-5/qa-SNdRFw/03-six-property-shortlist.png)
- [discovery reason drawer](../data/runtime/discovery-v1-5/qa-SNdRFw/04-discovery-reason-drawer.png)
- [Property Detail handoff](../data/runtime/discovery-v1-5/qa-SNdRFw/05-property-detail-handoff.png)
- [underwriting handoff](../data/runtime/discovery-v1-5/qa-SNdRFw/06-underwriting-handoff.png)

Private deliverables:

- [source-supported six-property shortlist](../data/runtime/discovery-v1-5/qa-SNdRFw/source-supported-shortlist.csv)
- [Opportunity Brief PDF](../data/runtime/discovery-v1-5/qa-SNdRFw/candidate-brief-r1.pdf)
- [Full Investor Report PDF](../data/runtime/discovery-v1-5/qa-SNdRFw/candidate-full-r1.pdf)

The generated reports use explicit artificial assumptions ($150,000 purchase, $30,000 rehab and $250,000 resale) solely to certify the handoff. They are not recommendations or new property evidence. Both preserve the historical source reason, absence of valuation evidence and complete county disclaimer.

## Changed implementation surface

- New discovery domain model and local store: `src/discovery/`.
- New local dashboard/address/import UI: `apps/web/src/features/discovery/`.
- Local navigation and candidate context integrated into Property Detail and Investment Workspace.
- Local server exposes discovery bootstrap/state only when Property Detail mode is explicitly enabled; QA can inject an isolated discovery state directory.
- Report adapter adds source-aware V1.5 discovery context while leaving certified economics untouched.
- New focused tests and browser/PDF QA script.
- New capability matrix and sanitized import-mapping artifact.

No provider client, database repository, migration, Rule C logic, durable identity decision, MAO formula, Monte Carlo engine or deployment configuration was changed for V1.5.

## Cost and next decisions

- Incremental V1.5 execution cost: **$0.00**.
- Enrichment planning is non-executable. For a six-item shortlist it displays six one-request RentCast Property Records lookups and a conservative **$1.20** exposure, but it loads no credential and creates no reservation.
- Prior provider activity/allowance is not recalculated or treated as fresh authorization.

Prioritized next decisions:

1. Decide whether to pursue a licensed current Kern recorded-document/foreclosure source, beginning with coverage/rights/cost questions—not a subscription.
2. If supported, authorize a bounded sample that proves NOD/NTS cancellation/outcome and lien/release chains on known fixtures before broad acquisition.
3. Add authenticated private-beta access only after the data-source decision and privacy/security review.

Stop condition met: the offline/local V1.5 discovery workflow is functioning. No live bulk acquisition or deployment was started.
