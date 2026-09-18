// Browser-only Maps API contract double. No real street tiles or credentials.
// Used to verify our Google adapter deterministically, not to claim live-map QA.
(() => {
  const instances=[];
  const emit=(target,name)=>{for(const fn of target.events?.[name]??[])fn();};
  class Events{constructor(){this.events={};}addListener(name,fn){(this.events[name]??=[]).push(fn);return {remove:()=>{this.events[name]=this.events[name].filter(x=>x!==fn);}};}}
  class LatLng{constructor(value,lng){this.value=typeof value==='number'?{lat:value,lng}:value;}lat(){return this.value.lat;}lng(){return this.value.lng;}}
  class Bounds{constructor(){this.points=[];}extend(p){this.points.push(p);return this;}isEmpty(){return !this.points.length;}}
  class Map extends Events{
    constructor(host,options){super();this.host=host;this.options=options;this.zoom=options.zoom;this.center=options.center;host.replaceChildren();this.area=document.createElement('div');this.area.className='qa-google-map';this.area.style.cssText='height:100%;position:relative;background:#e8efe6';host.append(this.area);this.markers=[];instances.push(this);
      setTimeout(()=>{emit(this,'idle');if(!window.__mapTestNoTiles)emit(this,'tilesloaded');},0);}
    fitBounds(bounds){const points=bounds.points;this.center={lat:points.reduce((n,p)=>n+p.lat,0)/points.length,lng:points.reduce((n,p)=>n+p.lng,0)/points.length};const span=Math.max(.001,...points.map(p=>Math.abs(p.lng-this.center.lng)*2));this.zoom=Math.min(17,Math.max(12,Math.floor(Math.log2(250/span))));this.paint();setTimeout(()=>emit(this,'idle'),0);}
    getZoom(){return this.zoom;}setZoom(z){this.zoom=z;this.paint();setTimeout(()=>emit(this,'idle'),0);}
    getProjection(){return {fromLatLngToPoint:p=>({x:(p.lng()+180)/360*256,y:(90-p.lat())/180*256})};}
    paint(){for(const m of this.markers){const scale=2**this.zoom;m.button.style.left=`${this.host.clientWidth/2+(m.position.lng-this.center.lng)/360*256*scale}px`;m.button.style.top=`${this.host.clientHeight/2-(m.position.lat-this.center.lat)/180*256*scale}px`;}}
  }
  class Marker extends Events{
    constructor(options){super();Object.assign(this,options);this.button=document.createElement('button');this.button.className='qa-google-marker';this.button.textContent=options.label.text;this.button.title=options.title;this.button.setAttribute('aria-label',options.title);this.button.style.cssText='position:absolute;transform:translate(-50%,-50%);padding:4px 8px;border-radius:50%;';this.button.onclick=()=>emit(this,'click');this.map.markers.push(this);this.map.area.append(this.button);this.setZIndex(options.zIndex??100);this.map.paint();}
    setMap(map){if(!map){this.button.remove();this.map.markers=this.map.markers.filter(m=>m!==this);}this.map=map;}
    setIcon(icon){this.icon=icon;this.button.style.background=icon.fillColor;}
    setZIndex(n){this.zIndex=n;this.button.style.zIndex=String(n);}
  }
  class InfoWindow extends Events{
    constructor(options){super();this.options=options;}
    setContent(node){this.content=node;if(this.box){this.box.replaceChildren(this.closeButton,node);}}
    setOptions(options){this.options={...this.options,...options};}
    open({map,anchor}){this.close();this.anchor=anchor;this.box=document.createElement('div');this.box.className='qa-google-popup';this.box.style.cssText='position:absolute;right:10px;top:10px;z-index:3000;background:white;padding:10px;max-width:calc(100% - 40px);box-shadow:0 1px 7px #556';this.closeButton=document.createElement('button');this.closeButton.textContent='Close popup';this.closeButton.onclick=()=>{this.close();emit(this,'closeclick');};this.box.append(this.closeButton,this.content);map.area.append(this.box);}
    close(){this.box?.remove();this.box=null;}
  }
  window.google={maps:{Map,Marker,LatLng,LatLngBounds:Bounds,InfoWindow,SymbolPath:{CIRCLE:'circle'},RenderingType:{RASTER:'raster'},event:{clearInstanceListeners:target=>{target.events={};},trigger:emit}}};
  window.__mapTestInstances=instances;
  window.__piGoogleMapsReady?.();
})();
