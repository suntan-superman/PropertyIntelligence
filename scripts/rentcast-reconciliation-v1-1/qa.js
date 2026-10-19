import '../../src/analysis/offline.js';
import {spawnSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {ROOT} from './source.js';
import {check,saveNew} from '../rentcast-controlled-pilot/core.js';
import {readJson,verifyProtection} from '../rentcast-controlled-pilot/local.js';
const targeted=process.argv.includes('--targeted');
check(process.argv.slice(2).join(' ')===`--${targeted?'targeted':'regression'}`,'QA_ARGUMENT_REQUIRED');
const files=targeted?['scripts/rentcast-reconciliation-v1-1/reconcile.test.js']:[
  'scripts/rentcast-controlled-pilot/pilot.test.js','scripts/sprint6_2/poc.test.js',
  'scripts/identity-resolution-pilot/pilot.test.js','scripts/identity-resolution-pilot/review.test.js',
  'tests/foundation.test.js','scripts/mls-validation-round1/harness.test.js',
];
const result=spawnSync(process.execPath,['--import','./src/analysis/offline.js','--test','--test-reporter=tap',...files],{encoding:'utf8',timeout:180000,maxBuffer:12*1024*1024});
const output=(result.stdout??'')+(result.stderr??'');
const count=k=>Number(new RegExp(`^# ${k} (\\d+)$`,'m').exec(output)?.[1]??NaN);
const report={phase:targeted?'targeted':'regression',completedAt:new Date().toISOString(),runtime:process.version,exitCode:result.status,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),files,preservation:await verifyProtection((await readJson(`${ROOT}/preservation-before.json`)).hashes),output};
await mkdir(`${ROOT}/qa`,{recursive:true});await saveNew(`${ROOT}/qa/${report.phase}-${Date.now()}.json`,report);
console.log(JSON.stringify({...report,output:undefined}));
if(result.status!==0||report.failed!==0||report.skipped!==0||report.tests!==report.passed)process.exitCode=1;
