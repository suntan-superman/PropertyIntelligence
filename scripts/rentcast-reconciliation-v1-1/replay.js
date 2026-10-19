import '../../src/analysis/offline.js';
import {mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {ROOT,loadSources} from './source.js';
import {reconcile,VERSION} from './reconcile.js';
import {saveNew,sha,check} from '../rentcast-controlled-pilot/core.js';
import {readJson,verifyProtection} from '../rentcast-controlled-pilot/local.js';
import {fileHash} from '../sprint6_2/io.js';
import {offlineStatus} from '../../src/analysis/offline.js';

const {source,items}=await loadSources();
const out=`${ROOT}/replay-${new Date().toISOString().replaceAll(':','-')}`;
execFileSync('git',['check-ignore','--quiet',`${out}/manifest.json`],{stdio:'pipe'});await mkdir(out,{recursive:false});
await saveNew(`${out}/source-evidence.json`,source);
const results=[],replayHashes=[];
for(const item of items){const input={source,...item},before=sha(JSON.stringify(input)),first=reconcile(input),again=reconcile(input);check(JSON.stringify(first)===JSON.stringify(again),'NONDETERMINISTIC_REPLAY');check(sha(JSON.stringify(input))===before,'INPUT_MUTATION');
  check(!first.persistenceAuthorization&&!first.currentIdentityVerified&&!first.analystReview.approval&&!first.round1Selected,'UNAUTHORIZED_STATE');
  const path=`${out}/${first.pilotCode}.json`;await saveNew(path,first);replayHashes.push({path,sha256:await fileHash(path)});
  results.push({pilotCode:first.pilotCode,ruleCEvaluation:first.ruleCEvaluation,historicalSourceCrosswalk:first.historicalSourceCrosswalk,legacyComparison:first.legacyComparison,sourceFreshness:first.currentIdentityFreshness,reviewTier:first.analystReview.tier,persistenceAuthorization:first.persistenceAuthorization,reasons:first.reasons,replayFingerprint:first.reconciliationFingerprint});
}
const expected=results.every(r=>r.pilotCode==='RC-P2'?r.ruleCEvaluation==='PASS'&&r.historicalSourceCrosswalk.classification==='DOCUMENTED_HISTORICAL_APN_CROSSWALK':r.ruleCEvaluation==='NOT_SATISFIED'&&r.historicalSourceCrosswalk.classification==='IDENTIFIER_RELATIONSHIP_UNRESOLVED');
const manifest={version:VERSION,completedAt:new Date().toISOString(),replayStatus:expected?'PASS':'FAIL_EXPECTED_RESULT_NOT_FORCED',results,countyCensus:source.stats,sourceFingerprints:source.fingerprints,sourceEvidenceSha256:await fileHash(`${out}/source-evidence.json`),replayHashes,deterministicSecondEvaluation:true,
  preservation:await verifyProtection((await readJson(`${ROOT}/preservation-before.json`)).hashes),network:offlineStatus(),providerCalls:0,databaseConnections:0,databaseWrites:0,analystApprovals:0,durableProperties:0,round1Selections:0};
await saveNew(`${out}/manifest.json`,manifest);console.log(JSON.stringify({...manifest,replayHashes:undefined,sourceFingerprints:undefined}));check(expected,'REAL_REPLAY_BLOCKED');
