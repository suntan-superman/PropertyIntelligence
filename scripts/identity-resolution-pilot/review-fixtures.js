// Synthetic-only local QA files. Never copies actual county data.
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {CODES,sha} from './review-model.js';
export async function syntheticReviewDirectory(){
  const parent=resolve('data/runtime/identity-review-qa');await mkdir(parent,{recursive:true});
  const directory=await mkdtemp(join(parent,'synthetic-'));
  const identities=[];
  for(const [index,code]of CODES.entries()){
    const packet={pilotCode:code,recordKind:'REAL_COUNTY_CANDIDATE_PRIVATE_REVIEW',qaFixture:true,candidateId:`SYNTHETIC-CANDIDATE-${index+1}`,
      county:{jurisdiction:'KERN_CA',atn:`9000000000${index+1}`,apn9:`90000000${index+1}`},
      addressReview:{rawCountySitus:`${index+1} Synthetic Example St, Example City`,components:{street:`${index+1} Synthetic Example St`,city:'Example City',state:'',postalCode:'',analystConfirmed:false},missingComponents:['state','postalCode'],postalValidated:false},
      assessor:{id:`SYNTHETIC-ASSESSOR-${index+1}`,sourceRow:index+1,match:'MATCHED_EXACT',useCode:'SYNTHETIC',officialDescription:'Synthetic single family classification',researchCategory:'RESIDENTIAL_SINGLE_FAMILY',countyReviewFlags:code==='IP-P2'?[]:['ACREAGE_DELTA_GT_0_01']},
      evidence:{sourceHashes:{dbf:sha('Synthetic Assessor file only')},assessorAsOf:'2026-01-01',powerToSellAsOf:'2026-01-02',originalSourceAcquiredAt:null,databaseSnapshotAt:'2026-01-03',localVerificationAt:'2026-01-04'},
      identity:{countyPass:true,assessorPass:true,uniqueCountyIdentity:true,uniqueAssessorRelationship:true,countyParcelConflict:false,conflicts:[],archivedOrInactive:false,existingPropertyId:null,activeLinkCount:0,canonicalResolutionStatus:'ABSENT_AT_SYNTHETIC_SNAPSHOT'}};
    packet.packetSha256=sha(JSON.stringify(packet));
    await writeFile(join(directory,`${code}-review.json`),JSON.stringify(packet,null,2)+'\n');
    await writeFile(join(directory,`${code}-analyst-decision.json`),JSON.stringify({pilotCode:code,packetSha256:packet.packetSha256,decision:null,reviewedBy:null,reviewedAt:null,confirmedAddress:null,componentEvidenceReferences:{}},null,2)+'\n');
    identities.push({pilotCode:code,candidateId:packet.candidateId,atn:packet.county.atn,apn9:packet.county.apn9});
  }
  await writeFile(join(directory,'pilot-exclusions.json'),JSON.stringify({permanentRound1Exclusion:true,identities},null,2)+'\n');
  return directory;
}
export function syntheticSubmission(view){return {pilotCode:view.packet.pilotCode,packetSha256:view.packet.packetSha256,decisionRevision:view.decisionRevision,decision:'APPROVED',reviewedBy:'Synthetic Reviewer',reviewerAcknowledged:true,
  confirmedAddress:{...view.packet.addressReview.components,state:'CA',postalCode:'99999'},
  componentEvidenceReferences:{street:'Synthetic document page 1',city:'Synthetic document page 1',state:'Synthetic document page 2',postalCode:'Synthetic document page 2'},
  componentVerification:{street:'VERIFIED',city:'VERIFIED',state:'VERIFIED',postalCode:'VERIFIED'},supportingEvidenceReferences:'Synthetic QA source only; no actual property.',notes:'Synthetic decision used to test save/reopen.',contradictionStatus:'NONE_REMAINING',addressChangeNotes:'',acreageAcknowledged:true,acreageNotes:'Synthetic discrepancy acknowledged; not automatically disqualifying.'};}
