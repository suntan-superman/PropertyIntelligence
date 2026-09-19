import {audit} from './db.js';

export async function insertEncumbrances(tx,propertyId,evidenceSnapshotId,items=[]) {
  const rows=[];
  for(const item of items){
    const {rows:inserted}=await tx.query(`INSERT INTO property_encumbrances
      (property_id,evidence_snapshot_id,type,amount,amount_status,source,as_of_date,payoff_verified,priority_known,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[propertyId,evidenceSnapshotId??null,item.type,item.amount??null,item.amountStatus??(item.amount==null?'UNKNOWN':'REPORTED'),item.source??'ANALYST_ENTERED',item.asOfDate??null,item.payoffVerified===true,item.priorityKnown===true,item.notes??null]);
    rows.push(inserted[0]);
  }
  return rows;
}

export async function insertConditionAssessment(tx,{propertyId,dealId=null,assessmentDate,source,items=[]}) {
  const {rows}=await tx.query(`INSERT INTO property_condition_assessments (property_id,deal_id,assessment_date,source)
    VALUES ($1,$2,$3,$4) RETURNING *`,[propertyId,dealId,assessmentDate,source??'ANALYST_ENTERED']);
  const assessment=rows[0],conditionItems=[];
  for(const item of items){
    const inserted=await tx.query(`INSERT INTO property_condition_items
      (assessment_id,category,condition_status,estimated_cost,source,notes)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[assessment.id,item.category,item.conditionStatus??item.status??'UNKNOWN',item.estimatedCost??null,item.source??source??'ANALYST_ENTERED',item.notes??null]);
    conditionItems.push(inserted.rows[0]);
  }
  return {...assessment,items:conditionItems};
}

export async function listEncumbrances(tx,propertyId,{includeSuperseded=false,evidenceSnapshotId=null}={}) {
  const {rows}=await tx.query(`SELECT * FROM property_encumbrances WHERE property_id=$1 AND ($2 OR superseded_at IS NULL) AND ($3::uuid IS NULL OR evidence_snapshot_id=$3) ORDER BY created_at DESC`,[propertyId,includeSuperseded,evidenceSnapshotId]);return rows;
}

export async function listConditionAssessments(tx,propertyId) {
  const assessments=(await tx.query(`SELECT * FROM property_condition_assessments WHERE property_id=$1 ORDER BY created_at DESC`,[propertyId])).rows;
  for(const assessment of assessments)assessment.items=(await tx.query(`SELECT * FROM property_condition_items WHERE assessment_id=$1 ORDER BY created_at`,[assessment.id])).rows;
  return assessments;
}

export async function insertAcquisitionDecision(tx,value) {
  const {rows}=await tx.query(`INSERT INTO acquisition_decisions
    (property_id,deal_id,evidence_snapshot_id,analysis_snapshot_id,strategy,decision_version,hurdle_type,hurdle_rate,selected_exit_basis,selected_exit_value,calculated_mao,manual_walkaway_cap,effective_walkaway_price,target_offer,target_policy_payload,seller_asking_price,auction_minimum,known_encumbrance_total,unknown_encumbrance_count,encumbrance_gap,cost_completeness,inputs_payload,outputs_payload,warnings_payload,model_fingerprint)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19,$20,$21,$22::jsonb,$23::jsonb,$24::jsonb,$25) RETURNING *`,[
      value.propertyId,value.dealId??null,value.evidenceSnapshotId,value.analysisSnapshotId??null,value.strategy,value.decisionVersion,value.hurdleType,value.hurdleRate,value.selectedExitBasis,value.selectedExitValue,value.calculatedMao??null,value.manualWalkawayCap??null,value.effectiveWalkawayPrice??null,value.targetOffer??null,JSON.stringify(value.targetPolicyPayload??{}),value.sellerAskingPrice??null,value.auctionMinimum??null,value.knownEncumbranceTotal??null,value.unknownEncumbranceCount??0,value.encumbranceGap??null,value.costCompleteness,JSON.stringify(value.inputsPayload??{}),JSON.stringify(value.outputsPayload??{}),JSON.stringify(value.warningsPayload??[]),value.modelFingerprint]);
  return rows[0];
}

export async function listAcquisitionDecisions(tx,{propertyId=null,dealId=null,limit=100}={}) {
  return (await tx.query(`SELECT * FROM acquisition_decisions WHERE ($1::uuid IS NULL OR property_id=$1) AND ($2::uuid IS NULL OR deal_id=$2) ORDER BY created_at DESC LIMIT $3`,[propertyId,dealId,Math.min(Math.max(Number(limit)||100,1),200)])).rows;
}

export async function getAcquisitionDecision(tx,id) {
  const {rows}=await tx.query('SELECT * FROM acquisition_decisions WHERE id=$1',[id]);return rows[0]??null;
}

export async function auditAcquisitionDecision(tx,id,payload,requestKey) {
  await audit(tx,{aggregateType:'acquisition_decision',aggregateId:id,eventType:'ACQUISITION_DECISION_SAVED',payload,requestKey});
}
