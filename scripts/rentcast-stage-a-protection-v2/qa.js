import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readdir,readFile,open} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {ROOT,REPO,abs,REGISTRY,INPUTS,PROOF,cleanEnvironment} from './paths.js';
import {testGroups,preservation,implementationHashes} from './guard.js';
import {sha} from '../rentcast-financial-controlled-client-v1/contract.js';
import {offlineStatus} from '../../src/analysis/offline.js';
import {privacy} from './prepare.js';
import {PRIVATE_ROOT} from '../rentcast-financial-controlled-client-v1/ledger.js';
assert.equal(process.version,'v22.12.0');assert.equal(process.argv.length,2);
async function save(path,v){const f=await open(path,'wx',0o600);try{await f.writeFile(typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');await f.sync();}finally{await f.close();}}
const out=await mkdtemp(`${ROOT}/qa-`),temp=abs(`${out}/temporary`);await mkdir(temp);
// Original ledger containment is immutable: use a fresh test-owned child of it.
const synthetic=await mkdtemp(`${PRIVATE_ROOT}/successor-v2-qa-`);
const results=[];
for(const group of testGroups()){
 const env={...cleanEnvironment(),TEMP:temp,TMP:temp,TMPDIR:temp,RC_STAGE_A_QA_DIR:abs(`${synthetic}/${group.name}-synthetic`),RCFC_QA_DIR:abs(`${synthetic}/${group.name}-prior-client`)};
 let cwd=REPO;if(group.sandbox){cwd=abs(`${out}/pilot-sandbox`);await mkdir(cwd);}
 let tap='',exitCode=0;const started=Date.now();
 try{tap=execFileSync(process.execPath,['--import',pathToFileURL(abs('src/analysis/offline.js')).href,'--test','--test-reporter=tap',...group.files.map(abs)],{cwd,env,encoding:'utf8',maxBuffer:32*1024*1024});}
 catch(e){exitCode=e.status??1;tap=String(e.stdout??'')+'\n'+String(e.stderr??'');}
 await save(`${out}/${group.name}.tap`,tap);
 const metric=n=>Number(new RegExp(`# ${n} (\\d+)`).exec(tap)?.[1]??NaN);
 const r={name:group.name,files:group.files,exitCode,tests:metric('tests'),passed:metric('pass'),failed:metric('fail'),skipped:metric('skipped'),cancelled:metric('cancelled'),durationMs:Date.now()-started,tapSha256:sha(tap)};
 results.push(r);console.log(JSON.stringify(r));
 // Complete every requested suite for diagnosis; any failure prevents a PASS proof.
}
let p;try{p=await preservation();await privacy();assert.deepEqual(await readdir(REGISTRY),[]);assert.deepEqual(await readdir(INPUTS),[]);}catch(e){p={unexpectedChanges:null,status:'FAIL',code:e.code??'PRESERVATION_OR_PRIVACY_STOP'};}
const status=results.every(r=>r.exitCode===0&&r.tests>0&&r.tests===r.passed&&r.failed+r.skipped+r.cancelled===0)&&p.unexpectedChanges===0?'PASS':'FAIL';
const total=k=>results.reduce((n,r)=>n+r[k],0);
const q={version:'STAGE_A_OFFLINE_PROOF_V2',status,completedAt:new Date().toISOString(),runtime:process.version,qaDirectory:out,syntheticDirectory:synthetic,groups:results,tests:total('tests'),passed:total('passed'),failed:total('failed'),skipped:total('skipped'),cancelled:total('cancelled'),preservation:p,implementationHashes:await implementationHashes(),...offlineStatus(),membershipApproved:false,certificateIssued:false,providerApiRequests:0,databaseConnections:0,databaseWrites:0,keyLoads:0,actualReservations:0,realFinancialAnalyses:0,properties:0,mls:0,deployments:0};
await save(`${out}/result.json`,q);await save(PROOF,q);
console.log(JSON.stringify({status,tests:q.tests,passed:q.passed,failed:q.failed,skipped:q.skipped,preservation:p,out,certificateIssued:false}));
if(status!=='PASS')process.exitCode=1;
