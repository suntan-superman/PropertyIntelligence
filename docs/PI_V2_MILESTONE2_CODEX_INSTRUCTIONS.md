# Property Intelligence V2.0 — Milestone 2 Codex Implementation Brief

## Objective and scope
Close Milestone 1 as an accepted **private-beta foundation**, not as approval for external investor distribution. Implement a secure, testable lead-to-analysis workflow from SellMyKernHome.com, and validate PI using real or historical deals supplied with permission. Continue to keep proactive distress discovery out of the launch critical path. Work in JavaScript; reuse existing project architecture and financial/report engines.

## Workstream A — focused investor report corrections
1. Fix duplicate header text such as `Scenario Scenario 1` in both PDFs.
2. Verify the underlying documentary evidence before describing the $135,000 original mortgage principal as a *recorded-document* fact. A manually entered `Tax Assessor` source alone does not establish that a recorded mortgage document was reviewed. If evidence is insufficient, change the classification and explanatory label without modifying the entered amount.
3. Ensure the $120,000 estimated mortgage balance remains clearly *seller-reported* and never a lender-verified payoff or algorithmic estimate. Keep other liens unknown and seller equity/proceeds unavailable until researched.
4. Add a concise, source-supported executive investment synthesis: conditional financial attraction, principal downside sensitivities, and the three most consequential open diligence questions. Do not infer property availability, motivated seller, distressed status, supported ARV, or investment recommendation.
5. Retain visible disclosure when no comps are selected; do not manufacture comparable adjustments or appraisal-like conclusions. Allow analyst selection and reasons in the existing workflow.
6. Improve excessive whitespace on the seller financial page without shrinking body text or moving legally required text to an illegible font.
7. Add the following layperson-friendly explanation near the end of the **Full Investor Package**, before the technical appendix and county disclaimer, using a compact readable section and avoiding a page break unless needed:

### Understanding the Monte Carlo Analysis
A Monte Carlo simulation explores how an investment's financial results might change when things do not go exactly as planned. Instead of calculating profit using just one selling price, repair budget and timeline, Property Intelligence runs many hypothetical combinations within ranges entered by the analyst.

For example, the home might sell for less, repairs might cost more, or the project might take longer. The simulation shows how those combinations affect modeled profit.

- **P10** is a lower-profit result: about 10% of the simulated outcomes fall below it.
- **P50** is the middle (median) simulated result.
- **P90** is a higher-profit result: about 90% of the simulated outcomes fall below it.

**Important:** These percentages describe the simulated outcomes, **not the probability of actual investment performance**. The analysis cannot predict the future, account for every unexpected expense or guarantee a return. It is only as useful as the assumptions entered.

Keep this explanation consistent with the actual displayed results and the existing conditional-risk language. For example, `0 losses in 1,000 trials` must not be described as zero real-world risk. Add a brief one-sentence Monte Carlo explanation in the Opportunity Brief only if it improves clarity and fits cleanly.

## Workstream B — SellMyKernHome.com integration design and local implementation
1. Inspect both repositories and existing website lead form before changing either. Do not assume that the website has a specific hosting, database, or auth setup. Produce an explicit field mapping and an integration contract.
2. Define a versioned, authenticated server-to-server lead intake API, not a public unauthenticated PI endpoint. Proposed fields: external lead ID, submission time, seller-supplied address components, contact info, consent/source metadata, seller comments, property condition description, photos as references only, and submission origin. Validate sizes/types; avoid placing PII in logs.
3. Implement idempotency keyed to site/source plus external lead ID, explicit duplicate review, rejection of malformed input, and safe retry semantics. A lead is not a verified Property or title record.
4. Implement local/staging fixtures and a PI **Incoming Leads** queue showing new, needs review, in research, underwritten, and archived states. Allow opening a lead into address research and underwriting with no automatic paid provider request.
5. Provide clear user actions: Review Lead, Research Address, Start Analysis, Save Scenario, Generate Report. Keep source evidence, seller statements, and analyst assumptions separate.
6. Security: server-side secret or signature verification, rate limiting, least-privilege credentials, PII minimization, access-control checks, and no secrets in browser bundles. If secure multi-user auth is not ready, do not deploy or enable external intake yet. No unapproved production migrations or production lead transmission.
7. Document where private photo uploads would live later. Do not claim binary attachments are stored when only references are stored.

## Workstream C — real-deal validation protocol
1. Create an analyst worksheet for 3 actual or historical deals from Gabe (with permission), using only information actually provided. Never invent deal prices, closing statements, rehab invoices or outcomes.
2. Compare PI's purchase, rehab, carrying costs, selling expenses, net profit, MAO and timing against the deal's actual or independently reviewed underwriting. Explain discrepancies, including omitted fees.
3. Time the workflow from accepted lead to first saved scenario and first report. Record provider usage/cost separately; aim for under 15 minutes from usable inputs to first report and under 2 minutes for PDF generation, but report actual measurements.
4. Gather first-time-user feedback and record the top 5 friction points. No broad redesign unless a specific issue prevents completion.

## Acceptance criteria and handoff
- Two updated Crestview PDFs (brief and full), plus a sparse-evidence property report, visually inspected page by page.
- Monte Carlo explainer present in the Full Investor Package, accurate and understandable without statistical training.
- No duplicated scenario header; no unsupported recorded-mortgage claims; no false supported-ARV statement.
- Demonstrated mocked end-to-end website lead -> PI queue -> address research -> scenario -> PDF, with idempotency and unauthorized-request tests.
- Existing MAO, Monte Carlo, evidence history, saved scenarios, and report numerical values unchanged unless an independently demonstrated bug is separately reported for approval.
- Focused regression, security, browser, and PDF QA with no skipped tests; disclose any existing Chromium teardown issue separately from assertion failures.
- No production deployment, live provider requests, production database writes, or external lead ingestion without explicit approval.
- Deliver root-cause/change summary, exact changed files, local run instructions, screenshots, report files, QA results, open risks, and an explicit recommendation on whether a private authenticated staging pilot can begin.

**Stop for Stan/ChatGPT review before enabling live website submissions or deployment.**
