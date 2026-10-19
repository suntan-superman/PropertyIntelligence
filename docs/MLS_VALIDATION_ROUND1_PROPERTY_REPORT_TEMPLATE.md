# MLS Validation Round 1 — Property Report Template

Template only. Duplicate six times as `R1-P01` through `R1-P06` only after execution is separately authorized. This repository change creates no property report and contains no selected property data.

## Blind review packet — facts and realtor input

### Identity / characteristics

- Coded property: `R1-P__`
- Address / parcel identity (private reviewer copy only):
- Property class:
- Bedrooms / bathrooms:
- Living area and measurement definition:
- Year built:
- Lot size and measurement definition:
- Comparison result for each field: `MATCH / MINOR DIFFERENCE / MATERIAL DIFFERENCE / NOT COMPARABLE / NOT RETURNED`
- Source/date and evidence reference for each observation:

### PI PRE-MLS facts (provider identities masked where practical)

- PI valuation: frozen reference hidden until independent realtor opinion is locked:
- PI comparable evidence and comp set:
- PI condition baseline, normally `CONDITION UNKNOWN`:
- PI MAO and assumptions (frozen):
- PI Monte Carlo version, seed, iterations, percentiles, sensitivities (frozen):
- PI known unknowns and limitations:
- Pre-MLS report hash / evidence-stack hash:

### MLS EVIDENCE (manual realtor-supplied; permitted minimum only)

- MLS status and as-of timestamp:
- Current asking price:
- Original asking price:
- Price changes with dates:
- Days on market and definition:
- Pending activity:
- Closed sale (if any): price/date/transaction type:
- Prior listing history: active / pending / expired / withdrawn / cancelled / failed sale / none found / unknown:
- Property characteristics/condition observations needed for validation:
- Condition classification: `TURNKEY / LIGHT_COSMETIC / MODERATE_REHABILITATION / HEAVY_REHABILITATION / MAJOR_STRUCTURAL_OR_UNKNOWN / INSUFFICIENT_MLS_EVIDENCE`
- Evidence confidence, source/as-of date, lawful-use/retention note:
- MLS facts not available or not comparable:

### REALTOR PROFESSIONAL JUDGMENT — capture before PI conclusions are unblinded

- Deserves additional investor investigation: `YES / MAYBE / NO`
- Independent value opinion (optional): amount/range, date, confidence, basis:
- Comp quality: `STRONG / ACCEPTABLE / WEAK`, with rationale:
- Marketability/liquidity assessment:
- Economic credibility of the scenario inputs: `CREDIBLE / QUESTIONABLE / UNREALISTIC`, with rationale:
- Condition impact on rehab / MAO / Monte Carlo / disposition:
- Distress evidence relevance to investigation (separate from seller willingness):
- Material facts PI could not know pre-MLS:
- Reviewer comments/evidence references:
- Realtor submission lock/hash and timestamp:

## Post-review comparison — reveal only after realtor input is locked

- PI disposition: `INVESTIGATE / WATCH / PASS` (original frozen value):
- PI AVM and range (original frozen values):
- Realtor disposition: `YES / MAYBE / NO`:
- Agreement: `AGREE / PARTIAL AGREEMENT / DISAGREE`:
- Realtor valuation credibility for PI: `CONSERVATIVE / REASONABLE / AGGRESSIVE`:
- Quantitative variance vs. realtor opinion (if legitimate):
- Quantitative variance vs. comparable closed sale (if legitimate):
- Asking-price variance (context only; not a value-accuracy metric):
- PI range coverage: below / within / above / not comparable:
- Off-market status: `NO ACTIVE MLS LISTING / ACTIVE / OTHER / UNKNOWN` (as of timestamp):
- Property-data material discrepancy count and details:
- Condition surprise with economic consequences:
- PI unknown-information quality review:
- Distress relevance vs. current seller willingness:
- Monte Carlo diagnostic and outside-range classification:
- Primary / secondary failure category, or `UNRESOLVED / INSUFFICIENT EVIDENCE`:
- Evidence-supported explanation:
- POST-MLS WHAT-IF (optional; new version, separate inputs, never overwrites baseline):
- Round 1 finding / Round 2 hypothesis:

## Integrity and handling

- Frozen PI report SHA-256:
- Frozen source-evidence manifest SHA-256:
- Locked assumptions / model / Monte Carlo versions:
- Realtor submission SHA-256:
- Comparison version and timestamp:
- MLS retention/deletion requirement and completion:

Do not omit poor outcomes. Shareable copies use only the R1-P## code and contain no address, owner/contact information, raw MLS content, or unauthorized listing images/text.
