import {createHash} from 'node:crypto';
import {idempotent,isUuid,rowJson} from '../persistence/db.js';
import {findDiscoverySource,insertDiscoverySource,insertDiscoveryRecord,upsertOpportunityCandidate,insertRecordLink,insertSignal,insertReview,getSourceStatus,listCandidates,getCandidate,updateCandidate} from '../persistence/opportunityRepository.js';
import {candidateIdentityHints,deriveSignals,screenCandidate,rankingExplanation,normalizeCandidateStatus,SCREEN_VERSION,REJECTION_REASONS,CANDIDATE_STATUSES,IDENTITY_STATUSES} from '../opportunities/screening.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const parse=value=>typeof value==='string'&&/^[{[]/.test(value)?JSON.parse(value):value;
const validUuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function importSource({db,source,records,requestKey=null}){
  if(!db)throw new Error('DATABASE_NOT_CONFIGURED');
  if(!source?.sourceFileHash||!Array.isArray(records))throw new Error('SOURCE_IMPORT_INVALID');
  return db.transaction(tx=>idempotent(tx,requestKey,'KERN_IMPORT',async()=>{
    const prior=await findDiscoverySource(tx,{sourceFileHash:source.sourceFileHash});
    if(prior){const status=await getSourceStatus(tx,source.sourceFileHash);return {source:rowJson(prior),status,alreadyImported:true,providerCalls:0};}
    const savedSource=await insertDiscoverySource(tx,source);let insertedRecords=0,linkedRecords=0,signalsCreated=0;
    const chunks=(items,size=300)=>{const result=[];for(let i=0;i<items.length;i+=size)result.push(items.slice(i,i+size));return result;};
    const bulk=async(items,columns,render,conflict='')=>{let rows=[];for(const chunk of chunks(items)){const values=[];const placeholders=chunk.map(item=>{const start=values.length;const rendered=render(item,values);return `(${rendered.map((_,index)=>`$${start+index+1}`).join(',')})`;});const sql=`INSERT INTO ${columns.table} (${columns.names.join(',')}) VALUES ${placeholders.join(',')}${conflict} RETURNING *`;rows.push(...(await tx.query(sql,values)).rows);}return rows;};
    const recordRows=await bulk(records,{table:'discovery_records',names:['discovery_source_id','source_row_number','source_page','external_identifier','atn','apn','owner_name','amount_owed','raw_payload','normalized_payload','record_fingerprint']},(record,values)=>{values.push(savedSource.id,record.sourceRowNumber,record.sourcePage??null,record.externalIdentifier,record.atn??null,record.apn??null,record.ownerName??null,record.amountOwed??null,JSON.stringify(record.rawPayload),JSON.stringify(record.normalizedPayload),record.recordFingerprint);return values.slice(values.length-11);},' ON CONFLICT (discovery_source_id,record_fingerprint) DO NOTHING');
    insertedRecords=recordRows.length;const recordsByFingerprint=new Map(recordRows.map(row=>[row.record_fingerprint,row]));
    const candidateValues=new Map();for(const record of records){const savedRecord=recordsByFingerprint.get(record.recordFingerprint);if(!savedRecord)continue;const hints=candidateIdentityHints({atn:record.atn,apn:record.apn,recordFingerprint:record.recordFingerprint});const screen=screenCandidate({normalized:record.normalizedPayload,id:savedRecord.id});const priorValue=candidateValues.get(hints.candidateKey);if(!priorValue||Number(record.normalizedPayload?.parcelAmountOwed??-1)>Number(priorValue.record.normalizedPayload?.parcelAmountOwed??-1))candidateValues.set(hints.candidateKey,{...hints,record,screen});}
    const candidates=await bulk([...candidateValues.values()],{table:'opportunity_candidates',names:['jurisdiction','candidate_key','atn','apn','normalized_owner_name','identity_status','candidate_status','priority_band','screening_score','score_version']},(item,values)=>{values.push(source.jurisdiction,item.candidateKey,item.record.atn??null,item.record.apn??null,item.record.normalizedPayload?.ownerName??null,item.identityStatus,normalizeCandidateStatus(item.identityStatus),item.screen.priorityBand,item.screen.score,item.screen.scoreVersion);return values.slice(values.length-10);},' ON CONFLICT (candidate_key) DO UPDATE SET last_seen_at=now(),updated_at=now()');
    const candidateByKey=new Map(candidates.map(row=>[row.candidate_key,row]));
    const linkItems=[];const signalItems=[];for(const record of records){const savedRecord=recordsByFingerprint.get(record.recordFingerprint);if(!savedRecord)continue;const hints=candidateIdentityHints({atn:record.atn,apn:record.apn,recordFingerprint:record.recordFingerprint});const candidate=candidateByKey.get(hints.candidateKey);if(!candidate)continue;linkItems.push({candidateId:candidate.id,discoveryRecordId:savedRecord.id,linkType:'SOURCE_IDENTIFIER',confidenceBasis:record.atn&&record.apn?'EXACT_SOURCE_ATN_APN':record.atn?'EXACT_SOURCE_ATN':record.apn?'EXACT_SOURCE_APN':'ROW_FINGERPRINT'});for(const signal of deriveSignals({normalized:record.normalizedPayload,id:savedRecord.id}))signalItems.push({...signal,candidateId:candidate.id});}
    const links=await bulk(linkItems,{table:'opportunity_record_links',names:['candidate_id','discovery_record_id','link_type','confidence_basis']},(item,values)=>{values.push(item.candidateId,item.discoveryRecordId,item.linkType,item.confidenceBasis);return values.slice(values.length-4);},' ON CONFLICT (candidate_id,discovery_record_id,link_type) DO NOTHING');
    const signals=await bulk(signalItems,{table:'opportunity_signals',names:['candidate_id','signal_type','numeric_value','text_value','status','source_record_id','evidence_payload']},(item,values)=>{values.push(item.candidateId,item.signalType,item.numericValue??null,item.textValue??null,item.status,item.sourceRecordId??null,JSON.stringify(item.evidencePayload??{}));return values.slice(values.length-7);},' ON CONFLICT (candidate_id,signal_type,source_record_id) DO NOTHING');
    linkedRecords=links.length;signalsCreated=signals.length;const createdCandidates=candidates.length;
    const status=await getSourceStatus(tx,source.sourceFileHash);await tx.query('INSERT INTO audit_events (aggregate_type,aggregate_id,event_type,event_payload,request_key) VALUES ($1,$2,$3,$4::jsonb,$5)', ['discovery_source',savedSource.id,'KERN_SOURCE_IMPORTED',JSON.stringify({sourceFileHash:source.sourceFileHash,recordCount:records.length,insertedRecords,linkedRecords,createdCandidates,signalsCreated,scoreVersion:SCREEN_VERSION}),requestKey]);
    return {source:rowJson(savedSource),status,alreadyImported:false,insertedRecords,linkedRecords,createdCandidates,signalsCreated,providerCalls:0};
  }));
}

const metricFields=['records','candidates','unresolved','needs_address','ready_for_enrichment','enriched','deal_created','deferred_archived'];
const qualityFields=['records','atn_count','apn_count','amount_null_count','ambiguous_count','linked_properties','duplicate_links'];
const numberFields=(value,fields)=>Object.fromEntries(fields.filter(k=>value?.[k]!==undefined).map(k=>[k,Number(value[k])]));
// Metrics are an aggregate-only public contract.  In particular, never return
// discovery_sources.provenance_payload (which may contain owner headers/raw
// payloads and local source paths) merely because the UI requests metrics.
export function safeOpportunityMetrics(status){
  return {counts:numberFields(status?.counts,metricFields),quality:numberFields(status?.quality,qualityFields)};
}
export async function opportunityStatus({db,sourceFileHash=null}){if(!db)throw new Error('DATABASE_NOT_CONFIGURED');return db.transaction(tx=>getSourceStatus(tx,sourceFileHash));}
export async function opportunities({db,options={}}){if(!db)throw new Error('DATABASE_NOT_CONFIGURED');return db.transaction(tx=>listCandidates(tx,options));}
export async function opportunity({db,id}){if(!db)throw new Error('DATABASE_NOT_CONFIGURED');if(!validUuid(id))throw new Error('INVALID_CANDIDATE_ID');return db.transaction(tx=>getCandidate(tx,id));}

export async function reviewOpportunity({db,id,action,reasonCode=null,notes=null,status=null,requestKey=null}){
  if(!db)throw new Error('DATABASE_NOT_CONFIGURED');if(!validUuid(id))throw new Error('INVALID_CANDIDATE_ID');if(!action)throw new Error('REVIEW_ACTION_REQUIRED');if(reasonCode&&!REJECTION_REASONS.includes(reasonCode))throw new Error('INVALID_REVIEW_REASON');
  return db.transaction(tx=>idempotent(tx,requestKey,'OPPORTUNITY_REVIEW',async()=>{const candidate=await getCandidate(tx,id);if(!candidate)throw new Error('CANDIDATE_NOT_FOUND');const next=status??(action==='DEFER'?'DEFERRED':action==='REJECT'?'REJECTED':action==='REVIEW'?'REVIEWING':action==='ARCHIVE'?'ARCHIVED':action==='RESTORE'?'NEEDS_ADDRESS':candidate.candidate_status);if(!CANDIDATE_STATUSES.includes(next))throw new Error('INVALID_CANDIDATE_STATUS');const updated=await updateCandidate(tx,{id,status:next});const review=await insertReview(tx,{candidateId:id,action,reasonCode,notes});return {candidate:rowJson(updated),review:rowJson(review)};}));
}

export async function resolveOpportunity({db,id,address,source,propertyId=null,requestKey=null}){
  if(!db)throw new Error('DATABASE_NOT_CONFIGURED');if(!validUuid(id))throw new Error('INVALID_CANDIDATE_ID');if(!address||typeof address!=='string')throw new Error('ADDRESS_REQUIRED');if(propertyId&&!validUuid(propertyId))throw new Error('INVALID_PROPERTY_ID');
  return db.transaction(tx=>idempotent(tx,requestKey,'OPPORTUNITY_RESOLVE_ADDRESS',async()=>{const candidate=await getCandidate(tx,id);if(!candidate)throw new Error('CANDIDATE_NOT_FOUND');const updated=await updateCandidate(tx,{id,identityStatus:'RESOLVED',status:'READY_FOR_ENRICHMENT',resolvedPropertyId:propertyId});const review=await insertReview(tx,{candidateId:id,action:'RESOLVE_ADDRESS',notes:`Analyst-confirmed address: ${address}; source: ${source??'ANALYST_ENTERED'}`});return {candidate:rowJson(updated),address,source:source??'ANALYST_ENTERED',review:rowJson(review)};}));
}

export function candidateCsv(rows=[]){const columns=['id','candidate_key','atn','apn','address','priority_band','screening_score','identity_status','candidate_status','amount_owed','resolved_property_id','source_edition'];const escape=value=>`"${String(value??'').replaceAll('"','""')}"`;return [columns.join(','),...rows.map(row=>[row.id,row.candidate_key,row.atn,row.apn,[row.address_line1,row.city,row.state,row.postal_code].filter(Boolean).join(', '),row.priority_band,row.screening_score,row.identity_status,row.candidate_status,row.amount_owed,row.resolved_property_id,row.edition].map(escape).join(','))].join('\n')+'\n';}

export const parseOpportunityPayload=value=>parse(value);
