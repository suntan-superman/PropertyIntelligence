import {readFile,readdir,lstat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {execFileSync} from 'node:child_process';
import {locked,append} from '../rentcast-financial-controlled-client-v1/ledger.js';
import {hash,sha,check,Stop,CLOSED} from '../rentcast-financial-controlled-client-v1/contract.js';
import {exposureAudit} from '../rentcast-controlled-pilot/local.js';
import {worker} from './bridge.js';
import {checkPreflight,readOperatorInputs,validateContext} from './preflight.js';
import {liveSend,mockSender,validateCredential} from './transport.js';
import {abs,REPO,ROOT,CODE,REGISTRY,INPUTS,CERTIFICATE,REGRESSION_FILES} from './paths.js';

export function parseCredentialLines(lines){
  const found=[];for(const line of lines){const m=line.match(/^\s*(?:export\s+)?RENTCAST_API_KEY\s*=\s*(.*?)\s*$/);if(!m)continue;let value=m[1];if(/^(['"]).*\1$/.test(value))value=value.slice(1,-1);else value=value.replace(/\s+#.*$/,'');found.push(value);}
  check(found.length===1,'ONE_SERVER_CREDENTIAL_REQUIRED');return validateCredential(found[0]);
}
async function credential(){
  execFileSync('git',['check-ignore','--quiet','.env'],{cwd:REPO,stdio:'pipe'});
  check(!(await lstat(abs('.env'))).isSymbolicLink(),'CREDENTIAL_FILE_STOP');
  const selected=[];const input=createInterface({input:createReadStream(abs('.env')),crlfDelay:Infinity});
  // Never populate process.env or select unrelated DB/provider credentials.
  for await(const line of input)if(/^\s*(?:export\s+)?RENTCAST_API_KEY\s*=/.test(line))selected.push(line);
  const key=parseCredentialLines(selected);await exposureAudit(key);return key;
}
export async function certificate(){
  let bytes,value;try{bytes=await readFile(abs(CERTIFICATE));value=JSON.parse(bytes);}catch{throw new Stop('OFFLINE_CERTIFICATION_MISSING');}
  check(value.status==='PASS'&&value.failed===0&&value.skipped===0&&value.cancelled===0&&value.tests>0&&value.tests===value.passed&&value.preservationUnexpectedChanges===0,'OFFLINE_CERTIFICATION_STOP');
  check(typeof value.qaDirectory==='string'&&new RegExp(`^${ROOT}/qa-[A-Za-z0-9]{6}$`).test(value.qaDirectory),'CERTIFICATION_LOCATION_STOP');
  const proofBytes=await readFile(abs(`${value.qaDirectory}/result.json`)),proof=JSON.parse(proofBytes);
  check(sha(proofBytes)===value.qaResultSha256&&proof.status==='PASS'&&proof.tests===value.tests&&proof.passed===value.passed,'CERTIFICATION_RESULT_STOP');
  const expected=[`${CODE}/stage-a.test.js`,...REGRESSION_FILES,'scripts/rentcast-controlled-pilot/pilot.test.js'].sort();
  check(hash(proof.groups.flatMap(g=>g.files).sort())===hash(expected),'CERTIFICATION_SUITE_MEMBERSHIP_STOP');
  for(const group of proof.groups){
    check(['stage-a','unchanged-regressions','unchanged-pilot'].includes(group.name)&&group.exitCode===0&&group.tests===group.passed&&group.skipped===0&&group.cancelled===0,'CERTIFICATION_GROUP_STOP');
    const tap=await readFile(abs(`${value.qaDirectory}/${group.name}.tap`));check(sha(tap)===group.tapSha256,'CERTIFICATION_TAP_STOP');
  }
  const actual=await worker({action:'certified-state'});check(hash(actual.implementationHashes)===hash(value.implementationHashes)&&actual.preservation.unexpectedChanges===0,'CERTIFIED_IMPLEMENTATION_CHANGED');
  return sha(bytes);
}
function safe(error){return error instanceof Stop&&/^[A-Z_]+$/.test(error.code)?error.code:'STAGE_A_SAFE_STOP';}
async function execute(services){
  // Lock first; no concurrent process can independently spend this pilot's slot.
  return locked(services.registry,async dir=>{
    check((await readdir(dir)).every(n=>n==='process.lock'),'STAGE_A_ATTEMPT_ALREADY_RESERVED');
    const context=await services.prepare();validateContext(context);
    const certificateSha256=await services.certificate(),inputs=await services.inputs();
    let preflight=await checkPreflight({context,...inputs,base:services.inputDirectory,now:Date.parse(services.clock()),certificateSha256});
    const key=validateCredential(await services.credential());
    const fresh=await services.prepare(),freshInputs=await services.inputs();
    check(fresh.contextFingerprint===context.contextFingerprint&&hash(freshInputs)===hash(inputs),'PREFLIGHT_CHANGED_BEFORE_RESERVATION');
    const finalCertificate=await services.certificate();check(finalCertificate===certificateSha256,'CERTIFICATE_CHANGED_BEFORE_RESERVATION');
    preflight=await checkPreflight({context:fresh,...freshInputs,base:services.inputDirectory,now:Date.parse(services.clock()),certificateSha256:finalCertificate});
    const binding={version:'LIVE_STAGE_A_LEDGER_V1',stage:'A',technicalOrdinal:1,selectionFingerprint:context.candidate.selectionFingerprint,candidateFingerprint:hash(context.candidate),contextFingerprint:context.contextFingerprint,requestFingerprint:hash(context.request),accountFingerprint:preflight.accountFingerprint,authorizationFingerprint:preflight.authorizationFingerprint,certificateSha256,registry:REGISTRY};
    const rows=[];
    const reservation=await append(dir,rows,{kind:'RESERVATION',stage:'A',timestamp:services.clock(),endpoint:context.request.endpoint,method:'GET',host:context.request.host,parameterFingerprint:hash(context.request.params),sourceContext:context,maximumBillableExposureCents:preflight.maximumBillableExposureCents,requestFeeReserveCents:20,allInCapCents:100,maxAttempts:1,outcome:'PENDING_OR_UNCERTAIN',countsAgainstCeiling:true,executionMode:services.mode},binding);
    let receipt,responseMetadata={httpStatus:null,responseSha256:null,responseBytes:null};
    try{
      const response=await services.send(context.request,key);responseMetadata={httpStatus:response.httpStatus,responseSha256:response.responseSha256,responseBytes:response.responseBytes};
      const evaluated=await services.evaluate(context,response.body,response.headers);
      receipt={...evaluated,...responseMetadata,evidenceSha256:evaluated.evidence?hash(evaluated.evidence):null};
    }catch(e){receipt={classification:'STAGE_A_PROVIDER_FAILURE',historicalReconciliation:'NOT EXECUTED',code:safe(e),...responseMetadata,...e.responseMetadata,evidence:null,evidenceSha256:null};}
    Object.assign(receipt,{retrievedAt:services.clock(),stage:'A',attemptConsumed:true,attemptedTransmissions:1,retries:0,rawResponseRetained:false,stop:'STOP_FOR_STAN_CHATGPT_REVIEW_NO_STAGE_B_C',actualBill:'UNKNOWN',requestFeeReserveCents:20,maximumBillableExposureCents:preflight.maximumBillableExposureCents,allInCapCents:100,preflight,sourceContextFingerprint:context.contextFingerprint,termsVersion:preflight.termsVersion,executionMode:services.mode,authorizations:{...CLOSED}});
    await append(dir,rows,{kind:'OUTCOME',stage:'A',timestamp:services.clock(),reservationHash:reservation.recordHash,receipt,receiptHash:hash(receipt)},binding);
    return receipt;
  });
}
export async function inspectLive(){
  const context=await worker({action:'source'}),blockers=[];let cert=null,inputs=null;
  try{cert=await certificate();}catch(e){blockers.push(safe(e));}
  try{inputs=await readOperatorInputs(abs(INPUTS));}catch(e){blockers.push(safe(e));}
  if(cert&&inputs)try{await checkPreflight({context,...inputs,base:abs(INPUTS),now:Date.now(),certificateSha256:cert});}catch(e){blockers.push(safe(e));}
  if((await readdir(abs(REGISTRY))).length)blockers.push('REGISTRY_NONEMPTY_REVIEW_REQUIRED');
  return {classification:'STAGE_A_PREFLIGHT_BLOCKED',context,blockers,sourceSeal:'PASS',credential:'NOT_LOADED_INSPECTION_ONLY',transmittedRequests:0,inspectionOnly:true};
}
export const executeLive=()=>execute({registry:abs(REGISTRY),inputDirectory:abs(INPUTS),mode:'LIVE',clock:()=>new Date().toISOString(),prepare:()=>worker({action:'source'}),certificate,inputs:()=>readOperatorInputs(abs(INPUTS)),credential,send:liveSend,evaluate:(context,body,headers)=>worker({action:'evaluate',context,body,headers})});

// Offline dependency-injected harness. Its transport is constructed here from
// data only. No arbitrary network callback can be supplied by tests or flags.
export function mockExecution({registry,inputDirectory,context,account,authorization,certificateSha256,key,script,evaluate,clock,prepare}){
  check(context.candidate?.candidateId==='synthetic-rcfc-candidate','SYNTHETIC_HARNESS_ONLY');
  const sender=mockSender(script);let keyReads=0;
  return {metrics:sender.metrics,get keyReads(){return keyReads;},run:()=>execute({registry,inputDirectory,mode:'SYNTHETIC_TEST_NOT_LIVE',clock,prepare:prepare??(async()=>structuredClone(context)),certificate:async()=>certificateSha256,inputs:async()=>({account,authorization}),credential:async()=>{keyReads++;return key;},send:sender.send,evaluate})};
}
