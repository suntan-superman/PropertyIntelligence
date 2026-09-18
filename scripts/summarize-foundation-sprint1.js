import { readdir } from 'node:fs/promises';
import { readJson, writeJson, writeText, resolve } from '../src/io/files.js';
import { calculatePortfolio } from '../src/underwriting/deterministic.js';
import { comparePortfolio } from '../src/underwriting/comparison.js';
const portfolio = await readJson('data/deals/florida-portfolio.json');
const verification = await readJson('data/normalized/florida-verification.json');
const tests = await readJson('data/validation/foundation-tests.json');
const underwriting = await readJson('data/normalized/florida-underwriting.json');
const comparisons = await readJson('data/comparisons/florida-comparisons.json');
let cacheReplay = null;
try { cacheReplay = await readJson('data/validation/foundation-cache-replay.json'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const checks = {
  sponsorArithmeticReproduced: JSON.stringify(underwriting) === JSON.stringify(calculatePortfolio(portfolio)),
  comparisonReproducible: JSON.stringify(comparisons) === JSON.stringify(comparePortfolio(portfolio, verification)),
  threeDealRowsPreserved: portfolio.deals.length === 3 && verification.properties.length === 3 && comparisons.length === 3,
  sponsorClaimsUnmodified: portfolio.deals.every((deal) => deal.claims.every((claim) => claim.status === 'SPONSOR_SUPPLIED')),
  joyceIdentityNotInferred: ['city','state','zip'].every((key) => portfolio.properties[2].sponsorAddress[key] === null),
  unitTestsPass: tests.exitCode === 0 && tests.failed === 0 && tests.tests > 0,
  provenanceReferencesReadable: true,
};
for (const result of verification.properties) {
  for (const reference of result.rawResponseRefs) await readJson(reference);
  for (const evidence of result.evidence) {
    const raw = await readJson(evidence.rawResponseRef);
    if (raw.retrievedAt !== evidence.retrievedAt) checks.provenanceReferencesReadable = false;
  }
}
const totals = { apiCalls:0, cacheHits:0, retries:0, rateLimits:0 };
for (const run of verification.runs) for (const field of Object.keys(totals)) totals[field] += run.metrics[field];
const stops = verification.properties.filter((item) => item.stopReason).map((item) => ({ propertyId:item.propertyId, reason:item.stopReason }));
const status = stops.length ? 'STOPPED_AT_SPECIFICATION_GATE' : 'READY_FOR_HUMAN_EVIDENCE_REVIEW';
const files = [];
async function inventory(directory) {
  for (const entry of await readdir(resolve(directory), { withFileTypes:true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await inventory(relative);
    else if (!relative.includes('/kern') && !relative.includes('/sources/kern/')) files.push(relative);
  }
}
for (const directory of ['src/domain','src/sources/rentcast','src/underwriting','src/provenance','src/io','tests']) await inventory(directory);
files.push('package.json','.env.example','.gitignore','README.md',
  ...['rentcast-inspect-config','seed-florida-deals','verify-florida-properties','compare-sponsor-to-evidence','summarize-foundation-sprint1','test-foundation'].map((name)=>`scripts/${name}.js`),
  ...['HOME_ADVISOR_RENTCAST_AUDIT','DEAL_VERIFICATION_ARCHITECTURE','DATA_DICTIONARY','FUTURE_WORK','FLORIDA_ADDRESS_CONFIRMATIONS','FOUNDATION_SPRINT1_COMPLETION_REPORT'].map((name)=>`docs/${name}.md`),
  'data/deals/florida-portfolio.json','data/normalized/florida-underwriting.json','data/normalized/florida-verification.json',
  'data/comparisons/florida-comparisons.json','data/comparisons/florida-comparisons.csv',
  'data/validation/foundation-tests.json','data/validation/foundation-validation.json');
files.push(...verification.properties.flatMap((item)=>item.rawResponseRefs));
if (cacheReplay) files.push('data/validation/foundation-cache-replay.json');
await writeJson('data/validation/foundation-validation.json', { generatedAt:new Date().toISOString(), status, checks,
  providerUsage:totals, stops, files:[...new Set(files)].sort() });
const show = (value) => value == null ? 'Unavailable' : String(value);
const rows = comparisons.map((row) => `| ${row.address} | ${row.resolutionStatus} | ${show(row.independentAvm)} | ${show(row.independentLow)} / ${show(row.independentHigh)} | ${row.comparableCount} | ${show(row.varianceDollars)} / ${show(row.variancePercent)} |`);
const authStop = stops.some((item)=>item.reason==='AUTHENTICATION_STOP');
const identityStop = stops.some((item)=>item.reason==='ADDRESS_IDENTITY_STOP');
const representationStops = verification.properties.filter((item)=>item.stopReason==='MANUFACTURED_REPRESENTATION_STOP');
const hasValues = comparisons.some((item)=>item.independentAvm !== null);
const currentCandidates = verification.properties.flatMap((item)=>item.candidates.map((candidate)=>({
  propertyId:item.propertyId, address:candidate.formattedAddress ?? candidate.addressLine1,
  propertyType:candidate.propertyType ?? null, selected:item.status==='INDEPENDENT_EVIDENCE_AVAILABLE',
})));
const latestRun = verification.runs.at(-1);
const nextStep = authStop
  ? 'Correct `RENTCAST_API_KEY` in the process environment or ignored local `.env`, then resume only the Fantasia gate. Also obtain the sponsor-confirmed full address for Joyce.'
  : identityStop
    ? 'Stan must confirm whether the returned Fantasia candidate, 8426 Fantasia Park Way, Riverview, FL 33578, is the sponsor-intended property at 8426 Fantasia Parkway. Preserve that confirmation as evidence before changing the address mapping or resuming enrichment. Also obtain the complete sponsor-confirmed address for Joyce. Do not query AVM or Bass while this identity gate remains unresolved.'
    : representationStops.length
      ? 'Review the sparse Bass response and obtain corroborating parcel/home identity and manufactured-home details. Agree on a reliable evidence source or representation before resuming Bass enrichment; do not override the missing type or guess its characteristics to force an AVM. Obtain the sponsor-confirmed full address for Joyce. Review Fantasia’s provider range and all 15 comps, including whether land tenure is comparable, before any later UI work.'
      : 'Review the available raw/normalized Florida evidence and obtain the complete sponsor-confirmed address for Joyce. Resolve any remaining STOP condition before further live calls.';
const report = [
  '# Foundation Sprint 1 completion report', '',
  `Generated: ${new Date().toISOString()}`, '', `**Outcome: ${status}.**`, '',
  'The independent adapter, domain models, sponsor seed, deterministic underwriting, comparison outputs and offline tests are implemented. Live verification is incomplete whenever a STOP gate is listed below. No UI, Monte Carlo, investor package, collateral verification or Kern enrichment was performed.', '',
  '## Audit and independence', '',
  'Home Advisor was read only. Referenced files and detailed behavior are listed in [the audit](HOME_ADVISOR_RENTCAST_AUDIT.md): web `lib/api.js`; API `config/env.js`, `services/rentcastClient.js`, `services/compsProvider.js`, `services/pricingEngine.js`, pricing service/routes/tests, property service, and pricing usage policy.', '',
  'Home Advisor calls `/avm/value` and `/listings/sale`. This independent adapter implements `/properties` (documented identity lookup addition) and `/avm/value` (including all returned comps). It needs no extra listing calls. No Home Advisor modules or files are imported by the adapter at runtime.', '',
  'Configuration names: `RENTCAST_API_KEY` (preferred), `MARKET_DATA_API_KEY` (fallback), `RENTCAST_BASE_URL` (official URL only). The initial reference key was passed through the launch process environment. After Stan supplied an updated key in `.env.example`, that file was moved to ignored `.env` and `.env.example` was restored to blank placeholders. No key value or auth header is included in source, report or cache.', '',
  '## Tests and validation', '',
  `Offline tests: ${tests.passed}/${tests.tests} passed; ${tests.failed} failed. Command: npm test. No RentCast quota used by tests.`, '',
  ...Object.entries(checks).map(([name,passed])=>`- ${name}: ${passed ? 'PASS' : 'FAIL'}`), '',
  'Fixture coverage includes property/no/multiple matches, missing city/state, wrong address/unit, manufactured-type gate, AVM/range/comps, provider/malformed errors, transient/network/429 retries, credential redaction, cache reuse/refresh, sponsor arithmetic and user-confirmed address corrections with original sponsor values preserved.', '',
  cacheReplay ? `Cache-only replay: ${cacheReplay.checks.map((item)=>`${item.propertyId} ${item.identical ? 'identical' : 'different'}`).join('; ')}. ${cacheReplay.metrics.cacheHits} cache hits; ${cacheReplay.metrics.apiCalls} API attempts. Live networking was disabled for this check; see data/validation/foundation-cache-replay.json.` : 'Live cache determinism has not been checked.', '',
  '## Provider execution and STOP gates', '',
  `API attempts: ${totals.apiCalls}; cache hits: ${totals.cacheHits}; retries: ${totals.retries}; 429 responses: ${totals.rateLimits}. These count local HTTP attempts, not provider-confirmed billable usage.`, '',
  `Latest invocation: ${latestRun.propertyId}; ${latestRun.metrics.apiCalls} API attempt(s), ${latestRun.metrics.cacheHits} cache hit(s).`, '',
  ...stops.map((item)=>`- ${item.propertyId}: ${item.reason}`), '',
  ...portfolio.properties.filter((item)=>item.addressConfirmation).map((item)=>`- ${item.id}: ${item.addressConfirmation.suppliedBy} confirmed ${Object.values(item.addressConfirmation.address).join(', ')} on ${item.addressConfirmation.suppliedDate}. Original sponsor address retained. Source: ${item.addressConfirmation.sourceDocument}.`), '',
  ...(authStop ? ['Fantasia `/properties` returned HTTP 401 on the first call. No authentication retry, alternate-key attempt, AVM request, or second-property request followed. The sanitized HTTP response is retained under `data/raw/rentcast/`. Authentication does not establish whether the API contract or property coverage would succeed.', ''] : []),
  ...(identityStop ? ['Authentication now succeeds: the latest Fantasia `/properties` request returned HTTP 200. One candidate reports 8426 Fantasia Park Way, Riverview, FL 33578, type Manufactured. Sponsor input says 8426 Fantasia Parkway. The street-name token difference is not an approved equivalence, so the candidate was retained without selection. No AVM or Bass request followed. The earlier HTTP 401 remains historical evidence.', ''] : []),
  ...currentCandidates.map((item)=>`- Candidate for ${item.propertyId}: ${item.address}; provider type ${show(item.propertyType)}; selected: ${item.selected ? 'yes' : 'no'}.`), '',
  ...representationStops.flatMap((item)=>[
    `- ${item.propertyId}: ${item.anomalies.join(' ')} No AVM was requested after this STOP. Address matching alone does not establish manufactured-home representation.`,
  ]), '',
  '| Address | Resolution | AVM USD | Low / high USD | Comps | Variance USD / percent |',
  '| --- | --- | ---: | --- | ---: | --- |', ...rows, '',
  ...comparisons.filter((item)=>item.independentAvm !== null).map((item)=>`${item.address}: sponsor projected price $${item.sponsorProjectedPrice.toLocaleString('en-US')}; provider AVM $${item.independentAvm.toLocaleString('en-US')}; difference $${item.varianceDollars.toLocaleString('en-US')} (${item.variancePercent.toFixed(1)}% of provider AVM). Status: ${item.status}. The provider result is evidence, not verified resale proceeds or an investment recommendation.`), '',
  'Fantasia review: the provider reports 3 beds, 2 baths, 1,242 square feet, built 2006, and an assessor parcel identifier. Its 15 retained comps are manufactured-home listings, including active and inactive listings; none is relabeled a proven closing. The wide $40,000–$204,000 range and varying lot/unit attributes warrant land-tenure/comparability review. Provider land assessments do not establish ownership or make a comp equivalent. No proprietary ARV adjustment or comp removal was performed.', '',
  'Joyce remains ADDRESS_AMBIGUOUS: city, state and ZIP are not supplied. No discovery call was needed or made. The Florida portfolio context has not been used to assign Joyce a state.', '',
  '## Deterministic sponsor arithmetic', '',
  '| Deal | Sponsor-defined profit USD | Cash invested USD | Cash-on-cash (rounded) |',
  '| --- | ---: | ---: | ---: |',
  ...underwriting.deals.map((item)=>`| ${item.dealId} | ${item.projectedNetProfit} | ${item.totalCashInvested} | ${(item.projectedCashOnCashReturn*100).toFixed(1)}% |`),
  `| Portfolio | ${underwriting.totals.combinedProjectedNetProfit} | ${underwriting.totals.totalCashInvested} | ${(underwriting.totals.projectedCashOnCashReturn*100).toFixed(1)}% |`, '',
  'Net proceeds = list price − commission − escrow/closing − supplied space rent. Profit = net proceeds − acquisition − repairs. Cash invested = acquisition + repairs + space rent. Cash-on-cash = profit / cash invested. Space rent is deducted once, not twice. These reproduce sponsor arithmetic; they do not verify the inputs.', '',
  'The model is not fully burdened. Missing cost categories remain null/unknown: acquisition closing, taxes, insurance, utilities, financing, repair contingency, extra holding, community/park fees, transfer/application fees, price reductions, other disposition. Supplied three-month rent is not silently extended to match the 120-day timeline.', '',
  '## Evidence limitations and readiness', '',
  hasValues ? 'Provider valuations are displayed above where available. Sponsor values and claim statuses remain intact. No RentCast value is marked VERIFIED.' : 'No independent property value is available for any address. Candidate records are not selected properties. Sponsor values and claim statuses remain intact. No RentCast value is marked VERIFIED.', '',
  ...comparisons.map((item)=>`- ${item.dealId}: ${item.status}`), '',
  'Fantasia property details and AVM subject agree on the user-confirmed address, provider ID and Manufactured type. Bass coverage remains insufficient because the record omits type and structural/parcel details. Park/unit identity, land tenure, title, lien existence/priority, repairs and selling condition remain unknown. The promissory-note, three-property lien and 713 Bryce Drive free-and-clear/$230,000 statements remain sponsor claims; collateral was not queried.', '',
  'Fantasia now has actual evidence ready for Stan/ChatGPT review, but the portfolio remains incomplete because Bass stopped and Joyce lacks a full address. UI implementation remains gated on that review and explicit later scope.', '',
  '## Exact next step', '',
  nextStep, '',
  'Only after the current STOP gate is resolved and any confirmed identity mapping is implemented and tested, resume the first-property gate:', '',
  '```powershell', 'cd C:\\Users\\sjroy\\Source\\PropertyIntelligence', 'npm run rentcast:audit',
  'npm run deals:verify:florida -- --property fantasia', '```', '',
  'Inspect the sanitized raw response and `data/normalized/florida-verification.json`. Only if Fantasia has INDEPENDENT_EVIDENCE_AVAILABLE, correct identity and reliable manufactured-home representation, continue:', '',
  '```powershell', 'npm run deals:verify:florida -- --property bass', 'npm run deals:compare:florida',
  'npm test', 'npm run foundation:summarize', '```', '',
  '`--refresh` replaces cache selection while retaining older raw snapshots. A normal rerun reuses successful cached evidence and its original retrieval timestamp. Do not repeatedly retry a STOP condition.', '',
  '## Property Intelligence files created/changed', '',
  ...[...new Set(files)].sort().map((file)=>`- ${file}`), '',
  'The parent Source repository ignores this project via its existing wildcard rule; no parent ignore rules or Home Advisor files were changed. Artifacts are present on disk.', '',
].join('\n');
await writeText('docs/FOUNDATION_SPRINT1_COMPLETION_REPORT.md', report);
console.log(`Report written: ${status}; ${tests.passed}/${tests.tests} tests pass; ${totals.apiCalls} API attempts.`);
if (Object.values(checks).some((passed)=>!passed)) process.exitCode=1;
