# Property Intelligence — Sprint 6.1
## Investment Analysis PDF & Reporting Foundation

**PI:** `C:\Users\sjroy\Source\PropertyIntelligence`
**Reference:** `C:\Users\sjroy\Source\HomeAdvisor\apps\web`
**Language:** JavaScript only
**Scope:** reporting/presentation only; no new analytical formulas/providers.
**Primary output:** Full Investment Analysis PDF. Short Acquisition Summary is future groundwork.

## Mission
Create an investor-grade PDF from existing persisted Property, Evidence, Deal, Encumbrance, Condition/Rehab, Analysis, MAO/Acquisition Decision, scenarios, diligence and provenance.

The PDF is a presentation layer. It must consume exact persisted snapshots and must never silently recalculate, fill unknowns, or substitute latest evidence for historical evidence.

## Style
Investment-committee/underwriting package, not seller brochure: restrained, professional, financially legible, evidence-aware, compact, explicit unknowns/conflicts, visible provenance. Avoid marketing language, huge KPI fonts, decorative charts, repeated maps, large blank areas and buy/don't-buy styling.

## Hard boundaries
Allowed: Home Advisor PDF audit, copied/adapted rendering patterns, report view-model, local/server PDF generation, tables/charts/maps if reliable, headers/footers/page numbers, appendices, fixtures, visual regression, existing reports metadata.

Forbidden: runtime dependency on HomeAdvisor, modifying HomeAdvisor, formula/MAO/screening changes, Monte Carlo, Kern Assessor/GIS, new providers/RentCast calls, inferred missing values, new investment recommendations, Buy & Hold/BRRRR/Wholesale, workbench redesign, breaking protected PDFs.

Automated report QA: zero provider calls.

## Home Advisor audit FIRST
Inspect actual Home Advisor implementation. Document renderer/library, server/browser generation, templates, page size/margins/fonts/type scale, headers/footers/page numbers, tables, images/maps/charts, page breaks, continuation logic, wrapping, missing-data behavior, download flow, fixtures/QA and known limitations.

Create `docs/HOME_ADVISOR_PDF_AUDIT.md`.

Do not assume implementation from memory.

## Reuse policy
Copy/adapt useful patterns into PropertyIntelligence; no cross-project production imports. Remove HomeAdvisor assumptions and add PI tests. PI must build if HomeAdvisor folder is absent. Add a source/build check proving no runtime path references HomeAdvisor.

## Renderer decision
Preference:
1. existing PI renderer if adequate;
2. proven Home Advisor pattern;
3. new dependency only if both inadequate.

Document in `docs/SPRINT6_1_REPORT_ARCHITECTURE.md`.

Do not replace renderer for novelty.

## Report view-model
Create immutable report model:
`reportMeta, property, propertyDetails, evidenceSummary, valuation, comparables, deal, encumbrances, condition, rehab, economics, maoDecision, scenarios, sensitivity, diligence, sources, methodology`.

It must reference exact Evidence Snapshot, Analysis Snapshot and Acquisition Decision; preserve timestamps/provenance/status/unknown/conflicting/incomplete states. Historical report never substitutes latest evidence.

## Report metadata/fingerprint
Use existing reports table if adequate; avoid migration unless truly required.

Metadata: reportType, propertyId, dealId, analysisSnapshotId, acquisitionDecisionId, evidenceSnapshotId, generatedAt, reportModelFingerprint, rendererVersion, status, storageReference nullable.

Fingerprint uses durable IDs + normalized report content + renderer version + report type, excluding generation timestamp.

Binary durable storage is not required this sprint unless already safely supported.

## Full report sections

### 1 Cover / Investment Snapshot
Address, `Investment Analysis`, strategy Fix & Flip, report date, optional existing property image only if already available, selected hurdle, exit basis, MAO, Walk-Away, Target, independent valuation/range, completeness. No “Recommended Buy.”

### 2 Executive Acquisition Summary
Aim one page: Seller Ask, Target, MAO, Walk-Away, selected exit, independent low/point/high, rehab, known encumbrances, unknown count, modeled cash invested/profit/return/break-even/hold where applicable, completeness, top 3–6 unresolved material diligence items. Unknown displays Unknown/Not supplied, never $0.

### 3 Property Intelligence
Available address/type/beds/baths/SF/lot/year/APN/county/zoning/legal/assessment/taxes/last sale/features. No raw provider JSON. Existing anomaly status may show `Provider-reported — review recommended`.

### 4 Valuation & Exit Evidence
Independent Low/Point/High, analyst/sponsor exit, selected basis, conflict, source/retrieval date. Coherent range visualization. If outside range, neutral delta statement.

### 5 Comparable Properties
Map only if reliable in PDF. Primary page: deterministic 6–8 most relevant retained comps; appendix contains all retained comps. Show address, price/status, distance, size, beds/baths, year, useful existing fields. Distinguish closed/listing where known. Report model retains all comps.

### 6 Acquisition & Encumbrances
Seller ask/auction constraint, mortgage/payoff observations, taxes/liens, amount status/source/as-of/payoff verified/priority known, known total, unknown count, gap vs MAO.

Include: `Property/seller encumbrances affect title clearance, seller proceeds and negotiation constraints. They are not automatically added to investor project costs.`

Never call reported mortgage a verified payoff.

### 7 Condition & Rehabilitation
Category/status/cost/source/notes table; base rehab, unallocated, contingency, total. Work without cost => `Cost not supplied`. No assessment => `Property condition has not been assessed.` No inference.

### 8 Investment Economics
Use exact Analysis Snapshot only. Acquisition, Rehab, Holding, Disposition, then proceeds/cash invested/total project cost if defined/profit/CoC/selected metric/break-even. Separate known modeled costs from excluded unknowns. No report-specific economics formulas.

### 9 Signature MAO Page
Show selected required-return definition/rate and table:
Independent Low MAO
Independent Point MAO
Independent High MAO
Analyst/Sponsor MAO where available
Selected MAO
Walk-Away
Target
Seller Ask

Add proportional negotiation scale where inputs exist. Show completeness, encumbrances/gap/material unknowns.

Include: `MAO is the highest modeled purchase price satisfying the selected return hurdle under the stated assumptions. It is not a guarantee of return or an investment recommendation.`

### 10 Sensitivity / Downside
Existing deterministic Exit×Rehab MAO matrix, existing scenarios/holding sensitivity where appropriate. Preserve unavailable/partial. No Monte Carlo/probability/invented scenarios.

### 11 Evidence & Due Diligence
Existing evidence summary + deterministic questions grouped by identity, valuation, acquisition, title/encumbrances, repairs/condition, holding/financing, schedule, other costs, manufactured/community only if applicable. Status Available/Partial/Conflicting/Not available/Needs verification.

### 12 Sources & Methodology
Concise sources/timestamps/county discovery source, Evidence/Analysis/Decision IDs or abbreviated audit refs, MAO engine version, hurdle definition, renderer version. Explain unknown-vs-zero, independent-vs-analyst evidence, encumbrance treatment, deterministic scenarios and limitations.

### Appendix
All retained comps, detailed evidence/provenance, full diligence, condition/encumbrance detail, methodology as needed.

## Headers/footers
Non-cover: abbreviated address, report/section, generated date, page X/Y if reliable, PI branding. Continuation pages identify section.

## Pagination/overflow rules
Handle long legal descriptions, 15+ comps, many diligence questions/encumbrances, large rehab tables, long notes, missing sections, manufactured questions, long sources.

No clipped text/footer overlap/blank trailing page/stranded heading. Repeat table headers and section context. Avoid row split where supported and accidental large whitespace.

## Missing data
Use consistent explicit labels:
`Unknown`, `Not supplied`, `Not assessed`, `Not available`, `Not applicable`, `Needs verification`.

Do not use ambiguous dash for zero-vs-unknown. Explicit zero displays 0/$0 where meaningful.

## Visual hierarchy
Restrained PI palette; dark neutral text, one accent, accessible warning/conflict treatment, light table rules. Do not rely on color alone. Consistent aligned financial figures/tabular numerals if available.

## Charts
Only useful: valuation range, MAO/negotiation scale, sensitivity matrix, compact cost breakdown if valuable. No decorative pie charts. Every chart has sufficient text/table equivalent.

## Generation workflow
From saved Deal/Acquisition Decision:
1. load exact linked Property/Evidence/Analysis/Decision;
2. build report model;
3. validate linkage/completeness;
4. render;
5. return/download;
6. optionally persist metadata.

No provider call. Missing required historical linkage => explicit error; never substitute latest.

## API
Use durable IDs rather than browser-supplied analytical payload. Server validates Property/Deal/Evidence/Analysis/Decision linkage and reconstructs report model. Prevent cross-property mismatch.

## Fixture laboratory
Synthetic fixtures:
1 complete conventional SFR
2 sparse/incomplete
3 sponsor exit conflict
4 many encumbrances + unknown
5 large rehab
6 all 15 comps
7 long legal description
8 many diligence questions
9 manufactured
10 explicit-zero
11 no condition
12 historical decision/older evidence
13 long notes/sources
14 minimal report
15 extreme dollar values

No private owner data.

## PDF visual QA
Render key fixtures; inspect page counts/text and render pages to images using existing QA tooling where available. Check overflow/clipping/continuation/table headers. Avoid OCR unless existing QA truly requires it.

Create `docs/SPRINT6_1_PDF_QA.md`.

## Mathematical reconciliation
Tests must assert report model values equal persisted sources:
- MAO/Walk-Away/Target == Acquisition Decision
- encumbrance total/unknown count preserved
- profit/CoC/break-even == Analysis Snapshot
- independent valuation == linked Evidence
- comp count == retained snapshot
- hurdle type/rate exact

Any mismatch = STOP.

## Historical immutability test
Generate Decision #1 report; create Decision #2; regenerate Decision #1. Analytical content for #1 must remain unchanged. No latest-evidence substitution.

## Existing PDF protection
All current PI PDF/report regressions remain green. Do not replace old renderer wholesale if it breaks protected outputs. Separate template/renderer is acceptable.

## Performance
Measure render time and file size for complete fixture. Set sensible timeout/size guardrails. Avoid enormous embedded images. No external provider dependency.

## Security
No DB URL/secrets/raw private credentials in PDF, metadata, browser bundle, logs or artifacts. Sanitize internal errors. Server-side persistence only. Report may show business evidence/provenance appropriate to the selected record but not secret infrastructure metadata.

## QA commands
Add appropriate:
`npm run report:investment:test`
`npm run report:investment:qa`
and integrate into `npm run sprint6.1:qa`.

Full Sprint 1–6 regressions remain green. Zero provider calls.

## Deployment gates
1 protect/hash artifacts
2 Home Advisor audit
3 renderer decision
4 report model
5 synthetic fixtures
6 local PDF generation
7 mathematical reconciliation
8 visual/pagination QA
9 historical immutability
10 existing PDF regressions
11 full regression/security
12 deploy preview
13 preview health
14 generate at least complete + sparse + long-content reports through deployed API if PDF runtime is supported
15 verify zero provider calls/credential scans
16 STOP for production authorization

If deployed Netlify PDF generation is not supported by current renderer, do not force it with insecure/brittle hacks. Certify local generation and document runtime limitation; still preview-certify UI/API boundaries where applicable.

## Acceptance
GO only if:
- Home Advisor audit is factual
- PI has no HomeAdvisor runtime dependency
- report consumes exact persisted snapshots
- no report-specific analytical recalculation
- unknown/zero preserved
- full report renders complete/sparse/long cases
- pagination has no clipping/overlap/orphan context
- all 15 comps retained in model/appendix
- MAO page reconciles exactly
- historical Decision #1 report remains stable after #2
- existing PDFs remain protected
- zero provider calls
- security/credential scans pass
- preview passes to extent runtime supports PDF
- production remains separately authorized

## Documentation
Create:
- `docs/HOME_ADVISOR_PDF_AUDIT.md`
- `docs/SPRINT6_1_REPORT_ARCHITECTURE.md`
- `docs/SPRINT6_1_REPORT_MODEL.md`
- `docs/SPRINT6_1_PDF_QA.md`
- `docs/SPRINT6_1_COMPLETION_REPORT.md`

## Completion report
Include Home Advisor audit findings, renderer decision, files changed, report architecture/pages, view-model/fingerprint, fixtures, pagination rules, reconciliation results, historical test, render time/file size, PDF regression, preview/runtime result, provider calls, security scans, deferred items, production recommendation, STOP.

## Final principle
The report does not create a new truth. It presents the exact Property Intelligence evidence and decisions that already exist, including uncertainty and missing information, in a professional package that another investor can audit.

**STOP after deploy-preview certification for Stan/ChatGPT review before production.**
