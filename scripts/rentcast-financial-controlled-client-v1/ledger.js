import {open,readdir,readFile,lstat,realpath,unlink} from 'node:fs/promises';
import {resolve,relative,sep,isAbsolute,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {check,hash,Stop} from './contract.js';
export const PRIVATE_ROOT='data/runtime/rentcast-financial-controlled-client-v1';
export async function privateDirectory(directory){
  const base=resolve(PRIVATE_ROOT),target=resolve(directory),rel=relative(base,target);
  check(rel&&rel!=='..'&&!rel.startsWith(`..${sep}`)&&!isAbsolute(rel),'PRIVATE_DIRECTORY_STOP');
  // Refuse symlinks/junctions in every component; containment is not lexical only.
  for(let p=target;;p=resolve(p,'..')){
    check(!(await lstat(p)).isSymbolicLink(),'PRIVATE_SYMLINK_STOP');if(p===base)break;
  }
  check((await realpath(target)).toLowerCase()===target.toLowerCase(),'PRIVATE_REALPATH_STOP');
  return target;
}
export async function writeExclusive(path,value){
  const fd=await open(path,'wx',0o600);
  try{await fd.writeFile(JSON.stringify(value)+'\n');await fd.sync();}finally{await fd.close();}
}
export async function locked(directory,work){
  const dir=await privateDirectory(directory),path=join(dir,'process.lock'),owner=randomUUID();let fd;
  try{fd=await open(path,'wx',0o600);}catch{throw new Stop('PROCESS_LOCK_STOP');}
  try{
    await fd.writeFile(JSON.stringify({owner,pid:process.pid,at:new Date().toISOString()}));await fd.sync();await fd.close();fd=null;
    return await work(dir);
  }finally{
    if(fd)await fd.close();
    // Never reclaim somebody else's lock or a retained crash lock automatically.
    const value=JSON.parse(await readFile(path,'utf8'));check(value.owner===owner,'LOCK_OWNERSHIP_STOP');await unlink(path);
  }
}
export async function readLedger(dir,binding){
  const names=(await readdir(dir)).filter(n=>n!=='process.lock').sort();
  check(names.every((n,i)=>n===`${String(i+1).padStart(3,'0')}.json`),'LEDGER_SEQUENCE_STOP');
  const rows=[];let previous=null;
  for(const name of names){
    let entry;try{entry=JSON.parse(await readFile(join(dir,name),'utf8'));}catch{throw new Stop('LEDGER_READ_STOP');}
    const {recordHash,...body}=entry;
    check(recordHash===hash(body)&&body.previousHash===previous&&hash(body.binding)===hash(binding),'LEDGER_INTEGRITY_STOP');
    rows.push(entry);previous=recordHash;
  }
  const reservations=rows.filter(r=>r.kind==='RESERVATION');
  check(rows.length<=6&&reservations.length<=3,'ATTEMPT_CEILING_STOP');
  for(let i=0;i<rows.length;i++){
    const e=rows[i],stage=['A','B','C'][Math.floor(i/2)];
    check(e.stage===stage&&e.kind===(i%2?'OUTCOME':'RESERVATION'),'LEDGER_STAGE_STOP');
    if(i%2)check(e.reservationHash===rows[i-1].recordHash&&e.receiptHash===hash(e.receipt),'RECEIPT_HASH_STOP');
  }
  return rows;
}
export async function append(dir,rows,record,binding){
  const body={...record,binding,previousHash:rows.at(-1)?.recordHash??null},entry={...body,recordHash:hash(body)};
  await writeExclusive(join(dir,`${String(rows.length+1).padStart(3,'0')}.json`),entry);
  rows.push(entry);return entry;
}
