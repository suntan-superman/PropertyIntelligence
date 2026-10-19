# PI V2.0 — Seller Financial Position and Mortgage Evidence UX

Date: 2026-10-15  
Status: PASS — LOCAL IMPLEMENTATION AND OFFLINE QA

## Outcome

Property research now includes a visible **Seller Financial Position** tab. Mortgage, payoff, lien, delinquent-tax and proposed-sale evidence is stored in the existing revisioned `analystEvidence` collection; no second mortgage store or production schema was introduced.

The workflow keeps seller obligations separate from investor acquisition financing. Seller debt is not passed to the certified acquisition engine, is not added to project costs, and does not alter MAO.

## Evidence captured

- Original recorded mortgage amount — historical principal only; never treated as a current balance.
- Estimated outstanding mortgage balance — labeled as a provider or analyst estimate, never as payoff evidence.
- Verified payoff — requires independently verified evidence with a source and date; supersedes the estimate for the illustration.
- Other liens — supports multiple separately sourced entries.
- Delinquent property taxes — separately sourced and dated.
- Analyst proposed sale price — labeled as an analyst assumption.

Each item retains the existing evidence status, source, source date, verification class, notes and revision history. Unknown values remain unknown rather than becoming zero.

## Illustrative calculations

Mortgage obligation precedence is:

1. current independently verified payoff, when supplied;
2. otherwise the estimated outstanding balance;
3. never the original recorded principal.

`Known obligations = mortgage obligation used + known liens + known delinquent taxes`

`Illustrative gross equity = selected property valuation - known obligations`

`Estimated seller proceeds = analyst proposed sale price - known obligations`

Gross equity and proceeds remain unavailable when required obligation evidence is missing or explicitly unknown. The results exclude commissions, closing costs, repairs, concessions, taxes due at closing, prepayment charges and unresolved obligations. Negative results receive a visible negative-equity warning.

## Full Investor Package

The Full Investor Package now contains a dedicated **Seller Financial Position** page with amount, evidence/uncertainty and source/date columns. The Opportunity Brief is unchanged. The new page explicitly states that seller obligations are not acquisition expenses, investor financing or MAO inputs.

The QA example demonstrates:

- selected provider valuation: $291,000;
- original recorded principal: $240,000, excluded from the current-obligation subtotal;
- estimated balance: $175,000;
- verified payoff used: $168,500;
- two known liens: $10,000 total;
- delinquent taxes: $2,200;
- known obligations: $180,700;
- illustrative gross equity: $110,300;
- analyst proposed sale price: $310,000;
- estimated seller proceeds before omitted costs: $129,300.

## QA results

- Seller-position unit and report tests: 6/6 PASS.
- Focused workspace, report, property-detail, contextual-help and financial regression selection: 121/121 PASS, 0 skipped.
- Browser/report QA: 18/18 PASS.
- Certified MAO QA: 10/10 PASS.
- Production web build: PASS (64 modules transformed).
- Full Investor Package: 7/7 pages nonblank; seller page visually inspected with no clipping or overflow.
- Provider calls: 0.
- Database connections/writes: 0/0.
- Production writes/deployment: 0/0.

Browser QA also confirmed that saving the scenario created a normal revision of the existing analyst evidence and that the deterministic acquisition total remained $215,000 after $180,700 of seller obligations was entered.

## Artifacts

- UI screenshot: `data/runtime/pi-v2-seller-financial-position/qa-aJhnDY/seller-financial-position.png`
- Report-page screenshot: `data/runtime/pi-v2-seller-financial-position/qa-aJhnDY/sample-report-seller-financial-position.png`
- Sample Full Investor Package HTML: `data/runtime/pi-v2-seller-financial-position/qa-aJhnDY/sample-full-investor-package.html`
- Sample Full Investor Package PDF: `data/runtime/pi-v2-seller-financial-position/qa-aJhnDY/sample-full-investor-package.pdf`
- Machine-readable QA result: `data/runtime/pi-v2-seller-financial-position/qa-aJhnDY/qa-results.json`

## Preserved boundaries

- Certified MAO, deterministic economics and Monte Carlo implementations were not modified.
- Seller mortgage obligations are never copied into investor loan, acquisition cost or holding-cost inputs.
- Existing evidence revisions and subject/snapshot binding remain enforced.
- No provider transport, production database, migration or deployment was used.

Final classification: **SELLER FINANCIAL POSITION UX READY FOR REVIEW**
