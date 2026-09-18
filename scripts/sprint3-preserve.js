import {readdir,readFile} from 'node:fs/promises';
import {resolve,hash,writeJson} from '../src/io/files.js';
async function walk(dir) {
  const out=[];
  for(const entry of await readdir(resolve(dir),{withFileTypes:true})) {
    const file=`${dir}/${entry.name}`;
    if(entry.isDirectory())out.push(...await walk(file));
    else out.push({file,sha256:hash(await readFile(resolve(file)))});
  }
  return out;
}
const manifest='data/validation/sprint3-protected-inputs.json';
try {await readFile(resolve(manifest)); throw new Error('Baseline already exists; never replace it.');}
catch(error){if(error.code!=='ENOENT')throw error;}
await writeJson(manifest,{createdAt:new Date().toISOString(),files:await walk('data')});
console.log('Sprint 1/2 artifact preservation baseline created.');
