export const CLAIM_STATUSES = Object.freeze(['SPONSOR_SUPPLIED', 'INDEPENDENTLY_SUPPORTED',
  'VERIFIED', 'CONTRADICTED', 'MISSING', 'AMBIGUOUS']);
export function claim({ field, value, unit = null, suppliedBy, sourceDocument,
  suppliedAt = null, status = 'SPONSOR_SUPPLIED', evidenceRefs = [], notes = [] }) {
  if (!field || !suppliedBy || !sourceDocument || !CLAIM_STATUSES.includes(status)
    || !Array.isArray(evidenceRefs) || !Array.isArray(notes) || value === undefined) {
    throw new Error('Invalid claim');
  }
  return { field, value, unit, suppliedBy, sourceDocument, suppliedAt, status, evidenceRefs, notes };
}
