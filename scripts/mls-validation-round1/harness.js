import {createHash} from 'node:crypto';

export const PI_DISPOSITIONS=Object.freeze(['INVESTIGATE','WATCH','PASS']);
export const REALTOR_DISPOSITIONS=Object.freeze(['YES','MAYBE','NO']);
export const FAILURE_CATEGORIES=Object.freeze([
  'IDENTITY FAILURE','PROPERTY DATA FAILURE','DISTRESS DATA FAILURE','VALUATION FAILURE',
  'COMP SELECTION FAILURE','MORTGAGE / EQUITY FAILURE','TITLE / LIEN GAP','CONDITION GAP',
  'MARKET LIQUIDITY GAP','ECONOMIC MODEL FAILURE','MONTE CARLO ASSUMPTION FAILURE',
  'SELLER INTENT UNKNOWN','OTHER'
]);
export const REPORT_CODES=Object.freeze(Array.from({length:6},(_,i)=>`R1-P${String(i+1).padStart(2,'0')}`));

const normalizeAddress=value=>String(value??'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g,'');
const canonicalHash=value=>createHash('sha256').update(String(value),'utf8').digest('hex');
const canonicalJson=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const objectContainsForbiddenKey=value=>{
  if(!value||typeof value!=='object')return false;
  const forbidden=new Set(['mlsevidence','realtorjudgment','listingstatus','askingprice']);
  return Object.entries(value).some(([key,item])=>forbidden.has(key.toLowerCase())||objectContainsForbiddenKey(item));
};
const fail=code=>{throw new Error(`MLS_R1_${code}`);};

export function assertExecutionAuthorized(manifest){
  if(manifest?.executionAuthorized!==true)fail('EXECUTION_NOT_AUTHORIZED');
  if(manifest?.status!=='PRE_EXECUTION')fail('MANIFEST_STATUS_INVALID');
  if(!manifest?.experimentId||!Number.isInteger(manifest?.sampleSize)||manifest.sampleSize!==6)fail('MANIFEST_INVALID');
  if(manifest?.mlsAllowedBeforeFreeze!==false)fail('MLS_CONTAMINATION_GATE_INVALID');
  return true;
}

export function evaluateEligibility(candidates,manifest){
  const excluded=new Set((manifest?.excludedFixtures??[]).map(normalizeAddress));
  const idCounts=new Map();
  const propertyCounts=new Map();
  for(const row of candidates??[]){
    if(row?.candidateId)idCounts.set(String(row.candidateId),(idCounts.get(String(row.candidateId))??0)+1);
    if(row?.canonicalPropertyId)propertyCounts.set(String(row.canonicalPropertyId),(propertyCounts.get(String(row.canonicalPropertyId))??0)+1);
  }
  const eligible=[],rejected=[];
  for(const row of candidates??[]){
    const reasons=[];
    if(row?.isSynthetic===true||row?.qaTag||row?.recordKind==='QA')reasons.push('QA_OR_SYNTHETIC');
    if(idCounts.get(String(row?.candidateId))>1)reasons.push('DUPLICATE_CANDIDATE_ID');
    if(row?.canonicalPropertyId&&propertyCounts.get(String(row.canonicalPropertyId))>1)reasons.push('DUPLICATE_PROPERTY_ID');
    if(excluded.has(normalizeAddress(row?.address)))reasons.push('EXCLUDED_FIXTURE');
    if(String(row?.county??'').trim().toUpperCase()!=='KERN')reasons.push('OUTSIDE_KERN_COUNTY');
    if(!['CA','CALIFORNIA'].includes(String(row?.state??'').trim().toUpperCase()))reasons.push('OUTSIDE_CALIFORNIA');
    if(!['SFR','SINGLE FAMILY RESIDENTIAL','SINGLE_FAMILY_RESIDENTIAL'].includes(String(row?.propertyClass??'').trim().toUpperCase()))reasons.push('NOT_SINGLE_FAMILY_RESIDENTIAL');
    if(!row?.candidateId)reasons.push('MISSING_CANDIDATE_ID');
    if(!row?.canonicalPropertyId)reasons.push('MISSING_PROPERTY_IDENTITY');
    if(row?.canonicalAddressComplete!==true)reasons.push('INCOMPLETE_ADDRESS');
    if(row?.standardAnalysisReady!==true)reasons.push('STANDARD_ANALYSIS_NOT_READY');
    if(reasons.length)rejected.push({candidateId:row?.candidateId??null,reasons});
    else eligible.push(row);
  }
  return {eligible,rejected};
}

export function compareRankedCandidates(a,b){
  return String(a.rankHash).localeCompare(String(b.rankHash))||String(a.candidateId).localeCompare(String(b.candidateId));
}

export function selectRoundOne(candidates,manifest){
  assertExecutionAuthorized(manifest);
  if(typeof manifest.selectionSeed!=='string'||manifest.selectionSeed.length<16)fail('SELECTION_SEED_REQUIRED');
  if(typeof manifest.cohortFingerprint!=='string'||!/^[a-f0-9]{64}$/i.test(manifest.cohortFingerprint))fail('COHORT_FINGERPRINT_REQUIRED');
  const {eligible,rejected}=evaluateEligibility(candidates,manifest);
  if(eligible.length<manifest.sampleSize)fail('INSUFFICIENT_ELIGIBLE_POOL');
  const ranked=eligible.map(row=>({
    candidateId:String(row.candidateId),
    rankHash:canonicalHash(`${manifest.experimentId}\0${manifest.selectionSeed}\0${row.candidateId}`)
  })).sort(compareRankedCandidates);
  return {selected:ranked.slice(0,manifest.sampleSize).map(row=>row.candidateId),eligibleCount:eligible.length,rejectedCount:rejected.length,selectionFingerprint:canonicalHash(JSON.stringify({experimentId:manifest.experimentId,seed:manifest.selectionSeed,cohortFingerprint:manifest.cohortFingerprint,ranked}))};
}

export function validateFrozenReport(report){
  const errors=[];
  if(!REPORT_CODES.includes(report?.codedPropertyId))errors.push('INVALID_CODE');
  if(report?.preMLS!==true)errors.push('NOT_PRE_MLS');
  if(!report?.generatedAt||Number.isNaN(Date.parse(report.generatedAt)))errors.push('INVALID_GENERATED_AT');
  for(const key of ['analysisVersion','assumptionsVersion','monteCarloVersion'])if(typeof report?.[key]!=='string'||!report[key].trim())errors.push(`MISSING_${key.toUpperCase()}`);
  if(typeof report?.evidenceStackFingerprint!=='string'||!/^[a-f0-9]{64}$/i.test(report.evidenceStackFingerprint))errors.push('INVALID_EVIDENCE_STACK_FINGERPRINT');
  if(!PI_DISPOSITIONS.includes(report?.piDisposition))errors.push('INVALID_PI_DISPOSITION');
  if(!Array.isArray(report?.sourceEvidenceRefs)||report.sourceEvidenceRefs.length===0||report.sourceEvidenceRefs.some(value=>typeof value!=='string'||!value.trim()))errors.push('MISSING_SOURCE_EVIDENCE');
  if(typeof report?.serializedContent!=='string'||!report.serializedContent.length)errors.push('MISSING_SERIALIZED_CONTENT');
  if(objectContainsForbiddenKey(report))errors.push('MLS_CONTAMINATION_FORBIDDEN_KEY');
  if(typeof report?.serializedContent==='string'){
    try{if(objectContainsForbiddenKey(JSON.parse(report.serializedContent)))errors.push('MLS_CONTAMINATION_SERIALIZED_CONTENT');}catch{}
  }
  return {valid:errors.length===0,errors};
}

export function createFreezeManifest({experimentId,reports}){
  if(!Array.isArray(reports)||reports.length!==6)fail('FREEZE_REQUIRES_SIX_REPORTS');
  const codes=reports.map(row=>row?.codedPropertyId);
  if(new Set(codes).size!==6||REPORT_CODES.some(code=>!codes.includes(code)))fail('FREEZE_REPORT_CODES_INVALID');
  const invalid=reports.flatMap(row=>validateFrozenReport(row).errors.map(error=>`${row?.codedPropertyId??'UNKNOWN'}:${error}`));
  if(invalid.length)fail(`FREEZE_REPORT_INVALID:${invalid.join(',')}`);
  const assumptions=new Set(reports.map(row=>row.assumptionsVersion));
  const monteCarlo=new Set(reports.map(row=>row.monteCarloVersion));
  const analysis=new Set(reports.map(row=>row.analysisVersion));
  if(assumptions.size!==1||monteCarlo.size!==1||analysis.size!==1)fail('FREEZE_VERSION_MISMATCH');
  const entries=reports.map(row=>Object.freeze({codedPropertyId:row.codedPropertyId,reportSha256:canonicalHash(canonicalJson(row)),evidenceStackFingerprint:row.evidenceStackFingerprint,analysisVersion:row.analysisVersion,assumptionsVersion:row.assumptionsVersion,monteCarloVersion:row.monteCarloVersion,piDisposition:row.piDisposition})).sort((a,b)=>a.codedPropertyId.localeCompare(b.codedPropertyId));
  const frozen={experimentId,status:'FROZEN_PRE_MLS',reportCount:6,reports:entries,manifestSha256:canonicalHash(canonicalJson({experimentId,reports:entries}))};
  return Object.freeze(frozen);
}

export function verifyFrozenReport(frozenManifest,report){
  const entry=frozenManifest?.reports?.find(row=>row.codedPropertyId===report?.codedPropertyId);
  if(!entry)return false;
  return validateFrozenReport(report).valid&&entry.reportSha256===canonicalHash(canonicalJson(report))&&entry.evidenceStackFingerprint===report.evidenceStackFingerprint&&entry.analysisVersion===report.analysisVersion&&entry.assumptionsVersion===report.assumptionsVersion&&entry.monteCarloVersion===report.monteCarloVersion&&entry.piDisposition===report.piDisposition;
}

export function assertReportWriteAllowed(frozenManifest,codedPropertyId){
  if(frozenManifest?.reports?.some(row=>row.codedPropertyId===codedPropertyId))fail('FROZEN_REPORT_IMMUTABLE');
  return true;
}

export function validateRealtorScorecard(scorecard){
  const errors=[];
  if(!REPORT_CODES.includes(scorecard?.codedPropertyId))errors.push('INVALID_CODE');
  if(!REALTOR_DISPOSITIONS.includes(scorecard?.investigationJudgment))errors.push('INVALID_REALTOR_DISPOSITION');
  if(!['STRONG','ACCEPTABLE','WEAK'].includes(scorecard?.compQuality))errors.push('INVALID_COMP_QUALITY');
  if(!['CREDIBLE','QUESTIONABLE','UNREALISTIC'].includes(scorecard?.economicCredibility))errors.push('INVALID_ECONOMIC_CREDIBILITY');
  if(!['TURNKEY','LIGHT_COSMETIC','MODERATE_REHABILITATION','HEAVY_REHABILITATION','MAJOR_STRUCTURAL_OR_UNKNOWN','INSUFFICIENT_MLS_EVIDENCE'].includes(scorecard?.conditionAssessment))errors.push('INVALID_CONDITION');
  if(!['ACTIVE','PENDING','NO_ACTIVE_MLS_LISTING','EXPIRED','WITHDRAWN','CANCELLED','OTHER','UNKNOWN'].includes(scorecard?.listingStatus))errors.push('INVALID_LISTING_STATUS');
  if(!scorecard?.reviewedAt||Number.isNaN(Date.parse(scorecard.reviewedAt)))errors.push('INVALID_REVIEWED_AT');
  if(typeof scorecard?.independentJudgmentLocked!=='boolean')errors.push('MISSING_INDEPENDENCE_LOCK');
  return {valid:errors.length===0,errors};
}

export function classifyDispositionAgreement(pi,realtor){
  if(!PI_DISPOSITIONS.includes(pi)||!REALTOR_DISPOSITIONS.includes(realtor))fail('INVALID_DISPOSITION');
  const piScore={INVESTIGATE:2,WATCH:1,PASS:0}[pi];
  const realtorScore={YES:2,MAYBE:1,NO:0}[realtor];
  const distance=Math.abs(piScore-realtorScore);
  return {distance,classification:distance===0?'AGREE':distance===1?'PARTIAL AGREEMENT':'DISAGREE'};
}

export function validateFailureCategory(category){return FAILURE_CATEGORIES.includes(category);}
