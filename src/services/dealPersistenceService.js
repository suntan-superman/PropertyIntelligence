import {idempotent,audit,isUuid} from '../persistence/db.js';
import {getProperty} from '../persistence/propertiesRepository.js';
import {insertDeal,insertClaims,insertDiligence,listDeals,getDeal,archiveDeal} from '../persistence/dealsRepository.js';
import {persistAnalysisSnapshot} from './analysisSnapshotService.js';
import {diligenceHistory} from '../persistence/diligenceRepository.js';
import {finalize} from '../workbench/model.js';
import {analysisHistory} from '../persistence/analysisRepository.js';

export async function saveDeal({db,model,propertyId,evidenceSnapshotId=null,requestKey=null,name='Deal Analysis'}) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!isUuid(propertyId)) throw new Error('INVALID_UUID');
  if (!model?.analysis || !['READY_DEAL'].includes(model.state)) throw new Error('IDENTITY_STOP');
  return db.transaction(tx => idempotent(tx,requestKey,'SAVE_DEAL',async () => {
    const property=await getProperty(tx,propertyId); if (!property) throw new Error('PROPERTY_NOT_SAVED');
    const deal=await insertDeal(tx,{propertyId,name,dealStatus:'DRAFT',origin:model.claimOrigin ?? 'ANALYST_ENTERED',sponsorName:model.sponsor?.name ?? null});
    const claims=await insertClaims(tx,deal.id,model.claims ?? []);
    const analysis=await persistAnalysisSnapshot(tx,model,propertyId,deal.id,evidenceSnapshotId,requestKey);
    await insertDiligence(tx,deal.id,analysis.id,model.questions ?? []);
    await audit(tx,{aggregateType:'deal',aggregateId:deal.id,eventType:'DEAL_SAVED',payload:{analysisSnapshotId:analysis.id,evidenceSnapshotId},requestKey});
    return {dealId:deal.id,propertyId,analysisSnapshotId:analysis.id,claimCount:claims.length,savedAt:new Date().toISOString()};
  }));
}

export const savedDeals = ({db,search='',includeArchived=false}) => { if (!db) throw new Error('DATABASE_NOT_CONFIGURED'); return db.transaction(tx => listDeals(tx,{search,includeArchived})); };
export const openDeal = ({db,id}) => { if (!db) throw new Error('DATABASE_NOT_CONFIGURED'); if(!isUuid(id)) throw new Error('INVALID_UUID'); return db.transaction(async tx => {
  const deal=await getDeal(tx,id);if(!deal)return null;
  const evidence=(await tx.query('SELECT * FROM evidence_snapshots WHERE property_id=$1 ORDER BY retrieved_at DESC,created_at DESC LIMIT 1',[deal.property_id])).rows[0];
  const analysis=(await tx.query('SELECT * FROM analysis_snapshots WHERE deal_id=$1 ORDER BY created_at DESC LIMIT 1',[id])).rows[0];
  const claims=(deal.claims??[]).map(c=>({...c,field:c.field_key,value:c.value_numeric!=null?Number(c.value_numeric):c.value_text??c.value_json}));
  const comps=evidence?(await tx.query(`SELECT c.* FROM comparables c JOIN comparable_snapshots cs ON cs.id=c.comparable_snapshot_id WHERE cs.evidence_snapshot_id=$1 ORDER BY c.created_at`,[evidence.id])).rows.map(c=>({id:c.provider_comp_id,address:c.address,latitude:c.latitude,longitude:c.longitude,propertyType:c.property_type,status:c.status,price:c.price,priceLabel:c.price_label,bedrooms:c.bedrooms,bathrooms:c.bathrooms,squareFeet:c.square_feet,lotSize:c.lot_size,yearBuilt:c.year_built,distanceMiles:c.distance_miles,daysOnMarket:c.days_on_market,correlation:c.correlation,landTenureStatus:c.land_tenure_status,providerPayload:c.provider_payload})):[];
  const diligence=await diligenceHistory(tx,id),analysisHistoryRows=await analysisHistory(tx,id);
  const questions=diligence.map(item=>({id:item.question_key,questionKey:item.question_key,questionText:item.question_text,category:item.category,materiality:item.materiality,status:item.status,relatedFields:item.related_fields,answerText:item.answer_text,resolvedAt:item.resolved_at}));
  const model=analysis&&evidence?finalize({schemaVersion:1,id,mode:'deal',address:[evidence.property_payload?.address,evidence.property_payload?.city,evidence.property_payload?.state].filter(Boolean).join(', '),state:'READY_DEAL',resolutionStatus:'DURABLE_SAVED',property:{...evidence.property_payload,valuation:evidence.valuation_payload??{},comps},analysis:analysis.outputs_payload,claims,claimOrigin:deal.origin,evidence:[],questions,provenance:evidence.provenance_payload??[],cache:{status:'DURABLE_SAVED',source:'Saved deal',retrievedAt:[evidence.retrieved_at],newProviderCalls:0,durable:true},notes:['Historical analysis — values reflect the assumptions and evidence available at that time.','Re-analysis reconstructs this model from durable property, evidence and deal claims.'],originalClaimsPreserved:true}):null;
  return {...deal,diligence,analysisHistory:analysisHistoryRows,model};
}); };
export const setDealArchive = ({db,id,archived=true}) => { if (!db) throw new Error('DATABASE_NOT_CONFIGURED'); if(!isUuid(id)) throw new Error('INVALID_UUID'); return db.transaction(tx => archiveDeal(tx,id,archived)); };

export async function duplicateDeal({db,id,name,requestKey=null}) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!isUuid(id)) throw new Error('INVALID_UUID');
  return db.transaction(tx => idempotent(tx,requestKey,'DUPLICATE_DEAL',async () => {
    const original=await getDeal(tx,id); if (!original) throw new Error('NOT_FOUND');
    const copy=await insertDeal(tx,{propertyId:original.property_id,name:name || `${original.name} — Copy`,dealStatus:'DRAFT',origin:original.origin,sponsorName:original.sponsor_name});
    const claims=await insertClaims(tx,copy.id,original.claims.map(c=>({field:c.field_key,value:c.value_numeric ?? c.value_text ?? c.value_json,unit:c.unit,origin:c.origin,status:c.status,cashTiming:c.cash_timing,sourceDescription:c.source_description})));
    await audit(tx,{aggregateType:'deal',aggregateId:copy.id,eventType:'DEAL_DUPLICATED',payload:{fromDealId:id},requestKey});
    return {dealId:copy.id,propertyId:copy.property_id,claimCount:claims.length,sourceDealId:id};
  }));
}

export async function reanalyzeDeal({db,id,model,evidenceSnapshotId=null,requestKey=null}) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!isUuid(id)) throw new Error('INVALID_UUID');
  if (!model?.analysis) throw new Error('ANALYSIS_REQUIRED');
  return db.transaction(tx => idempotent(tx,requestKey,'REANALYZE_DEAL',async () => {
    const deal=await getDeal(tx,id); if (!deal) throw new Error('NOT_FOUND');
    const analysis=await persistAnalysisSnapshot(tx,model,deal.property_id,id,evidenceSnapshotId,requestKey);
    await insertDiligence(tx,id,analysis.id,model.questions ?? []);
    await audit(tx,{aggregateType:'deal',aggregateId:id,eventType:'ANALYSIS_SNAPSHOT_CREATED',payload:{analysisSnapshotId:analysis.id,evidenceSnapshotId},requestKey});
    return {dealId:id,analysisSnapshotId:analysis.id,createdAt:analysis.created_at};
  }));
}
