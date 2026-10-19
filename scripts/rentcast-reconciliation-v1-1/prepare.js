import '../../src/analysis/offline.js';
import {mkdir,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {ROOT} from './source.js';
import {verifyHistoricalEvidence} from '../rentcast-crosswalk-investigation/integrity.js';
import {ROOT as PILOT,check,saveNew} from '../rentcast-controlled-pilot/core.js';
import {readJson,verifyProtection} from '../rentcast-controlled-pilot/local.js';
import {fileHash} from '../sprint6_2/io.js';

execFileSync('git',['check-ignore','--quiet',`${ROOT}/preservation-before.json`],{stdio:'pipe'});
try{await readdir(ROOT);throw new Error('EXISTING_REPLAY_ROOT_PRESERVE_AND_STOP');}catch(e){if(e.code!=='ENOENT')throw e;}
await verifyProtection((await readJson(`${PILOT}/private-crosswalk-integrity.json`)).originalHashes);
const last=await readJson(`${PILOT}/private-crosswalk-final-preservation.json`);
check(last.status==='PASS'&&await fileHash('docs/PI_KERN_ATN_APN_CROSSWALK_REVIEW.md')===last.reportSha256,'CROSSWALK_REPORT_CHANGED');
for(const [p,h] of Object.entries(last.scriptHashes))check(await fileHash(p)===h,'CROSSWALK_SCRIPT_CHANGED');
const snapshot=await verifyHistoricalEvidence();Object.assign(snapshot.originalHashes,last.scriptHashes);
await mkdir(ROOT,{recursive:false});
await saveNew(`${ROOT}/preservation-before.json`,{createdAt:new Date().toISOString(),hashes:snapshot.originalHashes,sourceIntegrity:snapshot.countySourceIntegrity,rentcastIntegrity:snapshot.rentcastEvidenceIntegrity,scope:'NEW_OFFLINE_V1_1_RESULTS_ONLY',providerCalls:0,databaseConnections:0});
console.log(JSON.stringify({status:'PASS',protectedPaths:Object.keys(snapshot.originalHashes).length,providerCalls:0,databaseConnections:0}));
