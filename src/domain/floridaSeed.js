import { claim } from './claim.js';
import { deal } from './deal.js';
export const sourceDocument = 'docs/PropertyIntelligence_Foundation_Sprint1_RentCast_Codex.md';
const fields = ['projectedListPrice', 'salesCommission', 'escrowClosingCosts', 'spaceRentThreeMonths',
  'projectedNetSaleProceeds', 'acquisitionCost', 'estimatedRepairs', 'projectedNetProfit',
  'totalCashInvested', 'projectedCashOnCashReturn'];
const sponsorClaim = (field, value, unit = 'USD') => claim({ field, value, unit, suppliedBy: 'Brandon',
  sourceDocument, notes: ['Transcribed from the supplied sprint specification; original sponsor package/date unavailable.'] });
export function floridaSeed() {
  const inputs = [
    ['fantasia', '8426 Fantasia Parkway', 'Riverview', 'FL', [279000,5000,2000,3000,269000,160000,10000,99000,173000,0.572]],
    ['bass', '95 Bass Circle', 'Winter Haven', 'FL', [65000,3000,2000,2400,57600,15000,12000,30600,29400,1.041]],
    ['joyce', '131 Joyce Place', null, null, [40000,2500,2000,3122,32378,5000,5000,22378,13122,1.705]],
  ];
  const properties = inputs.map(([id, street, city, state]) => ({ id, sponsorAddress: { street, city, state, zip: null },
    addressClaim: sponsorClaim('address', { street, city, state, zip: null }, null) }));
  properties.find((item) => item.id === 'fantasia').addressConfirmation = {
    address: { street:'8426 Fantasia Park Way', city:'Riverview', state:'FL', zip:'33578' },
    suppliedBy:'Stan', suppliedDate:'2026-09-18', status:'USER_CONFIRMED',
    sourceDocument:'docs/FLORIDA_ADDRESS_CONFIRMATIONS.md',
    notes:['Confirms intended address only; original sponsor address remains unchanged.'],
  };
  const deals = inputs.map(([id, street, , , values]) => deal({ id, name: street, propertyRef: id,
    sponsor: 'Brandon', claims: fields.map((field, index) => sponsorClaim(field, values[index],
      field === 'projectedCashOnCashReturn' ? 'ratio' : 'USD')) }));
  const portfolioValues = { totalPurchasePrices:180000, totalEstimatedRepairs:27000,
    totalThreeMonthSpaceRents:8522, totalCashInvested:215522, combinedProjectedListPrices:384000,
    combinedProjectedNetSaleProceeds:358978, combinedProjectedNetProfit:151978,
    projectedCashOnCashReturn:0.705, estimatedTimelineDays:120 };
  return { schemaVersion: 1, id: 'brandon-florida', sourceDocument, properties, deals,
    claims: Object.entries(portfolioValues).map(([field, value]) => sponsorClaim(field, value,
      field === 'projectedCashOnCashReturn' ? 'ratio' : field === 'estimatedTimelineDays' ? 'days' : 'USD')),
    collateralClaims: [sponsorClaim('promissoryNotes', 'Sponsor reports promissory notes; terms/documents not supplied.', null),
      sponsorClaim('liens', 'Sponsor reports liens on the three Florida properties; lien instruments and priority unverified.', null),
      sponsorClaim('additionalCollateralAddress', '713 Bryce Drive', null),
      sponsorClaim('additionalCollateralFreeAndClear', true, null),
      sponsorClaim('additionalCollateralEstimatedValue', 230000)],
    notes: ['No city/state/ZIP inferred for Joyce or collateral. Collateral verification is out of scope.'] };
}
