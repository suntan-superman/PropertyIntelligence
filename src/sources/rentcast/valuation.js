import { identityMatches, queryAddress } from './propertyLookup.js';
import { normalizeComps } from './comps.js';
import { ProviderStop } from './client.js';
export function normalizeValuation(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object'
    || typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price <= 0) {
    throw new ProviderStop('API_CONTRACT_STOP');
  }
  for (const field of ['priceRangeLow', 'priceRangeHigh']) {
    if (body[field] != null && (typeof body[field] !== 'number' || !Number.isFinite(body[field]) || body[field] < 0)) {
      throw new ProviderStop('API_CONTRACT_STOP');
    }
  }
  if (body.priceRangeLow != null && body.priceRangeHigh != null && body.priceRangeLow > body.priceRangeHigh) {
    throw new ProviderStop('API_CONTRACT_STOP');
  }
  return { price: body.price, low: body.priceRangeLow ?? null, high: body.priceRangeHigh ?? null,
    comps: normalizeComps(body.comparables ?? body.comps ?? []) };
}
export async function fetchValuation(client, address, matched, options) {
  const record = await client.get('/avm/value', { address: queryAddress(address), compCount: 15,
    maxRadius: 2, daysOld: 180 }, options);
  const subject = record.body.subjectProperty;
  if (!subject || !identityMatches(address, subject)
    || (matched.id && subject.id && matched.id !== subject.id)) {
    throw new ProviderStop('AVM_SUBJECT_IDENTITY_STOP', record.rawResponseRef);
  }
  if (subject.propertyType !== 'Manufactured') throw new ProviderStop('MANUFACTURED_REPRESENTATION_STOP', record.rawResponseRef);
  return { record, valuation: normalizeValuation(record.body) };
}
