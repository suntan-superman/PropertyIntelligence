import '../../src/analysis/offline.js';
import {readFile,mkdir,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {parseCsv} from '../../src/sources/kern/csv.js';
import {normalizeAtn,normalizeApn9,officialCategory} from '../sprint6_2/core.js';
import {scanDbf} from '../sprint6_2/dbf.js';
import {fileHash,PTS_HASH} from '../sprint6_2/io.js';
import {reviewAddress} from '../identity-resolution-pilot/pilot.js';
import {ROOT,RULE,check,saveNew,seal,sha} from './core.js';
import {localCredential,exposureAudit,protect,verifyProtection,readJson} from './local.js';

const paths={gate1:'data/runtime/mls-round1/private-candidate-eligibility.json',gate1b:'data/runtime/mls-round1/private-canonical-identity-audit.json',config:'config/mls-validation-round1.json',crosswalk:'data/validation/sprint6_2-kern-atn-crosswalk.csv',pts:'data/raw/kern_power_to_sell_2026-09-15.csv',situs:'data/runtime/sprint6_2-kern-assessor/exact-situs.json',audit:'data/validation/sprint6_2-kern-assessor-source-audit.json',dbf:'data/runtime/sprint6_2-kern-assessor/extracted/TaxRoll_Land_2026final/TaxRoll_Land_2026final.dbf'};
const csv=text=>{const p=parseCsv(text);return p.rows.map(r=>Object.fromEntries(p.headers.map((k,i)=>[k,r[i]])));};
async function main(){
  execFileSync('git',['check-ignore','--quiet',`${ROOT}/preflight.json`],{stdio:'pipe'});
  try{await readdir(ROOT);throw new Error('EXISTING_PILOT_PRESERVE_AND_STOP');}catch(e){if(e.code!=='ENOENT')throw e;}
  const credential=await localCredential(),security=await exposureAudit(credential.apiKey),before=await protect();
  const inputHashes={};for(const [k,p] of Object.entries(paths))inputHashes[k]=await fileHash(p);
  const [g,b,cfg,registry,situs,audit]=await Promise.all([paths.gate1,paths.gate1b,paths.config,'data/runtime/identity-resolution-pilot/pilot-exclusions.json',paths.situs,paths.audit].map(readJson));
  check(cfg.status==='PRE_EXECUTION'&&cfg.geography==='Kern County, CA'&&!cfg.executionAuthorized&&!cfg.selectionLocked&&!cfg.mlsAllowedBeforeFreeze&&cfg.cohortFingerprint===null&&cfg.selectionSeed===null,'ROUND1_AUTHORIZATION_CHANGED');
  check(registry.permanentRound1Exclusion&&registry.identities.length===3&&registry.identities.every(x=>x.jurisdiction==='KERN_CA'),'EXCLUSION_REGISTRY_CHANGED');
  for(const [k,h] of Object.entries(registry.inputHashes))check(h===inputHashes[k],'LOCAL_SOURCE_FINGERPRINT_CHANGED');
  check(inputHashes.pts===PTS_HASH&&b.inputManifestSha256===inputHashes.gate1&&b.status==='COMPLETED_READ_ONLY'&&b.visibilityVerified&&b.rolledBack,'SOURCE_AUDIT_CHANGED');
  check(g.candidates.length===81&&g.candidates.filter(x=>x.exclusion_reasons.length).length===1&&b.candidates.length===80,'COHORT_COUNTS_CHANGED');
  const cross=csv(await readFile(paths.crosswalk,'utf8')),remaining=g.candidates.filter(x=>x.exclusion_reasons.length===0&&!registry.identities.some(i=>i.atn===x.county_atn||i.apn9===x.county_apn9));
  check(remaining.length===77,'REMAINING_COHORT_CHANGED');
  const rows=remaining.map(x=>{
    const matches=b.candidates.filter(z=>z.county_atn===x.county_atn&&z.county_apn9===x.county_apn9),cw=cross.filter(z=>z.normalized_pts_atn===x.county_atn),ss=situs.filter(z=>normalizeAtn(z.atn)===x.county_atn);
    check(matches.length===1&&cw.length===1&&ss.length===1,'LOCAL_IDENTITY_AMBIGUOUS');const y=matches[0],c=cw[0],a=reviewAddress(ss[0].rawCountySitus);
    check(normalizeAtn(x.county_atn)&&normalizeApn9(x.county_apn9)&&c.apn9===x.county_apn9&&cross.filter(z=>z.apn9===x.county_apn9).length===1,'COUNTY_IDENTITY_CONFLICT');
    return {x,y,c,a};
  });
  const eligible=rows.filter(({x,y,c,a})=>x.assessor_match_status==='MATCHED_EXACT'&&c.match_status==='MATCHED_EXACT'&&c.use_category==='RESIDENTIAL_SINGLE_FAMILY'&&c.manual_review_required==='false'&&c.notes==='EXACT_IDENTIFIERS_ONLY;COUNTY_FACTS_NOT_MARKET_VALUE'&&a.components.street&&a.components.city&&y.classification==='COUNTY RESOLVED — NOT PERSISTED'&&y.conflicts.length===0&&y.candidate_ids.length===1&&y.candidate.source_relationship_verified&&!y.candidate.archived&&!y.candidate.qa_marker&&!y.durable_property_id&&y.active_links.length===0&&y.address_resolution_ids.length===0);
  eligible.sort((a,b)=>a.x.county_atn.localeCompare(b.x.county_atn)||a.x.county_apn9.localeCompare(b.x.county_apn9));check(eligible.length>=3,'INSUFFICIENT_CLEAN_CANDIDATES');
  const selected=eligible.slice(0,3),raw=[];await scanDbf(paths.dbf,['ATN','APN9','ADDR_SITUS','USE_CODE'],(r,index)=>{if(selected.some(x=>x.x.county_atn===normalizeAtn(r.ATN)))raw.push({...r,sourceRow:index});});
  const domain=new Map(audit.dbfProfiles.TaxRoll_UseCodes_2026final.domain.map(r=>[r.USE_CODE,r.USE_DESC]));
  const candidates=selected.map(({x,y,c,a},i)=>{
    const matches=raw.filter(r=>normalizeAtn(r.ATN)===x.county_atn);check(matches.length===1,'ASSESSOR_NOT_UNIQUE');const r=matches[0],use=officialCategory(r.USE_CODE,domain);
    check(normalizeApn9(r.APN9)===x.county_apn9&&r.sourceRow===Number(c.assessor_rows)&&r.ADDR_SITUS===a.rawCountySitus&&use.category==='RESIDENTIAL_SINGLE_FAMILY'&&use.description===c.use_description,'ASSESSOR_EVIDENCE_CHANGED');
    const county={jurisdiction:'KERN_CA',atn:x.county_atn,apn9:x.county_apn9};
    return {pilotCode:`RC-P${i+1}`,candidateId:y.candidate.id,county,countyIdentityFingerprint:sha(JSON.stringify(county)),sourceRecordReference:x.source_record_reference,
      assessor:{id:y.assessor.id,sourceRow:r.sourceRow,match:'MATCHED_EXACT',useCode:r.USE_CODE,officialDescription:use.description,researchCategory:use.category,countyReviewFlags:[]},
      countyAddressReview:a,requestAddress:{street:a.components.street,city:a.components.city,state:'CA'},
      stateEvidence:{classification:'COUNTY_JURISDICTION_SUPPORTED',source:'Existing Kern County source and Round 1 geography; not postal validation'},
      existingIdentity:{...y.candidate,canonicalResolutionIds:y.address_resolution_ids,activeLinks:y.active_links,conflicts:y.conflicts,durablePropertyId:y.durable_property_id},
      evidenceDates:{...x.evidence_as_of,databaseSnapshotAt:b.completedAt},currentDistressVerified:false};
  });
  check(new Set(candidates.map(x=>x.candidateId)).size===3,'DUPLICATE_CANDIDATE');
  const attachment='C:/Users/sjroy/.codex/attachments/8983a393-01c0-4742-9eb3-2d9831859948/Pasted text.txt';
  await mkdir(ROOT,{recursive:false});
  await saveNew(`${ROOT}/protected-before.json`,before);
  await saveNew(`${ROOT}/vendor-authorization-reference.json`,{reference:'USER_SUPPLIED_RENTCAST_CONTROLLED_PILOT_V1_PART_A',source:attachment,sourceSha256:await fileHash(attachment),recordedAt:new Date().toISOString(),vendorContact:'Cindy Bellford',vendorEmailDate:null,vendorEmailDateStatus:'NOT_SUPPLIED_REQUESTED_FROM_STAN',confirmationBasis:'USER_ATTESTED_WRITTEN_VENDOR_CONFIRMATION',terms:'https://www.rentcast.io/terms-api',legalOpinion:false,scope:'LOCAL_PROPERTY_RECORDS_PILOT_AND_DESCRIBED_RETAINED_EVIDENCE'});
  await saveNew(`${ROOT}/candidate-mapping.json`,seal({schemaVersion:1,rule:RULE,createdAt:new Date().toISOString(),inputHashes,sourcePaths:paths,candidates,round1Selected:0}));
  await saveNew(`${ROOT}/preflight.json`,{status:'PREPARED_NOT_TRANSMITTED',preparedAt:new Date().toISOString(),population:{originalHighSfr:81,historicalExcluded:1,existingIdentityPilots:3,remainingNonpilot:77,cleanEligible:eligible.length,selectedTechnicalCandidates:3},security,protectedPaths:Object.keys(before).length,inputHashes,
    budget:{attempts:3,retries:0,maxOverage:.6},contract:{endpoint:'GET /v1/properties',query:'address=county street, county city, CA; ZIP omitted',verifiedDocumentation:'https://developers.rentcast.io/reference/property-records',noZipBasis:'Vendor confirmation supplied by user; existing queryAddress omits absent ZIP'},databaseConnections:0,providerCalls:0,round1Status:'PRE_EXECUTION',activePilotInventory:'Existing identity pilots excluded; local runtime pilot directories inspected; no other real-candidate selection registry found',freshProductionStateVerified:false});
  await verifyProtection(before);console.log(JSON.stringify({status:'PREPARED_NOT_TRANSMITTED',population:{original:81,excluded:1,identityPilots:3,remaining:77,cleanEligible:eligible.length,technicalCandidates:3},security,protectedPaths:Object.keys(before).length,requests:0}));
}
main().catch(e=>{console.error(JSON.stringify({status:'STOP',code:/^[A-Z0-9_]+$/.test(e.message)?e.message:'SANITIZED_PREPARATION_FAILURE'}));process.exitCode=1;});
