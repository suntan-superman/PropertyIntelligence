import {idempotent,audit,isUuid} from '../persistence/db.js';
import {getProperty} from '../persistence/propertiesRepository.js';
import {persistEvidenceSnapshot} from './evidenceSnapshotService.js';

export async function refreshEvidence({db,propertyId,model,retrieve,requestKey=null}) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!isUuid(propertyId)) throw new Error('INVALID_UUID');
  const refreshedModel=retrieve ? await retrieve() : model;
  if (!refreshedModel || !['READY_PROPERTY','READY_DEAL'].includes(refreshedModel.state)) throw new Error('IDENTITY_STOP');
  return db.transaction(tx => idempotent(tx,requestKey,'REFRESH_EVIDENCE',async () => {
    const property=await getProperty(tx,propertyId); if (!property) throw new Error('PROPERTY_NOT_SAVED');
    const snapshot=await persistEvidenceSnapshot(tx,refreshedModel,propertyId,requestKey ? `${requestKey}:snapshot` : null);
    await audit(tx,{aggregateType:'property',aggregateId:propertyId,eventType:'EVIDENCE_REFRESHED',payload:{evidenceSnapshotId:snapshot.evidenceSnapshotId},requestKey});
    return {propertyId,...snapshot,refreshedAt:new Date().toISOString()};
  }));
}
