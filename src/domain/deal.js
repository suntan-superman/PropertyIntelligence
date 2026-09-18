export function deal({ id, name, propertyRef, sponsor, claims, evidence = [], underwriting = null }) {
  if (!id || !name || !propertyRef || !sponsor || !Array.isArray(claims)) throw new Error('Invalid deal');
  if (new Set(claims.map((item) => item.field)).size !== claims.length) throw new Error('Duplicate claim field');
  return { id, name, propertyRef, sponsor, claims, evidence, underwriting };
}
export const claimValues = (deal) => Object.fromEntries(deal.claims.map(({ field, value }) => [field, value]));
