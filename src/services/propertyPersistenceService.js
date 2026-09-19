import {idempotent, audit, isUuid} from '../persistence/db.js';
import {insertAliases,insertOrReuseProperty,listProperties,getProperty,archiveProperty} from '../persistence/propertiesRepository.js';
import {evidenceHistory} from '../persistence/evidenceRepository.js';
import {persistEvidenceSnapshot} from './evidenceSnapshotService.js';
import {addressKey} from '../sources/rentcast/propertyLookup.js';
import {finalize} from '../workbench/model.js';

function parseAddress(text) {
  const match = String(text ?? '').trim().match(/^([^,]{1,180}),\s*([^,]{2,80}),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!match) throw new Error('ADDRESS_INVALID');
  return {addressLine1:match[1].trim(),city:match[2].trim(),state:match[3].toUpperCase(),postalCode:match[4]};
}

export function canonicalInput(model) {
  const parsed = parseAddress(model.address ?? model.property?.address);
  const p = model.property ?? {};
  return {...parsed,normalizedAddress:addressKey(`${parsed.addressLine1}, ${parsed.city}, ${parsed.state} ${parsed.postalCode}`),
    county:p.county ?? null,latitude:p.coordinates?.latitude ?? null,longitude:p.coordinates?.longitude ?? null,
    propertyType:p.propertyType ?? null,apn:p.identifiers?.apn ?? null,atn:p.identifiers?.atn ?? null,
    providerPropertyId:p.identifiers?.providerPropertyId ?? p.identifiers?.id ?? null,
    identityStatus:model.state === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'UNCONFIRMED'};
}

export async function saveProperty({db,model,requestKey = null}) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!model || !['READY_PROPERTY','READY_DEAL'].includes(model.state)) throw new Error('IDENTITY_STOP');
  return db.transaction(async tx => idempotent(tx,requestKey,'SAVE_PROPERTY',async () => {
    const input = canonicalInput(model);
    const property = await insertOrReuseProperty(tx,input);
    await insertAliases(tx,property.id,[
      {aliasType:'ANALYST_INPUT',addressText:model.address,normalizedAddress:input.normalizedAddress,source:'ANALYST_ENTERED'},
      ...(model.property?.address && model.property.address !== model.address ? [{aliasType:'PROVIDER',addressText:model.property.address,normalizedAddress:addressKey(model.property.address),source:'PROVIDER'}] : [])
    ]);
    const snapshot = await persistEvidenceSnapshot(tx,model,property.id,requestKey ? `${requestKey}:snapshot` : null);
    await audit(tx,{aggregateType:'property',aggregateId:property.id,eventType:'PROPERTY_SAVED',payload:{evidenceSnapshotId:snapshot.evidenceSnapshotId},requestKey});
    return {propertyId:property.id,...snapshot,savedAt:new Date().toISOString()};
  }));
}

export async function savedProperties({db,search='',includeArchived=false}) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  return db.transaction(tx => listProperties(tx,{search,includeArchived}));
}

export async function openProperty({db,id}) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!isUuid(id)) throw new Error('INVALID_UUID');
  return db.transaction(async tx => {
    const property = await getProperty(tx,id); if (!property) return null;
    const history=await evidenceHistory(tx,id);
    const latest=(await tx.query('SELECT * FROM evidence_snapshots WHERE property_id=$1 ORDER BY retrieved_at DESC,created_at DESC LIMIT 1',[id])).rows[0];
    let model=null;
    if (latest) {
      const comps=(await tx.query(`SELECT c.* FROM comparables c JOIN comparable_snapshots cs ON cs.id=c.comparable_snapshot_id WHERE cs.evidence_snapshot_id=$1 ORDER BY c.created_at`,[latest.id])).rows.map(c=>({id:c.provider_comp_id,address:c.address,latitude:c.latitude,longitude:c.longitude,propertyType:c.property_type,status:c.status,price:c.price,priceLabel:c.price_label,bedrooms:c.bedrooms,bathrooms:c.bathrooms,squareFeet:c.square_feet,lotSize:c.lot_size,yearBuilt:c.year_built,distanceMiles:c.distance_miles,daysOnMarket:c.days_on_market,correlation:c.correlation,landTenureStatus:c.land_tenure_status,providerPayload:c.provider_payload}));
      const p={...(latest.property_payload ?? {}),valuation:latest.valuation_payload ?? {},comps};
      model=finalize({schemaVersion:1,id,mode:'property',address:[property.address_line1,property.city,property.state,property.postal_code].filter(Boolean).join(', '),state:'READY_PROPERTY',resolutionStatus:'DURABLE_SAVED',property:p,analysis:null,claims:[],claimOrigin:'ANALYST_ENTERED',evidence:[],questions:[],provenance:latest.provenance_payload ?? [],cache:{status:'DURABLE_SAVED',source:'Saved property',retrievedAt:[latest.retrieved_at],newProviderCalls:0,durable:true},notes:['Durably saved property. Historical evidence can be selected without changing prior snapshots.'],originalClaimsPreserved:true});
    }
    return {...property,evidence:history,model};
  });
}

export async function propertyEvidenceHistory({db,id}) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!isUuid(id)) throw new Error('INVALID_UUID');
  return db.transaction(tx => evidenceHistory(tx,id));
}

export async function setPropertyArchive({db,id,archived=true}) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!isUuid(id)) throw new Error('INVALID_UUID');
  return db.transaction(tx => archiveProperty(tx,id,archived));
}
