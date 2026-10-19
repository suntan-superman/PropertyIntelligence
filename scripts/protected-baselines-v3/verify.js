import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {verifyCurrentProtectedBaseline as legacyCurrent} from '../protected-baseline-qa.js';
import {AUDIT,AUTHORIZATION,BASELINES,NESTED,HARNESS,POLICY_PATH,POLICY_HASH,SEAL_PATH,TOOLS,SOURCES,sha256,harnessTransition,validateSuccessor,validateNested,verifyEntries} from './contract.js';

const readJson=async file=>JSON.parse(await readFile(file,'utf8'));
const hash=sha256;
export async function checkedJson(file,expected){
  const bytes=await readFile(file);assert.equal(hash(bytes),expected,'ANCHOR_HASH_STOP: '+file);
  return JSON.parse(bytes);
}
export async function harnessTransitions(){
  return Promise.all(HARNESS.map(async item=>harnessTransition(item,await readFile(item.path))));
}
export function sealPaths(){
  return [...new Set([AUDIT.path,POLICY_PATH,...TOOLS,...HARNESS.map(x=>x.path),NESTED.previous,NESTED.current,
    ...Object.values(BASELINES).flatMap(x=>[x.previous,x.current]),
    'data/runtime/sprint6_2-kern-assessor/repository-baseline.json','data/runtime/sprint6_3/baseline.json'])].sort();
}
export async function verifySeal(){
  const seal=await readJson(SEAL_PATH);
  assert.deepEqual(Object.keys(seal).sort(),['authorization','files','schema']);
  assert.equal(seal.schema,'PI_DETACHED_PROTECTION_SEAL_V3');
  assert.equal(seal.authorization,AUTHORIZATION);
  assert.deepEqual(seal.files.map(x=>x.path),sealPaths(),'SEAL_MEMBERSHIP_STOP');
  for(const item of seal.files)assert.deepEqual(Object.keys(item).sort(),['path','sha256']);
  await verifyEntries(seal.files,readFile);
  assert(!seal.files.some(x=>x.path===SEAL_PATH),'SELF_REFERENCE_STOP');
  assert.equal(hash(await readFile(AUDIT.path)),AUDIT.sha256,'AUDIT_CHANGED_STOP');
  assert.equal(hash(await readFile(POLICY_PATH)),POLICY_HASH,'GENERATED_POLICY_CHANGED_STOP');
  // Check that every original generated-artifact assertion was copied verbatim,
  // apart from the explicitly versioned nested-manifest selection.
  const previous=(await readFile(POLICY_PATH,'utf8')).replace(/\r\n/g,'\n');
  const expected=previous.slice(previous.indexOf('export async function verifyGeneratedProtectedArtifacts')).trimEnd().replace(
    "  const protectedManifest = await artifact('data/validation/sprint6_1-protected.json');",
    "  const historicalProtectedManifest = await artifact('data/validation/sprint6_1-protected.json');\n  assert.equal(historicalProtectedManifest.files.length, 351);\n  const protectedManifest = await verifyNestedProtection();");
  const own=(await readFile('scripts/protected-baselines-v3/verify.js','utf8')).replace(/\r\n/g,'\n');
  const body=own.split('// BEGIN RETAINED GENERATED CHECKS\n')[1]?.split('// END RETAINED GENERATED CHECKS')[0]?.trimEnd();
  assert.equal(body,expected,'GENERATED_ASSERTION_DRIFT_STOP');
  return seal;
}
export async function verifyNestedProtection(){
  const previous=await checkedJson(NESTED.previous,NESTED.previousSha256),current=await readJson(NESTED.current);
  validateNested(previous,current);
  await verifyEntries(current.files,readFile);
  return current;
}
export async function verifyCurrentProtectedBaseline(options){
  const id=Object.keys(BASELINES).find(id=>BASELINES[id].current===options.file);
  assert(id,'UNAPPROVED_BASELINE_PATH_STOP');
  await verifySeal();
  const config=BASELINES[id],previous=await checkedJson(config.previous,config.previousSha256);
  await checkedJson(previous.sourceHistoricalManifest.path,previous.sourceHistoricalManifest.sha256);
  const nested=await verifyNestedProtection(),current=await readJson(options.file);
  const nestedHash=hash(await readFile(NESTED.current));
  validateSuccessor(previous,current,id,await harnessTransitions(),nestedHash);
  assert.equal(nested.files.length,351);
  for(const t of SOURCES)assert.equal(hash(await readFile(t.path)),t.newSha256,'WRONG_NEW_HASH_STOP: '+t.path);
  return legacyCurrent(options); // Retains all original exact hashes/count/path checks.
}
// BEGIN RETAINED GENERATED CHECKS
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

  const historicalProtectedManifest = await artifact('data/validation/sprint6_1-protected.json');
  assert.equal(historicalProtectedManifest.files.length, 351);
  const protectedManifest = await verifyNestedProtection();
  assert.equal(protectedManifest.files.length, 351);
  for (const item of protectedManifest.files) assert.equal(hash(await readFile(item.file)), item.sha256, item.file);
}
// END RETAINED GENERATED CHECKS

