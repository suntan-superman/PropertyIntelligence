// Local synthetic integration only. No browser route or production authority.
import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createReviewStore} from '../identity-resolution-pilot/review-store.js';
import {FIELDS,sha,validatePacket,validateSubmission} from '../identity-resolution-pilot/review-model.js';
import {historicalDecisionAudit} from '../identity-resolution-pilot/review-assessment.js';
import {digest} from './fixture.js';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
export const SOURCE_MAP=Object.freeze({COUNTY_SITUS:'COUNTY_SOURCE',COUNTY_SOURCE:'COUNTY_SOURCE',GOOGLE_TEMPORARY_SUGGESTION:'GOOGLE_TEMPORARY_SUGGESTION',SYNTHETIC_INDEPENDENT_DOCUMENT:'INDEPENDENT_DURABLE_EVIDENCE',INDEPENDENT_DURABLE_EVIDENCE:'INDEPENDENT_DURABLE_EVIDENCE',ANALYST_DOCUMENTED_SOURCES:'ANALYST_ATTESTATION',ANALYST_ATTESTATION:'ANALYST_ATTESTATION'});
export function createTrustedReviewGate({records,key,authorizedReviewers,clock=Date.now}){
  need(Buffer.isBuffer(key)&&key.length>=32,'TRUSTED_AUTHORITY_KEY_REQUIRED');
  const catalog=new Map(records.map(r=>[r.reference,Object.freeze({...r})]));
  need(catalog.size===records.length,'DUPLICATE_TRUSTED_REFERENCE');
  key=Buffer.from(key);
  const reviewers=new Set(authorizedReviewers),observed=new Map(),stores=new Map();
  async function textFile(directory,name){
    const file=join(directory,name),stat=await lstat(file);
    need(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=1024*1024,'TRUSTED_FILE_UNSAFE');
    need((await realpath(file)).toLowerCase()===file.toLowerCase(),'TRUSTED_FILE_SYMLINK');return readFile(file,'utf8');
  }
  async function load(request){
    need(request&&Object.keys(request).every(k=>['reference','decisionRevision'].includes(k)),'CALLER_AUTHORIZATION_FIELDS_FORBIDDEN');
    const entry=catalog.get(request.reference);need(entry&&/^[a-f0-9]{64}$/.test(request.decisionRevision??''),'TRUSTED_REFERENCE_REQUIRED');
    const directory=resolve(entry.directory),parent=resolve('data/runtime/identity-review-qa');
    need(/^synthetic-[^/\\]+$/.test(relative(parent,directory))&&(await realpath(directory)).toLowerCase()===directory.toLowerCase(),'SYNTHETIC_REVIEW_ROOT_REQUIRED');
    execFileSync('git',['check-ignore','--quiet',join(directory,'authority.json')],{stdio:'pipe'});
    need(execFileSync('git',['ls-files','--',directory],{encoding:'utf8'}).trim()==='','TRUSTED_ARTIFACT_TRACKED');
    const envelopeText=await textFile(directory,'authority.json'),envelope=JSON.parse(envelopeText),a=envelope.body;
    need(a&&/^[a-f0-9]{64}$/.test(envelope.signature??''),'FORGED_AUTHORIZATION');
    const expected=createHmac('sha256',key).update(JSON.stringify(a)).digest();
    need(timingSafeEqual(expected,Buffer.from(envelope.signature,'hex')),'FORGED_AUTHORIZATION');
    need(a.synthetic===true&&a.reference===request.reference&&Number.isSafeInteger(a.revision)&&a.revision>0,'AUTHORITY_BINDING_INVALID');
    const previous=observed.get(request.reference),authoritySha256=digest(a);
    need(!previous||a.revision>previous.revision||(a.revision===previous.revision&&authoritySha256===previous.hash),'AUTHORITY_ROLLBACK_OR_EQUIVOCATION');
    observed.set(request.reference,{revision:a.revision,hash:authoritySha256});
    need(a.status==='ACTIVE','AUTHORIZATION_NOT_EFFECTIVE');
    need(reviewers.has(a.reviewer)&&a.reviewer===entry.reviewer,'REVIEWER_NOT_AUTHORIZED');
    const now=clock();need(Number.isFinite(now)&&Date.parse(a.expiresAt)>now,'APPROVAL_EXPIRED');
    const names={packet:`${entry.code}-review.json`,decision:`${entry.code}-analyst-decision.json`,evidence:'durable-evidence.json',permissions:'durable-permissions.json',plan:'persistence-input.json'};
    const texts={};for(const [k,n]of Object.entries(names))texts[k]=await textFile(directory,n);
    for(const k of ['decision','evidence','permissions','plan'])need(sha(texts[k])===a[`${k}Sha256`],`${k.toUpperCase()}_INTEGRITY_FAILURE`);
    need(request.decisionRevision===a.decisionSha256,'DECISION_SUPERSEDED_OR_STALE');
    const p=validatePacket(JSON.parse(texts.packet),entry.code),d=JSON.parse(texts.decision),evidence=JSON.parse(texts.evidence),permissions=JSON.parse(texts.permissions),plan=JSON.parse(texts.plan);
    need(p.qaFixture===true&&/^SYNTHETIC-CANDIDATE-/.test(p.candidateId)&&/^900\d{8}$/.test(p.county.atn)&&/^900\d{6}$/.test(p.county.apn9),'REAL_REVIEW_ARTIFACT_FORBIDDEN');
    need(p.packetSha256===a.packetSha256&&d.packetSha256===p.packetSha256,'APPROVAL_PACKET_STALE');
    need(p.identity.uniqueCountyIdentity===true&&p.identity.uniqueAssessorRelationship===true&&p.assessor.match==='MATCHED_EXACT','COUNTY_IDENTITY_NOT_UNIQUE');
    need(Array.isArray(p.assessor.countyReviewFlags)&&p.assessor.countyReviewFlags.every(f=>f==='ACREAGE_DELTA_GT_0_01'),'COUNTY_QUALITY_REVIEW_UNSUPPORTED');
    need(a.binding.candidateRef===p.candidateId&&a.binding.atn===p.county.atn&&a.binding.apn9===p.county.apn9&&a.binding.assessorRef===p.assessor.id,'APPROVAL_PROPERTY_BINDING_MISMATCH');
    need(d.decision==='APPROVED'&&d.reviewedBy===a.reviewer&&d.scope==='LOCAL_REVIEW_DECISION_ONLY'&&d.reviewerAcknowledged===true,'TRUSTED_APPROVAL_REQUIRED');
    need(Date.parse(d.reviewedAt)<=now&&Date.parse(d.reviewedAt)>0&&Date.parse(d.savedAt)>=Date.parse(d.reviewedAt)&&typeof d.authorizedHumanReviewReference==='string'&&d.authorizedHumanReviewReference.startsWith('LOCAL_ANALYST_REVIEW:'),'REVIEW_TIMESTAMP_INVALID');
    need(!d.suggestionEvidenceRef&&!JSON.stringify(d.evidenceMetadata??{}).includes('GOOGLE_TEMPORARY_SUGGESTION'),'GOOGLE_DURABLE_USE_FORBIDDEN');
    const fields=['pilotCode','packetSha256','decision','reviewedBy','reviewerAcknowledged','confirmedAddress','componentEvidenceReferences','componentVerification','supportingEvidenceReferences','notes','contradictionStatus','addressChangeNotes','acreageAcknowledged','acreageNotes'];
    const submission=Object.fromEntries(fields.map(k=>[k,d[k]]));
    need(validateSubmission(p,submission,a.reviewer).valid,'REVIEW_COMPONENT_OR_IDENTITY_INVALID');
    // Reuse the existing store's registry, stale-decision and operational gates.
    if(!stores.has(request.reference))stores.set(request.reference,createReviewStore({directory,reviewer:a.reviewer,clock}));
    const store=await stores.get(request.reference),view=await store.get(entry.code);
    need(view.decisionRevision===a.decisionSha256&&view.decision.effectiveDecision==='APPROVED'&&!view.decision.stale,'REVIEW_NOT_OPERATIONALLY_EFFECTIVE');
    need(plan.packet?.synthetic===true&&plan.packet.county.jurisdiction===p.county.jurisdiction&&plan.packet.county.atn===p.county.atn&&plan.packet.county.apn9===p.county.apn9&&plan.packet.assessor.sourceSha256===p.evidence.sourceHashes.dbf&&plan.packet.assessor.discoverySha256===p.evidence.sourceHashes.discovery,'PERSISTENCE_PLAN_IDENTITY_MISMATCH');
    need(Array.isArray(evidence)&&evidence.length===4&&Array.isArray(permissions)&&permissions.length===4,'COMPONENT_EVIDENCE_REQUIRED');
    const mapped=[];
    for(const field of FIELDS){
      const matches=evidence.filter(e=>e.field===field);need(matches.length===1,'COMPONENT_EVIDENCE_REQUIRED');const e=matches[0],sourceClass=SOURCE_MAP[e.sourceType];
      need(sourceClass!=='GOOGLE_TEMPORARY_SUGGESTION','GOOGLE_DURABLE_USE_FORBIDDEN');
      need(['COUNTY_SOURCE','INDEPENDENT_DURABLE_EVIDENCE'].includes(sourceClass),'DURABLE_SOURCE_UNKNOWN');
      need(e.synthetic===true&&e.sourceIdentity==='SYNTHETIC_DOCUMENT_AUTHORITY'&&typeof e.sourceRecordReference==='string'&&e.sourceRecordReference.startsWith('SYNTHETIC_RECORD:')&&e.available===true,'EVIDENCE_UNAVAILABLE');
      need(e.packetSha256===p.packetSha256&&e.candidateRef===p.candidateId&&e.atn===p.county.atn&&e.apn9===p.county.apn9,'EVIDENCE_PROPERTY_BINDING_MISMATCH');
      need(e.value===d.confirmedAddress[field]&&e.value===plan.packet.address[field]&&e.verified===true,'UNSUPPORTED_ADDRESS_COMPONENT');
      const hash=digest({field:e.field,value:e.value,sourceIdentity:e.sourceIdentity,sourceRecordReference:e.sourceRecordReference});
      need(e.contentSha256===hash&&d.componentEvidenceReferences[field]===`${e.sourceRecordReference}#${hash}`,'CHANGED_COMPONENT_EVIDENCE');
      need(Number.isFinite(Date.parse(e.retrievedAt))&&Date.parse(e.retrievedAt)<=now&&(e.asOf===null||Date.parse(e.asOf)<=now),'EVIDENCE_DATE_INVALID');
      need(Date.parse(e.expiresAt)>now,'SUPPORTING_EVIDENCE_EXPIRED');
      if(sourceClass==='COUNTY_SOURCE')need(e.sourceSha256===p.evidence.sourceHashes.dbf&&e.sourceRow===p.assessor.sourceRow&&e.value===p.addressReview.components[field],'COUNTY_SOURCE_CONFLICT');
      const rights=permissions.filter(r=>r.sourceRecordReference===e.sourceRecordReference&&r.field===field);need(rights.length===1,'EVIDENCE_RIGHTS_UNKNOWN');const g=rights[0];
      need(g.synthetic===true&&g.status==='ACTIVE'&&g.available===true,'EVIDENCE_REVOKED_OR_UNAVAILABLE');
      need(g.purpose==='DURABLE_SHARED_CANONICAL_TEST_ONLY'&&g.sharedUse===true&&g.retention==='SYNTHETIC_DURABLE_TEST_ONLY'&&g.authorizationReference==='SYNTHETIC_RIGHTS_FIXTURE_NOT_A_REAL_LICENSE','DURABLE_PERMISSION_NOT_ESTABLISHED');
      need(Date.parse(g.expiresAt)>now&&Date.parse(g.validFrom)<=now,'EVIDENCE_PERMISSION_EXPIRED');
      mapped.push({field,originalSourceType:e.sourceType,sourceClass,sourceRecordReference:e.sourceRecordReference,contentSha256:hash});
    }
    const historical=historicalDecisionAudit(d,{available:true,reusePermitted:true,packetCurrent:true});need(historical.operationalEffectiveness==='LOCAL_DECISION_ONLY','HISTORICAL_APPROVAL_SUSPENDED');
    // Files must still match after the existing review store's independent reads.
    need((await textFile(directory,'authority.json'))===envelopeText,'AUTHORITY_CHANGED_DURING_READ');
    for(const [k,n]of Object.entries(names))need(await textFile(directory,n)===texts[k],'ARTIFACT_CHANGED_DURING_READ');
    const authorization={synthetic:true,reference:request.reference,revision:a.revision,authoritySha256,packetSha256:p.packetSha256,decisionSha256:a.decisionSha256,evidenceSha256:a.evidenceSha256,permissionsSha256:a.permissionsSha256,reviewedBy:d.reviewedBy,reviewedAt:d.reviewedAt,expiresAt:a.expiresAt,attestationSource:'ANALYST_ATTESTATION',componentSources:mapped,historicalOperationalState:historical.operationalEffectiveness,reviewTier:view.reviewAssessment.tier};
    authorization.identitySha256=digest(authorization);
    return {plan,authorization};
  }
  return Object.freeze({resolve:load});
}
