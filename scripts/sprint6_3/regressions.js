// Existing report scripts write fixed artifact paths. Run unchanged in an ignored
// QA copy, never overwrite the analyst's protected reports/evidence.
import {mkdir,cp,writeFile,readFile,readdir} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),work=resolve('data/runtime/sprint6_3',`regression-${randomUUID()}`);
await mkdir(work,{recursive:true});
const safeFilter=path=>{const rel=relative(root,path).split(sep).join('/');return !/(^|\/)\.env(?:$|\.)/.test(rel)&&!/^data\/(?:runtime|raw\/kern-assessor)(?:\/|$)/.test(rel);};
for(const dir of ['src','scripts','tests','apps','netlify','docs'])await cp(resolve(dir),resolve(work,dir),{recursive:true,filter:safeFilter});
await mkdir(resolve(work,'data'),{recursive:true});
for(const name of await readdir('data'))if(name!=='runtime')await cp(resolve('data',name),resolve(work,'data',name),{recursive:true,filter:safeFilter});
for(const file of ['package.json','package-lock.json','.env.example','netlify.toml'])await cp(resolve(file),resolve(work,file));
// Keep Vite's real paths within this copy's existing filesystem allowlist.
// A junction escapes that boundary and invalidates the dev-server QA.
await cp(resolve('node_modules'),resolve(work,'node_modules'),{recursive:true});
const env={...process.env};for(const k of Object.keys(env))if(/DATABASE_URL|RENTCAST|MARKET_DATA|GOOGLE_MAPS|NETLIFY_AUTH|^PG(?:HOST|USER|PASSWORD|PORT|DATABASE)$/.test(k))delete env[k];
const scripts=['qa-kern-import.js','qa-kern-screening.js','qa-mao.js','test-foundation.js','qa-ui.js','qa-ux-refinement.js','qa-deal-cleanup.js','qa-maps.js','qa-reports.js','qa-runtime-ui.js','qa-runtime-security.js','qa-investment-report.js'];
const result={status:'PASS',workspace:relative(root,work).split(sep).join('/'),providerCalls:0,productionDatabaseCalls:0,checks:[]};
for(const script of scripts){
  const started=Date.now(),run=spawnSync(process.execPath,[`scripts/${script}`],{cwd:work,env,encoding:'utf8',maxBuffer:8*1024*1024,timeout:240000});
  // Store QA output locally; no environment values are included in these runs.
  await writeFile(resolve(work,`${script}.log`),`${run.stdout??''}\n${run.stderr??''}`);
  const check={script,exitCode:run.status,ms:Date.now()-started};result.checks.push(check);console.log(JSON.stringify(check));
  if(run.status!==0){result.status='STOP';process.exitCode=1;break;}
}
if(result.status==='PASS')result.pdf=JSON.parse(await readFile(resolve(work,'data/validation/sprint6_1-pdf-qa.json')));
await writeFile(resolve(root,'data/validation/sprint6_3-regressions.json'),JSON.stringify(result,null,2)+'\n');
