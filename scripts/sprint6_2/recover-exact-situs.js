import {readFile} from 'node:fs/promises';
import {parseCsv} from '../../src/sources/kern/csv.js';
import {normalizeAtn,matchAtn} from './core.js';
import {scanDbf} from './dbf.js';
import {CACHE,PTS,PTS_HASH,fileHash,json} from './io.js';

const EXPECTED_LAND_HASH='3f96888125baad5525b1791d2e2ab56b5403b14d10f489378059341c0d17fbd5';
const EXPECTED_OUTPUT_HASH='a73af56be907b70f5f12a2c7e6d196da7ceaa56dc46ade34628e39559c5f39c8';
const landFile=`${CACHE}/extracted/TaxRoll_Land_2026final/TaxRoll_Land_2026final.dbf`;
const output=`${CACHE}/exact-situs.json`;

if(await fileHash(PTS)!==PTS_HASH)throw new Error('PTS_HASH_STOP');
if(await fileHash(landFile)!==EXPECTED_LAND_HASH)throw new Error('LAND_HASH_STOP');

const parsed=parseCsv(await readFile(PTS,'utf8'));
const atnColumn=parsed.headers.indexOf('atn');
if(atnColumn<0)throw new Error('PTS_SCHEMA_STOP');
const sourceAtns=[];
const wanted=new Set();
for(const row of parsed.rows){
  const raw=row[atnColumn];
  sourceAtns.push(raw);
  const normalized=normalizeAtn(raw);
  if(normalized)wanted.add(normalized);
}

const landIndex=new Map();
await scanDbf(landFile,['ATN','ADDR_SITUS'],row=>{
  const normalized=normalizeAtn(row.ATN);
  if(!wanted.has(normalized))return;
  if(!landIndex.has(normalized))landIndex.set(normalized,[]);
  landIndex.get(normalized).push(row);
});

const seen=new Set();
const result=[];
for(const raw of sourceAtns){
  const normalized=normalizeAtn(raw);
  if(!normalized||seen.has(normalized))continue;
  seen.add(normalized);
  const match=matchAtn(raw,landIndex);
  if(match.status==='MATCHED_EXACT')result.push({atn:normalized,rawCountySitus:match.rows[0].ADDR_SITUS});
}

await json(output,result);
const actual=await fileHash(output);
if(actual!==EXPECTED_OUTPUT_HASH)throw new Error(`EXACT_SITUS_HASH_STOP:${actual}`);
console.log(JSON.stringify({output,records:result.length,sha256:actual}));
