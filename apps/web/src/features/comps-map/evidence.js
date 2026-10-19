// Display-only adapter. Never edits provider records or makes identity decisions.
export function finiteNumber(value){
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value!=='string'||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(value.trim()))return null;
  const n=Number(value);return Number.isFinite(n)?n:null;
}
export function sourceCoordinates(value){
  const latitude=finiteNumber(value?.latitude),longitude=finiteNumber(value?.longitude);
  return latitude!==null&&longitude!==null&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180?{latitude,longitude}:null;
}
export function distanceMiles(a,b){
  a=sourceCoordinates(a);b=sourceCoordinates(b);if(!a||!b)return null;
  const rad=x=>x*Math.PI/180,dl=rad(b.latitude-a.latitude),dn=rad(b.longitude-a.longitude);
  const h=Math.sin(dl/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dn/2)**2;
  return 3958.7613*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
const money=n=>n===null?'Price unavailable':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const first=(...xs)=>xs.find(x=>x!==null&&x!==undefined&&x!=='')??null;
export const CATEGORIES=['Recorded sales','Active listings','Inactive listings','All provider observations'];
export function categoryRecords(comps,category){return category===CATEGORIES[3]?comps:comps.filter(c=>c.category===category);}
export function comparableEvidence(model){
  const subject=sourceCoordinates(model.property?.coordinates),retrieved=model.cache?.retrievedAt?.join(', ')||null;
  return (model.comps??[]).map((c,i)=>{
    const payload=c.providerPayload??{},raw=c.providerAttributes??payload.providerAttributes??payload;
    const candidate=c.displayNormalized||c.latitude!=null||c.longitude!=null?c:raw;
    const location=sourceCoordinates(candidate),sale=c.evidenceKind==='RECORDED_SALE';
    const status=first(c.status,raw.status),price=finiteNumber(sale?c.salePrice:first(c.price,raw.price));
    const providerDistance=finiteNumber(first(c.providerDistance,c.distance,c.distanceMiles,raw.distance));
    const distance=distanceMiles(subject,location),id=c.id??`comp-${i+1}`;
    const category=sale?CATEGORIES[0]:status==='Active'?CATEGORIES[1]:status==='Inactive'?CATEGORIES[2]:'Other provider observation';
    const sourceReference=first(c.sourceReference,c.evidenceRef,raw.id,payload.providerId,model.evidenceSnapshotId,'Retained RentCast snapshot');
    return {...c,displayNormalized:true,id,number:c.number??i+1,address:first(c.address,raw.formattedAddress,raw.addressLine1,'Address unavailable'),
      providerId:first(c.providerId,payload.providerId,raw.id),parcel:first(c.parcel,raw.assessorID),unit:first(c.unit,raw.addressLine2),
      propertyType:first(c.propertyType,raw.propertyType),bedrooms:finiteNumber(first(c.bedrooms,raw.bedrooms)),bathrooms:finiteNumber(first(c.bathrooms,raw.bathrooms)),
      squareFeet:finiteNumber(first(c.squareFeet,raw.squareFootage)),yearBuilt:finiteNumber(first(c.yearBuilt,raw.yearBuilt)),lotSize:finiteNumber(first(c.lotSize,raw.lotSize)),
      latitude:location?.latitude??null,longitude:location?.longitude??null,mappable:Boolean(location),distance,providerDistance,
      distanceText:distance===null?'Distance unavailable':`${distance.toFixed(2)} mi · straight-line (Haversine)`,
      price,priceText:money(price),priceLabel:sale?'Provider-reported Sale price':'Provider-listed price—not a closing price',
      status,category,evidenceKind:sale?'RECORDED_SALE':'AVM_OBSERVATION',badge:sale?'Research only':status||'Status not returned',
      tenure:'Land tenure unknown',sourceStatus:'RentCast / provider-reported',sourceReference,
      retrievedAt:first(c.retrievedAt,retrieved),saleDate:sale?c.saleDate:null,
      listedDate:first(c.listedDate,raw.listedDate),removedDate:first(c.removedDate,raw.removedDate),lastSeenDate:first(c.lastSeenDate,raw.lastSeenDate),
      daysOnMarket:finiteNumber(first(c.daysOnMarket,raw.daysOnMarket)),
      locationStatus:location?'Retained provider coordinates—not verified parcel location':'Map location unavailable',
      limitation:sale?'Sale event research only; closing, condition and arm’s-length terms not independently verified.':'An active or inactive listing is not proof of a completed sale.',
      relevance:c.relevance??c.reason??'Comparability requires analyst review; no automatic inclusion or price adjustment.',
      selectionStatus:c.selectionStatus??c.analystStatus??'Not selected'};
  });
}
const norm=v=>String(v??'').toUpperCase().replace(/[.,]/g,' ').replace(/\s+/g,' ').trim();
function addressKey(c){
  const address=norm(c.address),match=address.match(/(?:\b(?:APT|UNIT|SUITE)\s*|#\s*)([\w-]+)/);
  const unit=norm(c.unit).replace(/^(APT|UNIT|SUITE|#)\s*/,'')||match?.[1]||'';
  return {address:address.replace(/(?:\b(?:APT|UNIT|SUITE)\s*|#\s*)[\w-]+/,'').replace(/\s+/g,' ').trim(),unit};
}
export function groupObservations(comps){
  const groups=[];
  for(const c of comps){
    const key=addressKey(c),same=groups.filter(g=>g.addressKey===key.address&&g.unit===key.unit);
    const compatible=g=>g.records.every(r=>!['providerId','parcel','squareFeet','bedrooms','bathrooms','propertyType'].some(k=>r[k]!=null&&c[k]!=null&&String(r[k])!==String(c[k])));
    let group=same.find(compatible);
    if(!group){group={id:c.id,address:c.address,addressKey:key.address,unit:key.unit,records:[],warnings:[]};groups.push(group);}
    group.records.push(c);
    if(same.some(g=>g!==group)){group.warnings.push('Conflicting identifiers or attributes: kept separate.');for(const g of same)g.warnings.push('Conflicting identifiers or attributes: kept separate.');}
  }
  const loose=s=>s.replace(/\b(?:N|S|E|W|NORTH|SOUTH|EAST|WEST)\b/g,'').replace(/\s+/g,' ').trim();
  for(const g of groups){if(groups.some(h=>h!==g&&loose(h.addressKey)===loose(g.addressKey)))g.warnings.push('Similar address or different unit: identity ambiguous; observations not merged.');g.warnings=[...new Set(g.warnings)];}
  return groups;
}
