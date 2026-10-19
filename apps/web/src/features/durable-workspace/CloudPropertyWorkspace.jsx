import React,{useEffect,useMemo,useState} from 'react';
import {useAuthentication} from '../../auth/AuthenticationGate.jsx';
import {useNotificationDialog} from '../../components/NotificationDialog.jsx';

const date=value=>value?new Date(value).toLocaleString():'Unknown';
const money=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(value)):'Unknown';
const percent=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:1}).format(Number(value)):'Unknown';
const words=value=>String(value??'Unknown').replaceAll('_',' ').toLowerCase().replace(/^./,letter=>letter.toUpperCase());
const selectedPropertyId=()=>new URLSearchParams(window.location.hash.split('?')[1]??'').get('id');

async function responseJson(response){
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(body.error||'Durable workspace request failed.'),{status:response.status,code:body.code??body.error});
  return body;
}

function ScenarioRevision({revision}){
  const scenario=revision.scenario??{},inputs=scenario.inputs??{},analysis=scenario.analysis??{},deterministic=analysis.deterministic??{},monteCarlo=analysis.monteCarlo?.results??{};
  return <article className="cloud-scenario-card">
    <header><div><span>Saved analysis · revision {revision.revision}</span><h4>{scenario.name||'Unnamed scenario'}</h4></div><time>{date(scenario.savedAt??revision.linkedAt)}</time></header>
    <div className="cloud-metrics">
      <div><small>Purchase price</small><strong>{money(inputs.purchasePrice)}</strong></div>
      <div><small>Exit value</small><strong>{money(inputs.exitValue)}</strong></div>
      <div><small>Rehabilitation</small><strong>{money(inputs.rehabCost)}</strong></div>
      <div><small>Modeled profit</small><strong>{money(deterministic.modeledProfit)}</strong></div>
      <div><small>ROI</small><strong>{percent(deterministic.roi)}</strong></div>
      <div><small>Maximum allowable offer</small><strong>{money(analysis.mao?.deterministic?.purchasePrice)}</strong></div>
      <div><small>Monte Carlo probability of profit</small><strong>{percent(monteCarlo.probabilityOfProfit)}</strong></div>
      <div><small>Monte Carlo median profit</small><strong>{money(monteCarlo.profit?.median)}</strong></div>
    </div>
    <p className="cloud-warning">Saved revision shown exactly as recorded. Opening this view does not recalculate or change underwriting or Monte Carlo results.</p>
    <details><summary>Source Details</summary><dl><dt>Scenario ID</dt><dd>{revision.scenarioId}</dd><dt>Evidence snapshot</dt><dd>{revision.evidenceSnapshotId||'Unknown'}</dd><dt>Economics version</dt><dd>{analysis.economicsVersion||'Unknown'}</dd><dt>Model version</dt><dd>{analysis.modelVersion||'Unknown'}</dd><dt>Revision state</dt><dd>Immutable saved revision</dd></dl></details>
  </article>;
}

function DocumentRegister({documents=[]}){
  if(!documents.length)return <p>No supporting-document metadata is linked to this property.</p>;
  return <div className="cloud-document-list">{documents.map(document=><article key={document.id}><div><b>{document.currentVersionMetadata?.filename||document.description||words(document.documentType)}</b><small>{words(document.documentType)} · {document.source||'Source not supplied'} · {document.sourceDate||'Source date unknown'}</small></div><div><span>{words(document.reviewStatus)}</span><small>{document.currentVersionMetadata?.scanStatus==='CLEAN'?'Malware scan: Clean':'File unavailable pending a clean scan'} · {document.appendixSelected?'Included in report':'Not included in report'}</small></div></article>)}</div>;
}

export default function CloudPropertyWorkspace(){
  const authentication=useAuthentication(),dialog=useNotificationDialog(),[properties,setProperties]=useState([]),[workspace,setWorkspace]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[search,setSearch]=useState(''),[showArchived,setShowArchived]=useState(false);
  const loadList=async()=>{setLoading(true);setError('');try{const result=await responseJson(await fetch('/api/durable-properties?includeArchived=true',{credentials:'same-origin',cache:'no-store'}));setProperties(result.properties??[]);}catch(reason){setError(reason.message);}finally{setLoading(false);}};
  const open=async id=>{if(!id)return;setBusy(id);setError('');try{setWorkspace(await responseJson(await fetch(`/api/durable-properties/${encodeURIComponent(id)}/workspace`,{credentials:'same-origin',cache:'no-store'})));}catch(reason){setError(reason.message);}finally{setBusy('');}};
  useEffect(()=>{loadList();},[]);
  useEffect(()=>{const sync=()=>{const id=selectedPropertyId();if(id)open(id);else setWorkspace(null);};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  const visible=useMemo(()=>properties.filter(property=>showArchived||property.lifecycleStatus!=='ARCHIVED_PROPERTY').filter(property=>property.address.toLowerCase().includes(search.trim().toLowerCase())),[properties,showArchived,search]);
  const choose=property=>{window.location.hash=`durable-property?id=${encodeURIComponent(property.id)}`;};
  const setArchived=async(property,archived)=>{
    const approved=await dialog.confirm({title:archived?'Archive saved property?':'Restore saved property?',message:archived?'The property will be removed from the active list. Its evidence, scenarios, reports and documents remain preserved.':'The property will return to the active Saved Properties list.',details:[['Property',property.address]],confirmLabel:archived?'Archive Property':'Restore Property',tone:archived?'warning':'info'});if(!approved)return;
    setBusy(property.id);setError('');try{const result=await responseJson(await fetch(`/api/durable-properties/${encodeURIComponent(property.id)}/${archived?'archive':'restore'}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-PI-CSRF':authentication.csrfToken},body:'{}'}));setProperties(current=>current.map(item=>item.id===result.property.id?result.property:item));setWorkspace(current=>current?.property.id===result.property.id?{...current,property:result.property}:current);}catch(reason){setError(reason.message);}finally{setBusy('');}
  };
  return <section id="saved-properties" className="cloud-property-workspace">
    <div className="cloud-workspace-heading"><div><p className="eyebrow">FIRESTORE · ORGANIZATION WORKSPACE</p><h2>Durable Property Workspace</h2><p>Saved properties, immutable scenario revisions and report history restored through the authenticated server. No provider request is made.</p></div><span>{loading?'Loading…':`${visible.length} propert${visible.length===1?'y':'ies'}`}</span></div>
    <div className="cloud-workspace-tools"><label>Search saved properties<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Address"/></label><label className="cloud-archive-toggle"><input type="checkbox" checked={showArchived} onChange={event=>setShowArchived(event.target.checked)}/> Show archived</label></div>
    {error&&<p role="alert" className="warning">{error}</p>}
    {!loading&&<div className="cloud-property-table"><div className="cloud-property-row cloud-property-head"><span>Property</span><span>Status</span><span>Last updated</span><span>Scenarios / reports</span><span>Actions</span></div>{visible.map(property=><div className="cloud-property-row" key={property.id}><span><b>{property.address}</b><small>{property.propertyType||'Property type unknown'} · {words(property.identityConfidence)}</small></span><span>{words(property.lifecycleStatus)}</span><span>{date(property.updatedAt)}</span><span>{property.scenarioCount} / {property.reportCount}</span><span className="cloud-property-actions"><button disabled={busy===property.id} onClick={()=>choose(property)}>Open Property</button>{property.lifecycleStatus==='ARCHIVED_PROPERTY'?<button className="secondary" disabled={Boolean(busy)} onClick={()=>setArchived(property,false)}>Restore</button>:<button className="secondary" disabled={Boolean(busy)} onClick={()=>setArchived(property,true)}>Archive</button>}</span></div>)}{!visible.length&&<p>No durable properties match this view.</p>}</div>}
    {workspace&&<article className="cloud-property-detail" aria-live="polite"><div className="cloud-detail-heading"><div><p className="eyebrow">SAVED PROPERTY</p><h3>{workspace.property.address}</h3><p>{workspace.property.propertyType||'Property type unknown'} · {words(workspace.property.lifecycleStatus)}</p></div><button className="secondary" onClick={()=>{window.location.hash='saved-properties';setWorkspace(null);}}>Close</button></div>
      <div className="cloud-identity-grid"><div><small>Identity confidence</small><strong>{words(workspace.property.identityConfidence)}</strong></div><div><small>Address verification</small><strong>{words(workspace.property.verificationStatus?.address)}</strong></div><div><small>Parcel / APN</small><strong>{workspace.property.parcelIdentifiers?.map(item=>item.value).join(', ')||'Unknown'}</strong></div><div><small>Last updated</small><strong>{date(workspace.property.updatedAt)}</strong></div></div>
      <p className="cloud-warning">Saved Property is a lifecycle status, not legal verification of address, parcel, title or ownership.</p>
      <section className="cloud-detail-section"><h3>Saved scenario revisions</h3>{workspace.revisions.length?workspace.revisions.map(revision=><ScenarioRevision key={`${revision.scenarioId}:${revision.revision}`} revision={revision}/>):<p>No saved scenario revisions are linked.</p>}</section>
      <section className="cloud-detail-section"><h3>Supporting documents</h3><DocumentRegister documents={workspace.documents}/></section>
      <section className="cloud-detail-section"><h3>Report history</h3>{workspace.reports.length?<details className="cloud-report-history"><summary>{workspace.reports.length} historical report record{workspace.reports.length===1?'':'s'}</summary><div className="cloud-report-list">{[...workspace.reports].reverse().map(report=><div key={report.id}><span><b>{report.kind==='brief'?'Opportunity Brief':'Full Investor Package'}</b><small>{report.scenarioName||'Scenario'} · revision {report.revision} · {report.status}</small></span><time>{date(report.generatedAt)}</time></div>)}</div></details>:<p>No report history is linked.</p>}</section>
      <details className="cloud-source-details"><summary>Source Details</summary><dl><dt>Stable property ID</dt><dd>{workspace.property.id}</dd><dt>Organization</dt><dd>{workspace.property.organizationId}</dd><dt>Original subject reference</dt><dd>{workspace.property.sourceSubjectRef}</dd><dt>Evidence snapshots</dt><dd>{workspace.property.evidenceSnapshotIds?.join(', ')||'Unknown'}</dd><dt>Created</dt><dd>{date(workspace.property.createdAt)}</dd></dl></details>
    </article>}
  </section>;
}
