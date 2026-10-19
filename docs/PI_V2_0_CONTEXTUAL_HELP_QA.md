# PI V2.0 — Contextual Help and Tooltips

## Result

Implemented and offline-certified for the desktop application. The help layer does not import or change financial engines, scenario persistence, evidence normalization, provider transports or database code.

## Implementation

- One application-level `TooltipProvider` supplies consistent help for buttons and actionable links.
- One reusable `Tooltip` information icon is used beside financial assumptions and calculated outputs.
- Interaction is available by mouse hover, keyboard focus and click/tap on information icons. `Escape` and outside click dismiss pinned help.
- The active control receives `aria-describedby="pi-global-tooltip"`; any prior description is restored after dismissal.
- Tooltips are viewport-clamped, prefer placement above the control and fall below it when necessary.
- Every rendered button has a concise fallback. High-value actions use investor-specific wording for property analysis, scenario revisions, comp review, report generation, saved-record changes and possible provider costs.

## Investor concepts covered

- Provider as-is AVM versus analyst resale/ARV assumption.
- Analyst purchase, rehabilitation, rehabilitation-contingency and target-return assumptions.
- Calculated project ROI, cash-on-cash, return-hurdle MAO, break-even purchase ceiling, minimum-profit purchase ceiling and peak equity requirement.
- Provider evidence, analyst research/assumptions and Property Intelligence calculated outputs remain explicitly distinct.

## QA

- Contextual-help source tests: **5/5 PASS**.
- Existing Milestone 1 and investment regressions plus contextual-help tests: **115/115 PASS**, **0 skipped**.
- Acquisition-linkage regressions: **16/16 PASS**, **0 skipped**.
- Certified MAO checks: **10/10 PASS**.
- Focused Chromium browser checks: **24/24 PASS**.
- Production web build: **PASS** (`64` modules transformed).
- External/provider requests: **0**.
- Database connections/writes: **0**.
- Deployments: **0**.

Browser evidence is retained privately under:

`data/runtime/pi-v2-contextual-help/qa-FCySQk/`

The screenshot shows click-pinned help for the estimated resale/ARV assumption and confirms it does not cover the associated input.
