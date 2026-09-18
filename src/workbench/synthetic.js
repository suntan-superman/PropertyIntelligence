import {fixture,finalize} from './model.js';
export async function synthetic(kind){
  const m=await fixture('fantasia');m.id=`synthetic-${kind}`;
  m.address='SYNTHETIC QA ONLY — 12345 Exceptionally Long Manufactured Home Community Access Boulevard, Building North Annex, Unit 123456789, Test Municipality, FL 00000';
  m.notes=['SYNTHETIC QA ONLY. Layout stress fixture, not property evidence.'];
  if(kind==='long'){
    m.analysis=null;m.property={...m.property,address:m.address,bedrooms:null,bathrooms:null,squareFeet:null,yearBuilt:null,valuation:null,coordinates:null,comps:[{address:m.address,price:null,latitude:null,longitude:null,status:null}]};
    m.evidence=[...m.evidence.filter(f=>f.status==='MISSING'),...Array.from({length:25},(_,i)=>({field:`syntheticUnknown${i+1}`,status:'MISSING',independentValue:null,sponsorValue:null,notes:['Not supplied.'],sources:[]}))];
    m.claims=[];m.state='SOURCE_STOP';m.resolutionStatus='SYNTHETIC_INCOMPLETE';
  }else if(kind==='many-comps'){
    m.property.comps=Array.from({length:70},(_,i)=>({...m.property.comps[i%15],address:`SYNTHETIC ${i+1} — ${m.property.comps[i%15].address}`,latitude:i===69?null:m.property.comps[i%15].latitude}));
  }else throw new Error('INVALID_SYNTHETIC');
  return finalize(m);
}
