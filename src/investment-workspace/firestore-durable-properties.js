import {createHash} from 'node:crypto';
import {PROPERTY_LIFECYCLE} from './durable-properties.js';

const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const identityKeys=record=>[`ADDRESS:${record.normalizedAddressMatchKey??record.normalizedAddressKey}`,...(record.parcelIdentifiers??[]).map(item=>`APN:${item.normalized}`)];
const safeId=(value,label)=>{const text=String(value??'');if(!/^[A-Za-z0-9._-]{1,128}$/.test(text))throw new Error(`${label}_INVALID`);return text;};
const withoutUndefined=value=>JSON.parse(JSON.stringify(value));

export function createFirestoreDurablePropertyRepository({firestore}={}){
  if(!firestore?.collection||!firestore?.runTransaction)throw new Error('FIRESTORE_ADMIN_REQUIRED');
  const organization=organizationId=>firestore.collection('organizations').doc(safeId(organizationId,'ORGANIZATION_ID'));
  const properties=organizationId=>organization(organizationId).collection('properties');
  const property=(organizationId,id)=>properties(organizationId).doc(safeId(id,'PROPERTY_ID'));
  const propertyKey=(organizationId,key)=>organization(organizationId).collection('propertyKeys').doc(digest(key));
  async function hydrate(organizationId,snapshot){
    if(!snapshot?.exists)return null;
    const [scenarioRows,reportRows]=await Promise.all([snapshot.ref.collection('scenarioRevisions').get(),snapshot.ref.collection('reportRevisions').get()]);
    return {...snapshot.data(),id:snapshot.id,organizationId,scenarioCount:new Set(scenarioRows.docs.map(item=>item.data().scenarioId)).size,reportCount:reportRows.size};
  }
  async function duplicateSnapshots(organizationId,candidate){
    const keySnapshots=await Promise.all(identityKeys(candidate).map(key=>propertyKey(organizationId,key).get())),ids=[...new Set(keySnapshots.filter(item=>item.exists).map(item=>item.data().propertyId))];
    return Promise.all(ids.map(id=>property(organizationId,id).get()));
  }
  return {
    async findDuplicates(organizationId,candidate){return (await Promise.all((await duplicateSnapshots(organizationId,candidate)).map(snapshot=>hydrate(organizationId,snapshot)))).filter(Boolean);},
    async create(record){
      const organizationId=safeId(record.organizationId,'ORGANIZATION_ID'),propertyRef=property(organizationId,record.id),keys=identityKeys(record),keyRefs=keys.map(key=>propertyKey(organizationId,key));
      const outcome=await firestore.runTransaction(async transaction=>{
        const keySnapshots=[];for(const ref of keyRefs)keySnapshots.push(await transaction.get(ref));
        const duplicateIds=[...new Set(keySnapshots.filter(item=>item.exists).map(item=>item.data().propertyId))];
        if(duplicateIds.length)return {created:false,duplicateIds};
        transaction.create(propertyRef,withoutUndefined(record));
        keys.forEach((key,index)=>transaction.create(keyRefs[index],{organizationId,propertyId:record.id,kind:key.startsWith('APN:')?'APN':'NORMALIZED_ADDRESS',valueDigest:digest(key),createdAt:record.createdAt}));
        const evidenceRef=propertyRef.collection('evidenceSnapshots').doc(digest(record.evidenceSnapshotId));
        transaction.create(evidenceRef,{evidenceSnapshotId:record.evidenceSnapshotId,sourceSubjectRef:record.sourceSubjectRef,linkedAt:record.createdAt,linkedBy:record.createdBy,immutable:true});
        return {created:true,duplicateIds:[]};
      });
      if(!outcome.created){const duplicates=await Promise.all(outcome.duplicateIds.map(id=>property(organizationId,id).get()));return {created:false,duplicates:(await Promise.all(duplicates.map(item=>hydrate(organizationId,item)))).filter(Boolean)};}
      return {created:true,record:await hydrate(organizationId,await propertyRef.get())};
    },
    async list(organizationId,{includeArchived=false}={}){const snapshot=await properties(organizationId).get(),rows=await Promise.all(snapshot.docs.map(item=>hydrate(organizationId,item)));return rows.filter(item=>includeArchived||item.lifecycleStatus!==PROPERTY_LIFECYCLE.ARCHIVED).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));},
    async get(organizationId,id){return hydrate(organizationId,await property(organizationId,id).get());},
    async findBySubject(organizationId,subjectRef,{includeArchived=false}={}){const snapshot=await properties(organizationId).where('sourceSubjectRef','==',String(subjectRef)).limit(2).get(),rows=await Promise.all(snapshot.docs.map(item=>hydrate(organizationId,item)));return rows.find(item=>includeArchived||item.lifecycleStatus!==PROPERTY_LIFECYCLE.ARCHIVED)??null;},
    async setLifecycle(organizationId,id,lifecycle,{at,userId}){const ref=property(organizationId,id);await firestore.runTransaction(async transaction=>{const snapshot=await transaction.get(ref);if(!snapshot.exists)return;transaction.update(ref,{lifecycleStatus:lifecycle,archivedAt:lifecycle===PROPERTY_LIFECYCLE.ARCHIVED?at:null,updatedAt:at,lastEditedBy:userId});});return hydrate(organizationId,await ref.get());},
    async linkScenarioRevision(organizationId,id,link){
      const parent=property(organizationId,id),linkId=`${safeId(link.scenarioId,'SCENARIO_ID')}--r${link.revision}`,ref=parent.collection('scenarioRevisions').doc(linkId),evidenceRef=parent.collection('evidenceSnapshots').doc(digest(link.evidenceSnapshotId));
      await firestore.runTransaction(async transaction=>{const [propertySnapshot,existing,evidenceSnapshot]=await Promise.all([transaction.get(parent),transaction.get(ref),transaction.get(evidenceRef)]);if(!propertySnapshot.exists)throw new Error('DURABLE_PROPERTY_NOT_FOUND');if(existing.exists){if(existing.data().contentHash!==link.contentHash)throw new Error('IMMUTABLE_SCENARIO_REVISION_CONFLICT');return;}transaction.create(ref,withoutUndefined({...link,immutable:true}));if(!evidenceSnapshot.exists)transaction.create(evidenceRef,{evidenceSnapshotId:link.evidenceSnapshotId,sourceSubjectRef:propertySnapshot.data().sourceSubjectRef,linkedAt:link.linkedAt,linkedBy:link.linkedBy,immutable:true});const evidenceSnapshotIds=[...new Set([...(propertySnapshot.data().evidenceSnapshotIds??[]),link.evidenceSnapshotId])];transaction.update(parent,{evidenceSnapshotIds,updatedAt:link.linkedAt,lastEditedBy:link.linkedBy});});
      return (await ref.get()).data();
    },
    async listScenarioRevisions(organizationId,id){const snapshot=await property(organizationId,id).collection('scenarioRevisions').get();return snapshot.docs.map(item=>item.data()).sort((a,b)=>a.linkedAt.localeCompare(b.linkedAt));},
    async linkReport(organizationId,id,report){const parent=property(organizationId,id),ref=parent.collection('reportRevisions').doc(safeId(report.id,'REPORT_ID'));await firestore.runTransaction(async transaction=>{const propertySnapshot=await transaction.get(parent);if(!propertySnapshot.exists)throw new Error('DURABLE_PROPERTY_NOT_FOUND');transaction.create(ref,withoutUndefined({...report,immutable:true}));transaction.update(parent,{updatedAt:report.generatedAt,lastEditedBy:report.linkedBy});});return report;},
    async listReports(organizationId,id){const snapshot=await property(organizationId,id).collection('reportRevisions').get();return snapshot.docs.map(item=>item.data()).sort((a,b)=>a.generatedAt.localeCompare(b.generatedAt));},
    async removeReport(organizationId,id,reportId){const ref=property(organizationId,id).collection('reportRevisions').doc(safeId(reportId,'REPORT_ID')),snapshot=await ref.get();if(!snapshot.exists)return false;await ref.delete();return true;},
    async removeScenarioRevisions(organizationId,id,scenarioId){const snapshot=await property(organizationId,id).collection('scenarioRevisions').where('scenarioId','==',safeId(scenarioId,'SCENARIO_ID')).get();if(snapshot.empty)return 0;if(snapshot.size>450)throw new Error('SCENARIO_REVISION_REMOVAL_LIMIT');const batch=firestore.batch();snapshot.docs.forEach(item=>batch.delete(item.ref));await batch.commit();return snapshot.size;}
  };
}
