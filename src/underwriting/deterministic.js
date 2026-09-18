import { claimValues } from '../domain/deal.js';
export const missingCostCategories = Object.freeze(['acquisition closing costs', 'taxes', 'insurance',
  'utilities', 'financing', 'repair contingency', 'additional holding costs', 'park/community fees',
  'transfer/application fees', 'price reductions', 'other disposition costs']);
function amount(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0
    || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) throw new Error(`Missing/invalid amount: ${field}`);
  return Math.round(value * 100);
}
export function calculateDeal(values) {
  const keys = ['projectedListPrice', 'acquisitionCost', 'estimatedRepairs', 'spaceRentThreeMonths',
    'salesCommission', 'escrowClosingCosts'];
  const c = Object.fromEntries(keys.map((key) => [key, amount(values[key], key)]));
  const sellingClosingCosts = c.salesCommission + c.escrowClosingCosts;
  const cash = c.acquisitionCost + c.estimatedRepairs + c.spaceRentThreeMonths;
  const proceeds = c.projectedListPrice - sellingClosingCosts - c.spaceRentThreeMonths;
  const profit = proceeds - c.acquisitionCost - c.estimatedRepairs;
  return { model: 'SPONSOR_DEFINED_NOT_FULLY_BURDENED',
    ...Object.fromEntries(keys.map((key) => [key, c[key] / 100])),
    sellingClosingCosts: sellingClosingCosts / 100, totalCashInvested: cash / 100,
    projectedNetSaleProceeds: proceeds / 100, projectedNetProfit: profit / 100,
    projectedCashOnCashReturn: cash === 0 ? null : profit / cash,
    profitListPriceRatio: c.projectedListPrice === 0 ? null : profit / c.projectedListPrice,
    fullyBurdened: { calculable: false, missingCategories: [...missingCostCategories], profit: null } };
}
export function assertSponsorMath(calculated, supplied) {
  for (const field of ['projectedNetSaleProceeds', 'projectedNetProfit', 'totalCashInvested']) {
    if (calculated[field] !== supplied[field]) throw new Error(`STOP: unexplained sponsor discrepancy: ${field}`);
  }
  if (Number(calculated.projectedCashOnCashReturn?.toFixed(3)) !== supplied.projectedCashOnCashReturn) {
    throw new Error('STOP: unexplained sponsor return discrepancy');
  }
}
export function calculatePortfolio(portfolio) {
  const deals = portfolio.deals.map((item) => {
    const supplied = claimValues(item);
    const calculated = calculateDeal(supplied);
    assertSponsorMath(calculated, supplied);
    return { dealId: item.id, ...calculated };
  });
  const sum = (field) => deals.reduce((total, item) => total + Math.round(item[field] * 100), 0) / 100;
  const totals = { totalPurchasePrices: sum('acquisitionCost'), totalEstimatedRepairs: sum('estimatedRepairs'),
    totalThreeMonthSpaceRents: sum('spaceRentThreeMonths'), totalCashInvested: sum('totalCashInvested'),
    combinedProjectedListPrices: sum('projectedListPrice'),
    combinedProjectedNetSaleProceeds: sum('projectedNetSaleProceeds'),
    combinedProjectedNetProfit: sum('projectedNetProfit') };
  totals.projectedCashOnCashReturn = totals.combinedProjectedNetProfit / totals.totalCashInvested;
  const supplied = Object.fromEntries(portfolio.claims.map(({ field, value }) => [field, value]));
  for (const [field, value] of Object.entries(totals)) {
    const comparable = field === 'projectedCashOnCashReturn' ? Number(value.toFixed(3)) : value;
    if (comparable !== supplied[field]) throw new Error(`STOP: unexplained portfolio discrepancy: ${field}`);
  }
  return { model: 'SPONSOR_DEFINED_NOT_FULLY_BURDENED', deals, totals,
    estimatedTimelineDays: supplied.estimatedTimelineDays,
    notes: ['Space rent reduces sale proceeds once and is included in the cash-invested denominator.',
      'Three months of supplied rent are preserved despite the 120-day sponsor timeline; extra holding cost is unknown.'],
    fullyBurdened: { calculable: false, missingCategories: [...missingCostCategories], profit: null } };
}
