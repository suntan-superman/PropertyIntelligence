// Explicit one-shot local authorization. No production env loader or database client.
import {mkdir,readdir,lstat,realpath,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT,ENDPOINT,controlledLookup,check,saveNew,seal,sha,reconcile} from './core.js';
import {localCredential,exposureAudit,readJson,verifyProtection} from './local.js';
import {fileHash} from '../sprint6_2/io.js';

async function main(){
  check(process.argv.slice(2).join(' ')==='--execute-authorized','EXPLICIT_EXECUTION_REQUIRED');
  check(process.version==='v22.12.0','VERIFIED_RUNTIME_REQUIRED');
  execFileSync('git',['check-ignore','--quiet',`${ROOT}/requests/attempt-1.json`],{stdio:'pipe'});
  check(!execFileSync('git',['ls-files','--',ROOT],{encoding:'utf8'}).trim(),'PRIVATE_EVIDENCE_TRACKED');
  check(!(await lstat(ROOT)).isSymbolicLink()&&(await realpath(ROOT)).toLowerCase()===resolve(ROOT).toLowerCase(),'PRIVATE_PATH_STOP');
  const before=await readJson(`${ROOT}/protected-before.json`),pre=await readJson(`${ROOT}/preflight.json`),mapping=await readJson(`${ROOT}/candidate-mapping.json`),qa=await readJson(`${ROOT}/offline-qa.json`),rights=await readJson(`${ROOT}/vendor-authorization-reference.json`),confirmation=await readJson(`${ROOT}/vendor-confirmation-2026-10-09.json`);
  await verifyProtection(before);check(pre.status==='PREPARED_NOT_TRANSMITTED'&&qa.failed===0&&qa.skipped===0&&qa.passed===qa.tests&&qa.tests>0,'PREFLIGHT_OR_QA_STOP');
  for(const [path,h] of Object.entries(qa.sourceHashes))check(await fileHash(path)===h,'TESTED_SOURCE_CHANGED');
  const {packetSha256,...payload}=mapping;check(sha(JSON.stringify(payload))===packetSha256&&mapping.candidates.length===3,'MAPPING_INTEGRITY_STOP');
  for(const [k,path] of Object.entries(mapping.sourcePaths))check(await fileHash(path)===mapping.inputHashes[k],'SOURCE_CHANGED');
  check(await fileHash(rights.source)===rights.sourceSha256&&rights.confirmationBasis==='USER_ATTESTED_WRITTEN_VENDOR_CONFIRMATION','RIGHTS_REFERENCE_CHANGED');
  check(confirmation.vendorEmailDate==='2026-10-09'&&confirmation.source==='USER_PASTED_VENDOR_EMAIL_IN_THIS_CONVERSATION'&&confirmation.zipOptional===true&&confirmation.billing==='HTTP_200_ONLY','VENDOR_CONFIRMATION_REQUIRED');
  check((await readJson(mapping.sourcePaths.config)).status==='PRE_EXECUTION','ROUND1_CHANGED');
  const config=await localCredential(),security=await exposureAudit(config.apiKey);
  // A prior run, including an interrupted or zero-attempt one, requires explicit
  // investigation. Never reset its reservations or start another live directory.
  await saveNew(`${ROOT}/execution-lock.json`,{scope:'RENTCAST_CONTROLLED_PILOT_V1',startedAt:new Date().toISOString(),maximumAttempts:3,automaticResume:false,mappingSha256:packetSha256});
  const directory=`${ROOT}/requests`;await mkdir(directory,{recursive:false});
  const nativeFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error('UNAUTHORIZED_NETWORK_REQUEST');};
  const client=controlledLookup(config,{directory,candidates:mapping.candidates,fetchImpl:nativeFetch});
  const outcomes=[];let stopReason=null;
  for(const candidate of mapping.candidates){
    try{const result=await client.lookup(candidate);outcomes.push({pilotCode:candidate.pilotCode,status:result.status,error:null});}
    catch(e){const safe=/^[A-Z0-9_]+$/.test(e.code??e.message)?(e.code??e.message):'LOCAL_ACCOUNTING_OR_CONTRACT_FAILURE';outcomes.push({pilotCode:candidate.pilotCode,error:safe});
      // No retries. Ambiguous property data is handled in reconciliation below;
      // transport, auth, quota, schema or accounting failure stops this execution.
      stopReason=safe;break;
    }
    console.log(JSON.stringify({phase:'request-completed',pilotCode:candidate.pilotCode,attempt:client.accounting().attemptsTransmitted,httpStatus:client.observations.at(-1)?.httpStatus}));
  }
  const countIds=new Map();for(const o of client.observations)if(o.httpStatus===200&&Array.isArray(o.body))for(const r of o.body)if(r?.id)countIds.set(r.id,(countIds.get(r.id)??0)+1);
  const duplicateIds=new Set([...countIds].filter(([,n])=>n>1).map(([id])=>id)),results=[];
  await mkdir(`${ROOT}/evidence`);await mkdir(`${ROOT}/review-packets`);
  for(const outcome of outcomes){
    const candidate=mapping.candidates.find(c=>c.pilotCode===outcome.pilotCode),o=client.observations.find(x=>x.pilotCode===outcome.pilotCode);
    const successful=o?.httpStatus===200&&Array.isArray(o.body)&&o.body.every(r=>r&&typeof r==='object');
    const result=successful?reconcile(candidate,o.body,{duplicateIds}):{pilotCode:candidate.pilotCode,matchClassification:'AMBIGUOUS_IDENTITY',reviewTier:'INSUFFICIENT_EVIDENCE',discrepancies:[outcome.error??'UNUSABLE_HTTP_RESPONSE'],analystDecision:null,analystApproved:false,persistenceAuthorized:false,round1Selected:false};
    const record=successful&&o.body.length===1?o.body[0]:null;
    const evidence=seal({schemaVersion:1,pilotCode:candidate.pilotCode,county:candidate.county,countyIdentityFingerprint:candidate.countyIdentityFingerprint,sourceRecordReference:candidate.sourceRecordReference,
      provider:'RENTCAST',product:'PROPERTY_RECORDS',endpoint:ENDPOINT,attempt:o?.attempt??outcomes.indexOf(outcome)+1,httpStatus:o?.httpStatus??null,retrievedAt:o?.retrievedAt??null,
      providerAsOf:record?.asOf??record?.lastUpdatedDate??record?.updatedAt??null,providerAsOfStatus:(record?.asOf??record?.lastUpdatedDate??record?.updatedAt)?'PROVIDER_RETURNED_NOT_INDEPENDENTLY_VERIFIED':'NOT_RETURNED',
      providerRecord:record,providerCandidates:record?undefined:(successful?o.body:[]),responseFingerprint:o?.responseFingerprint??null,
      sourceFingerprint:record?sha(JSON.stringify(record)):null,rawCountyApn:candidate.county.apn9,rawProviderApn:record?.assessorID??null,normalizedProviderApn:result.normalizedAssessorId??null,
      rightsClassification:successful&&o.body.length>0?'RENTCAST_DURABLE_LICENSED_EVIDENCE':null,rightsReference:'vendor-confirmation-2026-10-09.json',
      interpretation:'Source-specific permission, not analyst approval, postal validation, current-distress verification or a legal opinion.',reconciliation:result});
    await saveNew(`${ROOT}/evidence/${candidate.pilotCode}.json`,evidence);
    if(successful&&o.body.length){const packet=seal({schemaVersion:1,pilotCode:candidate.pilotCode,recordKind:'REAL_COUNTY_CANDIDATE_PRIVATE_REVIEW',candidateId:candidate.candidateId,
      county:candidate.county,assessor:candidate.assessor,sourceRecordReference:candidate.sourceRecordReference,addressReview:candidate.countyAddressReview,
      providerSuggestedAddress:record?{street:record.addressLine1,city:record.city,state:record.state,postalCode:record.zipCode,analystConfirmed:false}:null,
      identity:{countyPass:true,assessorPass:true,countyIdentityFingerprint:candidate.countyIdentityFingerprint,existingIdentity:candidate.existingIdentity,apnComparison:result.matchClassification},
      evidence:{sourceHashes:mapping.inputHashes,countyDates:candidate.evidenceDates,providerRetrievedAt:o.retrievedAt,providerAsOf:evidence.providerAsOf,providerSourceFingerprint:evidence.sourceFingerprint,evidenceRecordSha256:evidence.packetSha256,rightsClassification:evidence.rightsClassification,rightsReference:evidence.rightsReference},
      reconciliation:result,analystReview:{decision:null,readiness:result.reviewTier,approvalRequired:true},persistence:{enabled:false,separateAuthorizationRequired:true,requiresFreshReadOnlyIdentityCheck:true},round1Selected:false});
      await saveNew(`${ROOT}/review-packets/${candidate.pilotCode}-review.json`,packet);
    }
    results.push({pilotCode:candidate.pilotCode,httpStatus:o?.httpStatus??null,recordCount:successful?o.body.length:0,completeAddressReturned:result.addressComparison?.canonicalFormatValid??false,...result});
  }
  const accounting=client.accounting();check(accounting.attemptsTransmitted<=3&&accounting.providerCalls===accounting.attemptsTransmitted&&accounting.automaticRetries===0&&accounting.cacheHits===0,'ACCOUNTING_STOP');
  const protection=await verifyProtection(before),routine=results.filter(x=>x.reviewTier==='ROUTINE_REVIEW_READY').length;
  const summary={status:stopReason?'EXECUTION BLOCKED':routine===3?'PILOT ACQUISITION CERTIFIED':'PARTIAL COVERAGE — HUMAN REVIEW REQUIRED',completedAt:new Date().toISOString(),stopReason,accounting,
    estimatedBilling:'Vendor email: HTTP 200 billed; errors not billed. Unknown outcomes conservatively consume budget. Overage estimates assume no included allowance; actual account billing/remaining allowance NOT VERIFIED.',
    results,protection,security,analystApprovals:0,durablePropertiesCreated:0,databaseConnections:0,productionWrites:0,mlsAccess:0,round1Selections:0,otherProviderCalls:0,
    documentationRequests:'Public provider documentation inspected separately; not authenticated data calls',vendorEmailDateKnown:!!confirmation.vendorEmailDate,reviewInterface:'PACKETS_ONLY_EXISTING_INTERFACE_IS_IP_PILOT_ALLOWLISTED'};
  await saveNew(`${ROOT}/request-ledger.json`,{...accounting,outcomes,requestReservations:'requests/attempt-N.json; immutable fsynced reservations consumed even if outcome uncertain',billingConfirmed:false});
  await saveNew(`${ROOT}/reconciliation-results.json`,summary);
  // Never print private identifiers from reconciliation objects.
  console.log(JSON.stringify({status:summary.status,stopReason,accounting,protection,results:results.map(r=>({pilotCode:r.pilotCode,httpStatus:r.httpStatus,recordCount:r.recordCount,completeAddressReturned:r.completeAddressReturned,matchClassification:r.matchClassification,reviewTier:r.reviewTier,discrepancies:r.discrepancies}))}));
}
main().catch(e=>{console.error(JSON.stringify({status:'STOP',code:/^[A-Z0-9_]+$/.test(e.message)?e.message:'SANITIZED_EXECUTION_FAILURE',automaticRetry:false}));process.exitCode=1;});
