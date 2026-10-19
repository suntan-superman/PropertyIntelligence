import '../../src/analysis/offline.js';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileHash} from '../sprint6_2/io.js';
import {ROOT,check,sha,saveNew} from '../rentcast-controlled-pilot/core.js';
import {readJson,verifyProtection} from '../rentcast-controlled-pilot/local.js';
import {offlineStatus} from '../../src/analysis/offline.js';

const reportPath='docs/PI_KERN_ATN_APN_CROSSWALK_REVIEW.md';
const original=await readJson(`${ROOT}/private-crosswalk-integrity.json`),analysis=await readJson(`${ROOT}/private-crosswalk-investigation.json`),qa=await readJson(`${ROOT}/private-crosswalk-qa.json`);
const preservation=await verifyProtection(original.originalHashes);
for(const [p,h] of Object.entries(analysis.sourceFingerprints))check(await fileHash(p)===h,`SOURCE_CHANGED:${p}`);
for(const [p,h] of Object.entries(qa.hashes))check(await fileHash(p)===h,`TESTED_SOURCE_CHANGED:${p}`);
check(qa.tests===19&&qa.passed===19&&qa.failed===0&&qa.skipped===0,'QA_FAILED');
const {packetSha256,...payload}=analysis;check(sha(JSON.stringify(payload))===packetSha256,'ANALYSIS_SEAL_CHANGED');
const privateValues=new Set();for(const p of analysis.pilots){
  for(const v of [p.county.atn,p.county.apn9,p.candidateId,p.assessorId,p.rentcastRecord.id,p.rentcastRecord.assessorID,p.rentcastRecord.formattedAddress,p.rentcastRecord.addressLine1,p.rentcastRecord.zipCode,p.countySitus])if(typeof v==='string'&&v.length>3)privateValues.add(v);
  for(const s of p.shape)for(const v of Object.values(s.projection))if(typeof v==='string'&&v.length>3)privateValues.add(v);
  for(const r of [...p.land,...p.shape,...p.history,...p.mineral])check(!Object.keys(r.projection).some(k=>/owner|ASSE_NAME|CONTACT|BILL|IN_CARE_OF|DBA/i.test(k)),'PRIVATE_OWNER_FIELD');
  check(p.originalClassification==='APN_CONFLICT','HISTORICAL_CLASSIFICATION_CHANGED');
}
const publicPaths=[reportPath,...(await readdir('scripts/rentcast-crosswalk-investigation')).filter(n=>n.endsWith('.js')).map(n=>`scripts/rentcast-crosswalk-investigation/${n}`)];
for(const p of publicPaths){const text=(await readFile(p,'utf8')).toLowerCase();for(const v of privateValues)check(!text.includes(v.toLowerCase()),'PRIVATE_IDENTIFIER_IN_SHARED_OUTPUT');}
const privatePaths=['private-crosswalk-integrity.json','private-crosswalk-investigation.json','private-crosswalk-qa.json'];
for(const name of privatePaths){const p=`${ROOT}/${name}`;execFileSync('git',['check-ignore','--quiet',p],{stdio:'pipe'});check(!execFileSync('git',['ls-files','--',p],{encoding:'utf8'}).trim(),'PRIVATE_OUTPUT_TRACKED');}
const round1=await readJson('config/mls-validation-round1.json');check(round1.status==='PRE_EXECUTION'&&!round1.executionAuthorized&&!round1.selectionLocked,'ROUND1_CHANGED');
check(offlineStatus().networkAttempts===0,'NETWORK_ATTEMPT');
const final={status:'PASS',completedAt:new Date().toISOString(),preservation,sourceFingerprints:'PASS',privateOutputIgnored:true,privateIdentityExposure:0,rawOwnerFields:0,originalPilotClassifications:'UNCHANGED_APN_CONFLICT',tests:{passed:19,failed:0,skipped:0},providerCalls:0,databaseConnections:0,databaseWrites:0,analystApprovals:0,durableProperties:0,round1Selections:0,reportSha256:await fileHash(reportPath),scriptHashes:Object.fromEntries(await Promise.all(publicPaths.filter(p=>p.endsWith('.js')).map(async p=>[p,await fileHash(p)])))};
await saveNew(`${ROOT}/private-crosswalk-final-preservation.json`,final);console.log(JSON.stringify({...final,scriptHashes:undefined}));
