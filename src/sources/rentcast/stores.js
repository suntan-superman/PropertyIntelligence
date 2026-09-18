import {hash} from '../../io/files.js';
import {readCache,saveCache} from './cache.js';

export function filesystemStore(){return {durable:true,get:readCache,put:saveCache,has:async location=>Boolean(await readCache(location))};}
export function memoryStore({limit=100}={}){
  const latest=new Map(),snapshots=new Map();
  const valid=entry=>entry?.httpStatus===200&&entry.body&&!entry.body.error&&!entry.body.parseError;
  return {durable:false,
    async get(location){const entry=latest.get(location.index);return entry?structuredClone(entry):null;},
    async has(location){return latest.has(location.index);},
    async put(location,entry){
      const bodyHash=hash(JSON.stringify(entry.body));
      const rawResponseRef=`memory://rentcast/${hash(JSON.stringify([location.request,entry.retrievedAt,bodyHash]))}`;
      const record={schemaVersion:1,...structuredClone(entry),request:location.request,bodyHash,rawResponseRef};
      snapshots.set(rawResponseRef,record);
      while(snapshots.size>limit*2)snapshots.delete(snapshots.keys().next().value);
      if(valid(record)){latest.set(location.index,record);while(latest.size>limit)latest.delete(latest.keys().next().value);}
      return structuredClone(record);
    }
  };
}
