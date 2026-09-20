import {idempotent,isUuid} from '../persistence/db.js';
import {insertAcquisitionDecision,insertConditionAssessment,insertEncumbrances,listAcquisitionDecisions,getAcquisitionDecision,listEncumbrances,listConditionAssessments,auditAcquisitionDecision} from '../persistence/acquisitionRepository.js';
import {calculateAcquisitionDecision} from '../underwriting/mao.js';
import {acquisitionAnalysisLink,linkageFingerprint} from '../persistence/acquisitionAnalysisLink.js';

const json=value=>typeof value==='string'&&/^[{[]/.test(value)?JSON.parse(value):value;

function validateReference(value,name) { if(!isUuid(value))throw new Error(`INVALID_${name.toUpperCase()}`); }

export async function calculateDecision(input) { return calculateAcquisitionDecision(input); }

async function linkedCalculation(tx,references,input) {
  const analysisLink=await acquisitionAnalysisLink(tx,references);
  // Explicit acquisition assumptions remain independent of Deal formulas. Bind the
  // immutable Deal economics context before calculation, without copying/inventing costs.
  for(const id of [input?.evidenceSnapshotId,...(input?.exitBases??[]).map(item=>item.evidenceSnapshotId)].filter(Boolean)){
    if(id!==references.evidenceSnapshotId)throw new Error('DECISION_ANALYSIS_EVIDENCE_MISMATCH');
  }
  return {...calculateAcquisitionDecision(input),analysisLink};
}

export async function calculateLinkedDecision({db,input,...references}) {
  if(!db)throw new Error('DATABASE_NOT_CONFIGURED');
  return db.transaction(tx=>linkedCalculation(tx,references,input));
}

export async function saveEncumbranceHistory({db,propertyId,evidenceSnapshotId=null,items=[],requestKey=null}) {
  if(!db)throw new Error('DATABASE_NOT_CONFIGURED');validateReference(propertyId,'property_id');if(evidenceSnapshotId)validateReference(evidenceSnapshotId,'evidence_snapshot_id');
  return db.transaction(async tx=>idempotent(tx,requestKey,'SAVE_ENCUMBRANCES',async()=>{
    if(!((await tx.query('SELECT id FROM properties WHERE id=$1',[propertyId])).rows[0]))throw new Error('PROPERTY_NOT_SAVED');
    const rows=await insertEncumbrances(tx,propertyId,evidenceSnapshotId,items);return {propertyId,encumbrances:rows};
  }));
}

export async function saveConditionHistory({db,propertyId,dealId=null,assessmentDate,source,items=[],requestKey=null}) {
  if(!db)throw new Error('DATABASE_NOT_CONFIGURED');validateReference(propertyId,'property_id');if(dealId)validateReference(dealId,'deal_id');
  return db.transaction(async tx=>idempotent(tx,requestKey,'SAVE_CONDITION_ASSESSMENT',async()=>({assessment:await insertConditionAssessment(tx,{propertyId,dealId,assessmentDate,source,items})})));
}

export async function saveAcquisitionDecision({db,propertyId,evidenceSnapshotId,dealId=null,analysisSnapshotId=null,decision,input=null,requestKey=null,conditionAssessment=null}) {
  if(!db)throw new Error('DATABASE_NOT_CONFIGURED');
  validateReference(propertyId,'property_id');validateReference(evidenceSnapshotId,'evidence_snapshot_id');if(dealId)validateReference(dealId,'deal_id');if(analysisSnapshotId)validateReference(analysisSnapshotId,'analysis_snapshot_id');
  return db.transaction(async tx=>{
    const references={propertyId,dealId,evidenceSnapshotId,analysisSnapshotId};
    const calculated=await linkedCalculation(tx,references,input);
    if(calculated.status==='UNAVAILABLE'||calculated.calculatedMao==null)throw new Error('DECISION_UNAVAILABLE');
    // Do not accept a stale calculation, a changed ID, or client-modified economics.
    if(decision&&!decision.analysisLink)throw new Error('DECISION_ANALYSIS_LINK_REQUIRED');
    if(decision&&linkageFingerprint(decision)!==linkageFingerprint(calculated))throw new Error('DECISION_CALCULATION_MISMATCH');
    decision=calculated;
    const saved=await idempotent(tx,requestKey,'SAVE_ACQUISITION_DECISION',async()=>{
    const property=(await tx.query('SELECT id FROM properties WHERE id=$1',[propertyId])).rows[0];if(!property)throw new Error('PROPERTY_NOT_SAVED');
    const evidence=(await tx.query('SELECT id FROM evidence_snapshots WHERE id=$1 AND property_id=$2',[evidenceSnapshotId,propertyId])).rows[0];if(!evidence)throw new Error('EVIDENCE_NOT_LINKED');
    if(dealId&&!((await tx.query('SELECT id FROM deals WHERE id=$1 AND property_id=$2',[dealId,propertyId])).rows[0]))throw new Error('DEAL_NOT_LINKED');
    const encumbrances=decision.encumbrances??input?.encumbrances??[];
    const persistedEncumbrances=await insertEncumbrances(tx,propertyId,evidenceSnapshotId,encumbrances);
    let condition=null;
    if(conditionAssessment?.items?.length||input?.rehab?.items?.length){
      const source=conditionAssessment?.source??'ANALYST_ENTERED';condition=await insertConditionAssessment(tx,{propertyId,dealId,assessmentDate:conditionAssessment?.assessmentDate??new Date().toISOString().slice(0,10),source,items:conditionAssessment?.items??input.rehab.items});
    }
    const row=await insertAcquisitionDecision(tx,{propertyId,dealId,evidenceSnapshotId,analysisSnapshotId,strategy:decision.strategy,decisionVersion:decision.decisionVersion,hurdleType:decision.hurdle.type,hurdleRate:decision.hurdle.rate,selectedExitBasis:decision.selectedExitBasis,selectedExitValue:decision.selectedExitValue,calculatedMao:decision.calculatedMao,manualWalkawayCap:decision.manualWalkawayCap,effectiveWalkawayPrice:decision.effectiveWalkawayPrice,targetOffer:decision.targetOffer,targetPolicyPayload:decision.targetPolicy,sellerAskingPrice:decision.sellerAskingPrice,auctionMinimum:decision.auctionMinimum,knownEncumbranceTotal:decision.knownEncumbranceTotal,unknownEncumbranceCount:decision.unknownEncumbranceCount,encumbranceGap:decision.encumbranceGap,costCompleteness:decision.costCompleteness,inputsPayload:input??decision.inputsPayload,outputsPayload:decision,warningsPayload:decision.warnings,modelFingerprint:decision.modelFingerprint});
    await auditAcquisitionDecision(tx,row.id,{evidenceSnapshotId,dealId,analysisSnapshotId,modelFingerprint:decision.modelFingerprint,analysisLink:decision.analysisLink},requestKey);
    return {decisionId:row.id,propertyId,dealId,evidenceSnapshotId,analysisSnapshotId,calculationFingerprint:linkageFingerprint(decision),costCompleteness:row.cost_completeness,calculatedMao:row.calculated_mao,savedAt:row.created_at,encumbranceCount:persistedEncumbrances.length,conditionAssessmentId:condition?.id??null};
    });
    if(saved.propertyId!==propertyId||saved.dealId!==dealId||saved.evidenceSnapshotId!==evidenceSnapshotId||saved.analysisSnapshotId!==analysisSnapshotId||saved.calculationFingerprint!==linkageFingerprint(decision))throw new Error('DECISION_CALCULATION_MISMATCH');
    return saved;
  });
}

function hydrate(row,encumbrances=[],conditions=[]) {
  if(!row)return null;
  return {...row,hurdleRate:Number(row.hurdle_rate),selectedExitValue:Number(row.selected_exit_value),calculatedMao:row.calculated_mao==null?null:Number(row.calculated_mao),manualWalkawayCap:row.manual_walkaway_cap==null?null:Number(row.manual_walkaway_cap),effectiveWalkawayPrice:row.effective_walkaway_price==null?null:Number(row.effective_walkaway_price),targetOffer:row.target_offer==null?null:Number(row.target_offer),knownEncumbranceTotal:row.known_encumbrance_total==null?null:Number(row.known_encumbrance_total),encumbranceGap:row.encumbrance_gap==null?null:Number(row.encumbrance_gap),targetPolicyPayload:json(row.target_policy_payload),inputsPayload:json(row.inputs_payload),outputsPayload:json(row.outputs_payload),warningsPayload:json(row.warnings_payload),encumbrances,conditionAssessments:conditions};
}

export async function listDecisionHistory({db,propertyId=null,dealId=null}) { if(!db)throw new Error('DATABASE_NOT_CONFIGURED');if(propertyId)validateReference(propertyId,'property_id');if(dealId)validateReference(dealId,'deal_id');return db.transaction(async tx=>{const rows=await listAcquisitionDecisions(tx,{propertyId,dealId});return Promise.all(rows.map(async row=>hydrate(row,await listEncumbrances(tx,row.property_id,{evidenceSnapshotId:row.evidence_snapshot_id}),await listConditionAssessments(tx,row.property_id))));}); }
export async function openAcquisitionDecision({db,id}) { if(!db)throw new Error('DATABASE_NOT_CONFIGURED');validateReference(id,'decision_id');return db.transaction(async tx=>{const row=await getAcquisitionDecision(tx,id);return row?hydrate(row,await listEncumbrances(tx,row.property_id,{evidenceSnapshotId:row.evidence_snapshot_id}),await listConditionAssessments(tx,row.property_id)):null;}); }
export async function listEncumbranceHistory({db,propertyId,includeSuperseded=false}) { if(!db)throw new Error('DATABASE_NOT_CONFIGURED');validateReference(propertyId,'property_id');return db.transaction(tx=>listEncumbrances(tx,propertyId,{includeSuperseded})); }
export async function listConditionHistory({db,propertyId}) { if(!db)throw new Error('DATABASE_NOT_CONFIGURED');validateReference(propertyId,'property_id');return db.transaction(tx=>listConditionAssessments(tx,propertyId)); }
