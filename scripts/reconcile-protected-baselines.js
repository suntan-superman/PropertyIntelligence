import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const HISTORICAL = [
  {
    id: 'sprint6_2',
    sourcePath: 'data/runtime/sprint6_2-kern-assessor/repository-baseline.json',
    sourceSha256: 'a1adde8cdb5600fe51150b192e37de8e7fc6cbdfd3f5631daab255b4ddf8e7d9',
    outputPath: 'config/protected-baselines/sprint6_2-current-v2.json',
    fileCount: 567,
  },
  {
    id: 'sprint6_3',
    sourcePath: 'data/runtime/sprint6_3/baseline.json',
    sourceSha256: 'eefc99778702317f8da83d93ef3f80aa3a8abd73eac3f5dab04725af092160d3',
    outputPath: 'config/protected-baselines/sprint6_3-current-v2.json',
    fileCount: 592,
  },
];

// These 14 source/configuration paths were individually reviewed in
// docs/HISTORICAL_BASELINE_RECONCILIATION.md. No other historical mismatch is
// accepted here. Package files are deliberately re-pinned after this migration.
const REVIEWED_PATHS = new Map([
  ['.gitignore', 'Reviewed secret/raw-data protections; retain all current rules.'],
  ['apps/web/src/app/App.jsx', 'Authorized Sprint 6.3.1–6.3.3 workflow changes.'],
  ['apps/web/src/features/opportunities/Opportunities.jsx', 'Authorized Sprint 6.3.2–6.3.3 detail/linkage UI.'],
  ['apps/web/src/services/api.js', 'Authorized address/detail/lineage API and DTO changes.'],
  ['apps/web/src/styles.css', 'Authorized resolver/detail UX changes.'],
  ['scripts/db-migrate.js', 'Authorized migration 006 verification-list addition only.'],
  ['src/persistence/opportunityRepository.js', 'Authorized durable Opportunity→Property lineage.'],
  ['src/services/opportunityService.js', 'Authorized canonical address and derived lifecycle.'],
  ['src/services/propertyPersistenceService.js', 'Authorized workflow-origin lineage persistence.'],
  ['src/workbench/api/router.js', 'Authorized address/detail/linkage routes and DTOs.'],
  ['src/reports/investment/pdf.js', 'User-authorized Puppeteer investor-report implementation.'],
  ['src/reports/pdf.js', 'User-authorized Puppeteer investor-report implementation.'],
  ['package.json', 'User-authorized Puppeteer 25 / Node 22 migration in this task.'],
  ['package-lock.json', 'Normal lockfile resolution for this authorized dependency migration.'],
  ['scripts/test-foundation.js', 'Certified mechanical explicit test enumeration.'],
  ['netlify.toml', 'Remove stale repository Node 20 build override; defer to Netlify Dependency Management Node 24.'],
  ['scripts/sprint6_2/poc.test.js', 'Replace byte-pinned regenerated output assertions with closed-list structural/content checks.'],
  ['scripts/sprint6_3/schema-review.test.js', 'Use versioned current immutable-source protection without broad scoped exceptions.'],
  ['scripts/sprint6_3/source-plan.js', 'Use the reviewed current baseline while retaining exact hashes for Assessor source and crosswalk inputs.'],
]);

const GENERATED_PATHS = [
  'data/validation/sprint3_2-map-qa.json',
  'data/validation/sprint3_2-pdf-qa.json',
  'data/validation/sprint3_2-runtime-ui-qa.json',
  'data/validation/sprint3_2-security-qa.json',
  'data/validation/sprint3_2-ui-qa.json',
  'data/validation/sprint3_2-unit-tests.json',
  'data/validation/sprint4-1-supabase-preflight.json',
  'data/validation/sprint5-mao-qa.json',
  'data/validation/sprint6_1_1-deploy.json',
  'data/validation/sprint6_1-pdf-qa.json',
  'data/validation/sprint6_1-protected.json',
  ...['all-15-comps', 'complete', 'exit-conflict', 'explicit-zero', 'extreme-dollars', 'historical', 'large-rehab', 'long-legal', 'long-sources', 'manufactured', 'many-diligence', 'many-encumbrances', 'minimal', 'no-condition', 'sparse'].map(name => `data/validation/sprint6_1-pdf/${name}.pdf`),
];

const ADDITIONAL_PROTECTED_PATHS = [
  ['netlify.toml', 'Repository build config must not override the Netlify site Node 24 setting.'],
  ['scripts/test-foundation.js', 'Certified mechanical explicit test enumeration.'],
  ['scripts/qa-investor-reports-v1.js', 'QA instrumentation must report the installed Puppeteer version dynamically.'],
  ['scripts/protected-baseline-qa.js', 'Closed-list exact-hash and generated-artifact structural validation.'],
  ['scripts/reconcile-protected-baselines.js', 'Fail-closed generator for the individually reviewed current baselines.'],
  ['scripts/sprint6_2/poc.test.js', 'Replace byte-pinned regenerated output assertions with closed-list structural/content checks.'],
  ['scripts/sprint6_3/schema-review.test.js', 'Use versioned current immutable-source protection without broad scoped exceptions.'],
  ['scripts/sprint6_3/source-plan.js', 'Current import-preflight code must remain exactly reviewed and hash-protected.'],
];

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = async file => sha256(await readFile(file));

async function buildBaseline(historical) {
  const sourceBytes = await readFile(historical.sourcePath);
  assert.equal(sha256(sourceBytes), historical.sourceSha256, `${historical.id}: historical manifest changed`);
  const source = JSON.parse(sourceBytes);
  assert.equal(source.files.length, historical.fileCount, `${historical.id}: historical entry count changed`);
  const files = [], generatedArtifacts = [], reconciled = [];
  const seen = new Set();

  for (const entry of source.files) {
    assert(!seen.has(entry.path), `${historical.id}: duplicate historical path ${entry.path}`);
    seen.add(entry.path);
    if (GENERATED_PATHS.includes(entry.path)) {
      generatedArtifacts.push({ path: entry.path, historicalSha256: entry.sha256, format: entry.path.endsWith('.pdf') ? 'pdf' : 'json' });
      continue;
    }
    const currentSha256 = await fileHash(entry.path);
    if (currentSha256 !== entry.sha256) {
      const reason = REVIEWED_PATHS.get(entry.path);
      assert(reason, `${historical.id}: UNRECONCILED_DRIFT ${entry.path}`);
      reconciled.push({ path: entry.path, historicalSha256: entry.sha256, currentSha256, reason });
    }
    files.push({ path: entry.path, sha256: currentSha256 });
  }

  assert.equal(generatedArtifacts.length, GENERATED_PATHS.length, `${historical.id}: generated path scope mismatch`);
  assert.deepEqual(generatedArtifacts.map(item => item.path).sort(), [...GENERATED_PATHS].sort());

  const additions = [];
  for (const [file, reason] of ADDITIONAL_PROTECTED_PATHS) {
    if (seen.has(file)) continue;
    additions.push({ path: file, sha256: await fileHash(file), reason });
  }

  return {
    schema: 'PI_PROTECTED_BASELINE_V1',
    baselineId: `${historical.id}-post-node22-puppeteer25-v2`,
    createdAt: new Date().toISOString(),
    sourceHistoricalManifest: { path: historical.sourcePath, sha256: historical.sourceSha256, fileCount: historical.fileCount },
    treatment: 'Exact hashes for immutable files; explicitly enumerated generated QA/PDF outputs are validated structurally and retain their historical hashes as provenance.',
    files,
    generatedArtifacts,
    reconciled,
    additions,
  };
}

assert(process.argv.includes('--write'), 'Refusing to write without explicit --write');
const writeFlags = process.argv.includes('--replace') ? 'w' : 'wx';
for (const item of HISTORICAL) {
  const baseline = await buildBaseline(item);
  await mkdir(path.dirname(item.outputPath), { recursive: true });
  await writeFile(item.outputPath, `${JSON.stringify(baseline, null, 2)}\n`, { flag: writeFlags });
  console.log(`${baseline.baselineId}: ${baseline.files.length} exact; ${baseline.generatedArtifacts.length} structural/generated; ${baseline.reconciled.length} individually reconciled; ${baseline.additions.length} added protected paths`);
}
