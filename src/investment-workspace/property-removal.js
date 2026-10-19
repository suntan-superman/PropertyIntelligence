import path from 'node:path';
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {addressParts,canonicalAddress} from '../../apps/web/src/features/property-search/address-identity.js';

const VERSION='PI_WORKSPACE_REMOVALS_V1';
export const workspaceAddressKey=value=>{const address=canonicalAddress(value);return `${address.street}|${address.city}|${address.state}|${address.zip}`;};
export const confirmationStreet=value=>canonicalAddress({street:value,city:'CONFIRM',state:'CA',zip:''}).street;

async function load(file){
  try{const value=JSON.parse(await readFile(file,'utf8'));if(value?.version!==VERSION||!Array.isArray(value.entries))throw new Error('WORKSPACE_REMOVAL_REGISTRY_INVALID');return value;}
  catch(error){if(error.code==='ENOENT')return {version:VERSION,entries:[]};throw error;}
}
async function save(file,value){await mkdir(path.dirname(file),{recursive:true});const temporary=`${file}.${randomUUID()}.tmp`;await writeFile(temporary,`${JSON.stringify(value,null,2)}\n`,{mode:0o600});await rename(temporary,file);}

export async function createWorkspaceRemovalRegistry({file,clock=()=>new Date()}={}){
  if(!path.isAbsolute(file))throw new Error('WORKSPACE_REMOVAL_FILE_MUST_BE_ABSOLUTE');
  let state=await load(file);
  const matches=(property,entry)=>property?.ref===entry.propertyRef||workspaceAddressKey(addressParts(property))===entry.addressKey;
  return {
    entries(){return structuredClone(state.entries);},
    isRemoved(property){return state.entries.some(entry=>matches(property,entry));},
    filterEvidence(evidence){const properties=(evidence.properties??[]).filter(property=>!state.entries.some(entry=>matches(property,entry))),refs=new Set(properties.map(property=>property.ref));return {...evidence,properties,propertyDetails:(evidence.propertyDetails??[]).filter(detail=>refs.has(detail.subjectRef))};},
    async add({propertyRef=null,address,addressComponents,userId,sourceEvidencePreserved=true}){const entry={id:randomUUID(),propertyRef,addressKey:workspaceAddressKey(addressComponents),address,addressComponents,removedAt:clock().toISOString(),removedBy:userId,sourceEvidencePreserved};state={version:VERSION,entries:[...state.entries.filter(existing=>existing.propertyRef!==propertyRef&&existing.addressKey!==entry.addressKey),entry]};await save(file,state);return structuredClone(entry);}
  };
}
