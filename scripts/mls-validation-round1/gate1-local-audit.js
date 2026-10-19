import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseCsv, parseAmount} from '../../src/sources/kern/csv.js';
import {normalizeAtn, normalizeApn9} from '../sprint6_2/core.js';

// Local-only Gate 1 artifact builder. No environment loading, network, database,
// selection, or analysis. Raw situs and distress amounts are used only to
// classify evidence and are never copied to the private manifest.
const root=process.cwd();
const crosswalkPath=resolve(root,'data/validation/sprint6_2-kern-atn-crosswalk.csv');
const ptsPath=resolve(root,'data/raw/kern_power_to_sell_2026-09-15.csv');
const situsPath=resolve(root,'data/runtime/sprint6_2-kern-assessor/exact-situs.json');
const exclusionPath=resolve(root,'data/validation/sprint6_3_3-reconciliation-dry-run.json');
const manifestPath=resolve(root,'config/mls-validation-round1.json');
const outputPath=resolve(root,'data/runtime/mls-round1/private-candidate-eligibility.json');

function records(csv){
  const parsed=parseCsv(csv);
  return parsed.rows.map(values=>Object.fromEntries(parsed.headers.map((key,index)=>[key,values[index]??''])));
}
function assert(condition,message){if(!condition)throw new Error(`GATE1_AUDIT_STOP:${message}`);}

const [crosswalkCsv,ptsCsv,situsText,exclusionText,manifestText]=await Promise.all([
  readFile(crosswalkPath,'utf8'),readFile(ptsPath,'utf8'),readFile(situsPath,'utf8'),
  readFile(exclusionPath,'utf8'),readFile(manifestPath,'utf8')
]);
const crosswalk=records(crosswalkCsv),pts=records(ptsCsv),situs=JSON.parse(situsText);
const exclusion=JSON.parse(exclusionText),manifest=JSON.parse(manifestText);
assert(manifest.executionAuthorized===false&&manifest.status==='PRE_EXECUTION','manifest authorization is not closed');
assert(exclusion?.candidate?.atn&&exclusion?.canonicalAddress?.analystConfirmed===true,'certified excluded-fixture identity proof missing');

const ptsByAtn=new Map();
for(const row of pts){
  const atn=normalizeAtn(row.atn);if(!atn)continue;
  if(!ptsByAtn.has(atn))ptsByAtn.set(atn,[]);
  ptsByAtn.get(atn).push(row);
}
const priorityCounts=Object.fromEntries(['HIGH_REVIEW_PRIORITY','MEDIUM_REVIEW_PRIORITY','LOW_REVIEW_PRIORITY'].map(key=>[key,crosswalk.filter(row=>row.priority===key).length]));
const sourceDates=[...new Set(pts.map(row=>row.source_date).filter(Boolean))];
const situsByAtn=new Map(situs.map(row=>[normalizeAtn(row.atn),row]));
const inScope=crosswalk.filter(row=>row.priority==='HIGH_REVIEW_PRIORITY'&&row.use_category==='RESIDENTIAL_SINGLE_FAMILY');
assert(pts.length===11321&&ptsByAtn.size===11316&&pts.length-ptsByAtn.size===5&&crosswalk.length===11316,'source/crosswalk population changed');
assert(JSON.stringify(priorityCounts)===JSON.stringify({HIGH_REVIEW_PRIORITY:312,MEDIUM_REVIEW_PRIORITY:701,LOW_REVIEW_PRIORITY:10303}),'priority counts changed');
assert(inScope.length===81,'High-priority SFR count changed');
assert(sourceDates.length===1,'Power-to-Sell as-of date is ambiguous');

const atnCounts=new Map(),apnCounts=new Map();
for(const row of inScope){
  const atn=normalizeAtn(row.normalized_pts_atn),apn=normalizeApn9(row.apn9);
  if(atn)atnCounts.set(atn,(atnCounts.get(atn)??0)+1);
  if(apn)apnCounts.set(apn,(apnCounts.get(apn)??0)+1);
}
const privateRows=inScope.map(row=>{
  const atn=normalizeAtn(row.normalized_pts_atn),apn=normalizeApn9(row.apn9);
  const sourceRows=ptsByAtn.get(atn)??[];
  const sourceHasDistress=sourceRows.some(source=>{
    const parcel=parseAmount(source.parcel_amount_owed),ownerTotal=parseAmount(source.owner_total_owed);
    return parcel!==null&&ownerTotal!==null&&(parcel>0||ownerTotal>0);
  });
  const countySitus=situsByAtn.get(atn);
  const excluded=atn===normalizeAtn(exclusion.candidate.atn);
  const canonical=excluded&&exclusion.canonicalAddress?.analystConfirmed===true
    ?'VERIFIED_ANALYST_CONFIRMED_EXCLUDED_FIXTURE':'NOT_ESTABLISHED_IN_APPROVED_LOCAL_SNAPSHOT';
  const durable=excluded&&exclusion.linkState?.activeLinkCount===1
    ?'ACTIVE_PROPERTY_LINK_VERIFIED_EXCLUDED_FIXTURE':'UNKNOWN_NOT_IN_LOCAL_COHORT_SNAPSHOT';
  const duplicates=[];
  if(!atn)duplicates.push('INVALID_OR_MISSING_ATN');
  else if(atnCounts.get(atn)!==1)duplicates.push('DUPLICATE_ATN_IN_EVALUATED_POPULATION');
  if(!apn)duplicates.push('INVALID_OR_MISSING_APN9');
  else if(apnCounts.get(apn)!==1)duplicates.push('DUPLICATE_APN9_IN_EVALUATED_POPULATION');
  const identityConflict=row.match_status!=='MATCHED_EXACT'||String(row.assessor_rows??'').split('|').length!==1
    ||normalizeAtn(row.matched_assessor_atn)!==atn||!apn;
  const completeSource=sourceRows.length>0&&sourceHasDistress;
  const sourceSitusPresent=row.situs_status==='SITUS_PRESENT'&&typeof countySitus?.rawCountySitus==='string'&&countySitus.rawCountySitus.trim().length>0;
  const exclusionReasons=excluded?['PREVIOUSLY_TESTED_ROUND1_FIXTURE']:[];
  let eligibilityClass='D_INSUFFICIENT_EVIDENCE';
  if(excluded)eligibilityClass='C_INELIGIBLE';
  else if(completeSource&&!identityConflict&&sourceSitusPresent
    &&canonical==='NOT_ESTABLISHED_IN_APPROVED_LOCAL_SNAPSHOT')eligibilityClass='B_POTENTIALLY_ELIGIBLE_IDENTITY_REVIEW';
  else if(completeSource&&!identityConflict&&sourceSitusPresent&&canonical==='VERIFIED_ANALYST_CONFIRMED')eligibilityClass='A_ELIGIBLE_VERIFIED';
  else exclusionReasons.push(...(!completeSource?['SOURCE_DISTRESS_EVIDENCE_NOT_ESTABLISHED']:[]),
    ...(identityConflict?['COUNTY_IDENTITY_CONFLICT_OR_INVALID']:[]),...(sourceSitusPresent?[]:['SITUS_NOT_ESTABLISHED']));
  return {
    source_record_reference:{local_ref:row.local_ref,source_rows:row.source_rows},
    county_atn:atn,
    county_apn9:apn,
    assessor_match_status:row.match_status,
    property_classification:{official_use_code:row.use_code,official_description:row.use_description,conservative_category:row.use_category},
    situs_status:sourceSitusPresent?'SITUS_PRESENT_RAW_COUNTY_EVIDENCE_NOT_POSTAL_VALIDATED':'NOT_ESTABLISHED',
    canonical_identity_status:canonical,
    durable_property_status:durable,
    candidate_id_status:excluded?'PRESENT_IN_CERTIFIED_EXCLUSION_ARTIFACT':'NOT_PRESENT_IN_LOCAL_CROSSWALK',
    historical_distress_status:completeSource?'PRESENT_POWER_TO_SELL_SOURCE':'NOT_ESTABLISHED',
    duplicate_status:{atn_unique:!!atn&&atnCounts.get(atn)===1,apn9_unique:!!apn&&apnCounts.get(apn)===1,canonical_identity:'UNKNOWN_NOT_IN_LOCAL_COHORT_SNAPSHOT'},
    exclusion_reasons:exclusionReasons,
    eligibility_class:eligibilityClass,
    evidence_as_of:{power_to_sell:'2026-09-15',assessor_edition:'2026 Final',kips_situs:'2026-06-26'}
  };
});

const classes=Object.fromEntries(['A_ELIGIBLE_VERIFIED','B_POTENTIALLY_ELIGIBLE_IDENTITY_REVIEW','C_INELIGIBLE','D_INSUFFICIENT_EVIDENCE'].map(key=>[key,privateRows.filter(row=>row.eligibility_class===key).length]));
assert(Object.values(classes).reduce((sum,count)=>sum+count,0)===inScope.length,'classification counts do not reconcile');
assert(privateRows.every(row=>row.historical_distress_status==='PRESENT_POWER_TO_SELL_SOURCE'),'historical distress source evidence missing');
assert(privateRows.filter(row=>row.eligibility_class==='C_INELIGIBLE').length===1,'historical Round 1 fixture exclusion is not unique');
assert(privateRows.filter(row=>row.eligibility_class==='A_ELIGIBLE_VERIFIED').length===0,'unverified canonical status cannot be promoted');

await mkdir(resolve(root,'data/runtime/mls-round1'),{recursive:true});
await writeFile(outputPath,JSON.stringify({
  artifact:'PI_MLS_VALIDATION_R1_PRIVATE_ELIGIBILITY_GATE1',
  generatedAt:new Date().toISOString(),
  sourceScope:{crosswalkRows:crosswalk.length,evaluatedPopulation:inScope.length,scope:'HIGH_REVIEW_PRIORITY + RESIDENTIAL_SINGLE_FAMILY'},
  populationReconciliation:{powerToSellSourceRows:pts.length,distinctNormalizedAtns:ptsByAtn.size,priorityCounts,highPriorityResidential:crosswalk.filter(row=>row.priority==='HIGH_REVIEW_PRIORITY'&&['RESIDENTIAL_SINGLE_FAMILY','RESIDENTIAL_MULTI_FAMILY','MANUFACTURED_MOBILE'].includes(row.use_category)).length,sourceAsOf:sourceDates[0]},
  classificationCounts:classes,
  duplicateCounts:{atn:privateRows.filter(row=>!row.duplicate_status.atn_unique).length,apn9:privateRows.filter(row=>!row.duplicate_status.apn9_unique).length,canonicalIdentity:'UNKNOWN_NOT_IN_LOCAL_COHORT_SNAPSHOT'},
  limitations:['No production database query was performed.','Local crosswalk has no cohort-wide PI candidate ID, canonical address ID, or durable Property ID.','Raw county situs was not copied; situs presence is not postal validation.','No property was selected.'],
  candidates:privateRows
},null,2)+'\n',{flag:'w'});
console.log(JSON.stringify({sourceRows:pts.length,candidateRecords:crosswalk.length,distinctAtns:ptsByAtn.size,priorityCounts,highPriorityResidential:crosswalk.filter(row=>row.priority==='HIGH_REVIEW_PRIORITY'&&['RESIDENTIAL_SINGLE_FAMILY','RESIDENTIAL_MULTI_FAMILY','MANUFACTURED_MOBILE'].includes(row.use_category)).length,evaluatedHighPrioritySfr:inScope.length,countyExact:privateRows.filter(row=>row.assessor_match_status==='MATCHED_EXACT').length,situsPresent:privateRows.filter(row=>row.situs_status.startsWith('SITUS_PRESENT')).length,classes,duplicateAtn:privateRows.filter(row=>!row.duplicate_status.atn_unique).length,duplicateApn9:privateRows.filter(row=>!row.duplicate_status.apn9_unique).length,fixtureExclusions:classes.C_INELIGIBLE,providerCalls:0,databaseAccess:0,propertiesSelected:0},null,2));
