# PI Monitoring Materiality Policy

Policy: `monitoring-materiality-v1.0.0`  
Status: `PROTOTYPE_POLICY_NOT_INVESTMENT_RULES`

Materiality is deterministic and explainable, but it is not a score or disposition change. The classifier considers identity status, geographic scope, source-code certainty, evidence class, publication-only status, event family, recency, whether the fact was previously known, current opportunity status, existing distress stage, and—only for the synthetic demonstration—an explicitly labeled LoanModel delta assumption.

| Result | Prototype meaning |
|---|---|
| `HIGH` | Confirmed/high-confidence NTS or auction timing event with confirmed identity and in-scope geography; verify promptly. It is a human-review candidate, not an automatic investment decision. |
| `MEDIUM` | Relevant recorded transaction/correction/mortgage/loan-model event requiring review. |
| `LOW` | Informational event, including a publication-only snapshot refresh. |
| `UNRESOLVED` | Identity, geography, event semantics, or evidence classification is not reliable; quarantine/review and suppress investor alert. |

The 30-day urgent-event recency window and LoanModel percent-delta comparison at `5%` are synthetic UI assumptions only. They are not PI operational service levels, legal conclusions, or established financial thresholds. No arbitrary dollar threshold is used. LoanModel changes are provider estimates, not recorded payoffs; no MAO, Monte Carlo, score, equity, or disposition recalculation occurs. Priority display is a diligence queue, not investment advice or an automatic disposition. A future policy requires investor/analyst review and empirical validation before operational use.
