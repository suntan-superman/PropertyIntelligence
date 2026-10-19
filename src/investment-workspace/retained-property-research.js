import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,realpath,stat} from 'node:fs/promises';
import {toPreliminaryEvidence} from './property-research.js';

const REGISTRY='data/runtime/pi-v2-2/retained-subjects.json';
const RAW_ROOT='data/raw/rentcast/property-research-v2-2/';
const ACCEPTANCE_ROOT='data/runtime/pi-v2-2/live-acceptance/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashPattern=/^[a-f0-9]{64}$/;

async function verifiedBytes(root,reference,expectedHash,allowedRoot){
  if(typeof reference!=='string'||!reference.startsWith(allowedRoot)||reference.includes('..')||!hashPattern.test(expectedHash))throw new Error('RETAINED_RESEARCH_REFERENCE_INVALID');
  const absolute=path.resolve(root,reference),relative=path.relative(root,absolute).replaceAll('\\','/');
  if(relative!==reference.replaceAll('\\','/'))throw new Error('RETAINED_RESEARCH_PATH_INVALID');
  const actual=await realpath(absolute),info=await stat(absolute);
  if(actual.toLowerCase()!==absolute.toLowerCase()||info.isSymbolicLink()||!info.isFile())throw new Error('RETAINED_RESEARCH_FILE_INVALID');
  const bytes=await readFile(absolute);
  if(sha(bytes)!==expectedHash)throw new Error('RETAINED_RESEARCH_HASH_MISMATCH');
  return bytes;
}

export async function addRetainedPropertyResearch(evidence,root=process.cwd(),registry=REGISTRY){
  let record;
  try{record=JSON.parse(await readFile(path.join(root,registry),'utf8'));}
  catch(error){if(error.code==='ENOENT')return evidence;throw error;}
  if(record.version!=='PI_V2_2_RETAINED_RESEARCH_V1'||!Array.isArray(record.subjects)||record.subjects.length>100)throw new Error('RETAINED_RESEARCH_REGISTRY_INVALID');
  const properties=[...evidence.properties],propertyDetails=[...(evidence.propertyDetails??[])];
  for(const item of record.subjects){
    if(item.provider!=='RentCast'||item.endpoint!=='/properties'||typeof item.providerRecordId!=='string'||!item.providerRecordId||typeof item.subjectRef!=='string')throw new Error('RETAINED_RESEARCH_SUBJECT_INVALID');
    const rawBytes=await verifiedBytes(root,item.rawResponseRef,item.rawResponseSha256,RAW_ROOT);
    await verifiedBytes(root,item.acceptanceRef,item.acceptanceSha256,ACCEPTANCE_ROOT);
    const raw=JSON.parse(rawBytes);
    if(raw.schemaVersion!==1||raw.httpStatus!==200||raw.bodyHash!==item.bodyHash||raw.request?.endpoint!=='/properties'||!Array.isArray(raw.body))throw new Error('RETAINED_RESEARCH_RESPONSE_INVALID');
    const matches=raw.body.filter(candidate=>candidate?.id===item.providerRecordId);
    if(matches.length!==1)throw new Error('RETAINED_RESEARCH_PROVIDER_ID_INVALID');
    const retained=toPreliminaryEvidence(matches[0],{...raw,rawResponseRef:item.rawResponseRef});
    if(retained.property.ref!==item.subjectRef||retained.detail.subjectRef!==item.subjectRef)throw new Error('RETAINED_RESEARCH_SUBJECT_REF_INVALID');
    if(!properties.some(property=>property.ref===item.subjectRef))properties.push(retained.property);
    if(!propertyDetails.some(detail=>detail.subjectRef===item.subjectRef))propertyDetails.push(retained.detail);
  }
  return {...evidence,properties,propertyDetails};
}
