// Local, synthetic-only certification. No environment loading, providers or DB.
import {offlineStatus} from '../src/analysis/offline.js';
import {mkdir,readFile,writeFile,mkdtemp,cp,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {runMonteCarlo} from '../src/analysis/monteCarlo/index.js';
import {MODEL_VERSION,MODEL_FINGERPRINT,GENERATOR_VERSION,fingerprint} from '../src/analysis/monteCarlo/contract.js';
import {fixture,CASES,syntheticRiskRule} from '../tests/fixtures/monteCarlo.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const runId=new Date().toISOString().replace(/[:.]/g,'-');
const out=join(root,'data/validation/monte-carlo-v1',runId);
await mkdir(out,{recursive:true});
const save=(name,data)=>writeFile(join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=['src/underwriting/mao.js','tests/fixtures/monteCarlo.js','tests/monte-carlo-v1.test.js','scripts/monte-carlo-v1-certify.js',
  ...['contract','sampling','statistics','economics','index'].map(n=>`src/analysis/monteCarlo/${n}.js`)];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(join(root,p)))])));
const guardRoots=['config','src/persistence','src/sources','src/monitoring','src/reports','netlify/database','scripts/durable-identity-pilot','scripts/identity-resolution-pilot','scripts/mls-validation-round1',
  'data/runtime/mls-round1','data/runtime/identity-resolution-pilot','data/runtime/identity-persistence-test'];
async function protection(){const result={};async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.isFile())result[relative(root,p).replaceAll('\\','/')]=sha(await readFile(p));}}for(const d of guardRoots)await walk(join(root,d));for(const p of ['.gitignore','package.json','package-lock.json','netlify.toml','data/runtime/sprint6_2-kern-assessor/repository-baseline.json','data/runtime/sprint6_3/baseline.json'])result[p]=sha(await readFile(join(root,p)));return result;}
const before=await protection();
await save('protected-before.json',before);
const summary={modelVersion:MODEL_VERSION,modelFingerprint:MODEL_FINGERPRINT,generatorVersion:GENERATOR_VERSION,
  runtime:process.version,scope:'LOCAL_SYNTHETIC_ONLY',startedAt:new Date().toISOString(),sourceHashes,tests:null,legacyMao:null,cases:[],benchmarks:[],
  providerCalls:0,databaseConnections:0,databaseWrites:0,realPropertyAnalyses:0,round1Selections:0};
try{
  const testFiles=['tests/monte-carlo-v1.test.js','tests/acquisition-linkage.test.js','tests/investment-report.test.js','tests/investor-report-v1.test.js'];
  const test=spawnSync(process.execPath,['--import','./src/analysis/offline.js','--test',...testFiles],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  await writeFile(join(out,'tests.tap'),test.stdout??'',{flag:'wx'});await writeFile(join(out,'tests.stderr.txt'),test.stderr??'',{flag:'wx'});
  const count=name=>Number(test.stdout?.match(new RegExp(`^# ${name} (\\d+)$`,'m'))?.[1]??0);
  summary.tests={files:testFiles,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),cancelled:count('cancelled'),exitCode:test.status};
  assert.equal(test.status,0,'REGRESSION_FAILURE');assert.equal(summary.tests.skipped,0);assert.equal(summary.tests.cancelled,0);
  console.log(JSON.stringify({phase:'synthetic-regressions',...summary.tests}));

  // Run the unchanged legacy QA in a retained isolated copy because that script
  // regenerates a historical report. No .env, dependencies or real fixtures copied.
  const isolated=await mkdtemp(join(tmpdir(),'pi-mc-legacy-qa-'));
  for(const d of ['src/underwriting','src/io'])await cp(join(root,d),join(isolated,d),{recursive:true});
  await mkdir(join(isolated,'src/analysis'),{recursive:true});await mkdir(join(isolated,'scripts'));
  for(const p of ['src/analysis/offline.js','src/analysis/diligenceQuestions.js','scripts/qa-mao.js','package.json'])await cp(join(root,p),join(isolated,p));
  const qa=spawnSync(process.execPath,['--import','./src/analysis/offline.js','scripts/qa-mao.js'],{cwd:isolated,encoding:'utf8',timeout:30000});
  await writeFile(join(out,'legacy-mao.stdout.txt'),qa.stdout??'',{flag:'wx'});await writeFile(join(out,'legacy-mao.stderr.txt'),qa.stderr??'',{flag:'wx'});
  assert.equal(qa.status,0,'EXISTING_MAO_QA_FAILURE');const qaResult=JSON.parse(qa.stdout);
  summary.legacyMao={status:qaResult.status,checks:qaResult.checks.length,isolatedCopyRetained:true,mainHistoricalArtifactWritten:false,
    note:'Unchanged existing QA body; its hard-coded report label is historical. Actual MAO version is captured in source and focused tests.'};

  for(const name of CASES){
    const input=fixture(name);assert.ok(input.scenarioId.startsWith('SYNTHETIC_MC_'));
    assert.ok(Object.values(input.provenance).every(v=>v.classification==='SYNTHETIC_TEST_FIXTURE'));
    if(name==='E_INVALID'){assert.throws(()=>runMonteCarlo(input),/MC_INVALID_rehabCost/);summary.cases.push({name,status:'EXPECTED_REJECTION',reason:'MC_INVALID_rehabCost',fabricatedOutput:false});continue;}
    const start=performance.now();const result=runMonteCarlo(input,{riskRule:syntheticRiskRule()});
    const elapsedMs=performance.now()-start;await save(`${name}.json`,result);
    const replay=runMonteCarlo(input,{riskRule:syntheticRiskRule()});assert.deepEqual(replay,result,'NONDETERMINISTIC_RESULT');
    summary.cases.push({name,status:'PASS',iterations:result.simulation.iterations,elapsedMs,resultFingerprint:result.provenance.resultFingerprint,
      deterministicProfit:result.deterministic.modeledProfit,meanProfit:result.results.profit.mean,probabilityOfLoss:result.results.probabilityOfLoss,
      deterministicMao:result.mao.deterministic.purchasePrice,riskAdjustedMao:result.riskAdjustedMao.purchasePrice,exactReplay:true});
    console.log(JSON.stringify({phase:'scenario',...summary.cases.at(-1)}));
  }
  // B has independent centered triangular price/rehab and fixed timing. Its
  // expected profit equals the deterministic mean-input result within < 3 cents
  // of bounded line rounding. Sampling-error checks do not imply calibration.
  for(const iterations of [1000,10000,50000,100000]){
    const input=fixture('B_MARGINAL',iterations),heapBefore=process.memoryUsage().heapUsed,start=performance.now();
    const result=runMonteCarlo(input,{includeSensitivity:false});const elapsedMs=performance.now()-start,memory=process.memoryUsage();
    assert.ok(Math.abs(result.results.profit.mean-result.deterministic.modeledProfit)<=4*result.results.samplingError.meanProfitStandardError+.03,'MEAN_SAMPLING_STABILITY');
    summary.benchmarks.push({iterations,mode:'CORE_WITHOUT_SENSITIVITY_OR_RISK_MAO',elapsedMs,heapBeforeBytes:heapBefore,heapAfterBytes:memory.heapUsed,
      rssBytes:memory.rss,processPeakRssKiB:process.resourceUsage().maxRSS,meanProfit:result.results.profit.mean,p10:result.results.profit.p10,p90:result.results.profit.p90,
      probabilityOfLoss:result.results.probabilityOfLoss,...result.results.samplingError,sampleFingerprint:result.provenance.sampleFingerprint});
    console.log(JSON.stringify({phase:'benchmark',iterations,elapsedMs,rssMiB:memory.rss/1024/1024}));
  }
  const a=summary.benchmarks[1],b=summary.benchmarks[2];
  assert.ok(Math.abs(a.meanProfit-b.meanProfit)<=4*Math.hypot(a.meanProfitStandardError,b.meanProfitStandardError)+.03,'ITERATION_MEAN_STABILITY');
  assert.ok(Math.abs(a.probabilityOfLoss-b.probabilityOfLoss)<=4*Math.hypot(a.probabilityOfLossStandardError,b.probabilityOfLossStandardError),'ITERATION_PROBABILITY_STABILITY');
  summary.stability={status:'PASS',meanVsAnalytical:'within four estimator standard errors plus three-cent rounding allowance at each count',
    comparison:'10,000 versus 50,000 within four combined estimator standard errors; nested samples, conservative diagnostic only',
    note:'No claim that error must decrease monotonically with iterations; no predictive accuracy or assumption calibration measured.'};
  const after=await protection();assert.deepEqual(after,before,'PROTECTED_FILES_CHANGED');
  for(const [file,expected] of Object.entries(sourceHashes))assert.equal(sha(await readFile(join(root,file))),expected,'CERTIFICATION_SOURCE_CHANGED');
  assert.equal(offlineStatus().networkAttempts,0);summary.preservation={status:'PASS',paths:Object.keys(before).length,unexpectedChanges:0};
  summary.network=offlineStatus();summary.sourceBundleFingerprint=fingerprint(sourceHashes);summary.status='MONTE CARLO V1 CERTIFIED';
}catch(error){summary.status='MORE DEVELOPMENT REQUIRED';summary.failure=error.message;process.exitCode=1;}
summary.completedAt=new Date().toISOString();await save('summary.json',summary);
console.log(JSON.stringify({status:summary.status,artifact:relative(root,out).replaceAll('\\','/'),tests:summary.tests,legacyMao:summary.legacyMao,preservation:summary.preservation,network:summary.network,failure:summary.failure}));
