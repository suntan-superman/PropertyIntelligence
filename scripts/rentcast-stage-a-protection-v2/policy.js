import {lstat,realpath,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileHash} from '../sprint6_2/io.js';
import {check,exactKeys,digest,hash,sha} from '../rentcast-financial-controlled-client-v1/contract.js';
import {ADDITIONS,FILES} from './paths.js';
export const ORIGINAL_CERT_SHA='bacea3dabc1c8622a2b09c29dd96899ddc6a86627f98d690ee85a620331fa377';
export const ORIGINAL_BASELINE_SHA='7ab3bdd6f47adab1135f91fc5ef99720d9bee85bed444c8e841f8b5e3f944e7e';
export const IGNORE_TRANSITION=Object.freeze({path:'.gitignore',oldSha256:'9eb820a21ccd85c510613a6194ed26caed429828e884fed6f444b338ad86ecc4',newSha256:'471b8da0a3018b0a61c8ea66e0e6d5029124804419699c6babc7cdd45a124011'});
export function safeRelative(p){check(typeof p==='string'&&p.length>0&&!/[\\:\x00-\x1f]/.test(p)&&!p.startsWith('/')&&p.split('/').every(x=>x&&x!=='.'&&x!=='..'&&!/[. ]$/.test(x)),'SUCCESSOR_PATH_STOP');return p;}
export async function safeHash(root,p){safeRelative(p);let at=resolve(root);check(!(await lstat(at)).isSymbolicLink()&&(await realpath(at)).toLowerCase()===at.toLowerCase(),'SUCCESSOR_SYMLINK_STOP');for(const [i,part] of p.split('/').entries()){at=join(at,part);const st=await lstat(at);check(!st.isSymbolicLink(),'SUCCESSOR_SYMLINK_STOP');check(i===p.split('/').length-1?st.isFile():st.isDirectory(),'SUCCESSOR_FILE_TYPE_STOP');}return fileHash(at);}
export async function readPinnedJson(root,p,expected){const actual=await safeHash(root,p);check(expected===undefined||actual===expected,'CONTROL_HASH_STOP');const bytes=await readFile(resolve(root,p));check(bytes.length<=8*1024*1024&&sha(bytes)===actual,'CONTROL_CHANGED_OR_OVERSIZE_STOP');return {value:JSON.parse(bytes.toString('utf8')),sha256:actual};}
export function verifyIgnoreBytes(bytes){check(sha(bytes)===IGNORE_TRANSITION.newSha256,'IGNORE_NEW_HASH_STOP');const t=bytes.toString('utf8').replace(/\r?\n# Private source correspondence and account screenshots; retain locally only\.\r?\n\/source_docs\/\r?\n?$/,'');check(sha(t)===IGNORE_TRANSITION.oldSha256,'IGNORE_OLD_HASH_STOP');}
export function expectedHistorical(path,old){if(path!=='.gitignore')return old;check(old===IGNORE_TRANSITION.oldSha256,'IGNORE_OLD_HASH_STOP');return IGNORE_TRANSITION.newSha256;}
export function validateProposal(p){
 exactKeys(p,['version','originalCertificateSha256','originalBaselineSha256','preworkSha256','qaProofSha256','transition','additions'],'PROPOSAL_SHAPE_STOP');
 check(p.version==='STAGE_A_MEMBERSHIP_PROPOSAL_V2'&&p.originalCertificateSha256===ORIGINAL_CERT_SHA&&p.originalBaselineSha256===ORIGINAL_BASELINE_SHA,'PROPOSAL_ANCHOR_STOP');
 check(digest(p.preworkSha256)&&digest(p.qaProofSha256)&&hash(p.transition)===hash(IGNORE_TRANSITION),'PROPOSAL_TRANSITION_STOP');
 check(Array.isArray(p.additions)&&hash(p.additions.map(x=>x.path))===hash(ADDITIONS),'PROPOSAL_MEMBERSHIP_STOP');
 for(const r of p.additions){exactKeys(r,['path','sha256','kind'],'PROPOSAL_ENTRY_STOP');safeRelative(r.path);check(digest(r.sha256)&&r.kind===(FILES.includes(r.path)?'SUCCESSOR_CODE':'DOCUMENTATION'),'PROPOSAL_ENTRY_STOP');}
 return p;
}
export function assertVisibleMembership(visible,historical,originalNew){
 const allowed=new Set([...Object.keys(historical),...originalNew,...ADDITIONS]);
 check(visible.every(p=>allowed.has(p)),'UNEXPECTED_FILE_STOP');check(ADDITIONS.every(p=>visible.includes(p)),'MISSING_SUCCESSOR_MEMBERSHIP_STOP');
 check(!visible.some(p=>p==='source_docs'||p.startsWith('source_docs/')),'PRIVATE_INPUT_TRACKING_STOP');
}
export async function verifyPinned(entries,readHash){for(const r of entries){safeRelative(r.path);check(digest(r.sha256)&&await readHash(r.path)===r.sha256,'SUCCESSOR_HASH_STOP');}}
export function validateProof(q,expectedFiles){
 check(q?.version==='STAGE_A_OFFLINE_PROOF_V2'&&q.status==='PASS'&&q.tests>0&&q.passed===q.tests&&q.failed===0&&q.skipped===0&&q.cancelled===0,'SUCCESSOR_OFFLINE_CERTIFICATION_STOP');
 check(Array.isArray(q.groups)&&hash(q.groups.flatMap(g=>g.files).sort())===hash([...expectedFiles].sort()),'SUCCESSOR_SUITE_MEMBERSHIP_STOP');
 check(new Set(q.groups.map(g=>g.name)).size===q.groups.length,'SUCCESSOR_GROUP_MEMBERSHIP_STOP');
 for(const g of q.groups)check(/^[a-z][a-z-]{0,50}$/.test(g.name)&&g.exitCode===0&&g.tests>0&&g.passed===g.tests&&g.failed===0&&g.skipped===0&&g.cancelled===0&&digest(g.tapSha256),'SUCCESSOR_SUITE_FAILURE_STOP');
 for(const k of ['tests','passed','failed','skipped','cancelled'])check(Number.isSafeInteger(q[k])&&q[k]===q.groups.reduce((n,g)=>n+g[k],0),'SUCCESSOR_COUNT_STOP');
 check(q.preservation.unexpectedChanges===0&&q.networkAttempts===0&&q.providerCalls===0,'SUCCESSOR_QA_PRESERVATION_STOP');
}
export function membershipClaims(proposalSha256){return {version:'STAGE_A_MEMBERSHIP_REVIEW_V2',proposalSha256,originalCertificateSha256:ORIGINAL_CERT_SHA,membershipOnly:true,executionAuthorized:false};}
