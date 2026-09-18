import {readJson,writeText} from '../io/files.js';
import {UNKNOWN_WARNING} from '../underwriting/costModel.js';
const dollars=value=>value==null?'Unavailable':`$${value.toLocaleString('en-US',{maximumFractionDigits:2})}`;
const percent=value=>value==null?'Unavailable':`${(value*100).toFixed(1)}%`;
export async function analyticalReports() {
  const evidence=await readJson('data/analysis/evidence/florida-evidence-completeness.json');
  const scenarios=await readJson('data/analysis/scenarios/fantasia-scenarios.json');
  const be=await readJson('data/analysis/break-even/fantasia-break-even.json');
  const ranking=await readJson('data/analysis/sensitivity/fantasia-deterministic-ranking.json');
  const questions=await readJson('data/analysis/evidence/sponsor-information-request.json');
  const readiness=await readJson('data/analysis/evidence/monte-carlo-readiness.json');
  const scenarioTable=['| Scenario | Gross sale | Modeled profit/loss | Cash invested | Cash-on-cash | Change from sponsor |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...scenarios.scenarios.map(s=>`| ${s.id} | ${dollars(s.outputs.grossSale)} | ${dollars(s.outputs.modeledProfit)} | ${dollars(s.outputs.scenarioCashInvested)} | ${percent(s.outputs.cashOnCash)} | ${dollars(s.outputs.changeVsSponsorDollars)} |`)];
  const report=[
    '# Florida deal analysis — Foundation Sprint 2','',
    '## 1. Scope and limitations','',
    'Offline deterministic analysis of unchanged Sprint 1 inputs and cached RentCast evidence. No new provider calls, simulations, inferred tenure, UI or investment recommendation.', '',UNKNOWN_WARNING,'',
    '## 2. Sponsor portfolio summary','',
    `Sponsor-defined modeled profit: ${dollars(scenarios.portfolio.sponsorCase.modeledProfit)}; cash invested: ${dollars(scenarios.portfolio.sponsorCase.scenarioCashInvested)}; cash-on-cash: ${percent(scenarios.portfolio.sponsorCase.cashOnCash)}. Inputs remain sponsor claims. Three-month rent and the separate 120-day timeline are preserved.`, '',
    '## 3. Fantasia evidence inventory','',
    '| Field | Status | Support level |','| --- | --- | --- |',
    ...evidence.properties.find(p=>p.propertyId==='fantasia').fields.map(f=>`| ${f.field} | ${f.status} | ${f.supportLevel} |`),'',
    'Confirmed address: 8426 Fantasia Park Way, Riverview, FL 33578. Provider reports Manufactured, 3 bedrooms, 2 bathrooms, 1,242 square feet, built 2006. These independent attributes are not automatically VERIFIED.', '',
    '## 4. Sponsor versus independent valuation','',
    'Sponsor $279,000 versus provider AVM $122,000 and range $40,000–$204,000: CONFLICTING. The projection is $157,000 above the AVM and $75,000 above its upper bound. The provider is not verified resale value; land tenure and comp comparability remain unresolved. All 15 comps are preserved. Listing status, DOM or removal is not proof of a closed sale.', '',
    '## 5. Known versus unknown costs','',
    ...scenarios.costModel.costs.map(c=>`- ${c.field}: ${c.status}; ${c.value===null?'unknown (null)':dollars(c.value)}.`),'',
    'Historical tax evidence is not allocated to the hold without supported assumptions. Price-reduction scenarios change sale price explicitly; missing reductions/fees are not silently entered as zero.', '',
    '## 6. Modeled break-even','',
    `MODELED_BREAK_EVEN_SALE_PRICE: **${dollars(be.salePrice)}** using the five supplied costs only. ${UNKNOWN_WARNING}`,'',
    '| Sale assumption | Sale | Maximum repairs | Maximum acquisition | Holding capacity days |','| --- | ---: | ---: | ---: | ---: |',
    ...be.capacities.map(c=>`| ${c.id} | ${dollars(c.saleAssumption)} | ${dollars(c.maximumRepairBudget)} | ${dollars(c.maximumAcquisitionPrice)} | ${c.holding.capacityDays??'Unavailable'} |`),'',
    'Negative capacities remain visible and are not feasible nonnegative budgets/durations. The holding threshold is mathematical capacity with fixed sale/other costs and space rent alone, not a recommended or expected holding period.', '',
    '## 7. Deterministic scenarios','',...scenarioTable,'',
    'All results are INCOMPLETE. Rent derives as $3,000 / 3 = $1,000/month (DERIVED_FROM_SPONSOR_AGGREGATE). Using explicit 30-day model months, 120 days requires $4,000 rent; the original sponsor case retains $3,000. Only rent extends; no taxes/insurance/utilities/financing are invented. Percentage-point deltas use unrounded sponsor ratios.', '',
    '## 8. Deterministic sensitivity','',
    '| Rank | Perturbation | Modeled profit change |','| ---: | --- | ---: |',
    ...ranking.rows.map(r=>`| ${r.rank??'Unavailable'} | ${r.label} | ${dollars(r.modeledProfitChange)} |`),'',
    'This is a Deterministic Sensitivity Ranking of specified unequal perturbations, not probability or variance contribution. Commission +20% and holding +30 days tie at $1,000 impact. Holding starts from the sponsor rent coverage of 90 modeled days. The CSV matrix contains all five sale assumptions × four repair budgets, including losses.', '',
    '## 9. Bass STOP','',
    'MANUFACTURED_REPRESENTATION_STOP is preserved. Its provider record lacks manufactured-home type and structural/parcel evidence. No independent valuation is fabricated. Sponsor-only arithmetic remains available.', '',
    '## 10. Joyce ambiguity','',
    'ADDRESS_AMBIGUOUS is preserved. No city, state, ZIP or independent value is inferred. Sponsor-only arithmetic is separate from identity resolution.', '',
    '## 11. Portfolio limitations','',
    'Independent Portfolio Case: INCOMPLETE. No independently underwritten portfolio profit/return is produced.', '',
    '| Partial portfolio stress | Modeled profit | Cash-on-cash |','| --- | ---: | ---: |',
    ...scenarios.portfolio.partialStress.map(p=>`| ${p.id} | ${dollars(p.modeledProfit)} | ${percent(p.cashOnCash)} |`),'',
    'PARTIAL_PORTFOLIO_STRESS changes only Fantasia. Bass/Joyce stay on sponsor assumptions and all unknown costs remain excluded.', '',
    '## 12. Questions and evidence required','',
    ...questions.requests.map(q=>`- ${q.propertyId}: ${q.question}`),'',
    'These are draft information requests, not sent messages. Collateral remains sponsor-only/out of scope.', '',
    '## 13. Inputs needed before Monte Carlo','',
    ...readiness.variables.map(v=>`- ${v.variable}: distributionReady=false; missing ${v.missingInputs.join('; ')}.`),'',
    'Readiness schema only. No distributions, probability assignments or simulation have been created.', '',
    '## 14. Recommended next engineering step','',
    'Stan/ChatGPT should review these outputs and the draft sponsor questions. Obtain evidence resolving Fantasia tenure/comparability, documented costs and schedule, Bass identity/representation, and Joyce full address. A later explicitly authorized engineering step can ingest that evidence and rerun this deterministic model. Do not start UI, Monte Carlo, investor packages or Sprint 3 now.','',
  ].join('\n');
  await writeText('docs/FLORIDA_DEAL_ANALYSIS_SPRINT2.md',report);
  await writeText('docs/SPRINT2_SCENARIO_CATALOG.md',[
    '# Sprint 2 scenario catalog','',
    'Base case: preserved sponsor inputs, $3,000 supplied rent and fixed-dollar $5,000 commission / $2,000 escrow. All scenarios exclude material unknown costs and assign no probability. See SPRINT2_ANALYTICAL_MODEL.md for formulas and the 30-day holding convention.','',
    '| ID | Description | Overrides | Sale evidence basis |','| --- | --- | --- | --- |',
    ...scenarios.scenarios.map(s=>`| ${s.id} | ${s.description} | ${JSON.stringify(s.overrides)} | ${s.saleAssumptionEvidenceStatus} |`),'',
    'Sensitivity grids: sale −30/−25/−20/−15/−10/−5/0/+5%; repairs −20/0/+20/+50/+100/+150%; hold 90/120/150/180/240 days. Matrix rows: sponsor, −10%, −20%, AVM high, AVM point. Columns: base repairs, +20%, +50%, +100%.','',
  ].join('\n'));
}
