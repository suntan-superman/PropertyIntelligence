import React,{useEffect} from 'react';
import './status-toast.css';

export default function StatusToast({message,onDismiss,duration=4000}){
  useEffect(()=>{
    if(!message)return undefined;
    const timer=window.setTimeout(()=>onDismiss?.(),duration);
    return()=>window.clearTimeout(timer);
  },[message,duration]);

  if(!message)return null;
  return <div className="pi-status-toast" role="status" aria-live="polite" aria-atomic="true">
    <span className="pi-status-toast-icon" aria-hidden="true">✓</span>
    <span>{message}</span>
    <button type="button" onClick={onDismiss} aria-label="Dismiss notification">×</button>
  </div>;
}
