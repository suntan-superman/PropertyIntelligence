# Property Intelligence V1.4 — Practical Underwriting

Status: **FUNCTIONING LOCALLY — STOPPED FOR REVIEW**  
Date: 2026-10-14  
Production deployment: **not performed**

## Local application

Open `http://127.0.0.1:4176/#property-detail`.

The existing local server is running and returned HTTP 200. To relaunch it with the verified Node 22 runtime:

```powershell
Set-Location -LiteralPath 'C:\Users\sjroy\Source\PropertyIntelligence'
& 'C:\Users\sjroy\AppData\Local\npm-cache\_npx\f6c81a5e22bed22a\node_modules\node\bin\node.exe' scripts/workbench-server.js --investment --property-detail --port 4176
```

## Implemented workflow

The local application now supports the intended sequence:

`Select Property → Review Evidence → Sold Sales → Underwriting → Risk → Reports`

- **Analyze Investment Opportunity** remains the primary Property Detail action; legacy Deal Mode remains available for compatibility.
- Durable saved Properties and the six Gabe candidates flow into the same subject-bound workspace.
- Scenario drafts, saved revisions, comparable decisions and map/table selection remain bound to the selected subject. Switching subjects clears local selection state.
- Unsaved drafts warn before browser navigation; local save/reopen remains supported.
- The Basic form now concentrates on purchase, rehabilitation, resale, renovation/marketing duration, financing choice and target return. Advanced settings retain every certified input.
- Cash financing hides irrelevant loan inputs; acquisition financing exposes the existing loan amount and rate assumptions.
- The illustrative expense preset is applied only through an explicit, confirmed action. It sets 10% contingency, 1.5% purchase closing, 5% commission, 1% seller closing, and daily taxes/insurance/utilities of $8/$3/$5. It never overwrites a saved scenario automatically and remains editable.
- Outputs show the complete existing cost waterfall, modeled profit, project ROI, cash-on-cash return, break-even purchase ceiling and hurdle-specific MAO.
- Blank seller asking price is displayed and modeled as **Unknown**, never `$0`.

## Comparable research

- Completed Sale events remain separate from active and inactive listings.
- The workspace displays retained sale price/date, address, distance, size, beds/baths, source status, analyst inclusion/exclusion and notes.
- Likely duplicate observations are grouped for reading only; source records are preserved.
- Map markers and table rows share selection state.
- Older sales and the lowest-price example are flagged for review. No unadjusted sale is automatically converted into ARV.
- A property without retained sales now shows **Find Recent Sold Properties** with the preflight estimate of one request, `$0.20` conservative exposure, and zero retries. V1.4 does not transmit the request; it remains default-deny pending an applicable request-bound authorization and reservation.

## Deterministic risk cases

The existing certified deterministic engine now evaluates three isolated cases without changing its formulas:

1. Resale price decreases 10%.
2. Rehabilitation cost increases 20%.
3. Holding duration increases 30 days.

Each output states the changed input, modeled profit, change from base and total project cost. They are deterministic stresses—not calibrated probabilities. Monte Carlo remains optional and continues to require explicit distributions.

## Haven Street MAO trace

The existing cash-on-cash calculation was independently reproduced with the certified legacy engine.

| Input state | Certified MAO |
| --- | ---: |
| Exit `$353,000`, 20% cash-on-cash hurdle, cash financing, rehabilitation `$0`, every modeled closing/holding/exit cost `$0` | `$294,166.66` |
| Same inputs plus exactly `$18,000` in disposition/exit cost | `$279,166.66` (displayed as approximately `$279,167`) |

Therefore, the visible exit value, 20% hurdle and zero rehabilitation cost alone do **not** produce `$279,167`. That result requires an `$18,000` disposition burden or an economically equivalent combination of omitted expenses. The mathematics was not altered. V1.4 makes all such costs visible in Basic/Advanced assumptions, the waterfall and the Full Report so the result can be audited instead of inferred.

## Reports and visual QA

The existing normalized report model and Puppeteer path were retained. V1.4 adds cash-on-cash and deterministic downside results, uses readable report header references, and retains full identifiers in metadata.

Final candidate output: `data/runtime/unified-v1-3/qa-Hm6IFi`

- Haven Opportunity Brief and Full Report were regenerated.
- GABE-01 Opportunity Brief and Full Report were regenerated.
- Briefs are two pages total: one analytical page plus the complete required county notice.
- GABE-01 Full Report is five pages with no blank or sparse spill page.
- Browser screenshots cover Haven evidence/underwriting, GABE-01 comparable research and GABE-05 thin/older evidence. Automated browser assertions also exercise the GABE-04 low-price case.
- Visual inspection confirmed readable references, complete cost/return labels, selected sale evidence, sensitivity tables, county notice and no page-bound overflow.

## Automated verification

| Verification | Result |
| --- | --- |
| V1.4 focused tests | `7/7 PASS`, `0 skipped` |
| Report + V1.4 focused tests | `30/30 PASS`, `0 skipped` |
| Complete investment-workspace regression selection | `356/356 PASS`, `0 skipped`, 20 files |
| Production Vite build | `PASS` |
| Browser/PDF QA | `PASS`, 57 checks, 4 PDFs, 0 errors, 0 blocked |
| Required cases | Haven, GABE-01, GABE-04 and GABE-05 exercised |
| External provider calls during V1.4 | `0` |
| Database connections/writes during V1.4 | `0 / 0` |
| New evidence acquisitions | `0` |

Regression output: `data/runtime/investment-workspace-v1/regressions-Ueb2Qq`  
Final browser/PDF output: `data/runtime/unified-v1-3/qa-Hm6IFi`

## Provider request and cost accounting

V1.4 used cached/local evidence only.

| Item | Count / exposure |
| --- | ---: |
| New V1.4 provider requests | `0` |
| New V1.4 incremental exposure | `$0.00` |
| Previously recorded Gabe demo requests | `18` |
| Previously reserved conservative exposure | `$3.60 / $20.00` |
| Unconsumed ceiling | `$16.40` |

The `$3.60` value remains a conservative reserve, not a claim about actual invoiced cost. The remaining ceiling is not standing authorization for another live request.

## Remaining functional issues

1. Haven has no retained recorded-sale evidence in the workspace. The new acquisition action is intentionally preflight-only until a current request-bound authorization and reservation are supplied.
2. Recorded Sale events remain provider-reported and unadjusted; escrow close, transfer terms, condition and arm's-length status are not independently verified.
3. Legal parcel identity, title, liens/payoff, occupancy and physical condition remain diligence items where evidence was not acquired.
4. Scenario persistence is local-only; no production database or deployment was changed.
5. The illustrative expense preset is a convenience hypothesis, not a local-market estimate.

V1.4 is functioning locally and is stopped for Stan/ChatGPT review.
