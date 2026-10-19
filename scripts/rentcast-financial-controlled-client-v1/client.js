// This module is intentionally incapable of live execution. No fetch fallback,
// key loader, provider configuration, cache, database, or application import.
import '../../src/analysis/offline.js';
import {readFile} from 'node:fs/promises';
import {check,Stop,hash,sha,HOST,MAX_BYTES,TIMEOUT_MS,CLOSED,preflight,validateCandidate,requestFor,authorize} from './contract.js';
import {validateTemplate,discovery,avm,sold,noPagination} from './evidence.js';
import {locked,readLedger,append} from './ledger.js';

const mocks=new WeakSet();
// Data-only scripted responses: no injected arbitrary code, URL or live fallback.
// The marker is not a claim that caller input is an authenticated provider record.
export function mockTransport(scripts){
  const queue=structuredClone(scripts);let calls=0;
  const transport=Object.freeze({get calls(){return calls;},async send(request,{signal,reservation}){
    check(reservation?.kind==='RESERVATION','RESERVATION_REQUIRED');calls++;
    const script=queue.shift();check(script,'MOCK_SCRIPT_EXHAUSTED');
    if(script.fault==='NETWORK')throw new Error('Synthetic network error omitted');
    if(script.fault==='TIMEOUT')await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
    if(script.delayMs)await new Promise(r=>setTimeout(r,script.delayMs));
    const bytes=Buffer.from(script.raw??JSON.stringify(script.body??{}));
    return {status:script.status??200,redirected:script.redirected??false,headers:script.headers??{},async *chunks(){
      const width=4096;for(let i=0;i<bytes.length;i+=width){check(!signal.aborted,'TIMEOUT_UNCERTAIN');yield bytes.subarray(i,i+width);}
    }};
  }});
  mocks.add(transport);return transport;
}
const errorCode=e=>e instanceof Stop?e.code:'NETWORK_OUTCOME_UNCERTAIN';
async function receive(transport,request,reservation){
  const controller=new AbortController();let timer;
  const metadata={httpStatus:null,responseSha256:null,responseBytes:null};
  const timed=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Stop('TIMEOUT_UNCERTAIN'));},TIMEOUT_MS);});
  const execute=async()=>{
    let response;try{response=await transport.send(request,{signal:controller.signal,reservation});}catch(e){if(controller.signal.aborted)throw new Stop('TIMEOUT_UNCERTAIN');throw e;}
    metadata.httpStatus=response.status;
    check(!response.redirected&&!(response.status>=300&&response.status<400),'REDIRECT_STOP');
    const headers=Object.fromEntries(Object.entries(response.headers).map(([k,v])=>[k.toLowerCase(),v]));
    check(!headers.location,'REDIRECT_STOP');
    if(response.status!==200){const error=new Stop(({401:'AUTHENTICATION_STOP',403:'AUTHENTICATION_STOP',402:'PAYMENT_STOP',429:'RATE_LIMIT_STOP'})[response.status]??'HTTP_STATUS_STOP');error.httpStatus=response.status;throw error;}
    if(headers['content-type'])check(/^application\/json(?:;|$)/i.test(headers['content-type']),'CONTENT_TYPE_STOP');
    if(headers['content-length'])check(/^\d+$/.test(headers['content-length'])&&Number(headers['content-length'])<=MAX_BYTES,'RESPONSE_SIZE_STOP');
    let length=0;const chunks=[];
    for await(const chunk of response.chunks()){length+=chunk.length;check(length<=MAX_BYTES,'RESPONSE_SIZE_STOP');chunks.push(chunk);}
    const raw=Buffer.concat(chunks);metadata.responseSha256=sha(raw);metadata.responseBytes=length;
    let body;try{body=JSON.parse(raw.toString('utf8'));}catch{throw new Stop('JSON_SCHEMA_STOP');}
    check(body!==null&&typeof body==='object'&&!body.error,'API_SCHEMA_STOP');
    return {body,headers,status:response.status,responseSha256:sha(raw),bytes:length};
  };
  try{return await Promise.race([execute(),timed]);}
  catch(e){const safe=e instanceof Stop?e:new Stop('NETWORK_OUTCOME_UNCERTAIN');safe.responseMetadata={...metadata};throw safe;}
  finally{clearTimeout(timer);controller.abort();}
}
export function createControlledClient({directory,candidate,template,account,transport,clock=()=>new Date().toISOString()}={}){
  // Even a perfect manifest, environment flag or key cannot enable live traffic.
  check(transport&&mocks.has(transport),'LIVE_TRANSPORT_DISABLED');
  check(candidate?.pilotCode==='SYNTHETIC-RCFC-1'&&candidate.candidateId==='synthetic-rcfc-candidate'&&candidate.selectionFingerprint!== 'ee8cbc9be5e739d8aa4f4b93f83f1f3aaa0a70fb6a8a1d99fc34511d6538c8f4','SYNTHETIC_CERTIFICATION_ONLY');
  const c=structuredClone(candidate),t=structuredClone(template),a=structuredClone(account);
  validateCandidate(c);validateTemplate(c,t);
  const binding={version:'RCFC_OFFLINE_V1',selectionFingerprint:c.selectionFingerprint,technicalOrdinal:1,candidateFingerprint:hash(c),sourceTemplateFingerprint:hash(t),accountFingerprint:hash(a),host:HOST};
  let running=false;
  async function step(stage,{approval,approvedBounds}={}){
    check(!running,'SERIAL_REQUEST_STOP');running=true;
    try{return await locked(directory,async dir=>{
      const now=clock(),time=Date.parse(now);check(Number.isFinite(time),'CLOCK_STOP');
      const budget=preflight(a,time),rows=await readLedger(dir,binding);
      const reservations=rows.filter(r=>r.kind==='RESERVATION'),outcomes=rows.filter(r=>r.kind==='OUTCOME');
      check(reservations.length<3,'ATTEMPT_CEILING_STOP');
      check(reservations.length===outcomes.length,'UNCERTAIN_RESERVATION_STOP');
      check(outcomes.every(r=>r.receipt.status==='PASS'),'PREVIOUS_STAGE_FAILED_STOP');
      check(stage===['A','B','C'][reservations.length],'STAGE_ORDER_OR_REPLAY_STOP');
      const accepted=outcomes.find(r=>r.stage==='A')?.receipt.evidence;
      const request=requestFor(stage,c,accepted,approvedBounds);
      const previousReceiptHash=outcomes.at(-1)?.receiptHash??null;
      const approvalHash=authorize(approval,{stage,candidate:c,request,approvedBounds,previousReceiptHash,accountFingerprint:budget.accountFingerprint,now:time});
      check(reservations.reduce((n,r)=>n+r.maximumBillableExposureCents,0)+budget.allInPerAttemptCents<=budget.allInCapCents,'BUDGET_STOP');
      const reservation=await append(dir,rows,{kind:'RESERVATION',stage,timestamp:now,endpoint:request.endpoint,method:request.method,parameterFingerprint:hash(request.params),requestFingerprint:hash(request),boundsFingerprint:stage==='A'?null:hash(approvedBounds),approvalHash,previousReceiptHash,requestFeeReserveCents:20,maximumBillableExposureCents:budget.allInPerAttemptCents,countsAgainstCeiling:true,outcome:'PENDING_OR_UNCERTAIN'},binding);
      let receipt,responseMeta={httpStatus:null,responseSha256:null,responseBytes:null};
      try{
        const response=await receive(transport,request,reservation);
        responseMeta={httpStatus:response.status,responseSha256:response.responseSha256,responseBytes:response.bytes};
        noPagination(response.headers);
        if(stage==='A'&&Object.hasOwn(response.headers,'x-total-count'))check(response.headers['x-total-count']==='1','DISCOVERY_TOTAL_STOP');
        const evidence=stage==='A'?discovery(c,response.body,t):stage==='B'?avm(accepted,response.body):sold(accepted,response.body,response.headers,request,time);
        receipt={stage,status:'PASS',httpStatus:response.status,responseSha256:response.responseSha256,responseBytes:response.bytes,evidence,evidenceSha256:hash(evidence),sourceEffectiveDates:'ONLY_PROVIDER_FIELDS_IF_PRESENT_NOT_RETRIEVAL_TIME',retrievedAt:clock(),termsVersion:a.rights.termsVersion,rightsEvidenceSha256:a.rights.evidenceSha256,rawResponseRetained:false,sourceAuthenticity:'SYNTHETIC_TEST_NOT_VENDOR_EVIDENCE',stop:'STOP_FOR_OPERATOR_INSPECTION',authorizations:{...CLOSED}};
      }catch(e){receipt={stage,status:'STOP',code:errorCode(e),...responseMeta,...e.responseMetadata,evidenceSha256:null,retrievedAt:clock(),rawResponseRetained:false,outcomePotentiallyBillable:true,stop:'STOP_NO_RETRY_OR_ADVANCEMENT',authorizations:{...CLOSED}};}
      const outcome=await append(dir,rows,{kind:'OUTCOME',stage,timestamp:clock(),reservationHash:reservation.recordHash,receipt,receiptHash:hash(receipt)},binding);
      // Exactly one step. No successor call exists here.
      return {receipt,receiptHash:outcome.receiptHash,attempts:reservations.length+1,retries:0,providerCalls:0};
    });}finally{running=false;}
  }
  return Object.freeze({step,binding:Object.freeze(binding)});
}
// Read-only receipt inspection never enables or executes a stage.
export async function inspectReceipt(path){const event=JSON.parse(await readFile(path,'utf8'));check(event.kind==='OUTCOME'&&event.receiptHash===hash(event.receipt),'RECEIPT_HASH_STOP');return event.receipt;}
