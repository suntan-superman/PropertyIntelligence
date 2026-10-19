import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {fileHash} from '../sprint6_2/io.js';
import {filesUnder,newJson,readJson} from '../preliminary-property-analysis-v1/guard.js';
import {verifyShortlist} from '../rentcast-financial-controlled-client-v1/guard.js';
import {hash} from '../rentcast-financial-controlled-client-v1/contract.js';
import {ROOT,CODE,FILES,NEW_FILES,REGISTRY,INPUTS} from './paths.js';
const gitFiles=()=>execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).map(p=>p.replaceAll('\\','/'));
export async function capture(){
  await verifyShortlist();execFileSync('git',['check-ignore','--quiet',`${ROOT}/private.json`]);
  const previous=await readJson('data/runtime/rentcast-financial-controlled-client-v1/preservation-before.json');
  const paths=new Set([...Object.keys(previous.hashes),...gitFiles(),...await filesUnder('data/runtime/rentcast-financial-controlled-client-v1')]);
  for(const p of [`${CODE}/guard.js`,`${CODE}/paths.js`])paths.delete(p);
  const hashes={};for(const p of [...paths].sort())hashes[p]=await fileHash(p);
  await mkdir(ROOT,{recursive:false});await mkdir(REGISTRY);await mkdir(INPUTS);
  const result={version:'RC_LIVE_A_PRESERVATION_V1',capturedAt:new Date().toISOString(),hashes,count:Object.keys(hashes).length,aggregateSha256:hash(hashes)};
  await newJson(`${ROOT}/preservation-before.json`,result);
  return {status:'PASS',count:result.count,aggregateSha256:result.aggregateSha256};
}
export async function preservation(){
  const b=await readJson(`${ROOT}/preservation-before.json`);
  for(const [p,h] of Object.entries(b.hashes))assert.equal(await fileHash(p),h,'PROTECTED_CHANGE_STOP');
  const added=gitFiles().filter(p=>!Object.hasOwn(b.hashes,p));assert(added.every(p=>NEW_FILES.includes(p)),'UNEXPECTED_FILE_STOP');
  return {status:'PASS',count:b.count,aggregateSha256:b.aggregateSha256,unexpectedChanges:0,addedFiles:added};
}
export async function privacy(){
  const s=await verifyShortlist(),values=s.candidates.flatMap(c=>[c.opaqueId,c.county.atn,c.county.apn9,c.candidateId,c.assessorId,c.address.street,c.address.rawAssessorSitus]);
  for(const p of NEW_FILES){const t=await readFile(p,'utf8');assert(values.filter(Boolean).every(v=>!t.includes(v)),'PUBLIC_IDENTITY_STOP');assert(!/sb_secret_[A-Za-z0-9_-]+|postgres(?:ql)?:\/\/[^\s]+@|AIza[0-9A-Za-z_-]{20}/.test(t),'CREDENTIAL_PATTERN_STOP');}
  return {status:'PASS',files:NEW_FILES.length};
}
export async function implementationHashes(){
  const paths=new Set(FILES);
  for(const dir of ['scripts/rentcast-financial-controlled-client-v1','scripts/rentcast-reconciliation-v1-1','scripts/rentcast-controlled-pilot','scripts/real-financial-evidence-v1','src/sources/rentcast'])for(const p of await filesUnder(dir))paths.add(p);
  for(const p of ['scripts/sprint6_2/io.js','scripts/sprint6_2/dbf.js','src/analysis/offline.js'])paths.add(p);
  const hashes={};for(const p of [...paths].sort())hashes[p]=await fileHash(p);return hashes;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{assert.equal(process.argv.length,3);assert(['capture','verify'].includes(process.argv[2]));console.log(JSON.stringify(await(process.argv[2]==='capture'?capture():preservation())));}
  catch{console.error('STAGE_A_PRESERVATION_STOP');process.exitCode=1;}
}
