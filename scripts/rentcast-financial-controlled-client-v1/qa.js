import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT,CODE,NEW_FILES,preservation,privacy,verifyShortlist} from './guard.js';
import {newJson,newText} from '../preliminary-property-analysis-v1/guard.js';
import {fileHash} from '../sprint6_2/io.js';
import {offlineStatus} from '../../src/analysis/offline.js';
assert.equal(process.version,'v22.12.0');
const mode=process.argv[2]??'all';assert(['focused','all'].includes(mode));assert(process.argv.length<=3);
const root=process.cwd(),out=await mkdtemp(`${ROOT}/qa-`),temp=resolve(out,'temporary');await mkdir(temp);
// Deliberately do not forward credentials, dotenv paths, NODE_OPTIONS or provider settings.
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(?:path|systemroot|windir|comspec|pathext)$/i.test(k)));
Object.assign(env,{TEMP:temp,TMP:temp,TMPDIR:temp,RCFC_QA_DIR:resolve(out,'synthetic')});
const groups=[{name:'controlled-client',files:[`${CODE}/client.test.js`]}];
if(mode==='all')groups.push(
  {name:'unchanged-regressions',files:['tests/foundation.test.js','tests/runtime.test.js','scripts/rentcast-reconciliation-v1-1/reconcile.test.js','scripts/protected-baselines-v3/reconciliation.test.js','scripts/mls-validation-round1/harness.test.js','scripts/mls-validation-round1/gate1b-identity-audit.test.js','scripts/real-financial-evidence-v1/audit.test.js']},
  {name:'unchanged-controlled-pilot',files:['scripts/rentcast-controlled-pilot/pilot.test.js'],cwd:resolve(out,'pilot-sandbox')});
const results=[];
for(const group of groups){
  if(group.cwd)await mkdir(group.cwd);
  let tap='',exitCode=0;const started=Date.now();
  try{tap=execFileSync(process.execPath,['--import',pathToFileURL(resolve('src/analysis/offline.js')).href,'--test','--test-reporter=tap',...group.files.map(f=>resolve(root,f))],{cwd:group.cwd??root,env,encoding:'utf8',maxBuffer:24*1024*1024});}
  catch(e){tap=String(e.stdout??'')+'\n'+String(e.stderr??'');exitCode=e.status??1;}
  await newText(`${out}/${group.name}.tap`,tap);
  const metric=n=>Number(new RegExp(`# ${n} (\\d+)`).exec(tap)?.[1]??NaN);
  const r={group:group.name,files:group.files,exitCode,durationMs:Date.now()-started,tests:metric('tests'),passed:metric('pass'),failed:metric('fail'),skipped:metric('skipped'),cancelled:metric('cancelled')};results.push(r);
  await newJson(`${out}/${group.name}.json`,r);console.log(JSON.stringify(r));
  if(exitCode||r.failed||r.skipped||r.cancelled||!r.tests||r.tests!==r.passed){process.exitCode=1;break;}
}
let checks=null;
if(!process.exitCode){
  await verifyShortlist();const p=await preservation();checks={preservation:p};
  if(mode==='all')checks.privacy=await privacy();
}
const artifacts={};for(const f of NEW_FILES){try{artifacts[f]=await fileHash(f);}catch{if(mode==='all')throw Error('REQUIRED_ARTIFACT_MISSING');}}
const result={status:process.exitCode?'FAIL':'PASS',mode,completedAt:new Date().toISOString(),runtime:process.version,groups:results,tests:results.reduce((n,r)=>n+r.tests,0),passed:results.reduce((n,r)=>n+r.passed,0),skipped:results.reduce((n,r)=>n+r.skipped,0),checks,artifacts,...offlineStatus(),databaseConnections:0,databaseWrites:0,providerCalls:0,realFinancialAnalyses:0,round1Selections:0,deployments:0};
await newJson(`${out}/result.json`,result);console.log(JSON.stringify({status:result.status,out,tests:result.tests,passed:result.passed,skipped:result.skipped,preservation:checks?.preservation?.count}));
