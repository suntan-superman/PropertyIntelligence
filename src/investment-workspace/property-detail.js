import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {sha,EVIDENCE_ROOT} from './evidence.js';
import {comparableEvidence,sourceCoordinates,finiteNumber} from '../../apps/web/src/features/comps-map/evidence.js';

export function savedDetail(j,fingerprint){
 const id=j.property.id,snapshot=j.snapshot.id,ref=`PROPERTY-${id}`;
 if(j.snapshot.property_id!==id||j.property.archived_at)throw new Error('Saved snapshot identity mismatch.');
 const p={ref,durablePropertyId:id,evidenceSnapshotId:snapshot,evidenceFingerprint:fingerprint,subjectKind:'DURABLE_SAVED',
  address:[j.property.address_line1,j.property.city,`${j.property.state} ${j.property.postal_code}`].join(', '),city:j.property.city,
  attributes:{...j.propertyPayload,squareFootage:j.propertyPayload.squareFeet},avm:j.valuation,
  propertyRef:`saved snapshot ${snapshot}`,valuationRef:`saved snapshot ${snapshot}`,propertyRetrievedAt:j.snapshot.retrieved_at,valuationRetrievedAt:j.snapshot.retrieved_at,
  providerAsOf:null,valuationAsOf:null,reviewDate:null,identityStatus:'Existing durable Property reference; legal parcel identity and title not verified by this view',
  historicalTrigger:{kind:null,amount:null,sourceDate:null,sourceRef:'No county distress evidence selected for this saved snapshot',meaning:'Current distress, motivation, liens and payoff have not been established'},countyUse:{code:null,sourceRef:null},
  sales:[],saleSearch:{retrievedAt:null,returned:null,eligible:null,radius:null,partial:null},listings:[],
  findings:['15 retained AVM listing observations are not completed-sale comparables. No Gabe sale research is attached to this separate durable Property.']};
 const model={id,subjectRef:ref,subjectKind:'DURABLE_SAVED',evidenceSnapshotId:snapshot,evidenceFingerprint:fingerprint,digest:fingerprint,
  mode:'property',state:'READY_PROPERTY',resolutionStatus:'DURABLE_SAVED',address:p.address,property:{...j.propertyPayload,coordinates:sourceCoordinates(j.propertyPayload.coordinates),valuation:j.valuation},
  cache:{retrievedAt:[j.snapshot.retrieved_at],source:'Saved database snapshot · private read-only copy'},metrics:[],provenance:[{source:'RentCast'}],valuationStatus:'INDEPENDENT_ONLY',valuationReference:p.valuationRef,
  comps:j.comps.map(c=>({id:c.id,address:c.address,latitude:c.latitude,longitude:c.longitude,propertyType:c.property_type,status:c.status,price:c.price,bedrooms:c.bedrooms,bathrooms:c.bathrooms,squareFeet:c.square_feet,yearBuilt:c.year_built,lotSize:c.lot_size,distanceMiles:c.distance_miles,daysOnMarket:c.days_on_market,providerId:c.provider_comp_id,providerPayload:{...c.providerPayload,providerAttributes:c.providerAttributes}}))};
 model.comps=comparableEvidence(model);
 p.listings=model.comps.map(c=>({ref:c.id,address:c.address,status:c.status,price:c.price,lastSeenDate:c.lastSeenDate,distance:c.distance,bedrooms:c.bedrooms,bathrooms:c.bathrooms,squareFootage:c.squareFeet,priceMeaning:c.priceLabel}));
 return {property:p,model};
}
export async function addPropertyDetails(evidence,root=process.cwd()){
 const read=async p=>readFile(path.join(root,p)),parse=async p=>JSON.parse(await read(p));
 const bytes=await read('data/runtime/property-detail-v1-2/saved-haven.json');
 if(sha(bytes)!=='970461132bcb09adc17a546192d633afc459a5af7766e9b531bd3ab816069a80')throw new Error('Retained saved snapshot changed; do not substitute evidence silently.');
 const saved=savedDetail(JSON.parse(bytes),sha(bytes)),cards=(await parse(`${EVIDENCE_ROOT}/report-model-v2-1.json`)).cards;
 const models=[];
 for(const p of evidence.properties){
  const card=cards.find(c=>c.ref===p.ref),record=(await parse(`data/runtime/gabe-demo-v2-2026-10-13/${p.ref}-RECORD-response.json`)).body[0],sold=(await parse(`${EVIDENCE_ROOT}/${p.ref}-SOLD-response.json`)).body;
  // These response bytes were checked by loadEvidence's original source bindings.
  if(record.formattedAddress!==p.address)throw new Error('Retained subject source mismatch.');
  const comps=card.sales.map(c=>{
   const raw=sold[c.sourceIndex];if(!raw||raw.id!==c.providerId||raw.formattedAddress!==c.address)throw new Error('Sale research source-index mismatch.');
   return {...p.sales.find(s=>s.evidenceRef===c.evidenceRef),id:c.evidenceRef,providerId:c.providerId,sourceReference:c.evidenceRef,squareFeet:c.squareFootage,evidenceKind:'RECORDED_SALE',salePrice:c.salePrice,...sourceCoordinates(raw),retrievedAt:p.saleSearch.retrievedAt};
  });
  // V2.1 listing summaries deliberately omit coordinates; retain the omissions.
  comps.push(...card.marketListings.map(c=>({...c,id:c.ref,sourceReference:c.sourceRef||c.ref,squareFeet:c.squareFootage,retrievedAt:p.valuationRetrievedAt})));
  models.push({id:p.ref,subjectRef:p.ref,subjectKind:'PRELIMINARY',evidenceSnapshotId:p.valuationRef,evidenceFingerprint:evidence.fingerprint,digest:evidence.fingerprint+p.ref,
   mode:'property',state:'READY_PROPERTY',resolutionStatus:'PRELIMINARY ADDRESS REVIEW',address:p.address,property:{...p.attributes,squareFeet:p.attributes.squareFootage,coordinates:sourceCoordinates(record),valuation:p.avm},
   comps,metrics:[],provenance:[{source:'RentCast'}],cache:{retrievedAt:[p.valuationRetrievedAt]},valuationReference:p.valuationRef,valuationAsOf:p.valuationAsOf,valuationStatus:'INDEPENDENT_ONLY',findings:p.findings});
 }
 return {...evidence,properties:[...evidence.properties,saved.property],propertyDetails:[saved.model,...models]};
}
