# PROPERTY INTELLIGENCE — REAL FINANCIAL EVIDENCE READINESS V1
## Provider Capability, Comparable Sales, ARV Methodology & Three-Property Pilot Preparation

**Project:** Property Intelligence (PI)  
**Company:** Workside Software LLC  
**Priority:** HIGH  
**Execution:** Local, offline-first, read-only assessment  
**Live provider requests:** NOT AUTHORIZED  
**Database writes:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED  
**MLS Round 1:** PRE_EXECUTION — NOT AUTHORIZED

## 1. PRIMARY OBJECTIVE

Determine whether PI's existing licensed data sources can support defensible preliminary financial analysis of real Kern County residential investment opportunities. Reuse certified ATTOM ingestion, RentCast Rule C, Preliminary Property Analysis V1, isolated V3 persistence, Monte Carlo V1, MAO V2, Investor Report V1.1, and versioned baseline protection. Do not rebuild them.

Establish which financial inputs are already available; which ATTOM and RentCast products can supply missing inputs; provider rights, endpoint entitlements and costs; a defensible comparable-sales and preliminary ARV methodology; a deterministic three-property nonpilot technical shortlist; and the exact authorization needed before acquisition. **Deliver an actionable plan, not a new subsystem.**

## PART A — PRESERVATION

### 2. Protected systems

Do not modify V3 durable identity persistence, RentCast Rule C, Preliminary Analysis V1, Monte Carlo, MAO, Investor Report V1.1, ATTOM ingestion/replay, monitoring, analyst decisions, protected baselines, or MLS Round 1 configuration. No migrations, deployments, dependency installations or production changes.

### 3. Reference documents

Inspect actual repository files, including where present:

- `docs/PI_PRELIMINARY_PROPERTY_ANALYSIS_V1.md`
- `docs/PI_PRELIMINARY_PROPERTY_ANALYSIS_V1_GAPS.md`
- `docs/PI_RENTCAST_CONTROLLED_PILOT_V1.md`
- `docs/PI_RENTCAST_RECONCILIATION_V1_1.md`
- `docs/ATTOM_BULK_PI_FIT_RECOMMENDATION.md`
- `docs/ATTOM_SEQUENTIAL_DELIVERY_CERTIFICATION.md`
- `docs/PI_MONTE_CARLO_V1_MODEL_SPEC.md`
- `docs/PI_INVESTOR_REPORT_V1_1_PRESENTATION.md`
- `docs/PI_MLS_R1_GATE1_ELIGIBILITY.md`

Use discovered paths and current certified versions; do not assume referenced files exist.

## PART B — FINANCIAL INPUTS

### 4. Complete 34-entry inventory

Start with the **34 required financial/support entries** from Preliminary Property Analysis V1, retaining their exact meanings. For every entry document: field, purpose, units, existing evidence, potential provider, rights, source/effective date, subject binding, evidence class, whether analyst/investor assumptions are permissible, and whether absence blocks real calculations.

Allowed classes: `PROVIDER_EVIDENCE`, `COUNTY_EVIDENCE`, `ANALYST_ESTIMATE`, `INVESTOR_ASSUMPTION`, `SYNTHETIC_TEST`, `MISSING`.

Never substitute assessed value, tax delinquency, mortgage principal, or an unrelated valuation for an acquisition price.

### 5. Materiality hierarchy

Separate (a) purchase price, as-is value, ARV, sold comparables, condition and rehab; (b) financing, holding, transaction costs and investor hurdle; (c) descriptive property, tax, transaction, neighborhood and distress context. Data-field quantity does not equal financial quality.

## PART C — ATTOM

### 6. Existing ATTOM evidence

Inspect only retained certified local ATTOM files and manifests. Inventory available sale prices/dates, transfer amounts, mortgages, foreclosure/preforeclosure, assignment/release, identity, situs, geography, characteristics and valuation fields. Distinguish a recorded transfer amount from a reliable arm's-length sale price, mortgage amount from price, and foreclosure amount from market value.

### 7. Licensed product scope

For each actually delivered ATTOM dataset document exact name, location, edition, relevant columns, coverage, dates, identifier, valuation utility, licensing limitations and missing joins. Do not assume broader ATTOM AVM/comps products are included in bulk transaction delivery. No SFTP or new download.

### 8. ATTOM sold-comps feasibility

Evaluate availability of sale price/date, residential type, geographic proximity, GLA, beds/baths, lot, year, condition, arm's-length flags and subject-to-comparable linkage. Identify exact gaps. Do not extract a new bulk comps dataset or implement a comps engine.

## PART D — RENTCAST

### 9. Existing integration and product inventory

Inspect existing RentCast adapter, retained authorized responses and local documentation for Property Records, value estimates, sale history, sold comparables and property characteristics. Public docs may be read without authentication; no live API calls. Distinguish public endpoint documentation from actual Workside account entitlement.

### 10. Valuation evidence

For each potential product identify estimated value and range, valuation/as-of date, comparable records and dates/prices/attributes, subject RentCast ID, geographic basis, limitations and rights. **As-is AVM is not ARV.** AVM ranges are not automatically calibrated Monte Carlo distributions. No unsupported after-repair uplift.

### 11. Account/cost assumptions

Last user-confirmed RentCast plan: Developer, 50 included requests per billing period, $0 monthly, $0.20 per successful overage, written permission for described commercial retention/SaaS/PDF use. This is not a live quota reading. Inspect local configuration without revealing credentials. Verify from available evidence whether valuation/comps endpoints use the same allowance or different terms. Unknown entitlement/pricing must remain `UNKNOWN`.

## PART E — SUBJECT BINDING AND VALUATION METHOD

### 12. Subject binding

Require original county candidate reference, source-specific RentCast ID, supported historical county relationship, complete address, jurisdiction, source hash, date and no material contradiction. Address similarity alone is not canonical identity. RentCast `assessorID` is not an authoritative county key. Never calculate APN9, strip zeros or infer ATN equivalence.

### 13. Comparable-selection proposal

Propose transparent, configurable pilot criteria for location, sale recency, residential type, living area, bedrooms/bathrooms, lot, age, transaction quality, condition, renovation level and neighborhood/market differences. Identify non-arm's-length exclusions. No universal arbitrary thresholds; any proposed thresholds require approval and sensitivity review.

### 14. Preliminary ARV method

Define: subject attributes → subject-bound valuation evidence → sold comps → unsuitable-sale exclusions → condition/renovation comparison → only supported adjustments → preliminary range → analyst review → full source/date lineage. If condition-adjustment evidence is missing, return `ARV_NOT_SUPPORTED`. Do not invent adjustments or apply an arbitrary multiplier to an as-is AVM.

## PART F — THREE NONPILOT CANDIDATES

### 15. Candidate pool

Use the existing **77 nonpilot Kern County potential candidates**. Preserve source identities, screening status, original ranking, exclusions and Round 1 restrictions. These are not verified durable Properties.

### 16. Deterministic technical shortlist

Select up to three **nonpilot** candidates from existing local evidence using a documented deterministic, reproducible rule independent of projected profit or manual cherry-picking. Exclude RC-P1/P2/P3, IP fixtures, duplicates and permanently excluded technical fixtures. Document address/identity gaps. Shortlisting is not MLS Round 1 selection and does not confer provider-ready or approval status.

If fewer than three satisfy the technical shortlist's integrity requirements, return the actual count and the blockers; do not force three.

### 17. Private manifest

Write only a gitignored `data/runtime/real-financial-evidence-v1/private-candidate-shortlist.json` containing opaque IDs, county source references, existing address components, identity status, provider references, missing evidence, acquisition readiness, exclusions, selection-rule version and fingerprints. No owner/contact information or public identifiers.

## PART G — CONTROLLED ACQUISITION PLAN (NOT EXECUTED)

### 18. Request-by-request budget

For no more than three candidates, specify each contemplated endpoint, input identity, expected evidence, calls per candidate, total calls, billing basis, rights, possible errors, retry policy and hard stop conditions. **Three properties does not mean three requests.** No execution or automatic retries.

### 19. Explicit cost ceiling

Propose a small monetary ceiling accounting for remaining included quota only if independently verified, $0.20 overages and any separate endpoint charges. Successful HTTP 200 responses may be billable even if unsuitable. If entitlement, endpoint-specific pricing or enforceable budget is unknown, classify `COST CLARIFICATION REQUIRED` and stop before acquisition.

### 20. Acquisition stop conditions

Stop for insufficient subject identity, missing rights, unknown endpoint entitlement, unenforceable ceiling, ambiguous/multiple results, exclusions, unexpected authentication/payment, unusable provenance, or retention restrictions. No fallback provider or retries without fresh authorization.

## PART H — FUTURE FINANCIAL READINESS

### 21. Evidence package proposal

Specify minimum private package: county identity, licensed complete address, RentCast ID, characteristics, sale history, subject valuation, comps and rationale, condition/rehab, acquisition, financing/holding/exit assumptions, investor hurdle, rights, dates, contradictions and missing fields. Do not build a persistent schema.

### 22. Preserve existing readiness gates

Use `FINANCIAL_INPUTS_SUFFICIENT`, `FINANCIAL_INPUTS_PARTIAL`, `FINANCIAL_INPUTS_INSUFFICIENT`. Provider response completeness is not ARV sufficiency. No real financial execution unless the certified preliminary contract passes.

### 23. Monte Carlo readiness mapping

Map prospective inputs to the unchanged certified engine: direct evidence, analyst estimates, investor assumptions, missing fields, distribution justification and dependence rationale. Do not alter models, economics, version pins or distributions.

## PART I — QA AND PRESERVATION

### 24. Read-only QA

Check source integrity; exact subject binding; product identity and rights; no secrets; no inferred APN/ATN; no address-only approval; no unrelated comps; no fabricated ARV/rehab/acquisition; no real calculations/reports; deterministic shortlist; request/cost accounting; exclusion preservation; zero calls/writes/selections; zero unexpected protected changes. Use targeted read-only tests, not historical output-regenerating suites.

### 25. Preservation

Hash before/after relevant county, ATTOM, RentCast, Rule C, preliminary V1, V3, decisions, protected v3, Monte Carlo, MAO, Investor V1.1, monitoring and Round 1 artifacts. No rebaseline, overwrite or retroactive revision.

## PART J — DELIVERABLES

### 26. Four shareable reports

Create:

1. `docs/PI_REAL_FINANCIAL_EVIDENCE_READINESS_V1.md`
2. `docs/PI_REAL_FINANCIAL_EVIDENCE_PROVIDER_MATRIX.md`
3. `docs/PI_REAL_FINANCIAL_EVIDENCE_ACQUISITION_PLAN.md`
4. `docs/PI_REAL_FINANCIAL_EVIDENCE_QA.md`

Include the exact 34-entry inventory, ATTOM field/product evidence, RentCast capabilities/entitlement, subject-binding and comps/ARV methods, deterministic shortlist methodology and counts, request/cost ceiling, rights, blockers and exact next authorization required. No real property identifiers/addresses in shareable reports.

### 27. Private outputs

Use `data/runtime/real-financial-evidence-v1/` (gitignored). Preserve private identifiers, source hashes and selection receipt. Exclude owner/contact data. Do not overwrite prior runtime evidence.

### 28. Final Codex response

```text
PI REAL FINANCIAL EVIDENCE READINESS V1

Existing ATTOM valuation capability: SUFFICIENT / PARTIAL / INSUFFICIENT
Existing ATTOM sold-comparable capability: SUFFICIENT / PARTIAL / INSUFFICIENT
RentCast valuation capability: VERIFIED / PARTIAL / UNKNOWN
RentCast sold-comparable capability: VERIFIED / PARTIAL / UNKNOWN
Subject-binding method: SUPPORTED / PARTIAL / BLOCKED
ARV methodology: PROPOSED / BLOCKED
Three nonpilot candidates: SELECTED / PARTIAL / BLOCKED
Financial evidence readiness: SUFFICIENT / PARTIAL / INSUFFICIENT
Provider rights: VERIFIED / CONDITIONAL / UNKNOWN
Request count proposed: N
Maximum proposed incremental cost: $X / UNKNOWN
Automated checks: X / X
Provider calls: 0
Database connections/writes: 0
Real financial analyses: 0
Round 1 selections: 0
Unexpected protected changes: 0

Final classification:
READY FOR CONTROLLED FINANCIAL ACQUISITION
or COST/RIGHTS CLARIFICATION REQUIRED
or EVIDENCE/METHODOLOGY BLOCKED
```

## PART K — HARD RESTRICTIONS AND STOP

### 29. Do not

- Call RentCast, ATTOM, DataTree, Google or county property services.
- Download additional ATTOM/county data, access MLS or query production databases.
- Create durable Properties, canonical approvals, analyst decisions or offers.
- Select MLS Round 1 properties or change exclusions.
- Execute real property-specific Monte Carlo or generate real investor PDFs.
- Modify V3, Rule C, preliminary V1, financial engines, report templates, monitoring or protected baselines.
- Install dependencies, migrate, deploy, rotate keys, or disclose credentials.
- Rewrite historical source evidence, certificates, manifests or prior QA outputs.

### Final stop condition

After the read-only assessment, shortlist, budget proposal, documentation and QA, **STOP FOR STAN/CHATGPT REVIEW**. No provider request, real financial analysis, database persistence, or Round 1 execution follows automatically.

**Expected result:** A concrete, costed and evidence-based plan to obtain real property-specific valuation/comparable information for up to three nonpilot Kern County candidates, without mistaking an as-is AVM for ARV or weakening identity and transaction safeguards. The next phase requires separate explicit authorization.
