import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {abs,ROOT,CODE,CERTIFICATE,REGISTRY,REGRESSION_FILES,cleanEnvironment,NEW_FILES} from './paths.js';
import {preservation,privacy,implementationHashes} from './guard.js';
import {newJson,newText} from '../preliminary-property-analysis-v1/guard.js';
import {fileHash} from '../sprint6_2/io.js';
import {sha} from '../rentcast-financial-controlled-client-v1/contract.js';
import {offlineStatus} from '../../src/analysis/offline.js';
assert.equal(process.version,'v22.12.0');assert.equal(process.argv.length,2);
const out=await mkdtemp(`${ROOT}/qa-`),temp=abs(`${out}/temporary`);await mkdir(temp);
const env={...cleanEnvironment(),TEMP:temp,TMP:temp,TMPDIR:temp,RC_STAGE_A_QA_DIR:abs(`${out}/synthetic`),RCFC_QA_DIR:abs(`${out}/prior-client-synthetic`)};
const groups=[{name:'stage-a',files:[`${CODE}/stage-a.test.js`]},{name:'unchanged-regressions',files:REGRESSION_FILES},{name:'unchanged-pilot',files:['scripts/rentcast-controlled-pilot/pilot.test.js'],cwd:abs(`${out}/pilot-sandbox`)}];
const results=[];let failed=false;
for(const group of groups){
  if(group.cwd)await mkdir(group.cwd);
  let tap='',exitCode=0;const start=Date.now();
  try{tap=execFileSync(process.execPath,['--import',pathToFileURL(abs('src/analysis/offline.js')).href,'--test','--test-reporter=tap',...group.files.map(abs)],{cwd:group.cwd??process.cwd(),env,encoding:'utf8',maxBuffer:24*1024*1024});}
  catch(e){tap=String(e.stdout??'')+'\n'+String(e.stderr??'');exitCode=e.status??1;}
  await newText(`${out}/${group.name}.tap`,tap);
  const metric=n=>Number(new RegExp(`# ${n} (\\d+)`).exec(tap)?.[1]??NaN);
  const result={name:group.name,files:group.files,exitCode,durationMs:Date.now()-start,tests:metric('tests'),passed:metric('pass'),failed:metric('fail'),skipped:metric('skipped'),cancelled:metric('cancelled'),tapSha256:sha(tap)};
  results.push(result);console.log(JSON.stringify(result));
  if(exitCode||!result.tests||result.tests!==result.passed||result.failed||result.skipped||result.cancelled){failed=true;break;} // Mandatory STOP, no filtered retry.
}
let checks;
try{checks={preservation:await preservation(),privacy:await privacy()};assert.deepEqual(await readdir(abs(REGISTRY)),[]);}
catch{failed=true;checks={status:'PRESERVATION_OR_PRIVACY_STOP'};}
const hashes=await implementationHashes(),reportHashes={};for(const path of NEW_FILES)reportHashes[path]=await fileHash(path);
const result={status:failed?'FAIL':'PASS',completedAt:new Date().toISOString(),runtime:process.version,groups:results,tests:results.reduce((n,r)=>n+r.tests,0),passed:results.reduce((n,r)=>n+r.passed,0),checks,implementationHashes:hashes,artifactHashes:reportHashes,...offlineStatus(),actualTransmissions:0,databaseConnections:0,databaseWrites:0,realFinancialAnalyses:0,stageBCRequests:0,mlsSelections:0,deployments:0};
await newJson(`${out}/result.json`,result);
if(!failed)await newJson(CERTIFICATE,{version:'STAGE_A_OFFLINE_CERTIFICATE_V1',status:'PASS',completedAt:result.completedAt,tests:result.tests,passed:result.passed,failed:0,skipped:0,cancelled:0,preservationUnexpectedChanges:0,qaDirectory:out,qaResultSha256:await fileHash(`${out}/result.json`),implementationHashes:hashes});
else process.exitCode=1;
console.log(JSON.stringify({status:result.status,out,tests:result.tests,passed:result.passed,preserved:checks.preservation?.count,actualTransmissions:0}));
