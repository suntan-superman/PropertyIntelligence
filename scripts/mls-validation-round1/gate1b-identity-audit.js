import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createDatabase} from '../../src/persistence/db.js';
import {providerReadyAddress} from '../../src/persistence/addressResolutionRepository.js';
import {addressKey} from '../../src/sources/rentcast/propertyLookup.js';

const inputPath='data/runtime/mls-round1/private-candidate-eligibility.json';
const outputPath='data/runtime/mls-round1/private-canonical-identity-audit.json';
const configPath='config/mls-validation-round1.json';
const sourceHash='89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3';
const hash=value=>createHash('sha256').update(value).digest('hex');
const requireThat=(value,code)=>{if(!value)throw new Error(code);};
export const classes=['VERIFIED DURABLE PROPERTY','COUNTY RESOLVED — NOT PERSISTED','IDENTITY REVIEW REQUIRED','EXCLUDED / INACTIVE','UNKNOWN'];
const active=row=>row.superseded_at==null;
const activeLink=row=>active(row)&&row.link_status==='ACTIVE';

// This audit does not select candidates and does not change the existing harness.
export function classifyIdentity(source,data){
  const matches=data.candidates.filter(c=>c.atn===source.county_atn);
  const result={source_record_reference:source.source_record_reference,county_atn:source.county_atn,county_apn9:source.county_apn9,
    candidate_ids:matches.map(c=>c.id),classification:'UNKNOWN',reasons:[],conflicts:[],provider_ready_canonical_address:false,
    strict_harness_eligible:false,strict_harness_status:'IDENTITY_REQUIREMENTS_NOT_MET'};
  const finish=(classification,reason)=>{result.classification=classification;if(reason)result.reasons.push(reason);return result;};
  if(matches.length!==1){if(matches.length>1)result.conflicts.push('MULTIPLE_CANDIDATES_FOR_ATN');return finish(matches.length?'IDENTITY REVIEW REQUIRED':'UNKNOWN',matches.length?'CANDIDATE_ATN_DUPLICATE':'CANDIDATE_NOT_FOUND');}
  const c=matches[0];
  result.candidate={id:c.id,identity_status:c.identity_status,candidate_status:c.candidate_status,archived:!!c.archived_at,qa_marker:c.qa_marker,
    resolved_property_id:c.resolved_property_id,source_relationship_verified:c.source_verified};
  if(c.archived_at||['ARCHIVED','REJECTED','DEFERRED'].includes(c.candidate_status)||c.qa_marker||source.exclusion_reasons.length)return finish('EXCLUDED / INACTIVE','EXCLUDED_OR_INACTIVE_CANDIDATE');
  if(!c.source_verified)return finish('UNKNOWN','CERTIFIED_PTS_SOURCE_RELATIONSHIP_NOT_FOUND');
  const assessors=data.assessors.filter(a=>a.candidate_id===c.id&&active(a));
  result.assessor_enrichment_ids=assessors.map(a=>a.id);
  if(assessors.length!==1){if(assessors.length>1)result.conflicts.push('MULTIPLE_ACTIVE_ASSESSOR_ROWS');return finish(assessors.length?'IDENTITY REVIEW REQUIRED':'UNKNOWN','ACTIVE_ASSESSOR_RELATIONSHIP_NOT_UNIQUE');}
  const a=assessors[0];
  result.assessor={id:a.id,crosswalk_status:a.crosswalk_status,research_use_category:a.research_use_category,situs_status:a.situs_status,evidence_as_of:a.assessor_source_date};
  if(a.pts_atn_normalized!==source.county_atn||a.assessor_atn_normalized!==source.county_atn||a.apn9!==source.county_apn9||a.crosswalk_status!=='MATCHED_EXACT')result.conflicts.push('COUNTY_IDENTITY_DISAGREEMENT');
  if(data.assessors.some(other=>active(other)&&other.apn9===source.county_apn9&&other.candidate_id!==c.id))result.conflicts.push('COUNTY_PARCEL_REPRESENTED_BY_OTHER_CANDIDATE');
  if(a.research_use_category!=='RESIDENTIAL_SINGLE_FAMILY')return finish('EXCLUDED / INACTIVE','CURRENT_CLASSIFICATION_NOT_SFR');
  if(['AMBIGUOUS','SOURCE_STOP'].includes(c.identity_status))result.conflicts.push('CANDIDATE_IDENTITY_STOP');
  const addresses=data.addresses.filter(r=>r.candidate_id===c.id&&active(r)&&r.verification_status!=='SUPERSEDED');
  const links=data.links.filter(l=>l.candidate_id===c.id&&activeLink(l));
  result.address_resolution_ids=addresses.map(r=>r.id);
  result.active_links=links.map(l=>({id:l.id,property_id:l.property_id,address_resolution_id:l.address_resolution_id,assessor_enrichment_id:l.assessor_enrichment_id,origin:l.origin,link_method:l.link_method}));
  result.address_history_count=data.addresses.filter(r=>r.candidate_id===c.id).length;
  result.link_history_count=data.links.filter(l=>l.candidate_id===c.id).length;
  if(addresses.length>1)result.conflicts.push('MULTIPLE_ACTIVE_CANONICAL_RESOLUTIONS');
  if(links.length>1)result.conflicts.push('MULTIPLE_ACTIVE_PROPERTY_LINKS');
  if(data.links.some(l=>l.candidate_id===c.id&&active(l)&&l.link_status==='CONFLICT'))result.conflicts.push('EXPLICIT_LINK_CONFLICT');
  const ar=addresses.length===1?addresses[0]:null;
  if(ar){
    const complete=!!providerReadyAddress({street:ar.street,city:ar.city,state:ar.state,postalCode:ar.postal_code,postalCodeExtension:ar.postal_code_extension??''});
    const coherent=ar.county_enrichment_id===a.id;
    const confirmed=ar.analyst_confirmed===true&&!!ar.confirmed_at&&['ANALYST_CONFIRMED','PROVIDER_CONFIRMED','EXISTING_PROPERTY_CONFIRMED'].includes(ar.verification_status);
    result.canonical_address={id:ar.id,county_enrichment_id:ar.county_enrichment_id,verification_status:ar.verification_status,analyst_confirmed:ar.analyst_confirmed,version:ar.version,
      components:{street:!!ar.street?.trim(),city:!!ar.city?.trim(),state:ar.state==='CA',zip5:/^\d{5}$/.test(ar.postal_code??'')},complete,coherent,confirmed};
    result.provider_ready_canonical_address=complete&&coherent&&confirmed&&ar.state==='CA'&&!ar.qa_marker;
    if(ar.qa_marker)return finish('EXCLUDED / INACTIVE','CANONICAL_QA_MARKER');
    if(!result.provider_ready_canonical_address)result.reasons.push('CANONICAL_ADDRESS_INCOMPLETE_UNCONFIRMED_OR_INCOHERENT');
  }
  const link=links.length===1?links[0]:null;
  if(link?.qa_marker)return finish('EXCLUDED / INACTIVE','LINK_QA_MARKER');
  if(link&&(Number(link.property_link_count)>1||Number(link.resolution_link_count)>1||Number(link.other_legacy_count)>0))result.conflicts.push('SHARED_PROPERTY_OR_RESOLUTION_IDENTITY');
  if(link&&c.resolved_property_id&&c.resolved_property_id!==link.property_id)result.conflicts.push('LEGACY_AND_ACTIVE_PROPERTY_CONFLICT');
  const propertyId=link?.property_id??c.resolved_property_id;
  const p=propertyId?data.properties.find(p=>p.id===propertyId):null;
  result.durable_property_id=propertyId??null;
  if(p){result.property={id:p.id,archived:!!p.archived_at,qa_marker:p.qa_marker,identity_status:p.identity_status};if(p.archived_at||p.qa_marker)return finish('EXCLUDED / INACTIVE','PROPERTY_ARCHIVED_OR_QA');}
  if(result.conflicts.length)return finish('IDENTITY REVIEW REQUIRED','CONFLICT_REQUIRES_REVIEW');
  if(ar&&!result.provider_ready_canonical_address)return finish('IDENTITY REVIEW REQUIRED','CANONICAL_RESOLUTION_REQUIRES_REVIEW');
  if(!propertyId){
    const orphan=data.properties.filter(p=>p.atn===source.county_atn||p.apn===source.county_apn9);
    result.unlinked_exact_county_identifier_property_ids=orphan.map(p=>p.id);
    if(orphan.length)return finish('IDENTITY REVIEW REQUIRED','PROPERTY_HAS_EXACT_COUNTY_IDENTIFIER_WITHOUT_AUTHORITATIVE_LINK');
    return finish('COUNTY RESOLVED — NOT PERSISTED',ar?'CONFIRMED_ADDRESS_WITHOUT_DURABLE_PROPERTY':'NO_CANONICAL_RESOLUTION_OR_DURABLE_PROPERTY');
  }
  if(!p)return finish('UNKNOWN','REFERENCED_PROPERTY_NOT_FOUND');
  if(!link||!ar)return finish('IDENTITY REVIEW REQUIRED','EXPLICIT_LINK_OR_ACTIVE_CANONICAL_RESOLUTION_MISSING');
  if(link.address_resolution_id!==ar.id||link.assessor_enrichment_id!==a.id||link.origin!=='OPPORTUNITY_ANALYSIS_WORKFLOW'||link.link_method!=='EXPLICIT_WORKFLOW_CONTEXT')return finish('IDENTITY REVIEW REQUIRED','LINK_CONTEXT_INCOHERENT');
  // Compare only after following durable foreign keys. Never use addresses to discover a link.
  const addressAgrees=addressKey(ar.formatted_address)===p.normalized_address;
  result.linked_property_address_agrees=addressAgrees;
  if(!addressAgrees||p.identity_status==='AMBIGUOUS')return finish('IDENTITY REVIEW REQUIRED','LINKED_PROPERTY_IDENTITY_DISAGREES');
  result.strict_harness_status='IDENTITY_VERIFIED_STANDARD_ANALYSIS_READINESS_NOT_ASSESSED';
  result.strict_harness_eligible=null;
  return finish('VERIFIED DURABLE PROPERTY');
}

export function verifyReadOnly(row){requireThat(row?.read_only==='on'&&row.isolation==='repeatable read','READ_ONLY_TRANSACTION_NOT_VERIFIED');}

async function main(){
  const original=await readFile(inputPath),configBefore=await readFile(configPath);
  const source=JSON.parse(original),config=JSON.parse(configBefore);
  const cohort=source.candidates.filter(r=>r.eligibility_class==='B_POTENTIALLY_ELIGIBLE_IDENTITY_REVIEW'&&r.exclusion_reasons.length===0);
  requireThat(cohort.length===80&&new Set(cohort.map(r=>r.county_atn)).size===80&&new Set(cohort.map(r=>r.county_apn9)).size===80,'PRIVATE_COHORT_NOT_EXACTLY_80_UNIQUE_IDENTITIES');
  requireThat(cohort.every(r=>/^\d{11}$/.test(r.county_atn)&&/^\d{9}$/.test(r.county_apn9)),'PRIVATE_IDENTITY_INVALID');
    requireThat(config.executionAuthorized===false&&config.selectionSeed===null&&config.cohortFingerprint===null&&config.selectionLocked===false&&config.mlsAllowedBeforeFreeze===false&&config.evidenceStackLocked===false&&config.assumptionsLocked===false&&config.monteCarloLocked===false,'ROUND1_GATE_CHANGED');
  execFileSync('git',['check-ignore','--quiet',outputPath],{stdio:'pipe'});
  try{process.loadEnvFile('.env');}catch(e){if(e.code!=='ENOENT')throw new Error('ENV_LOAD_STOP');}
  // Disable HTTP requests. The only external I/O used below is the existing PostgreSQL TLS connection.
  globalThis.fetch=()=>{throw new Error('PROVIDER_NETWORK_FORBIDDEN');};
  const db=createDatabase();requireThat(db,'DATABASE_NOT_CONFIGURED');
  let client,inTransaction=false,readOnlyVerified=false;
  const queryLog=[];
  async function select(label,sql,params=[]){
    requireThat(readOnlyVerified&&/^SELECT\b/i.test(sql.trim())&&!/;|\b(?:INSERT|UPDATE|DELETE|UPSERT|ALTER|CREATE|DROP|TRUNCATE|COPY|CALL)\b/i.test(sql),'READ_ONLY_QUERY_GUARD');
    const value=await client.query({text:sql,values:params,query_timeout:30000});queryLog.push({label,rows:value.rows.length});return value.rows;
  }
  const receipt={status:'STOP',inputManifestSha256:hash(original),startedAt:new Date().toISOString(),queryLog,providerCalls:0,productionWrites:0,propertiesSelected:0,mlsAccess:0};
  try{
    client=await db.getPool().connect();
    requireThat(client.connection?.stream?.encrypted&&client.connection.stream.authorized===true,'VERIFIED_DATABASE_TLS_REQUIRED');
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');inTransaction=true;
    const guard=(await client.query("SELECT current_setting('transaction_read_only') AS read_only,current_setting('transaction_isolation') AS isolation")).rows[0];
    verifyReadOnly(guard);readOnlyVerified=true;queryLog.push({label:'read_only_verification',rows:1});receipt.transaction=guard;
    const tables=['opportunity_candidates','opportunity_assessor_enrichments','candidate_address_resolutions','opportunity_property_links','properties','opportunity_record_links','discovery_records','discovery_sources'];
    const visibility=await select('visibility_metadata',`SELECT c.relname,has_table_privilege(c.oid,'SELECT') AS can_select,row_security_active(c.oid) AS rls_filtering
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[])`,[tables]);
    requireThat(visibility.length===tables.length&&visibility.every(v=>v.can_select&&!v.rls_filtering),'COMPLETE_READ_VISIBILITY_NOT_VERIFIED');
    receipt.visibilityVerified=true;
    const atns=cohort.map(r=>r.county_atn),apns=cohort.map(r=>r.county_apn9);
    const candidates=await select('scoped_candidates',`SELECT c.id,c.atn,c.apn,c.jurisdiction,c.identity_status,c.candidate_status,c.archived_at,c.resolved_property_id,
      c.candidate_key ~* '(^|[^a-z])(QA|TEST|SYNTHETIC|SPRINT[0-9_]*)([^a-z]|$)' AS qa_marker,
      EXISTS(SELECT 1 FROM public.opportunity_record_links l JOIN public.discovery_records r ON r.id=l.discovery_record_id
        JOIN public.discovery_sources s ON s.id=r.discovery_source_id WHERE l.candidate_id=c.id AND r.atn=c.atn AND s.source_file_hash=$2) AS source_verified
      FROM public.opportunity_candidates c WHERE c.atn=ANY($1::text[])`,[atns,sourceHash]);
    const ids=candidates.map(c=>c.id);
    const assessors=await select('scoped_assessors_and_exact_parcel_collisions',`SELECT id,candidate_id,pts_atn_normalized,assessor_atn_normalized,apn9,crosswalk_status,research_use_category,situs_status,assessor_source_date,superseded_at
      FROM public.opportunity_assessor_enrichments WHERE candidate_id=ANY($1::uuid[]) OR (superseded_at IS NULL AND apn9=ANY($2::text[]))`,[ids,apns]);
    const addresses=await select('scoped_canonical_resolution_history',`SELECT id,candidate_id,county_enrichment_id,street,city,state,postal_code,postal_code_extension,formatted_address,verification_status,analyst_confirmed,confirmed_at,version,superseded_at,
      COALESCE(created_by_context,'') ~* '(^|[^a-z])(QA|TEST|SYNTHETIC)([^a-z]|$)' AS qa_marker
      FROM public.candidate_address_resolutions WHERE candidate_id=ANY($1::uuid[])`,[ids]);
    const links=await select('scoped_link_history_and_global_reference_counts',`SELECT l.id,l.candidate_id,l.property_id,l.address_resolution_id,l.assessor_enrichment_id,l.origin,l.link_method,l.link_status,l.superseded_at,
      COALESCE(l.created_by_context,'') ~* '(^|[^a-z])(QA|TEST|SYNTHETIC)([^a-z]|$)' AS qa_marker,
      (SELECT count(*)::int FROM public.opportunity_property_links x WHERE x.property_id=l.property_id AND x.link_status='ACTIVE' AND x.superseded_at IS NULL) AS property_link_count,
      (SELECT count(*)::int FROM public.opportunity_property_links x WHERE x.address_resolution_id=l.address_resolution_id AND x.link_status='ACTIVE' AND x.superseded_at IS NULL) AS resolution_link_count,
      (SELECT count(*)::int FROM public.opportunity_candidates x WHERE x.resolved_property_id=l.property_id AND x.id<>l.candidate_id) AS other_legacy_count
      FROM public.opportunity_property_links l WHERE l.candidate_id=ANY($1::uuid[])`,[ids]);
    const propertyIds=[...new Set([...candidates.map(c=>c.resolved_property_id),...links.map(l=>l.property_id)].filter(Boolean))];
    const properties=await select('referenced_properties_and_exact_county_identifier_checks',`SELECT id,atn,apn,identity_status,archived_at,normalized_address,
      address_line1 ~* '(^|[^a-z])(QA|TEST|SYNTHETIC|SPRINT[0-9_]*)([^a-z]|$)' AS qa_marker
      FROM public.properties WHERE id=ANY($1::uuid[]) OR atn=ANY($2::text[]) OR apn=ANY($3::text[])`,[propertyIds,atns,apns]);
    const data={candidates,assessors,addresses,links,properties};
    const results=cohort.map(row=>classifyIdentity(row,data));
    const end=(await select('final_read_only_verification',"SELECT current_setting('transaction_read_only') AS read_only,current_setting('transaction_isolation') AS isolation,pg_current_xact_id_if_assigned() IS NULL AS no_write_transaction_id"))[0];
    verifyReadOnly(end);requireThat(end.no_write_transaction_id,'UNEXPECTED_WRITE_TRANSACTION_ID');
    await client.query('ROLLBACK');inTransaction=false;receipt.rolledBack=true;receipt.noWriteTransactionId=true;
    requireThat(hash(await readFile(inputPath))===hash(original)&&hash(await readFile(configPath))===hash(configBefore),'INPUT_OR_AUTHORIZATION_CHANGED');
    const counts=Object.fromEntries(classes.map(label=>[label,results.filter(r=>r.classification===label).length]));
    const verified=counts['VERIFIED DURABLE PROPERTY'];
    const summary={candidatesEvaluated:results.length,candidateRowsMatched:candidates.length,counts,
      duplicateOrConflictingCandidates:results.filter(r=>r.conflicts.length).length,
      duplicateCandidateIds:candidates.length-new Set(candidates.map(c=>c.id)).size,
      duplicateCanonicalResolutionIds:results.flatMap(r=>r.address_resolution_ids??[]).length-new Set(results.flatMap(r=>r.address_resolution_ids??[])).size,
      duplicateDurablePropertyIds:results.filter(r=>r.durable_property_id).length-new Set(results.map(r=>r.durable_property_id).filter(Boolean)).size,
      duplicateCohortCountyParcels:cohort.length-new Set(cohort.map(r=>r.county_apn9)).size,
      providerReadyCanonicalAddresses:results.filter(r=>r.provider_ready_canonical_address).length,
      strictHarnessEligible:verified===0?0:'UNKNOWN_STANDARD_ANALYSIS_GATE_NOT_EVALUATED',
      decision:'GATE 1 IDENTITY REQUIREMENT BLOCKED',
      decisionBasis:verified>=6?'STANDARD_ANALYSIS_READINESS_NOT_ESTABLISHED':'FEWER_THAN_SIX_VERIFIED_DURABLE_PROPERTIES'};
    receipt.status='COMPLETED_READ_ONLY';receipt.completedAt=new Date().toISOString();receipt.summary=summary;
    receipt.databaseSelectStatements=queryLog.length;receipt.transactionControlStatements=2;receipt.authorizationUnchanged=true;receipt.inputManifestUnchanged=true;
    receipt.candidates=results;receipt.snapshotFingerprint=hash(JSON.stringify(data));
    await writeFile(outputPath,JSON.stringify(receipt,null,2)+'\n');
    console.log(JSON.stringify({status:receipt.status,summary,queryLog,readOnlyVerified:true,rolledBack:true,productionWrites:0,providerCalls:0,propertiesSelected:0,authorizationChanged:false},null,2));
  }finally{
    if(inTransaction)await client?.query('ROLLBACK').catch(()=>{});
    client?.release();await db.close();
  }
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  main().catch(error=>{console.error(JSON.stringify({status:'STOP',code:/^[A-Z_]+$/.test(error.message??'')?error.message:'SANITIZED_AUDIT_FAILURE',sqlState:/^[0-9A-Z]{5}$/.test(error.code??'')?error.code:null}));process.exitCode=1;});
}
