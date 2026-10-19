import test from 'node:test';
import assert from 'node:assert/strict';
import fileIO,{readFile,writeFile,lstat,readdir} from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import pg from 'pg';
import {join} from 'node:path';
import {offlineStatus} from '../../src/analysis/offline.js';
import {syntheticReviewDirectory,syntheticSubmission} from './review-fixtures.js';
import {addSyntheticSuggestions} from './suggestion-fixtures.js';
import {createReviewStore} from './review-store.js';
import {assessReview,referenceText} from './review-assessment.js';
import {sha,validatePacket} from './review-model.js';
const setup=async()=>{const directory=await syntheticReviewDirectory();const {now}=await addSyntheticSuggestions(directory);let time=now;const store=await createReviewStore({directory,reviewer:'Synthetic Reviewer',clock:()=>time});const view=await store.get('IP-P2');const packet=JSON.parse(await readFile(join(directory,'IP-P2-review.json')));return {directory,store,view,packet,now,setTime:v=>{time=v;}};};
export const routineInput=view=>({pilotCode:view.packet.pilotCode,packetSha256:view.packet.packetSha256,decisionRevision:view.decisionRevision,reviewedBy:'Synthetic Reviewer',reviewerAcknowledged:true,decision:'APPROVED',notes:'',reviewMode:'ROUTINE',routineEvidenceReviewed:true,suggestionEvidenceRef:view.googleSuggestion.reference});

test('routine classification is evidence-derived, not hard-coded by pilot code',async()=>{const {view,packet,now}=await setup();assert.equal(view.reviewAssessment.tier,'ROUTINE_REVIEW');packet.pilotCode='IP-P1';const s=structuredClone(view.googleSuggestion);s.reference.pilotCode='IP-P1';assert.equal(assessReview(packet,s,{now}).tier,'ROUTINE_REVIEW');assert.equal(view.decision.decision,null);});
test('acreage flag alone requires exception review',async()=>{const {store}=await setup();const v=await store.get('IP-P1');assert.equal(v.reviewAssessment.tier,'EXCEPTION_REVIEW');assert.ok(v.reviewAssessment.reasons.includes('COUNTY_QUALITY'));});
test('suffix discrepancy remains exception even without acreage flag',async()=>{const {directory,store,now}=await setup();const p=JSON.parse(await readFile(join(directory,'IP-P3-review.json'))),s=(await store.get('IP-P3')).googleSuggestion;p.assessor.countyReviewFlags=[];const a=assessReview(p,s,{now});assert.equal(a.tier,'EXCEPTION_REVIEW');assert.equal(a.suffixReview,true);assert.ok(a.reasons.includes('STREET_NAME'));});
test('missing ZIP is insufficient evidence and not a routine shortcut',async()=>{const {view,packet,now}=await setup();view.googleSuggestion.components.postalCode='';assert.equal(assessReview(packet,view.googleSuggestion,{now}).tier,'INSUFFICIENT_EVIDENCE');});
test('expired evidence contributes no provider references or values',async()=>{const {view,packet,now}=await setup();const a=assessReview(packet,view.googleSuggestion,{now:now+3600001});assert.equal(a.tier,'INSUFFICIENT_EVIDENCE');assert.ok(!JSON.stringify(a).includes('GOOGLE_TEMPORARY_SUGGESTION'));assert.deepEqual(a.componentReferences.postalCode,[]);});
test('tampered retained diagnostic cannot qualify for routine review',async()=>{const {directory,store}=await setup();await writeFile(join(directory,'google-geocoding-ip-p2/diagnostic.json'),'{}');assert.equal((await store.get('IP-P2')).reviewAssessment.tier,'INSUFFICIENT_EVIDENCE');});
test('exact unique Assessor relationship and actual reference required',async()=>{const {packet,view,now}=await setup();for(const mutate of [p=>p.identity.assessorPass=false,p=>p.identity.uniqueAssessorRelationship=false,p=>p.assessor.match='FUZZY',p=>delete p.assessor.id]){const p=structuredClone(packet);mutate(p);assert.equal(assessReview(p,view.googleSuggestion,{now}).tier,'EXCEPTION_REVIEW');}});
test('canonical conflict, archived identity and existing Property block routine',async()=>{const {packet,view,now}=await setup();for(const mutate of [p=>p.identity.conflicts=['UNRESOLVED'],p=>p.identity.archivedOrInactive=true,p=>p.identity.existingPropertyId='SYNTHETIC_PROPERTY']){const p=structuredClone(packet);mutate(p);assert.equal(assessReview(p,view.googleSuggestion,{now}).tier,'EXCEPTION_REVIEW');}});
test('multiple provider results block routine classification',async()=>{const {packet,view,now}=await setup();view.googleSuggestion.candidateCount=2;assert.equal(assessReview(packet,view.googleSuggestion,{now}).tier,'EXCEPTION_REVIEW');});
test('true or malformed partial-match and lower precision block routine',async()=>{const {packet,view,now}=await setup();for(const change of [{partialMatchFieldPresent:true,partialMatch:true},{partialMatchFieldPresent:true,partialMatch:null},{partialMatchFieldPresent:null},{precision:'APPROXIMATE'}])assert.equal(assessReview(packet,{...view.googleSuggestion,...change},{now}).tier,'EXCEPTION_REVIEW');assert.equal(view.googleSuggestion.partialMatch,null);});
test('assembled component references preserve actual distinct source types',async()=>{const {view}=await setup();const a=view.reviewAssessment;assert.deepEqual(a.componentReferences.street.map(r=>r.source),['COUNTY_SITUS','GOOGLE_TEMPORARY_SUGGESTION']);for(const f of ['state','postalCode'])assert.deepEqual(a.componentReferences[f].map(r=>r.source),['GOOGLE_TEMPORARY_SUGGESTION']);assert.ok(referenceText(a,'street').includes(view.packet.packetSha256));});
test('missing county source provenance is not replaced by fictional documents',async()=>{const {packet,view,now}=await setup();delete packet.evidence.sourceHashes;const a=assessReview(packet,view.googleSuggestion,{now});assert.equal(a.tier,'EXCEPTION_REVIEW');assert.ok(!JSON.stringify(a.componentReferences).includes('County Assessor situs'));assert.ok(a.reasons.includes('SOURCE_PROVENANCE'));});
test('routine approval requires explicit evidence review and human attestation',async()=>{const {store,view}=await setup();await assert.rejects(()=>store.validate('IP-P2',{...routineInput(view),routineEvidenceReviewed:false}),/EXPLICIT_EVIDENCE_REVIEW_REQUIRED/);assert.equal((await store.validate('IP-P2',{...routineInput(view),reviewerAcknowledged:false})).valid,false);assert.equal((await store.validate('IP-P2',{...routineInput(view),decision:''})).valid,false);assert.equal((await store.validate('IP-P2',{...routineInput(view),reviewedBy:'Other Reviewer'})).valid,false);});
test('routine API recomputes tier; forged compact mode cannot bypass exception',async()=>{const {store}=await setup();const v=await store.get('IP-P1');await assert.rejects(()=>store.validate('IP-P1',routineInput(v)),/ROUTINE_REVIEW_NOT_ELIGIBLE/);});
test('routine API rejects fabricated components, missing binding and stale packet',async()=>{const {store,view}=await setup();await assert.rejects(()=>store.validate('IP-P2',{...routineInput(view),confirmedAddress:{state:'NY'}}),/ROUTINE_INPUT_FIELDS/);const input=routineInput(view);delete input.suggestionEvidenceRef;await assert.rejects(()=>store.validate('IP-P2',input),/SUGGESTION_BINDING_REQUIRED/);await assert.rejects(()=>store.validate('IP-P2',{...routineInput(view),packetSha256:'0'.repeat(64)}),/STALE_PACKET/);});
test('exception detailed approval still requires acreage, evidence and discrepancy review',async()=>{const {store}=await setup(),v=await store.get('IP-P3'),input=syntheticSubmission(v);input.suggestionEvidenceRef=v.googleSuggestion.reference;input.confirmedAddress=v.googleSuggestion.components;input.acreageAcknowledged=false;input.contradictionStatus='UNRESOLVED';const r=await store.validate('IP-P3',input);assert.equal(r.valid,false);assert.ok(r.errors.some(e=>e.includes('acreage')));assert.ok(r.errors.some(e=>e.includes('contradictory')));});
test('routine synthetic save binds exact evidence without creating canonical records',async()=>{const {store,view,directory}=await setup();const saved=await store.save('IP-P2',routineInput(view));assert.equal(saved.decision.decision,'APPROVED');const raw=JSON.parse(await readFile(join(directory,'IP-P2-analyst-decision.json')));assert.equal(raw.scope,'LOCAL_REVIEW_DECISION_ONLY');assert.equal(raw.separateIsolatedPersistenceAuthorization,null);assert.equal(raw.evidenceMetadata.reviewMethod,'ROUTINE_EXPLICIT_GROUP_ATTESTATION_V1_2');assert.equal(raw.evidenceMetadata.componentSources.postalCode[0].source,'GOOGLE_TEMPORARY_SUGGESTION');assert.equal(saved.decisionAudit.canonicalIdentityEffectiveness,'NOT_CREATED_OR_ACTIVATED_BY_THIS_INTERFACE');});
test('expired approval is suspended, history auditable and file unaltered',async()=>{const {store,view,directory,now,setTime}=await setup();await store.save('IP-P2',routineInput(view));const file=join(directory,'IP-P2-analyst-decision.json'),before=sha(await readFile(file));setTime(now+3600001);const expired=await store.get('IP-P2');assert.equal(expired.reviewAssessment.tier,'INSUFFICIENT_EVIDENCE');assert.equal(expired.decision.effectiveDecision,null);assert.deepEqual(expired.decision.confirmedAddress,{});assert.equal(expired.decisionAudit.historicalDecisionExists,true);assert.equal(expired.decisionAudit.entries.at(-1).decision,'APPROVED');assert.equal(expired.decisionAudit.operationalEffectiveness,'SUSPENDED');assert.equal(expired.decisionAudit.supportingEvidenceReusePermitted,false);assert.ok(!JSON.stringify(expired.decisionAudit).includes('99999'));assert.equal(sha(await readFile(file)),before);});
test('duplicate county representation fails closed and no property creation method exists',async()=>{const {directory,store}=await setup();assert.equal(store.createProperty,undefined);assert.equal(store.createCanonicalResolution,undefined);const file=join(directory,'pilot-exclusions.json'),r=JSON.parse(await readFile(file));r.identities[0].apn9=r.identities[1].apn9;await writeFile(file,JSON.stringify(r));await assert.rejects(()=>store.get('IP-P2'),/DUPLICATE_PILOT_IDENTITY/);});
test('compact needs-more-evidence and reject still require rationale',async()=>{const {store,view}=await setup();for(const decision of ['NEEDS_MORE_EVIDENCE','REJECTED']){const input={...routineInput(view),decision,routineEvidenceReviewed:false};assert.equal((await store.validate('IP-P2',input)).valid,false);input.notes='Synthetic reviewer rationale for the unresolved issue.';assert.equal((await store.validate('IP-P2',input)).valid,true);}});
test('source disagreements and absent unique county evidence prevent routine classification',async()=>{const {packet,view,now}=await setup();for(const change of [{streetNumber:'999'},{components:{...view.googleSuggestion.components,city:'Different City'}},{components:{...view.googleSuggestion.components,state:'NV'}}])assert.equal(assessReview(packet,{...view.googleSuggestion,...change},{now}).tier,'EXCEPTION_REVIEW');packet.identity.uniqueCountyIdentity=false;assert.equal(assessReview(packet,view.googleSuggestion,{now}).tier,'EXCEPTION_REVIEW');});
test('actual pilot decisions remain unchanged; historical approval never grants durable persistence',async t=>{
  const directory='data/runtime/identity-resolution-pilot',codes=['IP-P1','IP-P2','IP-P3'],now=Date.now();
  const names=codes.flatMap(c=>[`${c}-review.json`,`${c}-analyst-decision.json`]);
  const optional=['google-review-access.json',...codes.map(c=>`google-geocoding-${c.toLowerCase()}/diagnostic.json`)];
  async function snapshot(name,required=true){
    try{
      const path=join(directory,name),s=await lstat(path,{bigint:true}),bytes=await readFile(path);
      assert.ok(s.isFile()&&!s.isSymbolicLink(),'Review input must remain a regular file');
      return {bytes,sha256:sha(bytes),identity:{dev:s.dev,ino:s.ino,size:s.size,mode:s.mode,mtimeNs:s.mtimeNs,ctimeNs:s.ctimeNs}};
    }catch(error){if(!required&&error.code==='ENOENT')return null;throw error;}
  }
  // Capture exact bytes and hashes before the existing assessment reads anything.
  const before=new Map();for(const name of names)before.set(name,await snapshot(name));
  for(const name of optional)before.set(name,await snapshot(name,false));
  const directoryBefore=(await readdir(directory)).sort();
  let writeAttempts=0,databaseAttempts=0;
  // Guard the review store's actual save/replace interfaces, not a fake store.
  for(const method of ['writeFile','rename','unlink'])t.mock.method(fileIO,method,()=>{writeAttempts++;throw new Error('READ_ONLY_ASSESSMENT_WRITE_FORBIDDEN');});
  for(const prototype of [pg.Client.prototype,pg.Pool.prototype])for(const method of ['connect','query'])t.mock.method(prototype,method,()=>{databaseAttempts++;throw new Error('READ_ONLY_ASSESSMENT_DATABASE_FORBIDDEN');});
  syncBuiltinESMExports();
  try{
    const store=await createReviewStore({directory,reviewer:'Stan Roy',clock:()=>now});
    assert.equal(store.createProperty,undefined);assert.equal(store.createCanonicalResolution,undefined);
    for(const code of codes){
      const original=before.get(`${code}-analyst-decision.json`),stored=JSON.parse(original.bytes),packet=validatePacket(JSON.parse(before.get(`${code}-review.json`).bytes),code);
      const v=await store.get(code),s=v.googleSuggestion;
      assert.equal(v.decisionRevision,original.sha256);
      assert.equal(v.packet.packetSha256,packet.packetSha256);
      assert.equal(v.reviewAssessment.canonicalPersistenceAllowed,false);
      assert.equal(v.reviewAssessment.sharedGoogleRetention,'SHARED RETENTION NOT AUTHORIZED');
      assert.equal(v.decisionAudit.canonicalIdentityEffectiveness,'NOT_CREATED_OR_ACTIVATED_BY_THIS_INTERFACE');
      assert.equal(s.liveLookupEnabled,false);
      if(s.available){
        const evidence=before.get(`google-geocoding-${code.toLowerCase()}/diagnostic.json`);
        assert.ok(evidence,'Available suggestion requires existing local evidence');
        assert.equal(s.reference.evidenceSha256,evidence.sha256);
        assert.equal(s.reference.packetSha256,packet.packetSha256);assert.equal(s.reference.pilotCode,code);
        assert.ok(Date.parse(s.retrievedAt)<=now&&Date.parse(s.expiresAt)>now);
        assert.equal(v.reviewAssessment.evidencePermitted,true);
      }else{
        assert.equal(v.reviewAssessment.tier,'INSUFFICIENT_EVIDENCE');
        assert.equal(v.reviewAssessment.evidencePermitted,false);
        assert.ok(Object.values(v.reviewAssessment.componentReferences).flat().every(r=>r.source!=='GOOGLE_TEMPORARY_SUGGESTION'));
      }
      const bound=!!stored.suggestionEvidenceRef,unavailable=bound&&(!s.available||JSON.stringify(stored.suggestionEvidenceRef)!==JSON.stringify(s.reference));
      const packetCurrent=stored.packetSha256===packet.packetSha256;
      // Match legitimate current historical decisions, never a fixed pilot outcome.
      assert.equal(v.decision.decision,unavailable?null:stored.decision??null);
      assert.equal(v.decision.effectiveDecision,unavailable||!packetCurrent?null:stored.decision??null);
      if(unavailable){assert.equal(v.decision.suggestionUnavailable,true);assert.deepEqual(v.decision.confirmedAddress,{});}
      const expectedState=!stored.decision?'UNREVIEWED':!packetCurrent||unavailable?'SUSPENDED':bound?'LOCAL_DECISION_ONLY':'REQUIRES_INDEPENDENT_EVIDENCE_REVIEW';
      assert.equal(v.decisionAudit.operationalEffectiveness,expectedState);
      assert.equal(v.decisionAudit.supportingEvidenceAvailable,bound?!unavailable:null);
      assert.equal(v.decisionAudit.supportingEvidenceReusePermitted,bound?!unavailable:null);
      const historical=[...(stored.history??[]),stored].filter(d=>['APPROVED','NEEDS_MORE_EVIDENCE','REJECTED'].includes(d.decision)).map(d=>d.decision);
      assert.deepEqual(v.decisionAudit.entries.map(d=>d.decision),historical);
    }
  }finally{
    t.mock.restoreAll();syncBuiltinESMExports();
    for(const [name,original]of before){
      const current=await snapshot(name,original!==null);
      if(original===null){assert.equal(current,null);continue;}
      // Do not print private bytes on failure. Metadata detects rewrite/replacement
      // even when the final bytes are identical; atime is intentionally excluded.
      assert.ok(current.bytes.equals(original.bytes),'Read-only assessment changed input bytes');
      assert.equal(current.sha256,original.sha256);
      assert.deepEqual(current.identity,original.identity,'Read-only assessment wrote/replaced an input');
    }
    assert.deepEqual((await readdir(directory)).sort(),directoryBefore);
    assert.equal(writeAttempts,0);assert.equal(databaseAttempts,0);
    assert.equal(offlineStatus().networkDisabled,true);assert.equal(offlineStatus().networkAttempts,0);
  }
});
test('manual references do not assert independently revalidated availability or retention permission',async()=>{const {store,view}=await setup();const saved=await store.save('IP-P2',syntheticSubmission(view));assert.equal(saved.decisionAudit.supportingEvidenceAvailable,null);assert.equal(saved.decisionAudit.supportingEvidenceReusePermitted,null);assert.equal(saved.decisionAudit.operationalEffectiveness,'REQUIRES_INDEPENDENT_EVIDENCE_REVIEW');assert.equal(saved.decisionAudit.entries.at(-1).sourceDependency,'ANALYST_DOCUMENTED_SOURCES');});
