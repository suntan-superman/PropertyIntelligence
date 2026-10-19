import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const AUDIT={path:'docs/PI_SPRINT6_2_BASELINE_DISCREPANCY_AUDIT.md',sha256:'72dc81963d3beb22263d8cc66cfe118ba8a035a3dfe17139a989dba212831537'};
export const AUTHORIZATION='PI — VERSIONED PROTECTED BASELINE RECONCILIATION; user authorization 2026-10-09; six source transitions plus narrowly required baseline-reference helpers/tests.';
export const CREATED_AT='2026-10-09T22:52:20.250Z'; // Reconciliation preparation time; execution is recorded separately.
export const SOURCES=[
  {
    "path": "apps/web/src/app/App.jsx",
    "oldSha256": "251a346e01b9f03c6fdba83b552614c27cf908c76f3ee1bba4b5243ed5cc9d6c",
    "newSha256": "4054620d81b77bade01b7476a16e3dfed9e3166a42ef9e8aa204651f8bd4bdc0",
    "evidence": "E1"
  },
  {
    "path": "apps/web/src/main.jsx",
    "oldSha256": "026915ec557212054e2f79ab4e2dec7cb6b32e1ade715625fdbfef56888f1757",
    "newSha256": "c27e6f0ff6ccca35f958d8246504ca03897e2553a68781ef45fba4f555d1a948",
    "evidence": "E1"
  },
  {
    "path": "apps/web/src/styles.css",
    "oldSha256": "97fe8de16223de83449d27292c9972e34e175788d950bb66e03c173056570d05",
    "newSha256": "5c6336371d16b4400f1464490bc2341b57a106f5f64d33928063757f1bbf6e12",
    "evidence": "E1/E2"
  },
  {
    "path": "package.json",
    "oldSha256": "4c4abcfb61ab6b11a1a31ee1744e53485874b359c85fc62ef7878be208d857ba",
    "newSha256": "417110d584c0de6d818b8c2989054b378165886be680c80bc6b196d5a94013c0",
    "evidence": "E1"
  },
  {
    "path": "src/underwriting/mao.js",
    "oldSha256": "91cc141c5eef94a4310339800ec6bd8f523b17e0d46f92c24a11f4f510e7ec2e",
    "newSha256": "ce80b905f08a74105b6ebd04358c5958d95f1b8ec4ec5337fc581ee31bddcee1",
    "evidence": "E3"
  },
  {
    "path": "scripts/qa-investor-reports-v1.js",
    "oldSha256": "1a7ad05cf9d725651821cfe3eef9beda0dea7a528ee6c09bb94d4002521a4581",
    "newSha256": "1cf0be74b3b19df3f82d47dedf1ccb11228de0dd396ecc4a4aa5d8124c549f2d",
    "evidence": "E4"
  }
];
export const BASELINES={
  "sprint6_2": {
    "previous": "config/protected-baselines/sprint6_2-current-v2.json",
    "previousSha256": "512fd4075662f29ca1012b4567c1b38d60ba2c335ab46546d15fbc1ab3d387f2",
    "current": "config/protected-baselines/sprint6_2-current-v3.json",
    "files": 541,
    "additions": 6
  },
  "sprint6_3": {
    "previous": "config/protected-baselines/sprint6_3-current-v2.json",
    "previousSha256": "7fb518c89ee7c6b607e9038515fc04de732bfc1244713ce4a2270d0bd0a88ee3",
    "current": "config/protected-baselines/sprint6_3-current-v3.json",
    "files": 566,
    "additions": 5
  }
};
export const NESTED={previous:'data/validation/sprint6_1-protected.json',previousSha256:'483d243301a8aaf180a95e381eb10408a2cf76935a9eb9494bc04fe89a003b42',current:'config/protected-baselines/sprint6_1-nested-v3.json',count:351};
export const HARNESS=[
  {path:'scripts/sprint6_2/poc.test.js',oldSha256:'22cbf468be2bc16250f36dafb5ff625f0cf9433896c646360af277484602ee02',replacements:[["'../protected-baseline-qa.js'","'../protected-baselines-v3/verify.js'"],["sprint6_2-current-v2.json","sprint6_2-current-v3.json"]]},
  {path:'scripts/sprint6_3/schema-review.test.js',oldSha256:'c3757cee85b5b61259221ca5e641441e9d6849e917066c1453d86c863f8fdfa5',replacements:[["'../protected-baseline-qa.js'","'../protected-baselines-v3/verify.js'"],["sprint6_3-current-v2.json","sprint6_3-current-v3.json"]]},
  {path:'scripts/sprint6_3/source-plan.js',oldSha256:'c7b97ae8ba85e3a3dfe2bd225fe8dc0d141015a17ee0e16f436b4d7c25f61c60',replacements:[["sprint6_3-current-v2.json","sprint6_3-current-v3.json"]]},
];
export const POLICY_HASH='44f91437feaa69da94ce4a3bc7cd23b2b7d734f8b378d6c6140bfd6ed49f8e76';
export const POLICY_PATH='scripts/protected-baseline-qa.js';
export const SEAL_PATH='config/protected-baselines/reconciliation-v3-seal.json';
export const TOOLS=['scripts/protected-baselines-v3/contract.js','scripts/protected-baselines-v3/verify.js','scripts/protected-baselines-v3/reconciliation.test.js','scripts/protected-baselines-v3/certify.js'];
export function replaceOnce(text,from,to){
  assert.equal(text.split(from).length,2,'REFERENCE_REPLACEMENT_COUNT_STOP');
  return text.replace(from,to);
}
export function harnessTransition(item,bytes){
  let previous=bytes.toString('utf8');
  for(const [from,to] of [...item.replacements].reverse())previous=replaceOnce(previous,to,from);
  assert.equal(sha256(Buffer.from(previous)),item.oldSha256,'HARNESS_NON_MECHANICAL_CHANGE_STOP: '+item.path);
  return {path:item.path,oldSha256:item.oldSha256,newSha256:sha256(bytes),replacements:item.replacements,authorization:AUTHORIZATION};
}
export function successor(previous,id,harness,nestedSha256){
  const config=BASELINES[id];assert(config,'BASELINE_ID_STOP');
  assert.equal(previous.files.length,config.files);
  assert.equal(previous.additions.length,config.additions);
  assert.equal(previous.generatedArtifacts.length,26);
  assert.deepEqual(harness.map(x=>x.path),HARNESS.map(x=>x.path),'HARNESS_MEMBERSHIP_STOP');
  for(const [i,item] of harness.entries()){
    assert.equal(item.oldSha256,HARNESS[i].oldSha256,'HARNESS_OLD_HASH_STOP');
    assert.match(item.newSha256,/^[a-f0-9]{64}$/);
    assert.deepEqual(item.replacements,HARNESS[i].replacements);
    assert.equal(item.authorization,AUTHORIZATION);
  }
  const transitions=[...SOURCES,...harness],next=structuredClone(previous);
  for(const t of transitions){
    const entries=[...next.files,...next.additions].filter(x=>x.path===t.path);
    assert.equal(entries.length,1,'TRANSITION_MEMBERSHIP_STOP: '+t.path);
    assert.equal(entries[0].sha256,t.oldSha256,'WRONG_OLD_HASH_STOP: '+t.path);
    entries[0].sha256=t.newSha256;
  }
  next.baselineId=id+'-authorized-successor-v3';
  next.createdAt=CREATED_AT;
  next.predecessor={path:config.previous,sha256:config.previousSha256};
  next.authorization={request:AUTHORIZATION,audit:AUDIT,sourceTransitions:SOURCES,harnessTransitions:harness};
  next.nestedProtection={path:NESTED.current,sha256:nestedSha256,predecessor:{path:NESTED.previous,sha256:NESTED.previousSha256},count:NESTED.count};
  return next;
}
export function nestedSuccessor(previous){
  assert.equal(previous.files.length,NESTED.count,'NESTED_COUNT_STOP');
  const next=structuredClone(previous),t=SOURCES.find(x=>x.path==='src/underwriting/mao.js');
  const hits=next.files.filter(x=>x.file===t.path);assert.equal(hits.length,1,'NESTED_MEMBERSHIP_STOP');
  assert.equal(hits[0].sha256,t.oldSha256,'NESTED_OLD_HASH_STOP');hits[0].sha256=t.newSha256;
  // Only one pin changes; metadata lives in the containing successors/seal.
  return next;
}
export function validateSuccessor(previous,current,id,harness,nestedSha256){
  assert.deepEqual(current,successor(previous,id,harness,nestedSha256),'SUCCESSOR_UNAUTHORIZED_CHANGE_STOP');
  assert.equal(new Set([...current.files,...current.additions,...current.generatedArtifacts].map(x=>x.path)).size,current.files.length+current.additions.length+current.generatedArtifacts.length,'MEMBERSHIP_DUPLICATE_STOP');
}
export function validateNested(previous,current){
  assert.deepEqual(current,nestedSuccessor(previous),'NESTED_UNAUTHORIZED_CHANGE_STOP');
  assert.equal(new Set(current.files.map(x=>x.file)).size,NESTED.count);
}
export async function verifyEntries(entries,readBytes){
  for(const item of entries)assert.equal(sha256(await readBytes(item.path??item.file)),item.sha256,'CURRENT_HASH_STOP: '+(item.path??item.file));
}

