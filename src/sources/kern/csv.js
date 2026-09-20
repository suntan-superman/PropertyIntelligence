import {createHash} from 'node:crypto';

export function parseCsv(text) {
  const rows=[];let row=[];let field='';let quoted=false;
  for(let index=0;index<text.length;index++){
    const character=text[index];
    if(quoted){
      if(character==='"'&&text[index+1]==='"'){field+='"';index++;}
      else if(character==='"')quoted=false;
      else field+=character;
    } else if(character==='"'&&field==='') quoted=true;
    else if(character===','){row.push(field);field='';}
    else if(character==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=character;
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  if(quoted)throw new Error('CSV_UNCLOSED_QUOTE');
  if(!rows.length)return {headers:[],rows:[]};
  const headers=rows[0].map(value=>value.trim());
  return {headers,rows:rows.slice(1)};
}

export function rowObject(headers,row){
  const object={};for(let index=0;index<headers.length;index++)object[headers[index]]=row[index]??'';return object;
}

export function sha256(value){return createHash('sha256').update(value).digest('hex');}

export function normalizeIdentifier(value){
  const text=String(value??'').trim();
  if(!text)return null;
  return text.toUpperCase().replace(/[\s-]+/g,'');
}

export function normalizeOwnerName(value){
  const text=String(value??'').trim();
  return text?text.toUpperCase().replace(/\s+/g,' '):null;
}

export function parseAmount(value){
  const text=String(value??'').trim();if(!text)return null;
  const normalized=text.replace(/[$,\s]/g,'');
  if(!/^-?\d+(?:\.\d+)?$/.test(normalized))return {invalid:true,raw:text};
  const number=Number(normalized);return Number.isFinite(number)?number:{invalid:true,raw:text};
}

export function normalizePowerToSellRow(headers,row,rowNumber){
  const raw=rowObject(headers,row);
  const atn=normalizeIdentifier(raw.atn),apn=normalizeIdentifier(raw.apn);
  const parcelAmount=parseAmount(raw.parcel_amount_owed),ownerTotal=parseAmount(raw.owner_total_owed);
  const normalized={
    ownerName:normalizeOwnerName(raw.owner_name),
    atn,apn,
    parcelAmountOwed:parcelAmount?.invalid?null:parcelAmount,
    ownerTotalOwed:ownerTotal?.invalid?null:ownerTotal,
    sourceDate:String(raw.source_date??'').trim()||null,
    source:String(raw.source??'').trim()||null,
    sourcePage:String(raw.source_page??'').trim()||null
  };
  const criticalMalformed=[];
  if(parcelAmount?.invalid)criticalMalformed.push('parcel_amount_owed');
  if(ownerTotal?.invalid)criticalMalformed.push('owner_total_owed');
  return {raw,normalized,rowNumber,criticalMalformed};
}
