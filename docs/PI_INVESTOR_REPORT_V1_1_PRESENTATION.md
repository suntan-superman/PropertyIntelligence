# PI Investor Report V1.1 — Presentation certification

2026-10-09 · Workside Software LLC · Local, synthetic-only.

Final classification: **INVESTOR REPORT V1.1 SYNTHETIC CERTIFIED**

## Result

Three new five-page investor reports and three separate one-page Technical Evidence Appendices were generated from the exact previously certified A/B/C analysis results. No simulation inputs, outputs, policies or model implementations were changed. Investment decision status remains `NOT_ASSESSED`.

All 158 tests pass (136 existing plus 22 presentation tests), with zero failures, skips or cancellations. All 18 new pages were inspected individually as rasterized images. Eight legacy PDFs passed regression QA; their 44 pages were also reviewed in contact sheets.

## Investor presentation

Page 1 now leads with an Investment Decision Snapshot rather than a navigation table. It presents purchase price versus deterministic MAO, a display-only dollar difference, base-case net profit, observed loss frequency, downside P10, base-case peak cash and simulation P90 cash, plus the actual hurdle and remaining verification needs.

| Certified synthetic case | Proposed price | Deterministic MAO | Price minus MAO | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Strong Margin | $145,000.00 | $203,418.00 | −$58,418.00 | Below the modeled ceiling |
| Marginal Investment | $145,000.00 | $125,910.38 | +$19,089.62 | Exceeds the modeled ceiling |
| Renovation Overrun | $145,000.00 | $163,835.25 | −$18,835.25 | Below the modeled ceiling |

These values come from certified fields, not hard-coded example amounts. The difference is rounded to cents for presentation only. The equal-price branch is unit-tested without inventing another certified analysis.

Base-case peak cash and P90 simulated cash are separately labeled; neither is a promise about maximum real-world funding needs. The target is explicitly 25% nonannualized cash-on-cash. Probability of meeting that hurdle is not probability of profit.

Visible internal status codes are translated to plain language; machine-readable technical values remain intact. Tied sensitivity effects remain in model order. Percentage points mean absolute frequency changes, not relative percent changes. Deterministic MAO and the separately specified risk-rule ceiling have distinct definitions, with neither described as a recommended bid or appraisal.

Loss frequency has the qualification: “Based on the stated simulation assumptions; not a historically calibrated forecast.” The zero-loss case also says no losses occurred in the sample and unmodeled risks remain. P10 retains its sign and is not called a guaranteed worst case.

## Five-page structure and appendix

1. Investment overview and decision snapshot.
2. Complete certified base-case ledger, financing and cash timing, ROI versus cash-on-cash.
3. Monte Carlo risk, exact histogram, percentiles and conditional loss.
4. Existing sensitivity chart, return ceiling versus risk-rule ceiling, cash and holding metrics.
5. Assumptions, scenario dependence, limitations and concise verification reference.

The separate appendix retains the full analysis identity, model/economics/assumption versions, PRNG, seed/count, approved runtime, all five full fingerprints, package identity, command and integrity limitations. Both PDFs share one normalized report and approved execution. The investor report references the companion appendix and retained provenance.

Branding, Arial typography, colors, Letter paper, margins, headers/footers, inline SVGs and the existing Puppeteer renderer were retained. No remote assets, new dependencies, font shrinking or chart redesign. Redundant prose and verification-block spacing were tightened to avoid overflow.

## Certified deliverables

Run: `2026-10-09T18-53-05-024Z`.

| Case | Investor report (5 pages) | Appendix (1 page) | Frozen package | Visual QA |
| --- | --- | --- | --- | --- |
| A — Strong Margin | [Investor PDF](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-76AD0D34-668C-4A15-9B63-4EBAF92A63BF/report.pdf) | [Technical appendix](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-76AD0D34-668C-4A15-9B63-4EBAF92A63BF/appendix.pdf) | [Manifest](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-76AD0D34-668C-4A15-9B63-4EBAF92A63BF/manifest.json) · [Receipt](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/receipts/SYNTHETIC-76AD0D34-668C-4A15-9B63-4EBAF92A63BF.json) | [Investor previews](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/visual/A_STRONG_MARGIN/report/contact-sheet.png) · [Appendix preview](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/visual/A_STRONG_MARGIN/appendix/page-1.png) |
| B — Marginal Investment | [Investor PDF](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-B968CF14-FF2C-45AA-9E75-3EB88591A477/report.pdf) | [Technical appendix](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-B968CF14-FF2C-45AA-9E75-3EB88591A477/appendix.pdf) | [Manifest](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-B968CF14-FF2C-45AA-9E75-3EB88591A477/manifest.json) · [Receipt](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/receipts/SYNTHETIC-B968CF14-FF2C-45AA-9E75-3EB88591A477.json) | [Investor previews](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/visual/B_MARGINAL/report/contact-sheet.png) · [Appendix preview](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/visual/B_MARGINAL/appendix/page-1.png) |
| C — Renovation Overrun | [Investor PDF](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-BAC91DF3-76B6-4A65-B36A-1928CFC4339D/report.pdf) | [Technical appendix](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-BAC91DF3-76B6-4A65-B36A-1928CFC4339D/appendix.pdf) | [Manifest](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/packages/SYNTHETIC-BAC91DF3-76B6-4A65-B36A-1928CFC4339D/manifest.json) · [Receipt](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/receipts/SYNTHETIC-BAC91DF3-76B6-4A65-B36A-1928CFC4339D.json) | [Investor previews](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/visual/C_RENOVATION_OVERRUN/report/contact-sheet.png) · [Appendix preview](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/visual/C_RENOVATION_OVERRUN/appendix/page-1.png) |

Each preview directory also contains every `page-N.png` and `automated-qa.json`. The manifests and separate receipts bind both PDFs individually.

[Final certification](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/final-certification.json) records image hashes, package verification and preservation. [Automated run summary](../data/validation/investor-report-v1/mc-integration/presentation-v1.1/2026-10-09T18-53-05-024Z/summary.json) retains its original visual-review-pending state; the later final certification supplies the completed image review rather than overwriting run history.

## Scope of implementation

Existing modules reused: `model.js`, `html.js`, `pdf.js`, `monteCarloAdapter.js`, `monteCarloHtml.js`, `frozenPackage.js`, `analysisTrust.js`.

Only three existing report modules changed: the adapter accepts the explicit V1.1 presentation version; the Monte Carlo template selects versioned presentation output; the existing package builder/verifier binds both documents. One existing PDF QA helper gained version-specific checks. New files are the presentation helper, certification runner, 22-test suite and these documents. No second renderer or reporting architecture.

The default V1 mode still reconstructs the original three HTML artifacts byte-for-byte. Historical package artifacts, manifests, receipts and QA remain unchanged. The current code-bundle check intentionally does not certify old packages as if produced by new source; see the package specification.

## Safety and stop

Provider calls 0; database connections/writes 0; real-property analyses 0; Round 1 selections 0; deployments 0. No .env loaded, MLS access, production changes or analyst-decision changes. Node, Puppeteer, dependencies and Netlify configuration were not changed.

Certified Monte Carlo, economics, MAO, RNG, distributions, seeds, assumptions and fingerprints are preserved. V3 identity persistence, protected baselines and Round 1 authorization remain untouched and PRE_EXECUTION.

**STOP FOR STAN/CHATGPT REVIEW.** No real-property reporting or production integration authorized.

See [QA](PI_INVESTOR_REPORT_V1_1_QA.md) and [package specification](PI_INVESTOR_REPORT_V1_1_PACKAGE_SPEC.md).
