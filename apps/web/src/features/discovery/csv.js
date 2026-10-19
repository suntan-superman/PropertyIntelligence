export function parseLocalCsv(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
    else if(c==='"'&&field==='')quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=c;
  }
  if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}if(quoted)throw new Error('CSV has an unclosed quoted field.');
  const headers=(rows.shift()??[]).map(x=>x.trim());return {headers,rows:rows.filter(r=>r.some(v=>String(v).trim()))};
}
export function csvText(headers,rows){
  const cell=value=>{const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;};
  return [headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function downloadCsv(name,headers,rows){
  const url=URL.createObjectURL(new Blob([csvText(headers,rows)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);
}
