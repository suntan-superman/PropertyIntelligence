import { lookupProperty } from './propertyLookup.js';
import { fetchValuation } from './valuation.js';
import { normalizeProperty } from './normalizer.js';
import { ProviderStop } from './client.js';
export async function verifyOne(client, input, options = {}) {
  const address = input.addressConfirmation?.status === 'USER_CONFIRMED'
    ? input.addressConfirmation.address : input.sponsorAddress;
  const result = { propertyId: input.id, sponsorAddress: input.sponsorAddress, status: 'NOT_QUERIED',
    verificationAddress: address, addressConfirmation: input.addressConfirmation ?? null,
    property: null, evidence: [], candidates: [], rawResponseRefs: [], anomalies: [] };
  try {
    const match = await lookupProperty(client, address, options);
    result.status = match.status;
    result.candidates = match.candidates;
    if (match.record) result.rawResponseRefs.push(match.record.rawResponseRef);
    if (!match.selected) {
      if (match.status === 'NO_MATCH') result.stopReason = 'MANUFACTURED_REPRESENTATION_STOP';
      if (match.status === 'ADDRESS_AMBIGUOUS' && input.id !== 'joyce') result.stopReason = 'ADDRESS_IDENTITY_STOP';
      return result;
    }
    Object.assign(result, normalizeProperty(input.id, match.selected, match.record));
    if (match.selected.propertyType !== 'Manufactured') {
      result.anomalies.push(`Provider property type: ${match.selected.propertyType ?? 'missing'}; manufactured-home identity not established.`);
      throw new ProviderStop('MANUFACTURED_REPRESENTATION_STOP', match.record.rawResponseRef);
    }
    const avm = await fetchValuation(client, address, match.selected, options);
    result.rawResponseRefs.push(avm.record.rawResponseRef);
    Object.assign(result, normalizeProperty(input.id, match.selected, match.record, avm));
    result.status = 'INDEPENDENT_EVIDENCE_AVAILABLE';
    result.anomalies.push('Manufactured is provider-reported; unit/land tenure, title, liens and repair condition remain unverified.');
    const otherTypeComps = avm.valuation.comps.filter((item) => item.propertyType !== 'Manufactured').length;
    if (otherTypeComps) result.anomalies.push(`${otherTypeComps} comparable(s) have another or missing type; all retained.`);
    return result;
  } catch (error) {
    result.stopReason = error instanceof ProviderStop ? error.code : 'NORMALIZATION_OR_CONTRACT_STOP';
    result.status = result.stopReason;
    if (error.rawResponseRef && !result.rawResponseRefs.includes(error.rawResponseRef)) result.rawResponseRefs.push(error.rawResponseRef);
    return result;
  }
}
