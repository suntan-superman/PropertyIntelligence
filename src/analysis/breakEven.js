import {context} from './context.js';
import {costModel,UNKNOWN_WARNING,cents} from '../underwriting/costModel.js';
import {evaluate} from '../underwriting/metrics.js';
export function breakEven(input,{id='fantasia',model:providedModel}={}) {
  const ctx=context(input,id),model=providedModel??costModel(ctx.values,{provenance:ctx.provenance}),base=evaluate(model);
  if(providedModel)ctx.provenance=providedModel.provenance;
  const v=ctx.result.property?.valuation;
  const costs=base.includedCosts;
  const extra=Object.entries(costs).filter(([key])=>!['acquisition','repairs','spaceRent','commission','escrow'].includes(key)).reduce((total,[,value])=>total+cents(value),0)/100;
  const scenarios=[['SPONSOR_SALE',model.salePrice],['AVM_POINT',v?.price??null],['AVM_HIGH',v?.high??null],['AVM_LOW',v?.low??null]];
  const capacities=scenarios.map(([id,sale])=>{
    const repair=sale===null?null:(cents(sale)-cents(costs.acquisition)-cents(costs.spaceRent)-cents(costs.commission)-cents(costs.escrow)-cents(extra))/100;
    const purchase=sale===null?null:(cents(sale)-cents(costs.repairs)-cents(costs.spaceRent)-cents(costs.commission)-cents(costs.escrow)-cents(extra))/100;
    const rentBudget=sale===null?null:sale-costs.acquisition-costs.repairs-costs.commission-costs.escrow-extra;
    const months=rentBudget===null||model.monthlySpaceRent===null?null:rentBudget/model.monthlySpaceRent;
    return {id,saleAssumption:sale,status:sale===null?'UNAVAILABLE':'AVAILABLE',maximumRepairBudget:repair,
      maximumAcquisitionPrice:purchase,holding:{status:months===null?'UNAVAILABLE':months<0?'NO_NONNEGATIVE_DURATION':'AVAILABLE',
        rentBudget,capacityMonths:months,capacityDays:months===null?null:months*30,
        feasibleDurationDays:months===null||months<0?null:months*30,derivation:model.derivation,
        notes:['Negative capacity is retained; loss exists even before holding rent when capacity is negative.',
          'Break-even assumes fixed sale and all other included costs; only space rent recurs.']} ,
      costCompleteness:'INCOMPLETE',warnings:[UNKNOWN_WARNING]};
  });
  return {propertyId:id,type:'MODELED_BREAK_EVEN_SALE_PRICE',salePrice:base.modeledProjectCost,
    includedCosts:costs,costCompleteness:'INCOMPLETE',excludedUnknownCosts:base.excludedUnknownCosts,
    warnings:[UNKNOWN_WARNING,'Fixed-dollar commission and escrow; no percentage commission inferred.'],
    capacities,provenance:ctx.provenance};
}
