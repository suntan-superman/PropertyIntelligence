import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,writeFile,mkdir,mkdtemp,copyFile,symlink,readdir,stat} from 'node:fs/promises';
import {resolve,relative,dirname,join} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {HARNESS,BASELINES,NESTED,SOURCES,TOOLS,SEAL_PATH,sha256,harnessTransition,AUTHORIZATION} from './contract.js';
import {verifySeal,verifyCurrentProtectedBaseline,verifyGeneratedProtectedArtifacts} from './verify.js';
const ROOT=resolve('.'),OUTPUT=resolve('data/runtime/versioned-baseline-reconciliation');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function hashFile(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
const save=async(p,v)=>writeFile(p,JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600});
const normalized=p=>p.replaceAll('\\','/');
const OWNED_FILES=new Set([...TOOLS,SEAL_PATH,NESTED.current,...Object.values(BASELINES).map(x=>x.current),
  'docs/PI_VERSIONED_BASELINE_RECONCILIATION.md','docs/PI_VERSIONED_BASELINE_RECONCILIATION_QA.md']);
const allowedNew=p=>OWNED_FILES.has(p);
const fileList=()=>execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
async function census(){
  const prior=await json('data/runtime/rentcast-reconciliation-v1-1/preservation-before.json');
  const paths=[...new Set([...fileList(),...Object.keys(prior.hashes)].map(normalized))].filter(p=>!allowedNew(p)).sort();
  const hashes={};for(const p of paths)hashes[p]=await hashFile(p);return hashes;
}
async function preflight(){
  assert.equal(process.version,'v22.12.0','VERIFIED_RUNTIME_REQUIRED');
  for(const config of Object.values(BASELINES)){
    assert.equal(await hashFile(config.previous),config.previousSha256);
    const b=await json(config.previous),entries=[...b.files,...b.additions];
    for(const t of SOURCES){assert.equal(entries.find(i=>i.path===t.path)?.sha256,t.oldSha256);assert.equal(await hashFile(t.path),t.newSha256);}
    for(const item of entries)if(!SOURCES.some(t=>t.path===item.path))assert.equal(await hashFile(item.path),item.sha256,'UNEXPECTED_PREWORK_CHANGE: '+item.path);
  }
  for(const t of HARNESS)assert.equal(await hashFile(t.path),t.oldSha256);
  assert.equal(await hashFile(NESTED.previous),NESTED.previousSha256);
}
async function preservation(before){
  const changes=[];
  for(const [p,old] of Object.entries(before)){
    const actual=await hashFile(p);
    if(actual===old)continue;
    const item=HARNESS.find(x=>x.path===p);assert(item,'UNEXPECTED_PROTECTED_CHANGE: '+p);
    assert.equal(old,item.oldSha256);const transition=harnessTransition(item,await readFile(p));assert.equal(actual,transition.newSha256);
    changes.push(transition);
  }
  assert.deepEqual(changes.map(x=>x.path).sort(),HARNESS.map(x=>x.path).sort());
  return {status:'PASS',paths:Object.keys(before).length,unchanged:Object.keys(before).length-changes.length,mechanicalReferenceChanges:changes,unexpectedChanges:0};
}
async function addTree(paths,dir){
  for(const e of await readdir(dir,{withFileTypes:true})){
    const p=normalized(join(dir,e.name));assert(!e.isSymbolicLink(),'COPY_SYMLINK_STOP');
    if(e.isDirectory())await addTree(paths,p);else paths.add(p);
  }
}
async function createCopy(directory){
  const workspace=join(directory,'workspace');await mkdir(workspace);
  const paths=new Set(fileList());
  // Complete historical protections, including ignored report/model artifacts.
  for(const config of Object.values(BASELINES)){
    const b=await json(config.current);
    paths.add(b.sourceHistoricalManifest.path);
    for(const i of [...b.files,...b.additions,...b.generatedArtifacts])paths.add(i.path);
  }
  for(const i of (await json(NESTED.previous)).files)paths.add(i.file);
  // Existing workbench/runtime tests also protect these explicitly named cached
  // dependencies. Copy original local bytes, never regenerate or fetch them.
  for(const manifest of ['data/validation/sprint3-protected-inputs.json','data/validation/sprint3_2-protected-inputs.json']){
    for(const item of (await json(manifest)).files){
      assert.equal(await hashFile(item.file),item.sha256,'FIXTURE_INPUT_HASH_STOP: '+item.file);
      paths.add(item.file);
    }
  }
  // Only the required local fixtures. No environment credentials/provider downloads.
  for(const dir of ['data/runtime/identity-resolution-pilot','data/runtime/mls-round1','data/validation/investor-report-v1'])await addTree(paths,dir);
  for(const p of ['data/raw/kern-assessor/KernCountyAssessor_GisParcels_2026final.zip',
    'data/raw/kern_power_to_sell_2026-09-15.csv',
    'data/runtime/sprint6_2-kern-assessor/extracted/TaxRoll_Land_2026final/TaxRoll_Land_2026final.dbf'])paths.add(p);
  const copied={};
  for(const p of [...paths].map(normalized).sort()){
    if(p.startsWith('data/runtime/versioned-baseline-reconciliation/'))continue;
    assert(!p.startsWith('/')&&!p.includes('..')&&!p.includes(':'),'COPY_PATH_STOP');
    assert(!/(^|\/)(?:\.git|\.netlify|node_modules)(\/|$)/.test(p),'COPY_PRIVATE_RUNTIME_STOP');
    assert(!/(^|\/)\.env(?:$|\.)/.test(p)||p.endsWith('.env.example'),'ENV_COPY_STOP');
    assert(!/\.(?:pem|key|p12|pfx)$/.test(p),'CREDENTIAL_COPY_STOP');
    const destination=join(workspace,p);await mkdir(dirname(destination),{recursive:true});await copyFile(p,destination);copied[p]=await hashFile(p);
  }
  // Installed dependencies are reused read-only; no npm operation or download.
  await symlink(join(ROOT,'node_modules'),join(workspace,'node_modules'),'junction');
  return {workspace,copied};
}
function childEnvironment(directory){
  const env={};
  for(const k of ['SystemRoot','WINDIR','ComSpec','PATH','PATHEXT','USERPROFILE','LOCALAPPDATA','APPDATA','PROGRAMFILES','PROGRAMFILES(X86)','SYSTEMDRIVE'])if(process.env[k])env[k]=process.env[k];
  env.TEMP=join(directory,'temp');env.TMP=env.TEMP;return env;
}
async function suite(name,files,workspace,directory){
  const start=Date.now(),args=['--import','./src/analysis/offline.js','--test','--test-reporter=tap',...files];
  console.log('RUN '+name+' ('+files.length+' files)');
  const result=await new Promise((ok,bad)=>{
    const child=spawn(process.execPath,args,{cwd:workspace,env:childEnvironment(directory),stdio:['ignore','pipe','pipe'],windowsHide:true});
    let out='',err='';child.stdout.on('data',b=>{out+=b;});child.stderr.on('data',b=>{err+=b;});
    child.on('error',bad);const timer=setTimeout(()=>child.kill(),600000);
    child.on('close',(code,signal)=>{clearTimeout(timer);ok({code,signal,out,err});});
  });
  const count=k=>Number(new RegExp('^# '+k+' (\\d+)$','m').exec(result.out)?.[1]??NaN);
  const row={name,files,runtime:process.version,exitCode:result.code,signal:result.signal,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped'),cancelled:count('cancelled'),durationMs:Date.now()-start};
  await writeFile(join(directory,name+'.tap'),result.out+result.err,{flag:'wx',mode:0o600});
  await save(join(directory,name+'.json'),row);
  console.log(JSON.stringify(row));
  assert.equal(row.exitCode,0,'SUITE_FAILED: '+name);assert.equal(row.failed,0);assert.equal(row.skipped,0);assert.equal(row.cancelled,0);assert(row.tests>0&&row.tests===row.passed);
  return row;
}
async function certify(directory){
  const before=await json(join(directory,'preservation-before.json'));
  await verifySeal();const initial=await preservation(before.hashes);
  const {workspace,copied}=await createCopy(directory);await mkdir(join(directory,'temp'));
  const groups=[
    ['successor-integrity',['scripts/protected-baselines-v3/reconciliation.test.js']],
    ['sprint6-regressions',['scripts/sprint6_2/poc.test.js','scripts/sprint6_3/api.test.js','scripts/sprint6_3/assessor.test.js','scripts/sprint6_3/certification.test.js','scripts/sprint6_3/schema-review.test.js','scripts/sprint6_3_1/address.test.js','scripts/sprint6_3_3/linkage.test.js']],
    ['rule-c-focused',['scripts/rentcast-reconciliation-v1-1/reconcile.test.js']],
    ['rule-c-complete',['scripts/rentcast-controlled-pilot/pilot.test.js','scripts/sprint6_2/poc.test.js','scripts/identity-resolution-pilot/pilot.test.js','scripts/identity-resolution-pilot/review.test.js','tests/foundation.test.js','scripts/mls-validation-round1/harness.test.js']],
    ['monitoring',['src/monitoring/monitoring.test.js','src/monitoring/real-attom.test.js']],
    ['application-financial-reports',(await readdir('tests')).filter(p=>p.endsWith('.test.js')).sort().map(p=>'tests/'+p)],
  ];
  const results=[];
  try{
    for(const [name,files] of groups)results.push(await suite(name,files,workspace,directory));
    for(const [p,h] of Object.entries(copied))assert.equal(await hashFile(join(workspace,p)),h,'ISOLATED_EXISTING_ARTIFACT_CHANGED: '+p);
    for(const config of Object.values(BASELINES)){
      const previous=await json(config.previous);
      const b=await verifyCurrentProtectedBaseline({file:config.current,sourceHash:previous.sourceHistoricalManifest.sha256,historicalFileCount:previous.sourceHistoricalManifest.fileCount,protectedFileCount:config.files});
      await verifyGeneratedProtectedArtifacts(b);
    }
    const preserved=await preservation(before.hashes);
    const totals=results.reduce((a,r)=>{for(const k of ['tests','passed','failed','skipped','cancelled'])a[k]+=r[k];return a;},{tests:0,passed:0,failed:0,skipped:0,cancelled:0});
    const summary={classification:'VERSIONED BASELINE RECONCILIATION CERTIFIED',authorization:AUTHORIZATION,completedAt:new Date().toISOString(),runtime:process.version,results,totals,preservation:preserved,isolatedCopy:{existingFilesVerified:Object.keys(copied).length,existingFilesChanged:0,dependencies:'Existing node_modules junction; no install'},sealSha256:await hashFile('config/protected-baselines/reconciliation-v3-seal.json'),providerCalls:0,databaseConnections:0,databaseWrites:0,mlsAccess:0,deployments:0,realPropertyApprovals:0,round1Selections:0,networkPolicy:'All test workers preload existing offline network guards; secret-free child environment; tests may intentionally exercise blocked tripwires.'};
    await save(join(directory,'summary.json'),summary);console.log(JSON.stringify({...summary,results:undefined,preservation:{...preserved,mechanicalReferenceChanges:preserved.mechanicalReferenceChanges.map(i=>i.path)}}));
  }catch(e){
    await save(join(directory,'failure.json'),{classification:'MORE DEVELOPMENT REQUIRED',message:e.message,completedAt:new Date().toISOString(),completedSuites:results,preservation:await preservation(before.hashes)});
    throw e;
  }
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--prepare'){
  await preflight();await mkdir(OUTPUT,{recursive:true});const directory=await mkdtemp(join(OUTPUT,'run-'));
  const hashes=await census();await save(join(directory,'preservation-before.json'),{createdAt:new Date().toISOString(),hashes});
  console.log(JSON.stringify({status:'PREFLIGHT_PASS',directory:normalized(relative(ROOT,directory)),preservedPaths:Object.keys(hashes).length}));
}else{
  assert(args.length===2&&['--run','--retry-from'].includes(args[0]),'EXPLICIT_MODE_REQUIRED');
  const directory=resolve(args[1]),rel=relative(OUTPUT,directory);
  assert(/^run-[A-Za-z0-9]+$/.test(rel),'TEST_OWNED_DIRECTORY_REQUIRED');
  if(args[0]==='--retry-from'){
    await verifySeal();await preservation((await json(join(directory,'preservation-before.json'))).hashes);
    const next=await mkdtemp(join(OUTPUT,'run-'));
    await writeFile(join(next,'preservation-before.json'),await readFile(join(directory,'preservation-before.json')),{flag:'wx',mode:0o600});
    await save(join(next,'retry-provenance.json'),{previousRun:normalized(relative(ROOT,directory)),reason:'Complete isolated fixture dependencies; rerun every suite without filtering',createdAt:new Date().toISOString()});
    console.log('FRESH_RETRY '+normalized(relative(ROOT,next)));await certify(next);
  }else await certify(directory);
}

