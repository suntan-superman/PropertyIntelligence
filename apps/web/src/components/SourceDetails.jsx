import React from 'react';
import './source-details.css';

const display=value=>value===null||value===undefined||value===''?'Unknown':String(value);

export default function SourceDetails({items,label='Source Details',className=''}){
  return <details className={`pi-source-details ${className}`.trim()}>
    <summary>{label}</summary>
    <dl>{items.map(([name,value])=><React.Fragment key={name}><dt>{name}</dt><dd>{display(value)}</dd></React.Fragment>)}</dl>
  </details>;
}
