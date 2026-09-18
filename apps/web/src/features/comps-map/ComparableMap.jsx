import React,{useEffect,useMemo,useRef,useState} from 'react';
import {mapEntries} from './mapData.js';
import {loadGoogleMaps,onGoogleFailure,retryGoogleMaps} from './googleLoader.js';
import {googleMap} from './googleMap.js';
import {offlineMap} from './offlineMap.js';
import './map.css';

export default function ComparableMap({model,selected,onSelect}) {
  const node=useRef(null),controller=useRef(null),selection=useRef(selected);
  selection.current=selected;
  const entries=useMemo(()=>mapEntries(model),[model.digest]);
  const [status,setStatus]=useState('LOADING'),[reason,setReason]=useState(''),[attempt,setAttempt]=useState(0),[groups,setGroups]=useState([]),[expanded,setExpanded]=useState(null);
  useEffect(()=>{
    let disposed=false,fellBack=false;const abort=new AbortController();let configTimer;
    setStatus('LOADING');setReason('');setGroups([]);setExpanded(null);
    const onGroups=next=>setGroups(previous=>previous.map(g=>g.id).join(';')===next.map(g=>g.id).join(';')?previous:next);
    const callbacks={onSelect,onGroups,onExpand:group=>setExpanded(group),onReady:()=>{if(!disposed&&!fellBack)setStatus('STREET');},onFailure:message=>fallback(message)};
    const fallback=message=>{
      if(disposed||fellBack||!entries.some(e=>e.position))return;fellBack=true;abort.abort();clearTimeout(configTimer);controller.current?.destroy();node.current.replaceChildren();
      setReason(message);setStatus('OFFLINE_FALLBACK');setExpanded(null);
      controller.current=offlineMap(node.current,entries,callbacks);controller.current.select(selection.current);
    };
    const offline=()=>fallback('Network offline. Street basemap unavailable.');
    const removeFailure=onGoogleFailure(event=>fallback(event.detail||'Google Maps unavailable.'));
    if(!entries.some(e=>e.position)){setStatus('NO_COORDINATES');}
    else {
      window.addEventListener('offline',offline);
      if(navigator.onLine===false)offline();
      else (async()=>{
        try{
          configTimer=setTimeout(()=>abort.abort(),8000);
          const response=await fetch('/api/maps/config',{signal:abort.signal,cache:'no-store'});if(!response.ok)throw new Error('Map configuration unavailable.');
          const config=await response.json();clearTimeout(configTimer);
          if(!config.configured)throw new Error(config.reason||'Google Maps browser key is not configured.');
          const maps=await loadGoogleMaps(config.browserKey);
          if(disposed||fellBack)return;
          controller.current=googleMap(node.current,maps,entries,callbacks);controller.current.select(selection.current);
        }catch(error){fallback(error.name==='AbortError'?'Map configuration request timed out.':error.message);}
      })();
    }
    return()=>{disposed=true;abort.abort();clearTimeout(configTimer);removeFailure();window.removeEventListener('offline',offline);controller.current?.destroy();controller.current=null;};
  },[entries,attempt,onSelect]);
  useEffect(()=>{controller.current?.select(selected);},[selected]);
  const selectedEntry=entries.find(e=>e.id===selected),roster=expanded?.members??[];
  return <>
    <div className="map-toolbar"><span role="status" data-testid="basemap-status">{status==='STREET'?'Google street basemap':status==='OFFLINE_FALLBACK'?`Offline coordinate fallback · ${reason}`:status==='NO_COORDINATES'?'Map unavailable — no provider coordinates.':'Loading Google street basemap…'} · S = subject</span>
      <button onClick={()=>{setExpanded(null);controller.current?.fitAll();}} disabled={status==='NO_COORDINATES'}>Fit all locations</button>
      {status==='OFFLINE_FALLBACK'&&<button onClick={()=>{retryGoogleMaps();setAttempt(n=>n+1);}}>Retry street basemap</button>}
      <label>Land tenure filter <select disabled aria-label="Land tenure filter"><option>Unavailable — no evidence</option></select></label>
    </div>
    <div ref={node} className="comp-map" data-map-engine={status} aria-label="Subject and comparable property map" role="region"/>
    <p className="map-note">Google provides the street context, not property evidence. Source coordinates are unchanged; no geocoding or inferred tenure. Numbered markers identify comps; prices and details appear only on selection.</p>
    {groups.length>0&&<div className="map-overlaps" aria-label="Overlapping locations"><strong>Overlapping locations</strong>{groups.map(group=><button key={group.id} onClick={()=>setExpanded(group)} aria-expanded={expanded?.id===group.id}>Expand group {group.members.map(e=>e.label).join(', ')} ({group.members.length})</button>)}</div>}
    {expanded&&<div className="map-overlap-roster" aria-label="Expanded overlapping locations"><div className="map-roster-heading"><strong>{roster.length} locations in this group</strong><button onClick={()=>controller.current?.zoomGroup(expanded)}>Zoom to group</button><button onClick={()=>setExpanded(null)}>Close group</button></div><p>Each entry remains at its provider coordinates, including exact duplicates.</p><ul>{roster.map(entry=><li key={entry.id}><button onClick={()=>onSelect(entry.id)} aria-pressed={selected===entry.id}>Show {entry.subject?'subject':`comp ${entry.label}`}</button><span>{entry.address}</span></li>)}</ul></div>}
    <div className="selection" aria-live="polite" data-testid="selected-comp">{selectedEntry?<><strong>{selectedEntry.title}</strong><p>{selectedEntry.position?'Popup open at provider coordinates.':'Map location unavailable — evidence retained below.'}</p><dl className="map-selection-facts">{selectedEntry.facts.map(([label,value])=><React.Fragment key={label}><dt>{label}</dt><dd>{value}</dd></React.Fragment>)}</dl><button onClick={()=>onSelect(null)}>Clear map selection</button></>:'Select a subject/comp marker, table row or expanded group entry to inspect its evidence.'}</div>
  </>;
}
