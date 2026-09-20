import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createDatabase} from '../src/persistence/db.js';
import {insertOrReuseProperty} from '../src/persistence/propertiesRepository.js';
import {insertDeal} from '../src/persistence/dealsRepository.js';
import {insertEvidenceSnapshot,insertComparableSnapshot} from '../src/persistence/evidenceRepository.js';
import {insertAnalysisSnapshot} from '../src/persistence/analysisRepository.js';
import {insertAcquisitionDecision} from '../src/persistence/acquisitionRepository.js';
import {investmentReportModel,recordInvestmentReport} from '../src/services/investmentReportService.js';
import {renderInvestmentPdf} from '../src/reports/investment/pdf.js';
import {investmentFixture} from '../tests/fixtures/investment.js';
import {writeJson} from '../src/io/files.js';
try{process.loadEnvFile('.env');}catch{}
const db=createDatabase(),sentinel=new Error('QA_ROLLBACK_ONLY'),tag=`SPRINT6_1_REPORT_QA_${randomUUID()}`;let result,propertyId;
try{
  try{await db.transaction(async tx=>{
    // These synthetic inserts are never committed. No existing rows are updated.
    const p=await insertOrReuseProperty(tx,{normalizedAddress:tag,addressLine1:'100 Synthetic Avenue',city:'Example',state:'FL',postalCode:'33578'});propertyId=p.id;
    const deal=await insertDeal(tx,{propertyId:p.id,name:tag});
    const seed=async(name,targetOverride=null)=>{
      const f=investmentFixture(name),e=f.evidence,a=f.analysis,d=f.decision,o=d.outputs_payload;
      if(targetOverride!==null)o.targetOffer=targetOverride;
      const evidence=await insertEvidenceSnapshot(tx,{propertyId:p.id,source:e.source,retrievedAt:e.retrieved_at,snapshotType:e.snapshot_type,status:e.status,propertyPayload:e.property_payload,valuationPayload:e.valuation_payload,taxPayload:e.tax_payload,assessmentPayload:e.assessment_payload,saleHistoryPayload:e.sale_history_payload,featuresPayload:e.features_payload,legalPayload:e.legal_payload,provenancePayload:e.provenance_payload});
      await insertComparableSnapshot(tx,{propertyId:p.id,evidenceSnapshotId:evidence.id,source:e.source,comparables:f.comps.map(c=>({address:c.address,status:c.status,price:c.price,priceLabel:c.price_label,bedrooms:c.bedrooms,bathrooms:c.bathrooms,squareFeet:c.square_feet,yearBuilt:c.year_built,distanceMiles:c.distance_miles}))});
      const analysis=await insertAnalysisSnapshot(tx,{propertyId:p.id,dealId:deal.id,evidenceSnapshotId:evidence.id,modelFingerprint:tag,analysisVersion:a.analysis_version,costCompleteness:a.outputs_payload.base.costCompleteness,modeledProceeds:a.modeled_proceeds,cashInvested:a.cash_invested,modeledProfit:a.modeled_profit,cashOnCash:a.cash_on_cash,breakEvenSalePrice:a.break_even_sale_price,inputsPayload:a.inputs_payload,outputsPayload:a.outputs_payload,warningsPayload:a.warnings_payload});
      return insertAcquisitionDecision(tx,{propertyId:p.id,dealId:deal.id,evidenceSnapshotId:evidence.id,analysisSnapshotId:analysis.id,strategy:o.strategy,decisionVersion:d.decision_version,hurdleType:o.hurdle.type,hurdleRate:o.hurdle.rate,selectedExitBasis:o.selectedExitBasis,selectedExitValue:o.selectedExitValue,calculatedMao:o.calculatedMao,effectiveWalkawayPrice:o.effectiveWalkawayPrice,targetOffer:o.targetOffer,sellerAskingPrice:o.sellerAskingPrice,knownEncumbranceTotal:o.knownEncumbranceTotal,unknownEncumbranceCount:o.unknownEncumbranceCount,encumbranceGap:o.encumbranceGap,costCompleteness:o.costCompleteness,inputsPayload:d.inputs_payload,outputsPayload:o,warningsPayload:o.warnings,modelFingerprint:tag});
    };
    const transactionalDb={transaction:work=>work(tx)},first=await seed('historical');
    const model1=await investmentReportModel({db:transactionalDb,decisionId:first.id,generatedAt:'2026-09-20T00:00:00Z'});
    const pdf=await renderInvestmentPdf(model1);assert.equal(model1.comparables.all.length,15);
    const reportId=await recordInvestmentReport({db:transactionalDb,model:model1});
    const metadata=(await tx.query('SELECT event_payload FROM audit_events WHERE aggregate_id=$1 AND event_type=$2',[reportId,'INVESTMENT_REPORT_GENERATED'])).rows[0].event_payload;
    assert.equal(metadata.acquisitionDecisionId,first.id);assert.equal(metadata.reportModelFingerprint,model1.reportMeta.reportModelFingerprint);
    const second=await seed('complete',139000);
    const modelAgain=await investmentReportModel({db:{transaction:work=>work(tx)},decisionId:first.id,generatedAt:'2026-09-20T00:00:00Z'});assert.deepEqual(modelAgain,model1);
    const model2=await investmentReportModel({db:transactionalDb,decisionId:second.id});assert.notEqual(model2.reportMeta.reportModelFingerprint,model1.reportMeta.reportModelFingerprint);assert.equal(modelAgain.valuation.price,190000);
    result={status:'PASS',tag,actualPostgresRoundtrip:true,compCount:15,historicalContentUnchanged:true,metadataAtomic:true,reportPages:pdf.pages,reportBytes:pdf.byteLength,providerCalls:0,commit:false};
    throw sentinel;
  });}catch(error){if(error!==sentinel)throw error;}
  assert.equal((await db.query('SELECT id FROM properties WHERE id=$1',[propertyId])).rows.length,0);result.rollbackVerified=true;
  await writeJson('data/validation/sprint6_1-postgres-qa.json',result);console.log(JSON.stringify(result));
}catch(error){console.log(JSON.stringify({status:'STOP',error:/^REPORT_[A-Z_]+$/.test(error.message)?error.message:'SANITIZED_QA_FAILURE',sqlState:/^[0-9A-Z]{5}$/.test(error.code??'')?error.code:null}));process.exitCode=1;}finally{await db?.close();}
