import React,{useEffect,useRef,useState} from 'react';
import './tooltip.css';

const BUTTON_HELP={
  'analyze property':'Analyze this address. Live provider evidence may consume quota and incur account charges.',
  'analyze this property':'Open underwriting for this property and its retained evidence snapshot.',
  'analyze investment opportunity':'Open underwriting directly with this property and exact retained evidence snapshot selected.',
  'continue to analyst assumptions →':'Open underwriting directly with this property and exact retained evidence snapshot selected.',
  'continue analysis':'Reopen this property’s saved or browser-retained scenario.',
  'save locally':'Create a new saved revision; earlier revisions remain unchanged.',
  'duplicate scenario':'Copy the current draft into a new unsaved scenario.',
  'duplicate':'Copy the current assumptions into a separate unsaved scenario.',
  'new blank scenario':'Start a separate blank draft for the selected property.',
  'new blank':'Start a separate blank draft for this property and evidence snapshot.',
  'reset draft':'Reset only the current browser draft; saved revisions remain unchanged.',
  'preview report':'Preview this exact saved scenario revision without changing it.',
  'preview saved revision':'Preview this exact saved scenario revision without changing it.',
  'save & preview':'Create a new immutable revision, then preview that exact saved revision.',
  'export pdf':'Download the previewed saved revision as a PDF.',
  'run monte carlo':'Calculate conditional risk results from your current assumptions; save afterward to retain them.',
  'populate illustrative risk assumptions':'Fill editable risk ranges from the current scenario; no simulation runs until you choose Run Monte Carlo.',
  'apply illustrative preset':'Replace seven expense fields in the current draft with disclosed illustrative assumptions.',
  'use avm as starting assumption':'Copy the retained as-is AVM into this draft’s resale assumption; it does not become verified ARV.',
  'find recent sold properties':'Prepare a bounded provider search; a live request may incur a $0.20 charge when separately authorized.',
  'find address with google':'Send a Google Geocoding request that may consume quota or incur account charges; it does not verify parcel identity.',
  'resolve with google':'Open assisted address review. A Google request may consume quota or incur charges only when explicitly submitted.',
  'research retained evidence':'Open retained evidence for review without making a provider request.',
  'preview enrichment':'Estimate provider requests and cost exposure without transmitting them.',
  'run selected enrichment':'Transmit the disclosed provider requests when enabled; quota use and provider charges may apply.',
  'add research item':'Add an analyst research entry to the current scenario draft.',
  'remove':'Remove this analyst entry from the current draft only.',
  'calculate mao':'Calculate the offer ceiling from the displayed assumptions and selected return hurdle.',
  'save decision':'Create a saved decision linked to this property, evidence snapshot and analysis.',
  'generate deal review pdf':'Generate a PDF from the current saved deal evidence and calculations.',
  'save deal':'Create a saved deal record from the current analysis.',
  'save property':'Create a durable saved property and retain its evidence snapshot.',
  'refresh evidence':'Request fresh provider evidence and create a new snapshot; provider charges may apply.',
  'analyze cached evidence':'Analyze retained evidence without making a provider request.',
  'retry street basemap':'Retry loading the Google street basemap; map usage may count against Google quota.',
  'open property':'Open this saved property and its retained evidence; no provider request is made.',
  'load saved decisions':'Load saved decision revisions for this property without changing them.',
  'download investment analysis':'Download a report for the selected saved decision; saved records are unchanged.',
  'fit all locations':'Fit every mapped subject and comparable into view.',
  'zoom to group':'Zoom the map to this overlapping comparable group.',
  'close group':'Close the overlapping-location list without changing comp evidence.',
  'previous':'Show the previous page without changing records.',
  'next':'Show the next page without changing records.',
  'apply filters':'Apply the selected discovery filters without changing source records.',
  'clear filters':'Clear the current view filters without changing records.',
  'resolve address':'Open analyst address review; county evidence remains unchanged.',
  'save address':'Save the analyst-confirmed address resolution; county source evidence remains separate.',
  'save & analyze':'Save this analyst-confirmed address and then open analysis for the same candidate.',
  'cancel':'Close this action without saving changes.',
  'close':'Close this view without changing records.',
  'clear map selection':'Clear the selected map observation without changing evidence.',
  'clear comparison':'Remove properties from this comparison view; saved scenarios remain unchanged.',
  'select six-property comparison':'Add the six retained demo subjects to this comparison view.',
  'select six properties':'Add the six retained research subjects to this comparison view.',
  'live refresh disabled':'Live provider refresh is unavailable; no request will be sent.'
};

function buttonText(target){
  const label=target.getAttribute('aria-label')||target.textContent||'';
  return label.replace(/\s+/g,' ').trim();
}
function helpFor(target){
  const explicit=target.getAttribute('data-tooltip');
  if(explicit)return explicit;
  if(!['BUTTON','A'].includes(target.tagName))return '';
  const label=buttonText(target),key=label.toLowerCase();
  if(BUTTON_HELP[key])return BUTTON_HELP[key];
  if(target.getAttribute('role')==='tab')return `Show the ${label.replace(/\s*\(.*/, '').toLowerCase()} view without changing saved data.`;
  if(target.closest('[data-sale-ref]'))return `Select this comparable observation for review; evidence and scenario assumptions remain unchanged.`;
  if(target.classList.contains('row-select'))return 'Select this evidence row for closer review without changing the source record.';
  if(target.hasAttribute('aria-pressed'))return `Select “${label}” in the current view; saved evidence remains unchanged.`;
  if(/^confirm /i.test(label))return `Confirm this intended property before analysis; no saved record is changed.`;
  if(/^show /i.test(label))return `Show ${label.slice(5)} without changing saved data.`;
  if(/^view /i.test(label))return `Open ${label.slice(5)} for review without changing saved data.`;
  return label?(target.tagName==='A'?`Open “${label}”.`:`Use “${label}”.`):'Activate this control.';
}
function tooltipTarget(node){
  return node instanceof Element?node.closest('[data-tooltip], button, a[href]'):null;
}
function place(target,node){
  const targetRect=target.getBoundingClientRect(),tip=node.getBoundingClientRect(),gap=10;
  const above=targetRect.top-tip.height-gap,below=targetRect.bottom+gap;
  let top=above>=8?above:below+tip.height<=window.innerHeight-8?below:Math.max(8,Math.min(above,window.innerHeight-tip.height-8));
  let left=targetRect.left+(targetRect.width-tip.width)/2;
  left=Math.max(8,Math.min(left,window.innerWidth-tip.width-8));
  node.style.setProperty('--pi-tooltip-top',`${Math.round(top)}px`);
  node.style.setProperty('--pi-tooltip-left',`${Math.round(left)}px`);
}

export function TooltipProvider({children}){
  const [tip,setTip]=useState(null),node=useRef(null),active=useRef(null),pinned=useRef(false),priorDescription=useRef(null);
  useEffect(()=>{
    const hide=()=>{if(active.current){if(priorDescription.current==null)active.current.removeAttribute('aria-describedby');else active.current.setAttribute('aria-describedby',priorDescription.current);}active.current=null;priorDescription.current=null;pinned.current=false;setTip(null);};
    const show=(target,pin=false)=>{const content=helpFor(target);if(!content)return;if(active.current!==target){if(active.current){if(priorDescription.current==null)active.current.removeAttribute('aria-describedby');else active.current.setAttribute('aria-describedby',priorDescription.current);}priorDescription.current=target.getAttribute('aria-describedby');}active.current=target;pinned.current=pin;target.setAttribute('aria-describedby','pi-global-tooltip');setTip({content,target});};
    const over=e=>{const target=tooltipTarget(e.target);if(target&&!pinned.current)show(target);};
    const out=e=>{if(pinned.current)return;const target=tooltipTarget(e.target);if(target&&target===active.current&&!target.contains(e.relatedTarget))hide();};
    const focus=e=>{const target=tooltipTarget(e.target);if(target)show(target);};
    const blur=e=>{if(pinned.current)return;const target=tooltipTarget(e.target);if(target&&target===active.current&&!target.contains(e.relatedTarget))hide();};
    const click=e=>{const target=tooltipTarget(e.target);if(target?.hasAttribute('data-tooltip-click')){e.stopPropagation();if(active.current===target&&pinned.current)hide();else show(target,true);}else if(pinned.current&&!active.current?.contains(e.target))hide();};
    const key=e=>{if(e.key==='Escape')hide();};
    document.addEventListener('mouseover',over);document.addEventListener('mouseout',out);document.addEventListener('focusin',focus);document.addEventListener('focusout',blur);document.addEventListener('click',click);document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('mouseover',over);document.removeEventListener('mouseout',out);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',blur);document.removeEventListener('click',click);document.removeEventListener('keydown',key);};
  },[]);
  useEffect(()=>{if(tip&&node.current){place(tip.target,node.current);const reposition=()=>node.current&&place(tip.target,node.current);window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);return()=>{window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);};}},[tip]);
  useEffect(()=>{if(!tip)return;const observer=new MutationObserver(()=>{if(active.current?.isConnected)return;active.current=null;priorDescription.current=null;pinned.current=false;setTip(null);});observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();},[tip]);
  return <>{children}{tip&&<div ref={node} id="pi-global-tooltip" className="pi-tooltip" role="tooltip">{tip.content}</div>}</>;
}

export function Tooltip({content,label='More information'}){
  const activate=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.currentTarget.click();}};
  return <span role="button" tabIndex="0" className="pi-info-tooltip" aria-label={label} data-tooltip={content} data-tooltip-click onMouseDown={event=>event.preventDefault()} onClick={event=>event.preventDefault()} onKeyDown={activate}><span aria-hidden="true">i</span></span>;
}
