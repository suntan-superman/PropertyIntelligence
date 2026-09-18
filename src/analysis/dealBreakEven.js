import {context} from './context.js';
import {UNKNOWN_WARNING,cents} from '../underwriting/costModel.js';
import {dealEvaluate} from '../underwriting/dealMetrics.js';

// Explicit closing-cost break-even adapter. Legacy fixtures continue through breakEven.js unchanged.
export function dealBreakEven(input,{id='fantasia',model:providedModel}={}) {
  const ctx=context(input,id),model=providedModel;
  if(!model) throw new Error('EXPLICIT_DEAL_MODEL_REQUIRED');
  const base=dealEvaluate(model),v=ctx.result.property?.valuation,costs=base.includedCosts;
  const excluded=['acquisition','repairs','spaceRent','commission','escrow','acquisitionClosingCosts','dispositionClosingCosts'];
  const extra=Object.entries(costs).filter(([key])=>!excluded.includes(key)).reduce((total,[,value])=>total+cents(value),0)/100;
  const closing=(costs.escrow??0)+(costs.acquisitionClosingCosts??0)+(costs.dispositionClosingCosts??0);
  const scenarios=[['SPONSOR_SALE',model.salePrice],['AVM_POINT',v?.price??null],['AVM_HIGH',v?.high??null],['AVM_LOW',v?.low??null]];
  const capacities=scenarios.map(([scenarioId,sale])=>{
    const repair=sale===null?null:(cents(sale)-cents(costs.acquisition)-cents(costs.spaceRent)-cents(costs.commission)-cents(closing)-cents(extra))/100;
    const purchase=sale===null?null:(cents(sale)-cents(costs.repairs)-cents(costs.spaceRent)-cents(costs.commission)-cents(closing)-cents(extra))/100;
    const rentBudget=sale===null?null:sale-costs.acquisition-costs.repairs-costs.commission-closing-extra;
    const months=rentBudget===null||model.monthlySpaceRent===null?null:rentBudget/model.monthlySpaceRent;
    return {id:scenarioId,saleAssumption:sale,status:sale===null?'UNAVAILABLE':'AVAILABLE',maximumRepairBudget:repair,
      maximumAcquisitionPrice:purchase,holding:{status:months===null?'UNAVAILABLE':months<0?'NO_NONNEGATIVE_DURATION':'AVAILABLE',
        rentBudget,capacityMonths:months,capacityDays:months===null?null:months*30,feasibleDurationDays:months===null||months<0?null:months*30,
        derivation:model.derivation,notes:['Negative capacity is retained; loss exists even before holding rent when capacity is negative.','Break-even assumes fixed sale and all other included costs; only space rent recurs.']},
      costCompleteness:'INCOMPLETE',warnings:[UNKNOWN_WARNING]};
  });
  return {propertyId:id,type:'MODELED_BREAK_EVEN_SALE_PRICE',salePrice:base.modeledProjectCost,includedCosts:costs,costCompleteness:'INCOMPLETE',
    excludedUnknownCosts:base.excludedUnknownCosts,warnings:[UNKNOWN_WARNING,'Fixed-dollar commission and explicit closing costs; no percentage commission inferred.'],capacities,provenance:ctx.provenance};
}
