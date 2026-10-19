import {readFile,writeFile,rename,unlink,realpath,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CODES,sha,fail,validatePacket,validateSubmission,packetView,decisionView} from './review-model.js';
import {readGoogleSuggestion} from './google-suggestion.js';
import {assessReview,referenceText,historicalDecisionAudit} from './review-assessment.js';

export async function createReviewStore({directory,reviewer,clock=Date.now}){
  if(typeof reviewer!=='string'||!reviewer.trim()||reviewer.length>100||/[\r\n\x00-\x1f]/.test(reviewer))fail('REVIEWER_REQUIRED');
  reviewer=reviewer.trim();
  const root=resolve(directory);
  if((await realpath(root)).toLowerCase()!==root.toLowerCase())fail('PRIVATE_DIRECTORY_SYMLINK_FORBIDDEN');
  for(const code of CODES)for(const suffix of ['review','analyst-decision']){
    const path=join(root,`${code}-${suffix}.json`);
    if((await lstat(path)).isSymbolicLink())fail('PRIVATE_FILE_SYMLINK_FORBIDDEN');
    execFileSync('git',['check-ignore','--quiet',path],{stdio:'pipe'});
    if(execFileSync('git',['ls-files','--',path],{encoding:'utf8'}).trim())fail('PRIVATE_FILE_TRACKED');
  }
  const names=code=>{if(!CODES.includes(code))fail('NOT_FOUND',404);return {packet:join(root,`${code}-review.json`),decision:join(root,`${code}-analyst-decision.json`)};};
  async function readChecked(path){if((await lstat(path)).isSymbolicLink()||(await realpath(path)).toLowerCase()!==path.toLowerCase())fail('PRIVATE_FILE_SYMLINK_FORBIDDEN');return readFile(path,'utf8');}
  async function load(code){
    const paths=names(code),packet=validatePacket(JSON.parse(await readChecked(paths.packet)),code);
    const registry=JSON.parse(await readChecked(join(root,'pilot-exclusions.json')));
    const matches=registry.identities?.filter(r=>r.pilotCode===code)??[];
    if(registry.permanentRound1Exclusion!==true||matches.length!==1||matches[0].candidateId!==packet.candidateId||matches[0].atn!==packet.county.atn||matches[0].apn9!==packet.county.apn9)fail('EXCLUSION_REGISTRY_IDENTITY_MISMATCH',409);
    for(const [key,value]of [['candidateId',packet.candidateId],['atn',packet.county.atn],['apn9',packet.county.apn9]])if(registry.identities.filter(r=>r[key]===value).length!==1)fail('DUPLICATE_PILOT_IDENTITY',409);
    const text=await readChecked(paths.decision),stored=JSON.parse(text);
    if(stored.pilotCode!==code)fail('DECISION_IDENTITY_MISMATCH',409);
    return {paths,packet,stored,revision:sha(text)};
  }
  const suggestion=packet=>readGoogleSuggestion({directory:root,packet,reviewer,clock});
  async function evidenceGate(r,input){
    const ref=input?.suggestionEvidenceRef;
    if(r.stored.suggestionEvidenceRef&&!ref)fail('SUGGESTION_BINDING_REQUIRED',409);
    if(ref){const s=await suggestion(r.packet);if(!s.available||JSON.stringify(ref)!==JSON.stringify(s.reference))fail('SUGGESTION_UNAVAILABLE_RELOAD_REQUIRED',409);}
  }
  async function getSuggestion(code){const r=await load(code),s=await suggestion(r.packet);return s.available?{...s,reviewAssessment:assessReview(r.packet,s,{now:clock()})}:s;}
  async function get(code){
    const r=await load(code),googleSuggestion=await suggestion(r.packet);
    let decision=decisionView(r.stored,r.packet);
    if(r.stored.suggestionEvidenceRef&&(!googleSuggestion.available||JSON.stringify(r.stored.suggestionEvidenceRef)!==JSON.stringify(googleSuggestion.reference))){
      // A saved derived draft must not bypass the original retention/reviewer gate.
      decision={pilotCode:code,packetSha256:r.stored.packetSha256,decision:null,effectiveDecision:null,stale:true,suggestionUnavailable:true,confirmedAddress:{},componentEvidenceReferences:{},componentVerification:{}};
    }
    const bound=!!r.stored.suggestionEvidenceRef,permitted=bound?!decision.suggestionUnavailable:true;
    return {packet:packetView(r.packet),decision,decisionRevision:r.revision,reviewer,googleSuggestion,
      reviewAssessment:assessReview(r.packet,googleSuggestion,{now:clock()}),
      decisionAudit:historicalDecisionAudit(r.stored,{available:bound?permitted:null,reusePermitted:bound?permitted:null,packetCurrent:r.stored.packetSha256===r.packet.packetSha256})};
  }
  async function prepareSubmission(r,input){
    if(input?.reviewMode===undefined)return {input};
    if(input.reviewMode!=='ROUTINE')fail('INVALID_REVIEW_MODE');
    const allowed=['pilotCode','packetSha256','decisionRevision','decision','reviewedBy','reviewerAcknowledged','notes','reviewMode','routineEvidenceReviewed','suggestionEvidenceRef'];
    if(Object.keys(input).some(k=>!allowed.includes(k)))fail('ROUTINE_INPUT_FIELDS');
    const s=await suggestion(r.packet),assessment=assessReview(r.packet,s,{now:clock()});
    if(assessment.tier!=='ROUTINE_REVIEW')fail('ROUTINE_REVIEW_NOT_ELIGIBLE',409);
    if(!input.suggestionEvidenceRef||JSON.stringify(input.suggestionEvidenceRef)!==JSON.stringify(s.reference))fail('SUGGESTION_BINDING_REQUIRED',409);
    const approving=input.decision==='APPROVED',reviewed=input.routineEvidenceReviewed===true;
    if(approving&&!reviewed)fail('EXPLICIT_EVIDENCE_REVIEW_REQUIRED',422);
    const {reviewMode,routineEvidenceReviewed,...submission}=input;
    const references=Object.fromEntries(['street','city','state','postalCode'].map(f=>[f,referenceText(assessment,f)]));
    const notes=input.notes?.trim()||(approving&&reviewed?'Reviewer explicitly confirmed the displayed component evidence and no remaining discrepancies.':'');
    return {input:{...submission,confirmedAddress:s.components,componentEvidenceReferences:references,
      componentVerification:Object.fromEntries(['street','city','state','postalCode'].map(f=>[f,approving&&reviewed?'VERIFIED':'UNVERIFIED'])),
      supportingEvidenceReferences:Object.entries(references).map(([f,r])=>`${f}: ${r}`).join('\n'),notes,
      contradictionStatus:approving&&reviewed?'NONE_REMAINING':'NOT_REVIEWED',
      addressChangeNotes:'Reviewed exact returned long/short route or existing terminal WY/Way comparison; original county text preserved.',acreageAcknowledged:false,acreageNotes:''},
      evidenceMetadata:{reviewMethod:'ROUTINE_EXPLICIT_GROUP_ATTESTATION_V1_2',routineEvidenceReviewed:reviewed,assessmentSha256:assessment.assessmentSha256,componentSources:assessment.componentReferences,sharedRetention:'SHARED RETENTION NOT AUTHORIZED'}};
  }
  const locks=new Set();
  async function validate(code,input){const r=await load(code);await evidenceGate(r,input);const prepared=await prepareSubmission(r,input);const {valid,errors,canonicalValidation}=validateSubmission(r.packet,prepared.input,reviewer);return {valid,errors,canonicalValidation};}
  async function save(code,input){
    names(code);if(locks.has(code))fail('SAVE_IN_PROGRESS',409);locks.add(code);
    let temp;
    try{
      const r=await load(code);
      if(input?.decisionRevision!==r.revision)fail('DECISION_CHANGED_RELOAD_REQUIRED',409);
      await evidenceGate(r,input);
      const prepared=await prepareSubmission(r,input);
      const checked=validateSubmission(r.packet,prepared.input,reviewer);
      if(!checked.valid)throw Object.assign(new Error('REVIEW_VALIDATION_FAILED'),{status:422,code:'REVIEW_VALIDATION_FAILED',errors:checked.errors});
      const now=new Date().toISOString();
      const prior={...r.stored};delete prior.history;
      const stored={schemaVersion:2,...checked.decision,...(prepared.evidenceMetadata?{evidenceMetadata:prepared.evidenceMetadata}:{}),reviewedAt:now,savedAt:now,authorizedHumanReviewReference:`LOCAL_ANALYST_REVIEW:${code}:${now}`,canonicalValidation:checked.canonicalValidation,
        analystConfirmed:checked.decision.decision==='APPROVED',scope:'LOCAL_REVIEW_DECISION_ONLY',automatedApprovalForbidden:true,separateIsolatedPersistenceAuthorization:null,
        history:[...(r.stored.history??[]),prior]};
      if(stored.history.length>100)fail('REVIEW_HISTORY_LIMIT',409);
      temp=join(root,`${code}-analyst-decision.${randomUUID()}.tmp`);
      await writeFile(temp,JSON.stringify(stored,null,2)+'\n',{flag:'wx',mode:0o600});
      // Recheck both files immediately before atomic replacement; no blind overwrite.
      const current=await load(code);
      if(current.revision!==r.revision||current.packet.packetSha256!==r.packet.packetSha256)fail('REVIEW_CHANGED_DURING_SAVE',409);
      await evidenceGate(current,input);
      if(input.reviewMode==='ROUTINE')await prepareSubmission(current,input);
      await rename(temp,r.paths.decision);temp=null;
      return get(code);
    }finally{if(temp)await unlink(temp).catch(()=>{});locks.delete(code);}
  }
  for(const code of CODES)await load(code);
  return {get,getSuggestion,validate,save,reviewer,list:async()=>Promise.all(CODES.map(async code=>{const r=await get(code);return {pilotCode:code,decision:r.decision.effectiveDecision,stale:r.decision.stale,flagged:r.packet.assessor.countyReviewFlags.length>0};}))};
}
