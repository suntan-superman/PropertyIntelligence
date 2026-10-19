import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,cp,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fingerprint} from '../src/analysis/monteCarlo/contract.js';
import {runMonteCarlo} from '../src/analysis/monteCarlo/index.js';
import {fixture,syntheticRiskRule} from './fixtures/monteCarlo.js';
import {executionFor,ADAPTER_VERSION,SYNTHETIC_NOTICE} from '../src/reports/investor-v1/analysisTrust.js';
import {monteCarloReport} from '../src/reports/investor-v1/monteCarloAdapter.js';
import {normalizeInvestorReport} from '../src/reports/investor-v1/model.js';
import {investorReportHtml} from '../src/reports/investor-v1/html.js';
import {usd} from '../src/reports/investor-v1/monteCarloHtml.js';
import {freezeReport,verifyPackage,verifyCertifiedSource,OUTPUT_ROOT,sha,newPackageId} from '../src/reports/investor-v1/frozenPackage.js';
import {offlineStatus} from '../src/analysis/offline.js';

const fromCertificate=async name=>JSON.parse(await readFile(`data/validation/monte-carlo-v1/2026-10-09T17-55-37-247Z/${name}.json`,'utf8'));
const A=await fromCertificate('A_STRONG_MARGIN'),B=await fromCertificate('B_MARGINAL'),C=await fromCertificate('C_RENOVATION_OVERRUN');
const meta={packageId:'SYNTHETIC-TEST-PACKAGE-0001',generatedAt:'2026-10-09T18:00:00.000Z'};
const adapt=(r,options=meta)=>monteCarloReport(r,executionFor(r),options),rehashed=r=>{delete r.provenance.resultFingerprint;r.provenance.resultFingerprint=fingerprint(r);return r;};
const protectedPaths=['config/mls-validation-round1.json','src/underwriting/mao.js',...['contract','economics','sampling','statistics','index'].map(n=>`src/analysis/monteCarlo/${n}.js`)];
const protectedBefore=Object.fromEntries(await Promise.all(protectedPaths.map(async p=>[p,sha(await readFile(p))])));

test('certified versions and unchanged implementation bundle are accepted',async()=>{await verifyCertifiedSource();for(const r of [A,B,C])assert.equal(adapt(r).certifiedAnalysis.adapterVersion,ADAPTER_VERSION);});
for(const [name,change,hashAgain] of [
  ['invalid result fingerprint',r=>r.provenance.resultFingerprint='0'.repeat(64),false],
  ['wrong model',r=>r.modelVersion='wrong',true],['wrong economics',r=>r.economicsVersion='wrong',true],
  ['missing metric',r=>delete r.results.profit.p10,true],['nonfinite metric',r=>r.results.profit.p50=Infinity,false],
  ['wrong percentiles',r=>r.results.profit.p10=r.results.profit.p90+1,true],
  ['probability accounting',r=>r.results.probabilityOfLoss=.7,true],['iteration mismatch',r=>r.simulation.iterations=9,true],
  ['strategy',r=>r.strategy='RENTAL',true],['input fingerprint',r=>r.inputs.economics.rehabCost++,true],
  ['missing provenance',r=>delete r.inputs.provenance['economics.purchasePrice'],true],
  ['real identity',r=>r.inputs.scenarioId='REAL_PROPERTY_NOT_AUTHORIZED',true],
  ['unauthorized source',r=>r.inputs.provenance['economics.purchasePrice'].classification='PROVIDER_EVIDENCE',true],
  ['rehashed private content',r=>r.ownerContact='not-authorized-content',true]
])test(`strict adapter rejects ${name}`,()=>{const r=structuredClone(A);change(r);if(hashAgain){r.provenance.inputFingerprint=fingerprint(r.inputs);rehashed(r);}assert.throws(()=>adapt(r));});
test('stale approved execution cannot be used for another result',()=>assert.throws(()=>monteCarloReport(B,executionFor(A),meta),/IDENTITY_MISMATCH/));
test('caller-supplied certification claim or source bundle cannot bypass approval',()=>{const e={...executionFor(A),sourceBundleFingerprint:'1'.repeat(64)};assert.throws(()=>monteCarloReport(A,e,meta),/IDENTITY_MISMATCH/);});
test('probabilities, percentiles, bins and iterations map exactly without rounding',()=>{
  for(const r of [A,B,C]){const m=adapt(r);assert.equal(m.monteCarlo.probabilityPositive.value,r.results.probabilityOfProfit);assert.equal(m.monteCarlo.probabilityLoss.value,r.results.probabilityOfLoss);assert.equal(m.monteCarlo.probabilityTarget.value,r.results.probabilityMeetingTarget);assert.equal(m.monteCarlo.iterations.value,r.simulation.iterations);
    for(const k of ['p10','p50','p90'])assert.equal(m.monteCarlo.percentiles[k].value,r.results.profit[k]);assert.deepEqual(m.monteCarlo.profitDistribution.map(b=>({min:b.min.value,max:b.max.value,count:b.count.value})),r.results.profitDistribution);}
});
test('null conditional loss remains null, with no zero substitution',()=>{const m=adapt(A);assert.equal(m.certifiedAnalysis.result.results.expectedLossConditionalOnLoss,null);const h=investorReportHtml(m,{kind:'full'});assert.match(h,/Not applicable: no losses/);assert.match(h,/not a zero-severity/);});
test('negative profits have explicit minus signs in USD',()=>{const h=investorReportHtml(adapt(B),{kind:'full'});assert.ok(h.includes(usd(B.results.profit.p10)));assert.ok(usd(B.results.profit.p10).startsWith('-$'));});
test('deterministic and optional risk MAO remain separate; ROI is not cash-on-cash',()=>{const m=adapt(A),h=investorReportHtml(m,{kind:'full'});assert.equal(m.economics.mao.value,A.mao.deterministic.purchasePrice);assert.equal(m.economics.return.value,A.deterministic.roi);assert.match(h,/Risk-adjusted price ceiling/);assert.match(h,/not necessarily below/);assert.match(h,/profit \/ total project cost/);assert.match(h,/profit \/ peak modeled cash/);assert.match(h,/not annualized/);});
test('sensitivity keeps model order, signed dollar effects and unresolved ranking',()=>{const m=adapt(C),h=investorReportHtml(m,{kind:'full'});assert.deepEqual(m.monteCarlo.sensitivities.map(x=>x.impact.value),C.sensitivity.stresses.map(x=>x.effects.netProfit.meanChange));assert.match(h,/UNRESOLVED_OR_TIED/);assert.match(h,/not a fabricated ranking/);assert.match(h,/not causal variance contributions/);assert.doesNotMatch(h,/Relative modeled sensitivity impact/);});
test('synthetic notice is present on every calculated page with no fabricated address, disposition or photos',()=>{const m=adapt(A),h=investorReportHtml(m,{kind:'full'});assert.equal(m.disposition.value,'NOT_ASSESSED');assert.equal(h.split(SYNTHETIC_NOTICE).length-1,6);assert.doesNotMatch(h,/<img|https?:\/\/|@import|@font-face/);assert.equal((h.match(/data-count=/g)||[]).length,A.results.profitDistribution.length);assert.doesNotMatch(h,/PI disposition|BUY|guaranteed profitable/);});
test('normalization remains immutable and independent of rendering',()=>{const r=structuredClone(A),before=JSON.stringify(r),m=adapt(r);assert.equal(JSON.stringify(r),before);assert.ok(Object.isFrozen(m.certifiedAnalysis.result));assert.deepEqual(normalizeInvestorReport(m),m);});
test('new package metadata changes report identity, not exact simulation values',()=>{const a=adapt(A),b=adapt(A,{...meta,packageId:'SYNTHETIC-TEST-PACKAGE-0002'});assert.notEqual(a.modelFingerprint,b.modelFingerprint);assert.deepEqual(a.certifiedAnalysis.result,b.certifiedAnalysis.result);assert.throws(()=>adapt(A,{...meta,packageId:'real-address'}),/PACKAGE_ID/);});
test('fresh certified execution exactly matches the frozen analytical result',()=>{assert.deepEqual(runMonteCarlo(fixture('A_STRONG_MARGIN'),{riskRule:syntheticRiskRule()}),A);});

let base,folder;
test('frozen package is created with actual Puppeteer PDF and verifies with separate receipt',async()=>{
  folder=join(OUTPUT_ROOT,`tests-${randomUUID()}`);base=await freezeReport(A,{outputRoot:folder});const verified=await verifyPackage(base.directory,{receipt:base.receipt});assert.equal(verified.status,'PASS');assert.equal(verified.filesVerified,8);assert.equal(base.diagnostics.requests,0);
});
for(const file of ['inputs.json','analysis.json','report.json','report.html','report.pdf','manifest.json','execution.json','runtime.json','sources.json'])test(`${file} tampering is rejected without repairing frozen evidence`,async()=>{
  assert.ok(base,'prior package creation required');const dir=await mkdtemp(join(folder,'tamper-'));await cp(base.directory,dir,{recursive:true});await writeFile(join(dir,file),Buffer.concat([await readFile(join(dir,file)),Buffer.from('\nTAMPER')]));await assert.rejects(verifyPackage(dir,{receipt:base.receipt}),/TAMPERED/);
});
test('missing receipt and self-rehashed manifest are not accepted',async()=>{
  await assert.rejects(verifyPackage(base.directory),/TRUSTED_RECEIPT_REQUIRED/);
  const dir=await mkdtemp(join(folder,'rehashed-'));await cp(base.directory,dir,{recursive:true});const m=structuredClone(base.manifest);m.generatedAt='2027-01-01T00:00:00.000Z';await writeFile(join(dir,'manifest.json'),JSON.stringify(m));await assert.rejects(verifyPackage(dir,{receipt:base.receipt}),/MANIFEST_TAMPERED/);
});
test('missing or unexpected package files fail the exact file-set check',async()=>{
  const missing=await mkdtemp(join(folder,'missing-'));for(const name of await readdir(base.directory))if(name!=='report.pdf')await cp(join(base.directory,name),join(missing,name));await assert.rejects(verifyPackage(missing,{receipt:base.receipt}),/FILE_SET/);
  const extra=await mkdtemp(join(folder,'extra-'));await cp(base.directory,extra,{recursive:true});await writeFile(join(extra,'unexpected.txt'),'synthetic');await assert.rejects(verifyPackage(extra,{receipt:base.receipt}),/FILE_SET/);
});
test('mismatched source identity is rejected even with a newly computed manifest checksum',async()=>{
  const dir=await mkdtemp(join(folder,'source-'));await cp(base.directory,dir,{recursive:true});const m=structuredClone(base.manifest);m.execution.sourceBundleFingerprint='0'.repeat(64);const bytes=Buffer.from(JSON.stringify(m));await writeFile(join(dir,'manifest.json'),bytes);await assert.rejects(verifyPackage(dir,{receipt:{...base.receipt,manifestSha256:sha(bytes)}}),/EXECUTION_MISMATCH/);
});
test('rewritten file and manifest hashes cannot hide report-to-analysis mapping inconsistency',async()=>{
  const dir=await mkdtemp(join(folder,'mapping-'));await cp(base.directory,dir,{recursive:true});const m=structuredClone(base.manifest),report=structuredClone(base.model);report.economics.profit.value++;
  const bytes=Buffer.from(JSON.stringify(report));await writeFile(join(dir,'report.json'),bytes);m.artifacts['report.json']={sha256:sha(bytes),bytes:bytes.length};const mb=Buffer.from(JSON.stringify(m));await writeFile(join(dir,'manifest.json'),mb);
  await assert.rejects(verifyPackage(dir,{receipt:{...base.receipt,manifestSha256:sha(mb)}}),/REPORT_MAPPING_MISMATCH/);
});
test('existing package cannot be regenerated or overwritten',async()=>{const before=sha(await readFile(join(base.directory,'manifest.json')));await assert.rejects(freezeReport(A,{outputRoot:folder,packageId:base.manifest.packageId}),/EEXIST/);assert.equal(sha(await readFile(join(base.directory,'manifest.json'))),before);});
test('protected engine, MAO and Round 1 authorization remain unchanged; offline calls zero',async()=>{
  for(const [p,h] of Object.entries(protectedBefore))assert.equal(sha(await readFile(p)),h);assert.equal(offlineStatus().networkAttempts,0);assert.equal(offlineStatus().providerCalls,0);
});
