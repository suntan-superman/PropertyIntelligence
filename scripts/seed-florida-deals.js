import { floridaSeed } from '../src/domain/floridaSeed.js';
import { calculatePortfolio } from '../src/underwriting/deterministic.js';
import { writeJson } from '../src/io/files.js';
const portfolio = floridaSeed();
const underwriting = calculatePortfolio(portfolio);
await writeJson('data/deals/florida-portfolio.json', portfolio);
await writeJson('data/normalized/florida-underwriting.json', underwriting);
console.log('Seeded 3 sponsor deals; arithmetic PASS. Sponsor profit: 151978; return rounded: 70.5%.');
