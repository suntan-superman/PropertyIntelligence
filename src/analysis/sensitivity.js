import {context} from './context.js';
import {costModel} from '../underwriting/costModel.js';
import {evaluate} from '../underwriting/metrics.js';
export function sensitivity(input,{id='fantasia',model:providedModel}={}) {
  const ctx=context(input,id),model=providedModel??costModel(ctx.values,{provenance:ctx.provenance}),base=evaluate(model);
  if(providedModel)ctx.provenance=providedModel.provenance;
  const costs=base.includedCosts;
  const make=(label,overrides)=>{
    const outputs=evaluate(model,overrides);
    outputs.changeVsSponsorDollars=outputs.modeledProfit===undefined?null:outputs.modeledProfit-base.modeledProfit;
    outputs.changeVsSponsorCashOnCashPercentagePoints=outputs.cashOnCash==null||base.cashOnCash==null?null:100*(outputs.cashOnCash-base.cashOnCash);
    outputs.changeVsSponsorProfitMarginPercentagePoints=outputs.profitMargin==null||base.profitMargin==null?null:100*(outputs.profitMargin-base.profitMargin);
    return {label,overrides,outputs,provenance:ctx.provenance};
  };
  const sale=[-30,-25,-20,-15,-10,-5,0,5].map(percent=>make(`Sale ${percent}%`,{salePrice:Math.round(model.salePrice*(100+percent))/100}));
  const repair=[-20,0,20,50,100,150].map(percent=>make(`Repairs ${percent}%`,{repairs:costs.repairs*(1+percent/100)}));
  const holding=[90,120,150,180,240].map(days=>make(`Hold ${days} days`,{holdDays:days}));
  const valuation=ctx.result.property?.valuation;
  const matrix=[['SPONSOR_SALE',model.salePrice],['SALE_MINUS_10',model.salePrice*.9],['SALE_MINUS_20',model.salePrice*.8],
    ['AVM_HIGH',valuation?.high??null],['AVM_POINT',valuation?.price??null]].map(([label,salePrice])=>({label,salePrice,
      cells:[0,20,50,100].map(percent=>{const outputs=salePrice===null?null:evaluate(model,{salePrice,repairs:costs.repairs*(1+percent/100)});
        return {repairChangePercent:percent,repairBudget:costs.repairs*(1+percent/100),status:outputs?'AVAILABLE':'UNAVAILABLE',
          modeledProfit:outputs?.modeledProfit??null,costCompleteness:'INCOMPLETE',warnings:base.warnings};})}));
  const ranking=[make('Sale -10%',{salePrice:model.salePrice*.9}),make('Repairs +20%',{repairs:costs.repairs*1.2}),
    make('Commission +20%',{commission:costs.commission*1.2}),make('Escrow +20%',{escrow:costs.escrow*1.2}),
    make('Holding +30 days',{holdDays:model.baseRentCoverageDays+30})].map(row=>({...row,
      modeledProfitChange:row.outputs.modeledProfit===undefined?null:row.outputs.modeledProfit-base.modeledProfit,
      absoluteDollarImpact:row.outputs.modeledProfit===undefined?null:Math.abs(row.outputs.modeledProfit-base.modeledProfit)}))
    .sort((a,b)=>(b.absoluteDollarImpact??-1)-(a.absoluteDollarImpact??-1)||a.label.localeCompare(b.label));
  ranking.forEach(row=>{row.rank=row.absoluteDollarImpact===null?null:1+ranking.filter(other=>other.absoluteDollarImpact>row.absoluteDollarImpact).length;});
  return {propertyId:id,sale,repair,holding,matrix,ranking:{label:'Deterministic Sensitivity Ranking',
    basis:'Absolute modeled-profit impact of specified unequal deterministic perturbations, relative to sponsor arithmetic. Ties share rank.',
    notes:['No probability, variance contribution or distribution inferred. Holding baseline is the explicit 90-day rent coverage, not the 120-day timeline.'],
    rows:ranking},provenance:ctx.provenance};
}
