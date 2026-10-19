import '../../src/analysis/offline.js';
import {spawnSync} from 'node:child_process';
import {ROOT,check,saveNew} from '../rentcast-controlled-pilot/core.js';
import {fileHash} from '../sprint6_2/io.js';
const files=['scripts/rentcast-crosswalk-investigation/hypothesis.test.js'];
const run=spawnSync(process.execPath,['--import','./src/analysis/offline.js','--test','--test-reporter=tap',...files],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
const output=(run.stdout??'')+(run.stderr??'');
const count=k=>Number(new RegExp(`^# ${k} (\\d+)$`,'m').exec(output)?.[1]??NaN);
const hashes={};for(const name of ['integrity.js','profile.js','hypothesis.test.js','qa.js']){const path=`scripts/rentcast-crosswalk-investigation/${name}`;hashes[path]=await fileHash(path);}
const result={completedAt:new Date().toISOString(),runtime:process.version,exitCode:run.status,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),files,hashes,providerCalls:0,databaseConnections:0,output};
await saveNew(`${ROOT}/private-crosswalk-qa.json`,result);console.log(JSON.stringify({...result,output:undefined,hashes:undefined}));
check(run.status===0&&result.tests>0&&result.passed===result.tests&&result.failed===0&&result.skipped===0,'CROSSWALK_QA_FAILED');
