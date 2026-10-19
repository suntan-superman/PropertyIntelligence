import '../../src/analysis/offline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AUDIT,BASELINES,NESTED,HARNESS,SOURCES,sha256,successor,nestedSuccessor,validateSuccessor,validateNested,verifyEntries,harnessTransition} from './contract.js';
import {checkedJson,harnessTransitions,verifySeal,verifyCurrentProtectedBaseline,verifyGeneratedProtectedArtifacts,verifyNestedProtection} from './verify.js';
const previous=JSON.parse(await readFile(BASELINES.sprint6_2.previous)),nestedOld=JSON.parse(await readFile(NESTED.previous));
const harness=await harnessTransitions(),nestedNew=nestedSuccessor(nestedOld),nestedHash=sha256(await readFile(NESTED.current));
const candidate=successor(previous,'sprint6_2',harness,nestedHash);
const validate=b=>validateSuccessor(previous,b,'sprint6_2',harness,nestedHash);
test('detached seal protects explicit files and excludes itself',async()=>{const seal=await verifySeal();assert(seal.files.length>10);});
for(const [id,cfg] of Object.entries(BASELINES))test(id+' exact successor integrity and all current pins',async()=>{
  const original=JSON.parse(await readFile(cfg.previous));
  const b=await verifyCurrentProtectedBaseline({file:cfg.current,sourceHash:original.sourceHistoricalManifest.sha256,historicalFileCount:original.sourceHistoricalManifest.fileCount,protectedFileCount:cfg.files});
  assert.equal(b.files.length,cfg.files);assert.equal(b.additions.length,cfg.additions);
});
test('audit and v2 original bytes remain exact',async()=>{
  await checkedJson(BASELINES.sprint6_2.previous,BASELINES.sprint6_2.previousSha256);
  await checkedJson(BASELINES.sprint6_3.previous,BASELINES.sprint6_3.previousSha256);
  assert.equal(sha256(await readFile(AUDIT.path)),AUDIT.sha256);
});
test('all six transition pairs are the exact rows in the reviewed audit',async()=>{
  const text=await readFile(AUDIT.path,'utf8');
  for(const t of SOURCES)assert(text.split('\n').some(line=>line.includes(t.path)&&line.includes(t.oldSha256)&&line.includes(t.newSha256)));
});
for(const t of SOURCES){
  test('wrong old hash rejected: '+t.path,()=>{
    const old=structuredClone(previous);[...old.files,...old.additions].find(i=>i.path===t.path).sha256='0'.repeat(64);
    assert.throws(()=>successor(old,'sprint6_2',harness,nestedHash),/WRONG_OLD_HASH_STOP/);
  });
  test('wrong new manifest hash rejected: '+t.path,()=>{
    const changed=structuredClone(candidate);[...changed.files,...changed.additions].find(i=>i.path===t.path).sha256='0'.repeat(64);
    assert.throws(()=>validate(changed),/SUCCESSOR_UNAUTHORIZED_CHANGE_STOP/);
  });
  test('wrong current file bytes rejected: '+t.path,async()=>{
    await assert.rejects(verifyEntries([{path:t.path,sha256:t.newSha256}],async()=>Buffer.from('changed')),/CURRENT_HASH_STOP/);
  });
}
test('unrelated source transition rejected',()=>{
  const changed=structuredClone(candidate);changed.files.find(i=>i.path==='src/analysis/breakEven.js').sha256='0'.repeat(64);
  assert.throws(()=>validate(changed),/SUCCESSOR_UNAUTHORIZED_CHANGE_STOP/);
});
test('additional and missing membership both rejected',()=>{
  for(const edit of [b=>b.files.push({path:'unexpected.js',sha256:'0'.repeat(64)}),b=>b.files.pop(),b=>b.additions.pop()]){
    const b=structuredClone(candidate);edit(b);assert.throws(()=>validate(b),/SUCCESSOR_UNAUTHORIZED_CHANGE_STOP/);
  }
});
test('missing current file fails closed, no catch-and-ignore',async()=>{
  await assert.rejects(verifyEntries([{path:'missing',sha256:'0'.repeat(64)}],async()=>{throw Object.assign(new Error('missing'),{code:'ENOENT'});}),{code:'ENOENT'});
});
test('generated paths, format, historical hash and treatment cannot change',()=>{
  for(const edit of [b=>b.generatedArtifacts.pop(),b=>b.generatedArtifacts.push({path:'extra.pdf'}),b=>b.generatedArtifacts[0].format='unchecked',b=>b.generatedArtifacts[0].historicalSha256='0'.repeat(64),b=>b.treatment='skip output']){
    const b=structuredClone(candidate);edit(b);assert.throws(()=>validate(b),/SUCCESSOR_UNAUTHORIZED_CHANGE_STOP/);
  }
});
test('authorization evidence cannot be changed',()=>{
  const b=structuredClone(candidate);b.authorization.sourceTransitions[0].evidence='arbitrary';
  assert.throws(()=>validate(b),/SUCCESSOR_UNAUTHORIZED_CHANGE_STOP/);
});
test('nested successor changes exactly one pin and preserves 350 others',()=>{
  validateNested(nestedOld,nestedNew);
  assert.equal(nestedNew.files.filter((i,n)=>i.sha256!==nestedOld.files[n].sha256).length,1);
});
test('nested wrong old MAO hash rejected',()=>{
  const old=structuredClone(nestedOld);old.files.find(i=>i.file==='src/underwriting/mao.js').sha256='0'.repeat(64);
  assert.throws(()=>nestedSuccessor(old),/NESTED_OLD_HASH_STOP/);
});
test('nested wrong new MAO, unrelated edit and missing membership rejected',()=>{
  for(const edit of [b=>b.files.find(i=>i.file==='src/underwriting/mao.js').sha256='0'.repeat(64),b=>b.files[0].sha256='0'.repeat(64),b=>b.files.pop()]){
    const b=structuredClone(nestedNew);edit(b);assert.throws(()=>validateNested(nestedOld,b),/NESTED_UNAUTHORIZED_CHANGE_STOP/);
  }
});
test('all 351 actual nested source hashes validated',async()=>{assert.equal((await verifyNestedProtection()).files.length,351);});
test('all existing generated-artifact structural/content checks retained and pass',async()=>{await verifyGeneratedProtectedArtifacts(candidate);});
for(const item of HARNESS)test('reference helper patch is mechanical and extra code rejected: '+item.path,async()=>{
  const bytes=await readFile(item.path);assert.equal(harnessTransition(item,bytes).oldSha256,item.oldSha256);
  assert.throws(()=>harnessTransition(item,Buffer.concat([bytes,Buffer.from('\n// unrelated')])),/HARNESS_NON_MECHANICAL_CHANGE_STOP/);
});

