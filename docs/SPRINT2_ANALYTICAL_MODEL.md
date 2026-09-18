# Sprint 2 analytical model

All commands operate offline on the frozen Sprint 1 sponsor seed, normalized evidence and raw cache. `data/analysis/sprint2-input-manifest.json` records SHA-256 hashes captured before implementation. Commands reject changed inputs. No provider client, provider configuration or `.env` is loaded by analysis. A Node network guard blocks fetch and HTTP/TCP/TLS requests; the test suite preloads the same guard. No external provider or API calls are made.

## Evidence and identity

Evidence statuses are SUPPORTED, PARTIAL, MISSING, CONFLICTING, NOT_APPLICABLE and IDENTITY_UNRESOLVED. Support levels separately describe sponsor-only, independent-only, aligned, conflicting or absent evidence. SUPPORTED is evidence support, never automatic VERIFIED truth. No numeric evidence score is created.

Fantasia's original sponsor address and Stan's correction coexist. Property details are provider-reported. Its $279,000 projection conflicts with the cached $40,000–$204,000 provider range; this is not a finding of verified resale value. An absent/incomplete range cannot establish range conflict or alignment. Even a value inside the range remains PARTIAL while comparability is unresolved. All 15 comps remain intact, including their listing status and provider attributes. Listing removal does not establish a closing. Historical taxes are evidence, but do not provide a supported holding-period tax allocation.

Bass retains MANUFACTURED_REPRESENTATION_STOP, Joyce retains ADDRESS_AMBIGUOUS. No independent value is assigned to either. Their sponsor-only arithmetic remains in the portfolio. Collateral claims are preserved as sponsor-only and out of scope. Sponsor information requests are drafts; nothing is sent.

## Cost states and arithmetic

Cost states: KNOWN_SUPPLIED, KNOWN_INDEPENDENT, UNKNOWN, NOT_APPLICABLE. Supplied does not mean verified. Every currently unknown cost has a null value; none is changed to zero. All current results are INCOMPLETE and carry:

> Result excludes material unknown costs and is not a fully burdened profit estimate.

With sale S, acquisition A, repairs R, modeled space rent H, fixed commission C and fixed escrow/closing E:

- Modeled proceeds = S − C − E − H (same proceeds convention as sponsor).
- Modeled project cost = A + R + H + C + E (total explicitly included costs).
- Modeled profit = S − modeled project cost.
- Scenario cash invested = A + R + H (sponsor cash convention; selling costs deducted from proceeds).
- Cash-on-cash = modeled profit / scenario cash invested.
- Profit margin = modeled profit / gross sale.
- Dollar change = scenario modeled profit − sponsor modeled profit.
- Percentage-point changes = 100 × (scenario ratio − unrounded sponsor ratio).

Amounts are calculated in cents; ratios are not rounded internally. Zero denominators produce null, never NaN/Infinity. Do not subtract modeled project cost from modeled proceeds: proceeds already exclude rent and selling costs. No field named netProfit is used for Sprint 2 outputs. `fullyBurdenedProfit` remains null.

Excluded categories: acquisition closing, taxes, insurance, utilities, financing, repair contingency, other extra holding costs, additional community fees, transfer/application fees, price reductions, other disposition costs. A price-reduction scenario changes sale explicitly; it does not invent a separate disposition charge.

## Break-even and capacities

Modeled break-even sale = A + R + H + C + E = $180,000 in the sponsor cost case.

Maximum repair budget at sale S = S − A − H − C − E. Maximum acquisition = S − R − H − C − E. Negative capacity stays visible and signals that no nonnegative budget achieves modeled break-even at the stated other inputs. These are arithmetic thresholds, not spending recommendations.

The commission and escrow are fixed sponsor amounts at all sale assumptions. No percentage fee or changing fee schedule is inferred.

## Holding derivation

The explicit $3,000 three-month space-rent aggregate permits a $1,000/month derivation, labeled DERIVED_FROM_SPONSOR_AGGREGATE. Use 30-day model months, an explicit deterministic convention, not an assertion about a lease. Base sponsor calculations keep the original $3,000 despite the portfolio's separate 120-day timeline.

Holding scenario rent = $1,000 × duration days / 30. Thus 90 days reproduces $3,000; 120 days models $4,000; 150 days $5,000; 180 days $6,000; 240 days $8,000. These replace rather than supplement the base rent. Only rent varies; excluded taxes/insurance/utilities/financing/fees remain unknown.

Holding capacity months = (S − A − R − C − E) / monthly space rent. Multiply by 30 for modeled days. Negative capacities are retained but feasible duration is null. This is not an expected sale/renovation timeline; a very long capacity simply reflects omitted unknown recurring costs and fixed sale assumptions. Unsupported recurring-rent inputs yield UNAVAILABLE artifacts with a reason.

## Scenarios, sensitivity and portfolio

Scenarios record labels, descriptions, sponsor base, explicit overrides, unknown-cost exclusions, outputs, warnings and source references. Provider AVM/range scenarios are independent estimates, not verified outcomes. Hypothetical changes carry no probability. The ranking is named Deterministic Sensitivity Ranking and ranks absolute dollar impacts of the specified unequal perturbations; it is not Monte Carlo variance contribution. Equal impacts share ranks.

The Sponsor Portfolio Case reproduces all sponsor totals. The Independent Portfolio Case is INCOMPLETE with null profit/return. PARTIAL_PORTFOLIO_STRESS changes only Fantasia to the provider point/range while leaving Bass and Joyce at sponsor assumptions. It is never labeled independently underwritten portfolio return.

Monte Carlo readiness is a schema only. All 11 variables remain distributionReady=false. No distribution family, probability, random simulation, return recommendation or investor package is generated.

## Commands and reruns

```powershell
npm run analysis:evidence
npm run analysis:break-even
npm run analysis:scenarios
npm run analysis:sensitivity
npm run sprint2:summarize -- --analysis-only
npm test
npm run sprint2:reproduce
npm run sprint2:summarize
```

Analysis outputs contain no wall-clock generation timestamps; reruns must be byte-identical. Source retrieval timestamps remain untouched. Final summary requires passing tests, input-preservation checks and the offline artifact-reproduction check. Stop after the completion report for Stan/ChatGPT review.
