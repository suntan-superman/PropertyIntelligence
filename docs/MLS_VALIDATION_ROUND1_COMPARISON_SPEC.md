# MLS Validation Round 1 — Comparison Specification

## Purpose and non-goals

This is a preregistered, post-review comparison for six frozen Property Intelligence (PI) analyses in Kern County, California, Single Family Residential. It evaluates whether the pre-MLS process was informative and where it was limited. It is not a deal-selection exercise, MLS integration, or permission to run Round 1. Current execution authorization is **false**.

The comparison must preserve three independent evidence layers:

1. **PI PRE-MLS ANALYSIS** — immutable report, evidence, assumptions, disposition, economic model, and Monte Carlo output frozen before MLS review.
2. **MLS EVIDENCE** — limited facts manually supplied by a licensed realtor, with observation/as-of dates and permitted source references.
3. **REALTOR PROFESSIONAL JUDGMENT** — independent opinion and rationale, recorded separately from MLS facts and PI conclusions.

Never merge MLS facts or realtor opinion into the pre-MLS evidence stack or regenerate the original PI report. Corrections to an actual pre-freeze source error must be separately documented; they do not silently revise the frozen baseline.

## Required sequence

1. Obtain a separate explicit execution authorization; confirm the manifest gate is true before any selection. The current manifest is false.
2. Freeze selection eligibility, cohort snapshot, deterministic seed, model/evidence versions, assumptions, MAO methodology, Monte Carlo methodology, disposition rubric, metric definitions, and this protocol before looking at MLS information.
3. Select six eligible properties without ranking by PI score, disposition, valuation, suspected listing state, expected realtor response, or perceived attractiveness. Preserve cohort and selection hashes and all exclusions by reason.
4. Produce each normal PI analysis using the authorized evidence stack. No MLS-derived fact may enter it. Freeze six complete report packages and hash their report, source evidence references, assumptions, and model outputs. Lock the selections and versions.
5. Give the realtor a consistent, blinded review packet and scorecard. Do not reveal desired outcomes, PI team rankings, expected listing status, or provider identity. For independent judgment, collect and lock the realtor's value opinion and disposition before revealing PI disposition or valuation conclusions. The realtor may inspect the factual frozen report and comp evidence needed to score them; provider names should be masked where practical.
6. Realtor manually supplies only MLS validation evidence permitted for this private review. Record review/as-of dates. Do not scrape, automate MLS access, bypass authentication, or retain/distribute MLS content beyond licensed permission.
7. After realtor review is locked, compare the three layers using the definitions below. Missing evidence stays missing; an absent field is not a negative finding. Do not change frozen PI reports or round definitions.
8. Publish all six coded results, failures, unknowns, denominators, and limitations. Add any useful alternate economics as a clearly labeled **POST-MLS WHAT-IF** with new inputs/version; never substitute it for PI PRE-MLS ANALYSIS.

## Blinding and independence

Provide the realtor the same frozen factual property packet and scorecard format for all six, plus the MLS-review task. Ask for candid judgment before sharing PI's final disposition/AVM outputs. Do not tell the realtor which properties PI developers favor, expect to be off-market, or personally rank; do not identify which provider generated a valuation. The reviewer may need to see PI comps to assess comp quality, but record their independent value opinion first and make any later unblinding explicit. Preserve the original blinded submission and any later addendum separately.

## Property identity and characteristic comparison

For each coded property compare address/parcel identity, type, beds/baths, living area, year built, and lot size when comparable. Address or parcel mismatch is an **IDENTITY FAILURE** candidate and must be resolved/documented before interpreting other differences.

Use these preregistered default difference bands unless a stricter source-specific rule is justified and locked before selection:

| Field | MATCH | MINOR DIFFERENCE | MATERIAL DIFFERENCE |
|---|---|---|---|
| Property type / identity | Same identity and residential type | Terminology-only difference | Different parcel/property or incompatible type |
| Bedrooms / bathrooms | Exact | One-room/fixture count variance, explain source convention | Larger discrepancy or functional layout change |
| Living area | Within 5% | >5% and <10% | ≥10% or ≥200 sq ft, whichever threshold is reached first |
| Year built | Exact or within 1 year | 2–5 years | >5 years or materially different effective-age evidence |
| Lot size | Within 10% where units/boundaries are comparable | >10% and <20% | ≥20% or parcel-boundary/lot identity conflict |

These bands are a consistent starting rubric, not claims about legal/tax standards. If source definitions differ (gross vs. living area, assessor vs. measured area, parcel vs. usable acreage), record **NOT COMPARABLE** for that measurement rather than forcing a numerical comparison. For all fields, `NOT COMPARABLE` means the measures or evidence cannot be reconciled; `NOT RETURNED`/unknown is recorded separately and never scored as a match.

## Valuation comparison

Keep these categories distinct in every display and calculation:

- **PI AVM** and **PI valuation range** — pre-MLS model outputs.
- **PI comparable evidence** — the comps and their source, date, status, and quality.
- **MLS asking price** — price sought at a dated observation; never market value by itself.
- **Original asking price** and **price reductions** — listing history facts with dates.
- **MLS closed sale price** — a transaction observation, with close date and comparability caveats.
- **REALTOR OPINION OF VALUE** — professional opinion, with date, basis, and confidence; not a closed transaction.

Calculate `(PI AVM - benchmark) / benchmark` only when the benchmark is positive and independently meaningful. Report separate variances against realtor opinion and any genuinely comparable closed sale; never combine them into one benchmark. For the PI range, report whether an appropriate benchmark lies below, within, or above the range. Asking-price variance may be shown as **asking-price context only** and must not be labeled valuation error. Avoid percentages when the denominator is zero/unknown or comparison is not defensible.

Realtor valuation credibility for PI is `CONSERVATIVE`, `REASONABLE`, or `AGGRESSIVE`, with written rationale tied to available closed evidence, condition, and market date. Report a directional category for each relevant benchmark; do not imply the realtor opinion is ground truth.

## Condition and economic impact

PI's baseline should normally say **CONDITION UNKNOWN** unless a pre-MLS independent source supports another assumption. Realtor classifies visible MLS condition as `TURNKEY`, `LIGHT_COSMETIC`, `MODERATE_REHABILITATION`, `HEAVY_REHABILITATION`, `MAJOR_STRUCTURAL_OR_UNKNOWN`, or `INSUFFICIENT_MLS_EVIDENCE`. Record only the minimum factual MLS evidence needed to support the category.

For each property state whether that evidence would materially change rehab assumptions, MAO, Monte Carlo outcomes, or disposition. A changed MAO or simulation belongs only in a separately versioned POST-MLS WHAT-IF. Do not rewrite the pre-MLS model or tune a simulation to the observed asking price.

## Marketability and distress relevance

Record MLS status and as-of date, days on market, listing/price-change history, pending activity, and failed/expired/withdrawn/cancelled history where the realtor can lawfully verify them. Compare this with realtor marketability/liquidity judgment and identify factors PI could not see pre-MLS.

Answer independently: **Did the distress evidence PI used identify a property worthy of further investigation?** This is not the same as **Is the seller currently willing to transact?** A distressed, unlisted, listed, pending, or unavailable property is not automatically a good/bad PI selection.

## PI/realtor disposition agreement

PI dispositions are `INVESTIGATE`, `WATCH`, `PASS`; realtor judgments are `YES`, `MAYBE`, `NO` (deserves further investor investigation). Encode each on an ordinal scale `INVESTIGATE/YES=2`, `WATCH/MAYBE=1`, `PASS/NO=0` for agreement summaries:

- difference 0 → `AGREE` (exact agreement);
- difference 1 → `PARTIAL AGREEMENT`;
- difference 2 → `DISAGREE`.

Also preserve the original words, independent rationale, and evidence. Do not alter the original PI disposition. Realtor `YES` and `MAYBE` should be reported separately; the primary selection-quality measure is `YES`.

## Failure / limitation taxonomy

When evidence supports a cause, assign one primary and optional secondary category: `IDENTITY FAILURE`, `PROPERTY DATA FAILURE`, `DISTRESS DATA FAILURE`, `VALUATION FAILURE`, `COMP SELECTION FAILURE`, `MORTGAGE / EQUITY FAILURE`, `TITLE / LIEN GAP`, `CONDITION GAP`, `MARKET LIQUIDITY GAP`, `ECONOMIC MODEL FAILURE`, `MONTE CARLO ASSUMPTION FAILURE`, `SELLER INTENT UNKNOWN`, `OTHER`. Record the specific evidence and causal chain. Do not classify disagreement alone as a PI failure; allow `UNRESOLVED / INSUFFICIENT EVIDENCE`.

## Monte Carlo review

Assess whether the pre-MLS uncertainty model represented reasonable uncertainty in valuation, condition, hold period, downside, and sensitivities; ask whether the newly revealed evidence fell inside or outside preregistered assumptions and modeled ranges. Do not judge only by whether asking price is near P50. If evidence is outside the modeled range, classify `MODEL RANGE TOO NARROW`, `UNEXPECTED EXTERNAL FACTOR`, `BAD SOURCE EVIDENCE`, `ASSUMPTION ERROR`, or `OTHER`, with evidence. Never individually tune distributions after seeing outcomes. Any methodological revision is **VERSION 2**, prospectively tested in a later round.

## Protection against post-hoc tuning

After MLS reveal, do not change Round 1 thresholds, assumptions, comp logic, Monte Carlo distributions, PI disposition, frozen reports, or the six-property sample; do not omit an embarrassing result or substitute a property. Record improvements as `ROUND 1 FINDING` and propose them for Round 2. Preserve freeze hashes and add versioned appendices rather than editing frozen artifacts.

## MLS privacy and evidence handling

No scraper, automated MLS access, authentication bypass, or representation that PI itself has MLS access. Realtor manually supplies only evidence necessary for validation. Store MLS-derived material only where permitted and for the permitted duration; prefer minimal structured observations, private access controls, and source references over copying listing text/photos. Do not redistribute MLS content. Keep reviewer materials and any identity crosswalk private; public/shareable outputs use R1-P01–R1-P06 and omit addresses and personal information.

## Round 1 success criterion

Success means learning whether PI's process is reliable and where its limits are—not finding six attractive deals. Correct rejection, useful watch, identifying active listings while surfacing a worthwhile opportunity, a condition surprise, or a documented model/data failure can all be valid experimental outcomes. Report all six outcomes without selection bias.
