// Offline-only certification entry point. No connection strings or apply option.
import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {offlineStatus} from '../../src/analysis/offline.js';
import {syntheticFixture,TEST_NOW,digest} from './fixture.js';
import {createQueryDouble} from './query-double.js';
import {runSyntheticSequence} from './workflow.js';
import {getProperty} from '../../src/persistence/propertiesRepository.js';
import {readAddressResolution} from '../../src/persistence/addressResolutionRepository.js';
import {activeOpportunityPropertyLink} from '../../src/persistence/opportunityPropertyLinkRepository.js';
import {getEvidence} from '../../src/persistence/evidenceRepository.js';

if(process.argv.length!==2)throw new Error('NO_ARGUMENTS_OR_LIVE_APPLY_SUPPORTED');
const parent='data/runtime/durable-identity-pilot';
execFileSync('git',['check-ignore','--quiet',`${parent}/certification.json`],{stdio:'pipe'});
await mkdir(parent,{recursive:true});
const output=await mkdtemp(`${parent}/certification-`);
const files=[
  'scripts/sprint6_3_1/address.test.js',
  'scripts/sprint6_3_3/linkage.test.js',
  'tests/persistence.test.js',
  'scripts/mls-validation-round1/harness.test.js',
  'scripts/mls-validation-round1/gate1b-identity-audit.test.js',
  'scripts/identity-resolution-pilot/pilot.test.js',
  'scripts/durable-identity-pilot/pilot.test.js'
];
// Explicit allowlist: no .env loading, npm lifecycle scripts or live QA runners.
const tests=spawnSync(process.execPath,['--import','./src/analysis/offline.js','--test','--test-reporter=tap',...files],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024,windowsHide:true});
const tap=tests.stdout??'';
await writeFile(`${output}/tests.tap`,tap);
const totals=Object.fromEntries(['tests','pass','fail','skipped','cancelled'].map(k=>[k,Number(tap.match(new RegExp(`^# ${k} (\\d+)$`,'m'))?.[1]??-1)]));
assert.equal(tests.status,0,'OFFLINE_REGRESSION_FAILED; inspect local tests.tap');
assert.equal(totals.pass,totals.tests);assert.equal(totals.fail,0);assert.equal(totals.skipped,0);assert.equal(totals.cancelled,0);
const fixture=syntheticFixture(),db=createQueryDouble(fixture);
const counts=()=>Object.fromEntries(['resolutions','properties','links','evidence','audits','idempotency'].map(k=>[k,db.inspect()[k].length]));
const initial=counts(),first=await runSyntheticSequence({db,fixture,now:TEST_NOW}),afterFirst=counts(),stateFirst=db.inspect();
const second=await runSyntheticSequence({db,fixture,now:TEST_NOW}),afterSecond=counts();
assert.deepEqual(db.inspect(),stateFirst);assert.equal(second.idempotentReplay,true);
for(const k of ['canonicalResolutionId','propertyId','linkId','evidenceSnapshotId'])assert.equal(first[k],second[k]);
const reopened=await db.transaction(async tx=>({property:await getProperty(tx,second.propertyId),canonical:await readAddressResolution(tx,fixture.packet.candidateId),link:await activeOpportunityPropertyLink(tx,fixture.packet.candidateId),evidence:await getEvidence(tx,second.evidenceSnapshotId)}));
assert.equal(reopened.property.id,second.propertyId);assert.equal(reopened.canonical.id,second.canonicalResolutionId);assert.equal(reopened.link.id,second.linkId);assert.equal(reopened.evidence.id,second.evidenceSnapshotId);assert.deepEqual(db.inspect(),stateFirst);
assert.equal(offlineStatus().networkAttempts,0);
let preservation={status:'NO_START_SNAPSHOT_AVAILABLE'};
try{
  const baseline=JSON.parse(await readFile(`${parent}/preservation-before.json`,'utf8'));
  const changed=[];
  for(const [file,hash] of Object.entries(baseline)){
    let current=null;try{current=createHash('sha256').update(await readFile(file)).digest('hex');}catch(error){if(error.code!=='ENOENT')throw error;}
    if(current!==hash)changed.push(file);
  }
  assert.equal(changed.length,0,'PRE_EXISTING_ARTIFACT_CHANGED; STOP');
  preservation={status:'PASS',checked:Object.keys(baseline).length,changed:0};
}catch(error){if(error.code!=='ENOENT')throw error;}
const sourceHashes={};
for(const file of [...files,...['fixture','policy','query-double','workflow','certify'].map(n=>`scripts/durable-identity-pilot/${n}.js`)])sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const artifact={schemaVersion:1,runAt:new Date().toISOString(),node:process.version,classification:'LOGIC CERTIFIED — ISOLATED DB REQUIRED',mode:'OFFLINE_QUERY_DOUBLE_ONLY',actualDatabaseConnections:0,actualDatabaseQueries:0,actualDatabaseWrites:0,actualIsolatedPersistence:'NOT EXECUTED',postgresConstraintsAndConcurrency:'NOT CERTIFIED',fixtureClock:new Date(TEST_NOW).toISOString(),fixturePacketSha256:fixture.packetSha256,tests:{files,...totals},sequence:{initial,afterFirst,afterSecond,additionalOnReplay:Object.fromEntries(Object.keys(initial).map(k=>[k,afterSecond[k]-afterFirst[k]])),first,second,readOnlyRepositoryReopenAfterReplay:'PASS_IN_QUERY_DOUBLE',modelEvidenceSha256:digest(db.inspect().evidence),transactions:db.events().filter(e=>['BEGIN','COMMIT','ROLLBACK'].includes(e.kind))},preservation,network:offlineStatus(),realPilotPropertiesCreated:0,realAnalystApprovalsCreated:0,roundOnePropertiesSelected:0,sourceHashes};
await writeFile(`${output}/certification.json`,`${JSON.stringify(artifact,null,2)}\n`);
console.log(JSON.stringify({artifact:`${output}/certification.json`,classification:artifact.classification,tests:totals,countsAfterFirst:afterFirst,additionalOnReplay:artifact.sequence.additionalOnReplay,actualDatabaseConnections:0,providerCalls:0}));
