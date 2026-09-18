import {overlapGroups,popupContent} from './mapData.js';

export function googleMap(host,maps,entries,{onSelect,onGroups,onExpand,onReady,onFailure}) {
  const located=entries.filter(e=>e.position),markers=new Map(),listeners=[];
  const map=new maps.Map(host,{center:located[0].position,zoom:13,mapTypeId:'roadmap',mapTypeControl:false,
    streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative',clickableIcons:false,
    ...(maps.RenderingType?.RASTER?{renderingType:maps.RenderingType.RASTER}:{})});
  const info=new maps.InfoWindow({maxWidth:Math.min(340,host.clientWidth-48)});
  let selected=null,clusters=[],disposed=false,paintTimer;
  const bounds=members=>{const result=new maps.LatLngBounds();for(const e of members)result.extend(e.position);return result;};
  const icon=e=>({path:e.subject?'M -12,-12 12,-12 12,12 -12,12 Z':maps.SymbolPath.CIRCLE,
    fillColor:e.id===selected?'#753f14':e.subject?'#914916':'#256b61',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:e.id===selected?3:2,scale:e.subject?1:12});
  for(const entry of located){
    const marker=new maps.Marker({map,position:entry.position,title:entry.title,label:{text:entry.label,color:'#ffffff',fontSize:'12px'},icon:icon(entry),optimized:false,zIndex:entry.subject?800:100});
    listeners.push(marker.addListener('click',()=>onSelect(entry.id)));markers.set(entry.id,marker);
  }
  listeners.push(info.addListener('closeclick',()=>onSelect(null)));
  const regroup=()=>{
    if(disposed)return;
    const projection=map.getProjection();if(!projection)return;
    const scale=2**map.getZoom();
    const groups=overlapGroups(located,position=>{const p=projection.fromLatLngToPoint(new maps.LatLng(position));return {x:p.x*scale,y:p.y*scale};});
    for(const marker of clusters){maps.event.clearInstanceListeners(marker);marker.setMap(null);}clusters=[];
    for(const group of groups){
      const marker=new maps.Marker({map,position:group.position,title:`Expand ${group.members.length} overlapping locations`,
        label:{text:`${group.members.length}`,color:'#ffffff',fontSize:'12px'},
        icon:{path:maps.SymbolPath.CIRCLE,fillColor:'#35485f',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3,scale:17},zIndex:500});
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
      for(const entry of located){const marker=markers.get(entry.id);marker.setIcon(icon(entry));marker.setZIndex(id===entry.id?1000:entry.subject?800:100);}
      const entry=entries.find(e=>e.id===id);if(!entry?.position){info.close();return;}
      info.setContent(popupContent(entry));info.setOptions({ariaLabel:entry.title});info.open({map,anchor:markers.get(id),shouldFocus:false});
    },
    zoomGroup(group){map.fitBounds(bounds(group.members),70);if(group.members.every(e=>e.position.lat===group.position.lat&&e.position.lng===group.position.lng))map.setZoom(Math.min(20,(map.getZoom()??15)+2));},
    destroy(){disposed=true;clearTimeout(paintTimer);resize.disconnect();info.close();for(const listener of listeners)listener.remove();for(const marker of [...markers.values(),...clusters]){maps.event.clearInstanceListeners(marker);marker.setMap(null);}maps.event.clearInstanceListeners(map);host.replaceChildren();}
  };
}
