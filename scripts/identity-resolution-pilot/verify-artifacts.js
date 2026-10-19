import {offlineStatus} from '../../src/analysis/offline.js';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileHash} from '../sprint6_2/io.js';
import {digest,persistenceBlockers} from './pilot.js';

const dir='data/runtime/identity-resolution-pilot';
const load=async name=>JSON.parse(await readFile(`${dir}/${name}`));
const tests=['scripts/identity-resolution-pilot/pilot.test.js','scripts/mls-validation-round1/gate1b-identity-audit.test.js','scripts/mls-validation-round1/harness.test.js','scripts/sprint6_3_1/address.test.js','scripts/sprint6_3_3/linkage.test.js','tests/persistence.test.js'];
async function main(){
  const verification=await load('identity-verification-results.json'),registry=await load('pilot-exclusions.json');
  assert.equal(registry.permanentRound1Exclusion,true);assert.equal(registry.identities.length,3);
  for(const field of ['candidateId','atn','apn9'])assert.equal(new Set(registry.identities.map(r=>r[field])).size,3);
  for(const [path,hash]of Object.entries(verification.protectedFileHashes))assert.equal(await fileHash(path),hash,'PROTECTED_FILE_CHANGED');
  const fileHashes={};
  for(const name of await readdir(dir)){
    execFileSync('git',['check-ignore','--quiet',`${dir}/${name}`],{stdio:'pipe'});
    assert.equal(execFileSync('git',['ls-files','--',`${dir}/${name}`],{encoding:'utf8'}).trim(),'');
    fileHashes[name]=await fileHash(`${dir}/${name}`);
  }
  for(const i of registry.identities){
    const p=await load(`${i.pilotCode}-review.json`),d=await load(`${i.pilotCode}-analyst-decision.json`);
    const {packetSha256,...payload}=p;assert.equal(digest(JSON.stringify(payload)),packetSha256);
    assert.equal(p.candidateId,i.candidateId);assert.equal(p.county.atn,i.atn);assert.equal(p.county.apn9,i.apn9);
    assert.equal(d.packetSha256,packetSha256);assert.equal(d.decision,null);assert.equal(p.identity.analystConfirmed,false);
    assert.equal(p.identity.countyPass,true);assert.equal(p.identity.assessorPass,true);assert.equal(p.identity.activeLinkCount,0);
    assert.ok(persistenceBlockers(p,d).includes('GENUINE_ANALYST_APPROVAL_REQUIRED'));
    assert.ok(persistenceBlockers(p,d).includes('REAL_PILOT_PERSISTENCE_DISABLED_THIS_SPRINT'));
    const walk=value=>{if(!value||typeof value!=='object')return;for(const[key,v]of Object.entries(value)){assert.doesNotMatch(key,/^(owner_name|borrower|email|phone|credentials|password|token|parcel_amount_owed|owner_total_owed)$/i);walk(v);}};walk(p);
  }
  // Re-execution may verify but must never overwrite packets, decisions or exclusions.
  execFileSync(process.execPath,['scripts/identity-resolution-pilot/prepare.js'],{stdio:'pipe'});
  for(const [name,hash]of Object.entries(fileHashes))assert.equal(await fileHash(`${dir}/${name}`),hash,'PILOT_ARTIFACT_OVERWRITTEN');
  const tap=execFileSync(process.execPath,['--import','./src/analysis/offline.js','--test',...tests],{encoding:'utf8'});
  const metric=name=>Number(tap.match(new RegExp(`^# ${name} (\\d+)$`,'m'))?.[1]);
  assert.equal(metric('tests'),52);assert.equal(metric('pass'),52);assert.equal(metric('fail'),0);assert.equal(metric('skipped'),0);
  const reports=['docs/PI_IDENTITY_RESOLUTION_PILOT.md','docs/PI_IDENTITY_PILOT_QA_RESULTS.md'];
  const text=(await Promise.all(reports.map(p=>readFile(p,'utf8')))).join('\n');
  for(const i of registry.identities){for(const key of ['candidateId','atn','apn9'])assert.ok(!text.includes(i[key]),'SHAREABLE_IDENTITY_LEAK');const p=await load(`${i.pilotCode}-review.json`);for(const v of [p.addressReview.rawCountySitus,p.addressReview.components.street])assert.ok(!v||!text.includes(v),'SHAREABLE_ADDRESS_LEAK');}
  const result={status:'PASS',at:new Date().toISOString(),scope:'OFFLINE_LOGIC_AND_PRIVATE_ARTIFACT_QA_NOT_DATABASE_PERSISTENCE_CERTIFICATION',tests:{total:metric('tests'),pass:metric('pass'),fail:metric('fail'),skipped:metric('skipped'),files:tests},realPacketsVerified:3,syntheticPersistenceDatabaseTest:'NOT_EXECUTED',repeatGenerationPreserved:true,privateArtifactsIgnoredAndUntracked:true,shareableIdentityPrivacy:'PASS',protectedFileHashesUnchanged:true,round1Unchanged:true,analystApprovals:0,providerCalls:0,databaseConnections:0,productionWrites:0,mlsAccess:0,round1PropertiesSelected:0,offline:offlineStatus(),fileHashes};
  await writeFile(`${dir}/offline-qa-results.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({...result,fileHashes:undefined},null,2));
}
main().catch(()=>{console.error('PILOT_QA_STOP');process.exitCode=1;});
