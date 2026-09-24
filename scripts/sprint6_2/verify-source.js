import {createReadStream} from 'node:fs';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

const cache='data/runtime/sprint6_2-kern-assessor';
await mkdir(cache,{recursive:true});
const sha256=async path=>{const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');};
const gitArgs=['-c','safe.directory=C:/Users/sjroy/Source/PropertyIntelligence'];
const files=execFileSync('git',[...gitArgs,'ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const baseline=[];
for(const path of files){try{baseline.push({path,sha256:await sha256(path)});}catch(error){if(error.code!=='ENOENT')throw error;baseline.push({path,missing:true});}}
// Never replace a baseline captured before the work (including pre-existing edits).
await writeFile(`${cache}/repository-baseline.json`,JSON.stringify({at:new Date().toISOString(),files:baseline},null,2),{flag:'wx'});
const path='data/raw/kern-assessor/KernCountyAssessor_GisParcels_2026final.zip';
const expected='7954771690266e4f54402b4889ef5a9ae69dfdb04f9e34a6d822f115550c92ae',start=performance.now();
const actual=await sha256(path),info=await stat(path);
const result={path,expected,sha256:actual,bytes:info.size,modifiedAt:info.mtime.toISOString(),hashMs:performance.now()-start,status:actual===expected?'PASS':'STOP',protectedFiles:baseline.length,providerCalls:0};
await writeFile(`${cache}/source-gate.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
if(result.status!=='PASS')process.exitCode=1;
