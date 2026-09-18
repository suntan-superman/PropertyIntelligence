import { readJson, writeJson, writeText, csv } from '../src/io/files.js';
import { comparePortfolio } from '../src/underwriting/comparison.js';
const portfolio = await readJson('data/deals/florida-portfolio.json');
const verification = await readJson('data/normalized/florida-verification.json');
const comparisons = comparePortfolio(portfolio, verification);
await writeJson('data/comparisons/florida-comparisons.json', comparisons);
await writeText('data/comparisons/florida-comparisons.csv', csv(comparisons, ['dealId', 'address',
  'resolutionStatus', 'status', 'sponsorProjectedPrice', 'independentAvm', 'independentLow', 'independentHigh',
  'varianceDollars', 'variancePercent', 'comparableCount']));
console.log('Wrote 3 sponsor/evidence comparisons. Sponsor claims preserved.');
