// Synthetic test-authority utilities. Not exposed by the persistence request API.
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes,createHmac} from 'node:crypto';
import {syntheticReviewDirectory,syntheticSubmission} from '../identity-resolution-pilot/review-fixtures.js';
import {createReviewStore} from '../identity-resolution-pilot/review-store.js';
import {sha,FIELDS} from '../identity-resolution-pilot/review-model.js';
import {postgresFixture} from './postgres-fixtures.js';
import {digest} from './fixture.js';
import {createTrustedReviewGate} from './trusted-review.js';
export async function v3Fixture(index,{key=randomBytes(32),flagged=false,variant='a'}={}){
  const directory=await syntheticReviewDirectory(),code='IP-P2',reference=`SYNTHETIC_V3_${index}_${variant}`,plan=postgresFixture(index),clock={now:Date.now()+1000};
  if(variant!=='a'){
    plan.packet.address.street=`${index+800} Synthetic Alternate Lane`;
    plan.packetSha256=digest(plan.packet);for(const e of plan.evidence){e.value=plan.packet.address[e.field];e.packetSha256=plan.packetSha256;}
    Object.assign(plan.approval,{packetSha256:plan.packetSha256,evidenceSha256:digest(plan.evidence),confirmedAddress:{...plan.packet.address}});
  }
  const packetFile=join(directory,`${code}-review.json`),p=JSON.parse(await readFile(packetFile,'utf8'));
  p.candidateId=`SYNTHETIC-CANDIDATE-${index}`;p.county={...plan.packet.county};p.addressReview.rawCountySitus=`${plan.packet.address.street}, ${plan.packet.address.city}`;
  Object.assign(p.addressReview.components,{street:plan.packet.address.street,city:plan.packet.address.city});
  p.assessor.id=`SYNTHETIC-ASSESSOR-${index}`;p.assessor.sourceRow=2;p.assessor.countyReviewFlags=flagged?['ACREAGE_DELTA_GT_0_01']:[];
  p.evidence.sourceHashes={dbf:plan.packet.assessor.sourceSha256,discovery:plan.packet.assessor.discoverySha256};delete p.packetSha256;p.packetSha256=sha(JSON.stringify(p));
  await writeFile(packetFile,JSON.stringify(p,null,2)+'\n');
  const registryFile=join(directory,'pilot-exclusions.json'),registry=JSON.parse(await readFile(registryFile,'utf8'));Object.assign(registry.identities.find(r=>r.pilotCode===code),{candidateId:p.candidateId,atn:p.county.atn,apn9:p.county.apn9});await writeFile(registryFile,JSON.stringify(registry,null,2)+'\n');
  const store=await createReviewStore({directory,reviewer:'Synthetic Reviewer',clock:()=>clock.now}),view=await store.get(code),submission=syntheticSubmission(view);
  submission.confirmedAddress={...plan.packet.address};
  const evidence=FIELDS.map(field=>{
    const e={synthetic:true,sourceType:['street','city'].includes(field)?'COUNTY_SITUS':'SYNTHETIC_INDEPENDENT_DOCUMENT',sourceIdentity:'SYNTHETIC_DOCUMENT_AUTHORITY',sourceRecordReference:`SYNTHETIC_RECORD:${index}:${variant}:${field}`,field,value:plan.packet.address[field],available:true,verified:true,packetSha256:p.packetSha256,candidateRef:p.candidateId,atn:p.county.atn,apn9:p.county.apn9,sourceSha256:plan.packet.assessor.sourceSha256,sourceRow:2,retrievedAt:new Date(clock.now-1000).toISOString(),asOf:null};
    e.expiresAt=new Date(clock.now+600000).toISOString();
    e.contentSha256=digest({field:e.field,value:e.value,sourceIdentity:e.sourceIdentity,sourceRecordReference:e.sourceRecordReference});submission.componentEvidenceReferences[field]=`${e.sourceRecordReference}#${e.contentSha256}`;return e;
  });
  await store.save(code,submission);clock.now=Math.max(clock.now,Date.now()+1000);
  const permissions=evidence.map(e=>({synthetic:true,sourceRecordReference:e.sourceRecordReference,field:e.field,status:'ACTIVE',available:true,purpose:'DURABLE_SHARED_CANONICAL_TEST_ONLY',sharedUse:true,retention:'SYNTHETIC_DURABLE_TEST_ONLY',authorizationReference:'SYNTHETIC_RIGHTS_FIXTURE_NOT_A_REAL_LICENSE',validFrom:new Date(clock.now-2000).toISOString(),expiresAt:new Date(clock.now+600000).toISOString()}));
  const files={decision:`${code}-analyst-decision.json`,packet:`${code}-review.json`,evidence:'durable-evidence.json',permissions:'durable-permissions.json',plan:'persistence-input.json'};
  for(const [name,value]of [['evidence',evidence],['permissions',permissions],['plan',plan]])await writeFile(join(directory,files[name]),JSON.stringify(value,null,2)+'\n');
  let body={synthetic:true,reference,revision:1,status:'ACTIVE',reviewer:'Synthetic Reviewer',packetSha256:p.packetSha256,expiresAt:new Date(clock.now+3600000).toISOString(),binding:{candidateRef:p.candidateId,atn:p.county.atn,apn9:p.county.apn9,assessorRef:p.assessor.id}};
  const sign=async()=>{await writeFile(join(directory,'authority.json'),JSON.stringify({body,signature:createHmac('sha256',key).update(JSON.stringify(body)).digest('hex')})+'\n');};
  const refresh=async()=>{for(const n of ['decision','evidence','permissions','plan'])body[`${n}Sha256`]=sha(await readFile(join(directory,files[n])));await sign();};await refresh();
  const record={reference,directory,code,reviewer:'Synthetic Reviewer'},request={reference,decisionRevision:body.decisionSha256};
  return {directory,record,request,clock,plan,gate:()=>createTrustedReviewGate({records:[record],key,authorizedReviewers:['Synthetic Reviewer'],clock:()=>clock.now}),
    edit:async(name,mutate,{authenticated=true}={})=>{if(name==='authority'){mutate(body);if(authenticated){body.revision++;await sign();}else await writeFile(join(directory,'authority.json'),JSON.stringify({body,signature:'0'.repeat(64)})+'\n');return;}
      const value=JSON.parse(await readFile(join(directory,files[name]),'utf8'));mutate(value);await writeFile(join(directory,files[name]),JSON.stringify(value,null,2)+'\n');if(authenticated){body.revision++;await refresh();}},
    currentRequest:()=>({reference,decisionRevision:body.decisionSha256})};
}
