// Proposal/draft preparation only. No approve, activate, reset or execute action.
import '../../src/analysis/offline.js';
import {readFile,open,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,PROPOSAL,PROOF,PREWORK,REPO,ADDITIONS,FILES,INPUTS,REGISTRY} from './paths.js';
import {ORIGINAL_CERT_SHA,ORIGINAL_BASELINE_SHA,IGNORE_TRANSITION,validateProposal,safeHash} from './policy.js';
import {preservation,candidateIntegrity} from './guard.js';
import {hash,check} from '../rentcast-financial-controlled-client-v1/contract.js';
import {checkPreflight} from '../rentcast-live-stage-a-v1/preflight.js';
import {verifyShortlist} from '../rentcast-financial-controlled-client-v1/guard.js';
const old='data/runtime/rentcast-financial-controlled-client-v1/live-stage-a-v1/operator-preflight-completion-2026-10-12';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function save(path,v){const f=await open(path,'wx',0o600);try{await f.writeFile(Buffer.isBuffer(v)?v:JSON.stringify(v,null,2)+'\n');await f.sync();}finally{await f.close();}}
export async function privacy(){const s=await verifyShortlist(),values=s.candidates.flatMap(c=>[c.county.atn,c.county.apn9,c.candidateId,c.assessorId,c.address.street,c.address.rawAssessorSitus]);for(const p of ADDITIONS){const t=await readFile(p,'utf8');check(values.filter(Boolean).every(v=>!t.includes(v)),'PUBLIC_SUBJECT_STOP');check(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|sb_secret_[A-Za-z0-9_-]{20}|AIza[0-9A-Za-z_-]{25}|postgres(?:ql)?:\/\/[^\s]+@/i.test(t),'PUBLIC_CONTACT_OR_SECRET_STOP');}return {status:'PASS',files:ADDITIONS.length};}
export async function prepare(){
 const preserved=await preservation(),q=await json(PROOF);await privacy();
 const additions=[];for(const path of ADDITIONS)additions.push({path,sha256:await safeHash(REPO,path),kind:FILES.includes(path)?'SUCCESSOR_CODE':'DOCUMENTATION'});
 const proposal=validateProposal({version:'STAGE_A_MEMBERSHIP_PROPOSAL_V2',originalCertificateSha256:ORIGINAL_CERT_SHA,originalBaselineSha256:ORIGINAL_BASELINE_SHA,preworkSha256:await safeHash(REPO,PREWORK),qaProofSha256:await safeHash(REPO,PROOF),transition:{...IGNORE_TRANSITION},additions});
 await save(PROPOSAL,proposal);await candidateIntegrity();
 const account=await json(`${old}/account.review-v3.draft.json`),authorization=await json(`${old}/authorization.review-v3.draft.json`),inspection=await json(`${ROOT}/original-inspect.private.json`);
 const copied=new Set();for(const e of Object.values(account.evidence)){if(!copied.has(e.file)){await save(`${ROOT}/${e.file}`,await readFile(`${old}/${e.file}`));copied.add(e.file);}check(await safeHash(REPO,`${ROOT}/${e.file}`)===e.sha256,'DRAFT_SOURCE_CHANGED_STOP');}
 authorization.certificateSha256=null; // No certified successor, no invented certificate identity.
 authorization.explicitExecutionAuthorized=false;authorization.approvedAt=null;authorization.expiresAt=null;authorization.reviewer=null;
 authorization.candidateFingerprint=hash(inspection.context.candidate);authorization.contextFingerprint=inspection.context.contextFingerprint;authorization.requestFingerprint=hash(inspection.context.request);authorization.accountFingerprint=hash(account);
 await save(`${ROOT}/account.draft.json`,account);await save(`${ROOT}/authorization.draft.json`,authorization);
 let rejection;try{await checkPreflight({context:inspection.context,account,authorization,base:resolve(ROOT),now:Date.now(),certificateSha256:ORIGINAL_CERT_SHA});throw Error('UNREVIEWED_DRAFT_ACCEPTED');}catch(e){check(e.code==='CURRENT_ACCOUNT_REVIEW_STOP','UNEXPECTED_DRAFT_GATE_RESULT');rejection=e.code;}
 check((await readdir(INPUTS)).length===0&&(await readdir(REGISTRY)).length===0,'ACTIVE_INPUT_OR_RESERVATION_STOP');
 const blockers=['FINAL_MEMBERSHIP_REVIEW_REQUIRED','CURRENT_ACCOUNT_REVIEW_STOP','PROPERTY_RECORDS_ENTITLEMENT_STOP','RIGHTS_TERMS_HUMAN_REVIEW_REQUIRED','COST_BOUND_UNVERIFIED','PILOT_EXCLUSIVITY_REVIEW_REQUIRED','DATED_REQUEST_BOUND_AUTHORIZATION_PENDING'];
 if(q.status!=='PASS')blockers.unshift('PROTECTED_BASELINE_REGRESSION_STOP');
 const result={version:'STAGE_A_FINAL_OFFLINE_PREFLIGHT_V2',classification:'STAGE_A_PREFLIGHT_BLOCKED',preparedAt:new Date().toISOString(),preserved,proposalSha256:await safeHash(REPO,PROPOSAL),proposalApproved:false,qaStatus:q.status,tests:q.tests,passed:q.passed,failed:q.failed,skipped:q.skipped,sourceSeal:'PASS',blockers,draftRejection:rejection,
 spendingAuthorization:{source:'Explicit current user message',sourceDate:'2026-10-12',preciseApprovalTime:null,maximumIncrementalCents:100,stage:'A',technicalOrdinal:1,maxTransmissions:1,retries:0,operatorEvidenceAttestation:false,requestBoundExpiringPermitIssued:false},
 proposedFeeReserveCents:20,verifiedEndpointFeeMaxCents:account.fees.endpointFeeMaxCents,verifiedTaxOtherMaxCents:account.fees.taxAndOtherMaxCents,actualReservation:'NONE',providerApiRequests:0,credentialLoads:0,databaseConnections:0,databaseWrites:0,properties:0,realFinancialAnalyses:0,stageBCRequests:0,mlsSelections:0,deployments:0};
 await save(`${ROOT}/final-preflight.private.json`,result);
 console.log(JSON.stringify({classification:result.classification,tests:q.tests,passed:q.passed,failed:q.failed,blockers,proposalSha256:result.proposalSha256,privateSourcesCopied:copied.size,providerApiRequests:0,actualReservation:'NONE'}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{check(process.argv.length===2,'PREPARE_ARGUMENT_STOP');await prepare();}catch(e){console.error(JSON.stringify({status:'FINAL_PREFLIGHT_PREPARATION_STOP',code:e.code??'LOCAL_VALIDATION_STOP'}));process.exitCode=1;}}
