import React from 'react';
import {finiteNumber} from '../features/comps-map/evidence.js';
import {money} from '../utils/display.js';
import SourceDetails from './SourceDetails.jsx';
import '../features/property-detail/detail.css';
export default function CompactValuation({model}){
 const v=model.property?.valuation??{},values=[['Provider minimum',finiteNumber(v.low)],['As-is AVM estimate',finiteNumber(v.price)],['Provider maximum',finiteNumber(v.high)]];
 return <section id="valuation"><div className="section-heading"><div><p className="eyebrow">RENTCAST · PROVIDER MODEL ESTIMATE</p><h2>As-is valuation—not ARV</h2></div><span className="badge">USD · not an appraisal</span></div>
 <div className="valuation-summary" role="group" aria-label="Provider valuation in US dollars">{values.map(([label,value])=><div key={label}><span>{label}</span><strong>{value===null?'Unknown':money(value)}</strong></div>)}</div>
 <p className="muted">RentCast retained valuation evidence · retrieved {(model.cache?.retrievedAt??[]).join(', ')||'Unknown'} · provider as-of {model.valuationAsOf||'Unknown'}.</p>
 <SourceDetails items={[['Valuation source reference',model.valuationReference],['Evidence snapshot identifier',model.evidenceSnapshotId],['Retrieved',(model.cache?.retrievedAt??[]).join(', ')||null],['Provider as-of',model.valuationAsOf]]}/>
 <p>The range describes a provider model estimate, not sale-price bounds, an after-repair value or guaranteed proceeds. Purchase and resale inputs remain analyst assumptions.</p>
 {model.analysis&&<p>Entered resale: {money(model.analysis.base?.grossSale)} · Modeled break-even sale: {money(model.analysis.breakEven?.salePrice)}. These are distinct from the AVM.</p>}
 </section>;
}
