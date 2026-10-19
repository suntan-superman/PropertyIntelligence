import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const GENERATED_PROTECTED_PATHS = [
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

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));

export async function verifyCurrentProtectedBaseline({ file, sourceHash, historicalFileCount, protectedFileCount }) {
  const baseline = await readJson(file);
  assert.equal(baseline.schema, 'PI_PROTECTED_BASELINE_V1');
  assert.equal(baseline.sourceHistoricalManifest.sha256, sourceHash);
  assert.equal(baseline.sourceHistoricalManifest.fileCount, historicalFileCount);
  assert.equal(baseline.files.length, protectedFileCount);
  assert.equal(baseline.generatedArtifacts.length, GENERATED_PROTECTED_PATHS.length);
  assert.deepEqual(baseline.generatedArtifacts.map(item => item.path).sort(), [...GENERATED_PROTECTED_PATHS].sort());
  assert.equal(new Set(baseline.files.map(item => item.path)).size, baseline.files.length);
  for (const item of baseline.files) assert.equal(hash(await readFile(item.path)), item.sha256, item.path);
  for (const item of baseline.additions) assert.equal(hash(await readFile(item.path)), item.sha256, item.path);
  return baseline;
}

export async function verifyGeneratedProtectedArtifacts(baseline) {
  const generated = new Set(baseline.generatedArtifacts.map(item => item.path));
  for (const item of baseline.generatedArtifacts) {
    assert.match(item.historicalSha256, /^[a-f0-9]{64}$/);
    if (item.format === 'pdf') {
      const bytes = await readFile(item.path);
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', item.path);
    }
  }
  const artifact = async file => {
    assert(generated.has(file), `not in explicit generated-artifact scope: ${file}`);
    return readJson(file);
  };

  const mapQa = await artifact('data/validation/sprint3_2-map-qa.json');
  assert.ok(mapQa.results.length > 0 && mapQa.results.every(result => result.status === 'PASS'));
  const pdfQa32 = await artifact('data/validation/sprint3_2-pdf-qa.json');
  assert.equal(pdfQa32.preservation.status, 'PASS');
  assert.ok(pdfQa32.results.length > 0 && pdfQa32.results.every(result => Number.isInteger(result.pages) && result.pages > 0));
  for (const file of [
    'data/validation/sprint3_2-runtime-ui-qa.json',
    'data/validation/sprint3_2-security-qa.json',
    'data/validation/sprint3_2-ui-qa.json',
    'data/validation/sprint4-1-supabase-preflight.json',
    'data/validation/sprint5-mao-qa.json',
    'data/validation/sprint6_1_1-deploy.json',
    'data/validation/sprint6_1-pdf-qa.json',
  ]) assert.equal((await artifact(file)).status, 'PASS', file);

  const unit = await artifact('data/validation/sprint3_2-unit-tests.json');
  assert.equal(unit.exitCode, 0);
  assert.equal(unit.failed, 0);
  assert.equal(unit.tests, unit.passed);
  if (unit.skipped !== undefined) assert.equal(unit.skipped, 0);

  const pdfQa = await artifact('data/validation/sprint6_1-pdf-qa.json');
  assert.equal(pdfQa.results.length, 15);
  assert.ok(pdfQa.results.every(result => result.status === 'PASS' && Number.isInteger(result.pages) && result.pages > 0));

  const protectedManifest = await artifact('data/validation/sprint6_1-protected.json');
  assert.equal(protectedManifest.files.length, 351);
  for (const item of protectedManifest.files) assert.equal(hash(await readFile(item.file)), item.sha256, item.file);
}
