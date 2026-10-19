// Explicit local-only invocation; deliberately not an npm lifecycle task.
import {spawnSync} from 'node:child_process';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
if(process.argv.length!==2)throw new Error('NO_TARGET_OVERRIDE_SUPPORTED');
const root='data/runtime/identity-persistence-test';execFileSync('git',['check-ignore','--quiet',`${root}/test-output.json`],{stdio:'pipe'});
await mkdir(root,{recursive:true});const dir=await mkdtemp(`${root}/test-run-`);
const files=['scripts/sprint6_3_1/address.test.js','scripts/sprint6_3_3/linkage.test.js','tests/persistence.test.js','scripts/mls-validation-round1/harness.test.js','scripts/mls-validation-round1/gate1b-identity-audit.test.js','scripts/identity-resolution-pilot/pilot.test.js','scripts/durable-identity-pilot/pilot.test.js'];
const totals=s=>Object.fromEntries(['tests','pass','fail','skipped','cancelled'].map(k=>[k,Number(s.match(new RegExp(`^# ${k} (\\d+)$`,'m'))?.[1]??-1)]));
const offline=spawnSync(process.execPath,['--import','./src/analysis/offline.js','--test','--test-reporter=tap',...files],{encoding:'utf8',timeout:60000,maxBuffer:4e6,windowsHide:true});
await writeFile(`${dir}/offline.tap`,offline.stdout??'');console.log(JSON.stringify({offline:totals(offline.stdout??'')}));
if(offline.status!==0){process.exitCode=1;}else{
  const env={...process.env,PI_IDENTITY_V2_TEST:'LOCAL_SYNTHETIC_ONLY'};for(const k of Object.keys(env))if(/^(PG|DATABASE_|SUPABASE_)/.test(k))delete env[k];
  const real=spawnSync(process.execPath,['--test','--test-reporter=tap','scripts/durable-identity-pilot/postgres.integration.js'],{env,encoding:'utf8',timeout:120000,maxBuffer:4e6,windowsHide:true});
  await writeFile(`${dir}/postgres.tap`,real.stdout??'');await writeFile(`${dir}/summary.json`,JSON.stringify({offline:totals(offline.stdout??''),postgres:totals(real.stdout??''),exitCode:real.status},null,2)+'\n');
  console.log(JSON.stringify({postgres:totals(real.stdout??''),artifact:real.stdout?.match(/LOCAL_CERTIFICATION_ARTIFACT=([^\r\n]+)/)?.[1]??null,transcripts:dir,exitCode:real.status}));if(real.status!==0)process.exitCode=1;
}
