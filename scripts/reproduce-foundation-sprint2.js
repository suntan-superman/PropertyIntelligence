import '../src/analysis/offline.js';
import {spawnSync} from 'node:child_process';
import {readdir,readFile} from 'node:fs/promises';
import {root,resolve,hash,writeJson} from '../src/io/files.js';
import {checkPreservation} from '../src/analysis/inputs.js';
const files=[];
async function inventory(dir){for(const e of await readdir(resolve(dir),{withFileTypes:true})){
  const p=`${dir}/${e.name}`;if(e.isDirectory())await inventory(p);else files.push(p);
}}
for(const dir of ['data/analysis/evidence','data/analysis/break-even','data/analysis/scenarios','data/analysis/sensitivity'])await inventory(dir);
files.push('docs/FLORIDA_DEAL_ANALYSIS_SPRINT2.md','docs/SPRINT2_SCENARIO_CATALOG.md');
const before=new Map();for(const file of files)before.set(file,hash(await readFile(resolve(file))));
const commands=[['analyze-evidence-completeness.js'],['analyze-break-even.js'],['analyze-scenarios.js'],['analyze-sensitivity.js'],['summarize-foundation-sprint2.js','--analysis-only']];
let networkAttempts=0;
for(const [script,...args]of commands){
  const run=spawnSync(process.execPath,['--import','./src/analysis/offline.js',`scripts/${script}`,...args],{cwd:root,encoding:'utf8'});
  if(run.status!==0)throw new Error(`Offline reproduction failed: ${script}: ${run.stderr}`);
  const log=JSON.parse(run.stdout.trim());networkAttempts+=log.networkAttempts;
}
const checked=[];
for(const file of files.sort()){
  const after=hash(await readFile(resolve(file)));
  checked.push({file,sha256:after,identical:before.get(file)===after});
}
const preservation=await checkPreservation();
const identical=checked.every(file=>file.identical);
await writeJson('data/validation/foundation-sprint2-reproducibility.json',{identical,filesChecked:checked.length,
  networkAttempts,providerCalls:0,networkDisabled:true,preservation,files:checked});
if(!identical||networkAttempts!==0)throw new Error('STOP: offline reproducibility failed');
console.log(JSON.stringify({identical,filesChecked:checked.length,networkAttempts,preservation}));
