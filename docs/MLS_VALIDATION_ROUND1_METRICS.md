# MLS Validation Round 1 — Preregistered Metrics

All definitions below are fixed before property selection or MLS disclosure. Round 1 has six coded properties. Report numerator, denominator, raw count, percentage, missingness, and per-property results; do not conceal small-sample uncertainty with a single score. Never define success as six good deals.

| Metric | Definition / calculation | Required interpretation |
|---|---|---|
| Realtor YES selection rate | `YES / 6 × 100` | Primary percentage of the six PI-selected properties the realtor believes deserve further investor investigation. Always show count (e.g. `n/6`). |
| Realtor YES-or-MAYBE rate | `(YES + MAYBE) / 6 × 100` | Secondary, broader investigation-interest measure; not the primary rate. |
| PI/realtor exact agreement | Count and percent with ordinal distance 0: INVESTIGATE↔YES, WATCH↔MAYBE, PASS↔NO. | Report the exact pairs, not just the total. |
| PI/realtor partial agreement | Count and percent with ordinal distance 1 on INVESTIGATE/WATCH/PASS ↔ YES/MAYBE/NO. | Explain direction (PI more positive or realtor more positive). |
| PI/realtor disagreement | Count and percent with ordinal distance 2 (INVESTIGATE↔NO or PASS↔YES). | Include evidence-backed failure/limitation classification, or unresolved. |
| Property-data material discrepancies | Number of material identity/characteristic fields per property; also number of properties with ≥1 material discrepancy / 6. | Count missing/not-comparable fields separately. Do not treat absent data as accurate. |
| Valuation credibility | Realtor classification of PI as CONSERVATIVE / REASONABLE / AGGRESSIVE for each meaningful comparison. | Report separately against realtor value opinion and comparable closed sale where available. Asking-price context is never a market-value benchmark. |
| Quantitative valuation variance | `(PI AVM - benchmark) / benchmark × 100`; only if a positive, comparable benchmark is legitimate. | Keep each benchmark type separate; report n, median absolute variance, signed median, range, and unavailable count. No composite blended benchmark. |
| PI range coverage | Count of legitimate realtor opinions/closed-sale benchmarks below, within, or above the PI valuation range. | Denominator is only legitimate comparable benchmarks. State that a six-case result is descriptive, not calibrated coverage. |
| Comp quality | Realtor rubric: STRONG / ACCEPTABLE / WEAK for each PI comp set. | Require brief reasons for recency, distance, property similarity, transaction/status reliability, and adjustments. Report category counts and missing evidence. |
| Economic credibility | Realtor classification of PI economics as CREDIBLE / QUESTIONABLE / UNREALISTIC, with rationale. | Evaluate against stated inputs and evidence, not as a claim of realized return. Any recalculation is a separate post-MLS what-if. |
| Off-market discovery | Count and percent with **NO ACTIVE MLS LISTING** at the defined review timestamp, among six with a determinate status. | Show unknown status separately and use determinate-status denominator. Never equate with selection quality. |
| Previously marketed opportunities | Counts with expired, withdrawn, cancelled, previously listed, and recent failed-sale evidence. | These categories may overlap; report both category counts and number of unique properties with any history. Do not infer seller intent. |
| Condition surprise | Properties where MLS-visible condition would materially alter rehab, MAO, Monte Carlo result, or PI disposition / 6. | List affected economic outputs and keep any recalculation outside the frozen baseline. |
| Unknown-information quality | For each PI material unknown, classify correctly labeled UNKNOWN, appropriately bounded, or unsupported certainty; summarize correct unknown handling / assessable unknowns. | Preserve as a positive metric. Denominator is assessable material unknown items, not all fields. Report missingness. |
| Distress-investigation relevance | Count where the distress evidence supports INVESTIGATE / WATCH / PASS on merits after independent review. | Separate distress signal usefulness from seller willingness/current marketability. Realtor judgment is not ground truth. |
| Monte Carlo adequacy | Per-property rubric on valuation, condition, hold period, downside, sensitivities, and whether revealed evidence was within modeled assumptions/range. | Keep actual outcomes and asking prices distinct. Classify outside-range evidence using the preregistered categories. |

## Evidence confidence and missingness

Every metric row must show `n=.../6`, `NOT RETURNED`, `NOT COMPARABLE`, or `UNRESOLVED` where applicable. Denominators may shrink only when the metric definition above explicitly permits a determinate/comparable subset; state the exact denominator and reason for every excluded observation. No evidence is not evidence of absence.

## Round-level interpretation

With six properties, metrics are descriptive. Do not report inferential claims of population performance or optimize the workflow to this sample. A result can be valuable even when PI and realtor disagree if it reveals a testable gap. Proposed product/model changes become Round 2 hypotheses; Round 1 definitions and outputs remain locked.
