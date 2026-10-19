import {spawnSync} from 'node:child_process';
import {mkdir,mkdtemp,readdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),base=path.join(root,'data/runtime/investment-workspace-v1');
await mkdir(base,{recursive:true});const output=await mkdtemp(path.join(base,'regressions-'));
// Same complete selection as test-foundation.js, without replacing its historical
// generated sprint3_2-unit-tests.json artifact.
const tests=(await readdir('tests')).filter(f=>f.endsWith('.test.js')).sort().map(f=>`tests/${f}`);
const started=Date.now();
const run=spawnSync(process.execPath,['--import','./src/analysis/offline.js','--test','--test-reporter=tap',...tests],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
await writeFile(path.join(output,'tests.tap'),run.stdout??'',{flag:'wx'});await writeFile(path.join(output,'tests-stderr.txt'),run.stderr??'',{flag:'wx'});
const count=label=>Number(run.stdout?.match(new RegExp(`^# ${label} (\\d+)$`,'m'))?.[1]??0);
const result={at:new Date().toISOString(),node:process.version,output,files:tests.length,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),exitCode:run.status,durationMs:Date.now()-started};
if(run.status!==0){console.log(JSON.stringify(result));await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2),{flag:'wx'});process.exitCode=1;}
else{
  const buildDir=path.join(output,'production-build'),build=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','apps/web/vite.config.js','--outDir',buildDir],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
  await writeFile(path.join(output,'build.log'),(build.stdout??'')+(build.stderr??''),{flag:'wx'});result.buildExitCode=build.status;
  const assets=await readdir(path.join(buildDir,'assets'));const bundles=await Promise.all(assets.filter(f=>f.endsWith('.js')).map(f=>readFile(path.join(buildDir,'assets',f),'utf8')));
  result.productionWorkspaceExcluded=!bundles.some(s=>s.includes('/api/investment')||s.includes('Select six-property demo')||s.includes('27096 Cote St')||s.includes('1708 Crestview Dr'));
  await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));if(build.status!==0||!result.productionWorkspaceExcluded)process.exitCode=1;
}
