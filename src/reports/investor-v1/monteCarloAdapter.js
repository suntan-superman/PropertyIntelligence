import {normalizeInvestorReport,datum} from './model.js';
import {ADAPTER_VERSION,SYNTHETIC_NOTICE,validateCertifiedAnalysis,ensure} from './analysisTrust.js';

export function monteCarloReport(result,execution,{packageId,generatedAt,reportVersion='mc-integration-v1'}={}){
  const certifiedAnalysis=validateCertifiedAnalysis({adapterVersion:ADAPTER_VERSION,execution,result});
  ensure(/^SYNTHETIC-[A-Z0-9-]{8,100}$/.test(packageId),'PACKAGE_ID');
  ensure(typeof generatedAt==='string'&&new Date(generatedAt).toISOString()===generatedAt,'GENERATION_TIME');
  ensure(['mc-integration-v1','investor-presentation-v1.1'].includes(reportVersion),'REPORT_VERSION');
  const calculated=value=>datum(value,{classification:'PI CALCULATION',source:'Certified synthetic calculation',status:value===null?'NOT_AVAILABLE':'RETURNED'});
  const assumed=value=>datum(value,{classification:'INVESTOR ASSUMPTION',source:'SYNTHETIC_TEST_FIXTURE — not observed evidence'});
  const r=result.results,e=result.inputs.economics,d=result.deterministic;
  return normalizeInvestorReport({
    reportMeta:{reportId:packageId,reportVersion,generatedAt,evidenceCutoff:'Synthetic only — no provider evidence',
      assumptionSetVersion:result.inputs.assumptionsVersion,scoringVersion:'NOT RUN — no investment disposition',monteCarloVersion:result.modelVersion},
    property:{address:assumed(result.inputs.scenarioId),propertyType:assumed('Synthetic residential fix-and-flip scenario'),identityStatus:assumed('Artificial identifier only; no real property')},
    disposition:datum('NOT_ASSESSED',{classification:'UNKNOWN / REQUIRES VERIFICATION',source:'No screening or selection performed',notes:'Calculated economics do not authorize an investment disposition.'}),
    valuation:{estimate:assumed(e.exitValue),basis:assumed('Synthetic base-case sale price; not AVM, appraisal or comparable-sales valuation')},
    economics:{mao:calculated(result.mao.deterministic.purchasePrice),purchasePrice:assumed(e.purchasePrice),rehab:assumed(e.rehabCost),
      resaleValue:assumed(e.exitValue),profit:calculated(d.modeledProfit),return:calculated(d.roi),
      notes:[assumed('ROI = profit / total project cost; cash-on-cash = profit / peak modeled cash. Neither is annualized.')]},
    monteCarlo:{iterations:calculated(result.simulation.iterations),probabilityPositive:calculated(r.probabilityOfProfit),
      probabilityLoss:calculated(r.probabilityOfLoss),probabilityTarget:calculated(r.probabilityMeetingTarget),
      percentiles:Object.fromEntries(['p10','p50','p90'].map(k=>[k,calculated(r.profit[k])])),
      profitDistribution:r.profitDistribution.map(b=>({label:assumed(`${b.min} to ${b.max} USD`),min:calculated(b.min),max:calculated(b.max),count:calculated(b.count)})),
      sensitivities:result.sensitivity.stresses.map(s=>({factor:assumed(`${s.factor}: ${s.stress}`),impact:calculated(s.effects.netProfit.meanChange)})),
      status:calculated('Conditional synthetic model; not empirically calibrated')},
    assumptions:result.materialAssumptions.map(a=>assumed(`${a.variable}: ${a.distribution.family} — SYNTHETIC_TEST_FIXTURE`)),
    risks:result.limitations.map(assumed),disclaimer:SYNTHETIC_NOTICE,certifiedAnalysis
  });
}
