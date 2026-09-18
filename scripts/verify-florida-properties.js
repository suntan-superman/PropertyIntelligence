import { readJson, writeJson } from '../src/io/files.js';
import { calculatePortfolio } from '../src/underwriting/deterministic.js';
import { configuration, loadLocalEnvironment } from '../src/sources/rentcast/config.js';
import { createClient } from '../src/sources/rentcast/client.js';
import { verifyOne } from '../src/sources/rentcast/verify.js';
const args = process.argv.slice(2);
if (args.some((arg) => !['--property', 'fantasia', 'bass', '--refresh'].includes(arg))) throw new Error('Only --property fantasia|bass and --refresh are supported.');
const selectedId = args.includes('--property') ? args[args.indexOf('--property') + 1] : 'fantasia';
if (!['fantasia','bass'].includes(selectedId)) throw new Error('Select fantasia or bass. Joyce requires sponsor address confirmation.');
const portfolio = await readJson('data/deals/florida-portfolio.json');
calculatePortfolio(portfolio);
let state;
try { state = await readJson('data/normalized/florida-verification.json'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
state ??= { schemaVersion: 1, properties: portfolio.properties.map((input) => ({ propertyId: input.id,
  sponsorAddress: input.sponsorAddress, status: input.id === 'joyce' ? 'ADDRESS_AMBIGUOUS' : 'NOT_QUERIED',
  property: null, evidence: [], candidates: [], rawResponseRefs: [], anomalies: input.id === 'joyce'
    ? ['Street only. No city/state/ZIP inferred; no provider call.'] : [] })), runs: [] };
if (selectedId === 'bass' && state.properties.find((item) => item.propertyId === 'fantasia').status !== 'INDEPENDENT_EVIDENCE_AVAILABLE') {
  console.error('STOP: first complete-address property must pass and its evidence be inspected before Bass.');
  process.exitCode = 1;
} else {
  let client;
  try {
    loadLocalEnvironment();
    client = createClient(configuration());
    const input = portfolio.properties.find((item) => item.id === selectedId);
    const result = await verifyOne(client, input, { refresh: args.includes('--refresh') });
    state.properties[state.properties.findIndex((item) => item.propertyId === selectedId)] = result;
    // Refresh of the first-property gate invalidates downstream evidence for this run.
    if (selectedId === 'fantasia' && result.stopReason) {
      const bass = state.properties.find((item) => item.propertyId === 'bass');
      bass.status = 'NOT_QUERIED_STOP_GATE';
      bass.property = null; bass.evidence = []; bass.rawResponseRefs = [];
    }
    console.log(`${selectedId}: ${result.status}; API calls=${client.metrics.apiCalls}; cache hits=${client.metrics.cacheHits}`);
    if (result.stopReason) process.exitCode = 1;
  } catch {
    state.properties.find((item) => item.propertyId === selectedId).status = 'CONFIGURATION_STOP';
    console.error('CONFIGURATION_STOP: populate RENTCAST_API_KEY in the process environment or PropertyIntelligence/.env.');
    process.exitCode = 1;
  }
  state.runs.push({ at: new Date().toISOString(), propertyId: selectedId, refresh: args.includes('--refresh'),
    metrics: client?.metrics ?? { apiCalls: 0, cacheHits: 0, retries: 0, rateLimits: 0, events: [] } });
  await writeJson('data/normalized/florida-verification.json', state);
}
