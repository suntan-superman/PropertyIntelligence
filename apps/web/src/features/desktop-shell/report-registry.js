const KEY='pi-investment-workspace-v1-reports';

export function readReportRegistry(){
  try{
    const rows=JSON.parse(localStorage.getItem(KEY)??'[]');
    return Array.isArray(rows)?rows.filter(row=>row&&row.scenarioId&&row.propertyRef&&Number.isInteger(row.revision)&&['brief','full'].includes(row.kind)):[];
  }catch{return [];}
}

export function recordReportReference({scenario,property,kind,status,filename=null}){
  const current=readReportRegistry(),key=`${scenario.id}:${scenario.revision}:${kind}`,entry={id:key,scenarioId:scenario.id,propertyRef:scenario.propertyRef,evidenceFingerprint:scenario.evidenceFingerprint,revision:scenario.revision,scenarioName:scenario.name,propertyAddress:property.address,kind,status,filename,generatedAt:new Date().toISOString()};
  const next=[entry,...current.filter(row=>row.id!==key)].slice(0,200);
  localStorage.setItem(KEY,JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('pi-report-registry-changed',{detail:entry}));
  return entry;
}

export function removeReportReferences(propertyRef){const next=readReportRegistry().filter(row=>row.propertyRef!==propertyRef);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('pi-report-registry-changed',{detail:{propertyRef,removed:true}}));return next;}

