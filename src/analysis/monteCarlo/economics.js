import {number,requireThat,validateEconomics} from './contract.js';

export const toCents=v=>{number(v,'money',0,1e12);const c=Math.floor(v*100+.5+1e-8);requireThat(Number.isSafeInteger(c),'UNSAFE_CENTS');return c;};
const dollars=c=>c/100;
/** Same fix-and-flip strategy and hurdle meanings as underwriting/mao.js.
 * Explicit complete costs, cents ledger, acquisition-only debt and cash timing.
 * No equity valuation is counted as cash and no borrowed principal as profit.
 */
export function evaluateEconomics(base,sample={},purchasePrice=base.purchasePrice){
  const e={...base,...sample,purchasePrice};delete e.regime;validateEconomics(e);
  const c={purchase:toCents(e.purchasePrice),acquisitionFixed:toCents(e.acquisitionFixed),acquisitionPercent:toCents(e.purchasePrice*e.acquisitionRate),
    rehab:toCents(e.rehabCost),contingency:toCents(e.rehabCost*e.rehabContingencyRate),otherUpfront:toCents(e.otherUpfront)};
  const holdDays=e.renovationDays+e.marketingDays,f=e.financing;
  const principal=f.mode==='CASH'?0:toCents(e.purchasePrice*f.ltv);
  c.origination=toCents(dollars(principal)*f.points);c.financingFees=toCents(f.fees);
  c.interest=toCents(dollars(principal)*f.annualRate*holdDays/365);
  for(const [key,rate] of Object.entries(e.holdingDaily))c[`holding_${key}`]=toCents(rate*holdDays);
  const preSaleCost=Object.values(c).reduce((a,b)=>a+b,0);
  c.sellingCommission=toCents(e.exitValue*e.sellingCommissionRate);c.sellerClosingFixed=toCents(e.sellerClosingFixed);
  c.sellerClosingPercent=toCents(e.exitValue*e.sellerClosingRate);c.transfer=toCents(e.transferCost);c.otherAtExit=toCents(e.otherAtExit);
  const total=Object.values(c).reduce((a,b)=>a+b,0),sale=toCents(e.exitValue),profit=sale-total;
  const selling=total-preSaleCost,preSaleEquity=preSaleCost-principal,exitEquity=sale-selling-principal;
  const peak=Math.max(0,preSaleEquity,preSaleEquity-exitEquity);
  requireThat(Number.isSafeInteger(total)&&Number.isSafeInteger(profit)&&preSaleEquity>=0,'ACCOUNTING_DOMAIN');
  requireThat(exitEquity-preSaleEquity===profit,'CASHFLOW_RECONCILIATION');
  return {modeledProfit:dollars(profit),totalProjectCost:dollars(total),grossSale:dollars(sale),netSaleProceeds:dollars(sale-selling),
    roi:total>0?profit/total:null,cashOnCash:peak>0?profit/peak:null,profitMargin:sale>0?profit/sale:null,
    cashRequired:dollars(peak),preSaleEquity:dollars(preSaleEquity),exitEquity:dollars(exitEquity),loanPrincipal:dollars(principal),
    holdDays,renovationDays:e.renovationDays,marketingDays:e.marketingDays,costs:Object.fromEntries(Object.entries(c).map(([k,v])=>[k,dollars(v)]))};
}
export function returnMetric(result,type){return {CASH_ON_CASH:result.cashOnCash,RETURN_ON_TOTAL_PROJECT_COST:result.roi,PROFIT_MARGIN_ON_SALE:result.profitMargin}[type];}
export function maximumPrice(feasible,maxPrice){
  const high=toCents(maxPrice);requireThat(high>0,'MAO_BOUND');
  if(!feasible(0))return {status:'NO_FEASIBLE_PRICE',purchasePrice:null,nextCentPasses:null};
  if(feasible(high/100))return {status:'BOUND_LIMITED',purchasePrice:high/100,nextCentPasses:null};
  let lo=0,hi=high;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(feasible(mid/100))lo=mid;else hi=mid;}
  return {status:'AVAILABLE',purchasePrice:lo/100,nextCentPasses:false};
}
export function deterministicMao(input){
  const evaluate=p=>evaluateEconomics(input.economics,{},p),target=input.target;
  // For nonnegative target returns, no feasible nonnegative price exceeds gross sale.
  const maxPrice=Math.max(.01,input.economics.exitValue);
  // Cross-multiply the return hurdle. Zero-capital trial prices are evaluated
  // as limiting inequalities, never reported as an infinite/defined ROI.
  const mao=maximumPrice(p=>{const r=evaluate(p),denominator={CASH_ON_CASH:r.cashRequired,RETURN_ON_TOTAL_PROJECT_COST:r.totalProjectCost,PROFIT_MARGIN_ON_SALE:r.grossSale}[target.type];return r.modeledProfit>=target.rate*denominator;},maxPrice);
  if(mao.purchasePrice!==null&&returnMetric(evaluate(mao.purchasePrice),target.type)===null){mao.status='NO_FEASIBLE_RETURN_METRIC';mao.purchasePrice=null;}
  const breakEven=maximumPrice(p=>evaluate(p).modeledProfit>=0,maxPrice);
  return {method:'MONOTONE_INTEGER_CENT_BISECTION',target:structuredClone(target),deterministic:mao,breakEven,
    economicsAtMao:mao.purchasePrice===null?null:evaluate(mao.purchasePrice)};
}
