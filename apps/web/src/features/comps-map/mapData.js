import {money,text} from '../../utils/display.js';

export const located=p=>Number.isFinite(p?.latitude)&&Number.isFinite(p?.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;
export function mapEntries(model) {
  const p=model.property;
  const subject={id:'subject',label:'S',title:`Subject: ${model.address}`,address:model.address,subject:true,
    position:located(p?.coordinates)?{lat:p.coordinates.latitude,lng:p.coordinates.longitude}:null,
    facts:[['Property type',text(p?.propertyType)],['Bedrooms / bathrooms',`${text(p?.bedrooms)} / ${text(p?.bathrooms)}`],
      ['Area / year built',`${text(p?.squareFeet)} SF / ${text(p?.yearBuilt)}`],['Lot / unit',`${text(p?.lotSize)} SF / Unknown`],
      ['Independent AVM',money(p?.valuation?.price)],['Independent AVM range',`${money(p?.valuation?.low)} – ${money(p?.valuation?.high)}`],
      ...model.metrics.filter(m=>/Purchase|Resale|Break-Even/.test(m.label)).map(m=>[m.label,`${m.display} · ${m.status}`]),
      ['Listing status / DOM','Unknown / Unknown'],['Distance','Subject location — not a comparable distance'],
      ['Evidence status',`${model.resolutionStatus} · ${model.valuationStatus}`],['Land tenure','Unknown — unresolved; not inferred'],
      ['Retrieved',model.cache.retrievedAt.join(', ')||'Not available']]};
  return [subject,...model.comps.map(c=>({id:c.id,label:String(c.number),title:`Comp ${c.number}: ${c.address}`,address:c.address,subject:false,
    position:located(c)?{lat:c.latitude,lng:c.longitude}:null,
    facts:[['Property type',text(c.propertyType)],['Bedrooms / bathrooms',`${text(c.bedrooms)} / ${text(c.bathrooms)}`],
      ['Area / year built',`${text(c.squareFeet)} SF / ${text(c.yearBuilt)}`],['Lot / unit',`${text(c.lotSize)} SF / ${text(c.unit)}`],
      [c.priceLabel,c.priceText],['Provider status',`${text(c.status)} · ${c.badge}`],['Distance',c.distance==null?'Unknown':`${c.distance} miles`],
      ['Days on market',text(c.daysOnMarket)],['Correlation',text(c.correlation)],['Evidence status',c.sourceStatus],
      ['Land tenure',c.tenure],['Map location',c.locationStatus],['Retrieved',model.cache.retrievedAt.join(', ')||'Not available']]}))];
}
// Screen-space connected components; source coordinates are never edited.
export function overlapGroups(entries,project,radius=32) {
  const points=entries.filter(e=>e.position).map(entry=>({entry,p:project(entry.position)})).filter(x=>x.p&&Number.isFinite(x.p.x)&&Number.isFinite(x.p.y));
  const visited=new Set(),groups=[];
  for(let i=0;i<points.length;i++){
    if(visited.has(i))continue;
    const queue=[i],members=[];visited.add(i);
    while(queue.length){const j=queue.shift();members.push(points[j].entry);
      for(let k=0;k<points.length;k++)if(!visited.has(k)&&Math.hypot(points[k].p.x-points[j].p.x,points[k].p.y-points[j].p.y)<=radius){visited.add(k);queue.push(k);}}
    if(members.length>1)groups.push({id:members.map(e=>e.id).join('|'),members,position:members[0].position});
  }
  return groups;
}
export function popupContent(entry) {
  const root=document.createElement('article');root.className='map-evidence-popup';root.dataset.mapPopup=entry.id;
  const heading=document.createElement('h3');heading.textContent=entry.title;root.append(heading);
  const list=document.createElement('dl');
  for(const [label,value] of entry.facts){const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;detail.textContent=value;list.append(term,detail);}
  root.append(list);const note=document.createElement('p');note.textContent=entry.subject?'Independent estimates are evidence, not verified resale proceeds.':'Provider-listed price is not an established closed sale.';root.append(note);
  return root;
}
