// Display only. All financial analysis and chart positions arrive from the server.
export const money=v=>v==null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
export const percent=v=>v==null?'Unknown':`${(v*100).toFixed(1)}%`;
export const text=v=>v==null?'Unknown':typeof v==='object'?JSON.stringify(v):String(v);
export const human=s=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');
export function selectComp(comps,id){return comps.find(c=>c.id===id)??null;}
