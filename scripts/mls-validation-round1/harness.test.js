import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  REPORT_CODES,FAILURE_CATEGORIES,assertExecutionAuthorized,evaluateEligibility,compareRankedCandidates,
  selectRoundOne,validateFrozenReport,createFreezeManifest,verifyFrozenReport,assertReportWriteAllowed,
  validateRealtorScorecard,classifyDispositionAgreement,validateFailureCategory
} from './harness.js';

const manifest=()=>({experimentId:'PI_MLS_VALIDATION_R1',status:'PRE_EXECUTION',sampleSize:6,excludedFixtures:['3484 Haven St, Rosamond, CA 93560'],mlsAllowedBeforeFreeze:false,executionAuthorized:false,selectionSeed:null,cohortFingerprint:null});
const candidate=(n,overrides={})=>({candidateId:`synthetic-candidate-${n}`,canonicalPropertyId:`synthetic-property-${n}`,address:`${n} Example Street, Rosamond, CA 93560`,county:'KERN',state:'CA',propertyClass:'SINGLE_FAMILY_RESIDENTIAL',canonicalAddressComplete:true,standardAnalysisReady:true,...overrides});
const reports=()=>REPORT_CODES.map((codedPropertyId,index)=>({codedPropertyId,preMLS:true,generatedAt:'2026-01-01T00:00:00.000Z',analysisVersion:'synthetic-analysis-v1',evidenceStackFingerprint:`${String(index+1).repeat(64)}`.slice(0,64),assumptionsVersion:'synthetic-assumptions-v1',monteCarloVersion:'synthetic-mc-v1',piDisposition:['INVESTIGATE','WATCH','PASS'][index%3],sourceEvidenceRefs:[`synthetic-evidence-${index+1}`],serializedContent:`synthetic pre-MLS report ${index+1}`}));

test('the checked-in manifest is pre-execution and cannot authorize a selection',async()=>{
  const config=JSON.parse(await readFile(new URL('../../config/mls-validation-round1.json',import.meta.url),'utf8'));
  assert.equal(config.status,'PRE_EXECUTION');
  assert.equal(config.executionAuthorized,false);
  assert.equal(config.sampleSize,6);
  assert.equal(config.selectionLocked,false);
  assert.equal(config.evidenceStackLocked,false);
  assert.equal(config.assumptionsLocked,false);
  assert.equal(config.monteCarloLocked,false);
  assert.equal(config.mlsAllowedBeforeFreeze,false);
  assert.deepEqual(config.excludedFixtures,['3484 Haven St, Rosamond, CA 93560']);
  assert.throws(()=>assertExecutionAuthorized(config),/MLS_R1_EXECUTION_NOT_AUTHORIZED/);
});

test('eligibility excludes the named fixture, QA data, wrong geography/type and missing identity without fuzzy address linking',()=>{
  const rows=[
    ...Array.from({length:6},(_,index)=>candidate(index+1)),
    candidate(7,{address:'3484 Haven St, Rosamond, CA 93560'}),
    candidate(8,{isSynthetic:true}),
    candidate(9,{county:'TULARE'}),
    candidate(10,{propertyClass:'MULTIFAMILY'}),
    candidate(11,{canonicalAddressComplete:false}),
    candidate(12,{canonicalPropertyId:null}),
    candidate(13,{standardAnalysisReady:false})
  ];
  const result=evaluateEligibility(rows,manifest());
  assert.equal(result.eligible.length,6);
  const reasons=result.rejected.flatMap(row=>row.reasons);
  for(const reason of ['EXCLUDED_FIXTURE','QA_OR_SYNTHETIC','OUTSIDE_KERN_COUNTY','NOT_SINGLE_FAMILY_RESIDENTIAL','INCOMPLETE_ADDRESS','MISSING_PROPERTY_IDENTITY','STANDARD_ANALYSIS_NOT_READY'])assert.ok(reasons.includes(reason),reason);
});

test('missing values remain ineligible and duplicate candidate/property identities fail closed',()=>{
  const duplicate=candidate(1);
  const rows=[candidate(1,{candidateId:'same-id'}),candidate(2,{candidateId:'same-id'}),candidate(3,{canonicalPropertyId:'same-property'}),candidate(4,{canonicalPropertyId:'same-property'}),candidate(5,{county:null}),candidate(6,{propertyClass:null})];
  const result=evaluateEligibility(rows,manifest());
  assert.equal(result.eligible.length,0);
  assert.ok(result.rejected.some(row=>row.reasons.includes('DUPLICATE_CANDIDATE_ID')));
  assert.ok(result.rejected.some(row=>row.reasons.includes('DUPLICATE_PROPERTY_ID')));
  assert.ok(result.rejected.some(row=>row.reasons.includes('OUTSIDE_KERN_COUNTY')));
  assert.ok(result.rejected.some(row=>row.reasons.includes('NOT_SINGLE_FAMILY_RESIDENTIAL')));
  assert.notEqual(duplicate.candidateId,rows[0].candidateId);
});

test('selection requires explicit authorization, seed and cohort fingerprint, then deterministically selects six',()=>{
  const frozen={...manifest(),executionAuthorized:true,selectionSeed:'synthetic-seed-fixed-2026',cohortFingerprint:'a'.repeat(64)};
  const rows=Array.from({length:8},(_,index)=>candidate(index+1));
  const first=selectRoundOne(rows,frozen),second=selectRoundOne([...rows].reverse(),frozen);
  assert.deepEqual(first,second);
  assert.equal(first.selected.length,6);
  assert.equal(new Set(first.selected).size,6);
  assert.match(first.selectionFingerprint,/^[a-f0-9]{64}$/);
  assert.throws(()=>selectRoundOne(rows,manifest()),/MLS_R1_EXECUTION_NOT_AUTHORIZED/);
  assert.throws(()=>selectRoundOne(rows,{...frozen,selectionSeed:null}),/MLS_R1_SELECTION_SEED_REQUIRED/);
  assert.throws(()=>selectRoundOne(rows,{...frozen,cohortFingerprint:null}),/MLS_R1_COHORT_FINGERPRINT_REQUIRED/);
  assert.throws(()=>selectRoundOne(rows.slice(0,5),frozen),/MLS_R1_INSUFFICIENT_ELIGIBLE_POOL/);
});

test('rank tie-breaking is stable by candidate identifier',()=>{
  const tied=[{rankHash:'same',candidateId:'synthetic-b'},{rankHash:'same',candidateId:'synthetic-a'}].sort(compareRankedCandidates);
  assert.deepEqual(tied.map(row=>row.candidateId),['synthetic-a','synthetic-b']);
});

test('frozen report schema requires pre-MLS evidence and rejects MLS/realtor contamination',()=>{
  const valid=reports()[0];
  assert.deepEqual(validateFrozenReport(valid),{valid:true,errors:[]});
  assert.ok(validateFrozenReport({...valid,preMLS:false}).errors.includes('NOT_PRE_MLS'));
  assert.ok(validateFrozenReport({...valid,mlsEvidence:{listingStatus:'ACTIVE'}}).errors.some(error=>error.startsWith('MLS_CONTAMINATION_')));
  assert.ok(validateFrozenReport({...valid,sourceEvidenceRefs:[{listingStatus:'ACTIVE'}]}).errors.some(error=>error.startsWith('MLS_CONTAMINATION_')));
  assert.ok(validateFrozenReport({...valid,serializedContent:JSON.stringify({mlsEvidence:{askingPrice:1}})}).errors.some(error=>error.startsWith('MLS_CONTAMINATION_')));
  assert.ok(validateFrozenReport({...valid,realtorJudgment:'YES'}).errors.some(error=>error.startsWith('MLS_CONTAMINATION_')));
});

test('six-report freeze hashes are reproducible and mutation is detected',()=>{
  const baseline=reports(),frozen=createFreezeManifest({experimentId:'PI_MLS_VALIDATION_R1',reports:baseline});
  assert.equal(frozen.reportCount,6);
  assert.ok(Object.isFrozen(frozen));
  assert.ok(Object.isFrozen(frozen.reports[0]));
  assert.throws(()=>assertReportWriteAllowed(frozen,'R1-P01'),/MLS_R1_FROZEN_REPORT_IMMUTABLE/);
  assert.equal(assertReportWriteAllowed(frozen,'R1-P99'),true);
  for(const report of baseline)assert.equal(verifyFrozenReport(frozen,report),true);
  assert.equal(verifyFrozenReport(frozen,{...baseline[0],serializedContent:'tampered synthetic report'}),false);
  assert.equal(verifyFrozenReport(frozen,{...baseline[0],sourceEvidenceRefs:['changed synthetic evidence ref']}),false);
  assert.throws(()=>createFreezeManifest({experimentId:'PI_MLS_VALIDATION_R1',reports:baseline.slice(0,5)}),/MLS_R1_FREEZE_REQUIRES_SIX_REPORTS/);
  assert.throws(()=>createFreezeManifest({experimentId:'PI_MLS_VALIDATION_R1',reports:[...baseline.slice(0,5),{...baseline[5],codedPropertyId:baseline[4].codedPropertyId}]}),/MLS_R1_FREEZE_REPORT_CODES_INVALID/);
  assert.throws(()=>createFreezeManifest({experimentId:'PI_MLS_VALIDATION_R1',reports:baseline.map((row,index)=>index===5?{...row,assumptionsVersion:'other-version'}:row)}),/MLS_R1_FREEZE_VERSION_MISMATCH/);
});

test('realtor scorecard enums and independence lock are validated',()=>{
  const valid={codedPropertyId:'R1-P01',investigationJudgment:'MAYBE',compQuality:'ACCEPTABLE',economicCredibility:'QUESTIONABLE',conditionAssessment:'LIGHT_COSMETIC',listingStatus:'NO_ACTIVE_MLS_LISTING',reviewedAt:'2026-01-02T00:00:00.000Z',independentJudgmentLocked:true};
  assert.deepEqual(validateRealtorScorecard(valid),{valid:true,errors:[]});
  assert.ok(validateRealtorScorecard({...valid,investigationJudgment:'INVESTIGATE'}).errors.includes('INVALID_REALTOR_DISPOSITION'));
  assert.ok(validateRealtorScorecard({...valid,independentJudgmentLocked:null}).errors.includes('MISSING_INDEPENDENCE_LOCK'));
});

test('disposition agreement mapping and failure taxonomy are closed enumerations',()=>{
  assert.deepEqual(classifyDispositionAgreement('INVESTIGATE','YES'),{distance:0,classification:'AGREE'});
  assert.deepEqual(classifyDispositionAgreement('WATCH','YES'),{distance:1,classification:'PARTIAL AGREEMENT'});
  assert.deepEqual(classifyDispositionAgreement('PASS','YES'),{distance:2,classification:'DISAGREE'});
  assert.throws(()=>classifyDispositionAgreement('UNKNOWN','YES'),/MLS_R1_INVALID_DISPOSITION/);
  assert.deepEqual(FAILURE_CATEGORIES.length,13);
  for(const category of FAILURE_CATEGORIES)assert.equal(validateFailureCategory(category),true);
  assert.equal(validateFailureCategory('UNREGISTERED FAILURE'),false);
});

test('template artifacts remain unpopulated and specify all six coded slots',async()=>{
  const results=await readFile(new URL('../../docs/MLS_VALIDATION_ROUND1_RESULTS.md',import.meta.url),'utf8');
  for(const code of REPORT_CODES)assert.ok(results.includes(`### ${code}`));
  assert.match(results,/TEMPLATE — NOT EXECUTED/);
  assert.doesNotMatch(results,/\b\d{1,5} [A-Z][a-z]+ (St|Street|Ave|Road|Rd|Blvd)\b/);
});
