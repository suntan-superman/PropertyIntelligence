import { ProviderStop } from './client.js';
export function addressKey(value) {
  return String(value ?? '').toUpperCase().replace(/[.,]/g, '').trim().split(/\s+/)
    .map((token) => ({ PARKWAY:'PKWY', CIRCLE:'CIR', PLACE:'PL', STREET:'ST', ROAD:'RD',
      AVENUE:'AVE', DRIVE:'DR', FLORIDA:'FL' })[token] || token).join(' ');
}
export const completeAddress = (address) => Boolean(address.street && address.city && address.state);
export const queryAddress = (address) => [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
export function identityMatches(address, candidate) {
  return addressKey(address.street) === addressKey(candidate.addressLine1)
    && addressKey(address.city) === addressKey(candidate.city)
    && addressKey(address.state) === addressKey(candidate.state)
    && (!address.zip || address.zip === candidate.zipCode)
    && !candidate.addressLine2;
}
export function selectProperty(address, body) {
  if (!Array.isArray(body) || body.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new ProviderStop('API_CONTRACT_STOP');
  }
  if (!completeAddress(address)) return { status: body.length === 1
    && addressKey(body[0].state) === 'FL' && addressKey(body[0].addressLine1) === addressKey(address.street)
    ? 'AMBIGUOUS_PENDING_CONFIRMATION' : 'ADDRESS_AMBIGUOUS', candidates: body, selected: null };
  if (body.length === 0) return { status: 'NO_MATCH', candidates: body, selected: null };
  if (body.length !== 1 || !identityMatches(address, body[0])) {
    return { status: 'ADDRESS_AMBIGUOUS', candidates: body, selected: null };
  }
  return { status: 'MATCHED_ADDRESS', candidates: body, selected: body[0] };
}
export async function lookupProperty(client, address, options) {
  if (!completeAddress(address)) return { status: 'ADDRESS_AMBIGUOUS', selected: null, candidates: [], record: null };
  const record = await client.get('/properties', { address: queryAddress(address) }, options);
  return { ...selectProperty(address, record.body), record };
}
