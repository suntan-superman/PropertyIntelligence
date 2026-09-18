import { evidence } from '../domain/evidence.js';
export function providerEvidence(field, value, record) {
  return evidence({ source: 'RentCast', sourceType: 'THIRD_PARTY_PROVIDER',
    retrievedAt: record.retrievedAt, field, value, rawResponseRef: record.rawResponseRef,
    notes: ['Provider-reported; not independently verified truth.'] });
}
