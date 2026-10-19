import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileHash} from '../sprint6_2/io.js';
import {sha} from '../rentcast-controlled-pilot/core.js';

export const ROOT='data/runtime/preliminary-property-analysis-v1';
export const readJson=async p=>JSON.parse(await readFile(p,'utf8'));
export const newJson=async(p,x)=>writeFile(p,JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600});
export const newText=async(p,x)=>writeFile(p,x,{flag:'wx',mode:0o600});
export async function filesUnder(dir){
  const files=[];
  for(const e of await readdir(dir,{withFileTypes:true})){
    const p=join(dir,e.name).replaceAll('\\','/');
    if(e.isDirectory())files.push(...await filesUnder(p));else if(e.isFile())files.push(p);else throw new Error('UNEXPECTED_FILE_TYPE');
  }
  return files;
}
export async function prepare(){
  execFileSync('git',['check-ignore','--quiet',`${ROOT}/private.json`],{stdio:'pipe'});
  const previous=await readJson('data/runtime/versioned-baseline-reconciliation/run-WF5zED/preservation-before.json');
  const paths=new Set([...Object.keys(previous.hashes),...execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean)].map(p=>p.replaceAll('\\','/')));
  for(const dir of ['data/runtime/rentcast-controlled-pilot','data/runtime/rentcast-reconciliation-v1-1','data/runtime/identity-resolution-pilot','data/runtime/identity-persistence-test','data/runtime/durable-identity-pilot','data/runtime/mls-round1','data/runtime/sprint6_2-kern-assessor','data/runtime/rc-p2-current-identity-readiness','data/runtime/rentcast','data/validation/monte-carlo-v1','data/validation/investor-report-v1'])for(const p of await filesUnder(dir))paths.add(p);
  paths.add('data/raw/kern-assessor/KernCountyAssessor_GisParcels_2026final.zip');
  const hashes={};for(const p of [...paths].sort())hashes[p]=await fileHash(p);
  await mkdir(ROOT,{recursive:false});
  const receipt={version:'PRELIMINARY_PRESERVATION_V1',capturedAt:new Date().toISOString(),hashes,count:paths.size,aggregateSha256:sha(JSON.stringify(hashes))};
  await newJson(`${ROOT}/preservation-before.json`,receipt);
  return {status:'PASS',count:receipt.count,aggregateSha256:receipt.aggregateSha256};
}
export async function verifyPreservation(){
  const before=await readJson(`${ROOT}/preservation-before.json`);
  for(const [p,h] of Object.entries(before.hashes))assert.equal(await fileHash(p),h,'PROTECTED_CHANGE_STOP');
  return {status:'PASS',count:before.count,aggregateSha256:before.aggregateSha256,unexpectedChanges:0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{assert.equal(process.argv.length,3);assert(['prepare','verify'].includes(process.argv[2]));console.log(JSON.stringify(await(process.argv[2]==='prepare'?prepare():verifyPreservation())));}
  catch{console.error('PRELIMINARY_PRESERVATION_STOP');process.exitCode=1;}
}
