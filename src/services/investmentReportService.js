import {isUuid} from '../persistence/db.js';
import {buildInvestmentModel} from '../reports/investment/model.js';

export async function investmentReportModel({db,decisionId,generatedAt}){
  if(!isUuid(decisionId))throw new Error('INVALID_DECISION_ID');
  if(!db)throw new Error('DATABASE_NOT_CONFIGURED');
  return db.transaction(async tx=>{
    const one=async(table,id)=>(await tx.query(`SELECT * FROM ${table} WHERE id=$1`,[id])).rows[0];
    const decision=await one('acquisition_decisions',decisionId);
    if(!decision)throw new Error('NOT_FOUND');
    if(!decision.analysis_snapshot_id||!decision.deal_id)throw new Error('REPORT_HISTORICAL_LINK_REQUIRED');
    const property=await one('properties',decision.property_id),deal=await one('deals',decision.deal_id),evidence=await one('evidence_snapshots',decision.evidence_snapshot_id),analysis=await one('analysis_snapshots',decision.analysis_snapshot_id);
    const comps=(await tx.query('SELECT c.* FROM comparables c JOIN comparable_snapshots cs ON cs.id=c.comparable_snapshot_id WHERE cs.evidence_snapshot_id=$1 AND cs.property_id=$2 ORDER BY c.id',[decision.evidence_snapshot_id,decision.property_id])).rows;
    return buildInvestmentModel({property,deal,evidence,analysis,decision,comps},generatedAt);
  });
}

export async function recordInvestmentReport({db,model}){
  return db.transaction(async tx=>{
    const m=model.reportMeta;
    const {rows}=await tx.query('INSERT INTO reports (property_id,deal_id,analysis_snapshot_id,report_type,generated_at,status,storage_reference) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',[m.propertyId,m.dealId,m.analysisSnapshotId,m.reportType,m.generatedAt,'GENERATED',null]);
    await tx.query('INSERT INTO audit_events (aggregate_type,aggregate_id,event_type,event_payload) VALUES ($1,$2,$3,$4::jsonb)',['report',rows[0].id,'INVESTMENT_REPORT_GENERATED',JSON.stringify({...m,status:'GENERATED'})]);
    return rows[0].id;
  });
}
