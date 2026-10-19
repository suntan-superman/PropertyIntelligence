# PROPERTY INTELLIGENCE — FIRST AMERICAN UAT ENDPOINT CONTRACT DISCOVERY V1

**For:** Codex in `C:\Users\sjroy\Source\PropertyIntelligence`  
**Mode:** Offline documentation and repository investigation only  
**Priority:** Determine a valid, minimal First American DataTree UAT request contract for distressed-property discovery in ZIP 93312.

## 1. Context and objective

Rodolfo Gomez of First American Data & Analytics supplied these UAT endpoint URLs:

- `https://dtapiuat.datatree.com/api/Report/GetReport?Ver=1.0` — TotalView, Foreclosure Report, Open Lien Report, Sales Comparables, Flex Search, and others.
- `https://dtapiuat.datatree.com/api/Report/GetDocument?Ver=1.0` — Last Finance Document and Last Transfer Document.
- `https://dtapiuat.datatree.com/api/Report/ExportReport?Ver=1.0` — Foreclosure Detail Export, Open Lien Export, Property Detail Export, and others.

Previous PI audit found historically successful authentication, SearchStandard exact-address lookup, and FullAddress TotalView, with one securely retained example response for each. Existing credential variable names are `DATATREE_CLIENT_ID` and `DATATREE_CLIENT_SECRET`. Do not print their values.

Vendor states that Advanced Search supports geography and batch criteria; **do not assume that Advanced Search and Flex Search are identical until documentation proves it**. Vendor also says TotalView mortgage balances are algorithmic estimates, not lender payoffs. Investor-facing DataTree information is permitted through a password-protected website or interface; downloadable PDF redistribution, retention, caching and SaaS rights still require confirmation.

**Do not use Rodolfo's earlier pricing table. He expressly withdrew it as belonging to another client. No PI pricing has been established.** UAT billing is also unconfirmed.

## 2. Repository/documentation discovery

1. Search the PI repository and locally available documentation for DataTree, First American, Flex Search, Advanced Search, `GetReport`, `GetDocument`, `ExportReport`, Last Finance Document, foreclosure and lien examples. Look for prior portal links and downloaded API specifications.
2. Inspect the historical working SearchStandard and TotalView integration code, retained request envelopes and sanitized response structures. Do not expose credentials, private owner data or raw restricted records in reports.
3. If the documentation portal is accessible with existing authorized access, inspect its official API schemas and examples. Do not bypass authentication or guess product identifiers.
4. Build an evidence table recording each claim, its exact source/file/section, and confidence: `DOCUMENTED`, `HISTORICALLY TESTED`, `VENDOR STATED`, or `UNKNOWN`.

## 3. Required endpoint contracts

For each of the following, determine documented URL, HTTP method, authentication headers, product identifier, required/optional request fields, sample valid request structure, response fields, pagination, limits and errors. Use redacted samples; never invent an executable request.

**A. Geographic distress discovery:** Determine whether Advanced Search is a distinct endpoint, a Flex Search report, or a separate query/export workflow. Identify supported ZIP `93312`, Kern County, residential/SFR, NOD, Notice of Trustee's Sale, foreclosure status, recording-date and event-status filters. Distinguish available filters from hoped-for filters. Determine whether search results return reusable property/parcel/document identifiers and event dates. Clarify search-result versus report/export billing units, if documented.

**B. TotalView:** Identify a documented property lookup method, ownership/recorded mortgage/recorded liens, estimated loan balances, assignments, releases and foreclosure fields. Mark balance provenance as `ALGORITHMIC_ESTIMATE`, not verified payoff.

**C. Foreclosure Report and Open Lien Report:** Identify whether these add meaningful data beyond TotalView, especially recorded NOD, trustee-sale, rescission, cancellation, postponement, release and status history. Do not equate a recorded event with an active foreclosure without evidence.

**D. Last Finance Document via GetDocument:** Determine the exact product/document selector and input identifiers. Distinguish metadata, document text and paid image retrieval.

**E. ExportReport:** Determine whether batch results can be exported, how report/add-on selection works, and any record-count restrictions.

## 4. Minimal future UAT plan (planning only)

Design a small, sequential, auditable test:

1. One geographically scoped residential discovery request for ZIP 93312 with a documented distress filter, if supported.
2. Inspect returned counts, identifiers, source dates, pagination and status semantics; do not claim comprehensive foreclosure coverage.
3. Select at most three results for possible TotalView follow-up.
4. Identify one optional Foreclosure/Open Lien or Last Finance Document request only if it resolves a specific missing question.
5. Reconcile returned property identifiers against PI county APN/ATN and RentCast data without fabricating equivalence.
6. Propose a stop rule for missing rights, unclear cost, invalid request schema or ambiguous subject identity.

This is **not authorization to execute** any live request. Request a separate explicit go/no-go after documented UAT charging and access terms are reviewed.

## 5. Product selection and commercial questions

Produce a short matrix: `Needed for MVP`, `Optional later`, `Not yet justified`, with reasons for Flex/Advanced Search, TotalView, Foreclosure Report, Open Lien Report, Last Finance Document and ExportReport.

List only remaining precise questions for Rodolfo/engineers, including:

- Is UAT billable? Are there rate/record caps?
- Which geographic distress filters and event-status fields exist for Kern County?
- How are rescissions, cancellations, postponements and completed trustee sales represented?
- Are balances estimated from recorded original principal and loan assumptions, and what confidence/as-of data are supplied?
- Are caching, derived analyses, SaaS display, authenticated report downloads and subsequent investor PDF distribution permitted?
- Which request types count toward future commercial pricing, and how is batch search metered?

## 6. Constraints

- JavaScript only if small offline validation utilities are needed.
- **No live First American or other provider calls. No credential loading or output. No database access/writes. No production code changes or deployments.**
- No speculative API schema, fake sample output, or invented foreclosure-status claims.
- Preserve existing PI workflows, county evidence, MAO/Monte Carlo and report engines.
- Avoid new approval frameworks or broad certification work. A concise documentation/readiness audit is sufficient.

## 7. Deliverables and stop condition

Create:

1. `docs/PI_FIRST_AMERICAN_UAT_ENDPOINT_CONTRACT_V1.md` — endpoint contracts, source references, unknowns and distinctions.
2. `docs/PI_FIRST_AMERICAN_UAT_MINIMAL_TEST_PLAN_V1.md` — exact proposed request sequence, field expectations, cost/rights gates and stop rules.
3. `docs/PI_FIRST_AMERICAN_UAT_ENGINEERING_QUESTIONS_V1.md` — short prioritized questions for vendor engineers, only where documentation is insufficient.

Report one of:
- `READY_FOR_OPERATOR_UAT_APPROVAL` — exact executable contracts documented; billing/rights may still require operator review.
- `ADDITIONAL_DOCUMENTATION_REQUIRED` — missing exact schema or filters.
- `TECHNICAL_BLOCKER` — documented incompatibility.

Include source-backed evidence and a brief QA summary. **Stop for Stan/ChatGPT review. Do not transmit any live requests.**
