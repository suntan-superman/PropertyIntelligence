import React,{useEffect,useState} from 'react';
import {text} from '../../utils/display.js';
import ComparableMap from './ComparableMap.jsx';
export default function Comps({model}) {
  const [selected,setSelected]=useState(null),comps=model.comps;
  useEffect(()=>setSelected(null),[model.digest]);
  return <section id="comps"><div className="section-heading"><div><p className="eyebrow">RETAINED PROVIDER EVIDENCE</p><h2>Comparable properties</h2></div><span className="badge">{comps.length} retained · {comps.filter(c=>c.mappable).length} mapped</span></div>
    <p>Provider-listed prices are not established closed sales. Land tenure is unknown for every retained comp.</p>
    <ComparableMap key={model.digest} model={model} selected={selected} onSelect={setSelected}/>
    <div className="table-scroll" tabIndex="0" aria-label="All comparable evidence"><table><thead><tr><th>Comp / address</th><th>Price & evidence</th><th>Structure</th><th>Context</th><th>Source / location</th></tr></thead><tbody>{comps.map(c=><tr key={c.id} className={selected===c.id?'selected-row':''} data-comp-row={c.id}><td><button className="row-select" aria-pressed={selected===c.id} onClick={()=>setSelected(c.id)}>{c.number}. {c.address}</button><small>{c.propertyType??'Type unknown'} · {c.tenure}</small></td><td>{c.priceText}<small>{c.priceLabel} · {c.badge}</small></td><td>{text(c.bedrooms)} BD / {text(c.bathrooms)} BA<small>{text(c.squareFeet)} SF · Built {text(c.yearBuilt)}</small></td><td>{text(c.distance)} miles · {text(c.daysOnMarket)} DOM<small>Correlation {text(c.correlation)}<br/>Lot {text(c.lotSize)} SF · Unit {text(c.unit)}</small></td><td>{c.sourceStatus}<small>{c.locationStatus}</small></td></tr>)}</tbody></table>{!comps.length&&<p>No independent comparable evidence available.</p>}</div>
  </section>;
}
