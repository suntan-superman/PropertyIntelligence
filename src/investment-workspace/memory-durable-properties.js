import {PROPERTY_LIFECYCLE} from './durable-properties.js';

const copy=value=>value==null?value:structuredClone(value);
const orgKey=(organizationId,id)=>`${organizationId}:${id}`;
const identityKeys=record=>[`ADDRESS:${record.normalizedAddressMatchKey??record.normalizedAddressKey}`,...(record.parcelIdentifiers??[]).map(item=>`APN:${item.normalized}`)];

export function createMemoryDurablePropertyRepository(){
  const properties=new Map(),keys=new Map(),scenarios=new Map(),reports=new Map();
  const rowsFor=organizationId=>[...properties.values()].filter(record=>record.organizationId===organizationId);
  async function hydrate(record){
    const scenarioRows=[...(scenarios.get(orgKey(record.organizationId,record.id))?.values()??[])],reportRows=[...(reports.get(orgKey(record.organizationId,record.id))?.values()??[])];
    return {...copy(record),scenarioCount:new Set(scenarioRows.map(item=>item.scenarioId)).size,reportCount:reportRows.length};
  }
  return {
    async findDuplicates(organizationId,candidate){const ids=new Set(identityKeys(candidate).map(key=>keys.get(`${organizationId}:${key}`)).filter(Boolean));return Promise.all([...ids].map(id=>hydrate(properties.get(orgKey(organizationId,id)))));},
    async create(record){const ids=new Set(identityKeys(record).map(key=>keys.get(`${record.organizationId}:${key}`)).filter(Boolean));if(ids.size){const duplicates=await Promise.all([...ids].map(id=>hydrate(properties.get(orgKey(record.organizationId,id)))));return {created:false,duplicates};}properties.set(orgKey(record.organizationId,record.id),copy(record));for(const key of identityKeys(record))keys.set(`${record.organizationId}:${key}`,record.id);return {created:true,record:await hydrate(record)};},
    async list(organizationId,{includeArchived=false}={}){const rows=rowsFor(organizationId).filter(record=>includeArchived||record.lifecycleStatus!==PROPERTY_LIFECYCLE.ARCHIVED);return Promise.all(rows.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(hydrate));},
    async get(organizationId,id){const row=properties.get(orgKey(organizationId,id));return row?hydrate(row):null;},
    async findBySubject(organizationId,subjectRef,{includeArchived=false}={}){const row=rowsFor(organizationId).find(item=>item.sourceSubjectRef===subjectRef&&(includeArchived||item.lifecycleStatus!==PROPERTY_LIFECYCLE.ARCHIVED));return row?hydrate(row):null;},
    async setLifecycle(organizationId,id,lifecycle,{at,userId}){const key=orgKey(organizationId,id),row=properties.get(key);if(!row)return null;const next={...row,lifecycleStatus:lifecycle,archivedAt:lifecycle===PROPERTY_LIFECYCLE.ARCHIVED?at:null,updatedAt:at,lastEditedBy:userId};properties.set(key,next);return hydrate(next);},
    async linkScenarioRevision(organizationId,id,link){const key=orgKey(organizationId,id),row=properties.get(key);if(!row)return null;const bucket=scenarios.get(key)??new Map(),linkId=`${link.scenarioId}:r${link.revision}`,existing=bucket.get(linkId);if(existing&&existing.contentHash!==link.contentHash)throw new Error('IMMUTABLE_SCENARIO_REVISION_CONFLICT');if(!existing)bucket.set(linkId,copy(link));scenarios.set(key,bucket);properties.set(key,{...row,evidenceSnapshotIds:[...new Set([...(row.evidenceSnapshotIds??[]),link.evidenceSnapshotId])],updatedAt:link.linkedAt,lastEditedBy:link.linkedBy});return copy(bucket.get(linkId));},
    async listScenarioRevisions(organizationId,id){return [...(scenarios.get(orgKey(organizationId,id))?.values()??[])].map(copy).sort((a,b)=>a.linkedAt.localeCompare(b.linkedAt));},
    async linkReport(organizationId,id,report){const key=orgKey(organizationId,id),row=properties.get(key);if(!row)return null;const bucket=reports.get(key)??new Map();bucket.set(report.id,copy(report));reports.set(key,bucket);properties.set(key,{...row,updatedAt:report.generatedAt,lastEditedBy:report.linkedBy});return copy(report);},
    async listReports(organizationId,id){return [...(reports.get(orgKey(organizationId,id))?.values()??[])].map(copy).sort((a,b)=>a.generatedAt.localeCompare(b.generatedAt));},
    async removeReport(organizationId,id,reportId){const bucket=reports.get(orgKey(organizationId,id));return bucket?.delete(reportId)??false;},
    async removeScenarioRevisions(organizationId,id,scenarioId){const bucket=scenarios.get(orgKey(organizationId,id));if(!bucket)return 0;let removed=0;for(const [key,row] of bucket)if(row.scenarioId===scenarioId){bucket.delete(key);removed++;}return removed;},
    _state:{properties,keys,scenarios,reports}
  };
}
