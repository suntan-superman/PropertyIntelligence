import {context} from './context.js';
import {costModel,UNKNOWN_WARNING} from '../underwriting/costModel.js';
import {evaluate} from '../underwriting/metrics.js';
import {scenarioCatalog} from './scenarioCatalog.js';
import {calculatePortfolio} from '../underwriting/deterministic.js';
export function buildScenarios(input) {
  const ctx=context(input);
  const model=costModel(ctx.values,{provenance:ctx.provenance});
  const base=evaluate(model);
  const scenarios=scenarioCatalog(model,ctx.result.property?.valuation).map(scenario=>{
    const unavailable=Object.values(scenario.overrides).some(v=>v===null);
    const outputs=unavailable?{status:'UNAVAILABLE',reason:'Independent sale evidence unavailable',costCompleteness:'INCOMPLETE',warnings:[UNKNOWN_WARNING]}:evaluate(model,scenario.overrides);
    outputs.changeVsSponsorDollars=outputs.modeledProfit===undefined?null:outputs.modeledProfit-base.modeledProfit;
    outputs.changeVsSponsorCashOnCashPercentagePoints=outputs.cashOnCash==null||base.cashOnCash==null?null:100*(outputs.cashOnCash-base.cashOnCash);
    outputs.changeVsSponsorProfitMarginPercentagePoints=outputs.profitMargin==null||base.profitMargin==null?null:100*(outputs.profitMargin-base.profitMargin);
    return {...scenario,excludedUnknownCosts:model.costs.filter(c=>c.status==='UNKNOWN'),outputs,
      warnings:outputs.warnings,provenance:ctx.provenance,notes:['No probability assigned.']};
  });
  const sponsor=calculatePortfolio(input.portfolio);
  const sponsorPortfolio={id:'SPONSOR_PORTFOLIO_CASE',assumptionBasis:'All sponsor inputs',
    modeledProfit:sponsor.totals.combinedProjectedNetProfit,scenarioCashInvested:sponsor.totals.totalCashInvested,
    cashOnCash:sponsor.totals.projectedCashOnCashReturn,costCompleteness:'INCOMPLETE',warnings:[UNKNOWN_WARNING],
    properties:input.portfolio.deals.map(d=>({propertyId:d.id,resolutionStatus:context(input,d.id).result.status,assumptionBasis:'SPONSOR_ONLY'}))};
  const partial=scenarios.filter(s=>s.id.startsWith('INDEPENDENT_AVM_')).map(s=>{
    const available=s.outputs.status==='AVAILABLE';
    const profit=available?sponsorPortfolio.modeledProfit-base.modeledProfit+s.outputs.modeledProfit:null;
    const cash=available?sponsorPortfolio.scenarioCashInvested-base.scenarioCashInvested+s.outputs.scenarioCashInvested:null;
    return {id:`PARTIAL_PORTFOLIO_STRESS_${s.id}`,label:'PARTIAL_PORTFOLIO_STRESS',
      assumptionBasis:'Fantasia uses a provider estimate; Bass/Joyce remain sponsor assumptions.',
      modeledProfit:profit,scenarioCashInvested:cash,cashOnCash:cash?profit/cash:null,
      costCompleteness:'INCOMPLETE',independentPortfolioStatus:'INCOMPLETE',warnings:[UNKNOWN_WARNING,'Not independently underwritten portfolio return.']};
  });
  return {propertyId:'fantasia',costModel:model,scenarios,portfolio:{sponsorCase:sponsorPortfolio,
    independentCase:{status:'INCOMPLETE',costCompleteness:'INCOMPLETE',warnings:[UNKNOWN_WARNING],modeledProfit:null,cashOnCash:null,
      reasons:['Bass lacks independent valuation and retains MANUFACTURED_REPRESENTATION_STOP.','Joyce retains ADDRESS_AMBIGUOUS.','Material costs and Fantasia comp tenure remain unresolved.']},
    partialStress:partial}};
}
