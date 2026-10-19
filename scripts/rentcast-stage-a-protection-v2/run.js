import {mkdtemp,mkdir} from 'node:fs/promises';
import {writeExclusive} from '../rentcast-financial-controlled-client-v1/ledger.js';
import {check} from '../rentcast-financial-controlled-client-v1/contract.js';
import {abs,ROOT,REPO} from './paths.js';
import {inspectLive,executeLive} from './engine.js';
// Explicit CLI only. Default is read-only inspection, not execution. No force,
// alternate subject, output registry, environment switch or retry option exists.
try{
  process.chdir(REPO);const action=process.argv[2]??'inspect';
  check(process.argv.length<=3&&['inspect','execute'].includes(action),'STAGE_A_COMMAND_STOP');
  const result=action==='inspect'?await inspectLive():await executeLive();
  if(action==='inspect'){
    await mkdir(abs(`${ROOT}/inspections`),{recursive:true});const dir=await mkdtemp(abs(`${ROOT}/inspections/run-`));
    await writeExclusive(`${dir}/readiness.private.json`,result);
  }
  console.log(JSON.stringify({classification:result.classification,inspectionOnly:action==='inspect',sourceSeal:result.sourceSeal??'PASS',blockers:result.blockers??[],attemptedTransmissions:result.attemptedTransmissions??0,httpStatus:result.httpStatus??null,historicalReconciliation:result.historicalReconciliation??'NOT EXECUTED',stageBCRequests:0,databaseWrites:0,deployments:0}));
}catch(e){console.error(JSON.stringify({classification:'STAGE_A_PREFLIGHT_BLOCKED',code:/^[A-Z_]+$/.test(e.code??'')?e.code:'STAGE_A_SAFE_STOP',attemptedTransmissions:'CONSULT_FIXED_LEDGER_BEFORE_ANY_RETRY'}));process.exitCode=1;}
