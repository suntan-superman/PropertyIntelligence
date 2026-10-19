import path from 'node:path';
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {DISCOVERY_LIMITS} from './config.js';

const VERSION='PI_DISCOVERY_V1_6_LOCAL_STATE';
const statuses=new Set(['NOT_RESEARCHED','UNREVIEWED','RESEARCHING','INVESTIGATING','PRELIMINARY','NEEDS_REVIEW','RESEARCH_READY','SHORTLISTED','DEFERRED','REJECTED']);
const now=()=>new Date().toISOString();
const unique=values=>[...new Set(values??[])];

export function createDiscoveryStore(directory,discovery){
  const file=path.join(directory,'state.json'),ids=new Set((discovery.records??discovery.candidates).map(candidate=>candidate.id));
  const empty=()=>({version:VERSION,batches:[],activeBatchId:null,shortlist:[],candidateStatus:{},history:[],updatedAt:null});
  const snapshot=state=>({batches:structuredClone(state.batches),activeBatchId:state.activeBatchId,shortlist:[...state.shortlist],candidateStatus:{...state.candidateStatus}});
  function normalize(input){
    if(input?.version==='PI_DISCOVERY_V1_5_LOCAL_STATE')return {...empty(),shortlist:unique(input.shortlist),candidateStatus:{...(input.candidateStatus??{})},updatedAt:input.updatedAt??null};
    return {version:VERSION,batches:Array.isArray(input?.batches)?input.batches.map(batch=>({id:String(batch.id??''),name:String(batch.name??'').trim(),candidateIds:[...(batch.candidateIds??[])],shortlist:[...(batch.shortlist??[])],createdAt:batch.createdAt??now(),updatedAt:batch.updatedAt??now()})):[],activeBatchId:input?.activeBatchId??null,shortlist:[...(input?.shortlist??[])],candidateStatus:{...(input?.candidateStatus??{})},history:Array.isArray(input?.history)?input.history.slice(-5):[],updatedAt:input?.updatedAt??null};
  }
  function validate(state){
    if(state?.version!==VERSION||!Array.isArray(state.batches)||state.batches.length>DISCOVERY_LIMITS.maxSavedBatches)throw new Error('Invalid local discovery batch state.');
    const batchIds=new Set();for(const batch of state.batches){
      if(!/^[a-zA-Z0-9-]{1,80}$/.test(batch.id)||batchIds.has(batch.id)||!batch.name||batch.name.length>100)throw new Error('Invalid or duplicate research batch.');batchIds.add(batch.id);
      if(!Array.isArray(batch.candidateIds)||batch.candidateIds.length<1||batch.candidateIds.length>DISCOVERY_LIMITS.batchSize||unique(batch.candidateIds).length!==batch.candidateIds.length||batch.candidateIds.some(id=>!ids.has(id)))throw new Error(`Research batches require 1 to ${DISCOVERY_LIMITS.batchSize} distinct retained candidates.`);
      if(!Array.isArray(batch.shortlist)||batch.shortlist.length>DISCOVERY_LIMITS.shortlistSize||unique(batch.shortlist).length!==batch.shortlist.length||batch.shortlist.some(id=>!batch.candidateIds.includes(id)))throw new Error(`Each research batch may shortlist up to ${DISCOVERY_LIMITS.shortlistSize} of its own candidates.`);
    }
    if(state.activeBatchId&&!batchIds.has(state.activeBatchId))throw new Error('Active research batch is unavailable.');
    if(!Array.isArray(state.shortlist)||state.shortlist.length>DISCOVERY_LIMITS.shortlistSize||unique(state.shortlist).length!==state.shortlist.length||state.shortlist.some(id=>!ids.has(id)))throw new Error('Invalid local discovery shortlist state.');
    const active=state.batches.find(batch=>batch.id===state.activeBatchId);if(active&&state.shortlist.some(id=>!active.candidateIds.includes(id)))throw new Error('Shortlist candidates must belong to the active research batch.');
    if(!state.candidateStatus||Object.entries(state.candidateStatus).some(([id,status])=>!ids.has(id)||!statuses.has(status)))throw new Error('Invalid local discovery research status.');
  }
  async function persist(state){await mkdir(directory,{recursive:true});const temp=path.join(directory,`state.${randomUUID()}.tmp`);await writeFile(temp,JSON.stringify(state,null,2)+'\n',{flag:'wx',mode:0o600});await rename(temp,file);return structuredClone(state);}
  async function read(){try{const state=normalize(JSON.parse(await readFile(file,'utf8')));validate(state);return state;}catch(error){if(error.code==='ENOENT')return empty();throw error;}}
  async function save(input){
    const current=await read();
    if(input?.action==='UNDO'){
      if(!current.history.length)return current;const prior=current.history.at(-1),restored=normalize({...prior,history:current.history.slice(0,-1),updatedAt:now()});validate(restored);return persist(restored);
    }
    const next=normalize({...input,updatedAt:now()});next.history=[...current.history,snapshot(current)].slice(-5);validate(next);return persist(next);
  }
  return {read,save,limits:{...DISCOVERY_LIMITS}};
}

