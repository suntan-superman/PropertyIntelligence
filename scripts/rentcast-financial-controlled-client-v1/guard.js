import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileHash} from '../sprint6_2/io.js';
import {filesUnder,newJson,readJson} from '../preliminary-property-analysis-v1/guard.js';
import {fingerprint} from '../../src/analysis/monteCarlo/contract.js';
import {loadInputs,shortlist} from '../real-financial-evidence-v1/audit.js';

export const ROOT='data/runtime/rentcast-financial-controlled-client-v1';
export const SELECTION='ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4';
export const CODE='scripts/rentcast-financial-controlled-client-v1';
export const NEW_FILES=['guard.js','contract.js','evidence.js','ledger.js','client.js','fixtures.js','client.test.js','process-probe.js','qa.js'].map(f=>`${CODE}/${f}`).concat(
  ['','_QA','_LIVE_PREREQUISITES'].map(s=>`docs/PI_RENTCAST_FINANCIAL_CONTROLLED_CLIENT_V1${s}.md`));
const gitFiles=()=>execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).map(p=>p.replaceAll('\\','/'));
export async function verifyShortlist(){
  const saved=await readJson('data/runtime/real-financial-evidence-v1/private-candidate-shortlist.json');
  assert.equal(saved.selectionFingerprint,SELECTION,'SHORTLIST_SEAL_STOP');
  assert.equal(fingerprint(saved.candidates),SELECTION,'SHORTLIST_CONTENT_STOP');
  const recomputed=shortlist(await loadInputs());
  assert.equal(recomputed.selectionFingerprint,SELECTION,'SHORTLIST_SOURCE_STOP');
  assert.equal(saved.candidates[0].technicalOrdinal,1);
  return saved;
}
export async function capture(){
  await verifyShortlist();
  execFileSync('git',['check-ignore','--quiet',`${ROOT}/private.json`]);
  const old=await readJson('data/runtime/real-financial-evidence-v1/preservation-before.json');
  const paths=new Set([...Object.keys(old.hashes),...gitFiles()].map(p=>p.replaceAll('\\','/')));
  for(const dir of ['data/runtime/real-financial-evidence-v1','data/runtime/identity-resolution-pilot','data/runtime/rentcast-controlled-pilot','data/runtime/rentcast-reconciliation-v1-1','data/runtime/mls-round1'])
    for(const p of await filesUnder(dir))paths.add(p);
  paths.delete(`${CODE}/guard.js`);
  const hashes={};for(const p of [...paths].sort())hashes[p]=await fileHash(p);
  await mkdir(ROOT,{recursive:false});
  const b={version:'RCFC_PRESERVATION_V1',capturedAt:new Date().toISOString(),hashes,count:Object.keys(hashes).length,aggregateSha256:fingerprint(hashes)};
  await newJson(`${ROOT}/preservation-before.json`,b);
  return {status:'PASS',count:b.count,aggregateSha256:b.aggregateSha256,shortlist:'VERIFIED'};
}
export async function preservation(){
  const b=await readJson(`${ROOT}/preservation-before.json`);
  for(const [p,h] of Object.entries(b.hashes))assert.equal(await fileHash(p),h,'PRESERVATION_STOP');
  const added=gitFiles().filter(p=>!Object.hasOwn(b.hashes,p));
  assert(added.every(p=>NEW_FILES.includes(p)),'UNEXPECTED_NEW_FILE');
  return {status:'PASS',count:b.count,aggregateSha256:b.aggregateSha256,unexpectedChanges:0,addedFiles:added};
}
export async function privacy(){
  const s=await readJson('data/runtime/real-financial-evidence-v1/private-candidate-shortlist.json');
  const privateValues=s.candidates.flatMap(c=>[c.county.atn,c.county.apn9,c.candidateId,c.assessorId,c.address.street,c.address.rawAssessorSitus]);
  for(const p of NEW_FILES){
    const text=await readFile(p,'utf8');
    assert(privateValues.filter(Boolean).every(v=>!text.includes(v)),'PUBLIC_IDENTIFIER_STOP');
    assert(!/eyJ[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]+|postgres(?:ql)?:\/\/[^\s]+@/.test(text),'SECRET_PATTERN_STOP');
  }
  return {status:'PASS',files:NEW_FILES.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{assert.equal(process.argv.length,3);assert(['capture','verify'].includes(process.argv[2]));console.log(JSON.stringify(await(process.argv[2]==='capture'?capture():preservation())));}
  catch{console.error('PRESERVATION_OR_SHORTLIST_STOP');process.exitCode=1;}
}
