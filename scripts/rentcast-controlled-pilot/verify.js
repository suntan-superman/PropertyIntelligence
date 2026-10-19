// Offline certification of the already-acquired evidence; never invokes run.js.
import '../../src/analysis/offline.js';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {ROOT,ENDPOINT,check,saveNew,sha,reconcile} from './core.js';
import {readJson,verifyProtection,localCredential,exposureAudit} from './local.js';
import {fileHash} from '../sprint6_2/io.js';
import {offlineStatus} from '../../src/analysis/offline.js';

const mapping=await readJson(`${ROOT}/candidate-mapping.json`),results=await readJson(`${ROOT}/reconciliation-results.json`),ledger=await readJson(`${ROOT}/request-ledger.json`);
const sealed=p=>{const {packetSha256,...body}=p;check(sha(JSON.stringify(body))===packetSha256,'SEALED_EVIDENCE_CHANGED');};
sealed(mapping);
const pre=await readJson(`${ROOT}/offline-qa.json`);
for(const [path,hash] of Object.entries(pre.sourceHashes))check(await fileHash(path)===hash,'TESTED_SOURCE_CHANGED');
const requestFiles=await readdir(`${ROOT}/requests`);
check(requestFiles.length===9&&requestFiles.filter(n=>/^attempt-\d+\.json$/.test(n)).length===3,'REQUEST_RESERVATIONS_CHANGED');
check(ledger.attemptsTransmitted===3&&ledger.http200===3&&ledger.non200===0&&ledger.unknownOutcomes===0&&ledger.automaticRetries===0&&ledger.cacheHits===0&&ledger.providerCalls===3,'REQUEST_ACCOUNTING_FAILED');
const observations=[],diagnostics=[],privateValues=new Set(),artifactHashes={};
let previousCompletion=null;
for(const [i,c] of mapping.candidates.entries()){
  const paths=[`${ROOT}/requests/attempt-${i+1}.json`,`${ROOT}/requests/http-${i+1}.json`,`${ROOT}/requests/response-${i+1}.json`,`${ROOT}/evidence/${c.pilotCode}.json`,`${ROOT}/review-packets/${c.pilotCode}-review.json`];
  const [attempt,http,response,evidence,packet]=await Promise.all(paths.map(readJson));
  for(const path of paths)artifactHashes[path]=await fileHash(path);
  check(attempt.attempt===i+1&&attempt.pilotCode===c.pilotCode&&attempt.endpoint===ENDPOINT&&attempt.countsAgainstCeiling===true,'ATTEMPT_IDENTITY_CHANGED');
  check(http.status===200&&http.pilotCode===c.pilotCode&&response.httpStatus===200&&response.body.length===1,'RESPONSE_ACCOUNTING_FAILED');
  check(!previousCompletion||Date.parse(attempt.transmissionIntentAt)>=Date.parse(previousCompletion),'NON_SERIAL_REQUESTS');previousCompletion=response.retrievedAt;
  sealed(evidence);sealed(packet);
  check(packet.evidence.evidenceRecordSha256===evidence.packetSha256&&evidence.responseFingerprint===response.responseFingerprint&&evidence.sourceFingerprint===sha(JSON.stringify(response.body[0])),'PROVENANCE_FAILED');
  check(JSON.stringify(evidence.county)===JSON.stringify(c.county)&&evidence.countyIdentityFingerprint===c.countyIdentityFingerprint,'COUNTY_EVIDENCE_CHANGED');
  check(packet.analystReview.decision===null&&packet.persistence.enabled===false&&packet.persistence.separateAuthorizationRequired===true&&packet.round1Selected===false,'REVIEW_GATING_FAILED');
  check(evidence.rightsClassification==='RENTCAST_DURABLE_LICENSED_EVIDENCE'&&evidence.rightsReference==='vendor-confirmation-2026-10-09.json','RIGHTS_PROVENANCE_FAILED');
  const r=evidence.providerRecord;
  for(const key of Object.keys(r))check(!/owner|contact|phone|email|mailing|payload|raw/i.test(key),'PII_IN_RECORD');
  check(evidence.rawCountyApn===c.county.apn9&&evidence.rawProviderApn===r.assessorID,'RAW_IDENTITY_CHANGED');
  const classification=reconcile(c,response.body);
  check(JSON.stringify(classification)===JSON.stringify(evidence.reconciliation)&&JSON.stringify(classification)===JSON.stringify(packet.reconciliation),'RECONCILIATION_CHANGED');
  const compact=typeof r.assessorID==='string'?r.assessorID.replace(/[ -]/g,''):null;
  diagnostics.push({pilotCode:c.pilotCode,providerApnDigits:/^[0-9]+$/.test(compact??'')?compact.length:null,countyApnDigits:c.county.apn9.length,providerCompactEqualsCountyAtn:compact===c.county.atn,providerCompactEqualsCountyApn9:compact===c.county.apn9,
    streetSuffixOnlyDifference:c.requestAddress.street.split(' ').slice(0,-1).join(' ').toUpperCase()===r.addressLine1.split(' ').slice(0,-1).join(' ').toUpperCase()&&!classification.addressComparison.streetNameAndSuffixAgreement,
    addressChecks:classification.addressComparison,matchClassification:classification.matchClassification,reviewTier:classification.reviewTier,providerAsOfStatus:evidence.providerAsOfStatus});
  for(const value of [c.candidateId,c.county.atn,c.county.apn9,c.requestAddress.street,c.countyAddressReview.rawCountySitus,r.id,r.assessorID,r.addressLine1,r.formattedAddress,r.zipCode])if(typeof value==='string'&&value.length>3)privateValues.add(value);
  observations.push(r);
}
check(new Set(observations.map(r=>r.id)).size===3,'DUPLICATE_PROVIDER_ID');
check(results.analystApprovals===0&&results.durablePropertiesCreated===0&&results.databaseConnections===0&&results.productionWrites===0&&results.mlsAccess===0&&results.round1Selections===0&&results.otherProviderCalls===0,'SCOPE_ACCOUNTING_FAILED');
const config=await readJson(mapping.sourcePaths.config);check(config.status==='PRE_EXECUTION'&&!config.executionAuthorized&&!config.selectionLocked,'ROUND1_AUTHORIZATION_CHANGED');
const docs=['docs/PI_RENTCAST_CONTROLLED_PILOT_V1.md','docs/PI_RENTCAST_IDENTITY_RECONCILIATION.md','docs/PI_RENTCAST_PILOT_QA.md'];
const shareable=[...docs,...(await readdir('scripts/rentcast-controlled-pilot')).filter(n=>n.endsWith('.js')).map(n=>`scripts/rentcast-controlled-pilot/${n}`)];
for(const path of shareable){const text=await readFile(path,'utf8');for(const value of privateValues)check(!text.toLowerCase().includes(value.toLowerCase()),'PRIVATE_IDENTITY_IN_SHAREABLE_ARTIFACT');}
const credential=await localCredential(),security=await exposureAudit(credential.apiKey);
for(const path of Object.keys(artifactHashes)){
  execFileSync('git',['check-ignore','--quiet',path],{stdio:'pipe'});
  check(!(await readFile(path,'utf8')).includes(credential.apiKey),'CREDENTIAL_IN_PRIVATE_EVIDENCE');
}
check(!execFileSync('git',['ls-files','--',ROOT],{encoding:'utf8'}).trim(),'PRIVATE_ARTIFACT_TRACKED');
check(offlineStatus().networkAttempts===0,'OFFLINE_NETWORK_ATTEMPT');
const report={status:'PASS',completedAt:new Date().toISOString(),runtime:process.version,requestAccounting:ledger,diagnostics,protection:await verifyProtection(await readJson(`${ROOT}/protected-before.json`)),security,privateOutputIgnored:true,privateIdentifiersInShareableOutputs:0,provenanceChecks:'PASS',decisionAndAuthorizationGates:'PASS',network:offlineStatus(),artifactHashes};
await saveNew(`${ROOT}/post-acquisition-certification.json`,report);
console.log(JSON.stringify({status:report.status,protection:report.protection,security:report.security,privateOutputIgnored:true,privateIdentifiersInShareableOutputs:0,provenanceChecks:'PASS',network:report.network,diagnostics}));
