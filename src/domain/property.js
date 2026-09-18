export function property({ id, address = null, county = null, coordinates = null,
  identifiers = {}, propertyType = null, bedrooms = null, bathrooms = null,
  squareFeet = null, lotSize = null, yearBuilt = null, taxes = null, assessments = null,
  saleHistory = null, valuation = null, comps = [], provenance = [] }) {
  if (!id || !Array.isArray(comps) || !Array.isArray(provenance)) throw new Error('Invalid property');
  for (const value of [bedrooms, bathrooms, squareFeet, lotSize, yearBuilt]) {
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      throw new Error('Invalid numeric property field');
    }
  }
  return { id, address, county, coordinates, identifiers, propertyType, bedrooms, bathrooms,
    squareFeet, lotSize, yearBuilt, taxes, assessments, saleHistory, valuation, comps, provenance };
}
