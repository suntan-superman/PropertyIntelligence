import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,realpath,stat} from 'node:fs/promises';
import {configuration} from '../sources/rentcast/config.js';
import {createResearchClientV2_3B} from '../sources/rentcast/research-client-v2-3b.js';
import {filesystemStore} from '../sources/rentcast/stores.js';
import {createAccessControl} from '../auth/access-control.js';
import {createAutomaticPropertyResearch} from './automatic-property-research.js';
import {ResearchStop} from './property-research.js';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),privateRoot='data/runtime/pi-v2-3';
export function unavailableAuthenticatedResearch(blocker='PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED'){
  const stop=()=>{throw new ResearchStop(blocker,503);};
  return {capability:async()=>({enabled:false,workflow:'AUTHENTICATED_RESEARCH_V1',provider:'RentCast',operations:[{key:'propertyRecords',label:'Property records'},{key:'valuation',label:'Valuation'},{key:'comparableSales',label:'Comparable sales'}],maximumRequests:3,maximumEstimatedCostCents:100,remainingRequestBudget:null,blockers:[blocker]}),localEvidence:async()=>({entries:[]}),localEvidenceDependencies:async()=>({records:0,directories:0}),removeLocalEvidence:stop,research:stop,setEvidenceHandler(){},setEvidenceProvider(){}};
}
async function evidence(root,reference){
  if(!reference||typeof reference.path!=='string'||!/^[a-f0-9]{64}$/.test(reference.sha256))throw new Error('PROVIDER_EVIDENCE_REFERENCE_INVALID');
  const absolute=path.resolve(root,reference.path),relative=path.relative(root,absolute).replaceAll('\\','/');
  if(relative.startsWith('../')||(!relative.startsWith('source_docs/')&&!relative.startsWith(`${privateRoot}/`)))throw new Error('PROVIDER_EVIDENCE_PATH_INVALID');
  const actual=await realpath(absolute);if(actual.toLowerCase()!==absolute.toLowerCase()||(await stat(absolute)).isSymbolicLink())throw new Error('PROVIDER_EVIDENCE_SYMLINK_STOP');
  if(sha(await readFile(absolute))!==reference.sha256)throw new Error('PROVIDER_EVIDENCE_HASH_MISMATCH');
}
export async function loadAuthenticatedResearchConfiguration({authentication,root=process.cwd(),file=`${privateRoot}/provider-controls.json`,env=process.env,clock=()=>new Date()}={}){
  if(!authentication?.authenticate||!authentication?.verifyRecentIdToken)throw new Error('AUTHENTICATED_PROVIDER_ACCESS_REQUIRED');
  const record=JSON.parse(await readFile(path.resolve(root,file),'utf8'));
  if(record.version!=='PI_AUTHENTICATED_PROPERTY_RESEARCH_V3'||record.provider!=='RentCast'||JSON.stringify(record.endpoints)!==JSON.stringify(['/properties','/avm/value'])||!record.operationalEvidence||!record.limits||record.organizationId!==authentication.expectedOrganizationId||record.limits.requestsPerUserPerDay!==20||record.limits.requestsPerProviderPerDay!==20)throw new Error('AUTHENTICATED_RESEARCH_CONFIGURATION_INVALID');
  for(const kind of ['account','usage','rights','fees']){if(!record.evidence?.[kind])throw new Error(`PROVIDER_${kind.toUpperCase()}_EVIDENCE_REQUIRED`);await evidence(root,record.evidence[kind]);}
  const observed=Date.parse(record.operationalEvidence.observedAt),now=clock().getTime();record.operationalEvidence.accountEvidenceCurrent=Number.isFinite(observed)&&observed<=now&&now-observed<=24*60*60*1000;
  const rentcast=configuration(env),store=filesystemStore(),client=createResearchClientV2_3B({...rentcast,maxRetries:0,maxCalls:record.limits.requestsPerProviderPerDay,timeoutMs:Math.min(rentcast.timeoutMs,15000)},{store,cachePrefix:'data/raw/rentcast/property-research-v2-3'}),accessControl=createAccessControl({verifySession:request=>authentication.authenticate(request)});
  return createAutomaticPropertyResearch({accessControl,authentication,client,store,ledgerDirectory:path.join(root,privateRoot,'usage'),operationalEvidence:record.operationalEvidence,limits:record.limits,organizationId:record.organizationId,clock});
}
