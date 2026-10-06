import {isUuid,rowJson} from './db.js';
import {addressKey} from '../sources/rentcast/propertyLookup.js';

const publicLinkFields=['id','candidate_id','property_id','address_resolution_id','assessor_enrichment_id','origin','link_method','link_status','created_at','superseded_at','created_by_context'];
const safe=row=>row?Object.fromEntries(publicLinkFields.filter(key=>row[key]!==undefined).map(key=>[key,row[key]])):null;

export function safeOpportunityPropertyLink(row){return safe(row);}

export async function activeOpportunityPropertyLink(tx,candidateId){
  const {rows}=await tx.query(`SELECT l.id,l.candidate_id,l.property_id,l.address_resolution_id,l.assessor_enrichment_id,l.origin,l.link_method,l.link_status,l.created_at,l.superseded_at,l.created_by_context,
    p.address_line1,p.city,p.state,p.postal_code,
    (SELECT count(*)::int FROM deals d WHERE d.property_id=l.property_id AND d.archived_at IS NULL) AS linked_deal_count
    FROM opportunity_property_links l JOIN properties p ON p.id=l.property_id
    WHERE l.candidate_id=$1 AND l.link_status='ACTIVE' AND l.superseded_at IS NULL LIMIT 1`,[candidateId]);
  return rows[0]?rowJson(rows[0]):null;
}

export async function listOpportunityPropertyLinks(tx,candidateId){
  const {rows}=await tx.query(`SELECT l.*,p.address_line1,p.city,p.state,p.postal_code,
    (SELECT count(*)::int FROM deals d WHERE d.property_id=l.property_id AND d.archived_at IS NULL) AS linked_deal_count
    FROM opportunity_property_links l JOIN properties p ON p.id=l.property_id
    WHERE l.candidate_id=$1 ORDER BY l.created_at DESC`,[candidateId]);
  return rows.map(rowJson);
}

export async function createOpportunityPropertyLink(tx,{candidateId,propertyId,addressResolutionId=null,assessorEnrichmentId=null,origin='OPPORTUNITY_ANALYSIS_WORKFLOW',linkMethod='EXPLICIT_WORKFLOW_CONTEXT',linkStatus='ACTIVE',createdByContext=null,idempotencyKey=null}){
  if(!isUuid(candidateId))throw new Error('INVALID_CANDIDATE_ID');
  if(!isUuid(propertyId))throw new Error('INVALID_PROPERTY_ID');
  if(addressResolutionId&&!isUuid(addressResolutionId))throw new Error('INVALID_ADDRESS_RESOLUTION_ID');
  if(assessorEnrichmentId&&!isUuid(assessorEnrichmentId))throw new Error('INVALID_ASSESSOR_ENRICHMENT_ID');
  if(origin!=='OPPORTUNITY_ANALYSIS_WORKFLOW'||linkMethod!=='EXPLICIT_WORKFLOW_CONTEXT'||linkStatus!=='ACTIVE')throw new Error('OPPORTUNITY_PROPERTY_LINK_INVALID');
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`opportunity-property-link:${candidateId}`]);
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`opportunity-property-property:${propertyId}`]);
  const candidate=(await tx.query('SELECT id,resolved_property_id FROM opportunity_candidates WHERE id=$1 FOR UPDATE',[candidateId])).rows[0];
  if(!candidate)throw new Error('CANDIDATE_NOT_FOUND');
  const property=(await tx.query('SELECT id,normalized_address FROM properties WHERE id=$1 FOR KEY SHARE',[propertyId])).rows[0];
  if(!property)throw new Error('PROPERTY_NOT_FOUND');
  if(candidate.resolved_property_id&&candidate.resolved_property_id!==propertyId)throw new Error('OPPORTUNITY_PROPERTY_CONFLICT');
  if(addressResolutionId){
    const address=(await tx.query("SELECT id,candidate_id,formatted_address,verification_status,superseded_at FROM candidate_address_resolutions WHERE id=$1",[addressResolutionId])).rows[0];
    if(!address||address.candidate_id!==candidateId||address.superseded_at||address.verification_status==='SUPERSEDED')throw new Error('OPPORTUNITY_ADDRESS_LINK_MISMATCH');
    if(addressKey(address.formatted_address)!==property.normalized_address)throw new Error('OPPORTUNITY_ADDRESS_CONTEXT_MISMATCH');
  }
  if(assessorEnrichmentId){
    const assessor=(await tx.query('SELECT id,candidate_id,superseded_at FROM opportunity_assessor_enrichments WHERE id=$1',[assessorEnrichmentId])).rows[0];
    if(!assessor||assessor.candidate_id!==candidateId||assessor.superseded_at)throw new Error('OPPORTUNITY_ASSESSOR_LINK_MISMATCH');
  }
  const active=(await tx.query("SELECT * FROM opportunity_property_links WHERE candidate_id=$1 AND link_status='ACTIVE' AND superseded_at IS NULL FOR UPDATE",[candidateId])).rows[0];
  if(active){
    if(active.property_id!==propertyId)throw new Error('OPPORTUNITY_PROPERTY_CONFLICT');
    if(addressResolutionId&&active.address_resolution_id!==addressResolutionId)throw new Error('OPPORTUNITY_PROPERTY_LINK_CONTEXT_MISMATCH');
    return {link:safe(rowJson(active)),idempotentReplay:true};
  }
  const other=(await tx.query("SELECT candidate_id FROM opportunity_property_links WHERE property_id=$1 AND link_status='ACTIVE' AND superseded_at IS NULL LIMIT 1",[propertyId])).rows[0];
  if(other&&other.candidate_id!==candidateId)throw new Error('OPPORTUNITY_PROPERTY_CONFLICT');
  const row=(await tx.query(`INSERT INTO opportunity_property_links
    (candidate_id,property_id,address_resolution_id,assessor_enrichment_id,origin,link_method,link_status,created_by_context,idempotency_key)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[candidateId,propertyId,addressResolutionId,assessorEnrichmentId,origin,linkMethod,linkStatus,createdByContext,idempotencyKey])).rows[0];
  return {link:safe(rowJson(row)),idempotentReplay:false};
}
