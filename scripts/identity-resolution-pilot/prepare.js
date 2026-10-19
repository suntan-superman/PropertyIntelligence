import {offlineStatus} from '../../src/analysis/offline.js';
import {readFile,mkdir,writeFile,readdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {parseCsv} from '../../src/sources/kern/csv.js';
import {normalizeAtn,normalizeApn9,officialCategory,situsStatus} from '../sprint6_2/core.js';
import {scanDbf} from '../sprint6_2/dbf.js';
import {fileHash,PTS_HASH} from '../sprint6_2/io.js';
import {digest,RULE,reviewAddress,designate,assertRegistry,persistenceBlockers} from './pilot.js';

const out='data/runtime/identity-resolution-pilot';
const paths={gate1:'data/runtime/mls-round1/private-candidate-eligibility.json',gate1b:'data/runtime/mls-round1/private-canonical-identity-audit.json',config:'config/mls-validation-round1.json',crosswalk:'data/validation/sprint6_2-kern-atn-crosswalk.csv',pts:'data/raw/kern_power_to_sell_2026-09-15.csv',situs:'data/runtime/sprint6_2-kern-assessor/exact-situs.json',audit:'data/validation/sprint6_2-kern-assessor-source-audit.json',dbf:'data/runtime/sprint6_2-kern-assessor/extracted/TaxRoll_Land_2026final/TaxRoll_Land_2026final.dbf'};
const check=(ok,code)=>{if(!ok)throw new Error(code);};
const records=text=>{const p=parseCsv(text);return p.rows.map(v=>Object.fromEntries(p.headers.map((k,i)=>[k,v[i]??''])));};
async function jsonNew(path,value){await writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
async function protectedHashes(){const result={};for(const dir of ['config/protected-baselines','netlify/database/migrations','src/persistence','scripts/mls-validation-round1'])for(const f of await readdir(dir,{withFileTypes:true}))if(f.isFile())result[`${dir}/${f.name}`]=await fileHash(`${dir}/${f.name}`);result[paths.config]=await fileHash(paths.config);return result;}

async function main(){
  const before=await protectedHashes();
  execFileSync('git',['check-ignore','--quiet',`${out}/pilot-exclusions.json`],{stdio:'pipe'});
  const inputs={},inputHashes={};
  for(const [key,path]of Object.entries(paths)){inputHashes[key]=await fileHash(path);if(key!=='dbf')inputs[key]=await readFile(path,'utf8');}
  check(inputHashes.pts===PTS_HASH,'PTS_SOURCE_FINGERPRINT_CHANGED');
  const gate1=JSON.parse(inputs.gate1),gate1b=JSON.parse(inputs.gate1b),config=JSON.parse(inputs.config),audit=JSON.parse(inputs.audit);
  check(gate1b.status==='COMPLETED_READ_ONLY'&&gate1b.visibilityVerified&&gate1b.transaction.read_only==='on'&&gate1b.rolledBack&&gate1b.noWriteTransactionId&&gate1b.inputManifestSha256===inputHashes.gate1,'GATE1B_EVIDENCE_NOT_VERIFIED');
  check(config.status==='PRE_EXECUTION'&&!config.executionAuthorized&&!config.selectionLocked&&!config.evidenceStackLocked&&!config.assumptionsLocked&&!config.monteCarloLocked&&!config.mlsAllowedBeforeFreeze&&config.selectionSeed===null&&config.cohortFingerprint===null,'ROUND1_FLAGS_CHANGED');
  check(audit.sourceFiles.find(f=>f.path===paths.dbf)?.sha256===inputHashes.dbf,'ASSESSOR_SOURCE_FINGERPRINT_CHANGED');
  const cohort=gate1.candidates.filter(r=>r.eligibility_class==='B_POTENTIALLY_ELIGIBLE_IDENTITY_REVIEW'&&r.exclusion_reasons.length===0);
  check(cohort.length===80&&gate1b.candidates.length===80,'COHORT_CHANGED');
  const crosswalk=records(inputs.crosswalk),situs=JSON.parse(inputs.situs);
  const pool=cohort.map(g=>{
    const matches=gate1b.candidates.filter(r=>r.county_atn===g.county_atn&&r.county_apn9===g.county_apn9);
    check(matches.length===1,'AUDIT_IDENTITY_NOT_UNIQUE');const b=matches[0];
    check(b.classification==='COUNTY RESOLVED — NOT PERSISTED'&&b.candidate_ids.length===1&&!b.conflicts.length&&b.active_links.length===0&&b.address_resolution_ids.length===0&&!b.durable_property_id&&b.candidate.source_relationship_verified,'AUDIT_IDENTITY_NOT_CLEAN');
    const matchesC=crosswalk.filter(r=>r.normalized_pts_atn===g.county_atn),matchesS=situs.filter(r=>normalizeAtn(r.atn)===g.county_atn);
    check(matchesC.length===1&&matchesS.length===1,'LOCAL_SOURCE_IDENTITY_NOT_UNIQUE');const c=matchesC[0];
    check(c.apn9===g.county_apn9&&c.priority==='HIGH_REVIEW_PRIORITY'&&c.use_category==='RESIDENTIAL_SINGLE_FAMILY'&&c.match_status==='MATCHED_EXACT','CROSSWALK_COHORT_CHANGED');
    check(['ACREAGE_DELTA_GT_0_01','EXACT_IDENTIFIERS_ONLY;COUNTY_FACTS_NOT_MARKET_VALUE'].includes(c.notes),'UNREVIEWED_QUALITY_FLAG');
    const address=reviewAddress(matchesS[0].rawCountySitus);
    return {candidateId:b.candidate.id,atn:g.county_atn,apn9:g.county_apn9,missingComponents:address.missingComponents,countyReviewFlag:c.manual_review_required==='true',g,b,c,address};
  });
  const selected=designate(pool);
  const selectedAtns=new Set(selected.map(r=>r.atn)),land=[];
  await scanDbf(paths.dbf,['ATN','APN9','ADDR_SITUS','USE_CODE'],(r,index)=>{if(selectedAtns.has(normalizeAtn(r.ATN)))land.push({...r,sourceRow:index});});
  const domain=new Map(audit.dbfProfiles.TaxRoll_UseCodes_2026final.domain.map(r=>[r.USE_CODE,r.USE_DESC]));
  const pts=records(inputs.pts);
  const now=new Date().toISOString();
  const packets=selected.map(s=>{
    const matches=land.filter(r=>normalizeAtn(r.ATN)===s.atn);check(matches.length===1,'ASSESSOR_RELATIONSHIP_NOT_UNIQUE');const row=matches[0];
    const use=officialCategory(row.USE_CODE,domain);
    check(normalizeApn9(row.APN9)===s.apn9&&row.sourceRow===Number(s.c.assessor_rows)&&use.category==='RESIDENTIAL_SINGLE_FAMILY'&&use.description===s.c.use_description&&row.USE_CODE===s.c.use_code,'ASSESSOR_RELATIONSHIP_DISAGREEMENT');
    check(row.ADDR_SITUS===s.address.rawCountySitus&&situsStatus(row.ADDR_SITUS)==='SITUS_PRESENT','COUNTY_SITUS_DISAGREEMENT');
    check(crosswalk.filter(c=>c.apn9===s.apn9).length===1,'DUPLICATE_COUNTY_PARCEL');
    const history=pts.flatMap((r,i)=>normalizeAtn(r.atn)===s.atn?[{sourceRow:i+1,sourcePage:r.source_page,asOf:r.source_date}]:[]);
    check(history.length>0&&history.every(r=>r.asOf==='2026-09-15'),'PTS_HISTORY_NOT_ESTABLISHED');
    const packet={pilotCode:s.pilotCode,recordKind:'REAL_COUNTY_CANDIDATE_PRIVATE_REVIEW',candidateId:s.candidateId,county:{jurisdiction:'KERN_CA',atn:s.atn,apn9:s.apn9},
      sourceRecordReference:s.g.source_record_reference,selectionBucket:s.selectionBucket,
      assessor:{id:s.b.assessor.id,sourceRow:row.sourceRow,match:'MATCHED_EXACT',useCode:row.USE_CODE,officialDescription:use.description,researchCategory:use.category,countyReviewFlags:s.countyReviewFlag?['ACREAGE_DELTA_GT_0_01']:[]},
      historicalPowerToSell:{status:s.g.historical_distress_status,records:history,notCurrentDistressVerification:true},
      addressReview:s.address,
      identity:{countyPass:true,assessorPass:true,uniqueCountyIdentity:true,uniqueAssessorRelationship:true,countyParcelConflict:false,conflicts:[],archivedOrInactive:false,existingPropertyId:null,activeLinkCount:0,canonicalResolutionId:null,canonicalResolutionStatus:'ABSENT_AT_GATE1B_SNAPSHOT',analystConfirmed:false},
      evidence:{sourceHashes:inputHashes,sourcePaths:paths,assessorAsOf:'2026-06-26',assessorEdition:'2026 Final',powerToSellAsOf:'2026-09-15',originalSourceAcquiredAt:null,acquisitionDateStatus:'NOT_ESTABLISHED_IN_AVAILABLE_CERTIFIED_ARTIFACTS',databaseSnapshotAt:gate1b.completedAt,databaseSnapshotFingerprint:gate1b.snapshotFingerprint,localVerificationAt:now},
      analystReview:{decision:null,readiness:s.address.readiness,nextAction:'Human must verify all components from cited evidence; supply missing components with evidence; no self-approval'},
      persistence:{enabled:false,status:'NOT_EXECUTED',requiresFreshReadOnlyIdentityCheck:true,requiresSeparateAuthorization:true},
      disclaimerReference:'docs/SPRINT6_2_SOURCE_DISCLAIMER.md'};
    return {...packet,packetSha256:digest(JSON.stringify(packet))};
  });
  const identities=selected.map(s=>({pilotCode:s.pilotCode,candidateId:s.candidateId,jurisdiction:'KERN_CA',atn:s.atn,apn9:s.apn9,reason:'IDENTITY_RESOLUTION_PILOT_CONTAMINATION',expiresAt:null}));
  const registry={schemaVersion:1,rule:RULE,designatedAt:now,permanentRound1Exclusion:true,enforcementStatus:'RECORDED; ROUND1_HARNESS_INTEGRATION_REQUIRES_SEPARATE_APPROVAL',inputHashes,identities};
  await mkdir(out,{recursive:true});
  try{
    const prior=JSON.parse(await readFile(`${out}/pilot-exclusions.json`));assertRegistry(prior,registry);
    for(const s of selected){
      const p=JSON.parse(await readFile(`${out}/${s.pilotCode}-review.json`)),{packetSha256,...payload}=p;
      check(digest(JSON.stringify(payload))===packetSha256,'REVIEW_PACKET_CHANGED');
      const d=JSON.parse(await readFile(`${out}/${s.pilotCode}-analyst-decision.json`));
      check(d.packetSha256===packetSha256&&d.pilotCode===s.pilotCode,'DECISION_PACKET_MISMATCH');
    }
    for(const name of ['selection-manifest.json','identity-verification-results.json','persistence-results.json'])await stat(`${out}/${name}`);
    check(JSON.stringify(await protectedHashes())===JSON.stringify(before),'PROTECTED_FILES_CHANGED');
    console.log(JSON.stringify({status:'EXISTING_DESIGNATION_PRESERVED',pilotCandidates:3,providerCalls:0,databaseConnections:0}));return;
  }catch(e){if(e.code!=='ENOENT')throw e;check(!await stat(`${out}/pilot-exclusions.json`).then(()=>true,()=>false),'INCOMPLETE_EXISTING_PILOT_STOP');}
  check(JSON.stringify(await protectedHashes())===JSON.stringify(before),'PROTECTED_FILES_CHANGED');
  for(const[key,path]of Object.entries(paths))check(await fileHash(path)===inputHashes[key],'SOURCE_CHANGED_DURING_PREPARATION');
  // Seal exclusions first. Any partial run subsequently stops instead of reselection.
  await jsonNew(`${out}/pilot-exclusions.json`,registry);
  await jsonNew(`${out}/selection-manifest.json`,{schemaVersion:1,rule:RULE,createdAt:now,inputHashes,population:80,designatedCount:3,round1Selected:0,selected:identities,buckets:pool.reduce((m,r)=>{const key=r.countyReviewFlag?'COUNTY_ACREAGE_REVIEW':'NO_ADDITIONAL_COUNTY_REVIEW_FLAG';m[key]=(m[key]??0)+1;return m;},{})});
  for(const p of packets){
    await jsonNew(`${out}/${p.pilotCode}-review.json`,p);
    await jsonNew(`${out}/${p.pilotCode}-analyst-decision.json`,{pilotCode:p.pilotCode,packetSha256:p.packetSha256,decision:null,allowedOutcomes:['APPROVED','NEEDS_MORE_EVIDENCE','REJECTED'],reviewedBy:null,reviewedAt:null,authorizedHumanReviewReference:null,confirmedAddress:null,componentEvidenceReferences:{},notes:null,automatedApprovalForbidden:true,separateIsolatedPersistenceAuthorization:null});
  }
  const result={createdAt:now,status:'READY FOR HUMAN IDENTITY REVIEW',pilotCandidates:3,countyIdentity:'PASS',assessorRelationships:'PASS',addressEvidence:packets.every(p=>p.addressReview.formatValid)?'COMPLETE_FORMAT_ONLY':'PARTIAL',canonicalResolution:'REQUIRES REVIEW',analystApprovals:0,isolatedPersistence:'NOT EXECUTED',isolatedDatabase:'NOT_VERIFIED_OR_DESIGNATED',round1Exclusions:'RECORDED_SEPARATELY_PERMANENT_NO_HARNESS_CHANGE',remainingNonPilotSourceCandidates:77,
    candidates:packets.map(p=>({pilotCode:p.pilotCode,packetSha256:p.packetSha256,countyPass:p.identity.countyPass,assessorPass:p.identity.assessorPass,missingComponents:p.addressReview.missingComponents,reviewFlags:p.assessor.countyReviewFlags,persistenceBlockers:persistenceBlockers(p)})),
    sourceInputHashes:inputHashes,protectedFileHashes:before,round1Unchanged:true,productionWrites:0,databaseConnections:0,providerCalls:0,mlsAccess:0,round1PropertiesSelected:0,offline:offlineStatus()};
  await jsonNew(`${out}/identity-verification-results.json`,result);
  await jsonNew(`${out}/persistence-results.json`,{status:'NOT_EXECUTED',realPilotPropertiesCreated:0,syntheticDatabasePersistence:'NOT_EXECUTED',reason:['NO_GENUINE_HUMAN_APPROVAL','NO_SEPARATE_PERSISTENCE_AUTHORIZATION','NO_VERIFIED_ISOLATED_DATABASE'],databaseConnections:0});
  console.log(JSON.stringify({status:result.status,pilotCandidates:3,countyIdentity:result.countyIdentity,assessorRelationships:result.assessorRelationships,addressEvidence:result.addressEvidence,missingComponents:result.candidates.map(r=>({pilotCode:r.pilotCode,missing:r.missingComponents,reviewFlags:r.reviewFlags})),analystApprovals:0,isolatedPersistence:result.isolatedPersistence,round1Unchanged:true,providerCalls:0,databaseConnections:0,productionWrites:0,mlsAccess:0,round1Selected:0,offline:result.offline},null,2));
}
main().catch(e=>{console.error(JSON.stringify({status:'STOP',code:/^[A-Z0-9_]+$/.test(e.message??'')?e.message:'SANITIZED_PILOT_PREPARATION_FAILURE'}));process.exitCode=1;});
