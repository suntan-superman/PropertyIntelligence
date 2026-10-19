import '../../src/analysis/offline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {addressKey} from '../../src/sources/rentcast/propertyLookup.js';
import {ROOT,sha} from '../rentcast-controlled-pilot/core.js';
import {readJson,verifyProtection} from '../rentcast-controlled-pilot/local.js';
import {offlineStatus} from '../../src/analysis/offline.js';

// Test-only specification of proposed fail-closed gates. Not exported, installed
// in a provider, or applied to a real identity/decision. Freshness and authority
// are hypothetical fixture inputs, not self-certifying production booleans.
const f=()=>({state:'CA',county:'KERN',sourceFresh:true,sourceIntegrity:true,sourceRelationshipDocumented:true,
  atnRows:1,atnTargets:1,apn9Rows:1,apn9Targets:1,alternateRows:1,historicalInactive:false,
  providerIdentifier:'00100203',sourceIdentifier:'00100203',transformation:'SPACES_HYPHENS_ONLY',parcelEvidence:true});
function proposedGate(x){
  const strip=s=>typeof s==='string'?s.replace(/[ -]/g,''):null;
  return x.state==='CA'&&x.county==='KERN'&&x.sourceFresh===true&&x.sourceIntegrity===true&&x.sourceRelationshipDocumented===true
    &&x.atnRows===1&&x.atnTargets===1&&x.apn9Rows===1&&x.apn9Targets===1&&x.alternateRows===1&&!x.historicalInactive
    &&x.transformation==='SPACES_HYPHENS_ONLY'&&x.parcelEvidence===true&&strip(x.providerIdentifier)!==null&&strip(x.providerIdentifier)===strip(x.sourceIdentifier);
}
test('synthetic documented unique relationship clears proposed guards, not an approval',()=>assert.equal(proposedGate(f()),true));
for(const [name,change] of [
  ['duplicate ATNs',{atnRows:2}],['ATN linked to conflicting APN9s',{atnTargets:2}],
  ['APN9 linked to conflicting ATNs',{apn9Rows:2,apn9Targets:2}],['wrong county',{county:'OTHER'}],['wrong state',{state:'NV'}],
  ['stale source',{sourceFresh:false}],['historical inactive identity',{historicalInactive:true}],
  ['missing authoritative source relationship',{sourceRelationshipDocumented:false}],['ambiguous alternate identifier',{alternateRows:2}],
  ['leading-zero mismatch',{providerIdentifier:'100203'}],['unsupported identifier transformation',{transformation:'PAD_TRUNCATE_OR_CHECK_DIGIT'}],
  ['address-only match without parcel evidence',{parcelEvidence:false}],['source fingerprint failure',{sourceIntegrity:false}],
  ['numeric identifier coercion',{providerIdentifier:100203}],
])test(`proposed guard rejects ${name}`,()=>assert.equal(proposedGate({...f(),...change}),false));
test('existing AV versus Ave mapping is not broadened',()=>assert.notEqual(addressKey('1 Synthetic AV'),addressKey('1 Synthetic Ave')));
test('original acquisition classifications, seals, decisions and ledger unchanged',async()=>{
  const evidence=await readJson(`${ROOT}/private-crosswalk-investigation.json`);
  const {packetSha256,...payload}=evidence;assert.equal(sha(JSON.stringify(payload)),packetSha256);
  for(const p of evidence.pilots){const original=await readJson(`${ROOT}/review-packets/${p.pilotCode}-review.json`);assert.equal(original.packetSha256,p.originalPacketSha256);assert.equal(original.reconciliation.matchClassification,'APN_CONFLICT');assert.equal(original.analystReview.decision,null);assert.equal(original.persistence.enabled,false);}
  assert.deepEqual(await readJson(`${ROOT}/request-ledger.json`),(await readJson(`${ROOT}/post-acquisition-certification.json`)).requestAccounting);
  assert.equal((await verifyProtection((await readJson(`${ROOT}/private-crosswalk-integrity.json`)).originalHashes)).changed,0);
});
test('actual relationships retain raw source values and explicit APN lookup, never a computed APN9',async()=>{
  const r=await readJson(`${ROOT}/private-crosswalk-investigation.json`);
  for(const p of r.pilots){assert.equal(p.relationship.atnRows,1);assert.equal(p.relationship.apn9Rows,1);assert.equal(p.originalClassification,'APN_CONFLICT');}
  const p2=r.pilots.find(p=>p.pilotCode==='RC-P2');assert.equal(p2.classification,'AUTHORITATIVE_IDENTITY_RELATIONSHIP_ESTABLISHED');
  assert.equal(p2.rentcastRecord.assessorID,p2.shape[0].projection.APN);assert.equal(p2.county.apn9,p2.shape[0].projection.APN9);
  for(const code of ['RC-P1','RC-P3'])assert.equal(r.pilots.find(p=>p.pilotCode===code).classification,'OBSERVED_RELATIONSHIP_ONLY');
});
test('investigation QA makes no network requests',()=>assert.equal(offlineStatus().networkAttempts,0));
