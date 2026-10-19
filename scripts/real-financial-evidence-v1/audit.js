// Assessment tooling only: no provider client, environment loading, DB or economics execution.
import '../../src/analysis/offline.js';
import assert from 'node:assert/strict';
import {readFile,stat,mkdir,open} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileHash,PTS_HASH} from '../sprint6_2/io.js';
import {filesUnder,newJson,readJson} from '../preliminary-property-analysis-v1/guard.js';
import {fingerprint} from '../../src/analysis/monteCarlo/contract.js';
import {REQUIRED} from '../preliminary-property-analysis-v1/core.js';
import {parseCsv} from '../../src/sources/kern/csv.js';
import {reviewAddress} from '../identity-resolution-pilot/pilot.js';
import {offlineStatus} from '../../src/analysis/offline.js';

export const ROOT='data/runtime/real-financial-evidence-v1';
export const RULE='RFE_TECHNICAL_SHORTLIST_V1_SOURCE_ORDER_NO_ECONOMICS';
export const PROPOSAL=Object.freeze({executed:false,subjects:3,attemptsPerSubject:3,maxAttempts:9,maxRetries:0,maxPages:1,maxSoldRecordsPerSubject:50,
  includedQuotaCredited:0,assumedOverageCents:20,requestFeeEstimateCents:180,proposedAllInCapCents:200,verifiedMaximumCost:null,
  accountEntitlement:'UNKNOWN',classification:'COST/RIGHTS CLARIFICATION REQUIRED',
  slots:[1,2,3].flatMap(subject=>['SUBJECT_RECORD','AVM_CONTEXT','SOLD_RECORD_CANDIDATES'].map(kind=>({subject,kind,attempts:1})))});
export const INPUTS={gate1:'data/runtime/mls-round1/private-candidate-eligibility.json',gate1b:'data/runtime/mls-round1/private-canonical-identity-audit.json',ip:'data/runtime/identity-resolution-pilot/pilot-exclusions.json',rc:'data/runtime/rentcast-controlled-pilot/candidate-mapping.json',crosswalk:'data/validation/sprint6_2-kern-atn-crosswalk.csv',situs:'data/runtime/sprint6_2-kern-assessor/exact-situs.json',config:'config/mls-validation-round1.json',attom:'data/validation/attom-bulk-poc/sequential-schema-change-summary.json',delivery:'data/validation/attom-bulk-poc/sequential-delivery-manifest.json',profile:'data/validation/attom-bulk-poc/sequential-baseline-profile.json'};
export const NEW_FILES=['scripts/real-financial-evidence-v1/audit.js','scripts/real-financial-evidence-v1/audit.test.js','scripts/real-financial-evidence-v1/qa.js',...['READINESS_V1','PROVIDER_MATRIX','ACQUISITION_PLAN','QA'].map(n=>`docs/PI_REAL_FINANCIAL_EVIDENCE_${n}.md`)];
const ownPath='scripts/real-financial-evidence-v1/audit.js';
const readCsv=async p=>{const x=parseCsv(await readFile(p,'utf8'));return x.rows.map(r=>Object.fromEntries(x.headers.map((h,i)=>[h,r[i]])));};
const gitFiles=()=>execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);

export async function capture(){
  execFileSync('git',['check-ignore','--quiet',`${ROOT}/private-candidate-shortlist.json`],{stdio:'pipe'});
  const prior=await readJson('data/runtime/preliminary-property-analysis-v1/preservation-before.json');
  const paths=new Set([...Object.keys(prior.hashes),...gitFiles()].map(p=>p.replaceAll('\\','/')));
  for(const dir of ['data/runtime/preliminary-property-analysis-v1','data/runtime/rentcast-controlled-pilot','data/runtime/rentcast-reconciliation-v1-1','data/runtime/identity-resolution-pilot','data/runtime/mls-round1','data/runtime/rc-p2-current-identity-readiness','data/validation/attom-bulk-poc','data/validation/attom-poc','data/validation/monte-carlo-v1','data/validation/investor-report-v1'])for(const p of await filesUnder(dir))paths.add(p);
  paths.delete(ownPath);
  const hashes={};for(const p of [...paths].sort())hashes[p]=await fileHash(p);
  await mkdir(ROOT,{recursive:false});
  const before={version:'RFE_PRESERVATION_V1',capturedAt:new Date().toISOString(),hashes,count:Object.keys(hashes).length,aggregateSha256:fingerprint(hashes),gitStatus:execFileSync('git',['status','--porcelain=v1','-z'],{encoding:'utf8'}).split('\0').filter(Boolean)};
  await newJson(`${ROOT}/preservation-before.json`,before);
  return {status:'PASS',count:before.count,aggregateSha256:before.aggregateSha256};
}
export async function preservation(){
  const b=await readJson(`${ROOT}/preservation-before.json`);
  for(const [p,h] of Object.entries(b.hashes))assert.equal(await fileHash(p),h,'PRESERVATION_STOP');
  const added=gitFiles().filter(p=>!Object.hasOwn(b.hashes,p.replaceAll('\\','/'))).sort();
  assert(added.every(p=>NEW_FILES.includes(p)),'UNEXPECTED_NEW_REPOSITORY_FILE');
  return {status:'PASS',count:b.count,aggregateSha256:b.aggregateSha256,unexpectedChanges:0,allowlistedNewFiles:added.length};
}

export async function loadInputs(){
  const x={};for(const [k,p] of Object.entries(INPUTS))x[k]=k==='crosswalk'?await readCsv(p):await readJson(p);
  const {rc,gate1,gate1b,ip}=x;
  for(const [k,p] of Object.entries(rc.sourcePaths))assert.equal(await fileHash(p),rc.inputHashes[k],'ORIGINAL_COHORT_INPUT_CHANGED');
  assert.equal(await fileHash('data/raw/kern_power_to_sell_2026-09-15.csv'),PTS_HASH);
  assert.equal(gate1b.inputManifestSha256,await fileHash(INPUTS.gate1));
  assert.equal(gate1.candidates.length,81);assert.equal(gate1b.candidates.length,80);
  assert.equal(new Set(gate1b.candidates.map(b=>b.candidate.id)).size,80,'CANDIDATE_ID_DUPLICATE');
  assert(gate1.candidates.every(r=>/^\d{11}$/.test(r.county_atn)&&/^\d{9}$/.test(r.county_apn9)),'COUNTY_STRING_IDENTITY_STOP');
  assert.equal(ip.identities.length,3);assert.equal(rc.candidates.length,3);
  assert.equal(ip.permanentRound1Exclusion,true);
  assert.equal(x.config.status,'PRE_EXECUTION');assert.equal(x.config.executionAuthorized,false);assert.equal(x.config.cohortFingerprint,null);assert.equal(x.config.selectionLocked,false);
  x.hashes={};for(const [k,p] of Object.entries(INPUTS))x.hashes[k]=await fileHash(p);
  return x;
}
const same=(x,y)=>x.county_atn===y.atn||x.county_apn9===y.apn9;
export function shortlist(x){
  const base=x.gate1.candidates.map((r,i)=>({...r,originalManifestOrdinal:i+1})).filter(r=>r.exclusion_reasons.length===0&&!x.ip.identities.some(i=>same(r,i)));
  assert.equal(base.length,77,'EXISTING_77_POOL_CHANGED');
  const rcExcluded=base.filter(r=>x.rc.candidates.some(c=>same(r,c.county)));
  assert.equal(rcExcluded.length,3,'RC_EXCLUSION_RECONCILIATION_STOP');
  const clean=[],rejected=[];
  for(const r of base.filter(r=>!rcExcluded.includes(r))){
    const reasons=[];
    const bs=x.gate1b.candidates.filter(b=>b.county_atn===r.county_atn&&b.county_apn9===r.county_apn9);
    const cs=x.crosswalk.filter(c=>c.normalized_pts_atn===r.county_atn&&c.apn9===r.county_apn9);
    // Exact existing identifiers only: no APN/ATN transformation or address joins.
    const ss=x.situs.filter(s=>s.atn===r.county_atn);
    if(base.filter(b=>b.county_atn===r.county_atn||b.county_apn9===r.county_apn9).length!==1)reasons.push('COHORT_IDENTITY_DUPLICATE');
    if(bs.length!==1||cs.length!==1||ss.length!==1)reasons.push('SOURCE_RELATIONSHIP_AMBIGUOUS');
    const b=bs[0],c=cs[0],s=ss[0];
    if(!b||b.candidate_ids.length!==1||b.conflicts.length||b.candidate.archived||b.candidate.qa_marker||!b.candidate.source_relationship_verified||b.classification!=='COUNTY RESOLVED — NOT PERSISTED'||b.active_links.length||b.durable_property_id||b.address_resolution_ids.length)reasons.push('SAVED_IDENTITY_SNAPSHOT_NOT_CLEAN');
    if(!c||c.match_status!=='MATCHED_EXACT'||c.use_category!=='RESIDENTIAL_SINGLE_FAMILY'||c.manual_review_required!=='false'||x.crosswalk.filter(z=>z.apn9===r.county_apn9).length!==1)reasons.push('COUNTY_INTEGRITY_OR_REVIEW_FLAG');
    const a=s?reviewAddress(s.rawCountySitus):null;
    if(!a?.components.street||!a?.components.city)reasons.push('STREET_CITY_MISSING');
    if(reasons.length){rejected.push({originalManifestOrdinal:r.originalManifestOrdinal,reasons});continue;}
    clean.push({r,b,c,a});
  }
  // Preserve original cohort order, not an economic rerank; no manual substitution.
  clean.sort((a,b)=>a.r.originalManifestOrdinal-b.r.originalManifestOrdinal);
  const candidates=clean.slice(0,3).map(({r,b,c,a},i)=>({
    opaqueId:`RFE-${fingerprint({rule:RULE,atn:r.county_atn,apn9:r.county_apn9}).slice(0,24)}`,
    technicalOrdinal:i+1,originalManifestOrdinal:r.originalManifestOrdinal,selectionRule:RULE,
    county:{atn:r.county_atn,apn9:r.county_apn9,jurisdiction:'KERN_CA'},candidateId:b.candidate.id,assessorId:b.assessor.id,
    sourceReference:r.source_record_reference,assessorSourceRow:c.assessor_rows,sourceDates:r.evidence_as_of,
    screening:{priority:c.priority,score:c.score??c.screening_score??null,importedStatus:b.candidate.candidate_status,originalRanking:'UNCHANGED_SOURCE_MANIFEST_ORDER'},
    address:{rawAssessorSitus:a.rawCountySitus,street:a.components.street,city:a.components.city,state:a.components.state||null,zip:a.components.postalCode||null,stateJurisdictionEvidence:'CA_SUPPORTED_BY_KERN_SOURCE_NOT_POSTAL_VALIDATION',postalValidated:false},
    identity:{classification:b.classification,canonicalResolutionIds:b.address_resolution_ids,durablePropertyId:b.durable_property_id,snapshotAt:x.gate1b.completedAt,freshProductionStateVerified:false,currentParcelActivity:'UNVERIFIED',providerCountyCrosswalk:'NOT_TESTED'},
    providerReferences:{rentcastId:null,attomId:null},missingEvidence:['LICENSED_COMPLETE_ADDRESS','PROVIDER_TO_COUNTY_BINDING','CURRENT_PARCEL_STATUS',...REQUIRED],
    acquisitionReadiness:'BLOCKED_PENDING_IDENTITY_RIGHTS_COST_AND_SEPARATE_AUTHORIZATION',exclusions:{ip:false,rc:false,historicalFixture:false,round1Selected:false},
    authorization:{providerCalls:false,financialAnalysis:false,persistence:false,analystApproval:false,round1:false},sourceFingerprints:x.hashes
  }));
  return {version:'RFE_PRIVATE_TECHNICAL_SHORTLIST_V1',selectionRule:RULE,sourceFingerprints:x.hashes,
    counts:{original:81,historicalExcluded:1,identityPilotsExcluded:3,existingNonIpPool:77,rentcastPilotsExcluded:3,remainingNonpilot:74,integrityEligible:clean.length,integrityRejected:rejected.length,selectedTechnical:candidates.length,round1Selections:0},
    rejected,candidates,selectionFingerprint:fingerprint(candidates)};
}

export async function attomEvidence(x){
  const files=[...x.attom.files.map(f=>({...f,edition:'0001'})),...x.delivery.deltaDelivery0002.files.map(f=>({...f,edition:'0002'}))];
  const checked=[];
  for(const f of files){
    assert.equal(await fileHash(f.path),f.sha256,'CERTIFIED_ATTOM_BYTES_CHANGED');
    const size=(await stat(f.path)).size;assert.equal(size,f.bytes??f.localBytes);
    const fd=await open(f.path,'r');try{const h=Buffer.alloc(4),t=Buffer.alloc(4);await fd.read(h,0,4,0);await fd.read(t,0,4,size-4);assert.equal(h.toString(),'PAR1');assert.equal(t.toString(),'PAR1');}finally{await fd.close();}
    checked.push({dataset:f.dataset,edition:f.edition,path:f.path,sha256:f.sha256,bytes:size,rows:f.rows,columns:f.columns});
  }
  const datasets=x.profile.datasets.map(d=>({dataset:d.dataset,rows:d.rows,columns:d.columns,fullDecodeScan:d.fullDecodeScan,criticalNullCounts:d.criticalNullCounts,fips:d.situsFipsCounts??d.recordingCountyFipsCounts??null,
    relevantSchema:x.attom.files.find(f=>f.dataset===d.dataset).schema.filter(([n])=>!/Name|Contact|Lender|Borrower|Grantor|Grantee|Phone|Trustee|Servicer|Legal|Address|Book|Page/i.test(n))}));
  return {files:checked,datasets,scope:'HASH_VERIFIED_CERTIFIED_LOCAL_PROFILE_REUSED_NO_NEW_DATABASE_OR_ROW_EXTRACTION',kernSitusCoverageEstablished:false,ownerContactExported:false};
}
export async function assess(){
  await preservation();const x=await loadInputs(),s=shortlist(x);assert.deepEqual(shortlist(x),s);
  await newJson(`${ROOT}/private-candidate-shortlist.json`,s);
  const a=await attomEvidence(x);await newJson(`${ROOT}/retained-attom-inventory.json`,a);
  const result={status:'ASSESSMENT_ONLY',runtime:process.version,counts:s.counts,selectionFingerprint:s.selectionFingerprint,requiredFinancialEntries:REQUIRED.length,attomCertifiedFilesVerified:a.files.length,
    databaseConnections:0,databaseWrites:0,realFinancialAnalyses:0,round1Selections:0,...offlineStatus()};
  await newJson(`${ROOT}/assessment-receipt.json`,result);return result;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{assert.equal(process.argv.length,3);assert(['capture','assess','preservation'].includes(process.argv[2]));console.log(JSON.stringify(await({capture,assess,preservation}[process.argv[2]])()));}
  catch(e){console.error(JSON.stringify({status:'STOP',code:e.code??'ASSESSMENT_ASSERTION_FAILURE',message:/^[A-Z_]+$/.test(e.message)?e.message:'Private details withheld'}));process.exitCode=1;}
}
