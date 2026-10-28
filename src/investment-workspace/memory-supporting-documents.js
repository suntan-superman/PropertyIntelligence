const clone=value=>value==null?value:structuredClone(value);
const key=(organizationId,propertyId,documentId)=>`${organizationId}:${propertyId}:${documentId}`;

export function createMemorySupportingDocumentRepository(){
  const documents=new Map(),hashes=new Map(),audit=[];
  return {
    async list(organizationId,propertyId){return [...documents.values()].filter(item=>item.organizationId===organizationId&&item.propertyId===propertyId).map(clone).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));},
    async get(organizationId,propertyId,documentId){const item=documents.get(key(organizationId,propertyId,documentId));return item?clone(item):null;},
    async findByHash(organizationId,sha256){const found=hashes.get(`${organizationId}:${sha256}`);return found?clone(documents.get(found)):null;},
    async createVersion(record,version){const hashKey=`${record.organizationId}:${version.sha256}`,existing=hashes.get(hashKey);if(existing)return {created:false,duplicate:clone(documents.get(existing))};documents.set(key(record.organizationId,record.propertyId,record.id),clone(record));hashes.set(hashKey,key(record.organizationId,record.propertyId,record.id));return {created:true,record:clone(record)};},
    async update(organizationId,propertyId,documentId,record){documents.set(key(organizationId,propertyId,documentId),clone(record));return clone(record);},
    async appendAudit(entry){audit.push(clone(entry));return clone(entry);},
    _state:{documents,hashes,audit}
  };
}

export function createMemoryPrivateDocumentStorage(){
  const objects=new Map();
  return {async put(storageKey,bytes,metadata){objects.set(storageKey,{bytes:Buffer.from(bytes),metadata:clone(metadata)});},async get(storageKey){const object=objects.get(storageKey);if(!object)throw new Error('DOCUMENT_OBJECT_NOT_FOUND');return Buffer.from(object.bytes);},async stat(storageKey){const object=objects.get(storageKey);if(!object)throw new Error('DOCUMENT_OBJECT_NOT_FOUND');return {sizeBytes:object.bytes.length,contentType:object.metadata?.contentType};},async secure(storageKey,metadata){const object=objects.get(storageKey);if(!object)throw new Error('DOCUMENT_OBJECT_NOT_FOUND');object.metadata={...object.metadata,...clone(metadata)};},async remove(storageKey){objects.delete(storageKey);},_state:{objects}};
}
