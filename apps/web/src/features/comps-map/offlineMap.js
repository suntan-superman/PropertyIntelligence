import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {overlapGroups,popupContent} from './mapData.js';

export function offlineMap(host,entries,{onSelect,onGroups,onExpand}) {
  const located=entries.filter(e=>e.position),markers=new Map();
  const map=L.map(host,{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
  const points=located.map(e=>[e.position.lat,e.position.lng]);
  let selecting=false,disposed=false;
  const popup=L.popup({maxWidth:Math.min(340,host.clientWidth-48),maxHeight:260,autoPanPadding:[18,18]});
  const keyboard=(element,fn)=>{element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();fn();}});};
  for(const entry of located){
    const marker=L.marker([entry.position.lat,entry.position.lng],{title:entry.title,keyboard:true,riseOnHover:true,zIndexOffset:entry.subject?800:0,
      icon:L.divIcon({className:entry.subject?'subject-pin':'comp-pin',html:entry.label,iconSize:[entry.subject?30:27,entry.subject?30:27]})}).addTo(map);
    marker.on('click',()=>onSelect(entry.id));marker.getElement().setAttribute('aria-label',`Select ${entry.title}`);keyboard(marker.getElement(),()=>onSelect(entry.id));markers.set(entry.id,marker);
  }
  map.on('popupclose',()=>{if(!selecting&&!disposed)onSelect(null);});
  const grid=L.layerGroup().addTo(map),clusters=L.layerGroup().addTo(map);
  const redraw=()=>{
    if(disposed)return;grid.clearLayers();clusters.clearLayers();const b=map.getBounds(),span=b.getEast()-b.getWest(),step=span>2?1:span>.2?.1:.01;
    let count=0;for(let x=Math.floor(b.getWest()/step)*step;x<b.getEast()&&count++<100;x+=step)L.polyline([[b.getSouth(),x],[b.getNorth(),x]],{color:'#bdd2d0',weight:1,interactive:false}).addTo(grid);
    count=0;for(let y=Math.floor(b.getSouth()/step)*step;y<b.getNorth()&&count++<100;y+=step)L.polyline([[y,b.getWest()],[y,b.getEast()]],{color:'#bdd2d0',weight:1,interactive:false}).addTo(grid);
    const groups=overlapGroups(located,p=>map.latLngToContainerPoint([p.lat,p.lng]));
    for(const group of groups){const marker=L.marker([group.position.lat,group.position.lng],{title:`Expand ${group.members.length} overlapping locations`,keyboard:true,zIndexOffset:500,
      icon:L.divIcon({className:'overlap-pin',html:String(group.members.length),iconSize:[34,34]})}).addTo(clusters);
      marker.on('click',()=>onExpand(group));keyboard(marker.getElement(),()=>onExpand(group));}
    onGroups(groups);
  };
  const fitAll=()=>map.fitBounds(points,{padding:[45,45],maxZoom:16,animate:false});fitAll();map.on('moveend zoomend',redraw);redraw();
  const resize=new ResizeObserver(()=>{if(!disposed)map.invalidateSize();});resize.observe(host);
  return {fitAll,
    select(id){selecting=true;try{
      for(const [key,marker] of markers){marker.getElement()?.classList.toggle('selected',id===key);marker.setZIndexOffset(id===key?1000:key==='subject'?800:0);}
      const entry=entries.find(e=>e.id===id);if(!entry?.position){map.closePopup();return;}
      popup.options.maxWidth=Math.max(190,Math.min(340,host.clientWidth-48));popup.setLatLng([entry.position.lat,entry.position.lng]).setContent(popupContent(entry)).openOn(map);
    }finally{selecting=false;}},
    zoomGroup(group){const before=map.getZoom();map.fitBounds(group.members.map(e=>[e.position.lat,e.position.lng]),{padding:[60,60],maxZoom:20,animate:false});if(group.members.every(e=>e.position.lat===group.position.lat&&e.position.lng===group.position.lng))map.setZoom(Math.min(20,before+2),{animate:false});},
    destroy(){disposed=true;resize.disconnect();map.off('moveend zoomend',redraw);map.stop();map.remove();}
  };
}
