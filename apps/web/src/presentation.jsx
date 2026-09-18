import React from 'react';
import {humanizeKey,humanizeStatus} from './presentation.js';
export function SourceDetail({item}){return <details className="source-detail"><summary>View source details</summary><p><strong>Field:</strong> {humanizeKey(item.field)} · <strong>Status:</strong> {humanizeStatus(item.status)}</p>{item.supportLevel&&<p><strong>Support:</strong> {humanizeStatus(item.supportLevel)}</p>}{item.sources?.map((s,i)=><p key={i}><strong>{s.source??'Source'}</strong> · {s.retrievedAt??'Date not supplied'} · {s.reference??s.rawResponseRef??'Reference not supplied'}</p>)}</details>}
