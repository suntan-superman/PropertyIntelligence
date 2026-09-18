import '../src/analysis/offline.js';
import {readdir} from 'node:fs/promises';
import {readJson,writeText,resolve} from '../src/io/files.js';
import {loadInputs,checkPreservation} from '../src/analysis/inputs.js';
import {offlineStatus} from '../src/analysis/offline.js';
import {analyticalReports} from '../src/analysis/reports.js';
await loadInputs();
await analyticalReports();
if(process.argv.includes('--analysis-only')) {
  console.log(JSON.stringify({report:'analyst-and-catalog',...offlineStatus()}));
} else {
  const tests=await readJson('data/validation/foundation-sprint2-tests.json');
  const replay=await readJson('data/validation/foundation-sprint2-reproducibility.json');
  const preservation=await checkPreservation();
  if(tests.exitCode!==0||tests.failed!==0||tests.tests===0||!replay.identical||replay.networkAttempts!==0)throw new Error('STOP: tests/reproducibility incomplete');
  const be=await readJson('data/analysis/break-even/fantasia-break-even.json');
  const scenarios=await readJson('data/analysis/scenarios/fantasia-scenarios.json');
  const evidence=await readJson('data/analysis/evidence/florida-evidence-completeness.json');
  const ranking=await readJson('data/analysis/sensitivity/fantasia-deterministic-ranking.json');
  const readiness=await readJson('data/analysis/evidence/monte-carlo-readiness.json');
  const files=['package.json','scripts/test-foundation.js','tests/sprint2.test.js','src/underwriting/costModel.js','src/underwriting/metrics.js',
    'scripts/analyze-evidence-completeness.js','scripts/analyze-break-even.js','scripts/analyze-scenarios.js','scripts/analyze-sensitivity.js',
    'scripts/summarize-foundation-sprint2.js','scripts/reproduce-foundation-sprint2.js',
    'docs/SPRINT2_ANALYTICAL_MODEL.md','docs/SPRINT2_SCENARIO_CATALOG.md','docs/FLORIDA_DEAL_ANALYSIS_SPRINT2.md',
    'docs/FOUNDATION_SPRINT2_COMPLETION_REPORT.md','data/validation/foundation-sprint2-tests.json','data/validation/foundation-sprint2-reproducibility.json'];
  async function inventory(dir){for(const e of await readdir(resolve(dir),{withFileTypes:true})){
    const p=`${dir}/${e.name}`;if(e.isDirectory())await inventory(p);else files.push(p);
  }}
  await inventory('src/analysis');await inventory('data/analysis');
  const lines=[
    '# Foundation Sprint 2 completion report','',
    '**Implementation complete; evidence gaps and prior identity STOP states preserved.**','',
    '## Validation and offline execution','',
    `- Tests: ${tests.passed}/${tests.tests} passed; ${tests.failed} failed. Full Sprint 1 + Sprint 2 suite run using npm test.`,
    '- Preservation and unknown-cost tests were written first; their initial missing-module failure was observed before implementation.',
    '- No network/API calls occurred in Sprint 2. No provider configuration or .env was read. Analysis and tests run with a fetch/HTTP/TCP/TLS guard.',
    `- Sponsor inputs and existing cached/normalized evidence: ${preservation.status}; ${preservation.filesChecked} SHA-256 hashes unchanged.`,
    `- Offline reproducibility: ${replay.filesChecked} artifacts byte-identical after rerunning all analysis commands in fresh processes. Network attempts: ${replay.networkAttempts}.`,
    '- Existing Sprint 1 source adapters, raw response snapshots, sponsor seed, claims and independent evidence remain unchanged.','',
    '## Fantasia break-even and scenario summary','',
    `MODELED_BREAK_EVEN_SALE_PRICE = $${be.salePrice.toLocaleString('en-US')}. Result excludes material unknown costs and is not a fully burdened profit estimate.`, '',
    '| Sale assumption | Max repair budget | Max acquisition price | Holding capacity days |','| --- | ---: | ---: | ---: |',
    ...be.capacities.map(row=>`| ${row.id} | ${row.maximumRepairBudget} | ${row.maximumAcquisitionPrice} | ${row.holding.capacityDays} |`),'',
    'Negative capacity is preserved. Holding capacity is a fixed-price arithmetic threshold using space rent alone, not an expected timeline. Monthly rent $1,000 is DERIVED_FROM_SPONSOR_AGGREGATE ($3,000 / 3), using explicit 30-day model months. Base sponsor rent remains $3,000 despite the separate 120-day timeline. A 120-day scenario uses $4,000 and produces $98,000 modeled profit.', '',
    `${scenarios.scenarios.length} required scenarios generated with all losses visible. Selected results:`, '',
    '| Scenario | Modeled profit/loss |','| --- | ---: |',
    ...scenarios.scenarios.filter(s=>['SPONSOR_CASE','INDEPENDENT_AVM_POINT','INDEPENDENT_AVM_LOW','INDEPENDENT_AVM_HIGH','COMBINED_10_20','COMBINED_15_50','COMBINED_20_100'].includes(s.id))
      .map(s=>`| ${s.id} | $${s.outputs.modeledProfit.toLocaleString('en-US')} |`),'',
    '## Deterministic Sensitivity Ranking','',
    ...ranking.rows.map(row=>`- Rank ${row.rank}: ${row.label}; modeled-profit change $${row.modeledProfitChange.toLocaleString('en-US')}.`),'',
    'These standardized perturbations are deterministic comparisons, not probabilities or Monte Carlo variance contributions. Equal dollar impacts share ranks. Sale/repair/hold grids and the 5×4 matrix are included.', '',
    '## Evidence completeness and unknown costs','',
    `Field assessments across all three properties: ${Object.entries(evidence.summary).map(([status,count])=>`${status}=${count}`).join(', ')}. No numeric evidence score.`, '',
    'Fantasia sponsor $279,000 conflicts with provider $40,000–$204,000 range. The AVM is not verified resale truth. All 15 comps are preserved; land tenure, park/community, restrictions, repair/condition support, title/lien priority and true comp comparability remain unresolved.', '',
    `Unknown modeled costs (null, never zero): ${scenarios.costModel.costs.filter(c=>c.status==='UNKNOWN').map(c=>c.field).join(', ')}. All current costCompleteness values are INCOMPLETE.`, '',
    '## Portfolio and STOP preservation','',
    '- Bass: MANUFACTURED_REPRESENTATION_STOP.',
    '- Joyce: ADDRESS_AMBIGUOUS.',
    '- Sponsor Portfolio Case: $151,978 modeled profit, $215,522 cash invested, 70.5% rounded cash-on-cash.',
    '- Independent Portfolio Case: INCOMPLETE; profit/return null.',
    '- PARTIAL_PORTFOLIO_STRESS is explicitly mixed evidence: Fantasia changes, Bass/Joyce remain sponsor assumptions. AVM-point stress yields a $5,022 modeled portfolio loss, excluding unknown costs.',
    '- Collateral remains sponsor-only/out of scope. Sponsor questions were drafted but not sent.','',
    '## Monte Carlo readiness','',
    ...readiness.variables.map(v=>`- ${v.variable}: distributionReady=false; ${v.missingInputs.join('; ')}.`),'',
    'No distribution, probability assignment or simulation was implemented. No UI or investor-package work was started.','',
    '## Exact recommended next step','',
    'Stan and ChatGPT should review docs/FLORIDA_DEAL_ANALYSIS_SPRINT2.md and data/analysis/evidence/sponsor-information-request.json. Obtain the requested valuation/tenure, cost, schedule and identity evidence; then explicitly authorize any follow-on engineering. Do not start Sprint 3, UI, Monte Carlo or investor-package generation from these incomplete inputs.','',
    'Reproduction commands (offline):','',
    '```powershell','npm run analysis:evidence','npm run analysis:break-even','npm run analysis:scenarios','npm run analysis:sensitivity',
    'npm run sprint2:summarize -- --analysis-only','npm test','npm run sprint2:reproduce','npm run sprint2:summarize','```','',
    '## Files created/changed','',...[...new Set(files)].sort().map(file=>`- ${file}`),'',
  ];
  await writeText('docs/FOUNDATION_SPRINT2_COMPLETION_REPORT.md',lines.join('\n'));
  console.log(JSON.stringify({report:'Sprint 2 complete',tests:`${tests.passed}/${tests.tests}`,preservation,...offlineStatus()}));
}
