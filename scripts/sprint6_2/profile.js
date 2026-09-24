import './offline.js';
import {readdir,readFile} from 'node:fs/promises';
import {CACHE,json,gateZip,PTS,PTS_HASH,fileHash} from './io.js';
import {schema,scanDbf} from './dbf.js';
import {parseCsv} from '../../src/sources/kern/csv.js';
await gateZip();
const dir=`${CACHE}/extracted`,profiles={};
for(const folder of await readdir(dir))for(const name of await readdir(`${dir}/${folder}`))if(name.endsWith('.dbf')){
  const file=`${dir}/${folder}/${name}`,s=await schema(file);
  const names=s.fields.map(f=>f.name).filter(n=>/^(ATN|APN9?|.*ATN.*|.*APN.*|EVENT.*|.*CODE|ROLL|.*DESC.*)$/.test(n)&&!/^LEGAL/.test(n));
  const distributions={};for(const n of names)distributions[n]={lengths:{},examples:[]};
  const domain=/UseCodes|RollTypes|EventTypes/.test(name),rows=[];
  const result=await scanDbf(file,domain?s.fields.map(f=>f.name):names,row=>{
    if(domain)rows.push(row);
    for(const n of names){const d=distributions[n],v=row[n];d.lengths[v.length]=(d.lengths[v.length]??0)+1;if(d.examples.length<5&&!d.examples.includes(v))d.examples.push(v);}
  });
  profiles[folder]={...result,distributions,...(domain?{domain:rows}:{})};
}
await json(`${CACHE}/profiles.json`,profiles);
const brief=Object.fromEntries(Object.entries(profiles).map(([k,v])=>[k,{count:v.count,active:v.active,deleted:v.deleted,fields:v.fields.length,distributions:v.distributions}]));
console.log(JSON.stringify(brief,null,2));
if(await fileHash(PTS)!==PTS_HASH)throw new Error('PTS_HASH_STOP');
const p=parseCsv(await readFile(PTS,'utf8')),ids=p.rows.map(r=>r[p.headers.indexOf('atn')]),lengths={};
for(const id of ids)lengths[id.length]=(lengths[id.length]??0)+1;
console.log(JSON.stringify({ptsHeaders:p.headers,rows:p.rows.length,rawUnique:new Set(ids).size,lengths,idExamples:ids.slice(0,5)}));
