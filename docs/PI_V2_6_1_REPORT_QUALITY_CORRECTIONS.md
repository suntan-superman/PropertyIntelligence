# Property Intelligence V2.6.1 — Focused Investor Report Corrections

**Local certification completed:** 19 October 2026  
**Disposition:** GO for local report quality; NO-GO for public deployment or investor distribution.

## Scope

This pass corrected presentation, pagination and evidence-disclosure defects in the Decatur Opportunity Brief and Full Investor Package. It did not modify the certified financial or Monte Carlo engines, saved scenario inputs, Firebase/Firestore/Storage data, provider evidence, authentication, attachment bytes or historical report revisions.

The certification was offline. It performed zero provider requests, Firebase reads/writes, Storage reads/writes, uploads, deployments or live-data mutations.

## Implemented corrections

| Defect | Correction | Result |
| --- | --- | --- |
| Financial ledger was compressed into a narrow two-column layout | Replaced it with a dedicated full-width input-ledger page; values use nonbreaking tabular formatting and short evidence states | No split money, stacked filenames, clipped headers or horizontal overflow |
| Returns and sensitivity spilled onto a sparse page | Created a substantive `Modeled costs, returns & purchase limits` page | No dangling returns page |
| Comparable/evidence content spilled onto a sparse page | Separated property/evidence context from the comparable-sales hierarchy | Comparable page is substantive and decision-oriented |
| Technical provenance left one sentence on its own page | Moved the sentence into the parent provenance introduction | No dangling provenance page |
| Brief evidence page did not explain whether attachments were embedded | Renamed it `Supporting evidence references (not attached)` | Deliberate supplementary page is unambiguous |
| Supporting-document filenames appeared beside claims | Replaced normal-view filenames with `Linked (n)` and appendix references; complete source detail remains in the appendix register/audit metadata | Private filenames and IDs are not exposed in the report body |
| Many linked documents could overflow the ledger | Ledger now uses compact `Linked (n)` status regardless of document count | A 16-document fixture has no horizontal overflow |
| Zero Primary comparables was not prominent enough | Added Primary, Secondary, Unclassified and Excluded counts plus `Comparable-supported ARV not established` | No comparable-derived ARV is fabricated |
| Document/scenario differences remained unreconciled despite local QA values | Added a reporting-layer workflow that accepts only analyst-confirmed, page-specific, semantically matching structured amounts from CLEAN, reviewed, redistributable immutable versions | Exact signed differences are shown without OCR or input mutation |
| A report with no simulation could omit that fact | Added `Monte Carlo not requested` disclosure | No synthetic risk result is substituted |

## Synthetic discrepancy demonstration

The local-only fixture uses analyst-entered and explicitly confirmed structured values. It does not extract values with OCR, change scenario inputs, or establish authentic Decatur facts.

| Claim | Scenario | Analyst-entered document value | Signed difference | Report result |
| --- | ---: | ---: | ---: | --- |
| Original recorded principal | $100,000.00 | $150,000.00, page 1 | +$50,000.00 | DIFFERENCE — REVIEW |
| Lender payoff amount | $101,000.00 | $134,912.66, page 1 | +$33,912.66 | DIFFERENCE — REVIEW |
| Rehabilitation estimate | $35,000.00 | $30,000.00, page 2 | −$5,000.00 | DIFFERENCE — REVIEW |

The estimated-balance links are reported as `NOT COMPARABLE` because recorded principal, current estimated balance and payoff are distinct financial concepts.

## Decatur output and visual QA

Output directory:

`data/validation/pi-v2-6-1-report-quality-corrections/run-2026-10-19T19-21-55-579Z`

| Report | V2.6 baseline | V2.6.1 | SHA-256 |
| --- | ---: | ---: | --- |
| Opportunity Brief | 3 pages | 3 pages | `e7ce90549fa74e8d449d9b955094527b4f959b49334c28edf25713a5bb00c67f` |
| Full Investor Package | 22 pages | 21 pages | `21ec4304c4ca8760ba36dc67c8f98c763cd2ba6ac44bb1be756d4a2d8d2a0f04` |

Every page of both PDFs was rendered into contact sheets and visually reviewed. The targeted comparison covers old Full pages 3, 5, 6, 8 and 11 plus Brief page 3. Appendix provenance covers remain intentionally separate, and the complete Kern County notice remains a substantive dedicated page.

Artifacts:

- `Decatur-brief-after.pdf`
- `Decatur-full-after.pdf`
- `Decatur-brief-after-all-pages.png`
- `Decatur-full-after-all-pages.png`
- `Decatur-V2.6-to-V2.6.1-targeted-before-after.png`
- `visual-qa-index.html`
- `qa-summary.json`

The three selected synthetic PDFs remain conspicuously labeled. Their expected fixture SHA-256 hashes were checked before generation. The package contains exactly those three appendices; the fourth historical document is absent.

## Property-agnostic layout resilience

Five additional synthetic full-package fixtures passed HTML and PDF layout checks:

| Fixture | Pages | Result |
| --- | ---: | --- |
| No comparables/documents; many unknown fields | 14 | PASS |
| Three Primary plus ten Secondary comparables with long addresses | 17 | PASS |
| Sixteen supporting documents, multiple links and many lien rows | 16 | PASS |
| Large valid dollar values, long sources and multiple appendix pages | 23 | PASS |
| No Monte Carlo result and incomplete cost assumptions | 10 | PASS |

All fixtures passed: no out-of-bounds text, horizontal overflow, blank/orphan content page, remote asset, private path or fabricated missing value.

## Calculation and security regression

The before/after certified projections are deeply equal. Presentation changes did not alter calculations.

- Modeled spread after entered costs: $55,000.00
- Project ROI: 29.7297297297%
- Cash-on-cash return: 29.7297297297%
- Return-hurdle MAO: $169,000.00
- Monte Carlo profit P10 / P50 / P90: $47,362.321 / $56,753.88 / $65,336.813

Focused report, financial, Monte Carlo, inline-evidence, Firestore eligibility and document-security tests: **123 passed, 0 failed** on Node 22.12.0.

The QA generator additionally asserts source hashes, exactly three appendices, no fourth document, page numbering, QA warnings, appendix index coverage, no private paths, no remote resources, layout bounds and deterministic/Monte Carlo invariance.

## Remaining boundaries

- Cost completeness remains incomplete; $55,000 is an illustrative modeled spread after entered costs, not estimated net profit.
- Comparable-supported ARV is not established because Decatur has zero designated Primary comparables.
- Provider redistribution rights and real diligence remain unresolved.
- Synthetic document values are QA demonstrations, not authentic property facts.
- The structured-amount proof is intentionally reporting-layer/local-fixture only. No new production entry UI or persistence schema was introduced; adding durable analyst entry would be a separately scoped workflow change.
- No public deployment or external distribution was authorized or performed.

## Recommendation

**GO — local report-quality implementation and private-development review.**  
**NO-GO — investor distribution, public deployment or reliance on the Decatur analysis as completed diligence.**

