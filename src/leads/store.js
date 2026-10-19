import {copyFile,mkdir,readFile,readdir,rename,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {LEAD_STATES} from './contract.js';

const keyFor=lead=>createHash('sha256').update(`${lead.source}\u0000${lead.externalLeadId}`).digest('hex');
const safeFile=id=>/^[0-9a-f-]{36}$/i.test(id)?`${id}.json`:null;
const atomicWrite=async(file,value)=>{const temp=`${file}.${randomUUID()}.tmp`,bytes=JSON.stringify(value,null,2)+'\n';await writeFile(temp,bytes,{flag:'wx'});try{await rename(temp,file);}catch(error){if(!['EEXIST','EPERM'].includes(error.code))throw error;await copyFile(temp,file);await unlink(temp);}};

export function createLeadStore(directory){
  const indexFile=path.join(directory,'idempotency-index.json');
  const readIndex=async()=>{try{return JSON.parse(await readFile(indexFile,'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw error;}};
  const read=async id=>{const name=safeFile(id);if(!name)throw new Error('Unknown lead.');return JSON.parse(await readFile(path.join(directory,name),'utf8'));};
  const save=async record=>{await mkdir(directory,{recursive:true});await atomicWrite(path.join(directory,`${record.id}.json`),record);return record;};
  return {
    async intake(lead){
      await mkdir(directory,{recursive:true});const index=await readIndex(),key=keyFor(lead),existing=index[key];
      if(existing)return {lead:await read(existing),duplicate:true,duplicateReviewRequired:true};
      const now=new Date().toISOString(),record={id:randomUUID(),state:'NEW',receivedAt:now,updatedAt:now,lead,duplicateReviewRequired:false,research:null,scenarioRefs:[],reportRefs:[]};
      await save(record);index[key]=record.id;await atomicWrite(indexFile,index);return {lead:record,duplicate:false,duplicateReviewRequired:false};
    },
    read,
    async list(){await mkdir(directory,{recursive:true});const files=(await readdir(directory)).filter(name=>/^[0-9a-f-]{36}\.json$/i.test(name)),records=await Promise.all(files.map(name=>readFile(path.join(directory,name),'utf8').then(JSON.parse)));return records.sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt));},
    async update(id,{state,research,scenarioRef,reportRef}={}){const record=await read(id);if(state&&!LEAD_STATES.includes(state))throw new Error('Unknown lead state.');const next={...record,state:state??record.state,research:research??record.research,updatedAt:new Date().toISOString(),scenarioRefs:scenarioRef?[...new Set([...record.scenarioRefs,scenarioRef])]:record.scenarioRefs,reportRefs:reportRef?[...new Set([...record.reportRefs,reportRef])]:record.reportRefs};return save(next);}
  };
}
