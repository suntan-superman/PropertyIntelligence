import '../../src/analysis/offline.js';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileHash} from '../sprint6_2/io.js';
import {check,hash,sha} from '../rentcast-financial-controlled-client-v1/contract.js';
import {verifyReview,readPrivate} from '../rentcast-live-stage-a-v1/preflight.js';
import {ROOT as OLD,CERTIFICATE as OLD_CERT,NEW_FILES} from '../rentcast-live-stage-a-v1/paths.js';
import {REPO,ROOT,FILES,ADDITIONS,PROPOSAL,PROOF,PREWORK,INPUTS,REGISTRY,REGRESSION_FILES} from './paths.js';
import {ORIGINAL_CERT_SHA,ORIGINAL_BASELINE_SHA,IGNORE_TRANSITION,safeHash,readPinnedJson,expectedHistorical,verifyIgnoreBytes,validateProposal,assertVisibleMembership,verifyPinned,validateProof,membershipClaims} from './policy.js';
export const testGroups=()=>[
 {name:'successor',files:['scripts/rentcast-stage-a-protection-v2/successor.test.js']},
 {name:'successor-orchestration',files:['scripts/rentcast-stage-a-protection-v2/orchestration.test.js']},
 {name:'original-stage-a',files:['scripts/rentcast-live-stage-a-v1/stage-a.test.js']},
 {name:'unchanged-regressions',files:REGRESSION_FILES},
 {name:'unchanged-pilot',files:['scripts/rentcast-controlled-pilot/pilot.test.js'],sandbox:true},
 {name:'sprint-protection',files:['scripts/sprint6_2/poc.test.js','scripts/sprint6_3/schema-review.test.js']}
];
const json=async p=>(await readPinnedJson(REPO,p)).value;
export const gitFiles=()=>execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:REPO,encoding:'utf8'}).split('\0').filter(Boolean).map(p=>p.replaceAll('\\','/'));
export async function preservation(){
 const cache=new Map(),readHash=async p=>{if(!cache.has(p))cache.set(p,await safeHash(REPO,p));return cache.get(p);};
 check(await readHash(OLD_CERT)===ORIGINAL_CERT_SHA&&await readHash(`${OLD}/preservation-before.json`)===ORIGINAL_BASELINE_SHA,'ORIGINAL_ANCHOR_STOP');
 const c=await json(OLD_CERT),b=await json(`${OLD}/preservation-before.json`),before=await json(PREWORK);
 check(hash(before.hashes)===before.aggregateSha256&&Object.keys(before.hashes).length===before.count,'PREWORK_MANIFEST_STOP');
 await verifyIgnoreBytes(await readFile('.gitignore'));
 for(const [p,h] of Object.entries(b.hashes))check(await readHash(p)===expectedHistorical(p,h),'ORIGINAL_PROTECTED_CHANGE_STOP');
 for(const [p,h] of Object.entries(c.implementationHashes))check(await readHash(p)===h,'ORIGINAL_IMPLEMENTATION_STOP');
 for(const [p,h] of Object.entries(before.hashes))check(await readHash(p)===h,'PREWORK_CHANGE_STOP');
 const q=await json(`${c.qaDirectory}/result.json`);check(await readHash(`${c.qaDirectory}/result.json`)===c.qaResultSha256&&q.tests===342&&q.passed===342,'ORIGINAL_QA_STOP');
 for(const g of q.groups)check(await readHash(`${c.qaDirectory}/${g.name}.tap`)===g.tapSha256,'ORIGINAL_TAP_STOP');
 assertVisibleMembership(gitFiles(),b.hashes,NEW_FILES);
 check(execFileSync('git',['ls-files','--','source_docs'],{encoding:'utf8'})==='','PRIVATE_INPUT_TRACKING_STOP');
 execFileSync('git',['check-ignore','--quiet','source_docs/RentCast_Email.md']);
 return {status:'PASS_WITH_EXACT_PRIOR_AUTHORIZED_IGNORE_TRANSITION',count:before.count,historicalCount:b.count,originalImplementationFiles:Object.keys(c.implementationHashes).length,authorizedPriorTransition:IGNORE_TRANSITION,unexpectedChanges:0};
}
export async function implementationHashes(){const h={};for(const p of FILES)h[p]=await safeHash(REPO,p);return h;}
export async function candidateIntegrity(){
 const proposal=validateProposal(await json(PROPOSAL));
 check(await safeHash(REPO,PREWORK)===proposal.preworkSha256&&await safeHash(REPO,PROOF)===proposal.qaProofSha256,'PROPOSAL_EVIDENCE_HASH_STOP');
 const result=await preservation();await verifyPinned(proposal.additions,p=>safeHash(REPO,p));
 return {proposalSha256:await safeHash(REPO,PROPOSAL),preservation:result,proposal};
}
export async function verifyApproval(base,review,proposalSha256,now){return verifyReview(base,review,membershipClaims(proposalSha256),'EXPLICIT_MEMBERSHIP_HASH_REVIEW',now);}
export async function certificate(){
 const state=await candidateIntegrity(),proof=await json(PROOF);validateProof(proof,testGroups().flatMap(g=>g.files));
 check(hash(proof.groups.map(({name,files})=>({name,files})))===hash(testGroups().map(({name,files})=>({name,files}))),'SUCCESSOR_GROUP_MEMBERSHIP_STOP');
 check(hash(proof.implementationHashes)===hash(await implementationHashes()),'SUCCESSOR_STALE_CODE_CERTIFICATE_STOP');
 check(typeof proof.qaDirectory==='string'&&new RegExp(`^${ROOT}/qa-[A-Za-z0-9]{6}$`).test(proof.qaDirectory),'SUCCESSOR_QA_LOCATION_STOP');
 for(const g of proof.groups)check(await safeHash(REPO,`${proof.qaDirectory}/${g.name}.tap`)===g.tapSha256,'SUCCESSOR_STALE_TAP_STOP');
 // A candidate proposal/proof is NOT review approval. No issuer or activate flag exists.
 let review;try{review=JSON.parse((await readPrivate(REPO+'/'+ROOT,'membership-approval.json')).toString('utf8'));}catch{throw Object.assign(new Error('FINAL_MEMBERSHIP_REVIEW_REQUIRED'),{code:'FINAL_MEMBERSHIP_REVIEW_REQUIRED'});}
 const attestation=await verifyApproval(REPO+'/'+ROOT,review,state.proposalSha256,Date.now());
 const bundle={version:'STAGE_A_PROTECTION_CERTIFICATE_V2',originalCertificateSha256:ORIGINAL_CERT_SHA,proposalSha256:state.proposalSha256,qaProofSha256:sha(await readFile(PROOF)),reviewFingerprint:hash(review),attestation};
 return {sha256:hash(bundle),bundle};
}
