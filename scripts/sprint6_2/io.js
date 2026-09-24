import {open,readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
export const CACHE='data/runtime/sprint6_2-kern-assessor';
export const ZIP='data/raw/kern-assessor/KernCountyAssessor_GisParcels_2026final.zip';
export const ZIP_HASH='7954771690266e4f54402b4889ef5a9ae69dfdb04f9e34a6d822f115550c92ae';
export const PTS='data/raw/kern_power_to_sell_2026-09-15.csv';
export const PTS_HASH='89481a5b113a5a46263ec81443a80f1e6f42f5c27ff19ce31830238fa2a0a2a3';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export async function fileHash(file){const h=createHash('sha256');for await(const c of createReadStream(file))h.update(c);return h.digest('hex');}
export async function json(file,value){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value,null,2)+'\n');}
export function requireHash(actual,expected){if(actual!==expected)throw new Error('SOURCE_HASH_STOP');}
export async function gateZip(){requireHash(await fileHash(ZIP),ZIP_HASH);}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(b){let c=0xffffffff;for(const v of b)c=crcTable[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export async function zipEntries(file){
  const handle=await open(file,'r');try{
    const size=(await handle.stat()).size,tail=Buffer.alloc(Math.min(size,65557));await handle.read(tail,0,tail.length,size-tail.length);
    let end=-1;for(let i=tail.length-22;i>=0;i--)if(tail.readUInt32LE(i)===0x06054b50&&i+22+tail.readUInt16LE(i+20)===tail.length){end=i;break;}
    if(end<0)throw new Error('ZIP_DIRECTORY_STOP');
    const count=tail.readUInt16LE(end+10),length=tail.readUInt32LE(end+12),offset=tail.readUInt32LE(end+16);
    if(count===65535||offset===0xffffffff||offset+length>size)throw new Error('ZIP64_OR_BOUNDS_STOP');
    const central=Buffer.alloc(length);await handle.read(central,0,length,offset);let at=0;const entries=[];
    for(let i=0;i<count;i++){
      if(central.readUInt32LE(at)!==0x02014b50)throw new Error('ZIP_CENTRAL_STOP');
      const n=central.readUInt16LE(at+28),extra=central.readUInt16LE(at+30),comment=central.readUInt16LE(at+32);
      const name=central.subarray(at+46,at+46+n).toString('utf8');
      if(name.includes('\\')||name.split('/').some(p=>p==='..')||path.isAbsolute(name)||name.includes(':'))throw new Error('ZIP_PATH_STOP');
      entries.push({name,flags:central.readUInt16LE(at+8),method:central.readUInt16LE(at+10),crc32:central.readUInt32LE(at+16),compressedBytes:central.readUInt32LE(at+20),bytes:central.readUInt32LE(at+24),offset:central.readUInt32LE(at+42)});
      at+=46+n+extra+comment;
    }return entries;
  }finally{await handle.close();}
}
export async function zipMember(file,entry){
  if(entry.flags&1||![0,8].includes(entry.method))throw new Error('ZIP_METHOD_STOP');
  const handle=await open(file,'r');try{
    const header=Buffer.alloc(30);await handle.read(header,0,30,entry.offset);if(header.readUInt32LE(0)!==0x04034b50)throw new Error('ZIP_LOCAL_STOP');
    const data=Buffer.alloc(entry.compressedBytes);await handle.read(data,0,data.length,entry.offset+30+header.readUInt16LE(26)+header.readUInt16LE(28));
    const result=entry.method===0?data:inflateRawSync(data,{maxOutputLength:Math.max(entry.bytes,1)});
    if(result.length!==entry.bytes||crc32(result)!==entry.crc32)throw new Error('ZIP_MEMBER_INTEGRITY_STOP');return result;
  }finally{await handle.close();}
}
export async function extractMember(file,entry,dir){
  const target=path.resolve(dir,entry.name),root=path.resolve(CACHE)+path.sep;
  if(!target.startsWith(root))throw new Error('EXTRACTION_SCOPE_STOP');
  const bytes=await zipMember(file,entry);await mkdir(path.dirname(target),{recursive:true});
  try{const old=await readFile(target);if(!old.equals(bytes))throw new Error('CACHE_COLLISION_STOP');}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(target,bytes,{flag:'wx'});}
  return target;
}
