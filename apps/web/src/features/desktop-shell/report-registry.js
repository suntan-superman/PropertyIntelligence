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

const sameReport=(row,report)=>row.id===report.id||(row.scenarioId===report.scenarioId&&row.revision===report.revision&&row.kind===report.kind&&(!report.filename||!row.filename||row.filename===report.filename));
export function removeReportReference(report){const next=readReportRegistry().filter(row=>!sameReport(row,report));localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('pi-report-registry-changed',{detail:{reportId:report.id,removed:true}}));return next;}
export function removeScenarioReportReferences(scenarioId){const next=readReportRegistry().filter(row=>row.scenarioId!==scenarioId);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('pi-report-registry-changed',{detail:{scenarioId,removed:true}}));return next;}

