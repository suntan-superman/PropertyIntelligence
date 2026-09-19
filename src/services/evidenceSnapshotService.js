import {idempotent, audit} from '../persistence/db.js';
import {insertEvidenceSnapshot, insertValuation, insertComparableSnapshot} from '../persistence/evidenceRepository.js';

const latest = values => [...(values ?? [])].filter(Boolean).sort().at(-1) ?? new Date().toISOString();

export function evidenceInput(model, propertyId) {
  const p = model.property ?? {};
  const valuation = p.valuation ?? {};
  const provenance = model.provenance ?? [];
  const source = provenance.find(item => item.source)?.source ?? 'Property Intelligence';
  const sourceRecordId = p.identifiers?.providerPropertyId ?? p.identifiers?.id ?? null;
  return {
    propertyId, source, sourceRecordId, retrievedAt: latest(model.cache?.retrievedAt),
    snapshotType: model.cache?.status === 'EXISTING_CACHED_EVIDENCE' ? 'CACHED_FIXTURE' : 'PROVIDER_RETRIEVAL',
    status: model.state ?? 'UNKNOWN', propertyPayload: p, valuationPayload: valuation,
    taxPayload: p.taxes ?? {}, assessmentPayload: p.assessments ?? {}, saleHistoryPayload: p.saleHistory ?? {},
    featuresPayload: {bedrooms:p.bedrooms,bathrooms:p.bathrooms,squareFeet:p.squareFeet,lotSize:p.lotSize,yearBuilt:p.yearBuilt},
    legalPayload: (model.evidence ?? []).filter(item => /tenure|title|legal/i.test(`${item.category} ${item.field}`)),
    provenancePayload: provenance, rawReference: provenance.find(item => item.rawResponseRef || item.reference)?.rawResponseRef ?? null
  };
}

export async function persistEvidenceSnapshot(tx, model, propertyId, requestKey = null) {
  return idempotent(tx, requestKey, 'SAVE_PROPERTY_EVIDENCE', async () => {
    const input = evidenceInput(model, propertyId);
    const evidence = await insertEvidenceSnapshot(tx, input);
    const valuation = await insertValuation(tx, {propertyId,evidenceSnapshotId:evidence.id,source:input.source,
      valuationType:'AVM',estimatedValue:input.valuationPayload.price ?? null,lowValue:input.valuationPayload.low ?? null,
      highValue:input.valuationPayload.high ?? null,effectiveAt:input.retrievedAt});
    const compSnapshot = await insertComparableSnapshot(tx, {propertyId,evidenceSnapshotId:evidence.id,source:input.source,comparables:model.property?.comps ?? model.comps ?? []});
    await audit(tx,{aggregateType:'property',aggregateId:propertyId,eventType:'EVIDENCE_SNAPSHOT_CREATED',payload:{evidenceSnapshotId:evidence.id,valuationId:valuation.id,comparableSnapshotId:compSnapshot.id},requestKey});
    return {evidenceSnapshotId:evidence.id,valuationId:valuation.id,comparableSnapshotId:compSnapshot.id};
  });
}
