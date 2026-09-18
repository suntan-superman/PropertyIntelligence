import { claimValues } from '../domain/deal.js';
export function comparePrice(sponsorPrice, valuation, resolutionStatus) {
  const base = { sponsorProjectedPrice: sponsorPrice, independentAvm: valuation?.price ?? null,
    independentLow: valuation?.low ?? null, independentHigh: valuation?.high ?? null,
    varianceDollars: null, variancePercent: null, status: 'NO_INDEPENDENT_EVIDENCE' };
  if (['ADDRESS_AMBIGUOUS','AMBIGUOUS_PENDING_CONFIRMATION','AVM_SUBJECT_IDENTITY_STOP'].includes(resolutionStatus)) {
    return { ...base, independentAvm: null, independentLow: null, independentHigh: null, status: 'ADDRESS_AMBIGUOUS' };
  }
  if (resolutionStatus !== 'INDEPENDENT_EVIDENCE_AVAILABLE' || !valuation || valuation.price == null) {
    return { ...base, independentAvm: null, independentLow: null, independentHigh: null };
  }
  const varianceDollars = sponsorPrice - valuation.price;
  const variancePercent = valuation.price === 0 ? null : varianceDollars / valuation.price * 100;
  let status = 'INDEPENDENT_ESTIMATE_ONLY';
  if (valuation.low != null && valuation.high != null) status = sponsorPrice < valuation.low
    ? 'BELOW_INDEPENDENT_RANGE' : sponsorPrice > valuation.high ? 'ABOVE_INDEPENDENT_RANGE' : 'WITHIN_INDEPENDENT_RANGE';
  return { ...base, varianceDollars, variancePercent, status };
}
export function comparePortfolio(portfolio, verification) {
  return portfolio.deals.map((deal) => {
    const result = verification.properties.find((item) => item.propertyId === deal.propertyRef);
    const sponsor = claimValues(deal);
    const confirmation = portfolio.properties.find((item) => item.id === deal.propertyRef)?.addressConfirmation;
    return { dealId: deal.id, address: confirmation?.address.street ?? deal.name,
      originalSponsorAddress: deal.name, addressConfirmation: confirmation ?? null,
      resolutionStatus: result?.status ?? 'NOT_QUERIED',
      ...comparePrice(sponsor.projectedListPrice, result?.property?.valuation, result?.status),
      comparableCount: result?.property?.comps.length ?? 0,
      sponsorClaim: deal.claims.find((item) => item.field === 'projectedListPrice'),
      evidenceRefs: result?.evidence.filter((item) => item.field === 'valuation').map((item) => item.id) ?? [],
      rawResponseRefs: result?.rawResponseRefs ?? [],
      notes: ['Variance = sponsor minus provider; percent denominator is provider AVM.',
        'Comparison does not verify sponsor price, property condition, profit, liens or collateral.'] };
  });
}
