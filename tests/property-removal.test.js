import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createStore} from '../src/investment-workspace/store.js';
import {confirmationStreet,createWorkspaceRemovalRegistry} from '../src/investment-workspace/property-removal.js';

test('workspace removal registry excludes only the confirmed property and preserves an audit boundary',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pi-removal-registry-')),file=path.join(directory,'workspace-removals.json'),property={ref:'SUBJECT-1',address:'400 Decatur St, Bakersfield, CA 93308',addressComponents:{street:'400 Decatur St',city:'Bakersfield',state:'CA',zip:'93308'}},other={ref:'SUBJECT-2',address:'401 Decatur St, Bakersfield, CA 93308',addressComponents:{street:'401 Decatur St',city:'Bakersfield',state:'CA',zip:'93308'}},registry=await createWorkspaceRemovalRegistry({file,clock:()=>new Date('2026-10-18T17:00:00.000Z')});
  await registry.add({propertyRef:property.ref,address:property.address,addressComponents:property.addressComponents,userId:'admin-1',sourceEvidencePreserved:true});
  const filtered=registry.filterEvidence({properties:[property,other],propertyDetails:[{subjectRef:property.ref},{subjectRef:other.ref}]});
  assert.deepEqual(filtered.properties.map(item=>item.ref),[other.ref]);assert.deepEqual(filtered.propertyDetails.map(item=>item.subjectRef),[other.ref]);
  const stored=JSON.parse(await readFile(file,'utf8'));assert.equal(stored.entries[0].removedBy,'admin-1');assert.equal(stored.entries[0].sourceEvidencePreserved,true);assert.equal(stored.entries[0].removedAt,'2026-10-18T17:00:00.000Z');
  assert.equal(confirmationStreet('400 Decatur Street'),confirmationStreet('400 Decatur St'));
});

test('scenario deletion removes every revision for the selected property and leaves other properties unchanged',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pi-removal-scenarios-'));await mkdir(directory,{recursive:true});
  const records=[{id:'11111111-1111-1111-1111-111111111111',propertyRef:'SUBJECT-1',revision:1,savedAt:'2026-10-18T17:00:00.000Z'},{id:'11111111-1111-1111-1111-111111111111',propertyRef:'SUBJECT-1',revision:2,savedAt:'2026-10-18T17:01:00.000Z'},{id:'22222222-2222-2222-2222-222222222222',propertyRef:'SUBJECT-2',revision:1,savedAt:'2026-10-18T17:02:00.000Z'}];
  for(const record of records)await writeFile(path.join(directory,`${record.id}.r${record.revision}.json`),JSON.stringify(record));
  const store=createStore(directory,{properties:[]}),preview=await store.dependencies('SUBJECT-1');assert.deepEqual(preview,{scenarios:1,revisions:2});
  assert.deepEqual(await store.removeProperty('SUBJECT-1'),{scenarios:1,revisions:2});assert.deepEqual((await store.all()).map(item=>item.propertyRef),['SUBJECT-2']);
});
