import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {inflateRawSync} from 'node:zlib';
import {loadLocalEnvironment} from '../src/sources/rentcast/config.js';
import {resolve,writeJson,readJson,hash} from '../src/io/files.js';
loadLocalEnvironment();
const secrets=[process.env.RENTCAST_API_KEY,process.env.MARKET_DATA_API_KEY].filter(Boolean);
const variants=[...new Set(secrets.flatMap(s=>[s,encodeURIComponent(s),Buffer.from(s).toString('base64'),JSON.stringify(s).slice(1,-1)]))];
const files=[];
async function walk(dir){for(const entry of await readdir(resolve(dir),{withFileTypes:true})){const p=dir+'/'+entry.name;if(entry.isDirectory())await walk(p);else files.push(p);}}
await walk('apps/web/dist');await walk('src/workbench');await walk('netlify/functions');
// Netlify CLI's executable function output, when local dev/build is available.
let functionOutputScanned=false;
try{await walk('.netlify/functions-serve');functionOutputScanned=true;}catch(e){if(e.code!=='ENOENT')throw e;}
let runtimeLogScanned=false;
try{await readFile(resolve('.netlify/qa-artifacts/netlify-smoke.log'));files.push('.netlify/qa-artifacts/netlify-smoke.log');runtimeLogScanned=true;}catch(e){if(e.code!=='ENOENT')throw e;}
for(const file of files){const body=await readFile(resolve(file));for(const variant of variants)assert.equal(body.includes(Buffer.from(variant)),false,`SECRET_SCAN_STOP: ${file}`);}
let functionZipScanned=false,functionZipBytes=null,functionZipEntries=[];
try{
  // Inspect compressed executable contents in memory; never extract or log their text.
  const zip=await readFile(resolve('.netlify/functions/api.zip'));functionZipBytes=zip.length;
  let end=-1;for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--)if(zip.readUInt32LE(i)===0x06054b50){end=i;break;}
  assert.ok(end>=0,'ZIP_DIRECTORY_REQUIRED');let at=zip.readUInt32LE(end+16);
  const entries=zip.readUInt16LE(end+10);
  for(let i=0;i<entries;i++){
    assert.equal(zip.readUInt32LE(at),0x02014b50);const method=zip.readUInt16LE(at+10),size=zip.readUInt32LE(at+20),uncompressed=zip.readUInt32LE(at+24),nameLength=zip.readUInt16LE(at+28),extraLength=zip.readUInt16LE(at+30),commentLength=zip.readUInt16LE(at+32),local=zip.readUInt32LE(at+42);
    const name=zip.subarray(at+46,at+46+nameLength).toString();functionZipEntries.push(name);
    assert.doesNotMatch(name,/(^|\/)\.env|node_modules\/(playwright|pdfjs|@napi-rs)|data\/(raw|reports)/i);assert.ok(uncompressed<20000000,'ZIP_ENTRY_TOO_LARGE');
    const offset=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28),packed=zip.subarray(offset,offset+size);
    assert.ok([0,8].includes(method));const body=method===8?inflateRawSync(packed,{maxOutputLength:20000000}):packed;
    for(const variant of variants)assert.equal(body.includes(Buffer.from(variant)),false,`SECRET_SCAN_STOP: function ZIP entry ${name}`);
    if(name==='netlify/functions/api.mjs')assert.doesNotMatch(body.toString(),/playwright-core|pdfjs-dist|@napi-rs\/canvas/);
    at+=46+nameLength+extraLength+commentLength;
  }
  functionZipScanned=true;
}catch(e){if(e.code!=='ENOENT')throw e;}
const clientFiles=files.filter(f=>f.startsWith('apps/web/dist/'));
for(const file of clientFiles){const body=await readFile(resolve(file),'utf8');assert.doesNotMatch(body,/X-Api-Key|RENTCAST_API_KEY|RentCast_API_KEY|Bearer\s+[a-z0-9]{20}/i,file);assert.ok(!body.includes('florida-verification.json'),file);}
const example=await readFile(resolve('.env.example'),'utf8');for(const variant of variants)assert.ok(!example.includes(variant));
const manifest=await readJson('data/validation/sprint3_2-protected-inputs.json');for(const f of manifest.files)assert.equal(hash(await readFile(resolve(f.file))),f.sha256,f.file);
const result={at:new Date().toISOString(),status:'PASS',filesScanned:files.length,actualLocalSecretChecked:secrets.length>0,encodedVariantsChecked:true,functionOutputScanned,functionZipScanned,functionZipBytes,functionZipEntries,runtimeLogScanned,protectedFiles:manifest.files.length,providerCalls:0};
await writeJson('data/validation/sprint3_2-security-qa.json',result);console.log(JSON.stringify(result,null,2));
