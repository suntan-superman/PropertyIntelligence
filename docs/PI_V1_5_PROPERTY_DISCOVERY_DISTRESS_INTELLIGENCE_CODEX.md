# PROPERTY INTELLIGENCE V1.5 — PROPERTY DISCOVERY & DISTRESS INTELLIGENCE

**Codex implementation brief**  
**Project:** Property Intelligence (PI), Workside Software LLC  
**Stack:** Existing React/JavaScript application; reuse current services and financial/reporting engines. No TypeScript.  
**Primary outcome:** Discover and screen potential real-estate opportunities *before* underwriting them.

## 1. Product objective

Implement two first-class entry points that converge on the existing Property Detail → Evidence → Comparable Research → Underwriting → Reports flow:

1. **Discover Opportunities:** ingest or select a batch of county-sourced candidates, filter, investigate, shortlist, and open a candidate.
2. **Analyze an Address:** enter a street/city/state (ZIP optional), research that individual lead, and continue into underwriting.

**V1.5 acceptance demonstration:** start with 80 real records from the already-retained Kern County candidate data; show transparent screening reasons and source dates; filter by geography and evidence; shortlist 5–6; open one in the existing workflow without creating a duplicate product experience. If the retained evidence cannot support 80 eligible candidates, report the exact number rather than inventing records.

## 2. First inspect what already exists

- Inventory current candidate datasets, county Power-to-Sell source files, Assessor snapshots, historical ATN/APN9 crosswalks, discovery/screening code, existing exclusion lists, property storage, RentCast and ATTOM clients, Google integration, and V1.4 routes.
- Identify current data contracts and existing safe read-only paths. Reuse them rather than rewriting.
- Preserve historical records, source timestamps, approved identity classifications, MAO, Monte Carlo, PDF renderer, and saved scenarios.
- Distinguish *candidate research records* from *durable canonical Properties*. A candidate may be researched and underwritten provisionally without being silently promoted to a verified parcel or production Property.

## 3. Discovery dashboard

Add an accessible **Discover Opportunities** route/navigation item with:

- Candidate count, evidence coverage, selected shortlist count, and source snapshot date.
- Search by address, city, ZIP (only when actually supported), source identifier, and candidate reference.
- Filters: geography, property type, historical tax-list signal, recorded NOD, recorded trustee-sale notice, evidence freshness, research completeness, and valuation availability. **Disable or label unsupported filters** rather than returning misleading empty results.
- Sort by transparent *research priority* (evidence completeness, freshness, source flags, geographic fit), never by fabricated profitability or assumed seller motivation.
- Compact table with address/locale, property type, **why flagged**, original source and date, distress category and status, estimated value when available, evidence gaps, and action to inspect.
- Multi-select up to six for a working shortlist; bulk shortlist from a filtered set. Persist local shortlist state in the same supported local storage pattern as existing workspace scenarios; keep subject isolation.
- Empty/loading/error states, CSV export of the filtered research set and shortlist, and source-attribution links or references.

## 4. Import and 80-candidate pilot

- Support importing **CSV** and, if existing libraries safely support it, XLSX. PDF imports should be offered only when a reliable, tested extraction path exists; otherwise clearly explain that CSV is the supported import format.
- Map columns interactively for street, city, state, ZIP, APN, ATN, source, source date, distress signal, historical amount and property type. ZIP may be absent; do not reject a record solely for that.
- Provide import preview, validation summary, row-level issues, duplicate-candidate review and a reversible import operation. Preserve raw values, source provenance and exact source file reference.
- Normalize for search/display but retain original identifiers; never derive APN9 by padding ATNs or assert APN/ATN equivalence.
- Import only authorized, already-retained data during this task. No unapproved scraping or external dataset acquisition.
- Select a reproducible 80-record pilot subset using documented eligibility and deterministic order; include Bakersfield/93312 examples only if actually present and supported by the dataset. Do not claim a comprehensive ZIP inventory.

## 5. Distress intelligence and source taxonomy

Every candidate must have a clear **Discovery Reason** and evidence timeline. Define typed signals:

- `HISTORICAL_POWER_TO_SELL`: historical county list appearance and dated amount; **not** current tax balance or present availability.
- `TAX_DEFAULT_CURRENT`: only with dated current authoritative evidence.
- `NOD_RECORDED`: only with a matching recorded Notice of Default and document/date/source.
- `TRUSTEE_SALE_NOTICE_RECORDED`: only with a matching recorded notice and document/date/source; a scheduled sale may change or be canceled.
- `LIEN_RECORDED`: lien instrument amount/type/date and subsequent release status where known; not necessarily outstanding.
- `MORTGAGE_RECORDED`: original deed-of-trust amount/date; **not** a current payoff.
- `OTHER_RESEARCH_SIGNAL`: explicitly sourced, not proof of distress.

For each signal store observed date, source retrieval date, document reference when available, status (`historical`, `current-as-of`, `superseded`, `unknown`), and a short explanation. No NOD, lien, debt balance, owner equity, or foreclosure claim may be invented from an AVM or historical tax-list amount.

Show a prominent **Why flagged?** panel and a compact timeline on each candidate. If the reason is merely manually added or previously saved, state that explicitly (e.g. Haven Street has no documented distress signal in currently retained evidence).

## 6. Address entry and identity handling

- Provide **Analyze an Address** with street, city, state, optional ZIP, and a clear preliminary research action.
- Reuse the existing address/property lookup and identity matching mechanisms, including Rule C where applicable; preserve distinct APN/ATN representations.
- Address suggestions can be accepted for **preliminary research** without asserting current parcel identity, ownership or title. Only ambiguous or materially conflicting addresses need manual review.
- Do not force county phone verification or multi-field attestation just to open a research candidate.
- Do not silently create a durable canonical Property; preserve existing approval gates for durable identity and persistence.

## 7. Mortgage, lien and foreclosure source capability audit

Conduct a practical capability matrix for existing RentCast, ATTOM and retained county/Recorder data. For each source/endpoint, document:

- Exact field or record availability for original mortgage, modeled balance, recorded lien, lien release, NOD, Notice of Trustee's Sale, auction outcome, tax default and ownership.
- County/ZIP coverage, freshness, record identifiers, match method, licensing/redistribution rights, API access/plan, estimated request cost, and whether current production credentials are configured.
- What is **actually implemented and tested** versus merely documented or proposed.
- Current Kern County Recorder online search limitations and the need for alternative licensed data if parcel-level NOD discovery cannot be automated reliably.

**This milestone is an audit, not authorization to subscribe to a new data provider or scrape restricted records.** Recommend the minimum viable next acquisition path and any required vendor questions. If source evidence is absent, UI must say **Not checked / Not available**, never **No liens** or **Not in foreclosure**.

## 8. Integrate with V1.4 underwriting

- Selecting **Investigate** opens the existing Property Detail with candidate ID, source snapshot, discovery reason and preliminary identity status intact.
- **Analyze Investment Opportunity** opens the same V1.4 Basic/Advanced underwriting, MAO, sensitivity, Monte Carlo and report experience.
- Keep analyst assumptions separate from source evidence. Existing scenario defaults/presets must be opt-in and not copied between properties.
- Allow shortlist and research status to be updated from the detail view, without forcing the user back to the dashboard.
- Include discovery reason, historical versus current distress classification, missing mortgage/lien evidence and source dates in reports when available. Do not alter certified financial mathematics.

## 9. Costs and operational boundaries

- Default to retained/offline evidence and no live provider calls for initial implementation and QA.
- Add an optional **Enrich selected candidates** planning screen showing exact provider endpoints, expected request count, maximum estimated cost, cache hits, and whether the existing account authorization covers execution.
- No automatic bulk API requests, uncontrolled retries, production database writes, new subscriptions, deployment, or external outreach in V1.5. Existing operator approvals are not blanket permission for unrelated providers or large-scale acquisition.
- Avoid building new approval frameworks or versioned selector machinery. Use the already-established controls only where live calls are eventually needed.

## 10. User experience and visual quality

- Prioritize an investor-friendly interface over internal QA language. Put raw identifiers, source hashes, and detailed provenance in expandable sections.
- Make unknowns and historical signals visually clear without repeating lengthy warnings on every row.
- Keep compact tables, intuitive filters, actionable buttons, and visible import/shortlist progress.
- Ensure keyboard accessibility, responsive layout, and readable error messages.
- No sample or QA fixtures mixed into real candidate lists unless deliberately enabled in development mode and clearly labeled.

## 11. QA and acceptance tests

Test at least:

1. Import or select 80 retained Kern candidates, with exact reproducible source mapping and no invented rows.
2. Filter to Bakersfield and, if available, ZIP 93312; show accurate result counts and honest missing ZIP coverage.
3. Filter historical Power-to-Sell versus current NOD; unsupported NOD coverage must be labeled unavailable, not zero defaults.
4. Select six candidates, save/reopen shortlist, and inspect discovery reasons.
5. Open a candidate in Property Detail, proceed to underwriting, change assumptions, save and export both reports.
6. Analyze an entered address with ZIP omitted; ambiguous identity does not silently become verified.
7. Haven Street appears as a saved property without fabricated distress indicators.
8. Duplicate county/ATN/APN inputs preserve raw source values and do not merge unrelated parcels.
9. No cross-property evidence or scenario leakage; no synthetic fixtures in production candidate views.
10. All existing financial, V1.4 UI, report and historical preservation tests still pass, or document pre-existing failures separately.

Use focused Playwright/Puppeteer tests, inspect the discovery dashboard and at least two generated PDFs visually. Do not invent QA success.

## 12. Deliverables and stop condition

Return:

- Local launch URL and short user walkthrough.
- Screenshot(s): dashboard with 80 candidates, filtering, discovery reason panel, six-property shortlist, and handoff to underwriting.
- A sample imported-data mapping and import exception summary.
- One real, source-supported shortlist export and at least one end-to-end investor PDF.
- Mortgage/lien/NOD/foreclosure capability matrix with concrete remaining data-source gaps.
- Test/build results, provider calls and cost accounting, changed-file summary, and prioritized next steps.

**Stop for Stan/ChatGPT review after the offline/local V1.5 discovery workflow is working.** Do not deploy or launch a bulk live acquisition. The next decision should be whether to add a licensed current foreclosure/recorded-document feed and then move toward authenticated private beta access.
