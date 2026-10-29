import {overlapGroups,popupContent} from './mapData.js';

export function googleMap(host,maps,entries,{onSelect,onGroups,onExpand,onReady,onFailure}) {
  const located=entries.filter(e=>e.position),markers=new Map(),listeners=[];
  const map=new maps.Map(host,{center:located[0].position,zoom:13,mapId:'DEMO_MAP_ID',mapTypeId:'roadmap',mapTypeControl:false,
    streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative',clickableIcons:false});
  const info=new maps.InfoWindow({maxWidth:Math.min(340,host.clientWidth-48)});
  let selected=null,clusters=[],disposed=false,paintTimer;
  const bounds=members=>{const result=new maps.LatLngBounds();for(const e of members)result.extend(e.position);return result;};
  const markerContent=(entry,{cluster=false,count=null}={})=>{const node=document.createElement('div'),active=entry.id===selected;node.textContent=String(count??entry.label??'');node.style.cssText=`display:grid;place-items:center;box-sizing:border-box;width:${cluster?'34px':entry.subject?'29px':'27px'};height:${cluster?'34px':entry.subject?'29px':'27px'};border:${active?'3px':'2px'} solid #fff;border-radius:${entry.subject?'4px':'50%'};background:${cluster?'#35485f':active?'#753f14':entry.subject?'#914916':'#256b61'};color:#fff;font:700 12px/1 Arial,sans-serif;box-shadow:0 1px 5px #1238;`;return node;};
  for(const entry of located){
    const marker=new maps.marker.AdvancedMarkerElement({map,position:entry.position,title:entry.title,content:markerContent(entry),gmpClickable:true,zIndex:entry.subject?800:100});
    listeners.push(marker.addListener('click',()=>onSelect(entry.id)));markers.set(entry.id,marker);
  }
  listeners.push(info.addListener('closeclick',()=>onSelect(null)));
  const escape=event=>{if(event.key==='Escape'&&selected){event.preventDefault();onSelect(null);}};
  host.addEventListener('keydown',escape,true);
  const regroup=()=>{
    if(disposed)return;
    const projection=map.getProjection();if(!projection)return;
    const scale=2**map.getZoom();
    const groups=overlapGroups(located,position=>{const p=projection.fromLatLngToPoint(new maps.LatLng(position));return {x:p.x*scale,y:p.y*scale};});
    for(const marker of clusters){maps.event.clearInstanceListeners(marker);marker.map=null;}clusters=[];
    for(const group of groups){
      const marker=new maps.marker.AdvancedMarkerElement({map,position:group.position,title:`Expand ${group.members.length} overlapping locations`,content:markerContent({id:'cluster',label:String(group.members.length)},{cluster:true,count:group.members.length}),gmpClickable:true,zIndex:500});
      marker.addListener('click',()=>onExpand(group));clusters.push(marker);
    }
    onGroups(groups);
  };
  listeners.push(map.addListener('idle',regroup));
  listeners.push(map.addListener('tilesloaded',()=>{if(!disposed){clearTimeout(paintTimer);onReady();}}));
  paintTimer=setTimeout(()=>{if(!disposed)onFailure('Google street tiles did not finish loading.');},12000);
  const fitAll=()=>map.fitBounds(bounds(located),48);
  const resize=new ResizeObserver(()=>{if(disposed)return;maps.event.trigger(map,'resize');info.setOptions({maxWidth:Math.max(190,Math.min(340,host.clientWidth-48))});});resize.observe(host);
  fitAll();
  return {
    fitAll,
    select(id){selected=id;
      for(const entry of located){const marker=markers.get(entry.id);marker.content=markerContent(entry);marker.zIndex=id===entry.id?1000:entry.subject?800:100;}
      const entry=entries.find(e=>e.id===id);if(!entry?.position){info.close();return;}
      info.setContent(popupContent(entry));info.setOptions({ariaLabel:entry.title});info.open({map,anchor:markers.get(id),shouldFocus:false});
    },
    zoomGroup(group){map.fitBounds(bounds(group.members),70);if(group.members.every(e=>e.position.lat===group.position.lat&&e.position.lng===group.position.lng))map.setZoom(Math.min(20,(map.getZoom()??15)+2));},
    destroy(){disposed=true;clearTimeout(paintTimer);resize.disconnect();host.removeEventListener('keydown',escape,true);info.close();for(const listener of listeners)listener.remove();for(const marker of [...markers.values(),...clusters]){maps.event.clearInstanceListeners(marker);marker.map=null;}maps.event.clearInstanceListeners(map);host.replaceChildren();}
  };
}
