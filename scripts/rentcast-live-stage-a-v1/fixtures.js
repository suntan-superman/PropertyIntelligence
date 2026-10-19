// New synthetic credentials, claim documents and authorization. Never operator evidence.
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture as previousFixture,NOW} from '../rentcast-financial-controlled-client-v1/fixtures.js';
import {seal,sha as originalSha} from '../rentcast-controlled-pilot/core.js';
import {hash,sha,FIRST_SELECTION,requestFor} from '../rentcast-financial-controlled-client-v1/contract.js';
import {writeExclusive} from '../rentcast-financial-controlled-client-v1/ledger.js';
import {newText} from '../preliminary-property-analysis-v1/guard.js';
import {REGISTRY} from './paths.js';
export {NOW};
export const SYNTHETIC_KEY='SYNTHETIC-key-never-live-001';
export const CERT_SHA='f'.repeat(64);
export function fixture(){
  const f=previousFixture();f.candidate.selectionFingerprint=FIRST_SELECTION;
  const mappingText=JSON.stringify(seal({candidates:[f.candidate]}));
  const template={candidate:structuredClone(f.candidate),mappingText,mappingSha256:originalSha(mappingText),source:f.template.source};
  const payload={version:'LIVE_STAGE_A_SOURCE_V1',candidate:f.candidate,template,request:requestFor('A',f.candidate),sourceInputHashes:{synthetic:'e'.repeat(64)}};
  const context={...payload,contextFingerprint:hash(payload)};
  const account={version:'STAGE_A_ACCOUNT_V1',reviewer:'SYNTHETIC_REVIEWER',reviewedAt:'2026-10-12T11:00:00.000Z',expiresAt:'2026-10-12T23:00:00.000Z',
    plan:{name:'SYNTHETIC_PLAN',active:true,propertyRecords:true,currency:'USD'},usage:{included:50,used:3,remaining:47,observedAt:'2026-10-12T11:00:00.000Z',concurrentAccountUsage:'UNKNOWN'},
    fees:{overagePer200Cents:20,endpointFeeMaxCents:0,taxAndOtherMaxCents:5,verifiedUpperBound:true,includedQuotaCredited:0,billingRule:'HTTP_200_REQUESTS_ONLY'},
    rights:{privateRetention:true,workflowUse:true,commercialUse:true,thirdPartyReviewed:true,termsVersion:'SYNTHETIC_TERMS_ONLY'},allInCapCents:100,pilotExclusive:true,registry:REGISTRY,evidence:{}};
  return {context,account,subject:f.subject};
}
export async function documents(directory,f=fixture()){
  await mkdir(directory,{recursive:true});
  async function review(name,claims,sourceKind){
    const quote=`SYNTHETIC QA DOCUMENT ONLY. Confirmed test claims: ${JSON.stringify(claims)}`;
    await newText(join(directory,`${name}.txt`),quote);
    return {file:`${name}.txt`,sha256:sha(quote),quote,sourceKind,reviewer:'SYNTHETIC_REVIEWER',reviewedAt:'2026-10-12T11:00:00.000Z',independentlyReviewed:true,confirmedClaims:structuredClone(claims)};
  }
  for(const [key,kind] of [['plan','ACCOUNT_PRODUCT_EVIDENCE'],['usage','ACCOUNT_USAGE_EVIDENCE'],['fees','CURRENT_PRICE_FEE_TAX_EVIDENCE'],['rights','WRITTEN_RIGHTS_AND_TERMS']])f.account.evidence[key]=await review(key,f.account[key],kind);
  const a={version:'STAGE_A_AUTHORIZATION_V1',stage:'A',explicitExecutionAuthorized:true,reviewer:'SYNTHETIC_REVIEWER',approvedAt:'2026-10-12T11:00:00.000Z',expiresAt:'2026-10-12T23:00:00.000Z',selectionFingerprint:FIRST_SELECTION,technicalOrdinal:1,candidateFingerprint:hash(f.context.candidate),contextFingerprint:f.context.contextFingerprint,requestFingerprint:hash(f.context.request),accountFingerprint:hash(f.account),rightsEvidenceSha256:f.account.evidence.rights.sha256,feesEvidenceSha256:f.account.evidence.fees.sha256,certificateSha256:CERT_SHA,registry:REGISTRY,maxAttempts:1,retries:0,requestFeeReserveCents:20,maximumBillableExposureCents:20+f.account.fees.endpointFeeMaxCents+f.account.fees.taxAndOtherMaxCents,allInCapCents:100,stopAfter:'STAGE_A',stagesBC:false};
  f.authorization={...a,evidence:await review('written-authorization',a,'WRITTEN_SINGLE_STAGE_AUTHORIZATION')};
  await writeExclusive(join(directory,'account.json'),f.account);await writeExclusive(join(directory,'authorization.json'),f.authorization);
  return {...f,inputDirectory:directory};
}
