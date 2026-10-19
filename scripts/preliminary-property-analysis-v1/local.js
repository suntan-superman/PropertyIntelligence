import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileHash} from '../sprint6_2/io.js';
import {sha} from '../rentcast-controlled-pilot/core.js';
import {SOURCES,sealedValid} from '../rentcast-reconciliation-v1-1/source.js';
import {reconcile} from '../rentcast-reconciliation-v1-1/reconcile.js';
import {readJson,filesUnder} from './guard.js';
import {preliminaryIdentity,missingInventory,realReadinessResult} from './core.js';

const PILOT='data/runtime/rentcast-controlled-pilot';
const REPLAY='data/runtime/rentcast-reconciliation-v1-1/replay-2026-10-09T22-29-15.713Z';
export async function loadRetained(){
  const certificate=await readJson(`${PILOT}/post-acquisition-certification.json`);
  assert.equal(certificate.status,'PASS');
  for(const [p,h] of Object.entries(certificate.artifactHashes))assert.equal(await fileHash(p),h,'ORIGINAL_ACQUISITION_CHANGED');
  const mappingText=await readFile(`${PILOT}/candidate-mapping.json`,'utf8'),mapping=JSON.parse(mappingText);
  assert(sealedValid(mapping)&&mapping.candidates.length===3,'MAPPING_SEAL');
  assert.equal((await readJson(`${PILOT}/execution-lock.json`)).mappingSha256,mapping.packetSha256);
  assert.deepEqual(await readJson(`${PILOT}/request-ledger.json`),certificate.requestAccounting);
  for(const [k,p] of Object.entries(mapping.sourcePaths))assert.equal(await fileHash(p),mapping.inputHashes[k],'COUNTY_CANDIDATE_PROVENANCE_CHANGED');
  const manifest=await readJson(`${REPLAY}/manifest.json`),sourceText=await readFile(`${REPLAY}/source-evidence.json`,'utf8'),source=JSON.parse(sourceText);
  assert.equal(sha(sourceText),manifest.sourceEvidenceSha256,'RULE_C_SOURCE_CHANGED');
  for(const [name,ref] of Object.entries(SOURCES)){
    assert.equal(await fileHash(ref.path),ref.sha256,'COUNTY_SOURCE_CHANGED');assert.equal(source.fingerprints[name],ref.sha256);
  }
  const items=[];
  for(const candidate of mapping.candidates){
    const evidencePath=`${PILOT}/evidence/${candidate.pilotCode}.json`,evidenceText=await readFile(evidencePath,'utf8'),evidence=JSON.parse(evidenceText);
    assert(sealedValid(evidence)&&sealedValid(await readJson(`${PILOT}/review-packets/${candidate.pilotCode}-review.json`)));
    const binding={evidencePath,evidenceFileSha256:sha(evidenceText),candidateSha256:sha(JSON.stringify(candidate)),mappingPath:`${PILOT}/candidate-mapping.json`,mappingFileSha256:sha(mappingText),mappingPacketSha256:mapping.packetSha256};
    items.push({candidate,evidence,evidenceText,mappingText,binding,source});
  }
  for(const input of items)input.binding.providerIdOccurrences=items.filter(x=>x.evidence.providerRecord.id===input.evidence.providerRecord.id).length;
  const rightsPath=`${PILOT}/vendor-confirmation-2026-10-09.json`,rightsDocument=await readJson(rightsPath),disclaimerPath='docs/SPRINT6_2_SOURCE_DISCLAIMER.md';
  const disclaimer=await readFile(disclaimerPath,'utf8');
  // Rights are source-specific: original local county delivery, NOT the newly
  // discovered online viewer. Do not infer a license for future county queries.
  const rights={rentcastAnalysis:rightsDocument.smallKernEvaluationPermitted===true&&['Retain address components, identifiers and provenance','Combine with county records for persistent profiles','Investor PDF reports'].every(x=>rightsDocument.permittedUses.includes(x)),
    rentcastReference:rightsPath,rentcastSha256:await fileHash(rightsPath),countyLocalAnalysis:disclaimer.includes('County-supplied use limitation')&&disclaimer.includes('without attaching the Disclaimer'),
    countyDisclaimerReference:disclaimerPath,countyDisclaimerSha256:await fileHash(disclaimerPath),scope:'LOCAL_RETAINED_LICENSED_EVIDENCE_ONLY_NO_NEW_PORTAL_RIGHTS',legalOpinion:false};
  const identities=[],rules=[];
  for(const input of items){
    const savedRuleC=await readJson(`${REPLAY}/${input.candidate.pilotCode}.json`),actual=reconcile(input);
    assert.deepEqual(actual,savedRuleC,'RULE_C_REPLAY_CHANGED');
    assert.equal(manifest.results.find(x=>x.pilotCode===input.candidate.pilotCode)?.replayFingerprint,actual.reconciliationFingerprint);
    rules.push(actual);
    identities.push(preliminaryIdentity({input,savedRuleC,rights,exclusion:{round1Permanent:true,technicalUsePermitted:input.candidate.pilotCode==='RC-P2',preliminaryExcluded:input.candidate.pilotCode!=='RC-P2',basis:'Current explicit RC-P2 technical-pilot authorization only; original acquisition selection rule and Round 1 configuration unchanged.'}}));
  }
  const config=await readJson('config/mls-validation-round1.json');
  assert(config.status==='PRE_EXECUTION'&&config.executionAuthorized===false&&config.selectionLocked===false&&config.mlsAllowedBeforeFreeze===false&&config.cohortFingerprint===null,'ROUND1_AUTHORIZATION_CHANGED');
  return {items,identities,rules,rights,sourceFingerprint:manifest.sourceEvidenceSha256};
}

export async function financialInventory(input,identity){
  const records=[],matches=[],unbound=[];let scanned=0;
  for(const dir of ['data/runtime/rentcast','data/raw/rentcast','data/normalized']){
    let paths;try{paths=await filesUnder(dir);}catch(e){if(e.code==='ENOENT'){records.push({directory:dir,status:'NOT_PRESENT'});continue;}throw e;}
    for(const p of paths.filter(x=>x.endsWith('.json'))){
      const bytes=await readFile(p);let x;try{x=JSON.parse(bytes);}catch{throw new Error('RETAINED_JSON_UNREADABLE');}scanned++;
      const rows=Array.isArray(x.body)?x.body:Array.isArray(x)?x:x.body?.subjectProperty?[x.body.subjectProperty]:x.property?[x.property]:[x];
      const exact=rows.filter(r=>r&&(r.id===input.evidence.providerRecord.id||r.identifiers?.rentcastId===input.evidence.providerRecord.id||r.assessorID===input.evidence.providerRecord.assessorID));
      // Comparable rows from another subject's AVM are deliberately never searched.
      if(exact.length)matches.push({path:p,sha256:sha(bytes),exactSubjectRecords:exact.length,financialFieldsPresent:['price','priceRangeLow','comparables','lastSalePrice','propertyTaxes','taxAssessments'].filter(k=>Object.hasOwn(x.body??x,k)||exact.some(r=>Object.hasOwn(r,k)))});
      if(x.body?.comparables&&!exact.length)unbound.push({path:p,sha256:sha(bytes),reason:'NO_EXACT_SUBJECT_IDENTITY_BINDING_NOT_RC_P2_COMPS'});
    }
    records.push({directory:dir,status:'INSPECTED_EXACT_IDENTIFIERS_ONLY',jsonFiles:paths.filter(x=>x.endsWith('.json')).length});
  }
  // Do not silently promote newly discovered financial material without its
  // property binding, valuation date, rights and intended-use review.
  assert.equal(matches.length,0,'NEW_MATCHING_FINANCIAL_EVIDENCE_REQUIRES_REVIEW');
  const financialFields=['lastSalePrice','price','valuation','comparables','rehabCost','condition','financing'];
  assert(!financialFields.some(k=>Object.hasOwn(input.evidence.providerRecord,k)),'NEW_PILOT_FINANCIAL_EVIDENCE_REQUIRES_REVIEW');
  const inventory=missingInventory();
  const facts={classification:'PROVIDER_EVIDENCE',sourceRef:input.binding.evidencePath,sourceSha256:input.binding.evidenceFileSha256,asOf:input.evidence.providerAsOf??null,retrievedAt:input.evidence.retrievedAt,
    availableFields:['propertyType','bedrooms','bathrooms','squareFootage','lotSize','yearBuilt'].filter(k=>input.evidence.providerRecord[k]!=null),
    financialSuitability:'DESCRIPTIVE_ONLY_NOT_CONDITION_REHAB_ARV_OR_PRICE'};
  return {inventory,readiness:realReadinessResult(identity,inventory),evidenceInventory:{providerFacts:facts,countyFacts:{classification:'COUNTY_EVIDENCE',source:'PINNED_2026_FINAL_ASSESSMENT_AND_CANDIDATE',financialSuitability:'ASSESSMENT_OR_DISTRESS_SCREENING_IS_NOT_MARKET_VALUE_OR_ACQUISITION_PRICE'},
    comparableEvidence:{status:'NOT_LOCATED_FOR_EXACT_SUBJECT',intendedValuationDate:'NOT_SUPPLIED',arv:'UNVERIFIED',unrelatedBundlesRejected:unbound.length},
    inspected:records,jsonFilesScanned:scanned,exactSubjectMatches:0,unrelatedValuationBundles:unbound,
    limits:'Bounded inventory of original pilot, Rule C county projection and retained RentCast/normalized JSON. Not a scan of unrelated ATTOM bulk datasets, database or MLS; no new ingestion engine.'}};
}
