import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {ROOT,newJson,newText,verifyPreservation} from './guard.js';

assert(process.argv.length===3&&['targeted','regression'].includes(process.argv[2]),'QA_MODE_REQUIRED');
const mode=process.argv[2],directory=await mkdtemp(`${ROOT}/qa-${mode}-`);
const files=mode==='targeted'?['scripts/preliminary-property-analysis-v1/workflow.test.js']:[
  'scripts/rentcast-reconciliation-v1-1/reconcile.test.js',
  'scripts/rentcast-controlled-pilot/pilot.test.js',
  'scripts/identity-resolution-pilot/pilot.test.js',
  'scripts/identity-resolution-pilot/review.test.js',
  'scripts/identity-resolution-pilot/streamlined.test.js',
  'scripts/durable-identity-pilot/trusted-review.test.js',
  'tests/monte-carlo-v1.test.js',
  'tests/investor-report-v1.test.js',
  'tests/investor-mc-integration.test.js',
  'tests/investor-presentation.test.js',
  'scripts/protected-baselines-v3/reconciliation.test.js',
  'scripts/mls-validation-round1/harness.test.js'
];
const r=spawnSync(process.execPath,['--import','./src/analysis/offline.js','--test','--test-reporter=tap',...files],{encoding:'utf8',timeout:300000,maxBuffer:24*1024*1024,windowsHide:true});
const output=(r.stdout??'')+(r.stderr??'');await newText(`${directory}/tests.tap`,output);
const count=k=>Number(new RegExp(`^# ${k} (\\d+)$`,'m').exec(output)?.[1]??NaN);
const result={mode,directory,runtime:process.version,files,exitCode:r.status,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),cancelled:count('cancelled'),preservation:await verifyPreservation()};
result.status=r.status===0&&result.tests===result.passed&&result.failed===0&&result.skipped===0&&result.cancelled===0?'PASS':'FAIL';
await newJson(`${directory}/result.json`,result);console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
