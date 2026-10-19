import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirestoreSupportingDocumentRepository} from '../src/investment-workspace/firebase-supporting-documents.js';

const clone=value=>value===undefined?undefined:structuredClone(value);

function fakeFirestore(seed={}){
  const rows=new Map(Object.entries(seed).map(([path,value])=>[path,clone(value)])),writes=[];
  class Snapshot{
    constructor(ref){this.ref=ref;this.id=ref.id;this.exists=rows.has(ref.path);}
    data(){return clone(rows.get(this.ref.path));}
  }
  class Reference{
    constructor(path){this.path=path;this.id=path.split('/').at(-1);}
    collection(name){return new Collection(`${this.path}/${name}`);}
    async get(){return new Snapshot(this);}
  }
  class Collection{
    constructor(path){this.path=path;}
    doc(id='generated'){return new Reference(`${this.path}/${id}`);}
    async get(){const prefix=`${this.path}/`,docs=[];for(const key of rows.keys())if(key.startsWith(prefix)&&!key.slice(prefix.length).includes('/'))docs.push(new Snapshot(new Reference(key)));return {docs};}
  }
  const transaction={
    get:ref=>ref.get(),
    set(ref,value,options){writes.push({operation:'set',path:ref.path,options});rows.set(ref.path,clone(value));},
    update(ref,value){if(!rows.has(ref.path))throw new Error('NOT_FOUND');writes.push({operation:'update',path:ref.path});rows.set(ref.path,{...rows.get(ref.path),...clone(value)});},
    create(ref,value){if(rows.has(ref.path))throw new Error('ALREADY_EXISTS');writes.push({operation:'create',path:ref.path});rows.set(ref.path,clone(value));}
  };
  return {collection:name=>new Collection(name),runTransaction:async callback=>callback(transaction),_rows:rows,_writes:writes};
}

const basePath='organizations/org-one/properties/property-one',documentPath=`${basePath}/supportingDocuments/document-one`,versionPath=`${documentPath}/versions/v000001`;
const version={version:1,filename:'evidence.pdf',mimeType:'application/pdf',sha256:'a'.repeat(64),storageKey:'organizations/org-one/properties/property-one/documents/document-one/versions/1/a.pdf',scanStatus:'CLEAN',reviewStatus:'PENDING_REVIEW',confidentiality:'STANDARD',redistributionPermission:'NOT_APPROVED',appendixSelected:false,reviewedAt:null,reviewedBy:null};
const parent={id:'document-one',propertyId:'property-one',organizationId:'org-one',currentVersion:1,documentType:'OTHER',description:'Synthetic evidence',source:'QA',evidenceClaim:'OTHER',...version,filename:undefined,mimeType:undefined,sha256:undefined,storageKey:undefined,scanStatus:undefined,updatedAt:'2026-10-19T12:00:00.000Z',updatedBy:'analyst-one'};

test('Firestore adapter fails closed when parent and immutable-version eligibility disagree',async()=>{
  const firestore=fakeFirestore({[basePath]:{id:'property-one'},[documentPath]:{...parent,reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true,reviewedAt:'2026-10-19T12:01:00.000Z',reviewedBy:'analyst-one'},[versionPath]:version}),repository=createFirestoreSupportingDocumentRepository({firestore});
  await assert.rejects(()=>repository.get('org-one','property-one','document-one'),error=>error.code==='DOCUMENT_ELIGIBILITY_INCONSISTENT'&&error.status===409);
  assert.equal(firestore._writes.length,0);
});

test('Firestore adapter lists an inconsistent document as explicitly blocked without hiding consistent documents',async()=>{
  const secondPath=`${basePath}/supportingDocuments/document-two`,secondVersionPath=`${secondPath}/versions/v000001`,firestore=fakeFirestore({[basePath]:{id:'property-one'},[documentPath]:{...parent,reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true,reviewedAt:'2026-10-19T12:01:00.000Z',reviewedBy:'analyst-one'},[versionPath]:version,[secondPath]:{...parent,id:'document-two'},[secondVersionPath]:version}),repository=createFirestoreSupportingDocumentRepository({firestore}),records=await repository.list('org-one','property-one'),blocked=records.find(item=>item.id==='document-one'),available=records.find(item=>item.id==='document-two');
  assert.equal(blocked.eligibilityConsistent,false);
  assert.equal(blocked.eligibilityError,'DOCUMENT_ELIGIBILITY_INCONSISTENT');
  assert.equal(available.eligibilityConsistent,true);
  await assert.rejects(()=>repository.get('org-one','property-one','document-one'),error=>error.code==='DOCUMENT_ELIGIBILITY_INCONSISTENT');
  assert.equal(firestore._writes.length,0);
});

test('Firestore adapter atomically synchronizes current-version eligibility without changing immutable identity',async()=>{
  const firestore=fakeFirestore({[basePath]:{id:'property-one'},[documentPath]:parent,[versionPath]:version}),repository=createFirestoreSupportingDocumentRepository({firestore}),reviewedAt='2026-10-19T12:01:00.000Z',next={...parent,reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true,reviewedAt,reviewedBy:'analyst-one',updatedAt:reviewedAt,versions:[{...version,reviewStatus:'REVIEWED',redistributionPermission:'APPROVED',appendixSelected:true,reviewedAt,reviewedBy:'analyst-one'}]},saved=await repository.update('org-one','property-one','document-one',next),storedVersion=firestore._rows.get(versionPath);
  assert.equal(saved.appendixSelected,true);
  assert.equal(saved.versions[0].reviewStatus,'REVIEWED');
  assert.deepEqual(firestore._writes.map(item=>item.path),[documentPath,versionPath,basePath]);
  assert.equal(storedVersion.sha256,version.sha256);
  assert.equal(storedVersion.storageKey,version.storageKey);
  assert.equal(storedVersion.filename,version.filename);
  assert.equal(storedVersion.reviewStatus,'REVIEWED');
  assert.equal(storedVersion.redistributionPermission,'APPROVED');
  assert.equal(storedVersion.appendixSelected,true);
});

test('Firestore adapter rejects attempts to mutate immutable version identity before writing',async()=>{
  const firestore=fakeFirestore({[basePath]:{id:'property-one'},[documentPath]:parent,[versionPath]:version}),repository=createFirestoreSupportingDocumentRepository({firestore}),next={...parent,versions:[{...version,sha256:'b'.repeat(64)}]};
  await assert.rejects(()=>repository.update('org-one','property-one','document-one',next),error=>error.code==='IMMUTABLE_DOCUMENT_VERSION_CONFLICT'&&error.details.field==='sha256');
  assert.equal(firestore._writes.length,0);
  assert.equal(firestore._rows.get(versionPath).sha256,version.sha256);
});
