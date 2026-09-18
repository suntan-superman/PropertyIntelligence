import { property } from '../../domain/property.js';
import { providerEvidence } from '../../provenance/provenance.js';
export function normalizeProperty(id, raw, record, avm = null) {
  const fields = { address: raw.formattedAddress ?? null, county: raw.county ?? null,
    coordinates: raw.latitude != null && raw.longitude != null ? { latitude: raw.latitude, longitude: raw.longitude } : null,
    identifiers: { rentcastId: raw.id ?? null, apn: raw.assessorID ?? null, atn: null },
    propertyType: raw.propertyType ?? null, bedrooms: raw.bedrooms ?? null, bathrooms: raw.bathrooms ?? null,
    squareFeet: raw.squareFootage ?? null, lotSize: raw.lotSize ?? null, yearBuilt: raw.yearBuilt ?? null,
    taxes: raw.propertyTaxes ?? null, assessments: raw.taxAssessments ?? null,
    saleHistory: raw.history ?? null };
  const evidence = Object.entries(fields).filter(([, value]) => value !== null)
    .map(([field, value]) => providerEvidence(field, value, record));
  for (const field of ['lastSaleDate', 'lastSalePrice', 'features', 'legalDescription', 'zoning']) {
    if (raw[field] != null) evidence.push(providerEvidence(field, raw[field], record));
  }
  if (avm) {
    evidence.push(providerEvidence('valuation', { price: avm.valuation.price, low: avm.valuation.low,
      high: avm.valuation.high }, avm.record));
    avm.valuation.comps.forEach((item, index) => evidence.push(providerEvidence(`comps[${index}]`, item, avm.record)));
  }
  return { property: property({ id, ...fields, valuation: avm ? { price: avm.valuation.price,
    low: avm.valuation.low, high: avm.valuation.high } : null,
    comps: avm?.valuation.comps ?? [], provenance: evidence.map((item) => item.id) }), evidence };
}
