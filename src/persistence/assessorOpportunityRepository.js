export const RESIDENTIAL=['RESIDENTIAL_SINGLE_FAMILY','RESIDENTIAL_MULTI_FAMILY','MANUFACTURED_MOBILE'];
const categories=[...RESIDENTIAL,'VACANT_RESIDENTIAL','VACANT_OTHER','COMMERCIAL','INDUSTRIAL','AGRICULTURAL','GOVERNMENT_EXEMPT','MINERAL','OTHER','UNKNOWN'];
export function assessorOptions(url){return Object.fromEntries(['search','status','priorityBand','identityStatus','sort','assessorStatus','hasSitus','category','geometry','reviewRequired','preset'].map(k=>[k,url.searchParams.get(k)]));}
export function filters(options={}){
  let priority=options.priorityBand||null,selected=options.category?options.category==='OTHER_UNKNOWN'?['OTHER','UNKNOWN']:[options.category]:null;
  if(selected?.some(c=>!categories.includes(c)))throw new Error('INVALID_ASSESSOR_FILTER');
  if(options.preset==='HIGH_RESIDENTIAL'){priority='HIGH_REVIEW_PRIORITY';selected=RESIDENTIAL;}
  else if(options.preset==='HIGH_SFR'){priority='HIGH_REVIEW_PRIORITY';selected=['RESIDENTIAL_SINGLE_FAMILY'];}
  else if(options.preset)throw new Error('INVALID_ASSESSOR_FILTER');
  if(options.assessorStatus&&!['MATCHED_EXACT','UNMATCHED'].includes(options.assessorStatus))throw new Error('INVALID_ASSESSOR_FILTER');
  return {priority,categories:selected,exact:options.preset?'MATCHED_EXACT':options.assessorStatus||null,hasSitus:options.hasSitus==='true',geometry:options.geometry==='true',review:options.reviewRequired==='true'};
}
export async function listAssessorCandidates(tx,options={}){
  const f=filters(options),limit=Math.min(Math.max(Math.trunc(Number(options.limit))||25,1),100),offset=Math.max(Math.trunc(Number(options.offset))||0,0);
  const values=[`%${String(options.search??'').slice(0,200)}%`,options.status||null,f.priority,options.identityStatus||null,limit,offset,f.exact,f.categories,f.hasSitus,f.geometry,f.review];
  const order={priority:'c.screening_score DESC NULLS LAST,c.id',amount:'latest.amount_owed DESC NULLS LAST,c.id',updated:'c.updated_at DESC,c.id',atn:'c.atn,c.id'}[options.sort]??'c.screening_score DESC NULLS LAST,c.id';
  const where=`($1='%%' OR c.candidate_key ILIKE $1 OR c.atn ILIKE $1 OR e.apn9 ILIKE $1 OR e.situs_raw ILIKE $1)
    AND ($2::text IS NULL OR c.candidate_status=$2) AND ($3::text IS NULL OR c.priority_band=$3)
    AND ($4::text IS NULL OR c.identity_status=$4) AND ($7::text IS NULL OR e.crosswalk_status=$7)
    AND ($8::text[] IS NULL OR e.research_use_category=ANY($8)) AND (NOT $9::boolean OR e.situs_status='SITUS_PRESENT')
    AND (NOT $10::boolean OR e.geometry_status='GEOMETRY_EXACT') AND (NOT $11::boolean OR e.review_flags<>'[]'::jsonb)`;
  const from=`FROM opportunity_candidates c LEFT JOIN opportunity_assessor_enrichments e ON e.candidate_id=c.id AND e.superseded_at IS NULL
    LEFT JOIN LATERAL (SELECT r.amount_owed,r.source_page,r.discovery_source_id FROM opportunity_record_links l JOIN discovery_records r ON r.id=l.discovery_record_id WHERE l.candidate_id=c.id ORDER BY r.source_row_number DESC LIMIT 1) latest ON true
    LEFT JOIN discovery_sources ds ON ds.id=latest.discovery_source_id LEFT JOIN properties p ON p.id=c.resolved_property_id
    LEFT JOIN LATERAL (SELECT row_to_json(ar) AS canonical_address FROM candidate_address_resolutions ar WHERE ar.candidate_id=c.id AND ar.superseded_at IS NULL AND ar.verification_status <> 'SUPERSEDED' ORDER BY ar.version DESC LIMIT 1) canonical ON true`;
  const rows=(await tx.query(`SELECT c.id,c.candidate_key,c.atn,c.apn,c.priority_band,c.screening_score,c.score_version,c.identity_status,c.candidate_status,c.resolved_property_id,
    latest.amount_owed,latest.source_page,ds.edition,ds.source_file_hash,p.address_line1,p.city,p.state,p.postal_code,canonical.canonical_address,
    (SELECT count(*)::int FROM deals d WHERE d.property_id=c.resolved_property_id) AS linked_deal_count,to_jsonb(e) AS assessor,
    count(*) OVER()::int AS total_count ${from} WHERE ${where} ORDER BY ${order} LIMIT $5 OFFSET $6`,values)).rows;
  // An out-of-range page must not masquerade as an empty result set.
  let total=rows[0]?.total_count;if(total===undefined){const v=values.slice();v[4]=null;v[5]=null;total=(await tx.query(`SELECT count(*)::int AS total ${from} WHERE ${where} AND $5::int IS NULL AND $6::int IS NULL`,v)).rows[0].total;}
  return {rows,total};
}
export async function readAssessor(tx,id){return (await tx.query('SELECT * FROM opportunity_assessor_enrichments WHERE candidate_id=$1 AND superseded_at IS NULL',[id])).rows[0]??null;}
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o?.[k]!==undefined).map(k=>[k,o[k]]));
// Public API projections are deliberately constructed from allowlists.  Never
// serialize a discovery source, assessor row, or database object and redact it
// afterward: persisted provenance can contain owner/raw-payload/path fields.
export const ASSESSOR_PUBLIC_FIELDS=Object.freeze([
  'id','candidate_id','import_batch_id','assessor_source_edition','assessor_source_date',
  'source_type','source_name','county','disclaimer_reference','source_row_locator','source_row_fingerprint',
  'pts_atn_raw','pts_atn_normalized','assessor_atn_raw','assessor_atn_normalized','crosswalk_status','crosswalk_reason','apn9',
  'situs_raw','situs_status','use_code','use_description','research_use_category','mapping_version','mapping_reason',
  'land_assessment','improvement_assessment','net_assessment','base_year_value','base_year_status',
  'county_acres','county_acres_status','geometry_status','geometry_source_apn9','shape_sqft','shape_acres','acreage_delta','review_flags'
]);
export function safeAssessor(row){
  if(!row)return null;
  const safe=pick(row,ASSESSOR_PUBLIC_FIELDS);
  // Purpose-built provenance; source ZIP/member hashes and source references
  // remain server-side evidence and are not browser contract fields.
  safe.source_type='KERN_COUNTY_ASSESSOR';
  safe.source_name='Kern County Assessor GIS Parcels';
  safe.county='Kern County';
  return safe;
}
export const OPPORTUNITY_PUBLIC_FIELDS=Object.freeze([
  'id','candidate_key','atn','apn','priority_band','screening_score','score_version','identity_status','candidate_status',
  'resolved_property_id','amount_owed','source_page','edition','address_line1','city','state','postal_code','linked_deal_count'
]);
const CANONICAL_PUBLIC_FIELDS=['id','candidate_id','street','city','state','postal_code','postal_code_extension','formatted_address','resolution_source','resolution_method','verification_status','analyst_confirmed','confirmed_at','created_at','version'];
function safeCanonical(value){if(typeof value==='string'){try{value=JSON.parse(value);}catch{return null;}}if(!value)return null;return pick(value,CANONICAL_PUBLIC_FIELDS);}
export function safeOpportunityList(row){
  if(!row)return null;
  let assessor=row.assessor;
  if(typeof assessor==='string'){try{assessor=JSON.parse(assessor);}catch{assessor=null;}}
  let canonical=row.canonical_address;
  if(typeof canonical==='string'){try{canonical=JSON.parse(canonical);}catch{canonical=null;}}
  return {...pick(row,OPPORTUNITY_PUBLIC_FIELDS),assessor:safeAssessor(assessor),canonicalAddress:safeCanonical(canonical)};
}
export function safeOpportunity(row){if(!row)return null;return {...pick(row,['id','atn','apn','candidate_key','priority_band','screening_score','score_version','identity_status','candidate_status','resolved_property_id','address_line1','city','state','postal_code','linked_deal_count']),canonicalAddress:safeCanonical(row.canonical_address),records:(row.records??[]).map(r=>pick(r,['id','source_row_number','source_page','edition','source_file_hash','source_date','amount_owed','atn','apn'])),signals:(row.signals??[]).map(r=>pick(r,['id','signal_type','numeric_value','text_value','status'])),reviews:(row.reviews??[]).map(r=>pick(r,['id','action','reason_code','created_at']))};}
// Candidate detail is a purpose-built read-only contract.  Keep distress and
// linkage labels explicit so the UI never has to inspect or serialize a raw
// discovery/assessor/database object.
export function safeOpportunityDetail(row,assessor){
  const candidate=safeOpportunity(row);if(!candidate)return null;
  const records=candidate.records??[],latest=records[records.length-1]??records[0]??{};
  const safeCounty=safeAssessor(assessor);
  return {...candidate,
    distress:{amountOwed:latest.amount_owed??null,priorityBand:candidate.priority_band??null,screeningScore:candidate.screening_score??null,source:'KERN_POWER_TO_SELL',sourceEdition:latest.edition??null,sourceDate:latest.source_date??null,sourcePage:latest.source_page??null},
    assessor:safeCounty,
    linkage:{propertyId:candidate.resolved_property_id??null,dealCount:Number(candidate.linked_deal_count??0),canonicalAddressId:candidate.canonicalAddress?.id??null},
    addressResolution:candidate.canonicalAddress?{status:candidate.canonicalAddress.verification_status??null,source:candidate.canonicalAddress.resolution_source??null,method:candidate.canonicalAddress.resolution_method??null,analystConfirmed:Boolean(candidate.canonicalAddress.analyst_confirmed)}:{status:'NOT_RESOLVED',source:null,method:null,analystConfirmed:false}
  };
}
export function safeReviewResult(result){return {...result,candidate:safeOpportunity(result.candidate),review:pick(result.review,['id','candidate_id','action','reason_code','created_at'])};}
