import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {ROOT,PROPOSAL,preservation} from './audit.js';
import {newJson,newText} from '../preliminary-property-analysis-v1/guard.js';
import {fileHash} from '../sprint6_2/io.js';
import {offlineStatus} from '../../src/analysis/offline.js';

assert.equal(process.argv.length,2);assert.equal(process.version,'v22.12.0');
const out=await mkdtemp(`${ROOT}/qa-`);
const files=['scripts/real-financial-evidence-v1/audit.test.js','scripts/rentcast-reconciliation-v1-1/reconcile.test.js','scripts/protected-baselines-v3/reconciliation.test.js','scripts/mls-validation-round1/harness.test.js'];
let tap='',exitCode=0;
try{tap=execFileSync(process.execPath,['--import','./src/analysis/offline.js','--test','--test-reporter=tap',...files],{encoding:'utf8',maxBuffer:20*1024*1024});}
catch(e){tap=String(e.stdout??'')+'\n'+String(e.stderr??'');exitCode=e.status??1;}
await newText(`${out}/tests.tap`,tap);
const metric=n=>Number(new RegExp(`# ${n} (\\d+)`).exec(tap)?.[1]??NaN);
const tests={exitCode,tests:metric('tests'),passed:metric('pass'),failed:metric('fail'),skipped:metric('skipped'),cancelled:metric('cancelled'),files};
await newJson(`${out}/tests.json`,tests);
if(exitCode||tests.failed||tests.skipped||tests.cancelled||tests.passed!==tests.tests){console.log(JSON.stringify({status:'QA_STOP',out,...tests}));process.exitCode=1;}
else{
  const report=await readFile('docs/PI_REAL_FINANCIAL_EVIDENCE_READINESS_V1.md','utf8');
  const inventory=report.split('\n').filter(l=>/^\| \d+ \|/.test(l)).map(l=>{const c=l.split('|').map(x=>x.trim());return {field:c[2].replaceAll('`',''),purposeAndUnits:c[3],potentialSourceAndRights:c[4],allowedFutureClassAndLimits:c[5],existingClass:'MISSING',value:null,sourceAsOf:null,subjectBinding:'NOT_ESTABLISHED',blocksRealCalculation:true};});
  await newJson(`${out}/financial-input-inventory.json`,inventory);
  await newJson(`${out}/request-budget-proposal.json`,PROPOSAL);
  const p=await preservation();
  const artifacts={};for(const f of [...files,'scripts/real-financial-evidence-v1/audit.js','scripts/real-financial-evidence-v1/qa.js',...['READINESS_V1','PROVIDER_MATRIX','ACQUISITION_PLAN','QA'].map(n=>`docs/PI_REAL_FINANCIAL_EVIDENCE_${n}.md`),`${ROOT}/private-candidate-shortlist.json`,`${ROOT}/retained-attom-inventory.json`])artifacts[f]=await fileHash(f);
  const result={status:'PASS',completedAt:new Date().toISOString(),runtime:process.version,tests,preservation:p,...offlineStatus(),databaseConnections:0,databaseWrites:0,realFinancialAnalyses:0,round1Selections:0,artifacts};
  await newJson(`${out}/result.json`,result);
  console.log(JSON.stringify({status:'PASS',out,tests,preservation:p,...offlineStatus()}));
}
