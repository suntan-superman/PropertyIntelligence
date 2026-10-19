// Local preliminary contracts only. No canonical repository, persistence or transport.
import assert from 'node:assert/strict';
import {reconcile,RULE_C} from '../rentcast-reconciliation-v1-1/reconcile.js';
import {addressComparison} from '../rentcast-controlled-pilot/core.js';
import {fingerprint,deepFreeze,normalizeInput,validateResult,VARIABLES,MODEL_VERSION,ECONOMICS_VERSION} from '../../src/analysis/monteCarlo/contract.js';
import {MAO_MODEL_VERSION} from '../../src/underwriting/mao.js';
import {runMonteCarlo} from '../../src/analysis/monteCarlo/index.js';

export const IDENTITY_VERSION='PI_PRELIMINARY_IDENTITY_V1';
export const RESULT_VERSION='PI_PRELIMINARY_RESULT_V1';
export const AUTHORIZATION='USER_2026_10_12_RC_P2_LOCAL_TECHNICAL_PRELIMINARY_PILOT';
export const SYNTHETIC_LABEL="SYNTHETIC FINANCIAL DEMONSTRATION — NOT AN ANALYSIS OF RC-P2'S ACTUAL INVESTMENT VALUE";
export const DISABLED=Object.freeze({finalIdentityApproval:false,durablePersistence:false,investmentDecision:false,offer:false,mlsRound1:false});
export const ECONOMIC_PATHS=[...['purchasePrice','exitValue','rehabCost','rehabContingencyRate','acquisitionFixed','acquisitionRate','sellingCommissionRate','sellerClosingFixed','sellerClosingRate','transferCost','otherUpfront','otherAtExit','renovationDays','marketingDays'].map(k=>`economics.${k}`),
  ...['propertyTaxes','insurance','utilities','maintenance','other'].map(k=>`economics.holdingDaily.${k}`),...['mode','ltv','annualRate','points','fees'].map(k=>`economics.financing.${k}`)];
export const REQUIRED=[...ECONOMIC_PATHS,'target.type','target.rate',...VARIABLES.map(k=>`uncertainty.variables.${k}`),'uncertainty.dependence','condition','comparableSales','valuationDate'];
export const CLASSIFICATIONS=['PROVIDER_EVIDENCE','COUNTY_EVIDENCE','ANALYST_ESTIMATE','INVESTOR_ASSUMPTION','SYNTHETIC_TEST','MISSING'];
const get=(x,p)=>p.split('.').reduce((v,k)=>v?.[k],x);
const hashOk=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const seal=(x,key)=>deepFreeze({...x,[key]:fingerprint(x)});
const validSeal=(x,key)=>{if(!x)return false;const {[key]:h,...body}=x;return h===fingerprint(body);};
export function assertIdentity(identity){
  assert(validSeal(identity,'identityFingerprint'),'PRELIMINARY_IDENTITY_CHANGED');
  assert.equal(identity.schemaVersion,IDENTITY_VERSION);
  assert.deepEqual(identity.authorizations,DISABLED,'FINAL_AUTHORITY_FORBIDDEN');
  assert.equal(identity.currentParcelActivity,'UNVERIFIED');assert.equal(identity.splitMergeVerification,'UNVERIFIED');
}
export function preliminaryIdentity({input,savedRuleC,rights,exclusion,authority=AUTHORIZATION}){
  const r=reconcile(input),c=input.candidate,e=input.evidence,problems=[];
  const require=(ok,code)=>{if(!ok)problems.push(code);};
  require(r.reconciliationFingerprint===savedRuleC?.reconciliationFingerprint&&JSON.stringify(r)===JSON.stringify(savedRuleC),'RULE_C_BINDING_INVALID');
  require(r.historicalSourceCrosswalk.status==='PASS'&&r.historicalSourceCrosswalk.strategy===RULE_C&&r.ruleCEvaluation==='PASS','HISTORICAL_RELATIONSHIP_UNRESOLVED');
  require(r.contradictions.length===0,'MATERIAL_IDENTITY_CONTRADICTION');
  require(e.reconciliation?.matchClassification==='APN_CONFLICT','ORIGINAL_HISTORY_CHANGED');
  require(rights?.rentcastAnalysis===true&&rights?.countyLocalAnalysis===true&&hashOk(rights?.rentcastSha256)&&hashOk(rights?.countyDisclaimerSha256),'SOURCE_RIGHTS_UNAVAILABLE');
  require(addressComparison(c.requestAddress,e.providerRecord).allAgree,'ADDRESS_INCOMPLETE_OR_CONFLICTING');
  require(c.pilotCode==='RC-P2'&&authority===AUTHORIZATION,'PILOT_NOT_AUTHORIZED');
  require(exclusion?.technicalUsePermitted===true&&exclusion?.preliminaryExcluded===false&&exclusion?.round1Permanent===true,'EXCLUSION_SCOPE_BLOCKED');
  const body={schemaVersion:IDENTITY_VERSION,preliminaryCandidateId:`PA-${fingerprint({candidate:c.candidateId,county:c.county}).slice(0,24)}`,
    jurisdiction:{county:'Kern',state:'CA',source:'ORIGINAL_COUNTY_JURISDICTION'},
    originalSourceReferences:{candidateId:c.candidateId,county:c.county,assessorId:c.assessor?.id??null,sourceRecordReference:c.sourceRecordReference},
    providerReferences:{source:'RENTCAST',id:e.providerRecord.id,assessorId:e.providerRecord.assessorID},
    originalClassification:e.reconciliation.matchClassification,historicalCountyIdentity:r.historicalSourceCrosswalk,
    addressEvidence:{status:addressComparison(c.requestAddress,e.providerRecord).allAgree?(rights?.rentcastAnalysis===true?'COMPLETE_LICENSED_CANDIDATE':'COMPLETE_RIGHTS_UNVERIFIED'):'INCOMPLETE_OR_CONFLICTING',analystVerified:false,postalValidated:false},
    currentParcelActivity:'UNVERIFIED',splitMergeVerification:'UNVERIFIED',identityContradictions:r.contradictions,
    identityConfidence:r.historicalSourceCrosswalk.status==='PASS'&&r.contradictions.length===0?'SOURCE_SUPPORTED_HISTORICAL_RELATIONSHIP_NOT_CURRENTLY_VERIFIED':'UNRESOLVED_PRELIMINARY_IDENTITY',
    evidenceFingerprints:{originalMapping:input.binding.mappingFileSha256,originalEvidence:input.binding.evidenceFileSha256,ruleC:r.reconciliationFingerprint,...input.source.fingerprints},
    sourceDates:{county:c.evidenceDates,providerRetrieved:e.retrievedAt,providerAsOf:e.providerAsOf??null},rights,
    stages:{screening:problems.length?'BLOCKED':'ELIGIBLE',investmentAnalysis:'FINANCIAL_READINESS_REQUIRED',transactionDueDiligence:'NOT_VERIFIED'},
    preliminaryAnalysisAuthorization:{reference:authority,scope:'LOCAL_TECHNICAL_PILOT_ONLY',eligible:problems.length===0},exclusion,
    finalIdentityApprovalStatus:'NOT_AUTHORIZED',authorizations:{...DISABLED},problems};
  return seal(body,'identityFingerprint');
}
export function missingInventory(){return Object.fromEntries(REQUIRED.map(k=>[k,{classification:'MISSING',value:null,sourceRef:null,sourceSha256:null,asOf:null,rightsPermitted:false,subjectReference:null,rationale:'No supported retained input or supplied assumption located.'}]));}
export function financialReadiness(identity,inventory,modelInput=null){
  assertIdentity(identity);const missing=[],invalid=[];let available=0;
  for(const key of Object.keys(inventory))if(!REQUIRED.includes(key))invalid.push(`UNEXPECTED_INPUT:${key}`);
  for(const key of REQUIRED){
    const item=inventory[key];
    if(!item||item.classification==='MISSING'||item.value===null||item.value===undefined){missing.push(key);continue;}
    const ok=CLASSIFICATIONS.includes(item.classification)&&item.classification!=='SYNTHETIC_TEST'&&item.rightsPermitted===true
      &&item.subjectReference===identity.preliminaryCandidateId&&hashOk(item.sourceSha256)&&typeof item.sourceRef==='string'&&item.sourceRef.length>0
      &&typeof item.rationale==='string'&&item.rationale.length>0&&typeof item.asOf==='string'&&Number.isFinite(Date.parse(item.asOf))
      &&(!['ANALYST_ESTIMATE','INVESTOR_ASSUMPTION'].includes(item.classification)||(typeof item.providedBy==='string'&&item.providedBy.trim().length>0));
    if(!ok){invalid.push(key);continue;}available++;
    if(!['condition','comparableSales','valuationDate'].includes(key)&&modelInput&&(get(modelInput,key)===undefined||fingerprint(item.value)!==fingerprint(get(modelInput,key))))invalid.push(`VALUE_MISMATCH:${key}`);
    if(key==='condition'&&(typeof item.value!=='string'||!item.value.trim()))invalid.push(key);
    if(key==='valuationDate'&&(typeof item.value!=='string'||!Number.isFinite(Date.parse(item.value))))invalid.push(key);
    if(key==='comparableSales'&&(!Array.isArray(item.value)||item.value.length===0||!item.value.every(x=>typeof x.reference==='string'&&x.reference.length>0&&Number.isFinite(x.price)&&x.price>0&&Number.isFinite(Date.parse(x.saleDate)))))invalid.push(key);
  }
  if(modelInput){
    try{normalizeInput(modelInput);}catch{invalid.push('INVALID_MODEL_INPUT_OR_FINANCING');}
    for(const [key,p] of Object.entries(modelInput.provenance??{})){
      const item=inventory[key];if(!item||p.classification!==item.classification||p.reference!==item.sourceRef||p.asOf!==item.asOf||p.rationale!==item.rationale)invalid.push(`PROVENANCE_MISMATCH:${key}`);
    }
  }
  const sufficient=identity.preliminaryAnalysisAuthorization.eligible&&missing.length===0&&invalid.length===0&&modelInput!==null;
  return deepFreeze({status:sufficient?'FINANCIAL_INPUTS_SUFFICIENT':available?'FINANCIAL_INPUTS_PARTIAL':'FINANCIAL_INPUTS_INSUFFICIENT',available,required:REQUIRED.length,
    missing,invalid:[...new Set(invalid)],arvVerified:!missing.includes('economics.exitValue')&&!missing.includes('comparableSales')&&!invalid.length,
    analysisPermitted:sufficient,inventoryFingerprint:fingerprint(inventory)});
}
export function realReadinessResult(identity,inventory,modelInput=null){
  const readiness=financialReadiness(identity,inventory,modelInput);
  // The only calculation path is after all required financial and identity gates.
  const analysis=readiness.analysisPermitted?runMonteCarlo(modelInput):null;
  return seal({schemaVersion:RESULT_VERSION,preliminaryCandidateReference:identity.preliminaryCandidateId,identityFingerprint:identity.identityFingerprint,
    analysisMode:'REAL_EVIDENCE_READINESS',identityConfidence:identity.identityConfidence,evidenceCompleteness:{address:identity.addressEvidence.status,financial:readiness.status},
    financialReadiness:readiness,modelVersions:{monteCarlo:MODEL_VERSION,economics:ECONOMICS_VERSION,deterministicMao:ECONOMICS_VERSION,unchangedMaoCompatibilityReference:MAO_MODEL_VERSION},
    assumptions:inventory,sourceFingerprints:identity.evidenceFingerprints,missingEvidence:readiness.missing,currentParcelStatus:'UNVERIFIED',
    analysis,realFinancialAnalysisExecuted:analysis!==null,authorizations:{...DISABLED},
    limitations:['PRELIMINARY ONLY — not verified for transaction use.','Historical identity does not establish current activity or unchanged split/merge status.','No offer, investment approval, durable persistence or MLS selection authorized.','Missing costs are unknown, not zero; no appraisal or calibrated identity-confidence score.']},'resultFingerprint');
}
export function syntheticResult(input,analysis){
  validateResult(analysis);
  assert(Object.values(input.provenance).every(p=>p.classification==='SYNTHETIC_TEST_FIXTURE'),'SYNTHETIC_PROVENANCE_REQUIRED');
  assert(input.scenarioId.startsWith('SYNTHETIC_MC_'),'SYNTHETIC_IDENTITY_REQUIRED');
  assert.equal(analysis.provenance.inputFingerprint,fingerprint(normalizeInput(input)));
  return seal({schemaVersion:RESULT_VERSION,preliminaryCandidateReference:`DEMO-${fingerprint(input).slice(0,24)}`,analysisMode:'SYNTHETIC_FINANCIAL_DEMONSTRATION',
    label:SYNTHETIC_LABEL,identityConfidence:'SYNTHETIC_NO_REAL_IDENTITY',evidenceCompleteness:'SYNTHETIC_TEST_ONLY',financialReadiness:'SYNTHETIC_ONLY_NOT_REAL_FINANCIAL_READINESS',
    modelVersions:{monteCarlo:analysis.modelVersion,economics:analysis.economicsVersion,deterministicMao:analysis.economicsVersion,unchangedMaoCompatibilityReference:MAO_MODEL_VERSION},assumptionProvenance:input.provenance,
    sourceFingerprints:analysis.provenance,missingEvidence:['All real property-specific financial evidence'],currentParcelStatus:'UNVERIFIED',
    analysis,realFinancialAnalysisExecuted:false,authorizations:{...DISABLED},limitations:[SYNTHETIC_LABEL,...analysis.limitations]},'resultFingerprint');
}
export const validateResultSeal=result=>assert(validSeal(result,'resultFingerprint'),'PRELIMINARY_RESULT_CHANGED');
