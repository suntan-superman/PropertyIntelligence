# Sprint 6 Screening Rules

The score is named **Investigation Priority Score** and uses version `kern-screen-v1`. It ranks analyst attention only; it is not an investment recommendation, return estimate or probability.

For the audited Power-to-Sell artifact, the intentionally sparse score is:

| Observed signal | Points | Rule |
| --- | ---: | --- |
| `IDENTIFIER_COMPLETE` | 25 | ATN or APN is present in the source row |
| `TAX_DEFAULT_AMOUNT` | 0/10/20/30/40 | Parcel amount is 0 / positive under $10,000 / $10,000–$24,999 / $25,000–$99,999 / $100,000+ |
| `REPEAT_SOURCE_EDITION` | 5 | A repeated edition is explicitly observed |
| `ADDRESS_RESOLVED` | 15 | An analyst supplies and confirms a complete address |
| `PROPERTY_LINKED` | 10 | Candidate is explicitly linked to a canonical Property |
| `INDEPENDENT_VALUE_AVAILABLE` | 10 | Existing independent evidence is linked |
| `MAO_AVAILABLE` | 10 | Existing Fix & Flip Acquisition Decision is linked |

The score is capped at 100. Bands are `HIGH_REVIEW_PRIORITY` (55–100), `MEDIUM_REVIEW_PRIORITY` (40–54), `LOW_REVIEW_PRIORITY` (20–39), and `INSUFFICIENT_DATA` (0–19). Every awarded point is stored as an opportunity signal and rendered in “Why this candidate is here.” Owner names never contribute points. Missing amount is unknown, not zero; no equity, mortgage, lien, condition or seller motivation is inferred.
