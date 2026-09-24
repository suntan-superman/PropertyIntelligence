import {open,stat} from 'node:fs/promises';

// dBase III: fixed-width ASCII identifiers; CP1252 text. No numeric ID coercion.
export async function schema(file){
  const h=await open(file,'r');try{
    const b=Buffer.alloc(32);await h.read(b,0,32,0);
    const count=b.readUInt32LE(4),headerBytes=b.readUInt16LE(8),recordBytes=b.readUInt16LE(10);
    if(b[0]!==3||headerBytes<33||recordBytes<1)throw new Error('DBF_FORMAT_STOP');
    const header=Buffer.alloc(headerBytes);await h.read(header,0,headerBytes,0);
    let offset=1;const fields=[];
    for(let p=32;p<headerBytes&&header[p]!==13;p+=32){
      const name=header.subarray(p,p+11).toString('ascii').replace(/\0.*$/s,'');
      const type=String.fromCharCode(header[p+11]),width=header[p+16],decimals=header[p+17];
      if(!name||!width||!['C','N','F','D','L'].includes(type))throw new Error('DBF_FIELD_STOP');
      fields.push({name,type,width,decimals,offset});offset+=width;
    }
    const bytes=(await stat(file)).size;
    if(offset!==recordBytes||headerBytes+count*recordBytes>bytes)throw new Error('DBF_BOUNDS_STOP');
    return {count,headerBytes,recordBytes,bytes,languageDriver:b[29],fields};
  }finally{await h.close();}
}
export async function scanDbf(file,names,visit){
  const s=await schema(file),fields=s.fields.filter(f=>names.includes(f.name));
  if(fields.length!==new Set(names).size)throw new Error('DBF_REQUIRED_FIELD_STOP');
  const handle=await open(file,'r'),decoder=new TextDecoder('windows-1252');
  let active=0,deleted=0;try{
    const batch=Math.max(1,Math.floor(4*1024*1024/s.recordBytes)),buffer=Buffer.alloc(batch*s.recordBytes);
    for(let base=0;base<s.count;base+=batch){
      const size=Math.min(batch,s.count-base)*s.recordBytes;
      const {bytesRead}=await handle.read(buffer,0,size,s.headerBytes+base*s.recordBytes);
      if(bytesRead!==size)throw new Error('DBF_SHORT_READ_STOP');
      for(let at=0;at<size;at+=s.recordBytes){
        if(buffer[at]===42){deleted++;continue;}
        if(buffer[at]!==32)throw new Error('DBF_RECORD_FLAG_STOP');
        const row={};for(const f of fields)row[f.name]=decoder.decode(buffer.subarray(at+f.offset,at+f.offset+f.width)).trim();
        visit(row,base+at/s.recordBytes+1);active++;
      }
    }
  }finally{await handle.close();}
  return {...s,active,deleted};
}
