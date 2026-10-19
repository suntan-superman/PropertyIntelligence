import '../../src/analysis/offline.js';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {ROOT,loadSources} from './source.js';
import {reconcile} from './reconcile.js';
import {check,sha,saveNew} from '../rentcast-controlled-pilot/core.js';
import {readJson,verifyProtection} from '../rentcast-controlled-pilot/local.js';
import {fileHash} from '../sprint6_2/io.js';
import {offlineStatus} from '../../src/analysis/offline.js';

const baseline=await readJson(`${ROOT}/preservation-before.json`),{source,items}=await loadSources();
const dirs=(await readdir(ROOT)).filter(n=>n.startsWith('replay-')).sort();check(dirs.length===1,'REPLAY_SCOPE_CHANGED');const replay=`${ROOT}/${dirs[0]}`,manifest=await readJson(`${replay}/manifest.json`);
check(manifest.replayStatus==='PASS'&&manifest.deterministicSecondEvaluation,'REPLAY_FAILED');
const identifiers=new Set();
for(const item of items){const actual=reconcile({source,...item}),path=`${replay}/${item.candidate.pilotCode}.json`,stored=await readJson(path);
  check(JSON.stringify(actual)===JSON.stringify(stored),'REAL_REPLAY_NO_LONGER_REPRODUCIBLE');
  check(await fileHash(path)===manifest.replayHashes.find(r=>r.path===path)?.sha256,'REPLAY_BYTES_CHANGED');
  const c=item.candidate,r=item.evidence.providerRecord;for(const value of [c.candidateId,c.county.atn,c.county.apn9,c.requestAddress.street,c.countyAddressReview.rawCountySitus,r.id,r.assessorID,r.formattedAddress,r.addressLine1,r.zipCode,actual.identifiers.matchedSourceApn?.raw])if(typeof value==='string'&&value.length>3)identifiers.add(value);
}
check(await fileHash(`${replay}/source-evidence.json`)===manifest.sourceEvidenceSha256,'SOURCE_PROJECTION_CHANGED');
const reports=['docs/PI_RENTCAST_RECONCILIATION_V1_1.md','docs/PI_RENTCAST_RECONCILIATION_V1_1_QA.md','docs/PI_RENTCAST_RECONCILIATION_V1_1_REMAINING_GAPS.md'];
const scripts=(await readdir('scripts/rentcast-reconciliation-v1-1')).filter(n=>n.endsWith('.js')).map(n=>`scripts/rentcast-reconciliation-v1-1/${n}`),newFiles={};
for(const p of [...reports,...scripts]){const text=(await readFile(p,'utf8')).toLowerCase();for(const value of identifiers)check(!text.includes(value.toLowerCase()),'PRIVATE_IDENTIFIER_IN_SHAREABLE_OUTPUT');newFiles[p]=await fileHash(p);}
check(!execFileSync('git',['ls-files','--',ROOT],{encoding:'utf8'}).trim(),'PRIVATE_REPLAY_TRACKED');
execFileSync('git',['check-ignore','--quiet',`${replay}/RC-P2.json`],{stdio:'pipe'});
const qaNames=await readdir(`${ROOT}/qa`),qa={};for(const phase of ['targeted','regression']){const name=qaNames.filter(n=>n.startsWith(phase+'-')).sort().at(-1);check(name,'QA_MISSING');qa[phase]=await readJson(`${ROOT}/qa/${name}`);}
check(qa.targeted.tests===40&&qa.targeted.passed===40&&qa.targeted.failed===0&&qa.targeted.skipped===0,'TARGETED_QA_FAILED');
const fullGreen=qa.regression.failed===0&&qa.regression.passed===qa.regression.tests&&qa.regression.skipped===0;
const totals={tests:qa.targeted.tests+qa.regression.tests,passed:qa.targeted.passed+qa.regression.passed,failed:qa.targeted.failed+qa.regression.failed,skipped:qa.targeted.skipped+qa.regression.skipped};
const app='apps/web/src/app/App.jsx',appHash=await fileHash(app);check(appHash===baseline.hashes[app],'APP_CHANGED_DURING_TASK');
const historical=await readJson('config/protected-baselines/sprint6_2-current-v2.json'),expected=historical.files.find(x=>x.path===app)?.sha256;
check(offlineStatus().networkAttempts===0,'NETWORK_ATTEMPT');
const summary={classification:fullGreen?'RULE C OFFLINE CERTIFIED':'MORE DEVELOPMENT REQUIRED',completedAt:new Date().toISOString(),technicalReplay:'PASS',ruleC:'PASS',legacyApn9:'UNCHANGED',countySourceIntegrity:'PASS',privacy:{privateOutputIgnored:true,privateIdentifiersInShareableOutputs:0},
  tests:totals,baselineBlocker:fullGreen?null:{file:app,expected,preTaskActual:baseline.hashes[app],postTaskActual:appHash,assertion:'scripts/sprint6_2/poc.test.js:18',baselineModified:false},
  preservation:await verifyProtection(baseline.hashes),results:manifest.results,sourceCensus:manifest.countyCensus,newFiles,providerCalls:0,databaseConnections:0,databaseWrites:0,analystApprovals:0,durableProperties:0,round1Selections:0,mlsAccess:0,network:offlineStatus()};
await saveNew(`${ROOT}/final-certification.json`,summary);
console.log(JSON.stringify({...summary,newFiles:undefined,results:summary.results.map(r=>({pilotCode:r.pilotCode,classification:r.historicalSourceCrosswalk.classification,freshness:r.sourceFreshness,persistenceAuthorization:r.persistenceAuthorization}))}));
