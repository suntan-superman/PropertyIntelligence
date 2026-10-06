import {createHash} from 'node:crypto';
import {createDatabase} from '../src/persistence/db.js';
import {writeJson} from '../src/io/files.js';
import {addressKey} from '../src/sources/rentcast/propertyLookup.js';

// This command remains the read-only review packet.  The separately gated
// apply script is allowlisted to the one authorized 3484 Haven pair.
const args=process.argv.slice(2);
const value=(flag)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
const candidateId=value('--candidate-id'),propertyId=value('--property-id');
if(!args.includes('--dry-run')||!candidateId||!propertyId||args.includes('--apply')){
  console.error('Usage: npm run opportunity:property:reconcile -- --candidate-id <uuid> --property-id <uuid> --dry-run');
  process.exitCode=2;
}

const digest=(value)=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
const safeError=(error)=>({code:/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'SANITIZED_DATABASE_FAILURE',sqlState:/^[0-9A-Z]{5}$/.test(error?.code??'')?error.code:null});
const report={status:'STOP_DRY_RUN',mode:'READ_ONLY_RECONCILIATION',writes:{performed:false},providerCalls:{rentcast:0,google:0,county:0},requested:{candidateId,propertyId},plannedOperation:null};
let db;
try{
  if(process.exitCode===2)throw new Error('USAGE');
  try{process.loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw new Error('ENV_LOAD_STOP');}
  db=createDatabase();if(!db)throw new Error('DATABASE_NOT_CONFIGURED');
  const table=(name)=>db.query('SELECT to_regclass($1) AS relation',[`public.${name}`]);
  const ledger=(await db.query("SELECT filename,checksum,applied_at FROM property_intelligence_schema_migrations WHERE filename IN ('001_persistent_intelligence.sql','002_acquisition_decisions.sql','003_opportunity_discovery.sql','004_kern_assessor_opportunity_enrichment.sql','005_candidate_address_resolutions.sql','006_opportunity_property_links.sql') ORDER BY filename")).rows;
  report.migrationLedger=ledger.map(row=>({filename:row.filename,checksum:row.checksum,appliedAt:row.applied_at}));
  const linkTable=(await table('opportunity_property_links')).rows[0]?.relation!==null;
  report.schemaLinkTablePresent=linkTable;
  const candidate=(await db.query(`SELECT id,candidate_key,atn,apn,priority_band,screening_score,score_version,identity_status,candidate_status,resolved_property_id
    FROM opportunity_candidates WHERE id=$1`,[candidateId])).rows[0];
  if(!candidate)throw new Error('CANDIDATE_NOT_FOUND');
  const property=(await db.query(`SELECT id,address_line1,city,state,postal_code,normalized_address,identity_status,archived_at
    FROM properties WHERE id=$1`,[propertyId])).rows[0];
  if(!property)throw new Error('PROPERTY_NOT_FOUND');
  const canonical=(await db.query(`SELECT id,candidate_id,street,city,state,postal_code,postal_code_extension,formatted_address,
    resolution_source,resolution_method,verification_status,analyst_confirmed,confirmed_at,version
    FROM candidate_address_resolutions WHERE candidate_id=$1 AND superseded_at IS NULL AND verification_status <> 'SUPERSEDED'
    ORDER BY version DESC LIMIT 1`,[candidateId])).rows[0]??null;
  const assessor=(await db.query(`SELECT id,candidate_id,assessor_atn_normalized,apn9,pts_atn_normalized,crosswalk_status,situs_status,situs_raw
    FROM opportunity_assessor_enrichments WHERE candidate_id=$1 AND superseded_at IS NULL`,[candidateId])).rows[0]??null;
  const evidence=(await db.query(`SELECT id,source,source_record_id,retrieved_at,snapshot_type,status,
    jsonb_typeof(property_payload) AS property_payload_type,jsonb_typeof(valuation_payload) AS valuation_payload_type,
    jsonb_typeof(provenance_payload) AS provenance_payload_type
    FROM evidence_snapshots WHERE property_id=$1 ORDER BY retrieved_at DESC,id DESC`,[propertyId])).rows;
  let links=[];
  if(linkTable)links=(await db.query(`SELECT id,candidate_id,property_id,address_resolution_id,assessor_enrichment_id,origin,link_method,link_status,created_at,superseded_at,created_by_context
    FROM opportunity_property_links WHERE candidate_id=$1 ORDER BY created_at DESC`,[candidateId])).rows;
  const canonicalMatch=Boolean(canonical&&addressKey(canonical.formatted_address)===property.normalized_address);
  const candidateConflict=Boolean(candidate.resolved_property_id&&candidate.resolved_property_id!==propertyId);
  const activeLinks=links.filter(row=>row.link_status==='ACTIVE'&&!row.superseded_at);
  const propertyConflict=activeLinks.some(row=>row.property_id!==propertyId);
  report.candidate={id:candidate.id,candidateKey:candidate.candidate_key,atn:candidate.atn,apn:candidate.apn,priorityBand:candidate.priority_band,screeningScore:candidate.screening_score,scoreVersion:candidate.score_version,identityStatus:candidate.identity_status,candidateStatus:candidate.candidate_status,resolvedPropertyId:candidate.resolved_property_id};
  report.property={id:property.id,addressLine1:property.address_line1,city:property.city,state:property.state,postalCode:property.postal_code,normalizedAddress:property.normalized_address,identityStatus:property.identity_status,archived:Boolean(property.archived_at)};
  report.canonicalAddress=canonical?{id:canonical.id,candidateId:canonical.candidate_id,street:canonical.street,city:canonical.city,state:canonical.state,postalCode:canonical.postal_code,formattedAddress:canonical.formatted_address,resolutionSource:canonical.resolution_source,resolutionMethod:canonical.resolution_method,verificationStatus:canonical.verification_status,analystConfirmed:canonical.analyst_confirmed,version:canonical.version}:null;
  report.assessorContext=assessor?{id:assessor.id,candidateId:assessor.candidate_id,assessorAtn:assessor.assessor_atn_normalized,apn9:assessor.apn9,ptsAtn:assessor.pts_atn_normalized,crosswalkStatus:assessor.crosswalk_status,situsStatus:assessor.situs_status,situsRaw:assessor.situs_raw}:null;
  report.evidence=evidence.map(row=>({id:row.id,source:row.source,sourceRecordId:row.source_record_id,retrievedAt:row.retrieved_at,snapshotType:row.snapshot_type,status:row.status,fieldTypes:{property:row.property_payload_type,valuation:row.valuation_payload_type,provenance:row.provenance_payload_type},metadataFingerprint:digest({id:row.id,source:row.source,sourceRecordId:row.source_record_id,retrievedAt:row.retrieved_at,snapshotType:row.snapshot_type,status:row.status})}));
  report.linkState={activeLinkCount:activeLinks.length,totalHistoryCount:links.length,activeLinks:activeLinks.map(row=>({id:row.id,propertyId:row.property_id,addressResolutionId:row.address_resolution_id,assessorEnrichmentId:row.assessor_enrichment_id,origin:row.origin,linkMethod:row.link_method}))};
  report.reconciliation={exactCandidatePropertyContext:Boolean(candidate.id&&property.id),canonicalAddressExactMatch:canonicalMatch,candidateResolvedPropertyConflict:candidateConflict,activePropertyLinkConflict:propertyConflict,originRecoverable:Boolean(canonical&&assessor),evidenceRows:evidence.length,plannedLink:{candidateId,propertyId,addressResolutionId:canonical?.id??null,assessorEnrichmentId:assessor?.id??null,origin:'OPPORTUNITY_ANALYSIS_WORKFLOW',linkMethod:'EXPLICIT_WORKFLOW_CONTEXT',linkStatus:'ACTIVE',createdByContext:'OPPORTUNITY_ANALYSIS'}};
  report.plannedOperation=(report.schemaLinkTablePresent&&!candidateConflict&&!propertyConflict&&canonicalMatch&&canonical&&assessor)
    ?(activeLinks.length?'ALREADY_LINKED_EXPLICIT_WORKFLOW':'INSERT_ACTIVE_EXPLICIT_WORKFLOW_LINK'):'STOP_REVIEW';
  report.proof={readOnlyEvidence:true,noAddressInference:true,noStringOrFuzzyLinking:true,noEvidenceRefresh:true,noDealCreation:true,propertyEvidenceMetadataFingerprints:report.evidence.map(row=>row.metadataFingerprint)};
}catch(error){report.status='STOP_DRY_RUN';report.error=safeError(error);if(error.message==='USAGE')report.error={code:'USAGE'};process.exitCode=1;}
finally{await writeJson('data/validation/sprint6_3_3-reconciliation-dry-run.json',report);if(db)await db.close();}
console.log(JSON.stringify(report,null,2));
