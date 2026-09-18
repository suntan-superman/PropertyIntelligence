import { hash } from '../io/files.js';
export function evidence({ source, sourceType, retrievedAt, field, value, rawResponseRef, notes = [] }) {
  if (!source || !sourceType || !field || !rawResponseRef || !Number.isFinite(Date.parse(retrievedAt))
    || value === undefined) throw new Error('Invalid evidence');
  return { id: hash(JSON.stringify([source, rawResponseRef, field, value])), source, sourceType,
    retrievedAt, field, value, rawResponseRef, notes };
}
